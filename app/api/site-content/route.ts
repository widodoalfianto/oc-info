import { NextResponse } from 'next/server'
import { getSiteContent } from '@/lib/site-content'

export async function GET() {
  const payload = await getSiteContent()

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
