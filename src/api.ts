import os from 'node:os'
import {URL} from 'node:url'
import {createHash} from 'node:crypto'
import chalk from 'chalk'
import fetch from 'node-fetch'
import open from 'open'
import {randomString, sleep} from './utils.js'
import {confirm} from './prompt.js'
import fs from 'node:fs'
import {webpodLocalConfig} from './env.js'

export async function login() {
  let baseUrl = 'https://app.webpod.dev'
  const localDev = createHash('sha1').update(process.env.WEBPOD_LOCAL_DEV ?? '').digest('hex')
  if (localDev == 'd4f57dba817bd3ddc1101e3498754ed234f08094') {
    baseUrl = 'http://0.0.0.0:8000'
  }
  const resp = await fetch(`${baseUrl}/api/user`, {
    headers: {
      Authorization: `Bearer ${process.env.WEBPOD_TOKEN}`,
      Accept: 'application/json',
    },
  })
  if (resp.status == 200) {
    const {id} = await resp.json() as { id: number }
    if (!Number.isFinite(id)) {
      throw new Error('Invalid user id')
    }
    return
  }

  const randomCode = [randomString(), randomString(), randomString()].join('-')
  const url = new URL(`${baseUrl}/api-token`)
  url.searchParams.set('code', randomCode)
  url.searchParams.set('hostname', os.hostname())
  console.log(`Please visit ${chalk.underline(url.href)} to login.`)
  if (await confirm(`Open in browser?`)) {
    await open(url.href)
  }

  console.log(chalk.magenta('Waiting for login...'))
  console.log('Alternatively, you can:')
  console.log('-  Create API Token: https://app.webpod.dev/user/api-tokens')
  console.log(`-  Set the ${chalk.bold('WEBPOD_TOKEN')} environment variable to the token.`)

  while (true) {
    await sleep(3000)

    const resp = await fetch(`${baseUrl}/api-token/${randomCode}`, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (resp.status != 200) {
      continue
    }

    const json = await resp.json() as { ok: number, token: string }
    if (!json.ok) {
      continue
    }

    fs.appendFileSync(webpodLocalConfig(), `\nglobal.WEBPOD_TOKEN = '${json.token}';\n`)
    process.env.WEBPOD_TOKEN = json.token
    console.log(chalk.green('Login successful!'))

    return
  }
}
