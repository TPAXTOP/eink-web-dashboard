/**
 * Weather helper functions for the power page.
 *
 * Provides utilities for converting weather codes to icons
 * and formatting time strings.
 *
 * @module weather-helpers
 */

/**
 * Weather icon type identifiers.
 */
export type WeatherIconType = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain'

/**
 * Convert Open-Meteo weather code to icon name.
 *
 * Maps WMO weather interpretation codes to icon identifiers
 * that can be used with WeatherIcon component.
 *
 * @param code - WMO weather interpretation code (0-99)
 * @returns Icon name: 'sunny', 'partly-cloudy', 'cloudy', or 'rain'
 *
 * @example
 * weatherCodeToIcon(0) // 'sunny'
 * weatherCodeToIcon(2) // 'partly-cloudy'
 * weatherCodeToIcon(3) // 'cloudy'
 * weatherCodeToIcon(63) // 'rain'
 */
export function weatherCodeToIcon(code: number): WeatherIconType {
  // Clear
  if (code === 0 || code === 1) return 'sunny'
  // Partly cloudy
  if (code === 2) return 'partly-cloudy'
  // Overcast, fog
  if (code === 3 || code === 45 || code === 48) return 'cloudy'
  // Rain, drizzle, showers
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 80 && code <= 82) return 'rain'
  // Snow
  if (code >= 71 && code <= 77) return 'cloudy'
  if (code >= 85 && code <= 86) return 'cloudy'
  // Thunderstorm
  if (code >= 95) return 'rain'
  return 'cloudy'
}

/**
 * Format ISO time string to display format (HH:MM).
 *
 * Extracts time from Open-Meteo API format which is already in Kyiv timezone.
 * Does not perform timezone conversion.
 *
 * @param isoTime - ISO time string (e.g., "2025-12-19T14:00")
 * @returns Time string (e.g., "14:00") or "--:--" if invalid
 *
 * @example
 * formatHourlyTime('2025-12-19T14:00') // '14:00'
 * formatHourlyTime('2025-12-19T09:30') // '09:30'
 * formatHourlyTime('') // '--:--'
 */
export function formatHourlyTime(isoTime: string): string {
  // isoTime format: "2025-12-19T14:00" (already in Kyiv timezone from API)
  const timePart = isoTime.split('T')[1]
  return timePart ? timePart.slice(0, 5) : '--:--'
}
