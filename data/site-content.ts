export interface MinistryTeam {
  name: string
  leader: string
  leaderEmail?: string
  schedule?: string
  location?: string
}

export interface CareGroup {
  name: string
  leader: string
  leaderEmail?: string
  meets: string
  location?: string
}

export const fallbackMinistryTeams: MinistryTeam[] = [
  {
    name: 'Multimedia',
    leader: 'Ari Adidarma',
  },
  {
    name: 'Sound',
    leader: 'Sangghara Kusumo',
  },
  {
    name: 'Worship',
    leader: 'Amadea Margo & Alfianto Widodo',
  },
  {
    name: 'Hospitality',
    leader: 'Diana Taslim',
  },
  {
    name: 'Events & Social Media',
    leader: 'Kimberly Lukman',
  },
  {
    name: 'Youth',
    leader: 'Fira Soeharsono',
  },
  {
    name: 'Children',
    leader: 'Sheila Gandadjaya',
  },
]

export const fallbackCareGroups: CareGroup[] = [
  {
    name: 'Family',
    leader: 'Fira Soeharsono',
    meets: 'Sunday 2:30 PM',
    location: 'IFGF OC',
  },
  {
    name: 'Young Professional',
    leader: 'Josh Thamrin',
    meets: 'Friday 7:30 PM',
    location: 'IFGF OC',
  },
  {
    name: 'College',
    leader: 'Justin Darmawan',
    meets: 'Friday 7:30 PM',
    location: 'Rotating homes in Irvine',
  },
]
