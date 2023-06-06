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

declare const exec: Binaries
export default exec
