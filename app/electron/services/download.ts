import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import type { AppConfig, DownloadResult } from '../../src/types'
import { getNodeSpawnEnv, resolveNodeExecutable } from './nodeRuntime'
import { registerProcess } from './processRegistry'
import { isDetailUrlPosted } from './state'
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

export function resolveScriptsBase(config: AppConfig): string {
  if (config.download.scriptsDir && config.download.scriptsDir !== 'auto') {
    return config.download.scriptsDir
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'wallpaper-download')
  }
  return path.join(app.getAppPath(), 'scripts', 'wallpaper-download')
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
