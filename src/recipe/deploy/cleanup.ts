import {task} from '../../task.js'
import {defaults} from '../../host.js'

defaults.cleanupUseSudo = async () => false
defaults.keepReleases = async () => 10

task('deploy:cleanup', async ({$, host}) => {
  const releases = await host.releasesList
  const keep = await host.keepReleases
  const sudo = await host.cleanupUseSudo ? 'sudo' : ''

  await $`cd ${host.deployPath} && if [ -e release ]; then rm release; fi`

  if (keep > 0) {
    for (const release of releases.slice(0, -keep)) {
      await $`${sudo} rm -rf ${await host.deployPath}/releases/${release}`
    }
  }
}).as('webpod')
