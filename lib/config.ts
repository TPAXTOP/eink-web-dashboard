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

  /**
   * Power outage schedule refresh interval.
   * Schedules are usually published daily, 15 minutes is sufficient.
   */
  outageRevalidateSeconds: 15 * 60, // 15 minutes

  /**
   * Backup power (battery) status refresh interval.
   * Real-time data is valuable, 5 minutes is a good balance.
   */
  backupRevalidateSeconds: 5 * 60, // 5 minutes

  /**
   * Battery history refresh interval.
   * Historical data doesn't change frequently, 30 minutes is sufficient.
   */
  backupHistoryRevalidateSeconds: 5 * 60, // 30 minutes
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
 * Power outage API configuration (Yasno).
 */
export const outageConfig = {
  /**
   * Yasno API endpoint for planned outages.
   * Region 25 = Kyiv, DSO 902 = DTEK Kyiv Regional Power Grids
   */
  apiUrl: 'https://app.yasno.ua/api/blackout-service/public/shutdowns/regions/25/dsos/902/planned-outages',

  /**
   * Group ID for outage schedule.
   * Set via YASNO_GROUP_ID environment variable.
   * Valid values: "1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2", "5.1", "5.2", "6.1", "6.2"
   */
  groupId: process.env.YASNO_GROUP_ID || '1.1',
}

/**
 * Deye Cloud API configuration.
 * Requires registration at https://eu1-developer.deyecloud.com
 */
export const deyeConfig = {
  /**
   * Deye Cloud API base URL (EU region).
   */
  apiUrl: 'https://eu1-developer.deyecloud.com',

  /**
   * App ID from Deye developer portal.
   */
  appId: process.env.DEYE_APP_ID || '',

  /**
   * App Secret from Deye developer portal.
   */
  appSecret: process.env.DEYE_APP_SECRET || '',

  /**
   * Account email for authentication.
   */
  email: process.env.DEYE_EMAIL || '',

  /**
   * Account password (will be SHA256 hashed before sending).
   */
  password: process.env.DEYE_PASSWORD || '',

  /**
   * Account password (already SHA256 hashed).
   * Use DEYE_PASSWORD for plain password in development, this for production.
   */
  hashedPassword: process.env.DEYE_PASSWORD_HASHED || '',

  /**
   * Device serial number to monitor.
   */
  deviceSn: process.env.DEYE_DEVICE_SN || '',
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

