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
