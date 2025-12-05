/**
 * Weather data API endpoint - returns weather data.
 *
 * Uses Next.js fetch caching for automatic revalidation.
 * Returns cached data if available, or error if fetch fails.
 */

import { NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/data-fetchers'

export const revalidate = 1800 // 30 minutes

export async function GET() {
  const weatherData = await fetchWeather()

  if (weatherData) {
    return NextResponse.json({
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      weatherCode: weatherData.weatherCode,
      time: weatherData.time,
      refreshedAt: weatherData.fetchedAt,
    })
  }

  return NextResponse.json(
    {
      error: 'Weather data not available.',
      hint: 'Please try again shortly.',
    },
    { status: 503 }
  )
}

