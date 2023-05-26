import {RemoteShell, Response, ssh} from "./ssh.js";

export type KV = { [key: string]: string }
export type Value = number | boolean | string | string[] | KV

export type Config = {
  [key: string]: Value
  hostname: string
  remoteUser: string
  keepReleases: number
  defaultTimeout: string
  env: KV
  deployPath: string
  currentPath: string
  useRelativeSymlink: boolean
  binSymlink: string
  symlinkArgs: string[]
}

export const defaultConfig: {
  [key in keyof Partial<Config>]: Callback<Value | Response>
} = {}

export type Host = {
  [key in keyof Config]: Promise<Value>
}

export type Callback<T> = (context: Context) => Promise<T>

export type Context = {
  host: Host
  $: RemoteShell
}

export function define<T extends Value | Response>(config: keyof Config, value: Callback<T>) {
  defaultConfig[config] = value
}

export function createHost(hostname: string) {
  const config = {} as Config
  if (hostname.includes('@')) {
    const [user, name] = hostname.split('@')
    config.hostname = name
    config.remoteUser = user
  } else {
    config.hostname = hostname
  }

  const $ = ssh((config.remoteUser ? config.remoteUser + '@' : '') + config.hostname || 'localhost')
  const host = new Proxy(config, {
    async get(target, prop) {
      let value = Reflect.get(target, prop)
      if (typeof value === 'undefined') {
        value = defaultConfig[prop.toString()]
      }
      if (typeof value === 'undefined') {
        throw new Error(`Property ${prop.toString()} is not defined`)
      }
      if (typeof value === 'function') {
        value = await value({host, $})
        if (value instanceof Response) {
          value = value.stdout.trim()
        }
        host[prop.toString()] = value
      }
      return value
    },
  }) as any as Host
  return {host, $}
}
