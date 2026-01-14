/**
 * Shared TypeScript types for data structures.
 *
 * This module defines the data types used throughout the application
 * for weather, exchange rates, power outages, and backup power data.
 *
 * @module types
 */

// =============================================================================
// Weather Types (Open-Meteo API)
// =============================================================================

/**
 * Hourly weather forecast data point.
 */
export type HourlyForecast = {
  /** ISO timestamp in Kyiv timezone (from Open-Meteo API) */
  time: string
  /** Temperature in Celsius */
  temperature: number
  /** WMO weather interpretation code (0-99) */
  weatherCode: number
}

/**
 * Current weather data with optional hourly forecast.
 */
export type WeatherData = {
  /** Current temperature in Celsius */
  temperature: number
  /** Relative humidity percentage (0-100) */
  humidity: number
  /** Wind speed in km/h */
  windSpeed: number
  /** WMO weather interpretation code (0-99) */
  weatherCode: number
  /** Observation timestamp from API */
  time: string
  /** When this data was fetched (ISO timestamp) */
  fetchedAt: string
  /** Optional hourly forecast data */
  hourly?: HourlyForecast[]
}

// =============================================================================
// Exchange Rate Types (exchangerate.host API)
// =============================================================================

/**
 * Single exchange rate data point for a specific date.
 */
export type FxPoint = {
  /** Date in YYYY-MM-DD format */
  date: string
  /** Exchange rate value (base currency to target currency) */
  value: number
}

/**
 * Exchange rate data including historical points and statistics.
 */
export type FxData = {
  /** Historical exchange rate points (sorted by date) */
  points: FxPoint[]
  /** Most recent exchange rate point */
  latest: { date: string; value: number }
  /** Minimum rate in the history period */
  min: number
  /** Maximum rate in the history period */
  max: number
  /** Data source identifier */
  source: string
  /** When this data was fetched (ISO timestamp) */
  fetchedAt: string
  /** When rates were actually updated by the API (ISO timestamp) */
  updatedAt: string
}

// =============================================================================
// Power Outage Types (Yasno API)
// =============================================================================

/**
 * Time slot for a planned power outage.
 */
export type OutageSlot = {
  /** Start time in minutes from midnight (0-1440) */
  start: number
  /** End time in minutes from midnight (0-1440) */
  end: number
  /** Slot type: 'Definite' for confirmed, 'NotPlanned' for possible */
  type: 'Definite' | 'NotPlanned'
}

/**
 * Power outage schedule for a single day.
 */
export type OutageDay = {
  /** Date in YYYY-MM-DD format */
  date: string
  /** Schedule status: 'ScheduleApplies' when confirmed, 'EmergencyShutdowns' for emergencies */
  status: 'ScheduleApplies' | 'WaitingForSchedule' | 'EmergencyShutdowns' | string
  /** List of outage time slots */
  slots: OutageSlot[]
}

/**
 * Complete power outage schedule for today and tomorrow.
 */
export type OutageSchedule = {
  /** Today's outage schedule (null if not available) */
  today: OutageDay | null
  /** Tomorrow's outage schedule (null if not available) */
  tomorrow: OutageDay | null
  /** Outage group ID (e.g., "1.1", "2.2") */
  groupId: string
  /** When schedule was last updated by provider */
  updatedOn: string
  /** When this data was fetched (ISO timestamp) */
  fetchedAt: string
}

/**
 * Hourly outage fraction for display purposes.
 * Converts slot-based schedule to hour-by-hour visualization.
 */
export type HourlyOutage = {
  /** Hour of day as two-digit string ("00" to "23") */
  hour: string
  /** Fraction of hour affected (0 = no outage, 1 = full hour) */
  fraction: number
  /** Which 30-minute half of the hour is affected */
  halfAffected: 'none' | 'first' | 'second' | 'both'
}

// =============================================================================
// Backup Power Types (Deye Cloud API)
// =============================================================================

/**
 * Single battery history data point.
 */
export type BatteryHistoryPoint = {
  /** ISO timestamp of measurement */
  time: string
  /** Battery state of charge (0-100%) */
  percent: number
}

/**
 * Battery charging status.
 */
export type ChargingStatus = 'discharging' | 'charging' | 'idle' | 'unknown'

/**
 * Complete backup power data including current status and history.
 */
export type BackupPowerData = {
  /** Current battery state of charge (0-100%) */
  batteryPercent: number
  /** Whether grid power is connected */
  gridConnected: boolean
  /** Timestamp of last data update from inverter */
  lastUpdate: string
  /** 24-hour battery level history */
  history24h: BatteryHistoryPoint[]
  /** When this data was fetched (ISO timestamp) */
  fetchedAt: string
  /** Battery power flow in watts (positive = discharging, negative = charging) */
  batteryPowerWatts: number | null
  /** Current load/consumption in watts */
  loadPowerWatts: number | null
  /** Estimated remaining runtime in minutes when discharging */
  estimatedRuntimeMinutes: number | null
  /** Current battery charging/discharging state */
  chargingStatus: ChargingStatus
}
