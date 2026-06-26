import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { listBgmTracks } from '../bgmLibrary'

describe('listBgmTracks', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    tempDirs.splice(0).forEach((dir) => {
      fs.rmSync(dir, { recursive: true, force: true })
    })
  })

  it('returns sorted audio files only', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-lib-'))
    tempDirs.push(dir)
    fs.writeFileSync(path.join(dir, 'b.mp3'), 'x')
    fs.writeFileSync(path.join(dir, 'a.wav'), 'x')
    fs.writeFileSync(path.join(dir, 'note.txt'), 'x')

    expect(listBgmTracks(dir)).toEqual([path.join(dir, 'a.wav'), path.join(dir, 'b.mp3')])
  })

  it('returns empty for missing directory', () => {
    expect(listBgmTracks(path.join(os.tmpdir(), 'missing-bgm-dir'))).toEqual([])
  })
})
