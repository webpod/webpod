import {task} from '../../task.js'
import fs from 'node:fs'
import * as path from 'path'
import os from 'node:os'

task('provision:ssh', async ({host, $}) => {
  await $`sed -i \'s/PasswordAuthentication .*/PasswordAuthentication no/\' /etc/ssh/sshd_config`
  await $`ssh-keygen -A`

  if (await host.hostname !== 'localhost') {
    await $`service ssh restart`
  }

  if (await $.test`[ ! -d /root/.ssh ]`) {
    await $`mkdir -p /root/.ssh`
    await $`touch /root/.ssh/authorized_keys`
  }

  const keys = ['id_rsa.pub', 'id_dsa.pub', 'id_ecdsa.pub', 'id_ed25519.pub']
  let publicKey: string | undefined

  for (let key of keys) {
    const publicKeyPath = path.join(os.homedir(), '.ssh', key)
    if (fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath).toString()
      break
    }
  }

  if (publicKey) {
    await $`echo ${publicKey} >> /root/.ssh/authorized_keys`
  }
})
