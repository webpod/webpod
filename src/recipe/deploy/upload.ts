import {task} from '../../task.js'
import {addr, readDir, spawn} from '../../utils.js'
import path from 'node:path'

task('deploy:upload', async ({host, $}) => {
  // const files = readDir(path.join(process.cwd(), 'dist/'))
  const files = readDir('dist/')
  console.log(files)
  // const remoteUser = await host.remoteUser
  // const hostname = await host.hostname
  // const args = [
  //   '-azP',
  //   'dist/',
  //   `${addr({hostname, remoteUser})}:${await host.releasePath}`
  // ]
  // console.log(`rsync ${args.join(' ')}`)
  // await spawn('rsync', args)
  // await $`ls ${await host.releasePath}`
})
