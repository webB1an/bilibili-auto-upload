import type { AppConfig, DepCheckResult } from '../../src/types'
import { bilibiliCheck } from './bilibili'
import { baiduWhoami } from './baidu'
import { checkDeps } from './deps'
import { ensureBdpanInstalled } from './bdpanRuntime'
import { ensureBilibiliCliInstalled, ensurePythonRequests } from './bilibiliRuntime'
import { testPanControlConnection } from './panControl'

export interface PreflightStep {
  id: 'bdpan' | 'bilibiliCli' | 'python' | 'baidu' | 'bilibili' | 'wdbzk'
  label: string
  ok: boolean
  message: string
  action?: 'installBdpan' | 'installBilibiliCli' | 'baiduLogin' | 'bilibiliLogin' | 'wdbzkToken'
}

export interface PreflightResult {
  ready: boolean
  steps: PreflightStep[]
  deps: DepCheckResult
}

export async function runPreflight(config: AppConfig): Promise<PreflightResult> {
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

  const pythonReq = await ensurePythonRequests()
  steps.push({
    id: 'python',
    label: 'Python requests',
    ok: pythonReq.ok,
    message: pythonReq.message
  })

  let baiduOk = false
  let baiduMessage = '未检测'
  if (deps.bdpan.ok) {
    const baidu = await baiduWhoami(config)
    baiduOk = baidu.ok
    baiduMessage = baidu.message
  } else {
    baiduMessage = '请先安装并登录 bdpan'
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
  if (biliCli.ok && deps.sau.ok) {
    const bilibili = await bilibiliCheck(config)
    bilibiliOk = bilibili.valid
    bilibiliMessage = bilibili.message
  } else {
    bilibiliMessage = biliCli.ok ? deps.sau.message ?? 'B 站 CLI 未就绪' : biliCli.message
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

  const ready = steps.every((step) => step.ok)
  return { ready, steps, deps }
}
