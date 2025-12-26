/**
 * Centralized logging utility for the application.
 *
 * Provides consistent log formatting with timestamps in Kyiv timezone.
 * Uses appropriate console methods (error, warn, log) for each log level.
 *
 * Log Levels:
 * - error: Critical failures, always logged via console.error
 * - warn: Potential issues, always logged via console.warn
 * - info: Significant events, always logged via console.log
 * - debug: Diagnostic details, only logged when verbose mode is enabled
 *
 * @module logger
 */

import { formatKyivDateTimeForLog } from './time-utils'
import { loggingConfig } from './config'

/**
 * Log levels supported by the logger.
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/**
 * Get current timestamp formatted for logs in Kyiv timezone.
 *
 * @returns Formatted timestamp string (e.g., "26/12/2025 14:30:45")
 */
const getTimestamp = (): string => formatKyivDateTimeForLog()

/**
 * Format a log prefix with tag and timestamp.
 *
 * @param tag - Module/component identifier (e.g., "weather", "deye", "fx")
 * @returns Formatted prefix string
 */
const formatPrefix = (tag: string): string => `[${tag}] ${getTimestamp()}`

/**
 * Log an error message. Always logged regardless of verbose setting.
 * Uses console.error for proper error stream output.
 *
 * @param tag - Module/component identifier
 * @param args - Message and additional data to log
 *
 * @example
 * logError('weather', 'Failed to fetch weather:', error.message)
 */
export const logError = (tag: string, ...args: unknown[]): void => {
  console.error(formatPrefix(tag), ...args)
}

/**
 * Log a warning message. Always logged regardless of verbose setting.
 * Uses console.warn for proper warning stream output.
 *
 * @param tag - Module/component identifier
 * @param args - Message and additional data to log
 *
 * @example
 * logWarn('fx', 'Missing API key, using fallback data')
 */
export const logWarn = (tag: string, ...args: unknown[]): void => {
  console.warn(formatPrefix(tag), ...args)
}

/**
 * Log an important info message. Always logged regardless of verbose setting.
 * Use for significant events like successful data fetches.
 *
 * @param tag - Module/component identifier
 * @param args - Message and additional data to log
 *
 * @example
 * logInfo('weather', 'Weather data fetched successfully', { temp: 15 })
 */
export const logInfo = (tag: string, ...args: unknown[]): void => {
  console.log(formatPrefix(tag), ...args)
}

/**
 * Log a debug message. Only logged when verbose mode is enabled.
 * Use for detailed diagnostic information during development.
 *
 * @param tag - Module/component identifier
 * @param args - Message and additional data to log
 *
 * @example
 * logDebug('fx', 'Requesting rates', { start: '2025-11-26', end: '2025-12-26' })
 */
export const logDebug = (tag: string, ...args: unknown[]): void => {
  if (loggingConfig.verbose) {
    console.log(formatPrefix(tag), ...args)
  }
}

/**
 * Logger interface returned by createLogger.
 */
export interface ScopedLogger {
  /** Log an error message */
  error: (...args: unknown[]) => void
  /** Log a warning message */
  warn: (...args: unknown[]) => void
  /** Log an info message */
  info: (...args: unknown[]) => void
  /** Log a debug message (only when verbose mode is enabled) */
  debug: (...args: unknown[]) => void
}

/**
 * Create a scoped logger for a specific module.
 * Reduces repetition when logging multiple messages from the same module.
 *
 * @param tag - Module/component identifier
 * @returns Object with scoped logging methods
 *
 * @example
 * const logger = createLogger('weather')
 * logger.info('Fetching weather data')
 * logger.error('Failed to fetch:', error.message)
 */
export const createLogger = (tag: string): ScopedLogger => ({
  error: (...args: unknown[]) => logError(tag, ...args),
  warn: (...args: unknown[]) => logWarn(tag, ...args),
  info: (...args: unknown[]) => logInfo(tag, ...args),
  debug: (...args: unknown[]) => logDebug(tag, ...args),
})
