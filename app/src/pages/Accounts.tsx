import { useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAccountStatus } from '@/hooks/useAccountStatus'
import { useBootstrap } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import { getBridgeErrorMessage, getWallpaperStudio } from '@/lib/bridge'

export function Accounts(): React.JSX.Element {
  useBootstrap()
  const { config } = useAppStore()
  const {
    bilibiliAccount,
    baiduAccount,
    accountChecking,
    refreshBilibili,
    refreshBaidu
  } = useAccountStatus()
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState(false)
  const [openingLogin, setOpeningLogin] = useState(false)
  const [installingBdpan, setInstallingBdpan] = useState(false)
  const [installingBilibiliCli, setInstallingBilibiliCli] = useState(false)
  const [openingBaiduLogin, setOpeningBaiduLogin] = useState(false)

  const handleOpenLoginTerminal = async (): Promise<void> => {
    const bridgeError = getBridgeErrorMessage()
    if (bridgeError) {
      setActionError(true)
      setActionMessage(bridgeError)
      return
    }

    setOpeningLogin(true)
    setActionError(false)
    try {
      const result = await getWallpaperStudio().accountsBilibiliOpenLoginTerminal()
      setActionMessage(result.message)
      setActionError(!result.ok)
    } catch (error) {
      setActionError(true)
      setActionMessage((error as Error).message || '打开终端失败')
    } finally {
      setOpeningLogin(false)
    }
  }

  const bilibiliLabel = bilibiliAccount
    ? bilibiliAccount.valid
      ? 'B 站账号有效'
      : 'B 站账号未就绪'
    : accountChecking
      ? '正在检测 B 站账号...'
      : 'B 站账号未检测'

  const baiduLabel = baiduAccount
    ? baiduAccount.ok
      ? '百度网盘已登录'
      : '百度网盘未登录'
    : accountChecking
      ? '正在检测百度网盘...'
      : '百度网盘未检测'

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8">
        <p className="text-sm text-white/45">Accounts</p>
        <h2 className="font-display text-3xl font-bold text-white">账号授权</h2>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Bilibili" subtitle={`账号: ${config?.bilibili.accountName ?? 'creator'}`}>
          <div className="space-y-4">
            <StatusBadge
              ok={!!bilibiliAccount?.valid}
              label={bilibiliLabel}
              detail={bilibiliAccount?.message}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={installingBilibiliCli}
                onClick={() => {
                  setInstallingBilibiliCli(true)
                  setActionError(false)
                  void getWallpaperStudio()
                    .accountsBilibiliInstall()
                    .then((result) => {
                      setActionMessage(result.message)
                      setActionError(!result.ok)
                    })
                    .catch((error: Error) => {
                      setActionError(true)
                      setActionMessage(error.message || '安装失败')
                    })
                    .finally(() => setInstallingBilibiliCli(false))
                }}
              >
                {installingBilibiliCli ? '正在安装...' : '安装 B 站 CLI'}
              </Button>
              <Button disabled={openingLogin} onClick={() => void handleOpenLoginTerminal()}>
                {openingLogin ? '正在打开...' : '打开终端登录'}
              </Button>
              <Button variant="secondary" onClick={() => void refreshBilibili()}>
                检测登录状态
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void getWallpaperStudio().accountsBilibiliOpenQrcode().then((result) => {
                    setActionMessage(result.message)
                  })
                }
              >
                打开二维码图片
              </Button>
            </div>
            {actionMessage && (
              <p
                className={`rounded-xl border px-4 py-3 text-sm ${
                  actionError
                    ? 'border-danger/30 bg-danger/10 text-danger'
                    : 'border-accent/20 bg-accent/5 text-white/75'
                }`}
              >
                {actionMessage}
              </p>
            )}
            <p className="text-sm text-white/45">
              点击「打开终端登录」会自动在新命令行窗口执行 `bili_cli.py login`，扫码完成后回到本页检测状态即可。
            </p>
          </div>
        </Card>

        <Card title="百度网盘" subtitle={`CLI: ${config?.baidu.bdpanPath ?? 'bdpan'}`}>
          <div className="space-y-4">
            <StatusBadge ok={!!baiduAccount?.ok} label={baiduLabel} detail={baiduAccount?.message} />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={installingBdpan}
                onClick={() => {
                  setInstallingBdpan(true)
                  setActionError(false)
                  void getWallpaperStudio()
                    .accountsBaiduInstall()
                    .then((result) => {
                      setActionMessage(result.message)
                      setActionError(!result.ok)
                    })
                    .catch((error: Error) => {
                      setActionError(true)
                      setActionMessage(error.message || '安装失败')
                    })
                    .finally(() => setInstallingBdpan(false))
                }}
              >
                {installingBdpan ? '正在安装...' : '安装 bdpan'}
              </Button>
              <Button
                disabled={openingBaiduLogin}
                onClick={() => {
                  setOpeningBaiduLogin(true)
                  setActionError(false)
                  void getWallpaperStudio()
                    .accountsBaiduOpenLoginTerminal()
                    .then((result) => {
                      setActionMessage(result.message)
                      setActionError(!result.ok)
                    })
                    .catch((error: Error) => {
                      setActionError(true)
                      setActionMessage(error.message || '打开终端失败')
                    })
                    .finally(() => setOpeningBaiduLogin(false))
                }}
              >
                {openingBaiduLogin ? '正在打开...' : '打开终端登录'}
              </Button>
              <Button variant="secondary" onClick={() => void refreshBaidu()}>
                检测登录状态
              </Button>
            </div>
            {actionMessage && (
              <p
                className={`rounded-xl border px-4 py-3 text-sm ${
                  actionError
                    ? 'border-danger/30 bg-danger/10 text-danger'
                    : 'border-accent/20 bg-accent/5 text-white/75'
                }`}
              >
                {actionMessage}
              </p>
            )}
            <p className="text-sm text-white/45">
              首次使用点击「安装 bdpan」，应用会自动下载官方 CLI 到本地工具目录；再点「打开终端登录」完成百度授权。分享功能需在百度开放平台购买服务。
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
