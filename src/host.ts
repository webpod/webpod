import {RemoteShell, Response, ssh} from "./ssh.js";

export type Value = number | boolean | string | string[] | { [key: string]: string }

export type Config = {
  [key: `my:${string}`]: Value
  binSymlink: string
  currentPath: string
  defaultTimeout: string
  deployPath: string
  env: { [key: string]: string }
  hostname: string
  keepReleases: number
  releasesList: string[]
  releasesPath: string
  releaseOrCurrentPath: string
  releaseName: string
  releaseRevision: string
  remoteUser: string
  symlinkArgs: string[]
  useRelativeSymlink: boolean
  userStartedDeploy: string
}

export const defaultConfig: {
  [key in keyof Partial<Config>]: Callback<Value>
} = {}

export type Host = {
  [key in keyof Config]: Config[key] | Promise<Config[key]>
}

export type Callback<T> = (context: Context) => Promise<T>

export type Context = {
  host: Host
  $: RemoteShell
}

export function define<T extends Value>(config: keyof Config, value: Callback<T>) {
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
        // @ts-ignore
        value = defaultConfig[prop.toString()]
      }
      if (typeof value === 'undefined') {
        throw new Error(`Property ${prop.toString()} is not defined`)
      }
      if (typeof value === 'function') {
        value = await value({host, $})
        // @ts-ignore
        host[prop.toString()] = value
      }
      return value
    },
  }) as any as Host
  return {host, $}
}
