export interface AppConfig {
  panControl: {
    baseUrl: string
    apiToken: string
    categoryId: number
  }
  baidu: {
    remoteBase: string
    sharePeriodDays: number
    bdpanPath: string
  }
  bilibili: {
    accountName: string
    tid: number
    tags: string[]
    socialAutoUploadPath: string
    descTemplate: string
  }
  download: {
    sources: string[]
    scriptsDir: string
  }
  pipeline: {
    deleteLocalAfterSuccess: boolean
    maxFileSizeMb: number
  }
  onboarding: {
    completed: boolean
  }
}

export interface DepCheckResult {
  node: { ok: boolean; version?: string; message?: string }
  curl: { ok: boolean; message?: string }
  python: { ok: boolean; version?: string; message?: string }
  bdpan: { ok: boolean; message?: string }
  sau: { ok: boolean; message?: string }
}

export type PipelineStepId =
  | 'download'
  | 'translate'
  | 'baiduUpload'
  | 'baiduShare'
  | 'panControl'
  | 'bilibili'

export type StepStatus = 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped'

export interface PipelineProgress {
  step: PipelineStepId
  status: StepStatus
  percent: number
  message: string
  previewTitle?: string
  previewPath?: string
}

export interface HistoryRecord {
  id: string
  title: string
  detailUrl: string
  source: string
  localPath?: string
  baiduRemotePath?: string
  shareLink?: string
  panControlId?: number
  bilibiliStatus: 'success' | 'failed' | 'skipped' | 'pending'
  bilibiliMessage?: string
  status: 'success' | 'partial' | 'failed'
  createdAt: string
  error?: string
}

export interface AppState {
  postedDetailUrls: string[]
  history: HistoryRecord[]
}

export interface DownloadResult {
  filePath: string
  name: string
  detailUrl: string
  source: string
}

export interface ShareResult {
  link: string
  pwd: string
  fullLink: string
}

export interface PreflightStep {
  id: 'bdpan' | 'bilibiliCli' | 'python' | 'baidu' | 'bilibili' | 'wdbzk'
  label: string
  ok: boolean
  message: string
  action?: 'installBdpan' | 'installBilibiliCli' | 'baiduLogin' | 'bilibiliLogin' | 'wdbzkToken'
}

export interface PreflightResult {
  ready: boolean
  steps: PreflightStep[]
  deps: DepCheckResult
}

export interface WallpaperStudioAPI {
  bridgeVersion?: number
  depsCheck: () => Promise<DepCheckResult>
  configGet: () => Promise<AppConfig>
  configSet: (config: AppConfig) => Promise<AppConfig>
  accountsBilibiliCheck: () => Promise<{ valid: boolean; message: string }>
  accountsBilibiliLoginHint: () => Promise<string>
  accountsBilibiliOpenLoginTerminal: () => Promise<{ ok: boolean; message: string }>
  accountsBilibiliOpenQrcode: () => Promise<{ ok: boolean; message: string }>
  accountsBaiduWhoami: () => Promise<{ ok: boolean; message: string }>
  accountsBaiduInstall: () => Promise<{ ok: boolean; message: string; path?: string }>
  accountsBaiduOpenLoginTerminal: () => Promise<{ ok: boolean; message: string }>
  pipelineRun: () => Promise<{ ok: boolean; message: string; recordId?: string }>
  pipelineCancel: () => Promise<{ ok: boolean }>
  preflightRun: () => Promise<PreflightResult>
  onboardingComplete: () => Promise<{ ok: boolean }>
  accountsBilibiliInstall: () => Promise<{ ok: boolean; message: string; path?: string }>
  panControlTest: () => Promise<{ ok: boolean; message: string }>
  historyList: () => Promise<HistoryRecord[]>
  openExternal: (url: string) => Promise<void>
  onPipelineProgress: (callback: (progress: PipelineProgress) => void) => () => void
  onPipelineLog: (callback: (line: string) => void) => () => void
}

declare global {
  interface Window {
    wallpaperStudio: WallpaperStudioAPI
  }
}

export {}
