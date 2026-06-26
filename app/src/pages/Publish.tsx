import { useMemo } from 'react'
import { StepProgress } from '@/components/StepProgress'
import { VideoPreview } from '@/components/VideoPreview'
import { PublishSuccessCard } from '@/components/PublishSuccessCard'
import { LogPanel } from '@/components/LogPanel'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBootstrap, usePipeline } from '@/hooks/usePipeline'
import { usePreflight } from '@/hooks/usePreflight'
import { useAppStore } from '@/store/appStore'
import { Link } from 'react-router-dom'

export function Publish(): React.JSX.Element {
  useBootstrap()
  const { progress, logs, history, publishSummary } = useAppStore()
  const { running, run, cancel } = usePipeline()
  const { ready, loading: preflightLoading } = usePreflight()

  const latest = history[0]
  const showPreview = running || (!publishSummary && !!latest && latest.status !== 'success')

  const previewTitle = useMemo(() => {
    if (!showPreview) return undefined
    if (running) {
      return progress?.previewTitle
    }
    return latest?.title
  }, [latest?.title, progress?.previewTitle, running, showPreview])

  const previewPath = useMemo(() => {
    if (!showPreview) return undefined
    if (running) {
      return progress?.previewPath
    }
    return latest?.localPath
  }, [latest?.localPath, progress?.previewPath, running, showPreview])

  const showStepProgress = running || publishSummary != null

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/45">Pipeline</p>
          <h2 className="font-display text-3xl font-bold text-white">一键发布</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" disabled={!running} onClick={() => void cancel()}>
            取消任务
          </Button>
          <Button disabled={running || preflightLoading || !ready} onClick={() => void run()}>
            {running ? '执行中...' : ready ? '开始发布' : '环境未就绪'}
          </Button>
        </div>
      </header>

      {!ready && !preflightLoading && (
        <p className="mb-5 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          发布环境尚未就绪。请先到{' '}
          <Link to="/onboarding" className="underline">首次设置</Link> 完成安装与登录。
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {publishSummary && !running ? (
            <PublishSuccessCard record={publishSummary} />
          ) : (
            <VideoPreview title={previewTitle} filePath={previewPath} />
          )}
          <Card title="实时日志">
            <LogPanel lines={logs} />
          </Card>
        </div>
        <Card title="流水线进度" subtitle="下载 → 百度 → pan-control → B 站">
          <StepProgress current={showStepProgress ? progress : null} />
        </Card>
      </div>
    </div>
  )
}
