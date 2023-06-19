import {task} from '../../task.js'

task('deploy:reload', async ({host, $}) => {
  if ((await host.scripts).length === 0) return
  $.cd(await host.deployPath)
  await $`pm2 reload apps.config.js`
  await $`pm2 save`
})
