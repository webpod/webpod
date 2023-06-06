import {spawnSync} from 'node:child_process'

export default new Proxy({}, {
  get: (_, bin) => function (...args) {
    const out = spawnSync(bin, args, {...this})
    return Object.assign(new String(out.stdout), out)
  }
})
