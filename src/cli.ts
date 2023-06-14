import process from 'node:process'
import chalk from 'chalk'
import {createHost} from './host.js'
import {runTask} from './task.js'
import './recipe/provision/index.js'
import './recipe/deploy/index.js'
import {Response} from './ssh.js'

await async function main() {
  const remoteUserAndHostname = process.argv[2]
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

  const context = createHost({
    remoteUser,
    hostname,
    become,
    deployPath: '/home/webpod/demo',
  })
  await runTask('provision', context)
  await runTask('deploy', context)

}().catch(handleError)

function handleError(error: any) {
  if (error instanceof Response) {
    console.error(
      `\nThe following command failed with exit code ${chalk.red(error.exitCode)}:\n\n` +
      `  ` + chalk.bgRedBright.white(`$ ${error.command}`) + `\n\n` +
      error.stderr,
      error.stdout
    )
    process.exitCode = 1
  } else {
    throw error
  }
}
