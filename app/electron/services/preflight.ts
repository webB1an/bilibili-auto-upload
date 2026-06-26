import type { AppConfig, DepCheckResult } from '../../src/types'
import { bilibiliCheck } from './bilibili'
import { baiduWhoami } from './baidu'
import { checkDeps } from './deps'
import { ensureBdpanInstalled } from './bdpanRuntime'
import { ensureBilibiliCliInstalled } from './bilibiliRuntime'
import { detectPython, ensurePythonRequests } from './pythonRuntime'
import { testPanControlConnection } from './panControl'
import { checkDiskSpace, checkDownloadSources } from './publishDryRun'
import { testWallpaperCatalogConnection } from './wallpaperCatalog'

export type PreflightStepId =
  | 'bdpan'
  | 'bilibiliCli'
  | 'python'
  | 'pythonRequests'
  | 'baidu'
  | 'bilibili'
  | 'wdbzk'
  | 'disk'
  | 'downloadSource'
  | 'catalog'

export interface PreflightStep {
  id: PreflightStepId
  label: string
  ok: boolean
  message: string
  action?: 'installBdpan' | 'installBilibiliCli' | 'baiduLogin' | 'bilibiliLogin' | 'wdbzkToken' | 'installPython'
}

export interface PreflightResult {
  ready: boolean
  steps: PreflightStep[]
  deps: DepCheckResult
  mode: 'quick' | 'full'
}

export async function runPreflight(
  config: AppConfig,
  mode: 'quick' | 'full' = 'full'
): Promise<PreflightResult> {
  const deps = await checkDeps(config)
  const steps: PreflightStep[] = []

  const bdpanInstalled = await ensureBdpanInstalled()
  steps.push({
    id: 'bdpan',
    label: 'bdpan 已安装',
    ok: bdpanInstalled.ok,
    message: bdpanInstalled.message,
    action: bdpanInstalled.ok ? undefined : 'installBdpan'
  })

  const biliCli = await ensureBilibiliCliInstalled()
  steps.push({
    id: 'bilibiliCli',
    label: 'B 站 CLI 已安装',
    ok: biliCli.ok,
    message: biliCli.message,
    action: biliCli.ok ? undefined : 'installBilibiliCli'
  })

  const python = await detectPython()
  steps.push({
    id: 'python',
    label: 'Python 3.10+',
    ok: python.ok,
    message: python.message,
    action: python.ok ? undefined : 'installPython'
  })

  const pythonReq = python.ok ? await ensurePythonRequests() : { ok: false, message: '请先安装 Python' }
  steps.push({
    id: 'pythonRequests',
    label: 'Python requests',
    ok: pythonReq.ok,
    message: pythonReq.message,
    action: python.ok && !pythonReq.ok ? 'installPython' : undefined
  })

  let baiduOk = false
  let baiduMessage = '未检测'
  if (bdpanInstalled.ok) {
    const baidu = await baiduWhoami(config)
    baiduOk = baidu.ok
    baiduMessage = baidu.message
  } else {
    baiduMessage = '请先安装 bdpan'
  }
  steps.push({
    id: 'baidu',
    label: '百度网盘已登录',
    ok: baiduOk,
    message: baiduMessage,
    action: baiduOk ? undefined : 'baiduLogin'
  })

  let bilibiliOk = false
  let bilibiliMessage = '未检测'
  if (biliCli.ok && deps.sau.ok && pythonReq.ok) {
    const bilibili = await bilibiliCheck(config)
    bilibiliOk = bilibili.valid
    bilibiliMessage = bilibili.message
  } else if (!biliCli.ok) {
    bilibiliMessage = biliCli.message
  } else if (!pythonReq.ok) {
    bilibiliMessage = '请先完成 Python 环境'
  } else {
    bilibiliMessage = deps.sau.message ?? 'B 站 CLI 未就绪'
  }
  steps.push({
    id: 'bilibili',
    label: 'B 站已登录',
    ok: bilibiliOk,
    message: bilibiliMessage,
    action: bilibiliOk ? undefined : 'bilibiliLogin'
  })

  const hasToken = Boolean(config.panControl.apiToken?.trim())
  let wdbzkOk = false
  let wdbzkMessage = hasToken ? '未检测' : '请填写 wdbzk API Token'
  if (hasToken) {
    const pan = await testPanControlConnection(config)
    wdbzkOk = pan.ok
    wdbzkMessage = pan.message
  }
  steps.push({
    id: 'wdbzk',
    label: 'wdbzk panapi 可用',
    ok: wdbzkOk,
    message: wdbzkMessage,
    action: wdbzkOk ? undefined : 'wdbzkToken'
  })

  if (mode === 'full') {
    const disk = checkDiskSpace(config)
    steps.push({
      id: 'disk',
      label: '磁盘空间',
      ok: disk.ok,
      message: disk.message
    })

    const sources = checkDownloadSources(config)
    steps.push({
      id: 'downloadSource',
      label: '壁纸下载脚本',
      ok: sources.ok,
      message: sources.message
    })

    const catalog = await testWallpaperCatalogConnection()
    steps.push({
      id: 'catalog',
      label: 'wallpaper 资源库可读',
      ok: catalog.ok,
      message: catalog.message
    })
  }

  const requiredIds: PreflightStepId[] =
    mode === 'full'
      ? [
          'bdpan',
          'bilibiliCli',
          'python',
          'pythonRequests',
          'baidu',
          'bilibili',
          'wdbzk',
          'disk',
          'downloadSource'
        ]
      : ['bdpan', 'bilibiliCli', 'python', 'pythonRequests', 'baidu', 'bilibili', 'wdbzk']

  const ready = requiredIds.every((id) => steps.find((step) => step.id === id)?.ok)
  return { ready, steps, deps, mode }
}
