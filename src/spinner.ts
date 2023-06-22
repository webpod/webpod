import {secondsToHumanReadableFormat} from './utils.js'
import {currentlyRunningTask} from './task.js'
import process from 'node:process'
import chalk from 'chalk'

let spinner: NodeJS.Timer | undefined
let startedAt: Date
let status = ''

export function progressMessage(message: string) {
  status = remoteNonAscii(getLastNonEmptyLine(message))
}

export function startSpinner() {
  let s = 0
  startedAt = new Date()
  const spin = () => {
    const time = secondsToHumanReadableFormat((new Date().getTime() - startedAt.getTime()) / 1000)
    const display = `  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[s++ % 10]} ${time} → ${currentlyRunningTask} `
    const log = status.substring(0, width(display)).toLowerCase()
    process.stderr.write(`${display}${chalk.grey(log)}${' '.repeat(width(display, log))}\r`)
  }
  spinner = setInterval(spin, 100)
}

export function stopSpinner() {
  clearInterval(spinner)
  process.stderr.write(' '.repeat(process.stderr.columns - 1) + '\r')
}


function getLastNonEmptyLine(text: string): string {
  const lines = text.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (line !== '') {
      return line
    }
  }
  return ''
}

function width(...xs: string[]): number {
  return Math.max(0, process.stderr.columns - 1 - xs.reduce((a, b) => a + b.length, 0))
}

function remoteNonAscii(text: string): string {
  return text.replace(/[^\x00-\x7F]/g, '')
}
