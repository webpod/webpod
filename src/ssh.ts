import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { composeCmd, controlPath, escapeshellarg } from './utils.js'

export type RemoteShell = {
  (config: Config): RemoteShell
  (pieces: TemplateStringsArray, ...values: any[]): Promise<Response>
  exit: () => void
  check: () => boolean
}

export type Config = {
  port?: number | string
  forwardAgent?: boolean
  shell?: string
  prefix?: string
  nothrow?: boolean
  multiplexing?: boolean
  options?: SshOptions
}

export function ssh(host: string, config: Config = {}): RemoteShell {
  const $ = function (piecesOrConfig, ...values) {
    if (!Array.isArray(piecesOrConfig)) {
      const override: Config = piecesOrConfig as Config
      return ssh(host, {
        ...config, ...override,
        options: {...config.options, ...override.options},
      })
    }
    const debug = process.env['WEBPOD_DEBUG'] ?? ''
    const pieces = piecesOrConfig as TemplateStringsArray
    const source = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    if (pieces.some(p => p == undefined)) {
      throw new Error(`Malformed command at ${source}`)
    }
    let resolve: (out: Response) => void, reject: (out: Response) => void
    const promise = new Promise<Response>((...args) => ([resolve, reject] = args))
    const cmd = composeCmd(pieces, values)
    const id = 'id$' + Math.random().toString(36).slice(2)
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
    const args: string[] = [
      host,
      ...Object.entries(options).flatMap(
        ([key, value]) => ['-o', `${key}=${value}`]
      ),
      `: ${id}; ${config.shell ?? 'bash -ls'}`
    ]
    let input = config.prefix ?? 'set -euo pipefail; '
    input += cmd
    if (debug !== '') {
      if (debug.includes('ssh')) args.unshift('-vvv')
      console.error(
        'ssh',
        args.map(escapeshellarg).join(' '),
        '<<<',
        escapeshellarg(input),
      )
    }
    const child = spawn('ssh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = '', stderr = '', combined = ''
    child.stdout.on('data', data => {
      stdout += data
      combined += data
    })
    child.stderr.on('data', data => {
      if (debug.includes('ssh') && /^debug\d:/.test(data)) {
        process.stderr.write(data)
        return
      }
      stderr += data
      combined += data
    })
    child.on('close', (code) => {
      if (code === 0 || config.nothrow)
        resolve(new Response(source, code, stdout, stderr, combined))
      else
        reject(new Response(source, code, stdout, stderr, combined))
    })
    child.on('error', err => {
      reject(new Response(source, null, stdout, stderr, combined, err))
    })
    child.stdin.write(input)
    child.stdin.end()
    return promise
  } as RemoteShell
  $.exit = () => spawnSync('ssh', [host,
    '-o', `ControlPath=${controlPath(host)}`,
    '-O', 'exit',
  ])
  $.check = () => spawnSync('ssh', [host,
    '-o', `ControlPath=${controlPath(host)}`,
    '-O', 'check',
  ]).status == 0
  return $
}

export class Response {
  readonly #combined: string

  constructor(
    public readonly source: string,
    public readonly exitCode: number | null,
    public readonly stdout: string,
    public readonly stderr: string,
    combined: string,
    public readonly error?: Error
  ) {
    this.#combined = combined
  }

  toString() {
    return this.#combined
  }
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
