import fs from 'node:fs'
import os from 'node:os'
import process from 'node:process'
import {RemoteShell} from './ssh.js'
import {spawnSync} from 'node:child_process'
import {SpawnSyncOptions} from 'child_process'
import path from 'node:path'

export function isWritable(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.W_OK)
    return true
  } catch (err) {
    return false
  }
}

export function controlPath(host: string) {
  let c = 'ssh-' + host
  if ('CI' in process.env && isWritable('/dev/shm')) {
    return `/dev/shm/${c}`
  }
  return `${os.homedir()}/.ssh/${c}`
}

export function escapeshellarg(arg: string) {
  if (/^[a-z0-9/_.\-@:=]+$/i.test(arg) || arg === '') {
    return arg
  }
  return (
    `$'` +
    arg
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\\'')
      .replace(/\f/g, '\\f')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0') +
    `'`
  )
}

export async function commandSupportsOption($: RemoteShell, command: string, option: string) {
  const man = await $`(man ${command} 2>&1 || ${command} -h 2>&1 || ${command} --help 2>&1) | grep -- ${option} || true`
  if (!man) {
    return false
  }
  return man.includes(option)
}

export function addr(host: { remoteUser?: string, hostname?: string }): string {
  return (host.remoteUser ? host.remoteUser + '@' : '') + (host.hostname || 'localhost')
}

interface Result extends String {
  pid: number
  stdout: string
  stderr: string
  status: number | null
  signal: string | null
  error?: Error
}

type Bin = (...args: string[]) => Result

export const exec: { [bin: string]: Bin } = new Proxy({}, {
  get: (_, bin: string) => function (this: SpawnSyncOptions, ...args: string[]) {
    const out = spawnSync(bin, args, {encoding: 'utf8', ...this})
    return Object.assign(new String(out.stdout), out)
  }
})

export function str(pieces: TemplateStringsArray, ...args: string[]): string {
  let cmd = pieces[0], i = 0
  for (; i < args.length; i++) {
    cmd += args[i] + pieces[i + 1]
  }
  return cmd
}

export function readDir(rootPath: string, dirPath = rootPath) {
  let filesList: string[] = []
  const files = fs.readdirSync(dirPath)
  for (const file of files) {
    const absolutePath = path.join(dirPath, file)
    if (fs.statSync(absolutePath).isFile()) {
      filesList.push(path.relative(rootPath, absolutePath))
    } else {
      filesList = [...filesList, ...readDir(rootPath, absolutePath)]
    }
  }
  return filesList
}

export function readingTimeInSeconds(text: string): number {
  const wordsPerMinute = 200
  const wordsPerSecond = wordsPerMinute / 60
  const words = text.split(' ')
  const seconds = words.length / wordsPerSecond
  return Math.round(seconds)
}

export function secondsToHumanReadableFormat(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  let s = ''
  if (min > 0) {
    s += `${min}m `
  }
  s += `${sec}s`
  return s
}

export function humanPath(...parts: string[]): string {
  return path.resolve(path.join(...parts)).replace(os.homedir(), '~')
}
