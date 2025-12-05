/**
 * Cache status endpoint - debugging/monitoring.
 *
 * In Next.js, we return info about the revalidation configuration
 * since actual cache internals are managed by Next.js.
 */

import { NextResponse } from 'next/server'
import { dataFetchConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    architecture: 'Next.js App Router',
    caching: 'Next.js Data Cache with ISR',
    revalidation: {
      weather: {
        intervalSeconds: dataFetchConfig.weatherRevalidateSeconds,
        intervalHuman: `${dataFetchConfig.weatherRevalidateSeconds / 60} minutes`,
      },
      fx: {
        intervalSeconds: dataFetchConfig.fxRevalidateSeconds,
        intervalHuman: `${dataFetchConfig.fxRevalidateSeconds / 60 / 60} hours`,
      },
    },
    environment: process.env.VERCEL ? 'vercel' : 'local',
    timestamp: new Date().toISOString(),
  })
}

