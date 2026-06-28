import { app } from 'electron'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { orderWallpaperSources, WALLPAPER_SOURCE_IDS } from '../../src/constants/wallpaperSources'

export const DEFAULT_DOWNLOAD_SOURCES = WALLPAPER_SOURCE_IDS

const LEGACY_DOWNLOAD_SOURCES = ['wallpaperwaifu', 'moewalls'] as const
const LEGACY_BILIBILI_TID = 138

/** Expand old 2-source installs once; checkbox UI lets users disable sources afterward. */
export function migrateLegacyDownloadSources(sources: string[] | undefined): string[] | null {
  if (!sources || sources.length !== LEGACY_DOWNLOAD_SOURCES.length) return null
  if (sources.every((source, index) => source === LEGACY_DOWNLOAD_SOURCES[index])) {
    return [...DEFAULT_DOWNLOAD_SOURCES]
  }
  return null
}

/** Keep only known sources while preserving the user's priority order. */
export function normalizeDownloadSources(
  sources: string[] | undefined,
  defaults: readonly string[] = DEFAULT_DOWNLOAD_SOURCES
): string[] {
  const ordered = orderWallpaperSources(sources ?? [], defaults)
  return ordered.length > 0 ? ordered : [...defaults]
}

export function getDefaultConfig(): AppConfig {
  return {
    panControl: {
      baseUrl: 'https://panapi.wdbzk.com',
      apiToken: '',
      categoryId: 61
    },
    baidu: {
      remoteBase: '动态壁纸-自动分享',
      sharePeriodDays: 0,
      bdpanPath: path.join(app.getPath('userData'), 'tools', 'bdpan', process.platform === 'win32' ? 'bdpan.exe' : 'bdpan')
    },
    bilibili: {
      accountName: 'Wallpaper壁纸姐',
      tid: 21,
      tags: ['动态壁纸', 'Wallpaper Engine', '4K', '二次元', '壁纸', '动漫壁纸', '视频壁纸'],
      socialAutoUploadPath: path.join(app.getPath('userData'), 'tools', 'bilibili-cli'),
      descTemplate: `动态壁纸及手机、平板、电脑使用教程
https://wallpaper.wdbzk.com/
-----------------------------------------------------
动态壁纸来自Wallpaper Engine
尊重每一张壁纸的原创作者
如有侵权，联系删除`
    },
    download: {
      sources: [...DEFAULT_DOWNLOAD_SOURCES],
      scriptsDir: 'auto'
    },
    pipeline: {
      deleteLocalAfterSuccess: true,
      maxFileSizeMb: 300,
      abortOnCatalogDuplicate: true
    },
    onboarding: {
      completed: false
    },
    queue: {
      enabled: false,
      intervalMinutes: 30,
      dailyLimit: 10,
      stopOnError: true
    },
    bgm: {
      libraryPath: 'C:\\Users\\Admin\\Desktop\\bgm',
      selectionMode: 'random',
      fadeSeconds: 2
    },
    translation: {
      provider: 'minimax',
      minimaxApiKey: '',
      deepseekApiKey: ''
    }
  }
}

export function mergeConfig(partial: Partial<AppConfig>, defaults: AppConfig): AppConfig {
  const legacySources = migrateLegacyDownloadSources(partial.download?.sources)
  const downloadPartial = legacySources
    ? { ...partial.download, sources: legacySources }
    : partial.download
  const bilibiliPartial =
    partial.bilibili?.tid === LEGACY_BILIBILI_TID
      ? { ...partial.bilibili, tid: defaults.bilibili.tid }
      : partial.bilibili

  return {
    panControl: { ...defaults.panControl, ...partial.panControl },
    baidu: { ...defaults.baidu, ...partial.baidu },
    bilibili: { ...defaults.bilibili, ...bilibiliPartial },
    download: {
      ...defaults.download,
      ...downloadPartial,
      sources: normalizeDownloadSources(downloadPartial?.sources, defaults.download.sources)
    },
    pipeline: { ...defaults.pipeline, ...partial.pipeline },
    onboarding: { ...defaults.onboarding, ...partial.onboarding },
    queue: { ...defaults.queue, ...partial.queue },
    bgm: { ...defaults.bgm, ...partial.bgm },
    translation: { ...defaults.translation, ...partial.translation }
  }
}
