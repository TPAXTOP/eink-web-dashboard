/**
 * Data fetching service with stale-while-revalidate pattern.
 *
 * ARCHITECTURE (Vercel Serverless Compatible):
 * - Non-blocking: Request handlers never wait for external API calls (when cache has data)
 * - Blocking initial fetch: On cold start with empty cache, wait for first fetch
 * - Stale-while-revalidate: Serve cached data immediately, refresh in background
 * - Rate limiting: Enforce minimum intervals between fetch attempts
 * - Graceful degradation: Keep showing stale data if refresh fails
 *
 * KEY FUNCTIONS:
 * - ensureInitialData(): BLOCKING - use on cold start when cache is empty
 * - triggerBackgroundRefresh(): Non-blocking - use when cache has data
 * - fetchWeather() / fetchFx(): Actual API calls, used internally
 * - startBackgroundWorkers(): Local dev only, uses setInterval
 */

import { dataFetchConfig, weatherConfig, fxConfig, loggingConfig } from './config.js'
import * as cache from './cache.js'
import { formatKyivDateTimeForLog } from './time-utils.js'

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
 * Fetch weather data from external API.
 * Records attempt timestamp regardless of success/failure.
 */
export const fetchWeather = async (): Promise<boolean> => {
  logImportant('weather', '→ Fetching weather data from API')

  // Record attempt BEFORE making the request (rate limiting)
  cache.recordWeatherFetchAttempt()

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

    logImportant('weather', '✓ Weather data fetched and cached', {
      temp: current.temperature_2m,
      code: current.weather_code,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('weather', '✗ Failed to fetch weather:', message)
    cache.setWeatherError(message)
    // Note: Existing cached data is preserved for graceful degradation
    return false
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

/**
 * Fetch FX data from external API.
 * Records attempt timestamp regardless of success/failure.
 */
export const fetchFx = async (): Promise<boolean> => {
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) {
    logImportant('fx', '⚠ Missing EXCHANGERATE_API_KEY env - skipping FX fetch')
    cache.setFxError('Exchange rate API key not configured')
    return false
  }

  logImportant('fx', '→ Fetching FX data from API')

  // Record attempt BEFORE making the request (rate limiting)
  cache.recordFxFetchAttempt()

  try {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - fxConfig.historyDays)

    const requestUrl = buildFxUrl(toIsoDate(start), toIsoDate(end), apiKey)
    log('fx', 'Requesting rates', { start: toIsoDate(start), end: toIsoDate(end) })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(requestUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      const text = await response.text()
      log('fx', 'Upstream error response', { status: response.status, body: text.slice(0, 200) })
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

    logImportant('fx', '✓ FX data fetched and cached', { points: points.length, latest: latest?.value })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('fx', '✗ Failed to fetch FX:', message)
    cache.setFxError(message)
    // Note: Existing cached data is preserved for graceful degradation
    return false
  }
}

// =============================================================================
// Non-Blocking Background Refresh (Vercel-Compatible)
// =============================================================================

// Track in-flight fetches to avoid duplicate concurrent requests
let weatherFetchPromise: Promise<boolean> | null = null
let fxFetchPromise: Promise<boolean> | null = null

/**
 * Check if weather needs refresh and trigger if necessary.
 * NON-BLOCKING: Returns immediately, fetch runs in background.
 *
 * Refresh conditions (ALL must be true):
 * 1. Data is stale (age > interval)
 * 2. Enough time has passed since last attempt (rate limiting)
 * 3. No fetch is already in progress
 */
const maybeRefreshWeather = (): void => {
  // Skip if data is fresh
  if (!cache.isWeatherStale(dataFetchConfig.weatherIntervalMs)) {
    log('weather', 'Data is fresh, skipping refresh')
    return
  }

  // Skip if we recently attempted a fetch (rate limiting)
  if (!cache.canAttemptWeatherFetch(dataFetchConfig.retryIntervalMs)) {
    log('weather', 'Skipping refresh - too soon since last attempt')
    return
  }

  // Skip if fetch already in progress
  if (weatherFetchPromise) {
    log('weather', 'Skipping refresh - fetch already in progress')
    return
  }

  logImportant('weather', 'Data is stale, triggering background refresh')
  weatherFetchPromise = fetchWeather().finally(() => {
    weatherFetchPromise = null
  })

  // Fire and forget - don't await
}

/**
 * Check if FX needs refresh and trigger if necessary.
 * NON-BLOCKING: Returns immediately, fetch runs in background.
 *
 * Refresh conditions (ALL must be true):
 * 1. Data is stale (age > interval)
 * 2. Enough time has passed since last attempt (rate limiting)
 * 3. No fetch is already in progress
 */
const maybeRefreshFx = (): void => {
  // Skip if data is fresh
  if (!cache.isFxStale(dataFetchConfig.fxIntervalMs)) {
    log('fx', 'Data is fresh, skipping refresh')
    return
  }

  // Skip if we recently attempted a fetch (rate limiting)
  if (!cache.canAttemptFxFetch(dataFetchConfig.retryIntervalMs)) {
    log('fx', 'Skipping refresh - too soon since last attempt')
    return
  }

  // Skip if fetch already in progress
  if (fxFetchPromise) {
    log('fx', 'Skipping refresh - fetch already in progress')
    return
  }

  logImportant('fx', 'Data is stale, triggering background refresh')
  fxFetchPromise = fetchFx().finally(() => {
    fxFetchPromise = null
  })

  // Fire and forget - don't await
}

/**
 * Trigger background refresh for all stale data sources.
 * NON-BLOCKING: Returns immediately, request handler continues with cached data.
 *
 * This is the main entry point called from request handlers.
 * It checks each data source and triggers refresh if needed.
 *
 * IMPORTANT: This function does NOT await any fetches.
 * The request handler should immediately render using current cached data.
 */
export const triggerBackgroundRefresh = (): void => {
  log('refresh', 'Checking if background refresh needed')
  maybeRefreshWeather()
  maybeRefreshFx()
}

// =============================================================================
// Blocking Initial Fetch (For Cold Start with Empty Cache)
// =============================================================================

/**
 * Ensure initial data is available before rendering.
 * BLOCKING: Waits for fetches to complete if cache is empty.
 *
 * This should be called on cold start when cache.isEmpty() returns true.
 * It ensures the first request sees real data instead of "Loading...".
 *
 * After initial data is loaded, subsequent requests use triggerBackgroundRefresh().
 */
export const ensureInitialData = async (): Promise<void> => {
  // Check if we have any data at all
  if (!cache.isEmpty()) {
    log('init', 'Cache has data, skipping blocking fetch')
    // Still trigger background refresh for stale data
    triggerBackgroundRefresh()
    return
  }

  logImportant('init', '⏳ Cache is empty - performing blocking initial fetch')
  logImportant('init', 'This may take a few seconds...')

  // Fetch both weather and FX in parallel, wait for completion
  const results = await Promise.all([
    fetchWeather().catch((err) => {
      logImportant('init', 'Weather fetch error:', err)
      return false
    }),
    fetchFx().catch((err) => {
      logImportant('init', 'FX fetch error:', err)
      return false
    }),
  ])

  const [weatherSuccess, fxSuccess] = results
  logImportant('init', `✓ Initial fetch complete: weather=${weatherSuccess}, fx=${fxSuccess}`)
}

// =============================================================================
// Legacy Functions (Deprecated, kept for backwards compatibility)
// =============================================================================

/**
 * @deprecated Use ensureInitialData() for cold start, triggerBackgroundRefresh() otherwise.
 */
export const ensureFreshData = async (): Promise<void> => {
  await ensureInitialData()
}

/**
 * @deprecated Use triggerBackgroundRefresh() instead.
 */
export const ensureWeatherFresh = async (): Promise<void> => {
  maybeRefreshWeather()
  if (weatherFetchPromise) {
    await weatherFetchPromise
  }
}

/**
 * @deprecated Use triggerBackgroundRefresh() instead.
 */
export const ensureFxFresh = async (): Promise<void> => {
  maybeRefreshFx()
  if (fxFetchPromise) {
    await fxFetchPromise
  }
}

// =============================================================================
// Background Workers (Local Development Only)
// =============================================================================

let weatherIntervalId: ReturnType<typeof setInterval> | null = null
let fxIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start all background data fetching workers.
 * Fetches data immediately, then continues at configured intervals.
 *
 * NOTE: Only used in local development.
 * On Vercel, use ensureInitialData() + triggerBackgroundRefresh() instead.
 */
export const startBackgroundWorkers = async (): Promise<void> => {
  logImportant('workers', 'Starting background data fetchers (local dev mode)')

  // Fetch immediately on startup
  await Promise.all([fetchWeather(), fetchFx()])

  // Schedule recurring fetches
  weatherIntervalId = setInterval(() => {
    fetchWeather().catch((err) => logImportant('weather', 'Unhandled error in worker:', err))
  }, dataFetchConfig.weatherIntervalMs)

  fxIntervalId = setInterval(() => {
    fetchFx().catch((err) => logImportant('fx', 'Unhandled error in worker:', err))
  }, dataFetchConfig.fxIntervalMs)

  logImportant('workers', 'Background workers running', {
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
  logImportant('workers', 'Background workers stopped')
}
