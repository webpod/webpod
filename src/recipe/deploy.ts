import {task, define} from '../index.js'

define('hi', async ({$}) => {
  return (await $`date`).stdout
})

task('deploy', async ({host, $}) => {
  console.log(await $`echo ${host.hi}`)
  console.log(await $`echo ${host.hi}`)
})
