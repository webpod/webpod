import {task, define} from '../index.js'

define('hi', async ({$}) => {
  return await $`date`
})

task('deploy', async ({host, $}) => {
  console.log(await $`echo ${await host.hi}`)
})


task('deploy:setup', async ({host, $}) => {
  await $`
    [ -d ${await host.deployPath} ] || mkdir -p ${await host.deployPath};
    cd ${await host.deployPath};
    [ -d .webpod ] || mkdir .webpod;
    [ -d releases ] || mkdir releases;
    [ -d shared ] || mkdir shared;
  `
  // If current_path points to something like "/var/www/html", make sure it is
  // a symlink and not a directory.
  if (await $.test`[ ! -L ${await host.currentPath} ] && [ -d ${await host.currentPath} ]`) {
    throw new Error(
      `There is a directory (not symlink) at {{current_path}}.\n` +
      `Remove this directory so it can be replaced with a symlink for atomic deployments.`
    );
  }
})
