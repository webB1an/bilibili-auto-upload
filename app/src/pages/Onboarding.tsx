import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BilibiliLoginPanel } from '@/components/BilibiliLoginPanel'
import { OnboardingStepper, deriveOnboardingStep } from '@/components/OnboardingStepper'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { usePreflight } from '@/hooks/usePreflight'
import { useBootstrap } from '@/hooks/usePipeline'
import { useConfigRefresh } from '@/hooks/useConfigRefresh'
import { useAppStore } from '@/store/appStore'
import { getWallpaperStudio } from '@/lib/bridge'

export function Onboarding(): React.JSX.Element {
  useBootstrap()
  const navigate = useNavigate()
  const { config, setConfig } = useAppStore()
  const refreshConfig = useConfigRefresh()
  const { result, loading, refresh, ready } = usePreflight(true, 'quick')
  const [token, setToken] = useState(config?.panControl.apiToken ?? '')
  const [categoryId, setCategoryId] = useState(String(config?.panControl.categoryId ?? 61))
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [manualStep, setManualStep] = useState<number | null>(null)

  const autoStep = useMemo(() => deriveOnboardingStep(result), [result])
  const currentStep = manualStep ?? autoStep

  useEffect(() => {
    if (config?.panControl.apiToken) {
      setToken(config.panControl.apiToken)
    }
  }, [config?.panControl.apiToken])

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
      await refreshConfig()
      await refresh()
      setManualStep(null)
    } catch (error) {
      setMessageError(true)
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const finish = async (): Promise<void> => {
    const latest = await getWallpaperStudio().preflightRun('quick')
    if (!latest.ready) {
      setMessageError(true)
      setMessage('仍有未完成的步骤，请按上方步骤逐项处理')
      return
    }
    await getWallpaperStudio().onboardingComplete()
    const updated = await getWallpaperStudio().configGet()
    setConfig(updated)
    navigate('/publish')
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-2">
        <p className="text-sm text-white/45">Setup</p>
        <h2 className="font-display text-3xl font-bold text-white">首次设置</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          按步骤完成安装与授权，全部就绪后即可一键发布。
        </p>
      </header>

      <OnboardingStepper currentStep={currentStep} onStepClick={setManualStep} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {currentStep === 1 && (
            <Card title="Step 1 · 安装工具" subtitle="应用会自动安装到本地工具目录">
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => void runAction(() => getWallpaperStudio().accountsBaiduInstall())}>
                  安装 bdpan
                </Button>
                <Button disabled={busy} onClick={() => void runAction(() => getWallpaperStudio().accountsBilibiliInstall())}>
                  安装 B 站 CLI
                </Button>
                <Button disabled={busy} onClick={() => void runAction(() => getWallpaperStudio().pythonDetect())}>
                  检测 Python
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void getWallpaperStudio().openExternal('https://www.python.org/downloads/')
                  }
                >
                  下载 Python
                </Button>
              </div>
            </Card>
          )}

          {currentStep === 2 && (
            <Card title="Step 2 · 登录账号" subtitle="百度网盘与 B 站">
              <div className="space-y-4">
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
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void runAction(() => getWallpaperStudio().accountsBaiduWhoami())}
                  >
                    检测百度状态
                  </Button>
                </div>
                <BilibiliLoginPanel
                  onStatus={(text, error) => {
                    setMessage(text)
                    setMessageError(error)
                  }}
                  onSuccess={() => {
                    void refresh()
                  }}
                />
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() => getWallpaperStudio().accountsBilibiliOpenLoginTerminal())
                  }
                >
                  改用终端登录 B 站
                </Button>
              </div>
            </Card>
          )}

          {currentStep === 3 && (
            <Card title="Step 3 · wdbzk 配置" subtitle="panapi.wdbzk.com">
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
                <p className="text-xs text-white/40">
                  壁纸展示站 wallpaper.wdbzk.com 会自动同步该分类资源。
                </p>
              </div>
            </Card>
          )}

          {currentStep === 4 && (
            <Card title="Step 4 · 完成" subtitle="确认全部就绪">
              <p className="text-sm text-white/60">
                若右侧检查项全部通过，即可进入一键发布页开始第一条流水线。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={!ready || busy} onClick={() => void finish()}>
                  完成设置，去发布
                </Button>
                <Button variant="secondary" disabled={loading} onClick={() => void refresh()}>
                  刷新状态
                </Button>
              </div>
            </Card>
          )}

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

          <div className="flex gap-3">
            <Button
              variant="secondary"
              disabled={currentStep <= 1}
              onClick={() => setManualStep(Math.max(1, currentStep - 1))}
            >
              上一步
            </Button>
            <Button
              variant="secondary"
              disabled={currentStep >= 4}
              onClick={() => setManualStep(Math.min(4, currentStep + 1))}
            >
              下一步
            </Button>
          </div>
        </div>

        <Card title="就绪检查" subtitle={loading ? '检测中...' : ready ? '可以发布' : '尚未就绪'}>
          <div className="space-y-3">
            {result?.steps.map((step) => (
              <StatusBadge key={step.id} ok={step.ok} label={step.label} detail={step.message} />
            ))}
          </div>
        </Card>
      </div>

      <p className="mt-6 text-xs text-white/35">
        运营说明见项目文档{' '}
        <button
          type="button"
          className="text-accent/80 underline"
          onClick={() =>
            void getWallpaperStudio().openExternal(
              'https://github.com/webB1an/bilibili-auto-upload/blob/main/docs/wdbzk-operator-guide.md'
            )
          }
        >
          wdbzk 运营指南
        </button>
      </p>
    </div>
  )
}
