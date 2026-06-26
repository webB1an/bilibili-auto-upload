import type { AppConfig } from '../../src/types'

export async function createPanControlResource(
  config: AppConfig,
  payload: { name: string; link: string; resourceDescription?: string }
): Promise<{ id?: number; duplicate?: boolean; message: string }> {
  const baseUrl = config.panControl.baseUrl.replace(/\/$/, '')
  const url = `${baseUrl}/api/resources?token=${encodeURIComponent(config.panControl.apiToken)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      link: payload.link,
      categoryId: config.panControl.categoryId,
      resourceDescription: payload.resourceDescription ?? ''
    })
  })

  const body = (await response.json()) as {
    code?: number
    message?: string
    data?: { id?: number }
  }

  if (body.code === 200) {
    return { id: body.data?.id, message: body.message || '新增成功' }
  }

  if (body.code === 400 && String(body.message || '').includes('已存在')) {
    return { duplicate: true, message: body.message || '链接已存在' }
  }

  throw new Error(body.message || `pan-control 请求失败 (${response.status})`)
}

export async function testPanControlConnection(
  config: AppConfig
): Promise<{ ok: boolean; message: string }> {
  const baseUrl = config.panControl.baseUrl.replace(/\/$/, '')
  const token = config.panControl.apiToken?.trim()
  if (!token) {
    return { ok: false, message: '未配置 API Token' }
  }

  const url = `${baseUrl}/api/resources?token=${encodeURIComponent(token)}&page=1&pageSize=1`
  try {
    const response = await fetch(url, { method: 'GET' })
    const body = (await response.json()) as { code?: number; message?: string }
    if (body.code === 200) {
      return { ok: true, message: `连接成功 (${baseUrl})` }
    }
    return { ok: false, message: body.message || `Token 验证失败 (${response.status})` }
  } catch (error) {
    return { ok: false, message: (error as Error).message || '无法连接 panapi' }
  }
}
