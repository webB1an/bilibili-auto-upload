import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

export const STORED_TOKEN_PLACEHOLDER = '__stored__'

interface SecretsFile {
  apiToken?: string
  minimaxApiKey?: string
  deepseekApiKey?: string
}

function getSecretsPath(): string {
  return path.join(app.getPath('userData'), 'secrets.json')
}

function readSecretsFile(): SecretsFile {
  const secretsPath = getSecretsPath()
  if (!fs.existsSync(secretsPath)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(secretsPath, 'utf-8')) as SecretsFile
  } catch {
    return {}
  }
}

function writeSecretsFile(data: SecretsFile): void {
  const secretsPath = getSecretsPath()
  fs.mkdirSync(path.dirname(secretsPath), { recursive: true })
  fs.writeFileSync(secretsPath, JSON.stringify(data, null, 2), 'utf-8')
}

function readStoredSecret(key: keyof SecretsFile): string {
  const encrypted = readSecretsFile()[key]
  if (!encrypted) return ''

  if (!safeStorage.isEncryptionAvailable()) {
    return encrypted
  }

  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return ''
  }
}

export function writeStoredApiToken(token: string): void {
  writeStoredSecret('apiToken', token)
}

function writeStoredSecret(key: keyof SecretsFile, token: string): void {
  const trimmed = token.trim()
  const current = readSecretsFile()
  if (!trimmed) {
    delete current[key]
    writeSecretsFile(current)
    return
  }

  if (!safeStorage.isEncryptionAvailable()) {
    writeSecretsFile({ ...current, [key]: trimmed })
    return
  }

  const encrypted = safeStorage.encryptString(trimmed).toString('base64')
  writeSecretsFile({ ...current, [key]: encrypted })
}

export function readStoredApiToken(): string {
  return readStoredSecret('apiToken')
}

export function readStoredMinimaxApiKey(): string {
  return readStoredSecret('minimaxApiKey')
}

export function readStoredDeepseekApiKey(): string {
  return readStoredSecret('deepseekApiKey')
}

export function writeStoredMinimaxApiKey(token: string): void {
  writeStoredSecret('minimaxApiKey', token)
}

export function writeStoredDeepseekApiKey(token: string): void {
  writeStoredSecret('deepseekApiKey', token)
}

export function migratePlaintextApiToken(plainToken: string): boolean {
  return migratePlaintextSecret(plainToken, writeStoredApiToken)
}

export function migratePlaintextSecret(
  plainToken: string,
  writeStored: (token: string) => void
): boolean {
  const trimmed = plainToken.trim()
  if (!trimmed || trimmed === STORED_TOKEN_PLACEHOLDER) {
    return false
  }
  writeStored(trimmed)
  return true
}

export function resolveApiTokenForRead(configToken: string): string {
  return resolveSecretForRead(configToken, readStoredApiToken)
}

export function resolveSecretForRead(configToken: string, readStored: () => string): string {
  const fromConfig = configToken?.trim() ?? ''
  if (fromConfig && fromConfig !== STORED_TOKEN_PLACEHOLDER) {
    return fromConfig
  }
  return readStored()
}

export function prepareApiTokenForSave(nextToken: string, previousToken: string): string {
  const trimmed = nextToken.trim()
  if (!trimmed) {
    writeStoredApiToken('')
    return ''
  }

  if (trimmed === STORED_TOKEN_PLACEHOLDER) {
    return readStoredApiToken() ? STORED_TOKEN_PLACEHOLDER : ''
  }

  if (trimmed !== previousToken.trim()) {
    writeStoredApiToken(trimmed)
  }

  return STORED_TOKEN_PLACEHOLDER
}

export function prepareSecretForSave(
  nextToken: string,
  previousToken: string,
  readStored: () => string,
  writeStored: (token: string) => void
): string {
  const trimmed = nextToken.trim()
  if (!trimmed) {
    writeStored('')
    return ''
  }

  if (trimmed === STORED_TOKEN_PLACEHOLDER) {
    return readStored() ? STORED_TOKEN_PLACEHOLDER : ''
  }

  if (trimmed !== previousToken.trim()) {
    writeStored(trimmed)
  }

  return STORED_TOKEN_PLACEHOLDER
}
