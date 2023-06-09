import {task} from '../../task.js'

task('provision:install', async ({host, $}) => {
  const packages = [
    'apt-transport-https',
    'build-essential',
    'curl',
    'debian-archive-keyring',
    'debian-keyring',
    'fail2ban',
    'gcc',
    'git',
    'libmcrypt4',
    'libpcre3-dev',
    'libsqlite3-dev',
    'make',
    'ncdu',
    'pkg-config',
    'python-is-python3',
    'redis',
    'sendmail',
    'sqlite3',
    'ufw',
    'unzip',
    'uuid-runtime',
    'whois',
  ]
  await $`export DEBIAN_FRONTEND=noninteractive; apt-get install -y ${packages}`
})
