import {suite, assert, wrap} from './test.js'
import {ssh} from '../src/ssh.js'

const test = suite('ssh')

test('echo', wrap(async () => {
  const $ = ssh('root@example.com')
  const {stdout} = await $`echo hello, world`
  assert.equal(stdout, 'hello, world\n')
}))

test('pipefail', wrap(async () => {
  const $ = ssh('root@example.com')
  const {exitCode} = await $.with({nothrow: true})`fail | cat`
  assert.is(exitCode, 127)
}))

test('multiplexing', wrap(async () => {
  const $ = ssh('root@example.com')
  await $`:`
  assert.ok($.check())
  $.exit()
  assert.not.ok($.check())
}))

test('escape arguments', wrap(async () => {
  const $ = ssh('root@example.com')
  const dirName = 'hello, world'
  try {
    await $`mkdir ${dirName}`
    assert.ok($.test`[ -d ${dirName} ]`)
  } finally {
    await $`rm -r ${dirName}`
  }
}))

test('other options', wrap(async () => {
  const $ = ssh('root@example.com', {
    forwardAgent: false,
    multiplexing: false,
    port: 22,
    options: {
      RequestTTY: 'no',
    }
  })
  $.exit() // to make sure the connection is closed
  await $`:`
  assert.not.ok($.check())
}))

test.run()
