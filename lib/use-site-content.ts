'use client'

import { useEffect, useState } from 'react'
import type { CareGroup, MinistryTeam } from '@/data/site-content'

interface SiteContentResponse {
  ministryTeams: MinistryTeam[]
  careGroups: CareGroup[]
}

const EMPTY_CONTENT: SiteContentResponse = {
  ministryTeams: [],
  careGroups: [],
}

const CACHE_TTL_MS = 60_000

let cachedContent: SiteContentResponse | null = null
let cachedAt = 0
let inflightRequest: Promise<SiteContentResponse> | null = null

function hasFreshCache() {
  return Boolean(cachedContent) && Date.now() - cachedAt < CACHE_TTL_MS
}

async function fetchSiteContent(force = false) {
  if (!force && hasFreshCache() && cachedContent) {
    return cachedContent
  }

  if (!inflightRequest) {
    inflightRequest = fetch('/api/site-content', {
      method: 'GET',
      cache: 'force-cache',
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Unexpected response: ${response.status}`)
        }

        const payload = (await response.json()) as SiteContentResponse
        cachedContent = payload
        cachedAt = Date.now()
        return payload
      })
      .finally(() => {
        inflightRequest = null
      })
  }

  return inflightRequest
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContentResponse>(cachedContent ?? EMPTY_CONTENT)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(cachedContent ? 'ready' : 'loading')

  useEffect(() => {
    if (hasFreshCache()) {
      return
    }

    let cancelled = false

    fetchSiteContent(true)
      .then(payload => {
        if (cancelled) {
          return
        }

        setContent(payload)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        if (!cachedContent) {
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    content,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
  }
}
