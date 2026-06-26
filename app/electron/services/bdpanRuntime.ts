import { app } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { loadConfig, saveConfig } from './config'

const BDPAN_INSTALLER_VERSION = '3.7.3'
const CDN_BASE = `https://issuecdn.baidupcs.com/issue/netdisk/ai-bdpan/installer/${BDPAN_INSTALLER_VERSION}`

export function getManagedBdpanDir(): string {
  return path.join(app.getPath('userData'), 'tools', 'bdpan')
}

export function getManagedBdpanPath(): string {
  return path.join(getManagedBdpanDir(), process.platform === 'win32' ? 'bdpan.exe' : 'bdpan')
}

export function resolveBdpanPath(config: AppConfig): string {
  const configured = config.baidu.bdpanPath?.trim()
  if (configured && configured !== 'bdpan' && fs.existsSync(configured)) {
    return configured
  }

  const managed = getManagedBdpanPath()
  if (fs.existsSync(managed)) {
    return managed
  }

  return configured || managed
}

function getPlatformInstallerName(): string {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  if (process.platform === 'win32') {
    return `bdpan-installer-windows-${arch}.exe`
  }
  if (process.platform === 'darwin') {
    return `bdpan-installer-darwin-${arch}`
  }
  if (process.platform === 'linux') {
    return `bdpan-installer-linux-${arch}`
  }
  throw new Error(`不支持自动安装 bdpan 的平台: ${process.platform}`)
}

function persistBdpanPath(bdpanPath: string): AppConfig {
  const config = loadConfig()
  if (config.baidu.bdpanPath !== bdpanPath) {
    config.baidu.bdpanPath = bdpanPath
    saveConfig(config)
  }
  return config
}

function runProcess(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, stdout, stderr: '命令超时', code: 124 })
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
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

async function bdpanOnPath(): Promise<boolean> {
  const result = await runProcess('bdpan', ['version'], 8000)
  return result.ok
}

async function downloadInstaller(url: string, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const result = await runProcess('curl', ['-fsSL', '-o', dest, url], 180_000)
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || '下载 bdpan 安装器失败')
  }
  if (!fs.existsSync(dest)) {
    throw new Error('下载 bdpan 安装器失败：文件不存在')
  }
}

async function runInstaller(installerPath: string, installDir: string): Promise<void> {
  fs.mkdirSync(installDir, { recursive: true })
  const args = ['-yes', '-dir', installDir]
  const result = await runProcess(installerPath, args, 300_000)
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || 'bdpan 安装器执行失败')
  }
}

export async function installBdpan(): Promise<{ ok: boolean; message: string; path?: string }> {
  const managedPath = getManagedBdpanPath()
  if (fs.existsSync(managedPath)) {
    persistBdpanPath(managedPath)
    return { ok: true, message: 'bdpan 已安装', path: managedPath }
  }

  if (await bdpanOnPath()) {
    persistBdpanPath('bdpan')
    return { ok: true, message: '检测到系统 PATH 中的 bdpan', path: 'bdpan' }
  }

  const installerName = getPlatformInstallerName()
  const installerUrl = `${CDN_BASE}/${installerName}`
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-studio-bdpan-'))
  const installerPath = path.join(tempDir, installerName)
  const installDir = getManagedBdpanDir()

  try {
    await downloadInstaller(installerUrl, installerPath)
    if (process.platform !== 'win32') {
      fs.chmodSync(installerPath, 0o755)
    }
    await runInstaller(installerPath, installDir)
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  if (!fs.existsSync(managedPath)) {
    return { ok: false, message: `安装完成但未找到可执行文件: ${managedPath}` }
  }

  persistBdpanPath(managedPath)
  return {
    ok: true,
    message: `bdpan 已安装到 ${managedPath}`,
    path: managedPath
  }
}

export async function ensureBdpanInstalled(): Promise<{ ok: boolean; message: string; path?: string }> {
  const config = loadConfig()
  const resolved = resolveBdpanPath(config)
  if (resolved !== 'bdpan' && fs.existsSync(resolved)) {
    persistBdpanPath(resolved)
    return { ok: true, message: 'bdpan 就绪', path: resolved }
  }

  if (resolved === 'bdpan' && (await bdpanOnPath())) {
    return { ok: true, message: 'bdpan 已在 PATH 中', path: 'bdpan' }
  }

  return installBdpan()
}

export function openBaiduLoginTerminal(config: AppConfig): { ok: boolean; message: string } {
  const bdpanPath = resolveBdpanPath(config)
  if (bdpanPath !== 'bdpan' && !fs.existsSync(bdpanPath)) {
    return { ok: false, message: `未找到 bdpan，请先点击「安装 bdpan」: ${bdpanPath}` }
  }

  const loginCommand =
    bdpanPath === 'bdpan'
      ? 'bdpan login --accept-disclaimer --qrcode'
      : `"${bdpanPath.replace(/"/g, '""')}" login --accept-disclaimer --qrcode`

  try {
    if (process.platform === 'win32') {
      openWindowsLoginTerminal(os.homedir(), loginCommand)
    } else if (process.platform === 'darwin') {
      spawn(
        'osascript',
        ['-e', `tell application "Terminal" to do script "${loginCommand.replace(/"/g, '\\"')}"`],
        { detached: true, stdio: 'ignore' }
      ).unref()
    } else {
      spawn('x-terminal-emulator', ['-e', `bash -lc '${loginCommand}; exec bash'`], {
        detached: true,
        stdio: 'ignore'
      }).unref()
    }
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  }

  return {
    ok: true,
    message: '已打开终端窗口，请按提示扫码或授权登录百度网盘。完成后回到本页点击「检测登录状态」。'
  }
}

function openWindowsLoginTerminal(cwd: string, loginCommand: string): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-studio-bdpan-login-'))
  const batPath = path.join(tempDir, 'bdpan-login.bat')
  const batContent = [
    '@echo off',
    'title Baidu Pan Login - Wallpaper Studio',
    `cd /d "${cwd.replace(/"/g, '""')}"`,
    'echo Running Baidu Pan login...',
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

export function isBdpanLoggedIn(output: string): boolean {
  return output.includes('已登录')
}
