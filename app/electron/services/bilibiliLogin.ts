import { spawn, type ChildProcess } from 'child_process'
import fs from 'fs'
import type { AppConfig } from '../../src/types'
import { bilibiliCheck, ensureSauEnvironment, getQrcodePath } from './bilibili'

let loginProcess: ChildProcess | null = null

function getPython(): string {
  return process.platform === 'win32' ? 'python' : 'python3'
}

export function stopBilibiliLoginProcess(): void {
  if (loginProcess) {
    try {
      loginProcess.kill()
    } catch {
      // ignore
    }
    loginProcess = null
  }
}

export async function startBilibiliLoginBackground(
  config: AppConfig
): Promise<{ ok: boolean; message: string }> {
  const setup = ensureSauEnvironment(config)
  if (!setup.ok) {
    return { ok: false, message: setup.message }
  }

  stopBilibiliLoginProcess()

  const qrcodePath = getQrcodePath(config)
  if (fs.existsSync(qrcodePath)) {
    try {
      fs.unlinkSync(qrcodePath)
    } catch {
      // ignore
    }
  }

  return new Promise((resolve) => {
    loginProcess = spawn(
      getPython(),
      ['bili_cli.py', 'login', '--account', config.bilibili.accountName],
      {
        cwd: config.bilibili.socialAutoUploadPath,
        windowsHide: true,
        shell: false
      }
    )

    loginProcess.on('error', (error) => {
      loginProcess = null
      resolve({ ok: false, message: error.message })
    })

    setTimeout(() => {
      resolve({
        ok: true,
        message: setup.createdConf
          ? '已启动登录，请扫描下方二维码（已自动生成 conf.py）'
          : '已启动登录，请扫描下方二维码'
      })
    }, 1500)
  })
}

export function getBilibiliQrcodeDataUrl(config: AppConfig): {
  ok: boolean
  dataUrl?: string
  message: string
} {
  const qrcodePath = getQrcodePath(config)
  if (!fs.existsSync(qrcodePath)) {
    return { ok: false, message: '等待二维码生成...' }
  }

  try {
    const stat = fs.statSync(qrcodePath)
    if (stat.size < 100) {
      return { ok: false, message: '二维码文件尚未就绪...' }
    }
    const buffer = fs.readFileSync(qrcodePath)
    return {
      ok: true,
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      message: '二维码已就绪'
    }
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  }
}

export async function pollBilibiliLogin(config: AppConfig): Promise<{
  valid: boolean
  message: string
  finished: boolean
}> {
  const check = await bilibiliCheck(config)
  if (check.valid) {
    stopBilibiliLoginProcess()
    return { valid: true, message: check.message, finished: true }
  }

  if (!loginProcess || loginProcess.exitCode !== null) {
    return {
      valid: false,
      message: check.message || '登录进程已结束，请重试或使用终端登录',
      finished: true
    }
  }

  return { valid: false, message: check.message || '等待扫码...', finished: false }
}
