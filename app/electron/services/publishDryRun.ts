import { execFileSync } from 'child_process'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { resolveScriptsBase, peekNextWallpaper } from './download'
import { findCatalogDuplicate } from './wallpaperCatalog'
import { buildTitle, translateToChinese } from './title'

const MIN_FREE_BYTES = 500 * 1024 * 1024

function getWindowsFreeBytes(targetPath: string): number | null {
  try {
    const driveLetter = path.parse(path.resolve(targetPath)).root.replace(/[:\\]/g, '')
    if (!driveLetter) return null
    const output = execFileSync(
      'powershell',
      ['-NoProfile', '-Command', `(Get-PSDrive -Name '${driveLetter}').Free`],
      { encoding: 'utf8', windowsHide: true }
    )
    const free = Number.parseInt(output.trim(), 10)
    return Number.isFinite(free) ? free : null
  } catch {
    return null
  }
}

function getFreeBytes(targetPath: string): number | null {
  try {
    fs.mkdirSync(targetPath, { recursive: true })

    if (process.platform === 'win32') {
      const windowsFree = getWindowsFreeBytes(targetPath)
      if (windowsFree != null) {
        return windowsFree
      }
    }

    if (typeof fs.statfsSync === 'function') {
      const stat = fs.statfsSync(targetPath)
      return stat.bfree * stat.bsize
    }

    fs.accessSync(targetPath, fs.constants.W_OK)
    return null
  } catch {
    return null
  }
}

export function checkDiskSpace(config: AppConfig): { ok: boolean; message: string } {
  const userData = app.getPath('userData')
  const downloadsDir = path.join(resolveScriptsBase(config), 'downloads')
  const userFree = getFreeBytes(userData)
  const downloadFree = getFreeBytes(downloadsDir)

  if (userFree == null && downloadFree == null) {
    return { ok: false, message: '无法检测磁盘空间，请确认安装目录可写' }
  }

  const freeValues = [userFree, downloadFree].filter((value): value is number => value != null)
  const free = Math.min(...freeValues)

  if (free < MIN_FREE_BYTES) {
    return {
      ok: false,
      message: `磁盘可用空间不足 (需要 ≥500MB，当前约 ${Math.round(free / 1024 / 1024)}MB)`
    }
  }

  return { ok: true, message: `磁盘空间充足 (约 ${Math.round(free / 1024 / 1024)}MB 可用)` }
}

export function checkDownloadSources(config: AppConfig): { ok: boolean; message: string } {
  const base = resolveScriptsBase(config)
  const scriptsDir = path.join(base, 'scripts')
  const sourceScripts: Record<string, string> = {
    wallpaperwaifu: 'download-wallpaperwaifu-first-page.mjs',
    moewalls: 'download-moewalls-first-page.mjs',
    desktophut: 'download-desktophut-first-page.mjs',
    motionbgs: 'download-motionbgs-first-page.mjs',
    wallsflow: 'download-wallsflow-first-page.mjs',
    wallpaperwaves: 'download-wallpaperwaves-first-page.mjs'
  }

  const available = config.download.sources.filter((source) => {
    const script = sourceScripts[source]
    return script && fs.existsSync(path.join(scriptsDir, script))
  })

  if (available.length === 0) {
    return { ok: false, message: '未找到可用的壁纸下载脚本' }
  }

  return { ok: true, message: `壁纸源就绪: ${available.join(', ')}` }
}

export async function checkNextPublishPreview(config: AppConfig): Promise<{
  ok: boolean
  nextTitle?: string
  duplicate: boolean
  message: string
}> {
  const peek = await peekNextWallpaper(config)
  if (!peek) {
    return { ok: false, duplicate: false, message: '暂无新壁纸可预览（各源 dry-run 无候选）' }
  }

  const chinese = await translateToChinese(peek.name, config.translation)
  const resourceTitle = buildTitle(peek.name, chinese)
  const duplicateResult = await findCatalogDuplicate(resourceTitle, { keyword: peek.name })

  if (duplicateResult.duplicate) {
    const block = config.pipeline.abortOnCatalogDuplicate
    return {
      ok: !block,
      nextTitle: resourceTitle,
      duplicate: true,
      message: block
        ? duplicateResult.message
        : `${duplicateResult.message}（已关闭重复中止，发布时将跳过）`
    }
  }

  return {
    ok: true,
    nextTitle: resourceTitle,
    duplicate: false,
    message: `下一条: ${resourceTitle}（${peek.source}）`
  }
}
