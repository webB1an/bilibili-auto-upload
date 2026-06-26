import { useCallback, useEffect, useRef, useState } from 'react'
import { getWallpaperStudio } from '@/lib/bridge'
import {
  isPreflightCacheFresh,
  PREFLIGHT_STALE_MS,
  type PreflightMode
} from '@/lib/preflightCache'
import { useAppStore } from '@/store/appStore'
import type { PreflightResult } from '@/types'

export interface UsePreflightOptions {
  mode?: PreflightMode
  /** 进入页面时自动检测；full 模式建议 false，改用手动刷新 */
  auto?: boolean
}

export function usePreflight(options: UsePreflightOptions = {}) {
  const mode = options.mode ?? 'full'
  const auto = options.auto ?? true
  const staleMs = PREFLIGHT_STALE_MS[mode]

  const cacheEntry = useAppStore((state) => state.preflightCache[mode])
  const setPreflightCache = useAppStore((state) => state.setPreflightCache)

  const [result, setResult] = useState<PreflightResult | null>(() =>
    isPreflightCacheFresh(cacheEntry, mode) ? cacheEntry!.result : null
  )
  const [loading, setLoading] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<number | null>(() =>
    isPreflightCacheFresh(cacheEntry, mode) ? cacheEntry!.fetchedAt : null
  )
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (cacheEntry && isPreflightCacheFresh(cacheEntry, mode)) {
      setResult(cacheEntry.result)
      setFetchedAt(cacheEntry.fetchedAt)
    }
  }, [cacheEntry, mode])

  const refresh = useCallback(
    async (force = true): Promise<PreflightResult | undefined> => {
      const cached = useAppStore.getState().preflightCache[mode]
      if (!force && isPreflightCacheFresh(cached, mode)) {
        setResult(cached!.result)
        setFetchedAt(cached!.fetchedAt)
        return cached!.result
      }

      setLoading(true)
      try {
        const data = await getWallpaperStudio().preflightRun(mode)
        if (!mountedRef.current) return data
        const fetched = Date.now()
        setPreflightCache(mode, data, fetched)
        setResult(data)
        setFetchedAt(fetched)
        return data
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [mode, setPreflightCache]
  )

  useEffect(() => {
    if (!auto) return
    const cached = useAppStore.getState().preflightCache[mode]
    if (isPreflightCacheFresh(cached, mode)) {
      setResult(cached!.result)
      setFetchedAt(cached!.fetchedAt)
      return
    }
    void refresh(false)
  }, [auto, mode, refresh])

  const stale = fetchedAt != null && Date.now() - fetchedAt >= staleMs

  return {
    result,
    loading,
    refresh,
    ready: result?.ready ?? false,
    fetchedAt,
    stale
  }
}
