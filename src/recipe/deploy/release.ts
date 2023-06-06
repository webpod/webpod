import {define, update} from "../../host.js"
import * as path from "path"
import {task} from "../../task.js"
import exec from "@webpod/exec"
import {commandSupportsOption} from "../../utils.js"

type Release = {
  createdAt: string
  releaseName: string
  user: string
  rev: string
}

define('releaseName', async ({$, host}) => {
  $.cd(await host.deployPath)
  const latest = await $`cat .webpod/latest_release || echo 0`
  return (parseInt(latest.stdout) + 1).toString()
})

define('releasesList', async ({$, host}) => {
  $.cd(await host.deployPath)

  // If there is no releases return an empty list.
  if (!await $.test`[ -d releases ] && [ "$(ls -A releases)" ]`) {
    return []
  }

  // Will list only dirs in releases.
  const ll = (await $`cd releases && ls -t -1 -d */`)
    .split('\n')
    .map(x => x.trim().replace(/\/$/, ''))
    .map(x => path.basename(x))

  // Return releases from newest to oldest.
  if (!await $.test`[ -f .webpod/releases_log ]`) {
    return []
  }

  const releaseLogs: Release[] = (await $`tail -n 300 .webpod/releases_log`)
    .split('\n')
    .map(x => JSON.parse(x))
    .filter(x => x)

  const releases = []
  for (const {releaseName} of releaseLogs) {
    if (ll.includes(releaseName)) {
      releases.push(releaseName)
    }
  }

  return releases
})

define('currentPath', async ({host}) => {
  return `${await host.deployPath}/current`
})

// Return release path.
define('releasesPath', async ({$, host}) => {
  const releaseExists = await $.test`[ -h ${host.deployPath}/release ]`
  if (releaseExists) {
    const link = await $`readlink ${host.deployPath}/release`
    return link[0] === '/' ? link.toString() : `${host.deployPath}/${link}`
  } else {
    throw new Error(`The "release_path" (${host.deployPath}/release) does not exist.`)
  }
})

// Return the release path during a deployment
// but fallback to the current path otherwise.
define('releaseOrCurrentPath', async function releaseOrCurrentPath({$, host}) {
  const releaseExists = await $.test`[ -h ${host.deployPath}/release ]`
  return releaseExists ? await host.releasesPath: await host.currentPath;
});

// Current release revision. Usually a git hash.
define('releaseRevision', async function releaseRevision({$, host}) {
  return (await $`cat ${host.releasesPath}/REVISION`).toString();
});

define('useRelativeSymlink', async function useRelativeSymlink({$}) {
  return commandSupportsOption($, 'ln', '--relative')
})

define('binSymlink', async function binSymlink({host}) {
  return await host.useRelativeSymlink ? ['ln', '-nfs', '--relative'] : ['ln', '-nfs']
})

// Clean up unfinished releases and prepare next release
task('deploy:release', async ({host, $}) => {
  $.cd(await host.deployPath)

  // Clean up if there is unfinished release.
  if (await $.test`[ -h release ]`) {
    await $`rm release`
  }

  // We need to get releasesList at same point as releaseName,
  // as standard releaseName's implementation depends on it and,
  // if user overrides it, we need to get releasesList manually.
  const releasesList = await host.releasesList
  const releaseName = await host.releaseName
  const releasePath = 'releases/' + releaseName;

  // Check what there is no such release path.
  if (await $.test`[ -d ${releasePath} ]`) {
    throw new Error(`Release name "${releaseName}" already exists.`)
  }

  // Save release_name if it is a number.
  if (releaseName.match(/^\d+$/)) {
    await $`echo ${releaseName} > .webpod/latest_release`
  }

  // Save release info.
  const metainfo: Release = {
    createdAt: new Date().toISOString(),
    releaseName: releaseName,
    user: await host.userStartedDeploy,
    rev: exec.git('rev-parse', 'HEAD').trim(),
  }
  await $`echo ${JSON.stringify(metainfo)} >> .webpod/releases_log`;

  // Make new release.
  await $`mkdir -p ${releasePath}`
  await $`${host.binSymlink} ${releasePath} ${host.deployPath}/release`

  // Add to releases list.
  releasesList.unshift(releaseName)
  update(host, 'releasesList', releasesList)

  // Set previous_release.
  if (releasesList[1]) {
    update(host, 'previousReleasePath', `${await host.deployPath}/releases/${releasesList[1]}`)
  }
})
