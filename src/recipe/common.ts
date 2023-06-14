import {defaults} from '../host.js'

import './deploy/index.js'
import './provision/index.js'

defaults.remoteUser = 'root'
defaults.become = undefined
defaults.verbose = false
defaults.publicDir = '.'
defaults.nodeVersion = '18'
defaults.domain = async ({host}) => (await host.hostname)!
