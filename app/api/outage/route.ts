/**
 * Power outage schedule API endpoint.
 *
 * Returns the current outage schedule from Yasno API for the configured group.
 * Uses Next.js fetch caching for automatic revalidation.
 */

import { NextResponse } from 'next/server'
import { fetchOutageSchedule, getHourlyOutages } from '@/lib/data-fetchers'

export const revalidate = 900 // 15 minutes

export async function GET() {
  const schedule = await fetchOutageSchedule()

  if (schedule) {
    const hourly = getHourlyOutages(schedule)

    return NextResponse.json({
      groupId: schedule.groupId,
      updatedOn: schedule.updatedOn,
      fetchedAt: schedule.fetchedAt,
      today: {
        date: schedule.today?.date || null,
        status: schedule.today?.status || null,
        slots: schedule.today?.slots || [],
        hourly: hourly.today.hours,
        scheduleApplies: hourly.today.scheduleApplies,
      },
      tomorrow: {
        date: schedule.tomorrow?.date || null,
        status: schedule.tomorrow?.status || null,
        slots: schedule.tomorrow?.slots || [],
        hourly: hourly.tomorrow.hours,
        scheduleApplies: hourly.tomorrow.scheduleApplies,
      },
    })
  }

  return NextResponse.json(
    {
      error: 'Outage schedule not available.',
      hint: 'Please try again shortly.',
    },
    { status: 503 }
  )
}
