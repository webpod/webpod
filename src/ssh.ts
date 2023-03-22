import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { composeCmd, controlPath, escapeshellarg } from './utils.js'

export type RemoteShell = (
  (pieces: TemplateStringsArray, ...values: any[]) => Promise<Result>
  ) & {
  exit: () => void
}

export type Config = {
  port?: number | string
  forwardAgent?: boolean
  shell?: string
  prefix?: string
  options?: SshOptions
}

export function ssh(host: string, config: Config = {}): RemoteShell {
  const $: RemoteShell = function (pieces, ...values) {
    const source = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    if (pieces.some(p => p == undefined)) {
      throw new Error(`Malformed command at ${source}`)
    }
    let resolve: (out: Result) => void, reject: (out: Result) => void
    const promise = new Promise<Result>((...args) => ([resolve, reject] = args))
    const cmd = composeCmd(pieces, values)
    const shellId = 'id$' + Math.random().toString(36).slice(2)
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
    options = {...options, ...config.options}
    const args: string[] = [
      host,
      ...Object.entries(options).flatMap(
        ([key, value]) => ['-o', `${key}=${value}`]
      ),
      `: ${shellId}; ${config.shell || 'bash -ls'}`
    ]
    let input = config.prefix || 'set -euo pipefail; '
    input += cmd
    if (process.env.WEBPOD_DEBUG) {
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
      stderr += data
      combined += data
    })
    child.on('close', (code) => {
      (code === 0 ? resolve : reject)(
        new Result(source, shellId, code, stdout, stderr, combined)
      )
    })
    child.on('error', err => {
      reject(
        new Result(source, shellId, null, stdout, stderr, combined, err)
      )
    })
    child.stdin.write(input)
    child.stdin.end()
    return promise
  }
  $.exit = () => spawnSync('ssh', [
    host,
    '-O', 'exit',
    '-o', `ControlPath=${controlPath(host)}`
  ])
  return $
}

export class Result extends Error {
  constructor(
    public readonly source: string,
    public readonly shellId: string,
    public readonly exitCode: number | null,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly combined: string,
    public readonly error?: Error
  ) {
    super(combined + (error?.message || ''))
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
