import { unstable_cache } from 'next/cache'
import {
  fallbackCareGroups,
  fallbackMinistryTeams,
  type CareGroup,
  type MinistryTeam,
} from '@/data/site-content'

interface SiteContentResponse {
  ministryTeams: MinistryTeam[]
  careGroups: CareGroup[]
}

type UnknownRecord = Record<string, unknown>

const CONTENT_URL = process.env.SITE_CONTENT_SCRIPT_URL ?? ''
const REVALIDATE_SECONDS = Number(process.env.SITE_CONTENT_REVALIDATE_SECONDS ?? '300')

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMinistryTeams(input: unknown): MinistryTeam[] {
  if (!Array.isArray(input)) {
    return fallbackMinistryTeams
  }

  const teams = input
    .filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object')
    .map(item => ({
      name: normalizeText(item.name),
      leader: normalizeText(item.leader),
    }))
    .filter(item => item.name && item.leader)

  if (teams.length === 0) {
    return fallbackMinistryTeams
  }

  return teams
}

function normalizeCareGroups(input: unknown): CareGroup[] {
  if (!Array.isArray(input)) {
    return fallbackCareGroups
  }

  const groups = input
    .filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object')
    .map(item => {
      const explicitLocation = normalizeText(item.location)

      return {
        name: normalizeText(item.name),
        leader: normalizeText(item.leader),
        meets: explicitLocation ? normalizeText(item.meets) : normalizeText(item.when),
        location: explicitLocation || normalizeText(item.meets),
      }
    })
    .filter(item => item.name && item.leader && item.meets && item.location)

  if (groups.length === 0) {
    return fallbackCareGroups
  }

  return groups
}

function normalizeResponse(input: unknown): SiteContentResponse {
  if (!input || typeof input !== 'object') {
    return {
      ministryTeams: fallbackMinistryTeams,
      careGroups: fallbackCareGroups,
    }
  }

  const payload = input as UnknownRecord

  return {
    ministryTeams: normalizeMinistryTeams(payload.ministryTeams),
    careGroups: normalizeCareGroups(payload.careGroups),
  }
}

const getCachedSiteContent = unstable_cache(
  async (): Promise<SiteContentResponse> => {
    if (!CONTENT_URL || CONTENT_URL.includes('YOUR_')) {
      return {
        ministryTeams: fallbackMinistryTeams,
        careGroups: fallbackCareGroups,
      }
    }

    try {
      const response = await fetch(CONTENT_URL, {
        next: {
          revalidate: REVALIDATE_SECONDS,
        },
      })

      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`)
      }

      const json = (await response.json()) as unknown
      return normalizeResponse(json)
    } catch (error) {
      console.error('Failed to load site content from spreadsheet', error)

      return {
        ministryTeams: fallbackMinistryTeams,
        careGroups: fallbackCareGroups,
      }
    }
  },
  ['site-content'],
  {
    revalidate: REVALIDATE_SECONDS,
  }
)

export async function getSiteContent(): Promise<SiteContentResponse> {
  return getCachedSiteContent()
}
