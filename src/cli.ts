#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import minimist from 'minimist'
import {Context, createHost} from './host.js'
import {runTask} from './task.js'
import {Response} from './ssh.js'
import './recipe/common.js'
import {exec, humanPath} from './utils.js'
import {startSpinner, stopSpinner} from './spinner.js'
import {ask, confirm, skipPrompts} from './prompt.js'
import fs from 'node:fs'

const {cyan} = chalk

await async function main() {
  console.log(chalk.bold('Welcome to Webpod'))
  console.log(chalk.gray('+++++++++++++++++'))

  const sshV = exec.ssh('-V')
  if (sshV.status != 0) {
    console.error(`Error: ssh is not installed.`)
    process.exit(1)
  }
  const argv = minimist(process.argv.slice(2), {
    boolean: [
      'yes',
      'verbose',
      'multiplexing',
      'static',
    ],
    string: ['scripts'],
    alias: {
      yes: 'y',
    },
    default: {
      verbose: false,
      multiplexing: process.platform != 'win32',
      static: true, // TODO: This overrides the `defaults.static = true` in src/recipe/common.ts
    }
  })
  skipPrompts(argv.yes)

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

  do {
    const framework = detectFramework()
    await setupFramework(framework, context)

    await context.host.domain
    await context.host.uploadDir
    await context.host.publicDir

    if (framework == 'next') {
      console.log(`${cyan('Next.js')} detected`)
    } else {
      console.log(`Uploading ${cyan(humanPath(await context.host.uploadDir))} to ${cyan(await context.host.remoteUser + '@' + await context.host.hostname)}`)
      if (await context.host.static) {
        console.log(`Serving ${cyan(humanPath(await context.host.uploadDir, await context.host.publicDir))} at ${cyan('https://' + await context.host.domain)}`)
      }
      for (const script of await context.host.scripts) {
        console.log(`Running ${cyan(humanPath(await context.host.uploadDir, script))}`)
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

  console.log(`${chalk.green('Done!')} ${chalk.cyan('https://' + await context.host.domain)} 🎉`)

}().catch(handleError)

async function setupFramework(framework: string | undefined, context: Context) {
  if (!framework) return
  if (framework == 'next') {
    context.config.uploadDir = '.'
    context.config.publicDir = '.'
    context.config.static = false
    context.config.scripts = ['node_modules/.bin/next start']
  }
}

function detectFramework(): string | undefined {
  try {
    if (fs.existsSync('package.json')) {
      const packages = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      if (packages.dependencies['next']) return 'next'
    }
  } catch (err) {
    // Ignore
  }
}

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
  if (remoteUser != 'root') {
    become = 'root'
  }
  return {remoteUser, hostname, become}
}
