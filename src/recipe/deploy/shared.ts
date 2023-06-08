import {task} from '../../task.js'
import {defaults} from '../../host.js'
import * as path from 'path'

defaults.sharedDirs = async () => []
defaults.sharedFiles = async () => []

task('deploy:shared', async ({$, host}) => {
  const sharedDirs = await host.sharedDirs
  const sharedFiles = await host.sharedFiles
  const sharedPath = `${await host.deployPath}/shared`

  // Find duplicates
  for (let a of sharedDirs) {
    for (let b of sharedDirs) {
      if (a !== b && (a + '/').startsWith(b + '/')) {
        throw new Error(`Cannot share same dirs ${a} and ${b}.`)
      }
    }
  }

  for (let dir of sharedDirs) {
    dir = dir.replace(/\/$/, '') // remove trailing slash

    if (!await $.test`[ -d ${sharedPath}/${dir} ]`) {
      // Create shared dir if it does not exist
      await $`mkdir -p ${sharedPath}/${dir}`

      // If release contains shared dir, copy that dir from release to shared
      if (await $.test`[ -d ${host.releasePath}/${dir} ]`) {
        await $`cp -r ${host.releasePath}/${dir} ${sharedPath}/${path.dirname(dir)}`
      }
    }

    // Remove from source
    await $`rm -rf ${host.releasePath}/${dir}`

    // Create path to shared dir in release dir if it does not exist
    await $`mkdir -p $(dirname ${host.releasePath}/${dir})`

    // Symlink shared dir to release dir
    await $`${host.binSymlink} ${sharedPath}/${dir} ${host.releasePath}/${dir}`
  }

  for (let file of sharedFiles) {
    const dirname = path.dirname(file)

    // Create dir of shared file if not existing
    if (!await $.test`[ -d ${sharedPath}/${dirname} ]`) {
      await $`mkdir -p ${sharedPath}/${dirname}`
    }

    // Check if shared file does not exist in shared
    // and file exist in release
    if (!await $.test`[ -f ${sharedPath}/${file} ]` && await $.test`[ -f ${host.releasePath}/${file} ]`) {
      // Copy file in shared dir if not present
      await $`cp -r ${host.releasePath}/${file} ${sharedPath}/${file}`
    }

    // Remove from source
    await $`[ -f ${host.releasePath}/${file} ] && rm -rf ${host.releasePath}/${file}`

    // Ensure dir is available in release
    await $`[ ! -d ${host.releasePath}/${dirname} ] && mkdir -p ${host.releasePath}/${dirname}`

    // Touch shared
    await $`[ ! -f ${sharedPath}/${file} ] && touch ${sharedPath}/${file}`

    // Symlink shared dir to release dir
    await $`ln -s ${sharedPath}/${file} ${host.releasePath}/${file}`
  }
})
