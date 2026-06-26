import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOWNLOAD_SOURCES,
  migrateLegacyDownloadSources,
  normalizeDownloadSources
} from '../defaults'

describe('migrateLegacyDownloadSources', () => {
  it('expands the old 2-source default', () => {
    expect(migrateLegacyDownloadSources(['wallpaperwaifu', 'moewalls'])).toEqual([
      ...DEFAULT_DOWNLOAD_SOURCES
    ])
  })

  it('ignores custom selections', () => {
    expect(migrateLegacyDownloadSources(['moewalls'])).toBeNull()
    expect(migrateLegacyDownloadSources(['wallpaperwaifu', 'moewalls', 'desktophut'])).toBeNull()
  })
})

describe('normalizeDownloadSources', () => {
  it('orders enabled sources by default catalog', () => {
    expect(normalizeDownloadSources(['wallsflow', 'moewalls'])).toEqual(['moewalls', 'wallsflow'])
  })

  it('drops unknown sources', () => {
    expect(normalizeDownloadSources(['moewalls', 'unknown'])).toEqual(['moewalls'])
  })

  it('does not append disabled sources', () => {
    expect(normalizeDownloadSources(['wallpaperwaifu', 'moewalls'])).toEqual([
      'wallpaperwaifu',
      'moewalls'
    ])
  })

  it('falls back to defaults when empty', () => {
    expect(normalizeDownloadSources([])).toEqual([...DEFAULT_DOWNLOAD_SOURCES])
  })
})
