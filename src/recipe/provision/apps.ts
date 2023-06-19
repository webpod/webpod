import {task} from '../../task.js'
import {App, defaults} from '../../host.js'

defaults.apps = async ({host, $}) => {
  const ports = JSON.parse((await $`cat /home/webpod/.webpod/ports.json || echo '{}'`).toString())
  const apps: App[] = []
  for (const cmd of await host.scripts) {
    const portsKey = await host.domain + '/' + cmd
    const port = ports[portsKey] ?? randomPort()
    ports[portsKey] = port

    const [script, args] = cmd.split(' ', 2)
    apps.push({
      name: await host.domain,
      script,
      args,
      cwd: await host.currentPath,
      interpreter: await host.nodePath,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        PORT: port,
        NODE_ENV: 'production',
      },
    })
  }
  await $`echo ${JSON.stringify(ports, null, 2)} > /home/webpod/.webpod/ports.json`
  return apps
}

task('provision:apps', async ({host, $: root$}) => {
  const $ = root$.with({become: 'webpod'})
  const scripts = await host.scripts
  if (!scripts.length) return

  if (!await root$.test`pm2 --version`) {
    await root$`npm i -g pm2@5.3.0`
    await root$`pm2 startup`
  }

  await $`echo ${'module.exports = ' + JSON.stringify({apps: await host.apps}, null, 2)} > ${host.deployPath}/apps.config.js`
})

function randomPort() {
  return Math.floor(Math.random() * 10000) + 10000
}
