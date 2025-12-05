/**
 * FX data API endpoint - returns exchange rate data.
 *
 * Uses Next.js fetch caching for automatic revalidation.
 * Returns cached data if available, or error if fetch fails.
 */

import { NextResponse } from 'next/server'
import { fetchFx } from '@/lib/data-fetchers'

export const revalidate = 43200 // 12 hours

export async function GET() {
  const fxData = await fetchFx()

  if (fxData) {
    return NextResponse.json({
      points: fxData.points,
      meta: {
        latest: fxData.latest,
        min: fxData.min,
        max: fxData.max,
        source: fxData.source,
        refreshedAt: fxData.fetchedAt,
      },
    })
  }

  return NextResponse.json(
    {
      error: 'Exchange rate data not available.',
      hint: 'Check that EXCHANGERATE_API_KEY is configured.',
    },
    { status: 503 }
  )
}

