import {spawnSync} from 'node:child_process'

export const exec = new Proxy({}, {
  get: (_, bin) => function (...args) {
    const out = spawnSync(bin, args, {encoding: 'utf8', ...this})
    return Object.assign(new String(out.stdout), out)
  }
})
