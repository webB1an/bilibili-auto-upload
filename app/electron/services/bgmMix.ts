import { app } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { detectFfmpeg, probeMediaDuration, probeMediaHasAudio } from './ffmpegRuntime'
import { pickBgmTrack } from './bgmLibrary'
import { registerProcess } from './processRegistry'

export interface BgmMixResult {
  ok: boolean
  outputPath?: string
  trackPath?: string
  message: string
  usedOriginal: boolean
}

const BGM_VOLUME = 1.8

function clampFadeSeconds(fadeSeconds: number | undefined, videoDuration: number): number {
  const fade = Math.max(0.1, fadeSeconds ?? 2)
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
        .slice(-5)
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
      resolve({
        ok: false,
        message: `${error.message}（Electron 内请确认 ffmpeg 已加入 PATH，与终端检测一致）`
      })
    })
  })
}

function fail(
  log: (line: string) => void,
  message: string,
  trackPath?: string
): BgmMixResult {
  log(`BGM: 配乐失败 — ${message}`)
  return { ok: false, message, usedOriginal: true, trackPath }
}

export async function prepareBilibiliVideoWithBgm(
  config: AppConfig,
  videoPath: string,
  log: (line: string) => void
): Promise<BgmMixResult> {
  if (!fs.existsSync(videoPath)) {
    return fail(log, `视频文件不存在: ${videoPath}`)
  }

  const ffmpeg = await detectFfmpeg()
  if (!ffmpeg.ok) {
    return fail(log, ffmpeg.message)
  }

  const picked = pickBgmTrack(config)
  if (!picked.ok) {
    return fail(log, picked.message)
  }

  const trackPath = picked.trackPath
  const trackName = path.basename(trackPath)
  log(`BGM: 选用 ${trackName}`)

  let videoDuration: number
  try {
    videoDuration = await probeMediaDuration(videoPath)
    log(`BGM: 视频时长 ${videoDuration.toFixed(2)}s`)
  } catch (error) {
    return fail(log, (error as Error).message || '无法读取视频时长', trackPath)
  }

  const fade = clampFadeSeconds(config.bgm?.fadeSeconds, videoDuration)
  const fadeOutStart = Math.max(0, videoDuration - fade)
  const durationSec = videoDuration.toFixed(3)
  const fadeOutSec = fadeOutStart.toFixed(3)
  const outputPath = buildOutputPath(videoPath)

  const filter = `[1:a]aloop=loop=-1:size=2e+09,atrim=duration=${durationSec},asetpts=PTS-STARTPTS,volume=${BGM_VOLUME},afade=t=in:st=0:d=${fade},afade=t=out:st=${fadeOutSec}:d=${fade}[aout]`
  const args = [
    '-y',
    '-i',
    videoPath,
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
    '-ar',
    '44100',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    outputPath
  ]

  log(`BGM: 合成中（淡入淡出 ${fade.toFixed(1)}s）→ ${outputPath}`)
  const result = await runFfmpeg(args, log)
  if (!result.ok || !fs.existsSync(outputPath)) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath)
    }
    return fail(log, result.message, trackPath)
  }

  const hasAudio = await probeMediaHasAudio(outputPath)
  if (!hasAudio) {
    fs.unlinkSync(outputPath)
    return fail(log, '合成完成但输出文件无音轨', trackPath)
  }

  log(`BGM: 合成成功 → ${outputPath}`)
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
