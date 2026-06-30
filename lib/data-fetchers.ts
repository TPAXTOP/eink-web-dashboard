/**
 * Data fetching service.
 *
 * ARCHITECTURE (Next.js App Router):
 * - Raw fetchers (`fetchWeather`, `fetchFx`, ...) perform a single request with
 *   a hard timeout and THROW on any failure. They never hang and never cache.
 * - Resilient getters (`getWeather`, `getFx`, ...) wrap the raw fetchers with
 *   `createResilientGetter`, which adds persistent caching + last-known-good
 *   fallback via `unstable_cache` (see `lib/last-known-good.ts`).
 * - Server components call the resilient getters.
 *
 * WHY FETCHERS THROW: `unstable_cache` serves the previously cached value when
 * the wrapped function throws, but caches whatever it *returns*. Throwing on
 * failure is therefore what makes the last-known-good fallback work. A fetcher
 * may still return `null` for a stable "not configured" state (e.g. missing
 * API key), which is intentionally cached as-is.
 */

import { dataFetchConfig, weatherConfig, fxConfig, outageConfig, apiConfig, fetchTimeoutConfig, staleMaxAgeConfig } from './config'
import { logInfo, logError, logWarn, logDebug } from './logger'
import { createResilientGetter, type Resilient } from './last-known-good'
import { fetchWithTimeout } from './fetch-utils'
import { fetchBackupPower } from './deye-api'
import type { WeatherData, FxData, FxPoint, HourlyForecast, OutageSchedule, OutageSlot, HourlyOutage, BackupPowerData } from './types'

// =============================================================================
// Weather Fetcher
// =============================================================================

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast'

const buildWeatherUrl = (): string => {
  const url = new URL(WEATHER_API_URL)
  url.searchParams.set('latitude', String(weatherConfig.latitude))
  url.searchParams.set('longitude', String(weatherConfig.longitude))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code')
  url.searchParams.set('hourly', 'temperature_2m,weather_code')
  url.searchParams.set('forecast_hours', String(apiConfig.forecastHours))
  url.searchParams.set('timezone', weatherConfig.timezone)
  return url.toString()
}

/**
 * Fetch weather data.
 *
 * Single request with a hard timeout. Throws on any failure so the resilient
 * getter (`getWeather`) can serve the last-known-good value. Caching is handled
 * by `createResilientGetter`, not here.
 */
export const fetchWeather = async (): Promise<WeatherData> => {
  logInfo('weather', 'Fetching weather data')

  try {
    const response = await fetchWithTimeout(buildWeatherUrl(), {}, fetchTimeoutConfig.defaultMs)

    if (!response.ok) {
      throw new Error(`Weather API responded with ${response.status}`)
    }

    const payload = await response.json()
    const current = payload.current

    if (!current) {
      throw new Error('Weather payload missing current data')
    }

    // Parse hourly forecast data
    const hourlyData = payload.hourly
    let hourly: HourlyForecast[] = []

    if (hourlyData?.time && hourlyData?.temperature_2m && hourlyData?.weather_code) {
      hourly = hourlyData.time.map((time: string, index: number) => ({
        time,
        temperature: hourlyData.temperature_2m[index],
        weatherCode: hourlyData.weather_code[index],
      }))
    }

    const data: WeatherData = {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      time: current.time,
      fetchedAt: new Date().toISOString(),
      hourly,
    }

    logInfo('weather', 'Weather data fetched', {
      temp: data.temperature,
      code: data.weatherCode,
      hourlyPoints: hourly.length,
      fetchedAt: data.fetchedAt,
    })
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logError('weather', 'Failed to fetch weather:', message)
    throw error instanceof Error ? error : new Error(message)
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
 * Fetch FX data.
 *
 * Single request with a hard timeout. Returns `null` only when no API key is
 * configured (a stable state); throws on any real fetch failure so the
 * resilient getter (`getFx`) can serve the last-known-good value.
 */
export const fetchFx = async (): Promise<FxData | null> => {
  const apiKey = process.env.EXCHANGERATE_API_KEY

  if (!apiKey) {
    logWarn('fx', 'Missing EXCHANGERATE_API_KEY env, skipping FX fetch')
    return null
  }

  logInfo('fx', 'Fetching FX data')

  try {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - fxConfig.historyDays)

    const requestUrl = buildFxUrl(toIsoDate(start), toIsoDate(end), apiKey)
    logDebug('fx', 'Requesting rates', { start: toIsoDate(start), end: toIsoDate(end) })

    const response = await fetchWithTimeout(requestUrl, {}, fetchTimeoutConfig.defaultMs)

    if (!response.ok) {
      const text = await response.text()
      logDebug('fx', 'Upstream error response', { status: response.status, body: text.slice(0, 200) })
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

    logInfo('fx', 'FX data fetched', {
      points: points.length,
      latest: latest?.value,
      fetchedAt: data.fetchedAt,
    })
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logError('fx', 'Failed to fetch FX:', message)
    throw error instanceof Error ? error : new Error(message)
  }
}

// =============================================================================
// Power Outage Fetcher (Yasno API)
// =============================================================================

/**
 * Convert minute-based slots to hourly fractions for display.
 * Each hour gets a fraction (0-1) representing how much of that hour has outage,
 * plus which half of the hour (first 30 min or second 30 min) is affected.
 */
function slotsToHourlyFractions(slots: OutageSlot[]): HourlyOutage[] {
  const firstHalfMinutes: number[] = new Array(24).fill(0)
  const secondHalfMinutes: number[] = new Array(24).fill(0)

  for (const slot of slots) {
    if (slot.type !== 'Definite') continue

    // Process each minute in the slot
    for (let minute = slot.start; minute < slot.end && minute < 1440; minute++) {
      const hour = Math.floor(minute / 60)
      const minuteInHour = minute % 60
      if (hour >= 24) break

      if (minuteInHour < 30) {
        firstHalfMinutes[hour]++
      } else {
        secondHalfMinutes[hour]++
      }
    }
  }

  // Convert to HourlyOutage format
  return Array.from({ length: 24 }, (_, hour) => {
    const firstHalf = Math.min(firstHalfMinutes[hour], 30)
    const secondHalf = Math.min(secondHalfMinutes[hour], 30)
    const totalMinutes = firstHalf + secondHalf
    const fraction = Math.min(totalMinutes / 60, 1)

    let halfAffected: 'none' | 'first' | 'second' | 'both'
    if (firstHalf > 0 && secondHalf > 0) {
      halfAffected = 'both'
    } else if (firstHalf > 0) {
      halfAffected = 'first'
    } else if (secondHalf > 0) {
      halfAffected = 'second'
    } else {
      halfAffected = 'none'
    }

    return {
      hour: hour.toString().padStart(2, '0'),
      fraction,
      halfAffected,
    }
  })
}

/**
 * Generate alternating half-hour pattern for EmergencyShutdowns status.
 * Creates a "zebra" pattern with alternating grey diagonal halves.
 *
 * @param startWithFirst - If true, hour 0 shows first half (left diagonal);
 *                         if false, hour 0 shows second half (right diagonal)
 */
function generateAlternatingPattern(startWithFirst: boolean): HourlyOutage[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const isEvenHour = hour % 2 === 0
    const halfAffected: 'first' | 'second' = startWithFirst
      ? (isEvenHour ? 'first' : 'second')
      : (isEvenHour ? 'second' : 'first')

    return {
      hour: hour.toString().padStart(2, '0'),
      fraction: 0.5,
      halfAffected,
    }
  })
}

/**
 * Parse Yasno API response for a specific group.
 */
function parseYasnoResponse(
  payload: Record<string, unknown>,
  groupId: string
): { today: OutageSchedule['today']; tomorrow: OutageSchedule['tomorrow']; updatedOn: string } {
  const groupData = payload[groupId] as {
    today?: { date?: string; status?: string; slots?: Array<{ start?: number; end?: number; type?: string }> }
    tomorrow?: { date?: string; status?: string; slots?: Array<{ start?: number; end?: number; type?: string }> }
    updatedOn?: string
  } | undefined

  if (!groupData) {
    throw new Error(`Group ${groupId} not found in response`)
  }

  const parseDay = (day: typeof groupData.today): OutageSchedule['today'] => {
    if (!day || !day.date) return null

    const slots: OutageSlot[] = (day.slots || [])
      .filter((s): s is { start: number; end: number; type: string } =>
        typeof s.start === 'number' && typeof s.end === 'number' && typeof s.type === 'string'
      )
      .map((s) => ({
        start: s.start,
        end: s.end,
        type: s.type as 'Definite' | 'NotPlanned',
      }))

    return {
      date: day.date,
      status: day.status || 'Unknown',
      slots,
    }
  }

  return {
    today: parseDay(groupData.today),
    tomorrow: parseDay(groupData.tomorrow),
    updatedOn: groupData.updatedOn || new Date().toISOString(),
  }
}

/**
 * Fetch power outage schedule from Yasno API.
 *
 * Single request with a hard timeout. Throws on any failure so the resilient
 * getter (`getOutageSchedule`) can serve the last-known-good value.
 */
export const fetchOutageSchedule = async (): Promise<OutageSchedule> => {
  logInfo('outage', 'Fetching outage schedule')

  try {
    const response = await fetchWithTimeout(outageConfig.apiUrl, {}, fetchTimeoutConfig.defaultMs)

    if (!response.ok) {
      throw new Error(`Yasno API responded with ${response.status}`)
    }

    const payload = await response.json()
    const { today, tomorrow, updatedOn } = parseYasnoResponse(payload, outageConfig.groupId)

    const data: OutageSchedule = {
      today,
      tomorrow,
      groupId: outageConfig.groupId,
      updatedOn,
      fetchedAt: new Date().toISOString(),
    }

    logInfo('outage', 'Outage schedule fetched', {
      groupId: data.groupId,
      todaySlots: today?.slots.length || 0,
      tomorrowSlots: tomorrow?.slots.length || 0,
      fetchedAt: data.fetchedAt,
    })

    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logError('outage', 'Failed to fetch outage schedule:', message)
    throw error instanceof Error ? error : new Error(message)
  }
}

/**
 * Get hourly outage fractions for display in the power page.
 * Converts slot-based schedule to 24-hour fractions.
 * Also returns whether the schedule applies (is confirmed) for each day.
 */
export const getHourlyOutages = (schedule: OutageSchedule | null): {
  today: { hours: HourlyOutage[]; scheduleApplies: boolean }
  tomorrow: { hours: HourlyOutage[]; scheduleApplies: boolean }
} => {
  const emptyDay: HourlyOutage[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i.toString().padStart(2, '0'),
    fraction: 0,
    halfAffected: 'none' as const,
  }))

  if (!schedule) {
    return {
      today: { hours: emptyDay, scheduleApplies: false },
      tomorrow: { hours: emptyDay, scheduleApplies: false },
    }
  }

  // Check for EmergencyShutdowns with no slots - show alternating pattern
  const isEmergencyNoSlots = (day: OutageSchedule['today']) =>
    day?.status === 'EmergencyShutdowns' && day.slots.length === 0

  // Determine hours for each day:
  // - EmergencyShutdowns with no slots: alternating pattern (today starts left, tomorrow starts right)
  // - Normal case: convert slots to hourly fractions
  // - No schedule: empty day
  const getTodayHours = (): HourlyOutage[] => {
    if (isEmergencyNoSlots(schedule.today)) {
      return generateAlternatingPattern(true) // Today starts with left half
    }
    return schedule.today ? slotsToHourlyFractions(schedule.today.slots) : emptyDay
  }

  const getTomorrowHours = (): HourlyOutage[] => {
    if (isEmergencyNoSlots(schedule.tomorrow)) {
      return generateAlternatingPattern(false) // Tomorrow starts with right half
    }
    return schedule.tomorrow ? slotsToHourlyFractions(schedule.tomorrow.slots) : emptyDay
  }

  return {
    today: {
      hours: getTodayHours(),
      scheduleApplies: schedule.today?.status === 'ScheduleApplies',
    },
    tomorrow: {
      hours: getTomorrowHours(),
      scheduleApplies: schedule.tomorrow?.status === 'ScheduleApplies',
    },
  }
}

// =============================================================================
// Combined Data Fetcher
// =============================================================================

export type DashboardData = {
  weather: Resilient<WeatherData>
  fx: Resilient<FxData>
  fetchedAt: string
}

// =============================================================================
// Resilient Getters (last-known-good fallback)
// =============================================================================

/**
 * Resilient wrappers around the raw fetchers. Each adds persistent caching and
 * a last-known-good fallback: on a failed refresh they return the previous
 * successful result marked `stale` (when older than its refresh window) instead
 * of nothing, so the UI keeps showing the last reading with a "not updated"
 * indicator. Backed by `unstable_cache`, so the fallback survives serverless
 * cold starts (unlike the previous in-memory store).
 */
export const getWeather = createResilientGetter<WeatherData>('weather', fetchWeather, {
  revalidate: dataFetchConfig.weatherRevalidateSeconds,
  staleMaxAgeSeconds: staleMaxAgeConfig.weather,
})

export const getFx = createResilientGetter<FxData>('fx', fetchFx, {
  revalidate: dataFetchConfig.fxRevalidateSeconds,
  staleMaxAgeSeconds: staleMaxAgeConfig.fx,
})

export const getOutageSchedule = createResilientGetter<OutageSchedule>('outage', fetchOutageSchedule, {
  revalidate: dataFetchConfig.outageRevalidateSeconds,
  staleMaxAgeSeconds: staleMaxAgeConfig.outage,
})

export const getBackupPower = createResilientGetter<BackupPowerData>('backup', fetchBackupPower, {
  revalidate: dataFetchConfig.backupRevalidateSeconds,
  staleMaxAgeSeconds: staleMaxAgeConfig.backup,
})

/**
 * Fetch all dashboard data in parallel.
 * Used by server components to get all data in one call.
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const [weather, fx] = await Promise.all([getWeather(), getFx()])

  return {
    weather,
    fx,
    fetchedAt: new Date().toISOString(),
  }
}

