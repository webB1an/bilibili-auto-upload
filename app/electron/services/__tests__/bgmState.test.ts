import { describe, expect, it } from 'vitest'
import { buildLibraryFingerprint } from '../bgmState'

describe('buildLibraryFingerprint', () => {
  it('uses stable basename order', () => {
    expect(buildLibraryFingerprint(['/music/a.mp3', '/music/b.mp3'])).toBe('a.mp3\nb.mp3')
  })
})

describe('sequential pick math', () => {
  function advance(nextIndex: number, trackCount: number): { index: number; nextIndex: number } {
    const index = nextIndex % trackCount
    return { index, nextIndex: (index + 1) % trackCount }
  }

  it('rotates through tracks', () => {
    let next = 0
    const picks: number[] = []
    for (let i = 0; i < 5; i += 1) {
      const result = advance(next, 3)
      picks.push(result.index)
      next = result.nextIndex
    }
    expect(picks).toEqual([0, 1, 2, 0, 1])
  })
})
