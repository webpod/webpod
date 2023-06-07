import {task} from "../../task.js"
import {exec} from "../../exec/exec.js"

task('deploy:upload', async ({host, $}) => {
  const r = exec.rsync('-az', 'dist/',  `${await host.remoteUser}@${await host.hostname}:${await host.releasePath}`)
  if (r.status !== 0) {
    const rsync = `rsync exited with code ${r.status}:\n${r.stdout}\n${r.stderr}`
    throw new Error(rsync)
  }
  await $`ls ${await host.releasePath}`
})
