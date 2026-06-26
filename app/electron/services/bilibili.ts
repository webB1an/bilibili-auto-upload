import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { registerProcess } from './processRegistry'

function resolvePython(): string {
  return process.platform === 'win32' ? 'python' : 'python3'
}

function resolveBiliCli(config: AppConfig): string {
  const root = config.bilibili.socialAutoUploadPath
  const cliPath = path.join(root, 'bili_cli.py')
  if (!fs.existsSync(cliPath)) {
    throw new Error(`未找到 bili_cli.py: ${cliPath}`)
  }
  return cliPath
}

export function ensureSauEnvironment(config: AppConfig): { ok: boolean; message: string; createdConf?: boolean } {
  const root = config.bilibili.socialAutoUploadPath
  if (!fs.existsSync(root)) {
    return { ok: false, message: `B 站 CLI 目录不存在: ${root}` }
  }

  try {
    resolveBiliCli(config)
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  }

  const confPath = path.join(root, 'conf.py')
  const examplePath = path.join(root, 'conf.example.py')

  if (!fs.existsSync(confPath)) {
    if (!fs.existsSync(examplePath)) {
      return { ok: false, message: `缺少 conf.py，且未找到 conf.example.py: ${examplePath}` }
    }
    fs.copyFileSync(examplePath, confPath)
    return {
      ok: true,
      createdConf: true,
      message: '已从 conf.example.py 自动生成 conf.py'
    }
  }

  return { ok: true, message: 'Bilibili CLI 配置就绪（仅需 Python + requests）' }
}

function runSau(
  config: AppConfig,
  args: string[],
  timeoutMs: number,
  log: (line: string) => void
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    resolveBiliCli(config)
    const child = spawn(resolvePython(), ['bili_cli.py', ...args], {
      cwd: config.bilibili.socialAutoUploadPath,
      windowsHide: true,
      shell: false
    })
    registerProcess(child)

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, stdout, stderr: 'Bilibili 命令超时', code: 124 })
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      text.split('\n').filter(Boolean).forEach((line: string) => log(`[bilibili] ${line}`))
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      text.split('\n').filter(Boolean).forEach((line: string) => log(`[bilibili] ${line}`))
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

export async function bilibiliCheck(config: AppConfig): Promise<{ valid: boolean; message: string }> {
  const setup = ensureSauEnvironment(config)
  if (!setup.ok) {
    return { valid: false, message: setup.message }
  }

  const result = await runSau(
    config,
    ['check', '--account', config.bilibili.accountName],
    120_000,
    () => undefined
  )
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase()
  const valid = result.ok && output.includes('valid')
  return {
    valid,
    message: result.stdout || result.stderr || (valid ? '账号有效' : '账号无效或未登录')
  }
}

export async function bilibiliUploadVideo(
  config: AppConfig,
  payload: { filePath: string; title: string; desc: string },
  log: (line: string) => void
): Promise<void> {
  const setup = ensureSauEnvironment(config)
  if (!setup.ok) {
    throw new Error(setup.message)
  }

  const stat = fs.statSync(payload.filePath)
  const timeoutMs = Math.max(3600_000, Math.ceil(stat.size / 50_000) * 1500)
  const args = [
    'upload-video',
    '--account',
    config.bilibili.accountName,
    '--file',
    payload.filePath,
    '--title',
    payload.title,
    '--desc',
    payload.desc,
    '--tid',
    String(config.bilibili.tid),
    '--tags',
    config.bilibili.tags.join(',')
  ]

  log(`开始 B 站投稿: ${payload.title}`)
  const result = await runSau(config, args, timeoutMs, log)
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || 'Bilibili 投稿失败')
  }
}

export function getLoginHint(config: AppConfig): string {
  const cwd = config.bilibili.socialAutoUploadPath
  return `请在终端中执行:\ncd "${cwd}"\npython bili_cli.py login --account ${config.bilibili.accountName}\n若二维码不完整，请打开目录下的 qrcode.png 扫码。`
}

export function getQrcodePath(config: AppConfig): string {
  return path.join(config.bilibili.socialAutoUploadPath, 'qrcode.png')
}

export function openBilibiliLoginTerminal(config: AppConfig): { ok: boolean; message: string } {
  const setup = ensureSauEnvironment(config)
  if (!setup.ok) {
    return { ok: false, message: setup.message }
  }

  const cwd = config.bilibili.socialAutoUploadPath
  const account = config.bilibili.accountName
  const python = resolvePython()
  const loginCommand = `${python} bili_cli.py login --account ${account}`

  try {
    if (process.platform === 'win32') {
      openWindowsLoginTerminal(cwd, loginCommand)
    } else if (process.platform === 'darwin') {
      const escaped = cwd.replace(/'/g, "'\\''")
      spawn(
        'osascript',
        [
          '-e',
          `tell application "Terminal" to do script "cd '${escaped}' && ${loginCommand}"`
        ],
        { detached: true, stdio: 'ignore' }
      ).unref()
    } else {
      spawn(
        'x-terminal-emulator',
        ['-e', `bash -lc 'cd "${cwd}" && ${loginCommand}; exec bash'`],
        { detached: true, stdio: 'ignore' }
      ).unref()
    }
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  }

  return {
    ok: true,
    message: setup.createdConf
      ? '已自动生成 conf.py，并打开终端窗口。请扫码完成 B 站登录；若二维码不完整，可点击「打开二维码图片」。'
      : '已打开终端窗口，请扫码完成 B 站登录。若终端二维码显示不完整，可点击「打开二维码图片」。登录后回到本页点击「检测登录状态」。'
  }
}

function openWindowsLoginTerminal(cwd: string, loginCommand: string): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-studio-login-'))
  const batPath = path.join(tempDir, 'bilibili-login.bat')
  const batContent = [
    '@echo off',
    'title Bilibili Login - Wallpaper Studio',
    `cd /d "${cwd.replace(/"/g, '""')}"`,
    'echo Running Bilibili login...',
    loginCommand,
    'echo.',
    'echo Login finished or closed. You can close this window.',
    'pause'
  ].join('\r\n')

  fs.writeFileSync(batPath, batContent, 'utf-8')

  const child = spawn('cmd.exe', ['/c', 'start', '""', batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false
  })

  child.unref()
}
