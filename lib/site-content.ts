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

function isEnabled(value: unknown) {
  const normalized = normalizeText(value).toLowerCase()
  return normalized !== 'false' && normalized !== 'no' && normalized !== '0'
}

function sortItems<T extends UnknownRecord>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftOrder = Number(left.sortOrder ?? left.order ?? Number.MAX_SAFE_INTEGER)
    const rightOrder = Number(right.sortOrder ?? right.order ?? Number.MAX_SAFE_INTEGER)
    return leftOrder - rightOrder
  })
}

function normalizeMinistryTeams(input: unknown): MinistryTeam[] {
  if (!Array.isArray(input)) {
    return fallbackMinistryTeams
  }

  const teams = input
    .filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object')
    .filter(item => isEnabled(item.active))
    .map(item => ({
      name: normalizeText(item.name),
      leader: normalizeText(item.leader),
      leaderEmail: normalizeText(item.leaderEmail),
      schedule: normalizeText(item.schedule),
      location: normalizeText(item.location),
      sortOrder: item.sortOrder,
      order: item.order,
    }))
    .filter(item => item.name && item.leader)

  if (teams.length === 0) {
    return fallbackMinistryTeams
  }

  return sortItems(teams).map(({ name, leader, leaderEmail, schedule, location }) => ({
    name,
    leader,
    leaderEmail,
    schedule,
    location,
  }))
}

function normalizeCareGroups(input: unknown): CareGroup[] {
  if (!Array.isArray(input)) {
    return fallbackCareGroups
  }

  const groups = input
    .filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object')
    .filter(item => isEnabled(item.active))
    .map(item => ({
      name: normalizeText(item.name),
      leader: normalizeText(item.leader),
      leaderEmail: normalizeText(item.leaderEmail),
      meets: normalizeText(item.meets),
      location: normalizeText(item.location),
      sortOrder: item.sortOrder,
      order: item.order,
    }))
    .filter(item => item.name && item.leader && item.meets)

  if (groups.length === 0) {
    return fallbackCareGroups
  }

  return sortItems(groups).map(({ name, leader, leaderEmail, meets, location }) => ({
    name,
    leader,
    leaderEmail,
    meets,
    location,
  }))
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
