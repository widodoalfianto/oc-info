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

let cachedContent: SiteContentResponse | null = null
let inflightRequest: Promise<SiteContentResponse> | null = null

async function fetchSiteContent() {
  if (cachedContent) {
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
    if (cachedContent) {
      return
    }

    let cancelled = false

    fetchSiteContent()
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

        setStatus('error')
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
