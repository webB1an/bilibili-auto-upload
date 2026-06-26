import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBootstrap, usePipeline } from '@/hooks/usePipeline'
import { usePreflight } from '@/hooks/usePreflight'
import { useAppStore } from '@/store/appStore'

export function Dashboard(): React.JSX.Element {
  useBootstrap()
  const { deps, history } = useAppStore()
  const { running, run } = usePipeline()
  const { ready, loading: preflightLoading } = usePreflight()

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayRecords = history.filter((item) => item.createdAt.startsWith(today))
    return {
      published: todayRecords.filter((item) => item.status === 'success').length,
      failed: todayRecords.filter((item) => item.status === 'failed').length,
      partial: todayRecords.filter((item) => item.status === 'partial').length
    }
  }, [history])

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/45">Overview</p>
          <h2 className="font-display text-3xl font-bold text-white">仪表盘</h2>
        </div>
        <Button disabled={running || preflightLoading || !ready} onClick={() => void run()}>
          {running ? '任务运行中...' : ready ? '立即发布一条' : '环境未就绪'}
        </Button>
      </header>

      {!ready && !preflightLoading && (
        <p className="mb-5 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          请先完成{' '}
          <Link to="/onboarding" className="underline">首次设置</Link>，再开始发布。
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Card title="今日成功" subtitle="完整走完四步流水线">
          <p className="font-display text-4xl font-bold text-accent">{stats.published}</p>
        </Card>
        <Card title="今日失败" subtitle="任一步骤中断">
          <p className="font-display text-4xl font-bold text-danger">{stats.failed}</p>
        </Card>
        <Card title="部分完成" subtitle="已入库但未完成 B 站">
          <p className="font-display text-4xl font-bold text-warn">{stats.partial}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="依赖检测" subtitle="发布前请确保全部就绪">
          <div className="grid gap-3">
            <StatusBadge ok={!!deps?.node.ok} label="Node.js" detail={deps?.node.version || deps?.node.message} />
            <StatusBadge ok={!!deps?.curl.ok} label="curl" detail={deps?.curl.message} />
            <StatusBadge ok={!!deps?.python.ok} label="Python" detail={deps?.python.version || deps?.python.message} />
            <StatusBadge ok={!!deps?.bdpan.ok} label="百度网盘 bdpan" detail={deps?.bdpan.message} />
            <StatusBadge ok={!!deps?.sau.ok} label="social-auto-upload" detail={deps?.sau.message} />
          </div>
        </Card>
        <Card title="快捷入口">
          <div className="flex flex-wrap gap-3">
            <Link to="/publish">
              <Button variant="secondary">打开发布页</Button>
            </Link>
            <Link to="/accounts">
              <Button variant="secondary">检查账号</Button>
            </Link>
            <Link to="/settings">
              <Button variant="secondary">系统设置</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
