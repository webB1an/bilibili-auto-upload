import type { PreflightResult } from '@/types'

export type PreflightMode = 'quick' | 'full'

export interface PreflightCacheEntry {
  result: PreflightResult
  fetchedAt: number
}

/** quick: 登录/工具类；full: 含 dry-run、去重、网络扫描 */
export const PREFLIGHT_STALE_MS: Record<PreflightMode, number> = {
  quick: 2 * 60 * 1000,
  full: 10 * 60 * 1000
}

export function isPreflightCacheFresh(
  entry: PreflightCacheEntry | null | undefined,
  mode: PreflightMode
): boolean {
  if (!entry) return false
  return Date.now() - entry.fetchedAt < PREFLIGHT_STALE_MS[mode]
}

export function formatPreflightCheckedAt(fetchedAt: number): string {
  return new Date(fetchedAt).toLocaleString()
}
