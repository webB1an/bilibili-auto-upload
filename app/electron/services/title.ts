import https from 'https'
import { URL } from 'url'

export async function translateToChinese(text: string): Promise<string> {
  const cleaned = normalizeWallpaperName(text)
  if (!cleaned) return text

  const latin = [...cleaned].filter((c) => /[a-zA-Z]/.test(c)).length
  if (latin / cleaned.length < 0.5) {
    return cleaned
  }

  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'en')
    url.searchParams.set('tl', 'zh-CN')
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', cleaned)

    const body = await new Promise<string>((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => resolve(data))
        })
        .on('error', reject)
    })

    const parsed = JSON.parse(body) as Array<Array<[string]>>
    const translated = parsed[0]?.map((part) => part[0]).join('').trim()
    return translated || cleaned
  } catch {
    return cleaned
  }
}

export const BILIBILI_TITLE_PREFIX = '『Wallpaper Engine』动态壁纸推荐 '
const BILIBILI_TITLE_PREFIX_LEGACY = '『Wallpaper Engine』动态壁纸推荐，'
export const BILIBILI_TITLE_MAX_LENGTH = 80

const DYNAMIC_WALLPAPER_SUFFIX = ' 动态壁纸'
const TITLE_SEPARATOR = ' · '
const MEDIA_EXTENSION_PATTERN = /\.(mp4|webm|mkv|mov|m4v)$/i

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

function stripFileExtension(name: string): string {
  return name.replace(MEDIA_EXTENSION_PATTERN, '').trim()
}

export function normalizeWallpaperName(name: string): string {
  return stripFileExtension(name).replace(/\s+Live\s+Wallpaper\s*$/i, '').trim()
}

/** 从资源标题中提取中文壁纸名，用于 B 站标题过长时的缩写 */
export function extractChineseWallpaperName(resourceTitle: string, chineseName?: string): string {
  const separated = resourceTitle.split(TITLE_SEPARATOR)
  if (separated.length >= 2) {
    const first = stripFileExtension(separated[0].trim())
    const second = stripFileExtension(separated.slice(1).join(TITLE_SEPARATOR).trim())
    if (hasCjk(first)) return first
    if (hasCjk(second)) return second
  }

  const normalizedChinese = normalizeWallpaperName(chineseName ?? '')
  if (normalizedChinese && hasCjk(normalizedChinese)) {
    return normalizedChinese
  }

  if (resourceTitle.endsWith(DYNAMIC_WALLPAPER_SUFFIX)) {
    const beforeSuffix = resourceTitle.slice(0, -DYNAMIC_WALLPAPER_SUFFIX.length).trim()
    if (hasCjk(beforeSuffix)) return beforeSuffix
  }

  const cjkOnly = resourceTitle.replace(/[a-zA-Z0-9\s·._-]+/g, '').trim()
  if (cjkOnly) return cjkOnly

  return normalizedChinese || '动态壁纸'
}

export function buildBilibiliTitle(resourceTitle: string): string {
  return `${BILIBILI_TITLE_PREFIX}${resourceTitle}`
}

/** 生成 B 站标题；超过 80 字时去掉英文，仅保留前缀 + 中文壁纸名 */
export function buildBilibiliTitleWithLimit(
  resourceTitle: string,
  options?: { chineseName?: string }
): string {
  const fullTitle = buildBilibiliTitle(resourceTitle)
  if (fullTitle.length <= BILIBILI_TITLE_MAX_LENGTH) {
    return fullTitle
  }

  const chineseOnly = extractChineseWallpaperName(resourceTitle, options?.chineseName)
  const shortenedTitle = buildBilibiliTitle(chineseOnly)
  if (shortenedTitle.length <= BILIBILI_TITLE_MAX_LENGTH) {
    return shortenedTitle
  }

  return shortenedTitle.slice(0, BILIBILI_TITLE_MAX_LENGTH)
}

export function buildTitle(englishName: string, chineseName: string): string {
  const base = normalizeWallpaperName(englishName)
  if (!chineseName || chineseName === base) {
    return `${base}${DYNAMIC_WALLPAPER_SUFFIX}`
  }
  return `${chineseName}${TITLE_SEPARATOR}${base}`
}

export function resourceTitleFromBilibiliTitle(bilibiliTitle: string): string {
  if (bilibiliTitle.startsWith(BILIBILI_TITLE_PREFIX)) {
    return bilibiliTitle.slice(BILIBILI_TITLE_PREFIX.length).trim()
  }
  if (bilibiliTitle.startsWith(BILIBILI_TITLE_PREFIX_LEGACY)) {
    return bilibiliTitle.slice(BILIBILI_TITLE_PREFIX_LEGACY.length).trim()
  }
  return stripFileExtension(bilibiliTitle)
}

export interface BilibiliDescContext {
  title: string
  bilibiliTitle: string
  shareLink: string
  sharePwd: string
  detailUrl: string
  source: string
}

export function buildBilibiliDesc(template: string, context: BilibiliDescContext): string {
  const sharePwdLine = context.sharePwd ? `提取码：${context.sharePwd}` : ''
  const replacements: Record<string, string> = {
    title: context.title,
    bilibiliTitle: context.bilibiliTitle,
    shareLink: context.shareLink,
    sharePwd: context.sharePwd,
    sharePwdLine,
    detailUrl: context.detailUrl,
    source: context.source
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => replacements[key] ?? '')
}
