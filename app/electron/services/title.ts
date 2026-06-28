import https from 'https'
import { URL } from 'url'
import type { AppConfig } from '../../src/types'

const DYNAMIC_WALLPAPER_SUFFIX = ' 动态壁纸'
const CHINESE_DYNAMIC_WALLPAPER_SUFFIX_PATTERN = /\s*动态壁纸\s*$/i
const LIVE_WALLPAPER_SUFFIX_PATTERN = /\s+Live\s+Wallpaper\s*$/i
const TITLE_SEPARATOR = ' · '
const MEDIA_EXTENSION_PATTERN = /\.(mp4|webm|mkv|mov|m4v)$/i

function compactChineseSpaces(text: string): string {
  return text.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1').trim()
}

function fallbackTranslateToChinese(text: string): string {
  const phraseMap: Array<[RegExp, string]> = [
    [/\brick\s+and\s+morty\b/gi, '瑞克和莫蒂'],
    [/\bcyberpunk\b/gi, '赛博朋克'],
    [/\bwallpaper\s+engine\b/gi, 'Wallpaper Engine']
  ]
  const wordMap: Record<string, string> = {
    green: '绿色',
    portal: '传送门',
    blue: '蓝色',
    red: '红色',
    purple: '紫色',
    pink: '粉色',
    white: '白色',
    black: '黑色',
    golden: '金色',
    gold: '金色',
    forest: '森林',
    ocean: '海洋',
    sea: '海',
    waves: '波浪',
    wave: '波浪',
    sunset: '日落',
    sunrise: '日出',
    night: '夜晚',
    city: '城市',
    rain: '雨',
    rainy: '雨中',
    snow: '雪',
    space: '太空',
    galaxy: '银河',
    star: '星空',
    stars: '星空',
    mountain: '山',
    mountains: '群山',
    lake: '湖',
    river: '河流',
    room: '房间',
    girl: '女孩',
    anime: '动漫',
    car: '汽车',
    dragon: '龙',
    fire: '火焰',
    and: '',
    of: '',
    the: '',
    a: '',
    an: '',
    wallpaper: '',
    live: ''
  }

  let translated = text
  for (const [pattern, replacement] of phraseMap) {
    translated = translated.replace(pattern, ` ${replacement} `)
  }

  const parts = translated
    .split(/([\s._-]+)/)
    .map((part) => {
      if (!/[a-zA-Z]/.test(part)) return part
      const mapped = wordMap[part.toLowerCase()]
      return mapped ?? part
    })

  const output = compactChineseSpaces(parts.join('').replace(/\s+/g, ' '))
  return /[a-zA-Z]/.test(output) ? '' : output
}

type TranslationConfig = AppConfig['translation']

function requestJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const body = JSON.stringify(payload)
    const request = https.request(
      parsedUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body).toString(),
          ...headers
        },
        timeout: 30_000
      },
      (response) => {
        let data = ''
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          if ((response.statusCode ?? 500) >= 400) {
            reject(new Error(`HTTP ${response.statusCode}: ${data.slice(0, 300)}`))
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(error)
          }
        })
      }
    )
    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy(new Error('request timed out'))
    })
    request.write(body)
    request.end()
  })
}

function extractChatCompletionContent(response: unknown): string {
  const payload = response as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }
  return (
    payload.choices?.[0]?.message?.content?.trim() ||
    payload.choices?.[0]?.text?.trim() ||
    ''
  )
}

function buildTranslationMessages(text: string): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content:
        '你是动态壁纸标题翻译助手。把英文标题翻译成自然简洁的中文标题，只输出中文标题，不要解释，不要引号，不要添加“动态壁纸”。保留专有名词的常用中文译名。'
    },
    {
      role: 'user',
      content: text
    }
  ]
}

function sanitizeModelTranslation(raw: string, source: string): string {
  const cleaned = normalizeWallpaperName(raw.replace(/^["“”']+|["“”']+$/g, ''))
  if (!cleaned || cleaned === source || !hasCjk(cleaned)) return ''
  return cleaned
}

async function translateWithDeepseek(text: string, apiKey: string): Promise<string> {
  const response = await requestJson(
    'https://api.deepseek.com/chat/completions',
    { Authorization: `Bearer ${apiKey}` },
    {
      model: 'deepseek-v4-flash',
      messages: buildTranslationMessages(text),
      temperature: 0.2,
      max_tokens: 80,
      stream: false
    }
  )
  return sanitizeModelTranslation(extractChatCompletionContent(response), text)
}

async function translateWithMinimax(text: string, apiKey: string): Promise<string> {
  const response = await requestJson(
    'https://api.minimax.chat/v1/chat/completions',
    { Authorization: `Bearer ${apiKey}` },
    {
      model: 'MiniMax-Text-01',
      messages: buildTranslationMessages(text),
      temperature: 0.2,
      max_tokens: 80,
      stream: false
    }
  )
  return sanitizeModelTranslation(extractChatCompletionContent(response), text)
}

async function translateWithConfiguredModel(
  text: string,
  translation?: TranslationConfig
): Promise<string> {
  if (!translation || translation.provider === 'google') return ''

  try {
    if (translation.provider === 'deepseek' && translation.deepseekApiKey.trim()) {
      return await translateWithDeepseek(text, translation.deepseekApiKey.trim())
    }
    if (translation.provider === 'minimax' && translation.minimaxApiKey.trim()) {
      return await translateWithMinimax(text, translation.minimaxApiKey.trim())
    }
  } catch {
    return ''
  }

  return ''
}

export async function translateToChinese(
  text: string,
  translation?: TranslationConfig
): Promise<string> {
  const cleaned = normalizeWallpaperName(text)
  if (!cleaned) return text

  const latin = [...cleaned].filter((c) => /[a-zA-Z]/.test(c)).length
  if (latin / cleaned.length < 0.5) {
    return cleaned
  }

  const modelTranslated = await translateWithConfiguredModel(cleaned, translation)
  if (modelTranslated) {
    return modelTranslated
  }

  const fallback = fallbackTranslateToChinese(cleaned)
  if (fallback) {
    return fallback
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
    return translated || fallbackTranslateToChinese(cleaned) || cleaned
  } catch {
    return fallbackTranslateToChinese(cleaned) || cleaned
  }
}

export const BILIBILI_TITLE_PREFIX = '『Wallpaper Engine』动态壁纸推荐 '
const BILIBILI_TITLE_PREFIX_LEGACY = '『Wallpaper Engine』动态壁纸推荐，'
export const BILIBILI_TITLE_MAX_LENGTH = 80

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

function stripFileExtension(name: string): string {
  return name.replace(MEDIA_EXTENSION_PATTERN, '').trim()
}

export function normalizeWallpaperName(name: string): string {
  return stripFileExtension(name)
    .replace(LIVE_WALLPAPER_SUFFIX_PATTERN, '')
    .replace(CHINESE_DYNAMIC_WALLPAPER_SUFFIX_PATTERN, '')
    .trim()
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
  const chinese = normalizeWallpaperName(chineseName)
  if (!chinese || chinese === base) {
    return base
  }
  return `${chinese}${TITLE_SEPARATOR}${base}`
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
