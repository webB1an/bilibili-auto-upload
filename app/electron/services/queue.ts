import type { BrowserWindow } from 'electron'
import type { AppConfig, QueueRuntimeState } from '../../src/types'
import { loadConfig } from './config'
import { runPreflight } from './preflight'
import { isPipelineRunning, runPipeline } from './pipeline'
import { getTodayStats } from './state'

let timer: ReturnType<typeof setTimeout> | null = null
let running = false
let lastMessage = ''
let lastRunAt: string | undefined
let nextRunAt: string | undefined
let mainWindow: BrowserWindow | null = null

function emitStatus(): void {
  mainWindow?.webContents.send('queue:status', getQueueRuntimeState())
}

export function getQueueRuntimeState(): QueueRuntimeState {
  const stats = getTodayStats()
  return {
    running,
    publishedToday: stats.published,
    failedToday: stats.failed,
    lastRunAt,
    nextRunAt,
    lastMessage
  }
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function scheduleNext(config: AppConfig): void {
  clearTimer()
  if (!running) return

  const delayMs = Math.max(1, config.queue.intervalMinutes) * 60_000
  nextRunAt = new Date(Date.now() + delayMs).toISOString()
  emitStatus()

  timer = setTimeout(() => {
    void queueTick()
  }, delayMs)
}

async function queueTick(): Promise<void> {
  if (!running) return

  const config = loadConfig()
  const stats = getTodayStats()

  if (stats.published >= config.queue.dailyLimit) {
    lastMessage = `已达今日上限 ${config.queue.dailyLimit} 条，队列已暂停`
    running = false
    nextRunAt = undefined
    emitStatus()
    return
  }

  if (isPipelineRunning()) {
    lastMessage = '上一条任务仍在运行，稍后重试'
    scheduleNext(config)
    return
  }

  const preflight = await runPreflight(config, 'full')
  if (!preflight.ready) {
    lastMessage = '环境未就绪，队列已暂停'
    if (config.queue.stopOnError) {
      running = false
      nextRunAt = undefined
      emitStatus()
      return
    }
    scheduleNext(config)
    return
  }

  lastRunAt = new Date().toISOString()
  lastMessage = '队列触发发布...'
  emitStatus()

  const result = await runPipeline(mainWindow)
  lastRunAt = new Date().toISOString()

  if (result.ok) {
    lastMessage = result.skipped
      ? `已跳过: ${result.message}`
      : result.message || '发布成功'
  } else {
    lastMessage = result.message || '发布失败'
    if (config.queue.stopOnError) {
      running = false
      nextRunAt = undefined
      emitStatus()
      return
    }
  }

  emitStatus()
  scheduleNext(loadConfig())
}

export function startQueue(window: BrowserWindow | null): { ok: boolean; message: string } {
  mainWindow = window
  if (running) {
    return { ok: true, message: '队列已在运行' }
  }

  running = true
  lastMessage = '队列已启动'
  nextRunAt = new Date().toISOString()
  emitStatus()

  void queueTick()
  return { ok: true, message: '队列已启动' }
}

export function stopQueue(): { ok: boolean; message: string } {
  running = false
  clearTimer()
  nextRunAt = undefined
  lastMessage = '队列已停止'
  emitStatus()
  return { ok: true, message: '队列已停止' }
}

export function isQueueRunning(): boolean {
  return running
}

export function setQueueWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

export function shutdownQueue(): void {
  stopQueue()
}
