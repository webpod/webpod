import {task} from '../../task.js'
import './cleanup.js'
import './lock.js'
import './release.js'
import './setup.js'
import './shared.js'
import './symlink.js'
import './upload.js'

task('deploy', [
  'deploy:setup',
  'deploy:release',
  'deploy:upload',
  'deploy:shared',
  'deploy:symlink',
  'deploy:cleanup',
])
