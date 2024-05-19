import assert from 'node:assert'
import {it, describe} from 'node:test'
import {wrap} from './test.js'
import {ssh} from '../src/ssh.js'

describe('ssh', () => {
  it('echo', wrap(async () => {
    const $ = ssh({
      remoteUser: 'root',
      hostname: 'example.com',
    })
    const {stdout} = await $`echo hello, world`
    assert.equal(stdout, 'hello, world\n')
  }))

  it('pipefail', wrap(async () => {
    const $ = ssh({
      remoteUser: 'root',
      hostname: 'example.com',
    })
    const {exitCode} = await $.with({nothrow: true})`fail | cat`
    assert.equal(exitCode, 127)
  }))

  it('multiplexing', wrap(async () => {
    const $ = ssh({
      remoteUser: 'root',
      hostname: 'example.com',
    })
    await $`:`
    assert.ok($.check())
    $.exit()
    assert.ok(!$.check())
  }))

  it('escape arguments', wrap(async () => {
    const $ = ssh({
      remoteUser: 'root',
      hostname: 'example.com',
    })
    const dirName = 'hello, world'
    try {
      await $`mkdir ${dirName}`
      assert.ok($.test`[ -d ${dirName} ]`)
    } finally {
      await $`rm -r ${dirName}`
    }
  }))

  it('other options', wrap(async () => {
    const $ = ssh({
      remoteUser: 'root',
      hostname: 'example.com',
      multiplexing: false,
      port: 22,
      ssh: {
        RequestTTY: 'no',
      }
    })
    $.exit() // to make sure the connection is closed
    await $`:`
    assert.ok(!$.check())
  }))
})
