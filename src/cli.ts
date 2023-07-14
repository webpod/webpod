#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import minimist, {ParsedArgs} from 'minimist'
import {Context, createHost, parseHost} from './host.js'
import {runTask} from './task.js'
import './recipe/common.js'
import {exec} from './utils.js'
import {disableSpinner, startSpinner, stopSpinner} from './spinner.js'
import {ask, skipPrompts} from './prompt.js'
import fs from 'node:fs'
import {handleError, StopError} from './error.js'
import {login} from './api.js'
import {loadUserConfig} from './env.js'

const {cyan, grey, green, bold} = chalk

await async function main() {
  const argv = minimist(process.argv.slice(2), {
    boolean: [
      'yes',
      'verbose',
      'version',
      'multiplexing',
      'static',
    ],
    string: [
      'scripts',
      'port',
    ],
    alias: {
      yes: 'y',
      version: 'v',
    },
    default: {
      verbose: false,
      multiplexing: process.platform != 'win32',
      static: true, // TODO: This overrides the `defaults.static = true` in src/recipe/common.ts
    },
  })
  skipPrompts(argv.yes)
  normiliazeArgs(argv)

  if (argv.version) {
    console.log(JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version)
    process.exit(0)
  }

  console.log(bold('Welcome to Webpod'))
  console.log(grey('+++++++++++++++++'))

  const sshV = exec.ssh('-V')
  if (sshV.status != 0) {
    console.error(`Error: ssh is not installed.`)
    process.exit(1)
  }

  await loadUserConfig()
  await login()

  const {task, remoteUser, hostname, become} = await parseTaskAndHost(argv)

  const context = createHost({
    remoteUser,
    hostname,
    become,
    ...argv,
  })

  // Check SSH connection
  await checkSSHConnection(context)

  if (context.config.verbose) {
    disableSpinner()
  }
  startSpinner()
  try {
    await runTask(task, context)
  } finally {
    stopSpinner()
  }

  console.log(`${green('Done!')} ${cyan('https://' + await context.host.domain)} 🎉`)
}().catch(handleError)

function normiliazeArgs(argv: ParsedArgs) {
  if (argv.scripts && !Array.isArray(argv.scripts)) {
    argv.scripts = [argv.scripts]
  }
}

type TaskAndHost = {
  task: string
  remoteUser: string
  hostname: string
  become?: string
}

async function parseTaskAndHost(argv: ParsedArgs): Promise<TaskAndHost> {
  let task = 'default'
  let remoteUser: string
  let hostname: string
  let become: string | undefined
  if (argv._.length == 2) {
    task = argv._[0];
    ({remoteUser, hostname, become} = parseHost(argv._[1]))
  } else if (argv._.length == 1) {
    ({remoteUser, hostname, become} = parseHost(argv._[0]))
  } else {
    ({remoteUser, hostname, become} = parseHost(await ask('Enter hostname: ')))
  }
  return {task, remoteUser, hostname, become}
}

async function checkSSHConnection(context: Context) {
  const shellName = await context.$.with({nothrow: true})`echo $0`
  if (shellName.toString() != 'bash') {
    throw new StopError(
      `Webpod cannot connect to ${bold(`${context.config.remoteUser}@${context.config.hostname}`)}`,
      `Please, verify that you can connect to the host using ${bold('ssh')} command.\n\n` +
      `    ssh ${context.config.remoteUser}@${context.config.hostname} ${context.config.port ? `-p ${context.config.port}` : ''}\n`,
    )
  }
}
