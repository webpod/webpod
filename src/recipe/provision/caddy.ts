import {task} from '../../task.js'

task('provision:caddy', async ({host, $}) => {
  await $`curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg`
  await $`curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list`
  await $`export DEBIAN_FRONTEND=noninteractive; apt-get update -y`
  await $`export DEBIAN_FRONTEND=noninteractive; apt-get install -y caddy`
  await $`usermod -a -G www-data caddy`
})
