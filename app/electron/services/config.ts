import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppConfig } from '../../src/types'
import { getDefaultConfig, mergeConfig } from './defaults'
import {
  migratePlaintextApiToken,
  migratePlaintextSecret,
  prepareApiTokenForSave,
  prepareSecretForSave,
  readStoredDeepseekApiKey,
  readStoredApiToken,
  readStoredMinimaxApiKey,
  resolveApiTokenForRead,
  resolveSecretForRead,
  STORED_TOKEN_PLACEHOLDER,
  writeStoredDeepseekApiKey,
  writeStoredMinimaxApiKey
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
    },
    translation: {
      ...config.translation,
      minimaxApiKey: resolveSecretForRead(config.translation.minimaxApiKey, readStoredMinimaxApiKey),
      deepseekApiKey: resolveSecretForRead(config.translation.deepseekApiKey, readStoredDeepseekApiKey)
    }
  }
}

function writeDiskConfig(config: AppConfig): void {
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

function readDiskConfig(): Partial<AppConfig> | null {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) return null

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<AppConfig>
  } catch {
    return null
  }
}

function preserveUserValue<T>(
  incoming: T,
  current: T | undefined,
  defaultValue: T,
  staleDefaultValues: T[] = [],
  protectDefault = true
): T {
  if (current === undefined) return incoming
  if (((protectDefault && incoming === defaultValue) || staleDefaultValues.includes(incoming)) && current !== incoming) {
    return current
  }
  return incoming
}

function preserveUserArray(
  incoming: string[],
  current: string[] | undefined,
  defaultValue: string[],
  protectDefault = true
): string[] {
  if (!current) return incoming
  const incomingIsDefault = sameStringArray(incoming, defaultValue)
  const currentIsDefault = sameStringArray(current, defaultValue)

  if (protectDefault && incomingIsDefault && !currentIsDefault) {
    return current
  }
  return incoming
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

export function protectAgainstStaleDefaultSave(
  incoming: AppConfig,
  current: AppConfig | null,
  defaults: AppConfig
): AppConfig {
  if (!current) return incoming

  const incomingLooksLikeLegacyDefaultSnapshot =
    incoming.bilibili.accountName === 'creator' || incoming.bgm.libraryPath === ''

  return {
    ...incoming,
    bilibili: {
      ...incoming.bilibili,
      accountName: preserveUserValue(
        incoming.bilibili.accountName,
        current.bilibili.accountName,
        defaults.bilibili.accountName,
        incomingLooksLikeLegacyDefaultSnapshot ? ['creator'] : [],
        incomingLooksLikeLegacyDefaultSnapshot
      ),
      descTemplate: preserveUserValue(
        incoming.bilibili.descTemplate,
        current.bilibili.descTemplate,
        defaults.bilibili.descTemplate,
        [],
        incomingLooksLikeLegacyDefaultSnapshot
      ),
      tags: preserveUserArray(
        incoming.bilibili.tags,
        current.bilibili.tags,
        defaults.bilibili.tags,
        incomingLooksLikeLegacyDefaultSnapshot
      )
    },
    download: {
      ...incoming.download,
      sources: preserveUserArray(
        incoming.download.sources,
        current.download.sources,
        defaults.download.sources,
        incomingLooksLikeLegacyDefaultSnapshot
      )
    },
    bgm: {
      ...incoming.bgm,
      libraryPath: preserveUserValue(
        incoming.bgm.libraryPath,
        current.bgm.libraryPath,
        defaults.bgm.libraryPath,
        incomingLooksLikeLegacyDefaultSnapshot ? [''] : [],
        incomingLooksLikeLegacyDefaultSnapshot
      )
    },
    translation: {
      ...incoming.translation,
      provider: preserveUserValue(
        incoming.translation.provider,
        current.translation.provider,
        defaults.translation.provider,
        incomingLooksLikeLegacyDefaultSnapshot ? ['google'] : [],
        incomingLooksLikeLegacyDefaultSnapshot
      )
    }
  }
}

export function loadConfig(): AppConfig {
  const defaults = getDefaultConfig()
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    writeDiskConfig(defaults)
    return defaults
  }

  try {
    const raw = readDiskConfig() ?? {}
    const merged = mergeConfig(raw, defaults)
    const rawSources = raw.download?.sources ?? []
    const mergedSources = merged.download.sources
    const sourcesChanged =
      rawSources.length !== mergedSources.length ||
      rawSources.some((source, index) => source !== mergedSources[index])
    let needsWrite = sourcesChanged || raw.bilibili?.tid !== merged.bilibili.tid

    if (migratePlaintextApiToken(merged.panControl.apiToken)) {
      merged.panControl.apiToken = STORED_TOKEN_PLACEHOLDER
      needsWrite = true
    }
    if (migratePlaintextSecret(merged.translation.minimaxApiKey, writeStoredMinimaxApiKey)) {
      merged.translation.minimaxApiKey = STORED_TOKEN_PLACEHOLDER
      needsWrite = true
    }
    if (migratePlaintextSecret(merged.translation.deepseekApiKey, writeStoredDeepseekApiKey)) {
      merged.translation.deepseekApiKey = STORED_TOKEN_PLACEHOLDER
      needsWrite = true
    }

    if (needsWrite) {
      writeDiskConfig(merged)
    }

    return hydrateConfig(merged)
  } catch {
    return defaults
  }
}

export function saveConfig(config: AppConfig): AppConfig {
  const defaults = getDefaultConfig()
  const current = readDiskConfig()
  const currentMerged = current ? mergeConfig(current, defaults) : null
  const merged = protectAgainstStaleDefaultSave(mergeConfig(config, defaults), currentMerged, defaults)
  const previousToken = resolveApiTokenForRead((currentMerged ?? loadConfig()).panControl.apiToken)
  const previousMinimaxKey = readStoredMinimaxApiKey()
  const previousDeepseekKey = readStoredDeepseekApiKey()

  prepareApiTokenForSave(merged.panControl.apiToken, previousToken)
  const minimaxApiKey = prepareSecretForSave(
    merged.translation.minimaxApiKey,
    previousMinimaxKey,
    readStoredMinimaxApiKey,
    writeStoredMinimaxApiKey
  )
  const deepseekApiKey = prepareSecretForSave(
    merged.translation.deepseekApiKey,
    previousDeepseekKey,
    readStoredDeepseekApiKey,
    writeStoredDeepseekApiKey
  )

  const hasToken = Boolean(merged.panControl.apiToken.trim() || readStoredApiToken())
  const hasMinimaxApiKey = Boolean(minimaxApiKey)
  const hasDeepseekApiKey = Boolean(deepseekApiKey)
  const diskConfig: AppConfig = {
    ...merged,
    panControl: {
      ...merged.panControl,
      apiToken: hasToken ? STORED_TOKEN_PLACEHOLDER : ''
    },
    translation: {
      ...merged.translation,
      minimaxApiKey: hasMinimaxApiKey ? STORED_TOKEN_PLACEHOLDER : '',
      deepseekApiKey: hasDeepseekApiKey ? STORED_TOKEN_PLACEHOLDER : ''
    }
  }

  writeDiskConfig(diskConfig)
  return hydrateConfig(diskConfig)
}

export function getConfig(): AppConfig {
  return loadConfig()
}
