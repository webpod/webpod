import {task} from '../../task.js'
import {addr, spawn} from '../../utils.js'

task('deploy:upload', async ({host, $}) => {
  const remoteUser = await host.remoteUser
  const hostname = await host.hostname
  const args = [
    '-azP',
    'dist/',
    `${addr({hostname, remoteUser})}:${await host.releasePath}`
  ]
  await spawn('rsync', args)
  await $`ls ${await host.releasePath}`
})
