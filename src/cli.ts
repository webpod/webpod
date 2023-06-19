#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import minimist from 'minimist'
import {createHost} from './host.js'
import {runTask} from './task.js'
import {Response} from './ssh.js'
import './recipe/common.js'
import {exec, humanPath} from './utils.js'
import {startSpinner, stopSpinner} from './spinner.js'
import {ask, confirm} from './prompt.js'
import path from 'node:path'

await async function main() {
  const sshV = exec.ssh('-V')
  if (sshV.status != 0) {
    console.error(`Error: ssh is not installed.`)
    process.exit(1)
  }

  const argv = minimist(process.argv.slice(2), {
    boolean: ['verbose', 'multiplexing'],
    default: {
      verbose: false,
      multiplexing: process.platform != 'win32',
    }
  })

  console.log(chalk.bold('Welcome to Webpod'))
  console.log(chalk.gray('+++++++++++++++++'))

  let remoteUser, hostname, become
  if (argv._.length == 1) {
    ({remoteUser, hostname, become} = parseHost(argv._[0]))
  } else if (argv._.length == 0) {
    ({remoteUser, hostname, become} = parseHost(await ask('Enter hostname: ')))
  }

  const context = createHost({
    remoteUser,
    hostname,
    become,
    ...argv,
  })

  do {
    await context.host.domain
    await context.host.uploadDir
    await context.host.publicDir

    const c = chalk.cyan
    console.log(`Uploading ${c(humanPath(await context.host.uploadDir))} to ${c(await context.host.remoteUser + '@' + await context.host.hostname)}`)
    console.log(`Serving ${c(humanPath(await context.host.uploadDir, await context.host.publicDir))} at ${c('https://' + await context.host.domain)}`)

    if (await confirm(`Correct?`)) {
      break
    } else {
      delete context.config.domain
      delete context.config.uploadDir
      delete context.config.publicDir
    }
  } while (true)


  if (!context.config.verbose) startSpinner()

  try {
    await runTask('provision', context)
    context.config.become = 'webpod'
    context.$ = context.$.with({become: 'webpod'})
    await runTask('deploy', context)
  } finally {
    stopSpinner()
  }

  console.log(`${chalk.green('Done!')} ${chalk.cyan('https://' + await context.host.domain)} 🎉`)

}().catch(handleError)

function handleError(error: any) {
  if (error instanceof Response) {
    console.error(
      `\nThe following command failed with exit code ${chalk.red(error.exitCode)}:\n\n` +
      `  ` + chalk.bgRed.white(`$ ${error.command}`) + `\n\n` +
      error.stderr,
      error.stdout
    )
    if (error.error) {
      console.error(error.error)
    }
    process.exitCode = 1
  } else {
    throw error
  }
}

function parseHost(remoteUserAndHostname: string) {
  let remoteUser, hostname, become
  if (remoteUserAndHostname.includes('@')) {
    [remoteUser, hostname] = remoteUserAndHostname.split('@', 2)
  } else {
    hostname = remoteUserAndHostname
    if (hostname.endsWith('.compute.amazonaws.com')) {
      remoteUser = 'ubuntu'
    }
  }
  if (hostname.endsWith('.compute.amazonaws.com') && remoteUser == 'ubuntu') {
    become = 'root'
  }
  if (!remoteUser) {
    remoteUser = 'root'
  }
  return {remoteUser, hostname, become}
}
