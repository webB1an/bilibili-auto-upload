import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOWNLOAD_SOURCES,
  mergeConfig,
  migrateLegacyDownloadSources,
  normalizeDownloadSources
} from '../defaults'
import type { AppConfig } from '../../../src/types'

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
  it('preserves user source priority order', () => {
    expect(normalizeDownloadSources(['wallsflow', 'moewalls'])).toEqual(['wallsflow', 'moewalls'])
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

describe('mergeConfig', () => {
  it('migrates the old default Bilibili tid', () => {
    const defaults: AppConfig = {
      panControl: { baseUrl: '', apiToken: '', categoryId: 61 },
      baidu: { remoteBase: '', sharePeriodDays: 0, bdpanPath: '' },
      bilibili: {
        accountName: 'creator',
        tid: 21,
        tags: [],
        socialAutoUploadPath: '',
        descTemplate: ''
      },
      download: { sources: [...DEFAULT_DOWNLOAD_SOURCES], scriptsDir: 'auto' },
      pipeline: { deleteLocalAfterSuccess: true, maxFileSizeMb: 300, abortOnCatalogDuplicate: true },
      onboarding: { completed: false },
      queue: { enabled: false, intervalMinutes: 30, dailyLimit: 10, stopOnError: true },
      bgm: { libraryPath: '', selectionMode: 'random', fadeSeconds: 2 },
      translation: { provider: 'google', minimaxApiKey: '', deepseekApiKey: '' }
    }
    expect(mergeConfig({ bilibili: { tid: 138 } as never }, defaults).bilibili.tid).toBe(21)
  })
})
