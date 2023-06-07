interface Result extends String {
  pid: number
  stdout: string
  stderr: string
  status: number | null
  signal: string | null
  error?: Error
}

type Bin = (...args: string[]) => Result

interface Binaries {
  [bin: string]: Bin
}

export const exec: Binaries

