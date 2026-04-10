import {
  isGoogleAppsScriptExecUrl,
  isPlaceholderUrl,
  loadMergedEnv,
  summarizeUrl,
} from './utils/env.mjs'

const env = loadMergedEnv()

const checks = [
  { key: 'SITE_CONTENT_SCRIPT_URL', label: 'Dynamic content endpoint' },
  { key: 'NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL', label: 'Care group submission endpoint' },
  { key: 'NEXT_PUBLIC_MINISTRY_SCRIPT_URL', label: 'Ministry submission endpoint' },
]

let hasError = false

console.log('Apps Script configuration validation')
console.log('')

for (const check of checks) {
  const value = env[check.key] ?? ''

  if (isPlaceholderUrl(value)) {
    console.error(`ERROR ${check.key}: missing or still using a placeholder value`)
    hasError = true
    continue
  }

  if (!isGoogleAppsScriptExecUrl(value)) {
    console.error(`ERROR ${check.key}: not a valid Google Apps Script /exec URL`)
    console.error(`      value: ${summarizeUrl(value)}`)
    hasError = true
    continue
  }

  console.log(`OK    ${check.key}: ${summarizeUrl(value)}`)
}

const uniqueUrls = new Set(checks.map(check => env[check.key]).filter(Boolean))

if (uniqueUrls.size > 1) {
  console.warn('')
  console.warn('WARN  The Apps Script URLs are not identical.')
  console.warn('      This can be intentional, but most setups use the same /exec URL for all three.')
}

if (hasError) {
  process.exit(1)
}

console.log('')
console.log('Apps Script configuration looks valid.')
