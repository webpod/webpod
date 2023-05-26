import {RemoteShell, ssh} from "./ssh.js";

export type Config = {
  [key: string]: any
  hostname: string
  keepReleases: number
  defaultTimeout: string
  env: { [key: string]: string }
  deployPath: string
  currentPath: string
  useRelativeSymlink: boolean
  binSymlink: string
  symlinkArgs: string[]
}

export const defaultConfig: Partial<Config> = {}

export function define<T extends string>(config: keyof Config, value: Callback<T>) {
  defaultConfig[config] = value
}

export type Callback<T> = (context: Context) => Promise<T>

export type Context = {
  host: Host
  $: RemoteShell
}

export type Host = {
  [key in keyof Config]: Promise<Config[key]>
}

export function host(config: Partial<Config>) {
  const $ = ssh(config.hostname || 'localhost')
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
        host[prop.toString()] = value
      }
      return value
    },
  }) as any as Host
  return {host, $}
}
