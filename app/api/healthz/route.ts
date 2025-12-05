/**
 * Health check endpoint.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    framework: 'Next.js',
    environment: process.env.VERCEL ? 'vercel' : 'local',
  })
}

