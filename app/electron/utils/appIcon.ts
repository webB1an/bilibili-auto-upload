import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export function resolveAppIconPath(): string | null {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'icon.png'),
        path.join(process.resourcesPath, 'build', 'icon.png')
      ]
    : [path.join(app.getAppPath(), 'build', 'icon.png')]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}
