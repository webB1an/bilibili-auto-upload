import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBootstrap, usePipeline } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import { getWallpaperStudio } from '@/lib/bridge'
import type { HistoryRecord } from '@/types'

const statusLabel = {
  success: '成功',
  partial: '部分完成',
  failed: '失败'
} as const

function isResumable(item: HistoryRecord): boolean {
  if (item.status === 'success' || item.bilibiliStatus === 'success') return false
  return item.status === 'partial' || item.status === 'failed'
}

export function History(): React.JSX.Element {
  useBootstrap()
  const { history, setHistory } = useAppStore()
  const { run } = usePipeline()

  const rows = useMemo(() => history, [history])

  const refreshHistory = async (): Promise<void> => {
    const next = await getWallpaperStudio().historyList()
    setHistory(next)
  }

  const abandon = async (id: string, deleteLocal: boolean): Promise<void> => {
    await getWallpaperStudio().historyAbandon(id, deleteLocal)
    await refreshHistory()
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8">
        <p className="text-sm text-white/45">History</p>
        <h2 className="font-display text-3xl font-bold text-white">任务历史</h2>
      </header>

      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-white/45">暂无历史记录，完成一次发布后将显示在这里。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="px-3 py-2 font-medium">时间</th>
                  <th className="px-3 py-2 font-medium">标题</th>
                  <th className="px-3 py-2 font-medium">来源</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">说明</th>
                  <th className="px-3 py-2 font-medium">网盘链接</th>
                  <th className="px-3 py-2 font-medium">wdbzk</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t border-white/5 text-white/75">
                    <td className="px-3 py-3 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">{item.title}</td>
                    <td className="px-3 py-3">{item.source}</td>
                    <td className="px-3 py-3">{statusLabel[item.status]}</td>
                    <td className="max-w-xs px-3 py-3 text-xs text-white/45">
                      {item.error || item.bilibiliMessage || '-'}
                    </td>
                    <td className="px-3 py-3">
                      {item.shareLink ? (
                        <button
                          className="text-accent hover:underline"
                          onClick={() => void getWallpaperStudio().openExternal(item.shareLink!)}
                        >
                          打开链接
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3">{item.panControlId ? `#${item.panControlId}` : '-'}</td>
                    <td className="px-3 py-3">
                      {isResumable(item) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => void run()}>
                            继续
                          </Button>
                          <Button variant="secondary" onClick={() => void abandon(item.id, false)}>
                            放弃
                          </Button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
