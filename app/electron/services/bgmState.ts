import { app } from 'electron'
import fs from 'fs'
import path from 'path'

interface BgmStateFile {
  nextSequentialIndex: number
  libraryFingerprint: string
}

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'bgm-state.json')
}

function readState(): BgmStateFile {
  const statePath = getStatePath()
  if (!fs.existsSync(statePath)) {
    return { nextSequentialIndex: 0, libraryFingerprint: '' }
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8')) as BgmStateFile
  } catch {
    return { nextSequentialIndex: 0, libraryFingerprint: '' }
  }
}

function writeState(state: BgmStateFile): void {
  const statePath = getStatePath()
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

export function buildLibraryFingerprint(trackPaths: string[]): string {
  return trackPaths.map((track) => path.basename(track)).join('\n')
}

export function pickSequentialTrackIndex(trackCount: number, fingerprint: string): number {
  if (trackCount <= 0) return 0

  const state = readState()
  if (state.libraryFingerprint !== fingerprint) {
    state.libraryFingerprint = fingerprint
    state.nextSequentialIndex = 0
  }

  const index = state.nextSequentialIndex % trackCount
  state.nextSequentialIndex = (index + 1) % trackCount
  writeState(state)
  return index
}
