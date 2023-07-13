import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

export function webpodLocalConfig() {
  return path.join(os.homedir(), '.webpod.js')
}

export async function loadUserConfig() {
  if (fs.existsSync(webpodLocalConfig())) {
    await import(webpodLocalConfig())
    const token = (global as any).WEBPOD_TOKEN
    if (token && !process.env.WEBPOD_TOKEN) {
      process.env.WEBPOD_TOKEN = token
    }
  }
}
