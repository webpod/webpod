import {task} from '../../task.js'
import {defaults} from '../../host.js'
import {str} from '../../utils.js'

defaults.publicDir = async () => 'public'

task('provision:webserver', async ({host, $: root$}) => {
  const $ = root$.with({become: 'webpod'})
  await $`[ -d ${host.deployPath} ] || mkdir ${host.deployPath}`

  const domain = await host.domain
  const nodeVersion = await host.nodeVersion
  const deployPath = (await $`realpath ${host.deployPath}`).toString()
  const publicPath = str`${await host.deployPath}/current/${await host.publicDir}`

  $.cd(deployPath)

  await $`[ -d log ] || mkdir log`
  await $`chgrp caddy log`

  const caddyfile = str`
${domain} {
\troot * ${publicPath}
\tencode gzip
\ttry_files {path} {path}.html {path}/ =404
\tfile_server
\tlog {
\t\toutput file ${deployPath}/log/access.log
\t}
\thandle_errors {
\t\trewrite * /{err.status_code}.html
\t\tfile_server
\t}
}
`
  await $`echo ${caddyfile} > Caddyfile`

  if (!await root$.test`grep -q 'import ${deployPath}/Caddyfile' /etc/caddy/Caddyfile`) {
    await root$`echo 'import ${deployPath}/Caddyfile' >> /etc/caddy/Caddyfile`
  }
  await root$`service caddy reload`
})
