/**
 * Formatting utilities for power page display values.
 *
 * Provides human-readable formatting for runtime and power values.
 *
 * @module power-format-utils
 */

/**
 * Format runtime minutes as human-readable string.
 *
 * @param minutes - Runtime in minutes, or null if unknown
 * @returns Formatted string (e.g., "~2h 30m", "~45m", "~8h", "--")
 *
 * @example
 * formatRuntime(150) // "~2h 30m"
 * formatRuntime(45) // "~45m"
 * formatRuntime(480) // "~8h"
 * formatRuntime(null) // "--"
 */
export function formatRuntime(minutes: number | null): string {
  if (minutes === null) return '--'

  if (minutes < 60) {
    return `~${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `~${hours}h`
  }

  return `~${hours}h ${remainingMinutes}m`
}

/**
 * Format power in watts with appropriate unit.
 *
 * Uses watts (W) for values under 1000, kilowatts (kW) for larger values.
 * Always shows absolute value (sign is handled separately by caller).
 *
 * @param watts - Power in watts, or null if unknown
 * @returns Formatted string (e.g., "850W", "1.2kW", "--")
 *
 * @example
 * formatPower(850) // "850W"
 * formatPower(1250) // "1.3kW"
 * formatPower(-350) // "350W" (absolute value)
 * formatPower(null) // "--"
 */
export function formatPower(watts: number | null): string {
  if (watts === null) return '--'

  const absWatts = Math.abs(watts)
  if (absWatts >= 1000) {
    return `${(absWatts / 1000).toFixed(1)}kW`
  }

  return `${Math.round(absWatts)}W`
}
