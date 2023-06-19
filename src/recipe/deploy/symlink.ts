import {task} from '../../task.js'
import {defaults} from '../../host.js'
import {commandSupportsOption} from '../../utils.js'

defaults.useAtomicSymlink = async ({$}) => {
  return await commandSupportsOption($, 'mv', '--no-target-directory')
}

task('deploy:symlink', async ({$, host}) => {
  const useAtomicSymlink = await host.useAtomicSymlink

  if (useAtomicSymlink) {
    await $`mv -T ${host.deployPath}/release ${host.currentPath}`
  } else {
    await $`cd ${host.deployPath} && ln -sfn ${host.releasePath} ${host.currentPath}`
    await $`cd ${host.deployPath} && rm release`
  }
}).as('webpod')
