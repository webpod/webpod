import assert from 'node:assert'
import {it, describe} from 'node:test'
import {wrap} from './test.js'
import {createHost, defaults} from '../src/host.js'

describe('host', () => {
  it('createHost', wrap(async () => {
    const {host} = createHost({
      remoteUser: 'root',
      hostname: 'example.com',
    })
    assert.equal(await host.hostname, 'example.com')
    assert.equal(await host.remoteUser, 'root')
  }))

  it('define', wrap(async () => {
    const {host} = createHost({
      remoteUser: 'root',
      hostname: 'example.com',
    })
    defaults['str:whoami'] = async ({$}) => {
      return (await $`whoami`).toString()
    }
    assert.equal((await host['str:whoami']), 'root')
  }))

  it('await promise in $', wrap(async () => {
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
})
