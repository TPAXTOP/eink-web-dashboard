/**
 * Backup power status API endpoint.
 *
 * Returns battery status and 24h history from Deye Cloud API.
 * Uses Next.js fetch caching for automatic revalidation.
 * Returns mock data when Deye is not configured.
 */

import { NextResponse } from 'next/server'
import { fetchBackupPower } from '@/lib/deye-api'

export const revalidate = 300 // 5 minutes

export async function GET() {
  const backupData = await fetchBackupPower()

  if (backupData) {
    return NextResponse.json({
      batteryPercent: backupData.batteryPercent,
      gridConnected: backupData.gridConnected,
      lastUpdate: backupData.lastUpdate,
      fetchedAt: backupData.fetchedAt,
      history24h: backupData.history24h,
    })
  }

  // Return indication that Deye is not configured
  return NextResponse.json(
    {
      error: 'Backup power data not available.',
      hint: 'Deye Cloud API may not be configured. Set DEYE_APP_ID, DEYE_EMAIL, DEYE_PASSWORD, and DEYE_DEVICE_SN environment variables.',
    },
    { status: 503 }
  )
}
