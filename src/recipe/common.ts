import {defaults} from '../host.js'
import path from 'node:path'
import fs from 'node:fs'
import {ask} from '../prompt.js'
import {humanPath} from '../utils.js'
import './deploy/index.js'
import './provision/index.js'
import {task} from '../task.js'
import chalk from 'chalk'

task('provision-and-deploy', [
  'provision',
  'deploy',
]);

defaults.remoteUser = 'root'
defaults.become = undefined
defaults.verbose = false
defaults.nodeVersion = '18'
defaults.deployPath = async ({host}) => `/home/webpod/${await host.domain}`

defaults.publicDir = async ({host}) => {
  const uploadDir = path.resolve(await host.uploadDir)
  let publicDir = '.'
  const dirs = [
    '.',
    'public',
    'static',
  ]
  for (const dir of dirs) {
    const dirPath = path.join(uploadDir, dir, 'index.html')
    if (fs.existsSync(dirPath)) {
      publicDir = dir
      break
    }
  }

  return ask('Public directory:', publicDir)
}

defaults.uploadDir = async () => {
  let uploadDir = '.'
  const dirs = [
    'dist',
    'build',
  ]

  // Angular build to dist/<project-name>
  const files = fs.readdirSync(path.join(process.cwd(), 'dist'))
  if (files.length === 1 && fs.statSync(path.join(process.cwd(), 'dist', files[0])).isDirectory()) {
    dirs.unshift(path.join('dist', files[0]))
  }

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir)
    if (fs.existsSync(dirPath)) {
      uploadDir = dir
      break
    }
  }

  console.log(`${chalk.green('!')} ${chalk.underline('Build your project before deploying.')}`)
  return ask('Upload directory:', uploadDir)
}

defaults.domain = async ({host}) => {
  let hostname: string | undefined = await host.hostname
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    hostname = undefined
  }
  let domain = hostname
  do {
    domain = await ask('Domain:', hostname)
  } while (domain == '')
  return domain
}

defaults.scripts = []
