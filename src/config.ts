/**
 * Configuration for background data fetching intervals.
 * Each data source has an independent refresh interval (in milliseconds).
 */

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
}

/**
 * Weather API configuration.
 */
export const weatherConfig = {
  latitude: 50.45,
  longitude: 30.52,
  timezone: 'Europe/Kiev',
}

/**
 * FX API configuration.
 */
export const fxConfig = {
  base: 'USD',
  target: 'UAH',
  historyDays: 29,
}
