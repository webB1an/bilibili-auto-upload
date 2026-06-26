import fs from 'fs'
import path from 'path'

export function resolvePreloadPath(mainDirname: string): string {
  const candidates = [
    path.join(mainDirname, '../preload/index.mjs'),
    path.join(mainDirname, '../preload/index.js')
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}
