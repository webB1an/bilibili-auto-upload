import { useEffect, useState } from 'react'
import { LogPanel } from '@/components/LogPanel'
import { StepProgress } from '@/components/StepProgress'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/StatusBadge'
import { useBootstrap, usePipeline } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import { getWallpaperStudio } from '@/lib/bridge'
import type { AppConfig, QueueRuntimeState } from '@/types'

export function Queue(): React.JSX.Element {
  useBootstrap()
  const { config, setConfig, progress, logs, running } = useAppStore()
  const { cancel } = usePipeline()
  const [draft, setDraft] = useState<AppConfig['queue'] | null>(null)
  const [status, setStatus] = useState<QueueRuntimeState | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (config?.queue) {
      setDraft(config.queue)
    }
  }, [config?.queue])

  useEffect(() => {
    void getWallpaperStudio()
      .queueStatus()
      .then(setStatus)
      .catch(() => undefined)

    const bridge = getWallpaperStudio()
    if (!bridge.onQueueStatus) return undefined

    return bridge.onQueueStatus((next) => setStatus(next))
  }, [])

  if (!draft) {
    return <div className="p-8 text-white/50">加载中...</div>
  }

  const saveAndApply = async (next: AppConfig['queue']): Promise<void> => {
    const saved = await getWallpaperStudio().queueUpdateSettings(next)
    setConfig(saved)
    setDraft(saved.queue)
    setMessage('队列设置已保存')
    const latest = await getWallpaperStudio().queueStatus()
    setStatus(latest)
  }

  const stopQueue = async (): Promise<void> => {
    const result = await getWallpaperStudio().queueStop()
    setDraft((current) => (current ? { ...current, enabled: false } : current))
    const saved = await getWallpaperStudio().configGet()
    setConfig(saved)
    setMessage(result.message)
    const latest = await getWallpaperStudio().queueStatus()
    setStatus(latest)
  }

  const startQueue = async (): Promise<void> => {
    const next = { ...draft, enabled: true }
    await saveAndApply(next)
    const result = await getWallpaperStudio().queueStart()
    setMessage(result.message)
    const latest = await getWallpaperStudio().queueStatus()
    setStatus(latest)
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/45">Queue</p>
          <h2 className="font-display text-3xl font-bold text-white">发布队列</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/45">
            按间隔自动执行一键发布。重复资源会自动跳过并尝试下一条；达到今日上限后暂停。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" disabled={!running} onClick={() => void cancel()}>
            取消当前任务
          </Button>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0 space-y-5">
          <Card title="队列设置">
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                />
                启用自动发布队列（保存后生效；暂停会关闭此项）
              </label>
              <Input
                label="发布间隔（分钟）"
                type="number"
                value={draft.intervalMinutes}
                onChange={(e) =>
                  setDraft({ ...draft, intervalMinutes: Math.max(1, Number(e.target.value) || 30) })
                }
              />
              <Input
                label="每日上限（条）"
                type="number"
                value={draft.dailyLimit}
                onChange={(e) =>
                  setDraft({ ...draft, dailyLimit: Math.max(1, Number(e.target.value) || 10) })
                }
              />
              <label className="flex items-center gap-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={draft.stopOnError}
                  onChange={(e) => setDraft({ ...draft, stopOnError: e.target.checked })}
                />
                失败时暂停队列（重复跳过不算失败）
              </label>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void saveAndApply(draft)}>保存设置</Button>
                <Button variant="secondary" onClick={() => void startQueue()}>
                  启动队列
                </Button>
                <Button variant="secondary" onClick={() => void stopQueue()}>
                  暂停队列
                </Button>
              </div>
              {message && <p className="text-sm text-accent">{message}</p>}
            </div>
          </Card>

          <Card title="运行状态">
            <div className="grid gap-3">
              <StatusBadge
                ok={!!status?.running}
                label={status?.running ? '队列运行中' : '队列已停止'}
                detail={status?.lastMessage}
              />
              <StatusBadge ok label="今日已发布" detail={String(status?.publishedToday ?? 0)} />
              <StatusBadge
                ok={(status?.failedToday ?? 0) === 0}
                label="今日失败"
                detail={String(status?.failedToday ?? 0)}
              />
              {status?.lastRunAt && (
                <p className="text-xs text-white/40">上次运行：{new Date(status.lastRunAt).toLocaleString()}</p>
              )}
              {status?.nextRunAt && status.running && (
                <p className="text-xs text-white/40">下次运行：{new Date(status.nextRunAt).toLocaleString()}</p>
              )}
            </div>
          </Card>

          <Card title="实时日志">
            <LogPanel lines={logs} />
          </Card>
        </div>

        <Card className="min-w-0" title="当前任务进度" subtitle="队列触发时与「一键发布」共用流水线">
          <StepProgress current={running ? progress : null} />
        </Card>
      </div>
    </div>
  )
}
