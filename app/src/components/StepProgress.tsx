import type { PipelineProgress, PipelineStepId } from '@/types'

const STEPS: Array<{ id: PipelineStepId; label: string }> = [
  { id: 'download', label: '下载壁纸' },
  { id: 'translate', label: '生成标题' },
  { id: 'baiduUpload', label: '上传百度' },
  { id: 'baiduShare', label: '创建分享' },
  { id: 'panControl', label: 'wdbzk 入库' },
  { id: 'bilibili', label: 'B 站投稿' }
]

const statusColor: Record<PipelineProgress['status'], string> = {
  pending: 'border-white/10 bg-white/5 text-white/40',
  running: 'border-accent/40 bg-accent/10 text-accent',
  success: 'border-accent/30 bg-accent/10 text-accent',
  warning: 'border-warn/30 bg-warn/10 text-warn',
  error: 'border-danger/30 bg-danger/10 text-danger',
  skipped: 'border-white/10 bg-white/5 text-white/40'
}

interface StepProgressProps {
  current?: PipelineProgress | null
}

export function StepProgress({ current }: StepProgressProps) {
  const currentIndex = current ? STEPS.findIndex((step) => step.id === current.step) : -1

  return (
    <div className="space-y-3">
      {STEPS.map((step, index) => {
        const isCurrent = current?.step === step.id
        const status = isCurrent
          ? current?.status ?? 'running'
          : index < currentIndex
            ? 'success'
            : 'pending'
        const percent = isCurrent
          ? Math.min(100, Math.max(0, current?.percent ?? 0))
          : index < currentIndex
            ? 100
            : 0
        const showFlow = status === 'running' && percent > 0 && percent < 100

        return (
          <div
            key={step.id}
            className={`overflow-hidden rounded-xl border px-4 py-3 ${statusColor[status]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                {isCurrent && current?.message && (
                  <p className="mt-1 text-xs opacity-80">{current.message}</p>
                )}
              </div>
              <span className="text-xs tabular-nums">{percent}%</span>
            </div>
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className={`h-full max-w-full rounded-full bg-accent transition-[width] duration-500 ${showFlow ? 'step-flow' : ''}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
