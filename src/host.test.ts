import {suite} from 'uvu'
import * as assert from 'uvu/assert'
import {createHost, define} from "./host.js";

const test = suite('host')

test('createHost', async () => {
  const {host} = createHost('root@example.com')
  assert.equal(await host.hostname, 'example.com')
  assert.equal(await host.remoteUser, 'root')
})

test('define', async () => {
  const {host} = createHost('root@example.com')
  define('hi', async ({$}) => {
    return await $`whoami`
  })
  assert.equal((await host.hi), 'root')
})

test.run()
