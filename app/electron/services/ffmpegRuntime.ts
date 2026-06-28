import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export const FFMPEG_DOWNLOAD_URL = 'https://ffmpeg.org/download.html'

export interface FfmpegProbeResult {
  ok: boolean
  version?: string
  message: string
}

const execFileOptions = {
  windowsHide: true,
  shell: false as const
}

function resolveToolCommand(toolName: 'ffmpeg' | 'ffprobe'): string {
  const executable = process.platform === 'win32' ? `${toolName}.exe` : toolName
  if (process.platform !== 'win32') {
    return executable
  }

  const managedPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'wallpaper-studio', 'tools', 'ffmpeg', 'bin', executable)
    : ''
  if (managedPath && fs.existsSync(managedPath)) {
    return managedPath
  }

  return executable
}

export function resolveFfmpegCommand(): string {
  return resolveToolCommand('ffmpeg')
}

export function resolveFfprobeCommand(): string {
  return resolveToolCommand('ffprobe')
}

export async function detectFfmpeg(): Promise<FfmpegProbeResult> {
  const ffmpeg = resolveFfmpegCommand()
  const ffprobe = resolveFfprobeCommand()

  try {
    const { stdout } = await execFileAsync(ffmpeg, ['-version'], {
      ...execFileOptions,
      timeout: 8000
    })
    const firstLine = stdout.split('\n').find(Boolean) ?? stdout.trim()

    try {
      await execFileAsync(ffprobe, ['-version'], {
        ...execFileOptions,
        timeout: 8000
      })
    } catch {
      return {
        ok: false,
        message: '已找到 ffmpeg 但未找到 ffprobe，请安装完整 ffmpeg 并加入 PATH'
      }
    }

    return { ok: true, version: firstLine, message: firstLine }
  } catch (error) {
    const message = (error as Error).message || '未找到 ffmpeg'
    return {
      ok: false,
      message: `未检测到 ffmpeg。请安装后加入 PATH：https://ffmpeg.org/download.html（${message}）`
    }
  }
}

export async function detectFfmpegForSetup(): Promise<{
  ok: boolean
  message: string
  downloadUrl?: string
}> {
  const result = await detectFfmpeg()
  return {
    ok: result.ok,
    message: result.ok
      ? result.message
      : `${result.message}（未安装时 B 站仍会用原视频投稿，但无法自动配乐）`,
    downloadUrl: result.ok ? undefined : FFMPEG_DOWNLOAD_URL
  }
}

export async function probeMediaDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    resolveFfprobeCommand(),
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath
    ],
    {
      ...execFileOptions,
      timeout: 30_000
    }
  )
  const duration = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`无法读取媒体时长: ${filePath}`)
  }
  return duration
}

export async function probeMediaHasAudio(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      resolveFfprobeCommand(),
      [
        '-v',
        'error',
        '-select_streams',
        'a',
        '-show_entries',
        'stream=index',
        '-of',
        'csv=p=0',
        filePath
      ],
      {
        ...execFileOptions,
        timeout: 15_000
      }
    )
    return stdout.trim().length > 0
  } catch {
    return false
  }
}
