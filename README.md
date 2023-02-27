# Webpod

```js
import { ssh } from 'webpod'

const $ = ssh('user@host')

const branch = await $`git branch --show-current`
await $`echo ${branch}`

await $`mkdir /tmp/${'foo bar'}`
```

## Installation

```sh
npm install webpod
```

```sh
deno install -A -r https://deno.land/x/webpod/webpod.ts
```

## Usage

### ssh()

```js
ssh('user@host', {port: 22, options: ['StrictHostKeyChecking=no']})
```

## License

[MIT](LICENSE)
