import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import type { AppConfig, DownloadResult } from '../../src/types'
import { getNodeSpawnEnv, resolveNodeExecutable } from './nodeRuntime'
import { registerProcess } from './processRegistry'
import { isDetailUrlPosted, loadState } from './state'
import { normalizeWallpaperName } from './title'

const SOURCE_SCRIPTS: Record<string, string> = {
  wallpaperwaifu: 'download-wallpaperwaifu-first-page.mjs',
  moewalls: 'download-moewalls-first-page.mjs',
  desktophut: 'download-desktophut-first-page.mjs',
  motionbgs: 'download-motionbgs-first-page.mjs',
  wallsflow: 'download-wallsflow-first-page.mjs',
  wallpaperwaves: 'download-wallpaperwaves-first-page.mjs'
}

const MANIFEST_NAMES: Record<string, string> = {
  wallpaperwaifu: 'manifest-wallpaperwaifu.json',
  moewalls: 'manifest.json',
  desktophut: 'manifest-desktophut.json',
  motionbgs: 'manifest-motionbgs.json',
  wallsflow: 'manifest-wallsflow.json',
  wallpaperwaves: 'manifest-wallpaperwaves.json'
}

const URL_RECORD_NAMES: Record<string, string> = {
  wallpaperwaifu: 'downloaded-wallpaperwaifu-detail-urls.json',
  moewalls: 'downloaded-detail-urls.json',
  desktophut: 'downloaded-desktophut-detail-urls.json',
  motionbgs: 'downloaded-motionbgs-detail-urls.json',
  wallsflow: 'downloaded-wallsflow-detail-urls.json',
  wallpaperwaves: 'downloaded-wallpaperwaves-detail-urls.json'
}

const SOURCE_HOSTS: Record<string, string[]> = {
  wallpaperwaifu: ['wallpaperwaifu.com'],
  moewalls: ['moewalls.com'],
  desktophut: ['desktophut.com'],
  motionbgs: ['motionbgs.com'],
  wallsflow: ['wallsflow.com'],
  wallpaperwaves: ['wallpaperwaves.com']
}

export function resolveScriptsBase(config: AppConfig): string {
  if (config.download.scriptsDir && config.download.scriptsDir !== 'auto') {
    return config.download.scriptsDir
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'wallpaper-download')
  }
  return path.join(app.getAppPath(), 'scripts', 'wallpaper-download')
}

function normalizeDetailUrlForRecord(value: string): string {
  try {
    const parsed = new URL(value)
    parsed.hash = ''
    parsed.search = ''
    return parsed.href
  } catch {
    return value
  }
}

function matchesSourceHost(detailUrl: string, source: string): boolean {
  const hosts = SOURCE_HOSTS[source]
  if (!hosts) return true
  try {
    const hostname = new URL(detailUrl).hostname.replace(/^www\./, '')
    return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

function syncPostedUrlsToDownloadRecord(source: string, base: string, log: (line: string) => void): void {
  const recordName = URL_RECORD_NAMES[source]
  if (!recordName) return

  const postedUrls = loadState()
    .postedDetailUrls.filter((url) => matchesSourceHost(url, source))
    .map(normalizeDetailUrlForRecord)
  if (postedUrls.length === 0) return

  const recordPath = path.join(base, 'config', recordName)
  let records: Array<Record<string, unknown>> = []
  try {
    if (fs.existsSync(recordPath)) {
      const parsed = JSON.parse(fs.readFileSync(recordPath, 'utf-8')) as unknown
      records = Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : []
    }
  } catch {
    records = []
  }

  const known = new Set(
    records
      .map((record) => (typeof record.detailUrl === 'string' ? normalizeDetailUrlForRecord(record.detailUrl) : ''))
      .filter(Boolean)
  )
  let added = 0
  for (const detailUrl of postedUrls) {
    if (known.has(detailUrl)) continue
    records.push({
      detailUrl,
      status: 'posted',
      recordedAt: new Date().toISOString()
    })
    known.add(detailUrl)
    added += 1
  }

  if (added > 0) {
    fs.mkdirSync(path.dirname(recordPath), { recursive: true })
    fs.writeFileSync(recordPath, JSON.stringify(records, null, 2), 'utf-8')
    log(`已同步 ${added} 条已投稿记录到 ${source} 下载去重`)
  }
}

function cleanupResumeArtifacts(downloadsDir: string, log: (line: string) => void): void {
  if (!fs.existsSync(downloadsDir)) return
  for (const entry of fs.readdirSync(downloadsDir)) {
    const full = path.join(downloadsDir, entry)
    if (entry.endsWith('.part')) {
      fs.unlinkSync(full)
      log(`已清除残留: ${entry}`)
      continue
    }
    if (entry.endsWith('.mp4')) {
      const stat = fs.statSync(full)
      if (stat.size < 1024 * 1024) {
        fs.unlinkSync(full)
        log(`已清除不完整视频: ${entry}`)
      }
    }
  }
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  log: (line: string) => void,
  onPreview?: (preview: { title: string }) => void
): Promise<{ ok: boolean; code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(resolveNodeExecutable(), [scriptPath, ...args], {
      env: getNodeSpawnEnv(),
      windowsHide: true,
      shell: false
    })
    registerProcess(child)
    let output = ''
    const handleLine = (line: string) => {
      log(`[node] ${line}`)
      const downloadingMatch = line.match(/downloading:\s*(.+?)(?:\s*\(|$)/i)
      if (downloadingMatch && onPreview) {
        onPreview({ title: normalizeWallpaperName(downloadingMatch[1].trim()) })
      }
    }
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      text.split('\n').filter(Boolean).forEach(handleLine)
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      text.split('\n').filter(Boolean).forEach(handleLine)
    })
    child.on('close', (code) => {
      resolve({ ok: code === 0, code: code ?? 1, output })
    })
    child.on('error', (error) => {
      resolve({ ok: false, code: 1, output: error.message })
    })
  })
}

interface ManifestItem {
  status?: string
  name?: string
  detailUrl?: string
  filePath?: string
  record?: { status?: string; filePath?: string; detailUrl?: string; name?: string }
}

export interface WallpaperPeek {
  name: string
  detailUrl: string
  source: string
}

function parseDryRunItem(item: ManifestItem, source: string): WallpaperPeek | null {
  if (item.status !== 'dry-run') return null
  const detailUrl = item.detailUrl || ''
  const rawName = item.name || 'wallpaper'
  const name = normalizeWallpaperName(rawName)
  if (!name) return null
  if (detailUrl && isDetailUrlPosted(detailUrl)) return null
  return { name, detailUrl, source }
}

function parseDryRunManifest(source: string, base: string): WallpaperPeek | null {
  const manifestName = MANIFEST_NAMES[source] ?? `manifest-${source}.json`
  const manifestPath = path.join(base, 'config', manifestName)
  if (!fs.existsSync(manifestPath)) return null

  try {
    const items = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ManifestItem[]
    for (const item of items) {
      const peek = parseDryRunItem(item, source)
      if (peek) return peek
    }
  } catch {
    return null
  }
  return null
}

/** 不下载文件，dry-run 预览下一条壁纸候选 */
export async function peekNextWallpaper(config: AppConfig): Promise<WallpaperPeek | null> {
  const base = resolveScriptsBase(config)
  const scriptsDir = path.join(base, 'scripts')
  const silentLog = () => undefined

  for (const source of config.download.sources) {
    const scriptName = SOURCE_SCRIPTS[source]
    if (!scriptName) continue
    const scriptPath = path.join(scriptsDir, scriptName)
    if (!fs.existsSync(scriptPath)) continue

    syncPostedUrlsToDownloadRecord(source, base, silentLog)
    const result = await runNodeScript(scriptPath, ['--dry-run', '--limit', '1'], silentLog)
    if (!result.ok) continue

    const peek = parseDryRunManifest(source, base)
    if (peek) return peek
  }

  return null
}

function parseManifestItem(item: ManifestItem, source: string, base: string): DownloadResult | null {
  const topStatus = item.status ?? ''
  const recordStatus = item.record?.status ?? ''
  const accepted =
    topStatus === 'downloaded' ||
    topStatus === 'skipped-existing' ||
    (topStatus === 'skipped-detail-url' && recordStatus === 'downloaded')
  if (!accepted) return null

  const detailUrl = item.detailUrl || item.record?.detailUrl || ''
  const rawName = item.name || item.record?.name || path.basename(item.filePath || item.record?.filePath || 'wallpaper')
  const name = normalizeWallpaperName(rawName)
  const filePathRaw = item.filePath || item.record?.filePath || ''
  if (!filePathRaw) return null

  const filePath = path.isAbsolute(filePathRaw) ? filePathRaw : path.join(base, filePathRaw)
  if (!fs.existsSync(filePath)) return null
  if (detailUrl && isDetailUrlPosted(detailUrl)) return null

  return { filePath, name, detailUrl, source }
}

function parseManifest(source: string, base: string): DownloadResult[] {
  const manifestName = MANIFEST_NAMES[source] ?? `manifest-${source}.json`
  const manifestPath = path.join(base, 'config', manifestName)
  if (!fs.existsSync(manifestPath)) return []

  try {
    const items = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ManifestItem[]
    return items
      .map((item) => parseManifestItem(item, source, base))
      .filter((item): item is DownloadResult => item !== null)
  } catch {
    return []
  }
}

export async function downloadWallpaper(
  config: AppConfig,
  log: (line: string) => void,
  isCancelled: () => boolean,
  onPreview?: (preview: { title: string }) => void
): Promise<DownloadResult> {
  const base = resolveScriptsBase(config)
  const scriptsDir = path.join(base, 'scripts')
  const downloadsDir = path.join(base, 'downloads')
  fs.mkdirSync(downloadsDir, { recursive: true })
  fs.mkdirSync(path.join(base, 'config'), { recursive: true })
  cleanupResumeArtifacts(downloadsDir, log)

  for (const source of config.download.sources) {
    if (isCancelled()) throw new Error('任务已取消')
    const scriptName = SOURCE_SCRIPTS[source]
    if (!scriptName) {
      log(`未知壁纸源: ${source}`)
      continue
    }
    const scriptPath = path.join(scriptsDir, scriptName)
    if (!fs.existsSync(scriptPath)) {
      log(`下载脚本不存在: ${scriptPath}`)
      continue
    }

    log(`尝试源 ${source} ...`)
    syncPostedUrlsToDownloadRecord(source, base, log)
    const result = await runNodeScript(scriptPath, ['--limit', '1'], log, onPreview)
    if (!result.ok) {
      log(`${source} 下载脚本失败 (code=${result.code})`)
      continue
    }

    const candidates = parseManifest(source, base)
    if (candidates.length > 0) {
      log(`从 ${source} 获取壁纸: ${candidates[0].name}`)
      return candidates[0]
    }
    log(`${source} 无新壁纸或未解析到 manifest 条目`)
  }

  throw new Error('所有壁纸源均无新内容可下载')
}
