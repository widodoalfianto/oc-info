import { NextResponse } from 'next/server'

type FormType = 'care-group' | 'ministry'

const SCRIPT_URLS: Record<FormType, string> = {
  'care-group': process.env.NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL ?? '',
  ministry: process.env.NEXT_PUBLIC_MINISTRY_SCRIPT_URL ?? '',
}

const MAX_LENGTHS = {
  name: 100,
  email: 160,
  phone: 40,
  selection: 120,
  website: 120,
}

const MIN_SUBMIT_DELAY_MS = 2_000
const MAX_SUBMIT_AGE_MS = 24 * 60 * 60 * 1_000

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPhone(value: string) {
  if (!/^\+?[\d\s().-]+$/.test(value)) {
    return false
  }

  const digits = value.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

function isSupportedFormType(value: string): value is FormType {
  return value === 'care-group' || value === 'ministry'
}

function buildSelectionField(formType: FormType) {
  return formType === 'care-group' ? 'careGroupName' : 'ministryName'
}

function validateLengths(fields: Record<string, string>) {
  for (const [key, value] of Object.entries(fields)) {
    const maxLength = MAX_LENGTHS[key as keyof typeof MAX_LENGTHS]

    if (maxLength && value.length > maxLength) {
      throw new Error(`${key} is too long.`)
    }
  }
}

async function parseScriptResponse(response: Response) {
  const text = await response.text()

  try {
    return JSON.parse(text) as { ok?: boolean; error?: string }
  } catch {
    return {
      ok: false,
      error: `Unexpected Apps Script response: ${text.slice(0, 200)}`,
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const formType = normalizeText(formData.get('formType'))
    const name = normalizeText(formData.get('name'))
    const email = normalizeText(formData.get('email'))
    const phone = normalizeText(formData.get('phone'))
    const whatsAppConsent = normalizeText(formData.get('whatsAppConsent'))
    const startedAt = normalizeText(formData.get('startedAt'))
    const website = normalizeText(formData.get('website'))

    if (!isSupportedFormType(formType)) {
      return NextResponse.json({ ok: false, error: 'Unsupported form type.' }, { status: 400 })
    }

    if (website) {
      return NextResponse.json({ ok: true })
    }

    const selectionField = buildSelectionField(formType)
    const selectionValue = normalizeText(formData.get(selectionField))
    const startedAtMs = Number(startedAt)
    const elapsedMs = Date.now() - startedAtMs

    validateLengths({
      name,
      email,
      phone,
      selection: selectionValue,
      website,
    })

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Please enter your name.' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json(
        { ok: false, error: 'Please share an email address, a phone number, or both.' },
        { status: 400 }
      )
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid phone number.' }, { status: 400 })
    }

    if (!selectionValue) {
      return NextResponse.json(
        { ok: false, error: `Please choose ${formType === 'care-group' ? 'a care group' : 'a ministry'} first.` },
        { status: 400 }
      )
    }

    if (!Number.isFinite(startedAtMs)) {
      return NextResponse.json({ ok: false, error: 'Form session is invalid. Please reload and try again.' }, { status: 400 })
    }

    if (elapsedMs < MIN_SUBMIT_DELAY_MS) {
      return NextResponse.json({ ok: false, error: 'Please take a moment to complete the form.' }, { status: 400 })
    }

    if (elapsedMs > MAX_SUBMIT_AGE_MS) {
      return NextResponse.json({ ok: false, error: 'This form session expired. Please refresh and try again.' }, { status: 400 })
    }

    const scriptUrl = SCRIPT_URLS[formType]

    if (!scriptUrl || scriptUrl.includes('YOUR_')) {
      return NextResponse.json({ ok: false, error: 'Form submissions are not configured yet.' }, { status: 500 })
    }

    const payload = new URLSearchParams({
      formType,
      name,
      email,
      phone,
      whatsAppConsent,
      startedAt,
      website,
      [selectionField]: selectionValue,
    })

    const sharedSecret = process.env.APPS_SCRIPT_SHARED_SECRET?.trim()

    if (sharedSecret) {
      payload.append('sharedSecret', sharedSecret)
    }

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: payload,
      cache: 'no-store',
    })

    const result = await parseScriptResponse(response)

    if (!response.ok || result.ok !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'Submission could not be completed.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Something went wrong. Please try again or contact the team directly.',
      },
      { status: 500 }
    )
  }
}
