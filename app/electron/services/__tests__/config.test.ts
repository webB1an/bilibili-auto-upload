import { describe, expect, it } from 'vitest'
import type { AppConfig } from '../../../src/types'
import { protectAgainstStaleDefaultSave } from '../config'

function makeConfig(): AppConfig {
  return {
    panControl: { baseUrl: '', apiToken: '', categoryId: 61 },
    baidu: { remoteBase: '', sharePeriodDays: 0, bdpanPath: '' },
    bilibili: {
      accountName: 'Wallpaper壁纸姐',
      tid: 21,
      tags: ['动态壁纸'],
      socialAutoUploadPath: '',
      descTemplate: 'default template'
    },
    download: { sources: ['moewalls'], scriptsDir: 'auto' },
    pipeline: { deleteLocalAfterSuccess: true, maxFileSizeMb: 300, abortOnCatalogDuplicate: true },
    onboarding: { completed: true },
    queue: { enabled: false, intervalMinutes: 30, dailyLimit: 10, stopOnError: true },
    bgm: { libraryPath: 'C:\\Users\\Admin\\Desktop\\bgm', selectionMode: 'random', fadeSeconds: 2 },
    translation: { provider: 'minimax', minimaxApiKey: '', deepseekApiKey: '' }
  }
}

describe('protectAgainstStaleDefaultSave', () => {
  it('keeps existing custom values when a stale default config is saved', () => {
    const defaults = makeConfig()
    const stale = makeConfig()
    const current = makeConfig()

    stale.bilibili.accountName = 'creator'
    stale.bgm.libraryPath = ''
    stale.translation.provider = 'google'

    current.bilibili.descTemplate = 'custom template'
    current.bilibili.tags = ['动态壁纸', 'Wallpaper Engine', '4K', '二次元']
    current.download.sources = ['moewalls', 'wallpaperwaifu']
    current.bgm.libraryPath = 'C:\\Users\\Admin\\Desktop\\bgm'
    current.translation.provider = 'minimax'

    const protectedConfig = protectAgainstStaleDefaultSave(stale, current, defaults)

    expect(protectedConfig.bilibili.accountName).toBe('Wallpaper壁纸姐')
    expect(protectedConfig.bilibili.descTemplate).toBe('custom template')
    expect(protectedConfig.bilibili.tags).toEqual(['动态壁纸', 'Wallpaper Engine', '4K', '二次元'])
    expect(protectedConfig.download.sources).toEqual(['moewalls', 'wallpaperwaifu'])
    expect(protectedConfig.bgm.libraryPath).toBe('C:\\Users\\Admin\\Desktop\\bgm')
    expect(protectedConfig.translation.provider).toBe('minimax')
  })

  it('allows explicitly switching translation back to google from current settings', () => {
    const defaults = makeConfig()
    const incoming = makeConfig()
    const current = makeConfig()

    incoming.translation.provider = 'google'
    current.translation.provider = 'minimax'

    const protectedConfig = protectAgainstStaleDefaultSave(incoming, current, defaults)

    expect(protectedConfig.translation.provider).toBe('google')
  })

  it('allows intentionally resetting configurable fields to current defaults', () => {
    const defaults = makeConfig()
    const incoming = makeConfig()
    const current = makeConfig()

    current.bilibili.descTemplate = 'custom template'
    current.bilibili.tags = ['custom']
    current.download.sources = ['wallpaperwaifu', 'moewalls']
    current.bgm.libraryPath = 'D:\\Music'

    const protectedConfig = protectAgainstStaleDefaultSave(incoming, current, defaults)

    expect(protectedConfig.bilibili.descTemplate).toBe(defaults.bilibili.descTemplate)
    expect(protectedConfig.bilibili.tags).toEqual(defaults.bilibili.tags)
    expect(protectedConfig.download.sources).toEqual(defaults.download.sources)
    expect(protectedConfig.bgm.libraryPath).toBe(defaults.bgm.libraryPath)
  })
})
