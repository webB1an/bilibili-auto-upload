import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig, DepCheckResult, HistoryRecord, PipelineProgress, PreflightResult } from '../src/types'

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
