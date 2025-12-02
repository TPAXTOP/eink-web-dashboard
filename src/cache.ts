/**
 * Simple in-memory cache for server-side data.
 * Stores latest fetched data for weather and FX.
 */

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

type CacheData = {
  weather: WeatherData | null
  weatherError: string | null
  fx: FxData | null
  fxError: string | null
}

const cache: CacheData = {
  weather: null,
  weatherError: null,
  fx: null,
  fxError: null,
}

/**
 * Get cached weather data.
 */
export const getWeather = (): WeatherData | null => cache.weather

/**
 * Get cached weather error message.
 */
export const getWeatherError = (): string | null => cache.weatherError

/**
 * Set cached weather data.
 */
export const setWeather = (data: WeatherData): void => {
  cache.weather = data
  cache.weatherError = null
}

/**
 * Set weather error state.
 */
export const setWeatherError = (error: string): void => {
  cache.weatherError = error
}

/**
 * Get cached FX data.
 */
export const getFx = (): FxData | null => cache.fx

/**
 * Get cached FX error message.
 */
export const getFxError = (): string | null => cache.fxError

/**
 * Set cached FX data.
 */
export const setFx = (data: FxData): void => {
  cache.fx = data
  cache.fxError = null
}

/**
 * Set FX error state.
 */
export const setFxError = (error: string): void => {
  cache.fxError = error
}

/**
 * Get the latest update timestamp (most recent of weather or FX).
 */
export const getLastUpdated = (): string | null => {
  const timestamps = [cache.weather?.fetchedAt, cache.fx?.fetchedAt].filter(Boolean) as string[]
  if (!timestamps.length) return null
  return timestamps.sort().reverse()[0]
}

/**
 * Check if cache has any data.
 */
export const hasData = (): boolean => {
  return cache.weather !== null || cache.fx !== null
}

/**
 * Check if weather data is stale (older than the configured interval).
 */
export const isWeatherStale = (maxAgeMs: number): boolean => {
  if (!cache.weather?.fetchedAt) return true
  const age = Date.now() - new Date(cache.weather.fetchedAt).getTime()
  return age > maxAgeMs
}

/**
 * Check if FX data is stale (older than the configured interval).
 */
export const isFxStale = (maxAgeMs: number): boolean => {
  if (!cache.fx?.fetchedAt) return true
  const age = Date.now() - new Date(cache.fx.fetchedAt).getTime()
  return age > maxAgeMs
}
