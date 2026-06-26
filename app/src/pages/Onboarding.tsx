import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { usePreflight } from '@/hooks/usePreflight'
import { useBootstrap } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import { getWallpaperStudio } from '@/lib/bridge'

export function Onboarding(): React.JSX.Element {
  useBootstrap()
  const navigate = useNavigate()
  const { config, setConfig } = useAppStore()
  const { result, loading, refresh, ready } = usePreflight()
  const [token, setToken] = useState(config?.panControl.apiToken ?? '')
  const [categoryId, setCategoryId] = useState(String(config?.panControl.categoryId ?? 61))
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [busy, setBusy] = useState(false)

  const saveWdbzk = async (): Promise<void> => {
    if (!config) return
    const next = {
      ...config,
      panControl: {
        ...config.panControl,
        baseUrl: 'https://panapi.wdbzk.com',
        apiToken: token.trim(),
        categoryId: Number(categoryId) || 61
      }
    }
    const saved = await getWallpaperStudio().configSet(next)
    setConfig(saved)
  }

  const runAction = async (fn: () => Promise<{ ok?: boolean; message?: string; valid?: boolean }>) => {
    setBusy(true)
    setMessageError(false)
    try {
      const res = await fn()
      const ok = res.ok ?? res.valid ?? false
      setMessage(res.message ?? (ok ? '完成' : '失败'))
      setMessageError(!ok)
      await refresh()
    } catch (error) {
      setMessageError(true)
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const finish = async (): Promise<void> => {
    const latest = await refresh()
    if (!latest?.ready) {
      setMessageError(true)
      setMessage('仍有未完成的步骤，请按下方清单逐项处理')
      return
    }
    await getWallpaperStudio().onboardingComplete()
    const updated = await getWallpaperStudio().configGet()
    setConfig(updated)
    navigate('/publish')
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8">
        <p className="text-sm text-white/45">Setup</p>
        <h2 className="font-display text-3xl font-bold text-white">首次设置</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          按顺序完成：安装工具 → 登录百度与 B 站 → 填写 wdbzk Token。全部就绪后即可一键发布。
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card title="1. 安装工具" subtitle="应用会自动下载并安装到本地工具目录">
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={busy}
                onClick={() =>
                  void runAction(() => getWallpaperStudio().accountsBaiduInstall())
                }
              >
                安装 bdpan
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  void runAction(() => getWallpaperStudio().accountsBilibiliInstall())
                }
              >
                安装 B 站 CLI
              </Button>
              <Button variant="secondary" disabled={loading} onClick={() => void refresh()}>
                重新检测
              </Button>
            </div>
          </Card>

          <Card title="2. 账号登录" subtitle="在新开的终端窗口中扫码完成授权">
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={busy}
                onClick={() =>
                  void runAction(() => getWallpaperStudio().accountsBaiduOpenLoginTerminal())
                }
              >
                百度网盘登录
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  void runAction(() => getWallpaperStudio().accountsBilibiliOpenLoginTerminal())
                }
              >
                B 站登录
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    const bilibili = await getWallpaperStudio().accountsBilibiliCheck()
                    return { ok: bilibili.valid, message: bilibili.message }
                  })
                }
              >
                检测 B 站状态
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void runAction(() => getWallpaperStudio().accountsBaiduWhoami())
                }
              >
                检测百度状态
              </Button>
            </div>
          </Card>

          <Card title="3. wdbzk 配置" subtitle="panapi.wdbzk.com">
            <div className="space-y-4">
              <Input
                label="API Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="向 wdbzk 运营获取 Token"
              />
              <Input
                label="分类 ID"
                type="number"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      await saveWdbzk()
                      return await getWallpaperStudio().panControlTest()
                    })
                  }
                >
                  保存并测试连接
                </Button>
              </div>
              <p className="text-xs text-white/40">
                接口地址固定为 https://panapi.wdbzk.com，壁纸展示站 wallpaper.wdbzk.com 会自动同步该分类资源。
              </p>
            </div>
          </Card>

          {message && (
            <p
              className={`rounded-xl border px-4 py-3 text-sm ${
                messageError
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-accent/20 bg-accent/5 text-white/75'
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <Card title="就绪检查" subtitle={loading ? '检测中...' : ready ? '可以发布' : '尚未就绪'}>
          <div className="space-y-3">
            {result?.steps.map((step) => (
              <StatusBadge key={step.id} ok={step.ok} label={step.label} detail={step.message} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={!ready || busy} onClick={() => void finish()}>
              完成设置，去发布
            </Button>
            <Button variant="secondary" disabled={loading} onClick={() => void refresh()}>
              刷新状态
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
