import {task} from '../../task.js'
import {defaults} from '../../host.js'

defaults.sudoPassword = async () => {
  return Math.random().toString(36).slice(-8)
}

task('provision:user', async ({host, $}) => {
  if (await $.test`id webpod >/dev/null 2>&1`) {
    return
  }
  await $`useradd webpod`
  await $`mkdir -p /home/webpod/.ssh`
  await $`mkdir -p /home/webpod/.webpod`
  await $`adduser webpod sudo`

  await $`chsh -s /bin/bash webpod`
  await $`cp /root/.profile /home/webpod/.profile`
  await $`cp /root/.bashrc /home/webpod/.bashrc`

  // Make color prompt.
  await $`sed -i \'s/#force_color_prompt=yes/force_color_prompt=yes/\' /home/webpod/.bashrc`

  const password = await $`mkpasswd -m sha-512 ${host.sudoPassword}`
  await $`usermod --password ${password.stdout.trim()} webpod`

  await $`cp /root/.ssh/authorized_keys /home/webpod/.ssh/authorized_keys`
  await $`ssh-keygen -f /home/webpod/.ssh/id_rsa -t rsa -N ""`

  await $`chown -R webpod:webpod /home/webpod`
  await $`chmod -R 755 /home/webpod`
  await $`chmod 700 /home/webpod/.ssh/id_rsa`

  await $`usermod -a -G www-data webpod`
  await $`usermod -a -G caddy webpod`
  await $`groups webpod`
})
