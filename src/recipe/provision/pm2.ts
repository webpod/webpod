import {task} from '../../task.js'

task('provision:pm2', async ({host, $}) => {
  await $`npm i -g pm2`
  await $`pm2 startup`

  const deployPath = (await $`realpath ${host.deployPath}`).toString()
  $.cd(deployPath)


  // module.exports = {
  //   apps : [{
  //     name: 'do.webpod.site',
  //     script: 'node_modules/.bin/next',
  //     args: 'start',
  //     cwd: '/home/webpod/do.webpod.site/current',
  //     instances: 2,
  //     exec_mode: "cluster",
  //     increment_var : 'PORT',
  //     interpreter: '/root/.local/share/fnm/node-versions/v18.16.0/installation/bin/node',
  //     env: {
  //       "PORT": 3000,
  //       "NODE_ENV": "production",
  //     }
  //   }],
  // };
})
