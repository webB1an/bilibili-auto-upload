import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getWallpaperStudio } from '@/lib/bridge'
import type { HistoryRecord } from '@/types'

interface ResumableJobBannerProps {
  onContinue: () => void
  onAbandoned: () => void
}

export function ResumableJobBanner({
  onContinue,
  onAbandoned
}: ResumableJobBannerProps): React.JSX.Element | null {
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = (): void => {
    void getWallpaperStudio()
      .historyResumable()
      .then(setRecord)
      .catch(() => setRecord(null))
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!record) return null

  const abandon = async (deleteLocal: boolean): Promise<void> => {
    setBusy(true)
    try {
      await getWallpaperStudio().historyAbandon(record.id, deleteLocal)
      await getWallpaperStudio().historyList()
      onAbandoned()
      setRecord(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="未完成的上次发布" subtitle="可继续从本地文件断点续传，或放弃后下载新壁纸">
      <div className="space-y-3">
        <p className="text-sm text-white/75">{record.title}</p>
        {record.error && <p className="text-xs text-warn">{record.error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={onContinue}>
            继续发布
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void abandon(false)}>
            放弃（保留本地文件）
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void abandon(true)}>
            放弃并删除本地文件
          </Button>
        </div>
      </div>
    </Card>
  )
}
