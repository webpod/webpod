import {task} from '../../task.js'

task('provision:update', async ({$}) => {
  await $`export DEBIAN_FRONTEND=noninteractive; apt-get update -y`
})

task('provision:upgrade', async ({$}) => {
  await $`export DEBIAN_FRONTEND=noninteractive; apt-get update -y`
})
