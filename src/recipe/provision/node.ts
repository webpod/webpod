import {task} from '../../task.js'
import {defaults} from '../../host.js'

defaults.fnmPath = '/home/webpod/.fnm'
defaults.nodePath = async ({host, $}) => {
  const $$ = $.with({
    become: 'webpod',
    env: {'PATH++': await host.fnmPath}
  })
  return (await $$`fnm exec --using ${await host.nodeVersion} which node`).toString()
}

task('provision:node', async ({host, $: root$}) => {
  await root$`curl -fsSL https://deb.nodesource.com/setup_18.x | bash -`
  await root$`export DEBIAN_FRONTEND=noninteractive; apt-get install -y nodejs`

  const fnmPath = await host.fnmPath
  const $ = root$.with({
    become: 'webpod',
    env: {'PATH++': fnmPath},
  })
  const nodeVersion = await host.nodeVersion

  if (!await $.test`fnm --version`) {
    await $`curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir ${fnmPath} --skip-shell`
    if (!await $.test`grep 'fnm env' ~/.bashrc`) {
      await $`echo '# fnm' >> ~/.bashrc`
      await $`echo ${`export PATH="$PATH:${await host.fnmPath}"`} >> ~/.bashrc`
      await $`echo 'eval "$(fnm env)"' >> ~/.bashrc`
    }
  }
  await $`fnm install ${nodeVersion}`
})
