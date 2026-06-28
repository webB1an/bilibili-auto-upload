import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

export const PYTHON_DOWNLOAD_URL = 'https://www.python.org/downloads/'
const MIN_PYTHON_MAJOR = 3
const MIN_PYTHON_MINOR = 10

export function resolvePythonCommand(): string {
  if (process.platform !== 'win32') {
    return 'python3'
  }

  const knownRoots = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Python') : '',
    process.env.ProgramFiles || '',
    process.env['ProgramFiles(x86)'] || ''
  ].filter(Boolean)

  const candidates = knownRoots.flatMap((root) => {
    if (!fs.existsSync(root)) return []
    try {
      return fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^Python\d+$/i.test(entry.name))
        .map((entry) => path.join(root, entry.name, 'python.exe'))
    } catch {
      return []
    }
  })

  candidates.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? 'python'
}

export function runProcess(
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

function parsePythonVersion(output: string): { major: number; minor: number } | null {
  const match = output.match(/(\d+)\.(\d+)/)
  if (!match) return null
  return { major: Number(match[1]), minor: Number(match[2]) }
}

export async function detectPython(): Promise<{
  ok: boolean
  message: string
  version?: string
  downloadUrl?: string
}> {
  const python = resolvePythonCommand()
  const result = await runProcess(python, ['--version'], 15000)
  const output = `${result.stdout}\n${result.stderr}`.trim()
  if (!result.ok && !output) {
    return {
      ok: false,
      message: '未检测到 Python，请先安装 Python 3.10 或更高版本',
      downloadUrl: PYTHON_DOWNLOAD_URL
    }
  }

  const parsed = parsePythonVersion(output)
  if (!parsed) {
    return {
      ok: false,
      message: `无法解析 Python 版本: ${output || '未知'}`,
      downloadUrl: PYTHON_DOWNLOAD_URL
    }
  }

  const supported =
    parsed.major > MIN_PYTHON_MAJOR ||
    (parsed.major === MIN_PYTHON_MAJOR && parsed.minor >= MIN_PYTHON_MINOR)
  if (!supported) {
    return {
      ok: false,
      message: `Python 版本过低 (${parsed.major}.${parsed.minor})，需要 3.10+`,
      downloadUrl: PYTHON_DOWNLOAD_URL
    }
  }

  return { ok: true, message: output, version: output }
}

export async function ensurePythonRequests(): Promise<{ ok: boolean; message: string }> {
  const detected = await detectPython()
  if (!detected.ok) {
    return { ok: false, message: detected.message }
  }

  const python = resolvePythonCommand()
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
    message:
      install.stderr ||
      install.stdout ||
      'pip install requests 失败，请在终端执行: python -m pip install requests'
  }
}
