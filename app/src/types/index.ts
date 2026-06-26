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
    abortOnCatalogDuplicate: boolean
  }
  onboarding: {
    completed: boolean
  }
  queue: {
    enabled: boolean
    intervalMinutes: number
    dailyLimit: number
    stopOnError: boolean
  }
  bgm: {
    libraryPath: string
    selectionMode: 'random' | 'sequential'
    fadeSeconds: number
  }
}

export interface QueueRuntimeState {
  running: boolean
  publishedToday: number
  failedToday: number
  lastRunAt?: string
  nextRunAt?: string
  lastMessage?: string
}

export interface UpdateStatus {
  checking: boolean
  currentVersion: string
  latestVersion?: string
  updateAvailable: boolean
  releaseUrl?: string
  checkedAt?: string
  error?: string
}

export interface DepCheckResult {
  node: { ok: boolean; version?: string; message?: string }
  curl: { ok: boolean; message?: string }
  python: { ok: boolean; version?: string; message?: string }
  bdpan: { ok: boolean; message?: string }
  sau: { ok: boolean; message?: string }
  ffmpeg: { ok: boolean; version?: string; message?: string }
}

export type PipelineStepId =
  | 'download'
  | 'translate'
  | 'baiduUpload'
  | 'baiduShare'
  | 'panControl'
  | 'bgm'
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
  id:
    | 'bdpan'
    | 'bilibiliCli'
    | 'python'
    | 'pythonRequests'
    | 'baidu'
    | 'bilibili'
    | 'wdbzk'
    | 'disk'
    | 'downloadSource'
    | 'catalog'
    | 'nextItem'
    | 'duplicate'
    | 'ffmpeg'
    | 'bgmLibrary'
  label: string
  ok: boolean
  message: string
  action?:
    | 'installBdpan'
    | 'installBilibiliCli'
    | 'baiduLogin'
    | 'bilibiliLogin'
    | 'wdbzkToken'
    | 'installPython'
}

export interface PreflightResult {
  ready: boolean
  steps: PreflightStep[]
  deps: DepCheckResult
  mode: 'quick' | 'full'
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
  pipelineRun: () => Promise<{ ok: boolean; message: string; recordId?: string; skipped?: boolean }>
  pipelineCancel: () => Promise<{ ok: boolean }>
  preflightRun: (mode?: 'quick' | 'full') => Promise<PreflightResult>
  shellOpenPath: (targetPath: string) => Promise<{ ok: boolean; message: string }>
  pythonDetect: () => Promise<{ ok: boolean; message: string; downloadUrl?: string }>
  ffmpegDetect: () => Promise<{ ok: boolean; message: string; downloadUrl?: string }>
  onboardingComplete: () => Promise<{ ok: boolean }>
  accountsBilibiliInstall: () => Promise<{ ok: boolean; message: string; path?: string }>
  accountsBilibiliStartLogin: () => Promise<{ ok: boolean; message: string }>
  accountsBilibiliGetQrcode: () => Promise<{ ok: boolean; dataUrl?: string; message: string }>
  accountsBilibiliPollLogin: () => Promise<{ valid: boolean; message: string; finished: boolean }>
  accountsBilibiliStopLogin: () => Promise<{ ok: boolean }>
  panControlTest: () => Promise<{ ok: boolean; message: string }>
  historyList: () => Promise<HistoryRecord[]>
  historyResumable: () => Promise<HistoryRecord | null>
  historyAbandon: (id: string, deleteLocal?: boolean) => Promise<{ ok: boolean; record?: HistoryRecord }>
  openExternal: (url: string) => Promise<void>
  queueStart: () => Promise<{ ok: boolean; message: string }>
  queueStop: () => Promise<{ ok: boolean; message: string }>
  queueStatus: () => Promise<QueueRuntimeState>
  queueUpdateSettings: (settings: AppConfig['queue']) => Promise<AppConfig>
  startupConsumeNotice: () => Promise<{ message: string } | null>
  updaterGetStatus: () => Promise<UpdateStatus>
  updaterCheck: (force?: boolean) => Promise<UpdateStatus>
  onQueueStatus: (callback: (status: QueueRuntimeState) => void) => () => void
  onPipelineProgress: (callback: (progress: PipelineProgress) => void) => () => void
  onPipelineLog: (callback: (line: string) => void) => () => void
}

declare global {
  interface Window {
    wallpaperStudio: WallpaperStudioAPI
  }
}

export {}
