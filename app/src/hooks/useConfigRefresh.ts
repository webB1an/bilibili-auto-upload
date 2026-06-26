import { useCallback } from 'react'
import { getWallpaperStudio } from '@/lib/bridge'
import { useAppStore } from '@/store/appStore'

export function useConfigRefresh() {
  const setConfig = useAppStore((state) => state.setConfig)

  return useCallback(async () => {
    const config = await getWallpaperStudio().configGet()
    setConfig(config)
    return config
  }, [setConfig])
}
