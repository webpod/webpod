import inquirer from 'inquirer'

let skip = false

export function skipPrompts(yes: boolean) {
  skip = yes
}

export async function ask(message: string, defaultValue?: string): Promise<string> {
  if (skip) return defaultValue ?? ''
  const answers = await inquirer.prompt({
    name: 'out',
    type: 'input',
    message,
    default: defaultValue,
  })
  return answers.out
}

export async function confirm(message: string, defaultValue = true): Promise<boolean> {
  if (skip) return defaultValue
  const answers = await inquirer.prompt({
    name: 'out',
    type: 'confirm',
    message,
    default: defaultValue,
  })
  return answers.out
}

export async function choose(message: string, choices: string[]): Promise<string> {
  if (skip) return ''
  const answers = await inquirer.prompt({
    name: 'out',
    type: 'list',
    message,
    choices,
    default: choices[0],
  })
  return answers.out
}
