import inquirer from 'inquirer'
import {defaults} from '../host.js'

import './deploy/index.js'
import './provision/index.js'

defaults.remoteUser = 'root'
defaults.become = undefined
defaults.verbose = false
defaults.publicDir = async () => {
  const answers = await inquirer.prompt({
    name: 'publicDir',
    type: 'input',
    message: 'Upload directory (usually dist or build):',
    default: '.',
  })
  return answers.publicDir
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
