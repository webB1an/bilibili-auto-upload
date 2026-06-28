import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { AppState, HistoryRecord } from '../../src/types'

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'state.json')
}

function emptyState(): AppState {
  return { postedDetailUrls: [], history: [] }
}

export function loadState(): AppState {
  const statePath = getStatePath()
  if (!fs.existsSync(statePath)) {
    return emptyState()
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf-8')) as AppState
    return {
      postedDetailUrls: parsed.postedDetailUrls ?? [],
      history: parsed.history ?? []
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  const statePath = getStatePath()
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

export function isDetailUrlPosted(detailUrl: string): boolean {
  return loadState().postedDetailUrls.includes(detailUrl)
}

export function markDetailUrlPosted(detailUrl: string): void {
  const state = loadState()
  if (!state.postedDetailUrls.includes(detailUrl)) {
    state.postedDetailUrls.push(detailUrl)
  }
  const MAX_POSTED_URLS = 2000
  if (state.postedDetailUrls.length > MAX_POSTED_URLS) {
    state.postedDetailUrls = state.postedDetailUrls.slice(-MAX_POSTED_URLS)
  }
  saveState(state)
}

export function addHistoryRecord(record: Omit<HistoryRecord, 'id' | 'createdAt'>): HistoryRecord {
  const state = loadState()
  const full: HistoryRecord = {
    ...record,
    id: randomUUID(),
    createdAt: new Date().toISOString()
  }
  state.history.unshift(full)
  if (state.history.length > 200) {
    state.history = state.history.slice(0, 200)
  }
  saveState(state)
  return full
}

export function updateHistoryRecord(id: string, patch: Partial<HistoryRecord>): HistoryRecord | null {
  const state = loadState()
  const index = state.history.findIndex((item) => item.id === id)
  if (index < 0) return null
  state.history[index] = { ...state.history[index], ...patch }
  saveState(state)
  return state.history[index]
}

export function listHistory(): HistoryRecord[] {
  return loadState().history
}

/** 最近一条未完成且本地文件仍在的任务，用于断点续传 */
export function findResumablePipelineJob(): HistoryRecord | null {
  for (const record of loadState().history) {
    if (record.status === 'success' || record.bilibiliStatus === 'success') continue
    if (record.bilibiliStatus === 'skipped') continue
    if (record.error === '已放弃续传') continue
    if (!record.localPath || !fs.existsSync(record.localPath)) continue
    return record
  }
  return null
}

export function abandonHistoryRecord(id: string, deleteLocal = false): HistoryRecord | null {
  const state = loadState()
  const index = state.history.findIndex((item) => item.id === id)
  if (index < 0) return null

  const record = state.history[index]
  if (deleteLocal && record.localPath && fs.existsSync(record.localPath)) {
    try {
      fs.unlinkSync(record.localPath)
    } catch {
      // ignore
    }
  }

  state.history[index] = {
    ...record,
    status: 'failed',
    bilibiliStatus: 'failed',
    error: '已放弃续传',
    bilibiliMessage: '已放弃续传'
  }
  saveState(state)
  return state.history[index]
}

export function getTodayStats(): { published: number; failed: number; partial: number } {
  const today = new Date().toISOString().slice(0, 10)
  const records = loadState().history.filter((item) => item.createdAt.startsWith(today))
  return {
    published: records.filter((item) => item.status === 'success').length,
    failed: records.filter((item) => item.status === 'failed').length,
    partial: records.filter((item) => item.status === 'partial').length
  }
}
