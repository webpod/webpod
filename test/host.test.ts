import {suite, assert, wrap} from './test.js'
import {createHost, define} from "../src/host.js"

const test = suite('host')

test('createHost', wrap(async () => {
  const {host} = createHost('root@example.com')
  assert.equal(await host.hostname, 'example.com')
  assert.equal(await host.remoteUser, 'root')
}))

test('define', wrap(async () => {
  const {host} = createHost('root@example.com')
  define('str:whoami', async ({$}) => {
    return (await $`whoami`).toString()
  })
  assert.equal((await host['str:whoami']), 'root')
}))

test('await promise in $', wrap(async () => {
  const {host, $} = createHost('root@example.com')
  define('str:whoami', async ({$}) => {
    return (await $`whoami`).toString()
  })
  define('str:hello', async ({host}) => {
    return `Hello ${await host['str:whoami']}`
  })
  assert.equal((await $`echo ${host['str:hello']}`).toString(), 'Hello root')
}))

test.run()
