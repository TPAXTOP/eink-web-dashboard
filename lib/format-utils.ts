/**
 * Formatting utilities for display values.
 *
 * Provides consistent formatting functions for rates, dates, and times.
 * All time-related functions delegate to time-utils.ts for Kyiv timezone handling.
 *
 * @module format-utils
 */

import { formatKyivTimeFromLocalString, formatKyivDateTimeForDisplay, formatKyivTime, formatShortDate, formatShortDateTime } from './time-utils'

/**
 * Format a numeric rate value to 2 decimal places.
 *
 * @param value - The rate value to format
 * @returns Formatted string (e.g., "41.55") or "--" if undefined
 *
 * @example
 * formatRate(41.5523) // "41.55"
 * formatRate(undefined) // "--"
 */
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

/**
 * Format an ISO timestamp as full date-time in Kyiv timezone.
 *
 * @param isoString - ISO 8601 timestamp string
 * @returns Formatted date-time (e.g., "26/12/2025 14:30") or "--" if invalid
 *
 * @example
 * formatDateTime('2025-12-26T12:30:00Z') // "26/12/2025 14:30"
 */
export const formatDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '--'
  return formatKyivDateTimeForDisplay(isoString)
}

/**
 * Format a date string as short date (e.g., "26 Dec").
 *
 * @param dateString - Date string in YYYY-MM-DD or ISO format
 * @returns Short date string (e.g., "26 Dec") or "--" if invalid
 *
 * @example
 * formatDate('2025-12-26') // "26 Dec"
 */
export const formatDate = (dateString: string | undefined): string => {
  return formatShortDate(dateString)
}

/**
 * Format an ISO timestamp as short date-time (e.g., "26 Dec 14:30").
 *
 * @param isoString - ISO 8601 timestamp string
 * @returns Short date-time string or "--" if invalid
 *
 * @example
 * formatDateTimeShort('2025-12-26T12:30:00Z') // "26 Dec 14:30"
 */
export const formatDateTimeShort = (isoString: string | undefined): string => {
  return formatShortDateTime(isoString)
}

