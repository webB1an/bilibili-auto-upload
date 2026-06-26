import { app } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { loadConfig, saveConfig } from './config'

function resolvePython(): string {
  return process.platform === 'win32' ? 'python' : 'python3'
}

export function getManagedBilibiliCliDir(): string {
  return path.join(app.getPath('userData'), 'tools', 'bilibili-cli')
}

export function resolveBundledBilibiliCliSource(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bilibili-cli')
  }
  return path.join(app.getAppPath(), 'bundled', 'bilibili-cli')
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function persistSocialAutoUploadPath(cliDir: string): void {
  const config = loadConfig()
  if (config.bilibili.socialAutoUploadPath !== cliDir) {
    config.bilibili.socialAutoUploadPath = cliDir
    saveConfig(config)
  }
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

export async function ensurePythonRequests(): Promise<{ ok: boolean; message: string }> {
  const python = resolvePython()
  const check = await runProcess(python, ['-c', 'import requests'], 15000)
  if (check.ok) {
    return { ok: true, message: 'Python requests 已就绪' }
  }

  const install = await runProcess(python, ['-m', 'pip', 'install', 'requests'], 180_000)
  if (install.ok) {
    return { ok: true, message: '已安装 Python requests' }
  }

  return {
    ok: false,
    message: install.stderr || install.stdout || 'pip install requests 失败，请手动安装 Python 3.10+ 并执行 pip install requests'
  }
}

export async function installBilibiliCli(): Promise<{ ok: boolean; message: string; path?: string }> {
  const source = resolveBundledBilibiliCliSource()
  const dest = getManagedBilibiliCliDir()
  const cliPath = path.join(dest, 'bili_cli.py')

  if (!fs.existsSync(path.join(source, 'bili_cli.py'))) {
    return { ok: false, message: `未找到内置 B 站 CLI 资源: ${source}` }
  }

  if (fs.existsSync(cliPath)) {
    persistSocialAutoUploadPath(dest)
    return { ok: true, message: 'B 站 CLI 已安装', path: dest }
  }

  try {
    copyDirRecursive(source, dest)
    fs.mkdirSync(path.join(dest, 'cookies'), { recursive: true })
    const confPath = path.join(dest, 'conf.py')
    const examplePath = path.join(dest, 'conf.example.py')
    if (!fs.existsSync(confPath) && fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, confPath)
    }
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  }

  if (!fs.existsSync(cliPath)) {
    return { ok: false, message: `安装失败，未找到: ${cliPath}` }
  }

  persistSocialAutoUploadPath(dest)
  return { ok: true, message: `B 站 CLI 已安装到 ${dest}`, path: dest }
}

export async function ensureBilibiliCliInstalled(): Promise<{ ok: boolean; message: string; path?: string }> {
  const dest = getManagedBilibiliCliDir()
  const cliPath = path.join(dest, 'bili_cli.py')
  if (fs.existsSync(cliPath)) {
    persistSocialAutoUploadPath(dest)
    return { ok: true, message: 'B 站 CLI 就绪', path: dest }
  }

  const config = loadConfig()
  const configured = config.bilibili.socialAutoUploadPath?.trim()
  if (configured && fs.existsSync(path.join(configured, 'bili_cli.py'))) {
    return { ok: true, message: '使用已配置的 B 站 CLI 路径', path: configured }
  }

  return installBilibiliCli()
}
