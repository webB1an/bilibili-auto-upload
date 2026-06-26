import { useCallback, useEffect } from 'react'
import { getBridgeErrorMessage, getWallpaperStudio } from '@/lib/bridge'
import { useAppStore } from '@/store/appStore'

export function useAccountStatus(options?: { refreshOnMount?: boolean }) {
  const {
    bilibiliAccount,
    baiduAccount,
    accountChecking,
    setBilibiliAccount,
    setBaiduAccount,
    setAccountChecking
  } = useAppStore()

  const refreshAccountStatus = useCallback(async () => {
    const bridgeError = getBridgeErrorMessage()
    if (bridgeError) return

    setAccountChecking(true)
    try {
      const bridge = getWallpaperStudio()
      const [bilibili, baidu] = await Promise.all([
        bridge.accountsBilibiliCheck(),
        bridge.accountsBaiduWhoami()
      ])
      setBilibiliAccount(bilibili)
      setBaiduAccount(baidu)
    } finally {
      setAccountChecking(false)
    }
  }, [setAccountChecking, setBaiduAccount, setBilibiliAccount])

  const refreshBilibili = useCallback(async () => {
    const bridgeError = getBridgeErrorMessage()
    if (bridgeError) return

    const result = await getWallpaperStudio().accountsBilibiliCheck()
    setBilibiliAccount(result)
  }, [setBilibiliAccount])

  const refreshBaidu = useCallback(async () => {
    const bridgeError = getBridgeErrorMessage()
    if (bridgeError) return

    const result = await getWallpaperStudio().accountsBaiduWhoami()
    setBaiduAccount(result)
  }, [setBaiduAccount])

  useEffect(() => {
    if (options?.refreshOnMount === false) return
    void refreshAccountStatus()
  }, [options?.refreshOnMount, refreshAccountStatus])

  return {
    bilibiliAccount,
    baiduAccount,
    accountChecking,
    refreshAccountStatus,
    refreshBilibili,
    refreshBaidu
  }
}
