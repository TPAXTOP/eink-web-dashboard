/**
 * Configuration for data fetching and display.
 *
 * NEXT.JS ARCHITECTURE:
 * - Revalidation intervals define how long cached data is considered fresh
 * - Uses Next.js built-in fetch caching instead of manual file caching
 * - All timestamps displayed in Kyiv timezone
 */

import { KYIV_TIMEZONE } from './time-utils'

/**
 * Data fetch revalidation intervals (in seconds).
 * These values are used with Next.js fetch() revalidate option.
 */
export const dataFetchConfig = {
  /**
   * Weather data refresh interval.
   * Open-Meteo API updates hourly, so 30 minutes is sufficient.
   */
  weatherRevalidateSeconds: 30 * 60, // 30 minutes

  /**
   * Exchange rate data refresh interval.
   * Rates don't change frequently; twice a day is sufficient.
   */
  fxRevalidateSeconds: 12 * 60 * 60, // 12 hours
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

