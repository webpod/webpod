import {secondsToHumanReadableFormat} from './utils.js'
import {currentlyRunningTask} from './task.js'
import process from 'node:process'

let spinner: NodeJS.Timer | undefined
let startedAt: Date

export function startSpinner() {
  let s = 0
  startedAt = new Date()
  const spin = () => {
    const time = secondsToHumanReadableFormat((new Date().getTime() - startedAt.getTime()) / 1000)
    const display = `  ${'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[s++ % 10]} ${time} → ${currentlyRunningTask}`
    process.stderr.write(`${display}${' '.repeat(process.stderr.columns - 1 - display.length)}\r`)
  }
  spinner = setInterval(spin, 100)
}

export function stopSpinner() {
  clearInterval(spinner)
  process.stderr.write(' '.repeat(process.stderr.columns - 1) + '\r')
}
