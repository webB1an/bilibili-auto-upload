import { describe, expect, it } from 'vitest'
import { normalizeCatalogKey } from '../wallpaperCatalog'

describe('normalizeCatalogKey', () => {
  it('normalizes bilibili prefix and dynamic suffix', () => {
    const key = normalizeCatalogKey('『Wallpaper Engine』动态壁纸推荐 海洋波浪 动态壁纸')
    expect(key).toBe('海洋波浪')
  })

  it('prefers Chinese segment in bilingual title', () => {
    expect(normalizeCatalogKey('海洋波浪 · Ocean Waves')).toBe('海洋波浪')
    expect(normalizeCatalogKey('Ocean · 海洋波浪')).toBe('海洋波浪')
  })

  it('lowercases latin-only titles', () => {
    expect(normalizeCatalogKey('Ocean Waves 动态壁纸')).toBe('ocean waves')
  })
})
