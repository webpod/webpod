import {task} from "../../task.js"

task('deploy:lock', async ({$, host}) => {
  const locked = await $`[ -f ${await host.deployPath}/.webpod/deploy.lock ] && printf +locked || echo ${await host.userStartedDeploy} > ${await host.deployPath}/.webpod/deploy.lock`
  if (locked.stdout == '+locked') {
    const lockedUser = await $`cat ${await host.deployPath}/.webpod/deploy.lock`
    throw new Error(
      `Deploy locked by ${lockedUser}. Execute "deploy:unlock" task to unlock.`
    )
  }
})

task('deploy:unlock', async ({$, host}) => {
  await $`rm -f ${await host.deployPath}/.webpod/deploy.lock`
})
