import type { WallpaperStudioAPI } from '@/types'

const REQUIRED_METHODS: Array<keyof WallpaperStudioAPI> = [
  'accountsBilibiliOpenLoginTerminal',
  'accountsBilibiliOpenQrcode',
  'pipelineRun',
  'configGet'
]

export function getBridgeErrorMessage(): string | null {
  const bridge = window.wallpaperStudio

  if (!bridge) {
    return '未检测到 Electron 桌面接口。请用 npm run dev 启动桌面窗口，不要直接在浏览器打开 localhost:5173。'
  }

  const missing = REQUIRED_METHODS.filter(
    (name) => typeof bridge[name] !== 'function'
  )

  if (missing.length > 0) {
    return `桌面接口不完整（缺少: ${missing.join(', ')}）。请完全退出 Wallpaper Studio（含托盘图标），然后在 app 目录执行 npm run build && npm run dev。若使用安装包，请重新 npm run dist 后再安装。`
  }

  return null
}

export function getWallpaperStudio(): WallpaperStudioAPI {
  const error = getBridgeErrorMessage()
  if (error) {
    throw new Error(error)
  }
  return window.wallpaperStudio
}

export function isBridgeReady(): boolean {
  return getBridgeErrorMessage() === null
}
