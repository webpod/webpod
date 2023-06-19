import {task} from '../../task.js'
import {str} from '../../utils.js'

task('provision:webserver', async ({host, $: root$}) => {
  const $ = root$.with({become: 'webpod'})
  await $`[ -d ${host.deployPath} ] || mkdir ${host.deployPath}`

  $.cd(await host.deployPath)
  await $`[ -d log ] || mkdir log`
  await $`chgrp caddy log`

  const caddyfile = str`
${await host.domain} {
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
}
`
  await $`echo ${caddyfile} > Caddyfile`

  if (!await root$.test`grep -q 'import ${await host.deployPath}/Caddyfile' /etc/caddy/Caddyfile`) {
    await root$`echo 'import ${await host.deployPath}/Caddyfile' >> /etc/caddy/Caddyfile`
  }
  await root$`service caddy reload`
})
