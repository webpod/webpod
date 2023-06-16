#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import minimist from 'minimist'
import {createHost} from './host.js'
import {currentlyRunningTask, runTask} from './task.js'
import {Response} from './ssh.js'
import './recipe/common.js'
import {exec, secondsToHumanReadableFormat} from './utils.js'

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

  const remoteUserAndHostname = argv._[0]
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

  const context = createHost({
    remoteUser,
    hostname,
    become,
    ...argv,
  })

  //await context.host.domain

  let spinner: NodeJS.Timer | undefined
  if (!context.config.verbose) {
    let s = 0
    let startedAt = new Date()
    const spin = () => {
      const time = secondsToHumanReadableFormat((new Date().getTime() - startedAt.getTime()) / 1000)
      const display = `  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[s++ % 10]}  ${time} :: ${currentlyRunningTask}`
      process.stderr.write(`${display}${' '.repeat(process.stderr.columns - 1 - display.length)}\r`)
    }
    spinner = setInterval(spin, 100)
  }

  try {
    await runTask('provision', context)
    context.config.become = 'webpod'
    context.$ = context.$.with({become: 'webpod'})
    await runTask('deploy', context)
  } finally {
    if (spinner) {
      clearInterval(spinner)
      process.stderr.write(' '.repeat(process.stderr.columns - 1) + '\r')
    }
  }

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
