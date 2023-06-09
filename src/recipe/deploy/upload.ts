import {task} from '../../task.js'
import {spawn} from '../../utils.js'

task('deploy:upload', async ({host, $}) => {
  const args = [
    '-azP',
    'dist/',
    `${await host.remoteUser}@${await host.hostname}:${await host.releasePath}`
  ]
  await spawn('rsync', args)
  await $`ls ${await host.releasePath}`
})
