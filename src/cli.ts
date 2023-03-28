import process from 'node:process'
import { ssh } from './ssh.js'

await async function main() {
  const $ = ssh(process.argv[2])
  const {stdout} = await $`uname`
  console.log(stdout)
}()
