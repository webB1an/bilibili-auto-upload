import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import type { AppConfig, ShareResult } from '../../src/types'
import { ensureBdpanInstalled, isBdpanLoggedIn, resolveBdpanPath } from './bdpanRuntime'

function runBdpan(
  config: AppConfig,
  args: string[],
  timeoutMs: number,
  log: (line: string) => void
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(resolveBdpanPath(config), args, {
      windowsHide: true,
      shell: false
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, stdout, stderr: 'bdpan 命令超时', code: 124 })
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      text.split('\n').filter(Boolean).forEach((line: string) => log(`[bdpan] ${line}`))
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      text.split('\n').filter(Boolean).forEach((line: string) => log(`[bdpan] ${line}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 1 })
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, stdout, stderr: error.message, code: 1 })
    })
  })
}

function sanitizeRemoteName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim()
}

export async function baiduWhoami(config: AppConfig): Promise<{ ok: boolean; message: string }> {
  const setup = await ensureBdpanInstalled()
  if (!setup.ok) {
    return { ok: false, message: setup.message }
  }

  const result = await runBdpan(config, ['whoami'], 15000, () => undefined)
  const output = `${result.stdout}\n${result.stderr}`.trim()
  if (isBdpanLoggedIn(output)) {
    return { ok: true, message: output.split('\n').find((line) => line.includes('已登录')) || '已登录' }
  }
  return { ok: false, message: output || 'bdpan 未登录，请先完成授权' }
}

export async function baiduUpload(
  config: AppConfig,
  localPath: string,
  remoteFileName: string,
  log: (line: string) => void
): Promise<string> {
  const setup = await ensureBdpanInstalled()
  if (!setup.ok) {
    throw new Error(setup.message)
  }

  const stat = fs.statSync(localPath)
  const timeoutMs = Math.max(3600_000, Math.ceil(stat.size / 40_000) * 1500)
  const remotePath = `${config.baidu.remoteBase}/${sanitizeRemoteName(remoteFileName)}`
  log(`上传到百度网盘: ${remotePath} (${Math.round(stat.size / 1024 / 1024)}MB)`)

  const result = await runBdpan(config, ['upload', localPath, remotePath], timeoutMs, log)
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || 'bdpan upload 失败')
  }
  return remotePath
}

export async function baiduShare(
  config: AppConfig,
  remotePath: string,
  log: (line: string) => void
): Promise<ShareResult> {
  const setup = await ensureBdpanInstalled()
  if (!setup.ok) {
    throw new Error(setup.message)
  }

  const result = await runBdpan(
    config,
    ['share', remotePath, '--period', String(config.baidu.sharePeriodDays), '--json'],
    120_000,
    log
  )
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || 'bdpan share 失败')
  }

  try {
    const parsed = JSON.parse(result.stdout) as {
      link?: string
      url?: string
      pwd?: string
      password?: string
    }
    const link = parsed.link || parsed.url || ''
    const pwd = parsed.pwd || parsed.password || ''
    if (!link) {
      throw new Error('share JSON 缺少 link 字段')
    }
    const fullLink = pwd ? `${link}${link.includes('?') ? '&' : '?'}pwd=${pwd}` : link
    return { link, pwd, fullLink }
  } catch (error) {
    const linkMatch = result.stdout.match(/https:\/\/pan\.baidu\.com\/[^\s"']+/i)
    if (linkMatch) {
      return { link: linkMatch[0], pwd: '', fullLink: linkMatch[0] }
    }
    throw new Error(`无法解析分享结果: ${(error as Error).message}`)
  }
}

export function getRemoteFileName(localPath: string): string {
  return path.basename(localPath)
}

export function parseStoredShareLink(fullLink: string): ShareResult {
  try {
    const url = new URL(fullLink)
    const pwd = url.searchParams.get('pwd') || ''
    url.searchParams.delete('pwd')
    const link = url.toString()
    return { link, pwd, fullLink }
  } catch {
    return { link: fullLink, pwd: '', fullLink }
  }
}
