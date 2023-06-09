import {task} from '../../task.js'

task('provision:check', async ({host, $}) => {
  const remoteUser = await host.remoteUser
  if (remoteUser !== 'root') {
    throw new Error('Remote user must be root')
  }
  const version = (await $`cat /etc/os-release | grep VERSION_ID`)
    .split('=')[1].replace(/"/g, '')
  if (![20, 22].includes(parseInt(version))) {
    throw new Error('Ubuntu version must be 20 or 22')
  }
})
