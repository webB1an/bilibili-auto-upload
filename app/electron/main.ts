import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadConfig, saveConfig } from './services/config'
import { checkDeps } from './services/deps'
import { bilibiliCheck, getLoginHint, getQrcodePath, openBilibiliLoginTerminal } from './services/bilibili'
import { ensureBilibiliCliInstalled, installBilibiliCli } from './services/bilibiliRuntime'
import { detectPython } from './services/pythonRuntime'
import { baiduWhoami } from './services/baidu'
import { ensureBdpanInstalled, installBdpan, openBaiduLoginTerminal } from './services/bdpanRuntime'
import { cancelPipeline, isPipelineRunning, runPipeline } from './services/pipeline'
import { runPreflight } from './services/preflight'
import { testPanControlConnection } from './services/panControl'
import {
  getBilibiliQrcodeDataUrl,
  pollBilibiliLogin,
  startBilibiliLoginBackground,
  stopBilibiliLoginProcess
} from './services/bilibiliLogin'
import { listHistory } from './services/state'
import {
  getQueueRuntimeState,
  isQueueRunning,
  setQueueWindow,
  shutdownQueue,
  startQueue,
  stopQueue
} from './services/queue'
import { checkForUpdates, getUpdateStatus } from './services/updater'
import { resolvePreloadPath } from './utils/preloadPath'
import type { AppConfig } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  const preloadPath = resolvePreloadPath(__dirname)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0B0F17',
    title: 'Wallpaper Studio',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    setQueueWindow(mainWindow)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    void mainWindow?.webContents
      .executeJavaScript('Boolean(window.wallpaperStudio?.accountsBilibiliOpenLoginTerminal)', true)
      .then((ready) => {
        if (!ready) {
          console.error('[Wallpaper Studio] preload bridge not ready. Preload path:', preloadPath)
        }
      })
      .catch(() => undefined)
  })

  mainWindow.on('close', (event) => {
    if (isPipelineRunning()) {
      event.preventDefault()
      mainWindow?.webContents.send('pipeline:log', '任务运行中，已最小化到托盘')
      mainWindow?.hide()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Wallpaper Studio')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => mainWindow?.show()
      },
      {
        label: '退出',
        click: () => {
          app.exit(0)
        }
      }
    ])
  )
  tray.on('double-click', () => mainWindow?.show())
}

function registerIpc(): void {
  ipcMain.handle('deps:check', async () => {
    const config = loadConfig()
    return checkDeps(config)
  })

  ipcMain.handle('config:get', async () => loadConfig())

  ipcMain.handle('config:set', async (_event, config: AppConfig) => saveConfig(config))

  ipcMain.handle('accounts:bilibiliCheck', async () => {
    const config = loadConfig()
    try {
      return await bilibiliCheck(config)
    } catch (error) {
      return { valid: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('accounts:bilibiliLoginHint', async () => {
    const config = loadConfig()
    return getLoginHint(config)
  })

  ipcMain.handle('accounts:bilibiliOpenLoginTerminal', async () => {
    const setup = await ensureBilibiliCliInstalled()
    if (!setup.ok) {
      return { ok: false, message: setup.message }
    }
    const config = loadConfig()
    return openBilibiliLoginTerminal(config)
  })

  ipcMain.handle('accounts:bilibiliInstall', async () => {
    const cli = await installBilibiliCli()
    if (!cli.ok) {
      return cli
    }
    return await ensureBilibiliCliInstalled()
  })

  ipcMain.handle('accounts:bilibiliOpenQrcode', async () => {
    const config = loadConfig()
    const qrcodePath = getQrcodePath(config)
    const result = await shell.openPath(qrcodePath)
    if (result) {
      return { ok: false, message: `未找到二维码文件，请先在终端完成登录流程: ${qrcodePath}` }
    }
    return { ok: true, message: '已打开 qrcode.png' }
  })

  ipcMain.handle('accounts:bilibiliStartLogin', async () => {
    const setup = await ensureBilibiliCliInstalled()
    if (!setup.ok) {
      return { ok: false, message: setup.message }
    }
    const config = loadConfig()
    return startBilibiliLoginBackground(config)
  })

  ipcMain.handle('accounts:bilibiliGetQrcode', async () => {
    const config = loadConfig()
    return getBilibiliQrcodeDataUrl(config)
  })

  ipcMain.handle('accounts:bilibiliPollLogin', async () => {
    const config = loadConfig()
    return pollBilibiliLogin(config)
  })

  ipcMain.handle('accounts:bilibiliStopLogin', async () => {
    stopBilibiliLoginProcess()
    return { ok: true }
  })

  ipcMain.handle('accounts:baiduWhoami', async () => {
    const config = loadConfig()
    return baiduWhoami(config)
  })

  ipcMain.handle('accounts:baiduInstall', async () => installBdpan())

  ipcMain.handle('accounts:baiduOpenLoginTerminal', async () => {
    const setup = await ensureBdpanInstalled()
    if (!setup.ok) {
      return { ok: false, message: setup.message }
    }
    const config = loadConfig()
    return openBaiduLoginTerminal(config)
  })

  ipcMain.handle('preflight:run', async (_event, mode?: 'quick' | 'full') => {
    const config = loadConfig()
    return runPreflight(config, mode ?? 'full')
  })

  ipcMain.handle('python:detect', async () => detectPython())

  ipcMain.handle('shell:openPath', async (_event, targetPath: string) => {
    const result = await shell.openPath(targetPath)
    if (result) {
      return { ok: false, message: result }
    }
    return { ok: true, message: '已打开' }
  })

  ipcMain.handle('onboarding:complete', async () => {
    const config = loadConfig()
    config.onboarding.completed = true
    saveConfig(config)
    return { ok: true }
  })

  ipcMain.handle('panControl:test', async () => {
    const config = loadConfig()
    return testPanControlConnection(config)
  })

  ipcMain.handle('pipeline:run', async () => {
    const config = loadConfig()
    const preflight = await runPreflight(config, 'full')
    if (!preflight.ready) {
      return { ok: false, message: '环境未就绪，请先完成首次设置（安装工具、登录账号、配置 wdbzk Token）' }
    }
    return runPipeline(mainWindow)
  })

  ipcMain.handle('pipeline:cancel', async () => {
    cancelPipeline()
    return { ok: true }
  })

  ipcMain.handle('history:list', async () => listHistory())

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('queue:start', async () => startQueue(mainWindow))

  ipcMain.handle('queue:stop', async () => stopQueue())

  ipcMain.handle('queue:status', async () => getQueueRuntimeState())

  ipcMain.handle('queue:updateSettings', async (_event, settings: AppConfig['queue']) => {
    const config = loadConfig()
    config.queue = settings
    const saved = saveConfig(config)
    if (saved.queue.enabled && !isQueueRunning()) {
      startQueue(mainWindow)
    }
    if (!saved.queue.enabled && isQueueRunning()) {
      stopQueue()
    }
    return saved
  })

  ipcMain.handle('updater:getStatus', async () => getUpdateStatus())

  ipcMain.handle('updater:check', async (_event, force?: boolean) => checkForUpdates(force))
}

app.whenReady().then(async () => {
  registerIpc()

  const config = loadConfig()
  if (!config.onboarding.completed) {
    const preflight = await runPreflight(config, 'quick')
    if (preflight.ready) {
      config.onboarding.completed = true
      saveConfig(config)
    }
  }

  createWindow()
  createTray()

  void checkForUpdates(false)

  if (config.queue.enabled) {
    startQueue(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  shutdownQueue()
  if (isPipelineRunning()) {
    cancelPipeline()
  }
})
