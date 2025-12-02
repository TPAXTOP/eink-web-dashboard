/**
 * Background data fetching service.
 * Fetches weather and FX data at configurable intervals.
 */

import { dataFetchConfig, weatherConfig, fxConfig } from './config.js'
import * as cache from './cache.js'

const logWeather = (...args: unknown[]) => console.log('[weather-worker]', ...args)
const logFx = (...args: unknown[]) => console.log('[fx-worker]', ...args)

// ─────────────────────────────────────────────────────────────────────────────
// Weather fetcher
// ─────────────────────────────────────────────────────────────────────────────

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast'

const buildWeatherUrl = (): string => {
  const url = new URL(WEATHER_API_URL)
  url.searchParams.set('latitude', String(weatherConfig.latitude))
  url.searchParams.set('longitude', String(weatherConfig.longitude))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code')
  url.searchParams.set('timezone', weatherConfig.timezone)
  return url.toString()
}

export const fetchWeather = async (): Promise<void> => {
  logWeather('Fetching weather data')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(buildWeatherUrl(), { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Weather API responded with ${response.status}`)
    }

    const payload = await response.json()
    const current = payload.current

    if (!current) {
      throw new Error('Weather payload missing current data')
    }

    cache.setWeather({
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      time: current.time,
      fetchedAt: new Date().toISOString(),
    })

    logWeather('Weather data cached', {
      temp: current.temperature_2m,
      code: current.weather_code,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logWeather('Failed to fetch weather', message)
    cache.setWeatherError(message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FX fetcher
// ─────────────────────────────────────────────────────────────────────────────

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

type FxPoint = { date: string; value: number }

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

export const fetchFx = async (): Promise<void> => {
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) {
    logFx('Missing EXCHANGERATE_API_KEY env')
    cache.setFxError('Exchange rate API key missing')
    return
  }

  logFx('Fetching FX data')

  try {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - fxConfig.historyDays)

    const requestUrl = buildFxUrl(toIsoDate(start), toIsoDate(end), apiKey)
    logFx('Requesting rates', { start: toIsoDate(start), end: toIsoDate(end) })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(requestUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      const text = await response.text()
      logFx('Upstream error response', { status: response.status, body: text })
      throw new Error(`FX upstream responded with ${response.status}`)
    }

    const payload = await response.json()
    const points = parseFxPayload(payload)
    const values = points.map((p) => p.value)
    const latest = points[points.length - 1]

    cache.setFx({
      points,
      latest,
      min: Math.min(...values),
      max: Math.max(...values),
      source: 'exchangerate.host',
      fetchedAt: new Date().toISOString(),
    })

    logFx('FX data cached', { points: points.length, latest })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logFx('Failed to fetch FX', message)
    cache.setFxError(message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy refresh (Vercel-compatible)
// ─────────────────────────────────────────────────────────────────────────────

// Track in-flight fetches to avoid duplicate requests
let weatherFetchPromise: Promise<void> | null = null
let fxFetchPromise: Promise<void> | null = null

/**
 * Ensure weather data is fresh. If stale, refreshes in the background.
 * Returns immediately with current cache (even if stale) to avoid blocking.
 */
export const ensureWeatherFresh = async (): Promise<void> => {
  if (!cache.isWeatherStale(dataFetchConfig.weatherIntervalMs)) {
    return // Data is fresh
  }

  // Avoid duplicate concurrent fetches
  if (weatherFetchPromise) {
    return weatherFetchPromise
  }

  console.log('[lazy-refresh] Weather data is stale, refreshing')
  weatherFetchPromise = fetchWeather().finally(() => {
    weatherFetchPromise = null
  })

  return weatherFetchPromise
}

/**
 * Ensure FX data is fresh. If stale, refreshes in the background.
 * Returns immediately with current cache (even if stale) to avoid blocking.
 */
export const ensureFxFresh = async (): Promise<void> => {
  if (!cache.isFxStale(dataFetchConfig.fxIntervalMs)) {
    return // Data is fresh
  }

  // Avoid duplicate concurrent fetches
  if (fxFetchPromise) {
    return fxFetchPromise
  }

  console.log('[lazy-refresh] FX data is stale, refreshing')
  fxFetchPromise = fetchFx().finally(() => {
    fxFetchPromise = null
  })

  return fxFetchPromise
}

/**
 * Ensure all data sources are fresh before rendering.
 * This is the main entry point for lazy refresh on each request.
 */
export const ensureFreshData = async (): Promise<void> => {
  await Promise.all([ensureWeatherFresh(), ensureFxFresh()])
}

// ─────────────────────────────────────────────────────────────────────────────
// Background workers (for local development only)
// ─────────────────────────────────────────────────────────────────────────────

let weatherIntervalId: ReturnType<typeof setInterval> | null = null
let fxIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start all background data fetching workers.
 * Fetches data immediately, then continues at configured intervals.
 * NOTE: Only used in local development; Vercel uses lazy refresh.
 */
export const startBackgroundWorkers = async (): Promise<void> => {
  console.log('[workers] Starting background data fetchers')

  // Fetch immediately on startup
  await Promise.all([fetchWeather(), fetchFx()])

  // Schedule recurring fetches
  weatherIntervalId = setInterval(() => {
    fetchWeather().catch((err) => console.error('[weather-worker] Unhandled error', err))
  }, dataFetchConfig.weatherIntervalMs)

  fxIntervalId = setInterval(() => {
    fetchFx().catch((err) => console.error('[fx-worker] Unhandled error', err))
  }, dataFetchConfig.fxIntervalMs)

  console.log('[workers] Background workers running', {
    weatherInterval: `${dataFetchConfig.weatherIntervalMs / 1000}s`,
    fxInterval: `${dataFetchConfig.fxIntervalMs / 1000}s`,
  })
}

/**
 * Stop all background workers (useful for graceful shutdown).
 */
export const stopBackgroundWorkers = (): void => {
  if (weatherIntervalId) {
    clearInterval(weatherIntervalId)
    weatherIntervalId = null
  }
  if (fxIntervalId) {
    clearInterval(fxIntervalId)
    fxIntervalId = null
  }
  console.log('[workers] Background workers stopped')
}
