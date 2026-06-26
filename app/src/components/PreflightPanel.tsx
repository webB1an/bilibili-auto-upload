import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePreflight } from '@/hooks/usePreflight'
import { formatPreflightCheckedAt } from '@/lib/preflightCache'
import { getWallpaperStudio } from '@/lib/bridge'
import type { PreflightStep } from '@/types'

interface PreflightPanelProps {
  mode?: 'quick' | 'full'
  title?: string
  /** 进入页面是否自动检测；full 建议 false，避免 dry-run 阻塞 */
  auto?: boolean
}

function PreflightActionButton({ step }: { step: PreflightStep }): React.JSX.Element | null {
  const navigate = useNavigate()

  if (step.ok || !step.action) return null

  const run = async (): Promise<void> => {
    const bridge = getWallpaperStudio()
    switch (step.action) {
      case 'installBdpan':
        await bridge.accountsBaiduInstall()
        break
      case 'installBilibiliCli':
        await bridge.accountsBilibiliInstall()
        break
      case 'baiduLogin':
        await bridge.accountsBaiduOpenLoginTerminal()
        break
      case 'bilibiliLogin':
        navigate('/accounts')
        break
      case 'wdbzkToken':
        navigate('/settings')
        break
      case 'installPython':
        await bridge.openExternal('https://www.python.org/downloads/')
        break
      default:
        break
    }
  }

  const labels: Record<NonNullable<PreflightStep['action']>, string> = {
    installBdpan: '安装 bdpan',
    installBilibiliCli: '安装 B 站 CLI',
    baiduLogin: '百度登录',
    bilibiliLogin: '去 B 站登录',
    wdbzkToken: '配置 Token',
    installPython: '下载 Python'
  }

  return (
    <Button variant="secondary" className="mt-2" onClick={() => void run()}>
      {labels[step.action]}
    </Button>
  )
}

function buildSubtitle(options: {
  loading: boolean
  ready: boolean
  fetchedAt: number | null
  stale: boolean
  mode: 'quick' | 'full'
  auto: boolean
}): string {
  if (options.loading) return '检测中...'
  if (!options.fetchedAt) {
    return options.mode === 'full' && !options.auto
      ? '点击「完整检查」查看预览与去重（不阻塞发布）'
      : '等待检测...'
  }
  const time = formatPreflightCheckedAt(options.fetchedAt)
  if (options.stale) {
    return `上次检查 ${time}（已过期，建议刷新）`
  }
  return options.ready ? `全部就绪 · 检查于 ${time}` : `尚未就绪 · 检查于 ${time}`
}

export function PreflightPanel({
  mode = 'full',
  title = '发布前检查',
  auto = mode === 'quick'
}: PreflightPanelProps): React.JSX.Element {
  const { result, loading, refresh, ready, fetchedAt, stale } = usePreflight({ mode, auto })

  return (
    <Card title={title} subtitle={buildSubtitle({ loading, ready, fetchedAt, stale, mode, auto })}>
      <div className="space-y-3">
        {result?.steps.map((step) => (
          <div key={step.id}>
            <StatusBadge ok={step.ok} label={step.label} detail={step.message} />
            <PreflightActionButton step={step} />
          </div>
        ))}
        {!result && !loading && (
          <p className="text-sm text-white/45">
            {mode === 'full'
              ? '完整检查含下一条壁纸 dry-run 与库内去重，耗时较长，可按需手动执行。'
              : '等待检测...'}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" disabled={loading} onClick={() => void refresh(true)}>
          {mode === 'full' ? '完整检查' : '刷新检查'}
        </Button>
        {mode === 'full' && (
          <p className="self-center text-xs text-white/40">
            「开始发布」前仍会由后台快速校验账号与工具；完整检查仅用于预览下一条。
          </p>
        )}
      </div>
    </Card>
  )
}
