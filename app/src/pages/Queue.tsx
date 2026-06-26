import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/StatusBadge'
import { useBootstrap } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import { getWallpaperStudio } from '@/lib/bridge'
import type { AppConfig, QueueRuntimeState } from '@/types'

export function Queue(): React.JSX.Element {
  useBootstrap()
  const { config, setConfig } = useAppStore()
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

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8">
        <p className="text-sm text-white/45">Queue</p>
        <h2 className="font-display text-3xl font-bold text-white">发布队列</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/45">
          按间隔自动执行一键发布，适合批量运营。达到今日上限或发布失败（可配置）后自动暂停。
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="队列设置">
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              启用自动发布队列
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
              失败时暂停队列
            </label>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void saveAndApply(draft)}>保存并应用</Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void getWallpaperStudio()
                    .queueStart()
                    .then((result) => setMessage(result.message))
                }
              >
                立即启动
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void getWallpaperStudio()
                    .queueStop()
                    .then((result) => setMessage(result.message))
                }
              >
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
            <StatusBadge
              ok
              label="今日已发布"
              detail={String(status?.publishedToday ?? 0)}
            />
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
      </div>
    </div>
  )
}
