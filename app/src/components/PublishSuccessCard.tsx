import { Link } from 'react-router-dom'
import { getWallpaperStudio } from '@/lib/bridge'
import { Button } from '@/components/ui/Button'
import type { HistoryRecord } from '@/types'

interface PublishSuccessCardProps {
  record: HistoryRecord
}

export function PublishSuccessCard({ record }: PublishSuccessCardProps): React.JSX.Element {
  const openLink = (url: string) => {
    void getWallpaperStudio().openExternal(url)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 via-surface2 to-black/40 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_55%)]" />
      <div className="relative space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent/80">Success</p>
          <h3 className="font-display mt-2 text-2xl font-semibold text-white">发布成功</h3>
          <p className="mt-2 text-sm text-white/55">壁纸已上传至百度网盘、pan-control 并完成 B 站投稿</p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-4">
          <p className="text-xs text-white/40">B 站标题</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-white">{record.title}</p>
        </div>

        {record.shareLink && (
          <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-4">
            <p className="text-xs text-white/40">百度分享链接</p>
            <p className="mt-1 break-all text-sm text-accent">{record.shareLink}</p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => openLink(record.shareLink!)}
            >
              打开分享链接
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-white/45">
          {record.panControlId != null && <span>pan-control #{record.panControlId}</span>}
          {record.source && <span>来源 {record.source}</span>}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/history">
            <Button variant="secondary">查看历史</Button>
          </Link>
          {record.detailUrl && (
            <Button variant="secondary" onClick={() => openLink(record.detailUrl)}>
              打开壁纸来源
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
