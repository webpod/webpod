import {task} from '../../task.js'

task('provision:check', async ({host, $}) => {
  const remoteUser = await host.remoteUser
  const become = await host.become
  if (remoteUser != 'root' && become != 'root') {
    throw new Error('Remote user must be root or become root')
  }
  const version = (await $`cat /etc/os-release | grep VERSION_ID`)
    .split('=')[1].replace(/"/g, '')
  if (![20, 22].includes(parseInt(version))) {
    throw new Error('Ubuntu version must be 20 or 22')
  }
})
