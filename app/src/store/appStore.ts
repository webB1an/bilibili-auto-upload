import { create } from 'zustand'
import type { AppConfig, DepCheckResult, HistoryRecord, PipelineProgress, PreflightResult } from '@/types'
import type { PreflightCacheEntry, PreflightMode } from '@/lib/preflightCache'

interface AppStore {
  config: AppConfig | null
  deps: DepCheckResult | null
  history: HistoryRecord[]
  progress: PipelineProgress | null
  logs: string[]
  running: boolean
  publishSummary: HistoryRecord | null
  bilibiliAccount: { valid: boolean; message: string } | null
  baiduAccount: { ok: boolean; message: string } | null
  accountChecking: boolean
  preflightCache: Partial<Record<PreflightMode, PreflightCacheEntry>>
  setConfig: (config: AppConfig | null) => void
  setDeps: (deps: DepCheckResult | null) => void
  setHistory: (history: HistoryRecord[]) => void
  setProgress: (progress: PipelineProgress | null) => void
  appendLog: (line: string) => void
  clearLogs: () => void
  setRunning: (running: boolean) => void
  setPublishSummary: (record: HistoryRecord | null) => void
  setBilibiliAccount: (status: { valid: boolean; message: string } | null) => void
  setBaiduAccount: (status: { ok: boolean; message: string } | null) => void
  setAccountChecking: (checking: boolean) => void
  setPreflightCache: (mode: PreflightMode, result: PreflightResult, fetchedAt?: number) => void
  invalidatePreflightCache: (mode?: PreflightMode) => void
}

export const useAppStore = create<AppStore>((set) => ({
  config: null,
  deps: null,
  history: [],
  progress: null,
  logs: [],
  running: false,
  publishSummary: null,
  bilibiliAccount: null,
  baiduAccount: null,
  accountChecking: false,
  preflightCache: {},
  setConfig: (config) => set({ config }),
  setDeps: (deps) => set({ deps }),
  setHistory: (history) => set({ history }),
  setProgress: (progress) => set({ progress }),
  appendLog: (line) => set((state) => ({ logs: [...state.logs, line] })),
  clearLogs: () => set({ logs: [] }),
  setRunning: (running) => set({ running }),
  setPublishSummary: (publishSummary) => set({ publishSummary }),
  setBilibiliAccount: (bilibiliAccount) => set({ bilibiliAccount }),
  setBaiduAccount: (baiduAccount) => set({ baiduAccount }),
  setAccountChecking: (accountChecking) => set({ accountChecking }),
  setPreflightCache: (mode, result, fetchedAt = Date.now()) =>
    set((state) => ({
      preflightCache: {
        ...state.preflightCache,
        [mode]: { result, fetchedAt }
      }
    })),
  invalidatePreflightCache: (mode) =>
    set((state) => {
      if (!mode) {
        return { preflightCache: {} }
      }
      const next = { ...state.preflightCache }
      delete next[mode]
      return { preflightCache: next }
    })
}))
