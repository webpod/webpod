import {suite, assert, wrap} from './test.js'
import {createHost, defaults} from "../src/host.js"

const test = suite('host')

test('createHost', wrap(async () => {
  const {host} = createHost({
    remoteUser: 'root',
    hostname: 'example.com',
  })
  assert.equal(await host.hostname, 'example.com')
  assert.equal(await host.remoteUser, 'root')
}))

test('define', wrap(async () => {
  const {host} = createHost({
    remoteUser: 'root',
    hostname: 'example.com',
  })
  defaults['str:whoami'] = async ({$}) => {
    return (await $`whoami`).toString()
  }
  assert.equal((await host['str:whoami']), 'root')
}))

test('await promise in $', wrap(async () => {
  const {host, $} = createHost({
    remoteUser: 'root',
    hostname: 'example.com',
  })
  defaults['str:whoami'] = async ({$}) => {
    return (await $`whoami`).toString()
  }
  defaults['str:hello'] = async ({host}) => {
    return `Hello ${await host['str:whoami']}`
  }
  assert.equal((await $`echo ${host['str:hello']}`).toString(), 'Hello root')
}))

test.run()
