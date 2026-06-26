import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import type { AppConfig, DepCheckResult } from '../../src/types'
import { getManagedBdpanPath, resolveBdpanPath } from './bdpanRuntime'
import { detectEmbeddedNode } from './nodeRuntime'

const execFileAsync = promisify(execFile)

async function runCommand(
  command: string,
  args: string[],
  timeoutMs = 8000
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: timeoutMs,
      windowsHide: true,
      shell: process.platform === 'win32'
    })
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return {
      ok: false,
      stdout: (err.stdout ?? '').toString().trim(),
      stderr: (err.stderr ?? err.message ?? '').toString().trim()
    }
  }
}

export async function checkDeps(config: AppConfig): Promise<DepCheckResult> {
  const nodeRuntime = await detectEmbeddedNode()
  const node = nodeRuntime.ok
    ? { ok: true, version: nodeRuntime.version ?? nodeRuntime.message }
    : { ok: false, message: nodeRuntime.message }
  const curl = await runCommand('curl', ['--version'])
  const python = await runCommand('python', ['--version'])
  const bdpanPath = resolveBdpanPath(config)
  const bdpanInstalled = bdpanPath === 'bdpan' || fs.existsSync(bdpanPath)
  const bdpan = bdpanInstalled
    ? await runCommand(bdpanPath, ['whoami'], 15000)
    : { ok: false, stdout: '', stderr: 'bdpan 未安装' }
  const biliCliPath = path.join(config.bilibili.socialAutoUploadPath, 'bili_cli.py')
  const confPath = path.join(config.bilibili.socialAutoUploadPath, 'conf.py')
  const biliCliExists = fs.existsSync(biliCliPath)
  const confExists = fs.existsSync(confPath)

  let sauMessage = biliCliPath
  let sauOk = biliCliExists
  if (!biliCliExists) {
    sauMessage = `未找到 bili_cli.py: ${biliCliPath}`
  } else if (!confExists) {
    sauOk = false
    sauMessage = '缺少 conf.py（点击「打开终端登录」可自动生成，或手动复制 conf.example.py）'
  }

  return {
    node: node.ok
      ? { ok: true, version: node.version }
      : { ok: false, message: node.message ?? '内置 Node 不可用' },
    curl: curl.ok
      ? { ok: true }
      : { ok: false, message: '未找到 curl，Windows 10+ 通常自带 curl.exe' },
    python: python.ok
      ? { ok: true, version: python.stdout }
      : { ok: false, message: '未找到 Python，请安装 Python 3.10+' },
    bdpan: !bdpanInstalled
      ? { ok: false, message: `未安装 bdpan，请在「账号与工具」页点击「安装 bdpan」（将安装到 ${getManagedBdpanPath()}）` }
      : bdpan.ok && `${bdpan.stdout}\n${bdpan.stderr}`.includes('已登录')
        ? { ok: true, message: bdpan.stdout.split('\n').find((line) => line.includes('已登录')) || '已登录' }
        : { ok: false, message: bdpan.stderr || bdpan.stdout || 'bdpan 未登录' },
    sau: sauOk
      ? { ok: true, message: 'B 站 CLI 就绪' }
      : { ok: false, message: sauMessage }
  }
}
