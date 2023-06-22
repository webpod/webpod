import {task} from '../../task.js'
import {StopError} from '../../error.js'
import chalk from 'chalk'

task('provision:check', async ({host, $}) => {
  const remoteUser = await host.remoteUser
  const become = await host.become
  if (remoteUser != 'root' && become != 'root') {
    throw new StopError('Remote user must be root or become root')
  }

  const version = (await $`cat /etc/os-release | grep VERSION_ID`)
    .split('=')[1].replace(/"/g, '')
  if (![20, 22, 23].includes(parseInt(version))) {
    throw new StopError('Ubuntu version must be 20 or 22')
  }

  if (await $.test`systemctl is-active nginx`) {
    throw new StopError(
      'Nginx is already installed. Please uninstall it first.',
      'Webpod uses Caddy as a reverse proxy and Nginx conflicts with it.\n' +
      'To uninstall Nginx, run:\n\n' +
      '    ' + chalk.bold(`sudo apt remove nginx`) + '\n'
    )
  }
  if (await $.test`systemctl is-active apache2`) {
    throw new StopError(
      'Apache is already installed. Please uninstall it first.',
      'Webpod uses Caddy as a reverse proxy and Apache conflicts with it.\n' +
      'To uninstall Apache, run:\n\n' +
      '    ' + chalk.bold(`sudo apt remove apache2`) + '\n'
    )
  }
})
