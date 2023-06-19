import inquirer from 'inquirer'

export async function ask(message: string, defaultValue?: string): Promise<string> {
  const answers = await inquirer.prompt({
    name: 'out',
    type: 'input',
    message,
    default: defaultValue,
  })
  return answers.out
}

export async function confirm(message: string, defaultValue = true): Promise<boolean> {
  const answers = await inquirer.prompt({
    name: 'out',
    type: 'confirm',
    message,
    default: defaultValue,
  })
  return answers.out
}
