import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { controlPath, escapeshellarg } from './utils.js'

export type RemoteShell = (
  (pieces: TemplateStringsArray, ...values: any[]) => Promise<Result>
  ) & {
  exit: () => void
}

export type Options = {
  port?: number | string
  forwardAgent?: boolean
  shell?: string
  options?: (SshOption | `${SshOption}=${string}`)[]
}

export function ssh(host: string, options: Options = {}): RemoteShell {
  const $: RemoteShell = function (pieces, ...values) {
    const source = new Error().stack!.split(/^\s*at\s/m)[2].trim()
    if (pieces.some(p => p == undefined)) {
      throw new Error(`Malformed command at ${source}`)
    }
    let cmd = pieces[0], i = 0
    while (i < values.length) {
      let s
      if (Array.isArray(values[i])) {
        s = values[i].map((x: any) => escapeshellarg(x)).join(' ')
      } else {
        s = escapeshellarg(values[i])
      }
      cmd += s + pieces[++i]
    }
    let resolve: (out: Result) => void, reject: (out: Result) => void
    const promise = new Promise<Result>((...args) => ([resolve, reject] = args))
    const shellID = 'id$' + Math.random().toString(36).slice(2)
    const args: string[] = [
      host,
      '-o', 'ControlMaster=auto',
      '-o', 'ControlPath=' + controlPath(host),
      '-o', 'ControlPersist=5m',
      ...(options.port ? ['-p', `${options.port}`] : []),
      ...(options.forwardAgent ? ['-A'] : []),
      ...(options.options || []).flatMap(x => ['-o', x]),
      `: ${shellID}; ` + (options.shell || 'bash -ls')
    ]
    if (process.env.WEBPOD_DEBUG) {
      console.log('ssh', args.join(' '))
    }
    const child = spawn('ssh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = '', stderr = '', combined = ''
    const onStdout = (data: any) => {
      stdout += data
      combined += data
    }
    const onStderr = (data: any) => {
      stderr += data
      combined += data
    }
    child.stdout.on('data', onStdout)
    child.stderr.on('data', onStderr)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(new Result(source, code, stdout, stderr, combined))
      } else {
        reject(new Result(source, code, stdout, stderr, combined))
      }
    })
    child.on('error', err => {
      reject(new Result(source, null, stdout, stderr, combined, err))
    })

    child.stdin.write(cmd)
    child.stdin.end()
    return promise
  }
  $.exit = () => spawnSync('ssh', [host, '-O', 'exit', '-o', `ControlPath=${controlPath(host)}`])
  return $
}

export class Result extends String {
  readonly source: string
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number | null
  readonly error?: Error

  constructor(source: string, exitCode: number | null, stdout: string, stderr: string, combined: string, error?: Error) {
    super(combined)
    this.source = source
    this.stdout = stdout
    this.stderr = stderr
    this.exitCode = exitCode
    this.error = error
  }
}

export type SshOption =
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
