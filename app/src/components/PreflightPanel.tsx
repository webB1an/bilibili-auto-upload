import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePreflight } from '@/hooks/usePreflight'

interface PreflightPanelProps {
  mode?: 'quick' | 'full'
  title?: string
}

export function PreflightPanel({
  mode = 'full',
  title = '发布前检查'
}: PreflightPanelProps): React.JSX.Element {
  const { result, loading, refresh } = usePreflight(true, mode)

  return (
    <Card title={title} subtitle={loading ? '检测中...' : result?.ready ? '全部就绪' : '尚未就绪'}>
      <div className="space-y-3">
        {result?.steps.map((step) => (
          <StatusBadge key={step.id} ok={step.ok} label={step.label} detail={step.message} />
        ))}
        {!result && !loading && <p className="text-sm text-white/45">等待检测...</p>}
      </div>
      <div className="mt-4">
        <Button variant="secondary" disabled={loading} onClick={() => void refresh()}>
          刷新检查
        </Button>
      </div>
    </Card>
  )
}
