import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { ssh } from './ssh.js'

const test = suite('ssh')

test('echo', async () => {
  const $ = ssh('example.com')
  const {stdout} = await $`echo hello, world`
  assert.equal(stdout, 'hello, world\n')
})

test.run()
