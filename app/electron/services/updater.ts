import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/webB1an/bilibili-auto-upload/releases/latest'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface UpdateStatus {
  checking: boolean
  currentVersion: string
  latestVersion?: string
  updateAvailable: boolean
  releaseUrl?: string
  checkedAt?: string
  error?: string
}

interface UpdateCache {
  checkedAt: string
  status: Omit<UpdateStatus, 'checking' | 'currentVersion'>
}

let cachedStatus: UpdateStatus | null = null

function getCachePath(): string {
  return path.join(app.getPath('userData'), 'updater-cache.json')
}

function readCache(): UpdateCache | null {
  const cachePath = getCachePath()
  if (!fs.existsSync(cachePath)) return null
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as UpdateCache
  } catch {
    return null
  }
}

function writeCache(status: UpdateStatus): void {
  const cachePath = getCachePath()
  fs.mkdirSync(path.dirname(cachePath), { recursive: true })
  const payload: UpdateCache = {
    checkedAt: status.checkedAt ?? new Date().toISOString(),
    status: {
      latestVersion: status.latestVersion,
      updateAvailable: status.updateAvailable,
      releaseUrl: status.releaseUrl,
      checkedAt: status.checkedAt,
      error: status.error
    }
  }
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2), 'utf-8')
}

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
}

function isNewerVersion(current: string, latest: string): boolean {
  const a = parseVersion(current)
  const b = parseVersion(latest)
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (right > left) return true
    if (right < left) return false
  }
  return false
}

function fromCache(currentVersion: string): UpdateStatus | null {
  const cache = readCache()
  if (!cache) return null
  const age = Date.now() - new Date(cache.checkedAt).getTime()
  if (age > CHECK_INTERVAL_MS) return null
  return {
    checking: false,
    currentVersion,
    ...cache.status,
    checkedAt: cache.checkedAt
  }
}

export function getUpdateStatus(): UpdateStatus {
  const currentVersion = app.getVersion()
  if (cachedStatus && !cachedStatus.checking) {
    return { ...cachedStatus, currentVersion }
  }

  const fromDisk = fromCache(currentVersion)
  if (fromDisk) {
    cachedStatus = fromDisk
    return fromDisk
  }

  return {
    checking: false,
    currentVersion,
    updateAvailable: false
  }
}

export async function checkForUpdates(force = false): Promise<UpdateStatus> {
  const currentVersion = app.getVersion()

  if (!force) {
    const existing = fromCache(currentVersion)
    if (existing) {
      cachedStatus = existing
      return existing
    }
  }

  cachedStatus = { checking: true, currentVersion, updateAvailable: false }

  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Wallpaper-Studio' }
    })

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`)
    }

    const body = (await response.json()) as { tag_name?: string; html_url?: string }
    const latestVersion = (body.tag_name ?? '').replace(/^v/i, '')
    const updateAvailable = latestVersion ? isNewerVersion(currentVersion, latestVersion) : false

    const status: UpdateStatus = {
      checking: false,
      currentVersion,
      latestVersion: latestVersion || undefined,
      updateAvailable,
      releaseUrl: body.html_url,
      checkedAt: new Date().toISOString()
    }

    cachedStatus = status
    writeCache(status)
    return status
  } catch (error) {
    const status: UpdateStatus = {
      checking: false,
      currentVersion,
      updateAvailable: false,
      checkedAt: new Date().toISOString(),
      error: (error as Error).message || '检查更新失败'
    }
    cachedStatus = status
    return status
  }
}
