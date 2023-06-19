import inquirer from 'inquirer'
import {defaults} from '../host.js'

import './deploy/index.js'
import './provision/index.js'
import path from 'node:path'
import fs from 'node:fs'

defaults.remoteUser = 'root'
defaults.become = undefined
defaults.verbose = false
defaults.publicDir = async () => {
  const answers = await inquirer.prompt({
    name: 'publicDir',
    type: 'input',
    message: 'Public directory:',
    default: '.',
  })
  return answers.publicDir
}
defaults.buildDir = async () => {
  let defaultDir = '.'
  const dirs = [
    'dist',
    'build',
  ]
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir)
    if (fs.existsSync(dirPath)) {
      defaultDir = dir
    }
  }

  const answers = await inquirer.prompt({
    name: 'text',
    type: 'input',
    message: 'Build directory ("dist", "build") to upload:',
    default: defaultDir,
  })
  return answers.text
}
defaults.nodeVersion = '18'
defaults.domain = async ({host}) => {
  // const answers = await inquirer.prompt({
  //   name: 'domain',
  //   type: 'input',
  //   message: 'Domain name:',
  //   default: await host.hostname,
  // })
  // return answers.domain
  return await host.hostname
}
defaults.deployPath = async ({host}) => `/home/webpod/${await host.domain}`
