/**
 * Data fetching service using Next.js built-in caching.
 *
 * ARCHITECTURE (Next.js App Router):
 * - Uses fetch() with next.revalidate for HTTP-level caching
 * - Next.js handles stale-while-revalidate automatically
 * - No manual file caching needed - Next.js Data Cache handles persistence
 * - Server components call these functions directly
 *
 * CACHING BEHAVIOR:
 * - Fresh data: Served from cache immediately
 * - Stale data: Served from cache while revalidating in background
 * - On error: Returns null (NOT cached - errors bypass cache)
 *
 * NOTE: We use fetch()'s next.revalidate option instead of unstable_cache
 * because unstable_cache caches ALL return values including null/errors,
 * which causes failed builds to cache failures indefinitely. With fetch's
 * revalidate, only successful HTTP responses are cached.
 */

import { dataFetchConfig, weatherConfig, fxConfig, loggingConfig } from './config'
import { formatKyivDateTimeForLog } from './time-utils'
import type { WeatherData, FxData, FxPoint } from './types'

// =============================================================================
// Diagnostic Logging
// =============================================================================

const getTimestamp = () => formatKyivDateTimeForLog()

const log = (tag: string, ...args: unknown[]) => {
  if (loggingConfig.verbose) {
    console.log(`[${tag}]`, getTimestamp(), ...args)
  }
}

const logImportant = (tag: string, ...args: unknown[]) => {
  console.log(`[${tag}]`, getTimestamp(), ...args)
}

// =============================================================================
// Weather Fetcher
// =============================================================================

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast'

const buildWeatherUrl = (): string => {
  const url = new URL(WEATHER_API_URL)
  url.searchParams.set('latitude', String(weatherConfig.latitude))
  url.searchParams.set('longitude', String(weatherConfig.longitude))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code')
  url.searchParams.set('timezone', weatherConfig.timezone)
  return url.toString()
}

/**
 * Fetch weather data with caching.
 * Uses fetch()'s built-in caching with revalidate option.
 * Only successful responses are cached; errors are not cached.
 */
export const fetchWeather = async (): Promise<WeatherData | null> => {
  logImportant('weather', '→ Fetching weather data from external API')

  try {
    // Use next.revalidate for HTTP-level caching (only caches successful responses)
    const response = await fetch(buildWeatherUrl(), {
      next: { revalidate: dataFetchConfig.weatherRevalidateSeconds },
    })

    if (!response.ok) {
      throw new Error(`Weather API responded with ${response.status}`)
    }

    const payload = await response.json()
    const current = payload.current

    if (!current) {
      throw new Error('Weather payload missing current data')
    }

    const data: WeatherData = {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      time: current.time,
      fetchedAt: new Date().toISOString(),
    }

    logImportant('weather', '✓ Weather data fetched from external API', {
      temp: data.temperature,
      code: data.weatherCode,
      fetchedAt: data.fetchedAt,
    })
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('weather', '✗ Failed to fetch weather:', message)
    return null
  }
}

// =============================================================================
// FX Fetcher
// =============================================================================

const FX_BASE_URL = 'https://api.exchangerate.host/timeframe'

const toIsoDate = (date: Date) => date.toISOString().split('T')[0]

const buildFxUrl = (startDate: string, endDate: string, apiKey: string): string => {
  const url = new URL(FX_BASE_URL)
  url.searchParams.set('base', fxConfig.base)
  url.searchParams.set('symbols', fxConfig.target)
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('source', fxConfig.base)
  url.searchParams.set('places', '4')
  url.searchParams.set('amount', '1')
  url.searchParams.set('access_key', apiKey)
  return url.toString()
}

const pickQuoteValue = (quoteRecord: Record<string, unknown>, targetPair: string): number | undefined => {
  const direct = quoteRecord[targetPair]
  if (typeof direct === 'number') return direct

  const fallbackKey = Object.keys(quoteRecord).find((key) => key.endsWith(fxConfig.target))
  const fallbackValue = fallbackKey ? quoteRecord[fallbackKey] : undefined
  return typeof fallbackValue === 'number' ? fallbackValue : undefined
}

const parseFxPayload = (payload: unknown): FxPoint[] => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('FX payload missing')
  }

  const record = payload as {
    success?: boolean
    error?: { type?: string; info?: string }
    rates?: Record<string, Record<string, number>>
    quotes?: Record<string, number | Record<string, unknown>>
    timestamp?: number
  }

  if (record.success === false) {
    throw new Error(record.error?.info || 'FX upstream reported an error')
  }

  const targetPair = `${fxConfig.base}${fxConfig.target}`

  if (record.rates) {
    const points: FxPoint[] = Object.keys(record.rates)
      .sort()
      .map((dateKey) => ({
        date: dateKey,
        value: record.rates?.[dateKey]?.[fxConfig.target],
      }))
      .filter((point): point is FxPoint => typeof point.value === 'number')

    if (points.length) return points
  }

  if (record.quotes) {
    const quotes = record.quotes
    const points: FxPoint[] = []

    for (const [outerKey, outerValue] of Object.entries(quotes)) {
      if (typeof outerValue === 'number') {
        if (outerKey === targetPair) {
          const date =
            typeof record.timestamp === 'number'
              ? new Date(record.timestamp * 1000).toISOString().split('T')[0]
              : toIsoDate(new Date())
          points.push({ date, value: outerValue })
        }
        continue
      }

      if (outerValue && typeof outerValue === 'object') {
        const value = pickQuoteValue(outerValue, targetPair)
        if (typeof value === 'number') {
          points.push({ date: outerKey, value })
        }
      }
    }

    if (points.length) return points.sort((a, b) => (a.date < b.date ? -1 : 1))
  }

  throw new Error('FX payload missing rates or quotes data')
}

/**
 * Fetch FX data with caching.
 * Uses fetch()'s built-in caching with revalidate option.
 * Only successful responses are cached; errors are not cached.
 */
export const fetchFx = async (): Promise<FxData | null> => {
  const apiKey = process.env.EXCHANGERATE_API_KEY

  if (!apiKey) {
    logImportant('fx', '⚠ Missing EXCHANGERATE_API_KEY env - skipping FX fetch')
    return null
  }

  logImportant('fx', '→ Fetching FX data from external API')

  try {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - fxConfig.historyDays)

    const requestUrl = buildFxUrl(toIsoDate(start), toIsoDate(end), apiKey)
    log('fx', 'Requesting rates', { start: toIsoDate(start), end: toIsoDate(end) })

    // Use next.revalidate for HTTP-level caching (only caches successful responses)
    const response = await fetch(requestUrl, {
      next: { revalidate: dataFetchConfig.fxRevalidateSeconds },
    })

    if (!response.ok) {
      const text = await response.text()
      log('fx', 'Upstream error response', { status: response.status, body: text.slice(0, 200) })
      throw new Error(`FX upstream responded with ${response.status}`)
    }

    const payload = await response.json()
    const points = parseFxPayload(payload)
    const values = points.map((p) => p.value)
    const latest = points[points.length - 1]

    // Extract timestamp from API response (Unix timestamp in seconds)
    // Convert to ISO string for consistent handling
    const apiTimestamp = (payload as { timestamp?: number }).timestamp
    const updatedAt = apiTimestamp
      ? new Date(apiTimestamp * 1000).toISOString()
      : new Date().toISOString() // Fallback to current time if timestamp missing

    const data: FxData = {
      points,
      latest,
      min: Math.min(...values),
      max: Math.max(...values),
      source: 'exchangerate.host',
      fetchedAt: new Date().toISOString(),
      updatedAt,
    }

    logImportant('fx', '✓ FX data fetched from external API', {
      points: points.length,
      latest: latest?.value,
      fetchedAt: data.fetchedAt,
    })
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('fx', '✗ Failed to fetch FX:', message)
    return null
  }
}

// =============================================================================
// Combined Data Fetcher
// =============================================================================

export type DashboardData = {
  weather: WeatherData | null
  fx: FxData | null
  fetchedAt: string
}

/**
 * Fetch all dashboard data in parallel.
 * Used by server components to get all data in one call.
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const [weather, fx] = await Promise.all([fetchWeather(), fetchFx()])

  return {
    weather,
    fx,
    fetchedAt: new Date().toISOString(),
  }
}

