import process from 'node:process'
import fs from 'node:fs'
import os from 'node:os'
import { spawn } from 'node:child_process'

type Shell = (
  pieces: TemplateStringsArray,
  ...args: any[]
) => Promise<string>

type Resolve = (out: any) => void

function isWritable(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.W_OK)
    return true
  } catch (err) {
    return false
  }
}

function controlPath(host: string) {
  let c = 'ssh-' + host
  if ('CI' in process.env && isWritable('/dev/shm')) {
    return `/dev/shm/${c}`
  }
  return `${os.homedir()}/.ssh/${c}`
}

function quote(arg: string) {
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

export function ssh(host: string): Shell {
  return function (pieces, ...args) {
    const from = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    if (pieces.some(p => p == undefined)) {
      throw new Error(`Malformed command at ${from}`)
    }
    let cmd = pieces[0], i = 0
    while (i < args.length) {
      let s
      if (Array.isArray(args[i])) {
        s = args[i].map((x: any) => quote(x)).join(' ')
      } else {
        s = quote(args[i])
      }
      cmd += s + pieces[++i]
    }

    let resolve: Resolve, reject: Resolve
    const promise = new Promise<string>((...args) => ([resolve, reject] = args))
    const child = spawn('ssh', [
      host,
      '-A',
      '-o', 'ControlMaster=auto',
      '-o', 'ControlPath=' + controlPath(host),
      '-o', 'ControlPersist=5m',
      'bash -ls'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = '', stderr = '', combined = ''
    const onStdout = (data: any) => {
      stdout += data
      combined += data
    }
    const onStderr = (data: any) => {
      stderr += data
      combined += data
    }
    child.stdout.on('data', onStdout)
    child.stderr.on('data', onStderr)
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve(combined)
      } else {
        reject(combined)
      }
    })
    child.on('error', err => {
      reject(err)
    })

    child.stdin.write(cmd)
    child.stdin.end()
    return promise
  }
}
