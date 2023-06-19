import {task} from "../../task.js"
import {defaults} from "../../host.js"
import {exec} from "../../utils.js"

defaults.userStartedDeploy = async () => {
  if (process.env.CI) {
    return 'ci'
  }
  let name = exec.git('config', '--get', 'user.name')
  if (name.status === 0) {
    return name.trim()
  }
  name = exec.whoami()
  if (name.status === 0) {
    return name.trim()
  }
  return 'no_user'
}

task('deploy:lock', async ({$, host}) => {
  const locked = await $`[ -f ${await host.deployPath}/.webpod/deploy.lock ] && printf +locked || echo ${await host.userStartedDeploy} > ${await host.deployPath}/.webpod/deploy.lock`
  if (locked.stdout == '+locked') {
    const lockedUser = await $`cat ${await host.deployPath}/.webpod/deploy.lock`
    throw new Error(
      `Deploy locked by ${lockedUser}. Execute "deploy:unlock" task to unlock.`
    )
  }
}).as('webpod')

task('deploy:unlock', async ({$, host}) => {
  await $`rm -f ${await host.deployPath}/.webpod/deploy.lock`
}).as('webpod')
