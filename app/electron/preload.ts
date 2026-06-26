import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppConfig,
  DepCheckResult,
  HistoryRecord,
  PipelineProgress,
  PreflightResult,
  QueueRuntimeState,
  UpdateStatus
} from '../src/types'

contextBridge.exposeInMainWorld('wallpaperStudio', {
  bridgeVersion: 2,
  depsCheck: (): Promise<DepCheckResult> => ipcRenderer.invoke('deps:check'),
  configGet: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
  configSet: (config: AppConfig): Promise<AppConfig> => ipcRenderer.invoke('config:set', config),
  accountsBilibiliCheck: (): Promise<{ valid: boolean; message: string }> =>
    ipcRenderer.invoke('accounts:bilibiliCheck'),
  accountsBilibiliLoginHint: (): Promise<string> => ipcRenderer.invoke('accounts:bilibiliLoginHint'),
  accountsBilibiliOpenLoginTerminal: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('accounts:bilibiliOpenLoginTerminal'),
  accountsBilibiliOpenQrcode: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('accounts:bilibiliOpenQrcode'),
  accountsBilibiliInstall: (): Promise<{ ok: boolean; message: string; path?: string }> =>
    ipcRenderer.invoke('accounts:bilibiliInstall'),
  accountsBilibiliStartLogin: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('accounts:bilibiliStartLogin'),
  accountsBilibiliGetQrcode: (): Promise<{ ok: boolean; dataUrl?: string; message: string }> =>
    ipcRenderer.invoke('accounts:bilibiliGetQrcode'),
  accountsBilibiliPollLogin: (): Promise<{ valid: boolean; message: string; finished: boolean }> =>
    ipcRenderer.invoke('accounts:bilibiliPollLogin'),
  accountsBilibiliStopLogin: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('accounts:bilibiliStopLogin'),
  accountsBaiduWhoami: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('accounts:baiduWhoami'),
  accountsBaiduInstall: (): Promise<{ ok: boolean; message: string; path?: string }> =>
    ipcRenderer.invoke('accounts:baiduInstall'),
  accountsBaiduOpenLoginTerminal: (): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('accounts:baiduOpenLoginTerminal'),
  pipelineRun: (): Promise<{ ok: boolean; message: string; recordId?: string }> =>
    ipcRenderer.invoke('pipeline:run'),
  pipelineCancel: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('pipeline:cancel'),
  preflightRun: (mode?: 'quick' | 'full'): Promise<PreflightResult> =>
    ipcRenderer.invoke('preflight:run', mode),
  pythonDetect: (): Promise<{ ok: boolean; message: string; downloadUrl?: string }> =>
    ipcRenderer.invoke('python:detect'),
  shellOpenPath: (targetPath: string): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('shell:openPath', targetPath),
  onboardingComplete: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('onboarding:complete'),
  panControlTest: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke('panControl:test'),
  historyList: (): Promise<HistoryRecord[]> => ipcRenderer.invoke('history:list'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  queueStart: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke('queue:start'),
  queueStop: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke('queue:stop'),
  queueStatus: (): Promise<QueueRuntimeState> => ipcRenderer.invoke('queue:status'),
  queueUpdateSettings: (settings: AppConfig['queue']): Promise<AppConfig> =>
    ipcRenderer.invoke('queue:updateSettings', settings),
  updaterGetStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updater:getStatus'),
  updaterCheck: (force?: boolean): Promise<UpdateStatus> => ipcRenderer.invoke('updater:check', force),
  onQueueStatus: (callback: (status: QueueRuntimeState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: QueueRuntimeState): void => {
      callback(status)
    }
    ipcRenderer.on('queue:status', listener)
    return () => ipcRenderer.removeListener('queue:status', listener)
  },
  onPipelineProgress: (callback: (progress: PipelineProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: PipelineProgress): void => {
      callback(progress)
    }
    ipcRenderer.on('pipeline:progress', listener)
    return () => ipcRenderer.removeListener('pipeline:progress', listener)
  },
  onPipelineLog: (callback: (line: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, line: string): void => {
      callback(line)
    }
    ipcRenderer.on('pipeline:log', listener)
    return () => ipcRenderer.removeListener('pipeline:log', listener)
  }
})
