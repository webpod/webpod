import {task} from '../../task.js'
import {defaults} from '../../host.js'
import {str} from '../../utils.js'

defaults.publicPath = async ({host}) => {
  return `${await host.deployPath}/current/public`
}

const template404 = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 Not Found</title>
<style>
  body {
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    align-content: center;
    background: #343434;
    color: #fff;
    display: grid;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    font-size: 20px;
    justify-content: center;
    margin: 0;
    min-height: 100vh;
  }
  main {
    padding: 0 30px;
  }
  svg {
    animation: 2s ease-in-out infinite hover;
  }
  @keyframes hover {
    0%, 100% {
      transform: translateY(0)
    }
    50% {
      transform: translateY(-8px)
    }
  }
</style>
</head>
<body>
<main>
  <svg width="150" height="150" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient x1="50%" y1="0%" x2="50%" y2="54.885%" id="a"><stop stop-color="#71BBFF" offset="0%"/><stop stop-color="#0656FE" offset="100%"/></linearGradient><linearGradient x1="50%" y1="16.861%" x2="50%" y2="85.187%" id="b"><stop stop-color="#71BBFF" offset=".085%"/><stop stop-color="#0656FE" offset="100%"/></linearGradient><linearGradient x1="50%" y1="26.399%" x2="50%" y2="99.943%" id="c"><stop stop-color="#0656FE" offset=".03%"/><stop stop-color="#71BBFF" offset="99.943%"/></linearGradient><linearGradient x1="50%" y1="0%" x2="55.945%" y2="88.319%" id="d"><stop stop-color="#0656FE" offset="0%"/><stop stop-color="#1E6CFE" offset="100%"/></linearGradient></defs><g fill="none" fill-rule="evenodd"><path d="M137.62 105.336c27.614 0 50 22.386 50 50v190c0 27.614-22.386 50-50 50s-50-22.386-50-50v-190c0-27.614 22.386-50 50-50Z" fill="url(#a)" transform="rotate(-28 137.62 250.336)"/><path d="M215.897 147.702c27.614 0 50 22.386 50 50v145c0 27.615-22.386 50-50 50s-50-22.385-50-50v-145c0-27.614 22.386-50 50-50Z" fill="url(#b)" transform="scale(-1 1) rotate(-28 0 1136.117)"/><path d="M284.183 147.702c27.614 0 50 22.386 50 50v145c0 27.615-22.386 50-50 50s-50-22.385-50-50v-145c0-27.614 22.386-50 50-50Z" fill="url(#c)" transform="rotate(152 284.183 270.202)"/><path d="M362.62 105.336c27.614 0 50 22.386 50 50v190c0 27.614-22.386 50-50 50s-50-22.386-50-50v-190c0-27.614 22.386-50 50-50Z" fill="url(#d)" transform="scale(-1 1) rotate(-28 0 1704.726)"/></g></svg>
  <h1>Not Found</h1>
  <p>The requested URL was not found on this server.</p>
</main>
</body>
</html>
`

task('provision:webserver', async ({host, $: root$}) => {
  await root$`mkdir -p /var/webpod/html`
  await root$`echo ${template404} > /var/webpod/html/404.html`

  const $ = root$.with({become: 'webpod'})

  await $`[ -d ${host.deployPath} ] || mkdir ${host.deployPath}`

  const domain = await host.domain
  const nodeVersion = await host.nodeVersion
  const deployPath = (await $`realpath ${host.deployPath}`).toString()
  const publicPath = await host.publicPath

  $.cd(deployPath)

  await $`[ -d log ] || mkdir log`
  await $`chgrp caddy log`

  const caddyfile = str`
${domain} {
\troot * ${publicPath}
\tfile_server
\tlog {
\t\toutput file ${deployPath}/log/access.log
\t}
\thandle_errors {
\t\t@404 {
\t\t\texpression {http.error.status_code} == 404
\t\t}
\t\trewrite @404 /404.html
\t\tfile_server {
\t\t\troot /var/webpod/html
\t\t}
\t}
}
`

  if (await $.test`[ -f Caddyfile ]`) {
    await $`echo ${caddyfile} > Caddyfile.new`
    const diff = await $.with({nothrow: true})`diff -U5 --color=always Caddyfile Caddyfile.new`
    if (diff.trim() == '') {
      await $`rm Caddyfile.new`
    } else {
      console.log('Found Caddyfile changes:')
      console.log(diff.stdout)
      // answer = askChoice(' Which Caddyfile to save? ', ['old', 'new'], 0)
      // if ($answer === 'old') {
      //   run('rm Caddyfile.new')
      // } else {
      //   run('mv Caddyfile.new Caddyfile')
      // }
    }
  } else {
    await $`echo ${caddyfile} > Caddyfile`
  }

  if (!await root$.test`grep -q 'import ${deployPath}/Caddyfile' /etc/caddy/Caddyfile`) {
    await root$`echo 'import ${deployPath}/Caddyfile' >> /etc/caddy/Caddyfile`
  }
  await root$`service caddy reload`
})
