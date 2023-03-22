import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { ssh } from './ssh.js'

const test = suite('ssh')

test('echo', async () => {
  const $ = ssh('root@example.com')
  const {stdout} = await $`echo hello, world`
  assert.equal(stdout, 'hello, world\n')
})

test('pipefail', async () => {
  const $ = ssh('root@example.com')
  const {exitCode} = await $.with({nothrow: true})`fail | cat`
  assert.is(exitCode, 127)
})

test.run()
