import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { buildLibraryFingerprint, pickSequentialTrackIndex } from './bgmState'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.wma'])

export function listBgmTracks(libraryPath: string): string[] {
  const trimmed = libraryPath.trim()
  if (!trimmed || !fs.existsSync(trimmed)) return []

  const stat = fs.statSync(trimmed)
  if (!stat.isDirectory()) return []

  return fs
    .readdirSync(trimmed)
    .map((name) => path.join(trimmed, name))
    .filter((filePath) => {
      try {
        return fs.statSync(filePath).isFile() && AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase())
      } catch {
        return false
      }
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export function pickBgmTrack(config: AppConfig): { ok: true; trackPath: string } | { ok: false; message: string } {
  const tracks = listBgmTracks(config.bgm.libraryPath)
  if (tracks.length === 0) {
    const libraryPath = config.bgm.libraryPath.trim()
    if (!libraryPath) {
      return { ok: false, message: '未配置 BGM 曲库路径' }
    }
    if (!fs.existsSync(libraryPath)) {
      return { ok: false, message: `BGM 曲库目录不存在: ${libraryPath}` }
    }
    return { ok: false, message: 'BGM 曲库为空（未找到支持的音频文件）' }
  }

  const fingerprint = buildLibraryFingerprint(tracks)
  let index: number
  if (config.bgm.selectionMode === 'sequential') {
    index = pickSequentialTrackIndex(tracks.length, fingerprint)
  } else {
    index = Math.floor(Math.random() * tracks.length)
  }

  return { ok: true, trackPath: tracks[index]! }
}

export function describeBgmLibrary(config: AppConfig): { ok: boolean; count: number; message: string } {
  const tracks = listBgmTracks(config.bgm.libraryPath)
  if (!config.bgm.libraryPath.trim()) {
    return { ok: false, count: 0, message: '未配置曲库路径（B 站将使用原视频）' }
  }
  if (tracks.length === 0) {
    return { ok: false, count: 0, message: '曲库为空或目录无效（B 站将使用原视频）' }
  }
  return { ok: true, count: tracks.length, message: `曲库就绪，共 ${tracks.length} 首` }
}
