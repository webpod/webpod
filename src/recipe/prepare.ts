import chalk from 'chalk'
import {task} from '../task.js'
import {detectFramework, setupFramework} from '../framework.js'
import {humanPath} from '../utils.js'
import {confirm} from '../prompt.js'

const {cyan, grey, green, bold} = chalk

task('prepare', async ({host, config}) => {
  do {
    const framework = detectFramework()
    await setupFramework(framework, config)

    await host.domain
    await host.uploadDir
    await host.publicDir

    console.log(`Webpod now will configure your server with:`)
    console.log(` ${bold('✔')} Updates`)
    console.log(` ${bold('✔')} Firewall`)
    console.log(` ${bold('✔')} Webserver`)
    console.log(` ${bold('✔')} SSL/TLS certificates`)
    console.log(` ${bold('✔')} Node.js`)
    console.log(` ${bold('✔')} Supervisor`)
    console.log(`and deploy your app:`)
    if (framework == 'next') {
      console.log(`${cyan('Next.js')} detected`)
    } else {
      console.log(` ${bold('✔')} Uploading ${cyan(humanPath(await host.uploadDir))} to ${cyan(await host.remoteUser + '@' + await host.hostname)}`)
      if (await host.static) {
        console.log(` ${bold('✔')} Serving ${cyan(humanPath(await host.uploadDir, await host.publicDir))} at ${cyan('https://' + await host.domain)}`)
      }
      for (const script of await host.scripts) {
        console.log(` ${bold('✔')} Running ${cyan(humanPath(await host.uploadDir, script))}`)
      }
    }

    if (await confirm(`Correct?`)) {
      break
    } else {
      delete config.domain
      delete config.uploadDir
      delete config.publicDir
      delete config.scripts
    }
  } while (true)
})
