import { app } from 'electron'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { orderWallpaperSources, WALLPAPER_SOURCE_IDS } from '../../src/constants/wallpaperSources'

export const DEFAULT_DOWNLOAD_SOURCES = WALLPAPER_SOURCE_IDS

const LEGACY_DOWNLOAD_SOURCES = ['wallpaperwaifu', 'moewalls'] as const

/** Expand old 2-source installs once; checkbox UI lets users disable sources afterward. */
export function migrateLegacyDownloadSources(sources: string[] | undefined): string[] | null {
  if (!sources || sources.length !== LEGACY_DOWNLOAD_SOURCES.length) return null
  if (sources.every((source, index) => source === LEGACY_DOWNLOAD_SOURCES[index])) {
    return [...DEFAULT_DOWNLOAD_SOURCES]
  }
  return null
}

/** Keep only known sources in default catalog order. */
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
      remoteBase: '动态壁纸',
      sharePeriodDays: 0,
      bdpanPath: path.join(app.getPath('userData'), 'tools', 'bdpan', process.platform === 'win32' ? 'bdpan.exe' : 'bdpan')
    },
    bilibili: {
      accountName: 'creator',
      tid: 138,
      tags: ['动态壁纸', 'Wallpaper Engine', '4K'],
      socialAutoUploadPath: path.join(app.getPath('userData'), 'tools', 'bilibili-cli'),
      descTemplate: `{bilibiliTitle}

网盘下载：{shareLink}
{sharePwdLine}

来源：{detailUrl}`
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
      libraryPath: '',
      selectionMode: 'random',
      fadeSeconds: 2
    }
  }
}

export function mergeConfig(partial: Partial<AppConfig>, defaults: AppConfig): AppConfig {
  const legacySources = migrateLegacyDownloadSources(partial.download?.sources)
  const downloadPartial = legacySources
    ? { ...partial.download, sources: legacySources }
    : partial.download

  return {
    panControl: { ...defaults.panControl, ...partial.panControl },
    baidu: { ...defaults.baidu, ...partial.baidu },
    bilibili: { ...defaults.bilibili, ...partial.bilibili },
    download: {
      ...defaults.download,
      ...downloadPartial,
      sources: normalizeDownloadSources(downloadPartial?.sources, defaults.download.sources)
    },
    pipeline: { ...defaults.pipeline, ...partial.pipeline },
    onboarding: { ...defaults.onboarding, ...partial.onboarding },
    queue: { ...defaults.queue, ...partial.queue },
    bgm: { ...defaults.bgm, ...partial.bgm }
  }
}
