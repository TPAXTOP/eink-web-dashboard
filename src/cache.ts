/**
 * Hybrid in-memory + file-based cache for server-side data.
 *
 * ARCHITECTURE (Vercel Serverless Compatible):
 * - Primary: In-memory cache for fast access during warm invocations
 * - Persistence: File-based cache under temp dir for cold start recovery
 * - Timestamps: Track both fetchedAt (data age) and lastFetchAttemptAt (rate limiting)
 *
 * On cold start: Load from temp files into memory
 * On data update: Write to both memory and temp files
 * On request: Always read from memory (fast), file I/O only on init/update
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { cacheConfig, loggingConfig } from './config.js'
import { formatKyivDateTimeForLog } from './time-utils.js'

// =============================================================================
// Types
// =============================================================================

export type WeatherData = {
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  time: string
  fetchedAt: string
}

export type FxPoint = {
  date: string
  value: number
}

export type FxData = {
  points: FxPoint[]
  latest: { date: string; value: number }
  min: number
  max: number
  source: string
  fetchedAt: string
}

/**
 * Metadata for tracking fetch attempts (separate from data).
 * Used to enforce minimum retry intervals even on failures.
 */
type CacheMeta = {
  weatherLastFetchAttemptAt: string | null
  fxLastFetchAttemptAt: string | null
}

type CacheData = {
  weather: WeatherData | null
  weatherError: string | null
  fx: FxData | null
  fxError: string | null
}

// =============================================================================
// In-Memory Cache State
// =============================================================================

const cache: CacheData = {
  weather: null,
  weatherError: null,
  fx: null,
  fxError: null,
}

const meta: CacheMeta = {
  weatherLastFetchAttemptAt: null,
  fxLastFetchAttemptAt: null,
}

// Track if we've already loaded from files on this instance
let initializedFromFiles = false

// =============================================================================
// Diagnostic Logging
// =============================================================================

/**
 * Log cache operations (only in development/verbose mode).
 */
const getTimestamp = () => formatKyivDateTimeForLog()

const log = (...args: unknown[]) => {
  if (loggingConfig.verbose) {
    console.log('[cache]', getTimestamp(), ...args)
  }
}

/**
 * Log important events (always logged).
 */
const logImportant = (...args: unknown[]) => {
  console.log('[cache]', getTimestamp(), ...args)
}

// =============================================================================
// File I/O Helpers
// =============================================================================

/**
 * Ensure cache directory exists.
 */
const ensureCacheDir = (): void => {
  try {
    if (!existsSync(cacheConfig.cacheDir)) {
      mkdirSync(cacheConfig.cacheDir, { recursive: true })
      log('Created cache directory:', cacheConfig.cacheDir)
    }
  } catch (error) {
    logImportant('Warning: Could not create cache directory', cacheConfig.cacheDir, error)
  }
}

/**
 * Get full path for a cache file.
 */
const getCacheFilePath = (filename: string): string => {
  return path.join(cacheConfig.cacheDir, filename)
}

/**
 * Safely read and parse JSON from a file.
 * Returns null if file doesn't exist or is invalid.
 */
const readJsonFile = <T>(filepath: string): T | null => {
  try {
    if (!existsSync(filepath)) {
      log('Cache file not found:', filepath)
      return null
    }
    const content = readFileSync(filepath, 'utf-8')
    const data = JSON.parse(content) as T
    log('Loaded cache file:', filepath)
    return data
  } catch (error) {
    logImportant('Warning: Failed to read cache file', filepath, error)
    return null
  }
}

/**
 * Safely write JSON to a file.
 * Fails silently to prevent crashes on I/O errors.
 */
const writeJsonFile = <T>(filepath: string, data: T): void => {
  try {
    ensureCacheDir()
    writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
    log('Wrote cache file:', filepath)
  } catch (error) {
    logImportant('Warning: Failed to write cache file', filepath, error)
  }
}

// =============================================================================
// Cache Initialization (Cold Start Recovery)
// =============================================================================

/**
 * Initialize cache from files on cold start.
 * Called automatically on first cache access.
 * Idempotent: only runs once per function instance.
 */
export const initializeFromFiles = (): void => {
  if (initializedFromFiles) {
    return
  }
  initializedFromFiles = true

  logImportant('Initializing cache from files (cold start recovery)')
  logImportant('Cache directory:', cacheConfig.cacheDir)

  // Ensure directory exists
  ensureCacheDir()

  // Load weather data
  const weatherPath = getCacheFilePath(cacheConfig.weatherFile)
  const weatherData = readJsonFile<WeatherData>(weatherPath)
  if (weatherData) {
    cache.weather = weatherData
    logImportant('✓ Loaded weather from file', { fetchedAt: weatherData.fetchedAt, temp: weatherData.temperature })
  } else {
    logImportant('✗ No weather cache file found')
  }

  // Load FX data
  const fxPath = getCacheFilePath(cacheConfig.fxFile)
  const fxData = readJsonFile<FxData>(fxPath)
  if (fxData) {
    cache.fx = fxData
    logImportant('✓ Loaded FX from file', { fetchedAt: fxData.fetchedAt, points: fxData.points?.length })
  } else {
    logImportant('✗ No FX cache file found')
  }

  // Load metadata (fetch attempt timestamps)
  const metaPath = getCacheFilePath(cacheConfig.metaFile)
  const metaData = readJsonFile<CacheMeta>(metaPath)
  if (metaData) {
    meta.weatherLastFetchAttemptAt = metaData.weatherLastFetchAttemptAt
    meta.fxLastFetchAttemptAt = metaData.fxLastFetchAttemptAt
    log('Loaded cache metadata from file')
  }
}

/**
 * Persist metadata to file (fetch attempt timestamps).
 */
const persistMeta = (): void => {
  writeJsonFile(getCacheFilePath(cacheConfig.metaFile), meta)
}

// =============================================================================
// Weather Cache Operations
// =============================================================================

/**
 * Get cached weather data.
 * Automatically initializes from files on first access.
 */
export const getWeather = (): WeatherData | null => {
  initializeFromFiles()
  return cache.weather
}

/**
 * Get cached weather error message.
 */
export const getWeatherError = (): string | null => cache.weatherError

/**
 * Set cached weather data.
 * Persists to both memory and file.
 */
export const setWeather = (data: WeatherData): void => {
  cache.weather = data
  cache.weatherError = null
  writeJsonFile(getCacheFilePath(cacheConfig.weatherFile), data)
  logImportant('Weather cached and persisted', { temp: data.temperature, fetchedAt: data.fetchedAt })
}

/**
 * Set weather error state.
 * Does not clear existing cached data (graceful degradation).
 */
export const setWeatherError = (error: string): void => {
  cache.weatherError = error
  logImportant('Weather error set:', error)
  // Note: We keep cache.weather intact so stale data can still be shown
}

/**
 * Record a weather fetch attempt (success or failure).
 * Used to enforce minimum retry intervals.
 */
export const recordWeatherFetchAttempt = (): void => {
  meta.weatherLastFetchAttemptAt = new Date().toISOString()
  persistMeta()
  log('Recorded weather fetch attempt at', meta.weatherLastFetchAttemptAt)
}

/**
 * Get timestamp of last weather fetch attempt.
 */
export const getWeatherLastFetchAttemptAt = (): string | null => {
  initializeFromFiles()
  return meta.weatherLastFetchAttemptAt
}

// =============================================================================
// FX Cache Operations
// =============================================================================

/**
 * Get cached FX data.
 * Automatically initializes from files on first access.
 */
export const getFx = (): FxData | null => {
  initializeFromFiles()
  return cache.fx
}

/**
 * Get cached FX error message.
 */
export const getFxError = (): string | null => cache.fxError

/**
 * Set cached FX data.
 * Persists to both memory and file.
 */
export const setFx = (data: FxData): void => {
  cache.fx = data
  cache.fxError = null
  writeJsonFile(getCacheFilePath(cacheConfig.fxFile), data)
  logImportant('FX cached and persisted', { points: data.points?.length, latest: data.latest?.value, fetchedAt: data.fetchedAt })
}

/**
 * Set FX error state.
 * Does not clear existing cached data (graceful degradation).
 */
export const setFxError = (error: string): void => {
  cache.fxError = error
  logImportant('FX error set:', error)
  // Note: We keep cache.fx intact so stale data can still be shown
}

/**
 * Record an FX fetch attempt (success or failure).
 * Used to enforce minimum retry intervals.
 */
export const recordFxFetchAttempt = (): void => {
  meta.fxLastFetchAttemptAt = new Date().toISOString()
  persistMeta()
  log('Recorded FX fetch attempt at', meta.fxLastFetchAttemptAt)
}

/**
 * Get timestamp of last FX fetch attempt.
 */
export const getFxLastFetchAttemptAt = (): string | null => {
  initializeFromFiles()
  return meta.fxLastFetchAttemptAt
}

// =============================================================================
// Staleness Checks
// =============================================================================

/**
 * Check if weather data is stale (older than the configured interval).
 */
export const isWeatherStale = (maxAgeMs: number): boolean => {
  initializeFromFiles()
  if (!cache.weather?.fetchedAt) {
    log('Weather staleness check: no data, returning stale=true')
    return true
  }
  const age = Date.now() - new Date(cache.weather.fetchedAt).getTime()
  const isStale = age > maxAgeMs
  log(`Weather staleness check: age=${Math.round(age / 1000)}s, maxAge=${Math.round(maxAgeMs / 1000)}s, stale=${isStale}`)
  return isStale
}

/**
 * Check if FX data is stale (older than the configured interval).
 */
export const isFxStale = (maxAgeMs: number): boolean => {
  initializeFromFiles()
  if (!cache.fx?.fetchedAt) {
    log('FX staleness check: no data, returning stale=true')
    return true
  }
  const age = Date.now() - new Date(cache.fx.fetchedAt).getTime()
  const isStale = age > maxAgeMs
  log(`FX staleness check: age=${Math.round(age / 1000)}s, maxAge=${Math.round(maxAgeMs / 1000)}s, stale=${isStale}`)
  return isStale
}

/**
 * Check if enough time has passed since last weather fetch attempt.
 * Used to enforce minimum retry intervals (prevents API hammering).
 */
export const canAttemptWeatherFetch = (minIntervalMs: number): boolean => {
  initializeFromFiles()
  if (!meta.weatherLastFetchAttemptAt) {
    log('Weather fetch allowed: no previous attempt recorded')
    return true
  }
  const elapsed = Date.now() - new Date(meta.weatherLastFetchAttemptAt).getTime()
  const canAttempt = elapsed > minIntervalMs
  log(`Weather fetch check: elapsed=${Math.round(elapsed / 1000)}s, minInterval=${Math.round(minIntervalMs / 1000)}s, allowed=${canAttempt}`)
  return canAttempt
}

/**
 * Check if enough time has passed since last FX fetch attempt.
 * Used to enforce minimum retry intervals (prevents API hammering).
 */
export const canAttemptFxFetch = (minIntervalMs: number): boolean => {
  initializeFromFiles()
  if (!meta.fxLastFetchAttemptAt) {
    log('FX fetch allowed: no previous attempt recorded')
    return true
  }
  const elapsed = Date.now() - new Date(meta.fxLastFetchAttemptAt).getTime()
  const canAttempt = elapsed > minIntervalMs
  log(`FX fetch check: elapsed=${Math.round(elapsed / 1000)}s, minInterval=${Math.round(minIntervalMs / 1000)}s, allowed=${canAttempt}`)
  return canAttempt
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the latest update timestamp (most recent of weather or FX).
 */
export const getLastUpdated = (): string | null => {
  initializeFromFiles()
  const timestamps = [cache.weather?.fetchedAt, cache.fx?.fetchedAt].filter(Boolean) as string[]
  if (!timestamps.length) return null
  return timestamps.sort().reverse()[0]
}

/**
 * Check if cache has any data (weather OR fx).
 */
export const hasData = (): boolean => {
  initializeFromFiles()
  return cache.weather !== null || cache.fx !== null
}

/**
 * Check if cache is completely empty (no weather AND no fx).
 * Used to determine if blocking initial fetch is needed.
 */
export const isEmpty = (): boolean => {
  initializeFromFiles()
  return cache.weather === null && cache.fx === null
}

/**
 * Get diagnostic info about current cache state.
 */
export const getDiagnostics = () => {
  initializeFromFiles()
  return {
    cacheDir: cacheConfig.cacheDir,
    weather: {
      hasData: cache.weather !== null,
      fetchedAt: cache.weather?.fetchedAt || null,
      error: cache.weatherError,
      lastAttemptAt: meta.weatherLastFetchAttemptAt,
    },
    fx: {
      hasData: cache.fx !== null,
      fetchedAt: cache.fx?.fetchedAt || null,
      pointCount: cache.fx?.points?.length || 0,
      error: cache.fxError,
      lastAttemptAt: meta.fxLastFetchAttemptAt,
    },
  }
}
