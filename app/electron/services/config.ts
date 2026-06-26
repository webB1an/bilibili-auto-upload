import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { getDefaultConfig, mergeConfig } from './defaults'
import {
  migratePlaintextApiToken,
  prepareApiTokenForSave,
  readStoredApiToken,
  resolveApiTokenForRead,
  STORED_TOKEN_PLACEHOLDER
} from './secrets'

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function hydrateConfig(config: AppConfig): AppConfig {
  return {
    ...config,
    panControl: {
      ...config.panControl,
      apiToken: resolveApiTokenForRead(config.panControl.apiToken)
    }
  }
}

function writeDiskConfig(config: AppConfig): void {
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export function loadConfig(): AppConfig {
  const defaults = getDefaultConfig()
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    writeDiskConfig(defaults)
    return defaults
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<AppConfig>
    const merged = mergeConfig(raw, defaults)

    if (migratePlaintextApiToken(merged.panControl.apiToken)) {
      merged.panControl.apiToken = STORED_TOKEN_PLACEHOLDER
      writeDiskConfig(merged)
    }

    return hydrateConfig(merged)
  } catch {
    return defaults
  }
}

export function saveConfig(config: AppConfig): AppConfig {
  const defaults = getDefaultConfig()
  const merged = mergeConfig(config, defaults)
  const previousToken = resolveApiTokenForRead(loadConfig().panControl.apiToken)

  prepareApiTokenForSave(merged.panControl.apiToken, previousToken)

  const hasToken = Boolean(merged.panControl.apiToken.trim() || readStoredApiToken())
  const diskConfig: AppConfig = {
    ...merged,
    panControl: {
      ...merged.panControl,
      apiToken: hasToken ? STORED_TOKEN_PLACEHOLDER : ''
    }
  }

  writeDiskConfig(diskConfig)
  return hydrateConfig(diskConfig)
}

export function getConfig(): AppConfig {
  return loadConfig()
}
