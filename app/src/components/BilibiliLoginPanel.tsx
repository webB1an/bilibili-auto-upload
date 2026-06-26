import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { getWallpaperStudio } from '@/lib/bridge'

interface BilibiliLoginPanelProps {
  onStatus?: (message: string, error: boolean) => void
  onSuccess?: () => void
}

export function BilibiliLoginPanel({
  onStatus,
  onSuccess
}: BilibiliLoginPanelProps): React.JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [hint, setHint] = useState('点击「应用内登录」生成二维码')

  const pollQrcode = useCallback(async () => {
    const result = await getWallpaperStudio().accountsBilibiliGetQrcode()
    if (result.ok && result.dataUrl) {
      setDataUrl(result.dataUrl)
    }
    return result
  }, [])

  const pollLogin = useCallback(async () => {
    const result = await getWallpaperStudio().accountsBilibiliPollLogin()
    if (result.valid) {
      setRunning(false)
      setHint('B 站登录成功')
      onStatus?.(result.message, false)
      onSuccess?.()
      return true
    }
    if (result.finished) {
      setRunning(false)
      setHint(result.message)
      onStatus?.(result.message, true)
      return true
    }
    return false
  }, [onStatus, onSuccess])

  useEffect(() => {
    if (!running) return undefined

    const qrcodeTimer = window.setInterval(() => {
      void pollQrcode()
    }, 2000)

    const loginTimer = window.setInterval(() => {
      void pollLogin()
    }, 3000)

    const timeout = window.setTimeout(() => {
      setRunning(false)
      setHint('登录超时，请重试或使用终端登录')
      onStatus?.('登录超时，请重试或使用终端登录', true)
      void getWallpaperStudio().accountsBilibiliStopLogin()
    }, 180_000)

    return () => {
      window.clearInterval(qrcodeTimer)
      window.clearInterval(loginTimer)
      window.clearTimeout(timeout)
    }
  }, [running, pollQrcode, pollLogin, onStatus])

  const startLogin = async (): Promise<void> => {
    setRunning(true)
    setDataUrl(null)
    setHint('正在启动登录...')
    const result = await getWallpaperStudio().accountsBilibiliStartLogin()
    setHint(result.message)
    onStatus?.(result.message, !result.ok)
    if (result.ok) {
      void pollQrcode()
    } else {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-4">
      <p className="text-sm font-medium text-white/80">B 站应用内登录</p>
      <p className="mt-1 text-xs text-white/45">{hint}</p>
      <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 p-4">
        {dataUrl ? (
          <img src={dataUrl} alt="Bilibili login QR code" className="max-h-48 rounded-lg" />
        ) : (
          <p className="text-sm text-white/40">二维码将显示在这里</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={running} onClick={() => void startLogin()}>
          {running ? '等待扫码...' : '应用内登录'}
        </Button>
        <Button
          variant="secondary"
          disabled={!running}
          onClick={() => {
            setRunning(false)
            void getWallpaperStudio().accountsBilibiliStopLogin()
            setHint('已停止登录进程')
          }}
        >
          停止
        </Button>
      </div>
    </div>
  )
}
