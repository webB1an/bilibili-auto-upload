import { useCallback, useEffect } from 'react'
import { getBridgeErrorMessage, getWallpaperStudio } from '@/lib/bridge'
import { useAppStore } from '@/store/appStore'
import type { PipelineProgress } from '@/types'

export function usePipeline() {
  const {
    running,
    setRunning,
    setProgress,
    appendLog,
    clearLogs,
    setHistory,
    setPublishSummary
  } = useAppStore()

  useEffect(() => {
    if (getBridgeErrorMessage()) return

    const bridge = getWallpaperStudio()
    const offProgress = bridge.onPipelineProgress((progress: PipelineProgress) => {
      setProgress(progress)
    })
    const offLog = bridge.onPipelineLog((line: string) => {
      appendLog(line)
    })
    return () => {
      offProgress()
      offLog()
    }
  }, [appendLog, setProgress])

  const run = useCallback(async () => {
    clearLogs()
    setProgress(null)
    setPublishSummary(null)
    setRunning(true)
    const invalidatePreflightCache = useAppStore.getState().invalidatePreflightCache
    let result: { ok: boolean; message: string; recordId?: string } | undefined
    try {
      const bridge = getWallpaperStudio()
      result = await bridge.pipelineRun()
      const history = await bridge.historyList()
      setHistory(history)
      invalidatePreflightCache('full')
      const pipelineResult = result
      if (pipelineResult?.ok) {
        const record = pipelineResult.recordId
          ? history.find((item) => item.id === pipelineResult.recordId)
          : history[0]
        if (record && record.status === 'success') {
          setPublishSummary(record)
        }
      }
      return result
    } finally {
      setRunning(false)
    }
  }, [clearLogs, setHistory, setProgress, setPublishSummary, setRunning])

  const cancel = useCallback(async () => {
    await getWallpaperStudio().pipelineCancel()
    setRunning(false)
  }, [setRunning])

  return { running, run, cancel }
}

export function useBootstrap() {
  const { setConfig, setDeps, setHistory } = useAppStore()

  useEffect(() => {
    const bridgeError = getBridgeErrorMessage()
    if (bridgeError) return

    void (async () => {
      const bridge = getWallpaperStudio()
      const [config, deps, history] = await Promise.all([
        bridge.configGet(),
        bridge.depsCheck(),
        bridge.historyList()
      ])
      setConfig(config)
      setDeps(deps)
      setHistory(history)
    })()
  }, [setConfig, setDeps, setHistory])
}
