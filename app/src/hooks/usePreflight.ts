import { useCallback, useEffect, useState } from 'react'
import { getWallpaperStudio } from '@/lib/bridge'
import type { PreflightResult } from '@/types'

export function usePreflight(auto = true, mode: 'quick' | 'full' = 'full') {
  const [result, setResult] = useState<PreflightResult | null>(null)
  const [loading, setLoading] = useState(auto)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWallpaperStudio().preflightRun(mode)
      setResult(data)
      return data
    } finally {
      setLoading(false)
    }
  }, [mode])

  useEffect(() => {
    if (auto) {
      void refresh()
    }
  }, [auto, refresh])

  return { result, loading, refresh, ready: result?.ready ?? false }
}
