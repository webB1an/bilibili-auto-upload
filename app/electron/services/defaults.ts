import { app } from 'electron'
import path from 'path'
import type { AppConfig } from '../../src/types'

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
      sources: ['wallpaperwaifu', 'moewalls'],
      scriptsDir: 'auto'
    },
    pipeline: {
      deleteLocalAfterSuccess: true,
      maxFileSizeMb: 300,
      abortOnCatalogDuplicate: true
    },
    onboarding: {
      completed: false
    }
  }
}

export function mergeConfig(partial: Partial<AppConfig>, defaults: AppConfig): AppConfig {
  return {
    panControl: { ...defaults.panControl, ...partial.panControl },
    baidu: { ...defaults.baidu, ...partial.baidu },
    bilibili: { ...defaults.bilibili, ...partial.bilibili },
    download: { ...defaults.download, ...partial.download },
    pipeline: { ...defaults.pipeline, ...partial.pipeline },
    onboarding: { ...defaults.onboarding, ...partial.onboarding }
  }
}
