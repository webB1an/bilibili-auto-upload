import { describe, expect, it } from 'vitest'
import {
  buildBilibiliTitleWithLimit,
  buildTitle,
  extractChineseWallpaperName,
  normalizeWallpaperName,
  translateToChinese
} from '../title'

describe('normalizeWallpaperName', () => {
  it('strips file extension and Live Wallpaper suffix', () => {
    expect(normalizeWallpaperName('Ocean Waves.mp4')).toBe('Ocean Waves')
    expect(normalizeWallpaperName('Sunset Live Wallpaper')).toBe('Sunset')
    expect(normalizeWallpaperName('Ocean Waves 动态壁纸')).toBe('Ocean Waves')
  })
})

describe('buildTitle', () => {
  it('puts Chinese name before English with separator', () => {
    expect(buildTitle('Ocean Waves', '海洋波浪')).toBe('海洋波浪 · Ocean Waves')
  })

  it('does not append dynamic wallpaper suffix when no translation', () => {
    expect(buildTitle('Ocean Waves', 'Ocean Waves')).toBe('Ocean Waves')
  })

  it('strips dynamic wallpaper suffix from translated names', () => {
    expect(buildTitle('Ocean Waves', '海洋波浪 动态壁纸')).toBe('海洋波浪 · Ocean Waves')
  })
})

describe('translateToChinese', () => {
  it('uses a local fallback for common wallpaper titles', async () => {
    await expect(translateToChinese('Rick And Morty Green Portal')).resolves.toBe(
      '瑞克和莫蒂绿色传送门'
    )
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
