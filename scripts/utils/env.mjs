import fs from 'node:fs'
import path from 'node:path'

function parseEnvLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const separatorIndex = trimmed.indexOf('=')

  if (separatorIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, separatorIndex).trim()
  let value = trimmed.slice(separatorIndex + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const contents = fs.readFileSync(filePath, 'utf8')
  const values = {}

  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line)
    if (parsed) {
      values[parsed.key] = parsed.value
    }
  }

  return values
}

export function loadMergedEnv(cwd = process.cwd()) {
  const baseEnv = parseEnvFile(path.join(cwd, '.env'))
  const localEnv = parseEnvFile(path.join(cwd, '.env.local'))

  return {
    ...baseEnv,
    ...localEnv,
    ...process.env,
  }
}

export function isPlaceholderUrl(value) {
  return !value || value.includes('YOUR_')
}

export function isGoogleAppsScriptExecUrl(value) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'script.google.com' &&
      url.pathname.includes('/macros/s/') &&
      url.pathname.endsWith('/exec')
    )
  } catch {
    return false
  }
}

export function summarizeUrl(value) {
  if (!value) {
    return '(missing)'
  }

  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}
