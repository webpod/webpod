import fs from 'node:fs'
import os from 'node:os'
import process from 'node:process'
import {RemoteShell} from "./ssh.js"

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
  const man = await $`(man $command 2>&1 || $command -h 2>&1 || $command --help 2>&1) | grep -- $option || true`
  if (!man) {
    return false
  }
  return man.includes(option)
}
