/**
 * Formatting utilities for display values.
 */

import { formatKyivTimeFromLocalString, formatKyivDateTimeForDisplay, formatKyivTime, formatShortDate, formatShortDateTime } from './time-utils'

export const formatRate = (value: number | undefined): string => {
  if (typeof value !== 'number') return '--'
  return value.toFixed(2)
}

/**
 * Format a time string for display in Kyiv timezone.
 * 
 * Handles two cases:
 * - UTC timestamps (ending with 'Z' or containing timezone offset): converts to Kyiv timezone
 * - Local timestamps (like Open-Meteo API times already in Kyiv): extracts time directly
 */
export const formatTime = (isoString: string | undefined): string => {
  if (!isoString) return '--'
  
  // If the string is a UTC timestamp (ends with Z) or has timezone offset,
  // use proper timezone conversion
  if (isoString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(isoString)) {
    return formatKyivTime(isoString)
  }
  
  // For local timestamps (like from Open-Meteo API that are already in Kyiv timezone),
  // extract the time directly without conversion
  return formatKyivTimeFromLocalString(isoString)
}

export const formatDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '--'
  return formatKyivDateTimeForDisplay(isoString)
}

export const formatDate = (dateString: string | undefined): string => {
  return formatShortDate(dateString)
}

export const formatDateTimeShort = (isoString: string | undefined): string => {
  return formatShortDateTime(isoString)
}

