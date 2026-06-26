import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { getDefaultConfig, mergeConfig } from './defaults'

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export function loadConfig(): AppConfig {
  const defaults = getDefaultConfig()
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8')
    return defaults
  }
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<AppConfig>
    return mergeConfig(raw, defaults)
  } catch {
    return defaults
  }
}

export function saveConfig(config: AppConfig): AppConfig {
  const merged = mergeConfig(config, getDefaultConfig())
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8')
  return merged
}

export function getConfig(): AppConfig {
  return loadConfig()
}
