import exec from '@webpod/exec'
import {define} from "../host.js"

import './deploy/lock.js'
import './deploy/release.js'
import './deploy/setup.js'

define('userStartedDeploy', async () => {
  if (process.env.CI) {
    return 'ci'
  }
  let name = exec.git('config', '--get', 'user.name')
  if (name.status === 0) {
    return name.trim()
  }
  name = exec.whoami()
  if (name.status === 0) {
    return name.trim()
  }
  return 'no_user'
})
