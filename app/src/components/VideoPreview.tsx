interface VideoPreviewProps {
  title?: string
  filePath?: string
}

export function VideoPreview({ title, filePath }: VideoPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-surface2 to-black/40 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_55%)]" />
      <div className="relative flex min-h-52 flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Preview</p>
          <h3 className="font-display mt-3 text-2xl font-semibold text-white">
            {title || '等待任务开始'}
          </h3>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-white/45">
          {filePath ? (
            <p className="break-all">{filePath}</p>
          ) : (
            <p>发布后将在此显示当前壁纸标题与本地路径</p>
          )}
        </div>
      </div>
    </div>
  )
}
