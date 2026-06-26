import { describe, expect, it } from 'vitest'
import {
  buildBilibiliTitleWithLimit,
  buildTitle,
  extractChineseWallpaperName,
  normalizeWallpaperName
} from '../title'

describe('normalizeWallpaperName', () => {
  it('strips file extension and Live Wallpaper suffix', () => {
    expect(normalizeWallpaperName('Ocean Waves.mp4')).toBe('Ocean Waves')
    expect(normalizeWallpaperName('Sunset Live Wallpaper')).toBe('Sunset')
  })
})

describe('buildTitle', () => {
  it('puts Chinese name before English with separator', () => {
    expect(buildTitle('Ocean Waves', '海洋波浪')).toBe('海洋波浪 · Ocean Waves')
  })

  it('adds dynamic wallpaper suffix when no translation', () => {
    expect(buildTitle('Ocean Waves', 'Ocean Waves')).toBe('Ocean Waves 动态壁纸')
  })
})

describe('extractChineseWallpaperName', () => {
  it('extracts Chinese segment from resource title', () => {
    expect(extractChineseWallpaperName('海洋波浪 · Ocean Waves')).toBe('海洋波浪')
  })
})

describe('buildBilibiliTitleWithLimit', () => {
  it('shortens long titles to Chinese-only within 80 chars', () => {
    const longEnglish = 'A'.repeat(60)
    const resourceTitle = `海洋波浪 · ${longEnglish}`
    const title = buildBilibiliTitleWithLimit(resourceTitle, { chineseName: '海洋波浪' })
    expect(title.length).toBeLessThanOrEqual(80)
    expect(title).toContain('海洋波浪')
  })
})
