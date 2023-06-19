import {task} from '../../task.js'
import {str} from '../../utils.js'
import {defaults} from '../../host.js'

defaults.static = true
defaults.caddyfile = async ({host}) => str`
${await host.domain} {
${await host.static ? str`
\troot * ${await host.deployPath}/current/${await host.publicDir}
\tencode gzip
\ttry_files {path} {path}.html {path}/ =404
\tfile_server
\tlog {
\t\toutput file ${await host.deployPath}/log/access.log
\t}
\thandle_errors {
\t\trewrite * /{err.status_code}.html
\t\tfile_server
\t}
` : ``}
${(await host.apps).map(app => `\treverse_proxy :${app.env.PORT}`).join('\n')}
}
`

task('provision:webserver', async ({host, $: root$}) => {
  const $ = root$.with({become: 'webpod'})
  await $`[ -d ${host.deployPath} ] || mkdir ${host.deployPath}`

  $.cd(await host.deployPath)
  await $`[ -d log ] || mkdir log`
  await $`chgrp caddy log`

  await $`echo ${await host.caddyfile} > Caddyfile`

  if (!await root$.test`grep -q 'import ${await host.deployPath}/Caddyfile' /etc/caddy/Caddyfile`) {
    await root$`echo 'import ${await host.deployPath}/Caddyfile' >> /etc/caddy/Caddyfile`
  }
  await root$`service caddy reload`
})
