const WALLPAPER_CATALOG_URL = 'https://wallpaper.wdbzk.com/api/wallpaper/resources'
const TITLE_SEPARATOR = ' · '
const DYNAMIC_WALLPAPER_SUFFIX = ' 动态壁纸'
const BILIBILI_PREFIX = '『Wallpaper Engine』动态壁纸推荐'

export interface WallpaperCatalogItem {
  id: number
  name: string
  link: string
  click_count?: number
}

function stripExtension(name: string): string {
  return name.replace(/\.(mp4|webm|mkv|mov|m4v)$/i, '').trim()
}

/** 用于与 wallpaper.wdbzk.com 资源名比对 */
export function normalizeCatalogKey(title: string): string {
  let value = stripExtension(title).trim()
  if (value.startsWith(BILIBILI_PREFIX)) {
    value = value.slice(BILIBILI_PREFIX.length).trim()
  }
  if (value.endsWith(DYNAMIC_WALLPAPER_SUFFIX)) {
    value = value.slice(0, -DYNAMIC_WALLPAPER_SUFFIX.length).trim()
  }
  const parts = value.split(TITLE_SEPARATOR).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const chinese = parts.find((part) => /[\u4e00-\u9fff]/.test(part))
    if (chinese) return chinese.toLowerCase()
    return parts.join(' ').toLowerCase()
  }
  return value.replace(/\s+/g, ' ').toLowerCase()
}

function linksMatch(existingLink: string, shareLink: string): boolean {
  const a = existingLink.trim().toLowerCase()
  const b = shareLink.trim().toLowerCase()
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

export async function fetchWallpaperCatalog(
  keyword = '',
  pageSize = 100
): Promise<{ ok: boolean; items: WallpaperCatalogItem[]; message: string }> {
  try {
    const url = new URL(WALLPAPER_CATALOG_URL)
    url.searchParams.set('page', '1')
    url.searchParams.set('pageSize', String(pageSize))
    if (keyword.trim()) {
      url.searchParams.set('keyword', keyword.trim())
    }

    const response = await fetch(url.toString(), { method: 'GET' })
    const body = (await response.json()) as {
      code?: number
      message?: string
      data?: { list?: WallpaperCatalogItem[] }
    }

    if (body.code !== 200) {
      return { ok: false, items: [], message: body.message || `catalog API 失败 (${response.status})` }
    }

    return {
      ok: true,
      items: body.data?.list ?? [],
      message: `已获取 ${body.data?.list?.length ?? 0} 条库内资源`
    }
  } catch (error) {
    return { ok: false, items: [], message: (error as Error).message || '无法连接 wallpaper.wdbzk.com' }
  }
}

export async function findCatalogDuplicate(
  resourceTitle: string,
  options?: { shareLink?: string; keyword?: string }
): Promise<{ duplicate: boolean; item?: WallpaperCatalogItem; message: string }> {
  const key = normalizeCatalogKey(resourceTitle)
  if (!key) {
    return { duplicate: false, message: '标题为空，跳过去重' }
  }

  const catalog = await fetchWallpaperCatalog(options?.keyword ?? extractKeyword(resourceTitle))
  if (!catalog.ok) {
    return { duplicate: false, message: `去重检查跳过: ${catalog.message}` }
  }

  for (const item of catalog.items) {
    const itemKey = normalizeCatalogKey(item.name)
    if (itemKey && (itemKey === key || itemKey.includes(key) || key.includes(itemKey))) {
      return {
        duplicate: true,
        item,
        message: `wallpaper.wdbzk.com 已有类似资源: ${item.name} (#${item.id})`
      }
    }
    if (options?.shareLink && linksMatch(item.link, options.shareLink)) {
      return {
        duplicate: true,
        item,
        message: `wallpaper.wdbzk.com 已有相同分享链接: ${item.name} (#${item.id})`
      }
    }
  }

  return { duplicate: false, message: '库内未发现重复资源' }
}

function extractKeyword(title: string): string {
  const key = normalizeCatalogKey(title)
  const cjk = key.match(/[\u4e00-\u9fff]+/g)?.join('') ?? ''
  if (cjk.length >= 2) return cjk.slice(0, 8)
  return key.split(' ')[0] ?? ''
}

export async function testWallpaperCatalogConnection(): Promise<{ ok: boolean; message: string }> {
  const result = await fetchWallpaperCatalog('', 1)
  if (!result.ok) {
    return { ok: false, message: result.message }
  }
  return { ok: true, message: 'wallpaper.wdbzk.com 可读' }
}
