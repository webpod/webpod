#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import minimist from 'minimist'
import {createHost, parseHost} from './host.js'
import {runTask} from './task.js'
import './recipe/common.js'
import {exec, humanPath} from './utils.js'
import {startSpinner, stopSpinner} from './spinner.js'
import {ask, confirm, skipPrompts} from './prompt.js'
import fs from 'node:fs'
import {handleError, StopError} from './error.js'
import {detectFramework, setupFramework} from './framework.js'
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

  let task, remoteUser, hostname, become
  if (argv._.length == 2) {
    task = argv._[0];
    ({remoteUser, hostname, become} = parseHost(argv._[1]))
  } else if (argv._.length == 1) {
    ({remoteUser, hostname, become} = parseHost(argv._[0]))
  } else if (argv._.length == 0) {
    ({remoteUser, hostname, become} = parseHost(await ask('Enter hostname: ')))
  }
  if (!task) {
    task = 'provision-and-deploy'
  }
  if (argv.scripts && !Array.isArray(argv.scripts)) {
    argv.scripts = [argv.scripts]
  }

  const context = createHost({
    remoteUser,
    hostname,
    become,
    ...argv,
  })

  // Check SSH connection
  const shellName = await context.$.with({nothrow: true})`echo $0`
  if (shellName.toString() != 'bash') {
    throw new StopError(
      `Webpod cannot connect to ${bold(`${remoteUser}@${hostname}`)}`,
      `Please, verify that you can connect to the host using ${bold('ssh')} command.\n\n` +
      `    ssh ${remoteUser}@${hostname} ${context.config.port ? `-p ${context.config.port}` : ''}\n`
    )
  }

  do {
    const framework = detectFramework()
    await setupFramework(framework, context)

    await context.host.domain
    await context.host.uploadDir
    await context.host.publicDir

    console.log(`Webpod now will configure your server with:`)
    console.log(` ${bold('✔')} Updates`)
    console.log(` ${bold('✔')} Firewall`)
    console.log(` ${bold('✔')} Webserver`)
    console.log(` ${bold('✔')} SSL/TLS certificates`)
    console.log(` ${bold('✔')} Node.js`)
    console.log(` ${bold('✔')} Supervisor`)
    console.log(`and deploy your app:`)
    if (framework == 'next') {
      console.log(`${cyan('Next.js')} detected`)
    } else {
      console.log(` ${bold('✔')} Uploading ${cyan(humanPath(await context.host.uploadDir))} to ${cyan(await context.host.remoteUser + '@' + await context.host.hostname)}`)
      if (await context.host.static) {
        console.log(` ${bold('✔')} Serving ${cyan(humanPath(await context.host.uploadDir, await context.host.publicDir))} at ${cyan('https://' + await context.host.domain)}`)
      }
      for (const script of await context.host.scripts) {
        console.log(` ${bold('✔')} Running ${cyan(humanPath(await context.host.uploadDir, script))}`)
      }
    }

    if (await confirm(`Correct?`)) {
      break
    } else {
      delete context.config.domain
      delete context.config.uploadDir
      delete context.config.publicDir
      delete context.config.scripts
    }
  } while (true)

  if (!context.config.verbose) startSpinner()
  try {
    await runTask(task, context)
  } finally {
    stopSpinner()
  }

  console.log(`${green('Done!')} ${cyan('https://' + await context.host.domain)} 🎉`)

}().catch(handleError)
