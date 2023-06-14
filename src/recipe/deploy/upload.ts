import fs from 'node:fs'
import {task} from '../../task.js'
import {addr, escapeshellarg, exec, readDir} from '../../utils.js'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {sshArgs} from '../../ssh.js'

task('deploy:upload', async ({host, $, config}) => {
  let dirToUpload = getBuildDir()
  dirToUpload = path.resolve(dirToUpload) + '/'

  if (exec.rsync('-h').status !== 0) {
    const files = readDir(dirToUpload)
    const createdDirs = new Set()
    for (const file of files) {
      const remotePath = `${await host.releasePath}/${file}`
      const remoteDir = path.dirname(remotePath)
      if (!createdDirs.has(remoteDir)) {
        await $`mkdir -p ${path.dirname(remotePath)}`
        createdDirs.add(remoteDir)
      }
      await $.upload(`dist/${file}`, remotePath)
    }
  } else {
    const remoteUser = await host.remoteUser
    const hostname = await host.hostname
    const args = ['-azP']
    args.push('-e', 'ssh ' + sshArgs(config).slice(1).map(escapeshellarg).join(' '))
    if (config.become) {
      args.push('--rsync-path', `sudo -H -u ${escapeshellarg(config.become)} rsync`)
    }
    args.push(
      dirToUpload,
      `${addr(config)}:${await host.releasePath}`
    )
    if (await host.verbose) {
      console.error('$ rsync', args.map(escapeshellarg).join(' '))
    }
    await rsync(args)
    await $`ls ${await host.releasePath}`
  }
})

async function rsync(args: string[]) {
  const child = spawn('rsync', args, {stdio: 'pipe'})
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = ''
    child.stdout?.on('data', data => stdout += data)
    child.stderr?.on('data', data => stderr += data)
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({stdout, stderr})
      } else {
        reject(new Error(stderr))
      }
    })
  })
}

function getBuildDir() {
  const dirs = [
    'dist',
    'build',
  ]

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir)
    if (fs.existsSync(dirPath)) {
      return path.resolve(dirPath) + '/'
    }
  }

  return path.resolve('.') + '/'
}
