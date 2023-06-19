import {task} from '../../task.js'
import {defaults} from '../../host.js'

defaults.fnmPath = '/home/webpod/.fnm'
defaults.nodePath = async ({host, $}) => {
  const $$ = $.with({env: {'PATH++': await host.fnmPath}})
  return (await $$`fnm exec --using ${await host.nodeVersion} which node`).toString()
}

task('provision:node', async ({host, $: root$}) => {
  // const lsbRelease = (await root$`lsb_release -s -c`).toString()
  // const keyring = '/usr/share/keyrings/nodesource.gpg';
  // await root$`curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor | sudo tee ${keyring} >/dev/null`
  // await root$`gpg --no-default-keyring --keyring ${keyring} --list-keys`
  // await root$`echo 'deb [signed-by=${keyring}] https://deb.nodesource.com/node_18.x ${lsbRelease} main' | sudo tee /etc/apt/sources.list.d/nodesource.list`
  // await root$`echo 'deb-src [signed-by=${keyring}] https://deb.nodesource.com/node_18.x ${lsbRelease} main' | sudo tee -a /etc/apt/sources.list.d/nodesource.list`
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
