import { app } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { detectFfmpeg, probeMediaDuration } from './ffmpegRuntime'
import { pickBgmTrack } from './bgmLibrary'
import { registerProcess } from './processRegistry'

export interface BgmMixResult {
  ok: boolean
  outputPath?: string
  trackPath?: string
  message: string
  usedOriginal: boolean
}

function clampFadeSeconds(fadeSeconds: number, videoDuration: number): number {
  const fade = Math.max(0.1, fadeSeconds)
  const maxFade = Math.max(0.1, videoDuration / 2 - 0.05)
  return Math.min(fade, maxFade)
}

function buildOutputPath(videoPath: string): string {
  const dir = path.join(app.getPath('userData'), 'temp', 'bgm')
  fs.mkdirSync(dir, { recursive: true })
  const base = path.basename(videoPath, path.extname(videoPath))
  return path.join(dir, `${base}-bilibili-${Date.now()}.mp4`)
}

function runFfmpeg(args: string[], log: (line: string) => void): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const child = spawn('ffmpeg', args, {
      windowsHide: true,
      shell: false
    })
    registerProcess(child)

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      text
        .split('\n')
        .filter(Boolean)
        .slice(-3)
        .forEach((line: string) => log(`[ffmpeg] ${line}`))
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, message: 'BGM 合成完成' })
        return
      }
      resolve({ ok: false, message: stderr.trim() || `ffmpeg 退出码 ${code ?? 'unknown'}` })
    })

    child.on('error', (error) => {
      resolve({ ok: false, message: error.message })
    })
  })
}

export async function prepareBilibiliVideoWithBgm(
  config: AppConfig,
  videoPath: string,
  log: (line: string) => void
): Promise<BgmMixResult> {
  const ffmpeg = await detectFfmpeg()
  if (!ffmpeg.ok) {
    return { ok: false, message: ffmpeg.message, usedOriginal: true }
  }

  const picked = pickBgmTrack(config)
  if (!picked.ok) {
    return { ok: false, message: picked.message, usedOriginal: true }
  }

  const trackPath = picked.trackPath
  const trackName = path.basename(trackPath)
  log(`BGM: 选用 ${trackName}`)

  let videoDuration: number
  try {
    videoDuration = await probeMediaDuration(videoPath)
  } catch (error) {
    return {
      ok: false,
      message: (error as Error).message || '无法读取视频时长',
      usedOriginal: true
    }
  }

  const fade = clampFadeSeconds(config.bgm.fadeSeconds, videoDuration)
  const fadeOutStart = Math.max(0, videoDuration - fade)
  const outputPath = buildOutputPath(videoPath)

  const filter = `[1:a]atrim=0:${videoDuration},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fade},afade=t=out:st=${fadeOutStart}:d=${fade}[aout]`
  const args = [
    '-y',
    '-i',
    videoPath,
    '-stream_loop',
    '-1',
    '-i',
    trackPath,
    '-filter_complex',
    filter,
    '-map',
    '0:v:0',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    '-t',
    String(videoDuration),
    outputPath
  ]

  log(`BGM: 合成中（视频 ${videoDuration.toFixed(1)}s，淡入淡出 ${fade.toFixed(1)}s）...`)
  const result = await runFfmpeg(args, log)
  if (!result.ok || !fs.existsSync(outputPath)) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath)
    }
    return { ok: false, message: result.message, usedOriginal: true, trackPath }
  }

  return {
    ok: true,
    outputPath,
    trackPath,
    message: `已配乐: ${trackName}`,
    usedOriginal: false
  }
}

export function cleanupBgmTempFile(filePath?: string): void {
  if (!filePath) return
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // ignore cleanup errors
  }
}
