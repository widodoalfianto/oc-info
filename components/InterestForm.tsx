'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'

type FormType = 'care-group' | 'ministry'

interface InterestFormProps {
  formType: FormType
  isConfigured: boolean
  options: string[]
  optionsLoading?: boolean
}

interface InterestFormState {
  name: string
  email: string
  phone: string
  whatsAppConsent: boolean
  selection: string
  website: string
}

const FORM_COPY = {
  'care-group': {
    configKey: 'NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL',
    selectionField: 'careGroupName',
    selectionLabel: 'Which care group would you like to join?',
    selectionPlaceholder: 'Select a care group',
    successHeading: 'Care group request sent.',
  },
  ministry: {
    configKey: 'NEXT_PUBLIC_MINISTRY_SCRIPT_URL',
    selectionField: 'ministryName',
    selectionLabel: 'Which ministry would you like to join?',
    selectionPlaceholder: 'Select a ministry',
    successHeading: 'Ministry request sent.',
  },
} as const

const INITIAL_FORM_STATE: InterestFormState = {
  name: '',
  email: '',
  phone: '',
  whatsAppConsent: false,
  selection: '',
  website: '',
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

export default function InterestForm({
  formType,
  isConfigured,
  options,
  optionsLoading = false,
}: InterestFormProps) {
  const copy = FORM_COPY[formType]
  const hasOptions = options.length > 0

  const [formData, setFormData] = useState<InterestFormState>(INITIAL_FORM_STATE)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [startedAt, setStartedAt] = useState(() => Date.now())

  const hasPhone = formData.phone.trim() !== ''
  const hasContactMethod = formData.email.trim() !== '' || hasPhone

  const handleValueChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target

    setFormData(previous => {
      const next = {
        ...previous,
        [name]: value,
      } as InterestFormState

      if (name === 'phone' && value.trim() === '') {
        next.whatsAppConsent = false
      }

      return next
    })
  }

  const handleWhatsAppChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData(previous => ({
      ...previous,
      whatsAppConsent: event.target.checked,
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (!isConfigured) {
      setStatus('error')
      setErrorMessage(`Form submissions are not configured yet. Set ${copy.configKey} in your environment file.`)
      return
    }

    if (!formData.name.trim()) {
      setStatus('error')
      setErrorMessage('Please enter your name.')
      return
    }

    if (!hasContactMethod) {
      setStatus('error')
      setErrorMessage('Please share an email address, a phone number, or both.')
      return
    }

    if (formData.email.trim() && !isValidEmail(formData.email.trim())) {
      setStatus('error')
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (hasPhone && !isValidPhone(formData.phone.trim())) {
      setStatus('error')
      setErrorMessage('Please enter a valid phone number.')
      return
    }

    if (optionsLoading) {
      setStatus('error')
      setErrorMessage(`We're still loading ${formType === 'care-group' ? 'care groups' : 'ministries'}. Please wait a moment.`)
      return
    }

    if (!hasOptions) {
      setStatus('error')
      setErrorMessage('No options are available yet. Add them to the spreadsheet first.')
      return
    }

    if (!formData.selection.trim()) {
      setStatus('error')
      setErrorMessage(`Please choose ${formType === 'care-group' ? 'a care group' : 'a ministry'} first.`)
      return
    }

    setStatus('submitting')

    try {
      const payload = new FormData()
      payload.append('formType', formType)
      payload.append('name', formData.name.trim())
      payload.append('email', formData.email.trim())
      payload.append('phone', formData.phone.trim())
      payload.append('whatsAppConsent', hasPhone && formData.whatsAppConsent ? 'Yes' : 'No')
      payload.append(copy.selectionField, formData.selection.trim())

      payload.append('startedAt', String(startedAt))
      payload.append('website', formData.website)

      const response = await fetch('/api/forms', {
        method: 'POST',
        body: payload,
      })

      const result = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || 'Something went wrong. Please try again or contact the team directly.')
      }

      setStatus('success')
      setFormData(INITIAL_FORM_STATE)
      setStartedAt(Date.now())
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again or contact the team directly.'
      )
    }
  }

  if (status === 'success') {
    return (
      <div className="border-t border-white/10 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Sent</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">{copy.successHeading}</h3>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          We&apos;ve received your request and we&apos;ll route it to the right leader for follow-up.
        </p>
        <button
          onClick={() => {
            setStatus('idle')
            setErrorMessage('')
            setStartedAt(Date.now())
          }}
          className="btn-outline mt-8"
        >
          Submit Another Response
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/10 pt-8">
      {!isConfigured && (
        <p className="max-w-2xl text-sm leading-relaxed text-amber-200">
          Form submission is not configured yet. Add{' '}
          <code className="border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            {copy.configKey}
          </code>{' '}
          to your environment file.
        </p>
      )}

      {!optionsLoading && !hasOptions && (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-amber-200">
          No {formType === 'care-group' ? 'care groups' : 'ministries'} are available yet. Add rows to the
          spreadsheet first.
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website" className="form-label">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website}
            onChange={handleValueChange}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="name" className="form-label">
            Name <span className="text-rose-300">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleValueChange}
            placeholder="Your name"
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="selection" className="form-label">
            {copy.selectionLabel} <span className="text-rose-300">*</span>
          </label>
          <select
            id="selection"
            name="selection"
            required
            value={formData.selection}
            onChange={handleValueChange}
            disabled={optionsLoading || !hasOptions}
            className="form-select"
          >
            <option value="">
              {optionsLoading
                ? `Loading ${formType === 'care-group' ? 'care groups' : 'ministries'}...`
                : copy.selectionPlaceholder}
            </option>
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {optionsLoading && <div className="mt-3 h-3 w-36 animate-pulse bg-white/6" />}
        </div>

        <div>
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleValueChange}
            placeholder="you@example.com"
            inputMode="email"
            className={`form-input ${(!hasContactMethod || errorMessage === 'Please enter a valid email address.') && status === 'error' ? 'border-rose-300/60' : ''}`}
          />
        </div>

        <div>
          <label htmlFor="phone" className="form-label">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleValueChange}
            placeholder="+1 (555) 000-0000"
            inputMode="tel"
            className={`form-input ${(!hasContactMethod || errorMessage === 'Please enter a valid phone number.') && status === 'error' ? 'border-rose-300/60' : ''}`}
          />
        </div>

        {hasPhone && (
          <label className="md:col-span-2 flex items-start gap-3 border-t border-white/10 pt-5 text-sm leading-relaxed text-zinc-400">
            <input
              name="whatsAppConsent"
              type="checkbox"
              checked={formData.whatsAppConsent}
              onChange={handleWhatsAppChange}
              className="mt-0.5 h-4 w-4 rounded-none border border-white/20 bg-transparent text-white focus:ring-white/30 focus:ring-offset-0"
            />
            <span>Contact me on WhatsApp</span>
          </label>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-6 text-sm leading-relaxed text-rose-200">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !isConfigured || optionsLoading || !hasOptions}
        className="btn-primary mt-10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending...' : 'Send Request'}
      </button>
    </form>
  )
}
