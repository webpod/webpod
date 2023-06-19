import fs from 'node:fs'
import {task} from '../../task.js'
import {addr, escapeshellarg, exec} from '../../utils.js'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {sshArgs} from '../../ssh.js'

task('deploy:upload', async ({host, $, config}) => {
  const dirToUpload = path.resolve(await host.uploadDir)
  if (exec.rsync('-h').status !== 0) {
    const args = [
      '-r',
      dirToUpload + '/*',
      `${addr(config)}:${await host.releasePath}`
    ]
    if (await host.verbose) {
      console.error('$ scp', args.map(escapeshellarg).join(' '))
    }
    await run('scp', args)
    if (config.become) {
      await $.with({become: undefined})`chown -R ${escapeshellarg(config.become)}:${escapeshellarg(config.become)} ${await host.releasePath}`
    }
  } else {
    const args = ['-azP']
    args.push('-e', 'ssh ' + sshArgs(config).slice(1).map(escapeshellarg).join(' '))
    if (config.become) {
      args.push('--rsync-path', `sudo -H -u ${escapeshellarg(config.become)} rsync`)
    }
    args.push(
      dirToUpload + '/',
      `${addr(config)}:${await host.releasePath}`
    )
    if (await host.verbose) {
      console.error('$ rsync', args.map(escapeshellarg).join(' '))
    }
    await run('rsync', args)
  }
  await $`ls ${await host.releasePath}`
})

async function run(bin: string, args: string[]) {
  const child = spawn(bin, args, {stdio: 'pipe'})
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
