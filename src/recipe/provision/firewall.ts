import {task} from '../../task.js'

task('provision:firewall', async ({host, $}) => {
  await $`ufw allow 22`
  await $`ufw allow 80`
  await $`ufw allow 443`
  await $`ufw --force enable`
})
