import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePreflight } from '@/hooks/usePreflight'
import { getWallpaperStudio } from '@/lib/bridge'
import type { PreflightStep } from '@/types'

interface PreflightPanelProps {
  mode?: 'quick' | 'full'
  title?: string
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

export function PreflightPanel({
  mode = 'full',
  title = '发布前检查'
}: PreflightPanelProps): React.JSX.Element {
  const { result, loading, refresh } = usePreflight(true, mode)

  return (
    <Card title={title} subtitle={loading ? '检测中...' : result?.ready ? '全部就绪' : '尚未就绪'}>
      <div className="space-y-3">
        {result?.steps.map((step) => (
          <div key={step.id}>
            <StatusBadge ok={step.ok} label={step.label} detail={step.message} />
            <PreflightActionButton step={step} />
          </div>
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
