import {Response} from './ssh.js'
import chalk from 'chalk'
import process from 'node:process'
import indentString from 'indent-string'
import {Config} from './host.js'

export class StopError extends Error {
  constructor(message: string, public explanation?: string) {
    super(message)
  }
}

export function handleError(error: any) {
  if (error instanceof Response) {
    console.error(
      `\nThe following command failed with exit code ${chalk.red(error.exitCode)}:\n\n` +
      `  ` + chalk.bgRed.white(`$ ${error.command}`) + `\n\n` +
      error.stderr,
      error.stdout,
    )
    if (error.error) {
      console.error(error.error)
    }
    process.exitCode = 1
  } else if (error instanceof StopError) {
    console.error(`\n  ${chalk.redBright(error.message)}\n`)
    if (error.explanation) {
      console.error(indentString(error.explanation, 2))
    }
    process.exitCode = 1
  } else {
    throw error
  }
}
