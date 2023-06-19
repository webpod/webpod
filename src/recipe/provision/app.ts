import {task} from '../../task.js'

task('provision:app', async ({host, $: root$}) => {
  const $ = root$.with({become: 'webpod'})
  const scripts = await host.scripts
  if (!scripts.length) return

  if (!await root$.test`pm2 --version`) {
    await root$`npm i -g pm2@5.3.0`
    await root$`pm2 startup`
  }

  const deployPath = (await $`realpath ${host.deployPath}`).toString()
  $.cd(deployPath)

  const exports: { apps: Record<string, any> } = {apps: []}
  for (const cmd of scripts) {
    const [script, args] = cmd.split(' ', 2)
    exports.apps.push({
      name: await host.domain,
      script,
      args,
      cwd: await host.currentPath,
      interpreter: await host.nodePath,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
    })
  }

  await $`echo ${'module.exports = ' + JSON.stringify(exports, null, 2)} > apps.config.js`
})
