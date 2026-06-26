import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

export const STORED_TOKEN_PLACEHOLDER = '__stored__'

interface SecretsFile {
  apiToken?: string
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

export function readStoredApiToken(): string {
  const encrypted = readSecretsFile().apiToken
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
  const trimmed = token.trim()
  if (!trimmed) {
    writeSecretsFile({})
    return
  }

  if (!safeStorage.isEncryptionAvailable()) {
    writeSecretsFile({ apiToken: trimmed })
    return
  }

  const encrypted = safeStorage.encryptString(trimmed).toString('base64')
  writeSecretsFile({ apiToken: encrypted })
}

export function migratePlaintextApiToken(plainToken: string): boolean {
  const trimmed = plainToken.trim()
  if (!trimmed || trimmed === STORED_TOKEN_PLACEHOLDER) {
    return false
  }
  writeStoredApiToken(trimmed)
  return true
}

export function resolveApiTokenForRead(configToken: string): string {
  const fromConfig = configToken?.trim() ?? ''
  if (fromConfig && fromConfig !== STORED_TOKEN_PLACEHOLDER) {
    return fromConfig
  }
  return readStoredApiToken()
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
