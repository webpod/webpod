import {task} from '../../task.js'
import './apps.js'
import './caddy.js'
import './check.js'
import './firewall.js'
import './install.js'
import './node.js'
import './sshd.js'
import './update.js'
import './user.js'
import './webserver.js'

task('provision', [
  'provision:check',
  'provision:update',
  'provision:upgrade',
  'provision:install',
  'provision:firewall',
  'provision:caddy',
  'provision:ssh',
  'provision:user',
  'provision:node',
  'provision:webserver',
  'provision:apps',
])
