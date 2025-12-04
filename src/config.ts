/**
 * Configuration for data fetching intervals and caching.
 * Each data source has an independent refresh interval (in milliseconds).
 *
 * ARCHITECTURE NOTE (Vercel Serverless):
 * - Intervals define cache expiration thresholds, NOT background timer intervals
 * - On Vercel, we use stale-while-revalidate: serve cached data immediately,
 *   then refresh in background if stale
 * - File-based caching under temp dir provides persistence across warm invocations
 */

import { tmpdir } from 'os'
import path from 'path'
import { KYIV_TIMEZONE } from './time-utils.js'

export const dataFetchConfig = {
  /**
   * Weather data refresh interval.
   * Open-Meteo API updates hourly, so 30 minutes is sufficient.
   */
  weatherIntervalMs: 30 * 60 * 1000, // 30 minutes

  /**
   * Exchange rate data refresh interval.
   * Rates don't change frequently; twice a day is sufficient.
   */
  fxIntervalMs: 12 * 60 * 60 * 1000, // 12 hours (twice a day)

  /**
   * Minimum retry interval after a failed fetch attempt.
   * Prevents hammering APIs when they're down or rate-limited.
   */
  retryIntervalMs: 5 * 60 * 1000, // 5 minutes
}

/**
 * Cache file configuration.
 * Files are stored under the system temp directory for cross-platform support.
 * On Vercel (Linux): /tmp/epaper-dashboard-cache
 * On Windows (vercel dev): C:\Users\...\AppData\Local\Temp\epaper-dashboard-cache
 */
export const cacheConfig = {
  /**
   * Base directory for cache files.
   * Uses os.tmpdir() for cross-platform support (Windows + Linux/Vercel).
   */
  cacheDir: path.join(tmpdir(), 'epaper-dashboard-cache'),

  /**
   * Cache file names.
   */
  weatherFile: 'weather-cache.json',
  fxFile: 'fx-cache.json',
  metaFile: 'cache-meta.json',
}

/**
 * Weather API configuration.
 */
export const weatherConfig = {
  latitude: 50.45,
  longitude: 30.52,
  timezone: KYIV_TIMEZONE,
}

/**
 * FX API configuration.
 */
export const fxConfig = {
  base: 'USD',
  target: 'UAH',
  historyDays: 29,
}

/**
 * Logging configuration.
 * Diagnostic logs are enabled in development, disabled in production.
 */
export const loggingConfig = {
  /**
   * Enable verbose diagnostic logging.
   * Set to false in production to reduce noise.
   */
  verbose: process.env.NODE_ENV !== 'production',
}
