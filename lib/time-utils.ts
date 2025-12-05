export const KYIV_TIMEZONE = 'Europe/Kyiv'

const createFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...options, timeZone: KYIV_TIMEZONE })

const timeFormatter = createFormatter({
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateTimeFormatter = createFormatter({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const logFormatter = createFormatter({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const shortDateFormatter = createFormatter({
  day: 'numeric',
  month: 'short',
})

const shortDateTimeFormatter = createFormatter({
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const parseDate = (value?: string | number | Date): Date | null => {
  if (value === undefined || value === null) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const ensureDateOrNow = (value?: string | number | Date): Date => {
  return parseDate(value) ?? new Date()
}

const stripCommas = (value: string): string => value.replace(/,/g, '')

export const formatKyivTime = (value: string | number | Date): string => {
  const date = parseDate(value)
  if (!date) {
    return '--'
  }
  return stripCommas(timeFormatter.format(date))
}

/**
 * Format a time string that is already in Kyiv timezone (e.g., from Open-Meteo API).
 * This extracts the time portion without timezone conversion to avoid double-conversion issues.
 *
 * Open-Meteo API returns times like "2025-12-04T14:30" which are already in the requested timezone.
 * We extract the time portion directly to display it without adding/subtracting timezone offsets.
 */
export const formatKyivTimeFromLocalString = (isoString: string | undefined): string => {
  if (!isoString) {
    return '--'
  }

  // Extract time from ISO string (e.g., "2025-12-04T14:30:00" → "14:30")
  const match = isoString.match(/T(\d{2}):(\d{2})/)
  if (match) {
    return `${match[1]}:${match[2]}`
  }

  // Fallback to regular parsing if format is unexpected
  return formatKyivTime(isoString)
}

export const formatKyivDateTimeForDisplay = (value: string | number | Date): string => {
  const date = parseDate(value)
  if (!date) {
    return '--'
  }
  return stripCommas(dateTimeFormatter.format(date))
}

export const formatKyivDateTimeForLog = (value?: string | number | Date): string => {
  const date = ensureDateOrNow(value)
  return stripCommas(logFormatter.format(date))
}

/**
 * Format a date string as short date (e.g., "5 Dec").
 * For date-only strings like "2025-12-05", parses as local date to avoid timezone shifts.
 */
export const formatShortDate = (value: string | undefined): string => {
  if (!value) return '--'
  
  // For date-only strings (YYYY-MM-DD), parse components directly
  // to avoid timezone interpretation issues
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    // Create date at noon UTC to avoid any timezone edge cases
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0))
    return stripCommas(shortDateFormatter.format(date))
  }
  
  const date = parseDate(value)
  if (!date) return '--'
  return stripCommas(shortDateFormatter.format(date))
}

/**
 * Format an ISO timestamp as short date and time (e.g., "5 Dec 15:30").
 * Properly converts UTC timestamps to Kyiv timezone.
 */
export const formatShortDateTime = (value: string | undefined): string => {
  if (!value) return '--'
  
  const date = parseDate(value)
  if (!date) return '--'
  return stripCommas(shortDateTimeFormatter.format(date))
}

