interface LogPanelProps {
  lines: string[]
}

export function LogPanel({ lines }: LogPanelProps) {
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/30">
      <div className="border-b border-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/40">
        运行日志
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs leading-6 text-white/70">
        {lines.length > 0 ? lines.join('\n') : '等待任务输出...'}
      </pre>
    </div>
  )
}
