import { loadMergedEnv } from './utils/env.mjs'

const env = loadMergedEnv()
const modeArg = process.argv.find(arg => arg.startsWith('--mode=')) ?? '--mode=all'
const mode = modeArg.split('=')[1]

const contentUrl = env.SITE_CONTENT_SCRIPT_URL ?? ''
const careUrl = env.NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL ?? ''
const ministryUrl = env.NEXT_PUBLIC_MINISTRY_SCRIPT_URL ?? ''
const sharedSecret = env.APPS_SCRIPT_SHARED_SECRET ?? ''

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function parseJsonResponse(response) {
  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON response but received: ${text.slice(0, 300)}`)
  }
}

async function testContentEndpoint() {
  assert(contentUrl, 'SITE_CONTENT_SCRIPT_URL is missing')

  console.log(`GET ${contentUrl}`)
  const response = await fetch(contentUrl)
  assert(response.ok, `Content request failed with status ${response.status}`)

  const payload = await parseJsonResponse(response)

  assert(Array.isArray(payload.ministryTeams), 'Response is missing ministryTeams array')
  assert(Array.isArray(payload.careGroups), 'Response is missing careGroups array')
  assert(payload.ministryTeams.length > 0, 'ministryTeams is empty')
  assert(payload.careGroups.length > 0, 'careGroups is empty')

  for (const team of payload.ministryTeams) {
    assert(typeof team.name === 'string' && team.name.trim(), 'A ministry team is missing name')
    assert(typeof team.leader === 'string' && team.leader.trim(), 'A ministry team is missing leader')
  }

  for (const group of payload.careGroups) {
    assert(typeof group.name === 'string' && group.name.trim(), 'A care group is missing name')
    assert(typeof group.leader === 'string' && group.leader.trim(), 'A care group is missing leader')
    assert(typeof group.meets === 'string' && group.meets.trim(), 'A care group is missing meets')
  }

  console.log(`OK content endpoint returned ${payload.ministryTeams.length} ministry teams and ${payload.careGroups.length} care groups`)
}

async function postForm(url, body, label) {
  assert(url, `${label} URL is missing`)

  console.log(`POST ${label}`)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams(body),
  })

  assert(response.ok, `${label} request failed with status ${response.status}`)
  const payload = await parseJsonResponse(response)
  assert(payload.ok === true, `${label} response did not return ok=true`)
  console.log(`OK ${label} response accepted`)
}

async function testPostEndpoints() {
  const marker = `AUTOMATED_TEST_${new Date().toISOString()}`
  const startedAt = String(Date.now() - 5_000)

  await postForm(
    careUrl,
    {
      formType: 'care-group',
      name: marker,
      email: 'test@example.com',
      phone: '+1 (949) 555-0000',
      whatsAppConsent: 'Yes',
      careGroupName: 'Family',
      startedAt,
      website: '',
      sharedSecret,
    },
    'care-group submission'
  )

  await postForm(
    ministryUrl,
    {
      formType: 'ministry',
      name: marker,
      email: 'test@example.com',
      phone: '+1 (949) 555-0000',
      whatsAppConsent: 'Yes',
      ministryName: 'Worship',
      startedAt,
      website: '',
      sharedSecret,
    },
    'ministry submission'
  )

  console.log(`OK posted smoke rows with marker ${marker}`)
  console.log('Check the Google Sheets response tabs if you want to confirm the inserted rows manually.')
}

async function main() {
  if (!['get', 'post', 'all'].includes(mode)) {
    throw new Error(`Unsupported mode "${mode}". Use --mode=get, --mode=post, or --mode=all.`)
  }

  if (mode === 'get' || mode === 'all') {
    await testContentEndpoint()
  }

  if (mode === 'post' || mode === 'all') {
    await testPostEndpoints()
  }
}

main().catch(error => {
  console.error('')
  console.error('Apps Script smoke test failed.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
