import {Context} from './host.js'
import fs from 'node:fs'

export async function setupFramework(framework: string | undefined, context: Context) {
  if (!framework) return
  if (framework == 'next') {
    context.config.uploadDir = '.'
    context.config.publicDir = '.'
    context.config.static = false
    context.config.scripts = ['node_modules/.bin/next start']
  } else if (framework == 'angular') {
    context.config.fallback = '/index.html'
  }
}

export type Framework = 'next' | 'angular'

export function detectFramework(): Framework | undefined {
  try {
    if (fs.existsSync('package.json')) {
      const packages = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      if (packages.dependencies['next']) return 'next'
      if (packages.dependencies['@angular/core']) return 'angular'
    }
  } catch (err) {
    // Ignore
  }
}
