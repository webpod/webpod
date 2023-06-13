import {spawn, spawnSync} from 'node:child_process'
import process from 'node:process'
import {controlPath, escapeshellarg} from './utils.js'

type Values = (string | string[] | Promise<string> | Promise<string[]>)[]

export type RemoteShell = {
  (pieces: TemplateStringsArray, ...values: Values): Promise<Response>
  with(config: SshConfig): RemoteShell
  exit(): void
  check(): boolean
  test(pieces: TemplateStringsArray, ...values: Values): Promise<boolean>;
  cd(path: string): void
}

export type SshConfig = {
  port?: number | string
  forwardAgent?: boolean
  shell?: string
  prefix?: string
  cwd?: string
  nothrow?: boolean
  multiplexing?: boolean
  verbose?: boolean
  become?: string
  options?: SshOptions
}

export function ssh(host: string, config: SshConfig = {}): RemoteShell {
  const $ = async function (pieces, ...values) {
    const location = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    const debug = process.env['WEBPOD_DEBUG'] ?? ''

    if (pieces.some(p => p == undefined)) {
      throw new Error(`Malformed command at ${location}`)
    }

    let resolve: (out: Response) => void, reject: (out: Response) => void
    const promise = new Promise<Response>((...args) => ([resolve, reject] = args))

    let options: SshOptions = {
      ControlMaster: 'auto',
      ControlPath: controlPath(host),
      ControlPersist: '5m',
      ConnectTimeout: '5s',
      ForwardAgent: 'yes',
      StrictHostKeyChecking: 'accept-new',
    }
    if (config.port != undefined) {
      options.Port = config.port.toString()
    }
    if (config.forwardAgent != undefined) {
      options.ForwardAgent = config.forwardAgent ? 'yes' : 'no'
    }
    if (config.multiplexing === false) {
      options.ControlMaster = 'no'
      options.ControlPath = 'none'
      options.ControlPersist = 'no'
    }
    options = {...options, ...config.options}

    const id = 'id$' + Math.random().toString(36).slice(2)
    let become = ''
    if (config.become != undefined) {
      become = `sudo -H -u ${escapeshellarg(config.become)}`
    }
    const args: string[] = [
      host,
      ...Object.entries(options).flatMap(
        ([key, value]) => ['-o', `${key}=${value}`]
      ),
      `: ${id}; ${become} ${config.shell ?? 'bash -ls'}`
    ]

    const cmdPrefix = config.prefix ?? 'set -euo pipefail; '
    const cmd = (config.cwd != undefined && config.cwd != '' ? `cd ${escapeshellarg(config.cwd)}; ` : ``)
      + await composeCmd(pieces, values)

    if (debug !== '') {
      if (debug.includes('ssh')) args.unshift('-vvv')
      console.error('ssh', args.map(escapeshellarg).join(' '), '<<<', escapeshellarg(cmdPrefix + cmd))
    }
    if (config.verbose) {
      console.error('$', cmd)
    }

    const child = spawn('ssh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = '', stderr = ''
    child.stdout.on('data', data => {
      if (config.verbose) {
        process.stdout.write(data)
      }
      stdout += data
    })
    child.stderr.on('data', data => {
      if (debug.includes('ssh') && /^debug\d:/.test(data)) {
        process.stderr.write(data)
        return
      }
      if (config.verbose) {
        process.stderr.write(data)
      }
      stderr += data
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

    child.stdin.write(cmdPrefix + cmd)
    child.stdin.end()

    return promise
  } as RemoteShell
  $.with = (override) => ssh(host, {
    ...config, ...override,
    options: {...config.options, ...override.options}
  })
  $.exit = () => spawnSync('ssh', [host,
    '-o', `ControlPath=${controlPath(host)}`,
    '-O', 'exit',
  ])
  $.check = () => spawnSync('ssh', [host,
    '-o', `ControlPath=${controlPath(host)}`,
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
