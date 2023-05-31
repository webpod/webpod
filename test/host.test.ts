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
  define('my:whoami', async ({$}) => {
    return (await $`whoami`).toString()
  })
  assert.equal((await host['my:whoami']), 'root')
}))

test.run()
