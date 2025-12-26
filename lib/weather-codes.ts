/**
 * Weather code descriptions for Open-Meteo API.
 *
 * Maps WMO (World Meteorological Organization) weather interpretation codes
 * to human-readable descriptions. These codes are returned by Open-Meteo API.
 *
 * @see https://open-meteo.com/en/docs#weathervariables
 * @module weather-codes
 */

/**
 * Mapping of WMO weather codes to human-readable descriptions.
 *
 * Code ranges:
 * - 0-3: Clear/cloudy conditions
 * - 45-48: Fog
 * - 51-57: Drizzle
 * - 61-67: Rain
 * - 71-77: Snow
 * - 80-86: Showers
 * - 95-99: Thunderstorms
 */
export const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

/**
 * Get human-readable weather description for an Open-Meteo weather code.
 *
 * @param code - WMO weather interpretation code (0-99)
 * @returns Weather description (e.g., "Partly cloudy") or "N/A" if code is unknown
 *
 * @example
 * describeWeather(0) // "Clear sky"
 * describeWeather(2) // "Partly cloudy"
 * describeWeather(63) // "Moderate rain"
 * describeWeather(999) // "N/A"
 */
export const describeWeather = (code: number): string => WEATHER_CODES[code] || 'N/A'

