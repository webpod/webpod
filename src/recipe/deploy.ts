import {task, define} from '../index.js'

define('hi', async ({$}) => {
  return await $`date`
})

task('deploy', async ({host, $}) => {
  console.log(await $`echo ${await host.hi}`)
})
