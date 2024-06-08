import chalk from 'chalk'
import { spawn, spawnSync, StdioPipe, StdioPipeNamed } from 'node:child_process'
import process from 'node:process'
import { Readable } from 'node:stream'
import { progressMessage } from './spinner.js'
import { addr, controlPath, escapeshellarg } from './utils.js'

type Values = (string | string[] | Promise<string> | Promise<string[]>)[]

export type RemoteShell = {
  (pieces: TemplateStringsArray, ...values: Values): Promise<Response>
  with(config: Partial<SshConfig>): RemoteShell
  exit(): void
  check(): boolean
  test(pieces: TemplateStringsArray, ...values: Values): Promise<boolean>;
  cd(path: string): void
}

export type SshConfig = {
  remoteUser: string
  hostname: string
  port?: number | string
  shell: string
  prefix: string
  cwd?: string
  nothrow: boolean
  multiplexing: boolean
  verbose: boolean
  become?: string
  input?: string | Buffer | Readable
  stdio: StdioPipeNamed | StdioPipe[]
  env: Record<string, string>
  ssh: SshOptions
}

function parseInput(input?: string | Buffer | Readable): Readable | undefined {
  if (input instanceof Buffer) {
    return Readable.from(input)
  } 
  
  if (typeof input === "string") {
    return Readable.from(Buffer.from(input))
  } 
  
  if (input instanceof Readable) {
    return input
  } 
  
  return undefined
}

export function ssh(partial: Partial<SshConfig>): RemoteShell {
  const config: SshConfig = {
    remoteUser: partial.remoteUser ?? 'root',
    hostname: partial.hostname ?? 'localhost',
    port: partial.port,
    shell: partial.shell ?? 'bash -s',
    prefix: partial.prefix ?? 'set -euo pipefail; ',
    cwd: partial.cwd,
    nothrow: partial.nothrow ?? false,
    multiplexing: partial.multiplexing ?? true,
    verbose: partial.verbose ?? false,
    become: partial.become,
    input: partial.input,
    stdio: partial.stdio ?? ['pipe', 'pipe', 'pipe'],
    env: partial.env ?? {},
    ssh: partial.ssh ?? {},
  }

  const $ = async function (pieces, ...values) {
    const location = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    const debug = process.env['WEBPOD_DEBUG'] ?? ''

    if (pieces.some(p => p == undefined)) {
      throw new Error(`Malformed command at ${location}`)
    }

    let resolve: (out: Response) => void, reject: (out: Response) => void
    const promise = new Promise<Response>((...args) => ([resolve, reject] = args))

    const args = sshArgs(config)
    const id = 'id$' + Math.random().toString(36).slice(2)
    // args.push(
    //   `: ${id}; ` +
    //   (config.become ? `sudo -H -u ${escapeshellarg(config.become)} ` : '') +
    //   env(config.env) +
    //   config.shell
    // )

    const cmd = await composeCmd(pieces, values)
    const cmdFull = config.prefix + workingDir(config.cwd) + cmd

    if (debug !== '') {
      if (debug.includes('ssh')) args.unshift('-vvv')
      console.error(chalk.grey(`ssh ${args.map(escapeshellarg).join(' ')} <<< ${escapeshellarg(cmdFull)}`))
    }
    if (config.verbose) {
      console.error(`${chalk.green.bold(`${config.become ?? config.remoteUser}@${config.hostname}`)}${chalk.magenta.bold(`:${config.cwd ?? ''}`)}${chalk.bold.blue(`$`)} ${chalk.bold(cmd)}`)
    }

    // console.log(`args: ${args.join(' ')}`)
    const child = spawn('ssh', [...args, cmdFull], {
      stdio: config.stdio,
      windowsHide: true,
    })
    let stdout = '', stderr = ''
    child.stdout.on('data', data => {
      if (config.verbose) process.stdout.write(data)
      stdout += data
      progressMessage(data.toString())
    })
    child.stderr.on('data', data => {
      if (debug.includes('ssh') && /^debug\d:/.test(data)) {
        process.stderr.write(data)
        return
      }
      if (config.verbose) process.stderr.write(data)
      stderr += data
      progressMessage(data.toString())
    })
    child.on('close', (code) => {
      if (code === 0 || config.nothrow)
        resolve(new Response(cmd, location, code, stdout, stderr))
      else
        reject(new Response(cmd, location, code, stdout, stderr))
    })
    child.on('error', err => {
      reject(new Response(cmd, location, null, stdout, stderr, err))
    })

    const inputReadable = parseInput(config.input);
    if (inputReadable) {
      inputReadable.pipe(child.stdin);
    } else {
      child.stdin.end()
    }
    // console.log(`cmdFull: ${cmdFull}`);
    // child.stdin.end()
    // child.stdin.write(cmdFull)

    return promise
  } as RemoteShell
  $.with = (override) => ssh({
    ...config, ...override,
    ssh: {...config.ssh, ...override.ssh ?? {}}
  })
  $.exit = () => spawnSync('ssh', [addr(config),
    '-o', `ControlPath=${controlPath(addr(config))}`,
    '-O', 'exit',
  ])
  $.check = () => spawnSync('ssh', [addr(config),
    '-o', `ControlPath=${controlPath(addr(config))}`,
    '-O', 'check',
  ]).status == 0
  $.test = async (pieces, ...values) => {
    try {
      await $(pieces, ...values)
      return true
    } catch {
      return false
    }
  }
  $.cd = (path) => {
    config.cwd = path
  }
  return $
}

export function sshArgs(config: Partial<SshConfig>): string[] {
  let options: SshOptions = {
    ControlMaster: 'auto',
    ControlPath: controlPath(addr(config)),
    ControlPersist: '5m',
    ConnectTimeout: '5s',
    StrictHostKeyChecking: 'accept-new',
  }
  if (config.port != undefined) {
    options.Port = config.port.toString()
  }
  if (config.multiplexing === false) {
    delete options.ControlMaster
    delete options.ControlPath
    delete options.ControlPersist
  }
  options = {...options, ...config.ssh}
  return [
    addr(config),
    ...Object.entries(options).flatMap(
      ([key, value]) => ['-o', `${key}=${value}`]
    ),
  ]
}

function workingDir(cwd: string | undefined): string {
  if (cwd == undefined || cwd == '') {
    return ``
  }
  return `cd ${escapeshellarg(cwd)}; `
}

function env(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => {
      if (key.endsWith('++')) {
        return `${key.replace(/\++$/, '')}=$PATH:${escapeshellarg(value)} `
      } else {
        return `${key}=${escapeshellarg(value)} `
      }
    })
    .join('')
}

export class Response extends String {
  constructor(
    public readonly command: string,
    public readonly location: string,
    public readonly exitCode: number | null,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly error?: Error
  ) {
    super(stdout.trim())
  }
}

export async function composeCmd(pieces: TemplateStringsArray, values: Values) {
  let cmd = pieces[0], i = 0
  while (i < values.length) {
    const v = await values[i]
    let s = ''
    if (Array.isArray(v)) {
      s = v.map(escapeshellarg).join(' ')
    } else {
      s = escapeshellarg(v.toString())
    }
    cmd += s + pieces[++i]
  }
  return cmd
}

type SshOptions = { [key in AvailableOptions]?: string }

type AvailableOptions =
  'AddKeysToAgent' |
  'AddressFamily' |
  'BatchMode' |
  'BindAddress' |
  'CanonicalDomains' |
  'CanonicalizeFallbackLocal' |
  'CanonicalizeHostname' |
  'CanonicalizeMaxDots' |
  'CanonicalizePermittedCNAMEs' |
  'CASignatureAlgorithms' |
  'CertificateFile' |
  'ChallengeResponseAuthentication' |
  'CheckHostIP' |
  'Ciphers' |
  'ClearAllForwardings' |
  'Compression' |
  'ConnectionAttempts' |
  'ConnectTimeout' |
  'ControlMaster' |
  'ControlPath' |
  'ControlPersist' |
  'DynamicForward' |
  'EscapeChar' |
  'ExitOnForwardFailure' |
  'FingerprintHash' |
  'ForwardAgent' |
  'ForwardX11' |
  'ForwardX11Timeout' |
  'ForwardX11Trusted' |
  'GatewayPorts' |
  'GlobalKnownHostsFile' |
  'GSSAPIAuthentication' |
  'GSSAPIDelegateCredentials' |
  'HashKnownHosts' |
  'Host' |
  'HostbasedAcceptedAlgorithms' |
  'HostbasedAuthentication' |
  'HostKeyAlgorithms' |
  'HostKeyAlias' |
  'Hostname' |
  'IdentitiesOnly' |
  'IdentityAgent' |
  'IdentityFile' |
  'IPQoS' |
  'KbdInteractiveAuthentication' |
  'KbdInteractiveDevices' |
  'KexAlgorithms' |
  'KnownHostsCommand' |
  'LocalCommand' |
  'LocalForward' |
  'LogLevel' |
  'MACs' |
  'Match' |
  'NoHostAuthenticationForLocalhost' |
  'NumberOfPasswordPrompts' |
  'PasswordAuthentication' |
  'PermitLocalCommand' |
  'PermitRemoteOpen' |
  'PKCS11Provider' |
  'Port' |
  'PreferredAuthentications' |
  'ProxyCommand' |
  'ProxyJump' |
  'ProxyUseFdpass' |
  'PubkeyAcceptedAlgorithms' |
  'PubkeyAuthentication' |
  'RekeyLimit' |
  'RemoteCommand' |
  'RemoteForward' |
  'RequestTTY' |
  'SendEnv' |
  'ServerAliveInterval' |
  'ServerAliveCountMax' |
  'SetEnv' |
  'StreamLocalBindMask' |
  'StreamLocalBindUnlink' |
  'StrictHostKeyChecking' |
  'TCPKeepAlive' |
  'Tunnel' |
  'TunnelDevice' |
  'UpdateHostKeys' |
  'UseKeychain' |
  'User' |
  'UserKnownHostsFile' |
  'VerifyHostKeyDNS' |
  'VisualHostKey' |
  'XAuthLocation'
