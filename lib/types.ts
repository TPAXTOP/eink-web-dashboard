/**
 * Shared types for data structures.
 */

export type HourlyForecast = {
  time: string
  temperature: number
  weatherCode: number
}

export type WeatherData = {
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  time: string
  fetchedAt: string
  hourly?: HourlyForecast[]
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
  updatedAt: string // Timestamp from API response (when rates were actually updated)
}

// =============================================================================
// Power Outage Types (Yasno API)
// =============================================================================

export type OutageSlot = {
  start: number // Minutes from midnight (0-1440)
  end: number // Minutes from midnight (0-1440)
  type: 'Definite' | 'NotPlanned'
}

export type OutageDay = {
  date: string
  status: 'ScheduleApplies' | 'WaitingForSchedule' | string
  slots: OutageSlot[]
}

export type OutageSchedule = {
  today: OutageDay | null
  tomorrow: OutageDay | null
  groupId: string
  updatedOn: string
  fetchedAt: string
}

/**
 * Hourly outage fraction for display (0 = no outage, 1 = full hour outage)
 */
export type HourlyOutage = {
  hour: string // "00" - "23"
  fraction: number // 0 to 1
  halfAffected: 'none' | 'first' | 'second' | 'both' // which 30-min half has outage
}

// =============================================================================
// Backup Power Types (Deye Cloud API)
// =============================================================================

export type BatteryHistoryPoint = {
  time: string // ISO timestamp
  percent: number // 0-100
}

export type ChargingStatus = 'discharging' | 'charging' | 'idle' | 'unknown'

export type BackupPowerData = {
  batteryPercent: number // Current SOC (0-100)
  gridConnected: boolean // Grid connection status
  lastUpdate: string // Timestamp of last data update
  history24h: BatteryHistoryPoint[] // 24h battery history
  fetchedAt: string
  // Power flow data for runtime estimation
  batteryPowerWatts: number | null // Positive = discharging, negative = charging
  loadPowerWatts: number | null // Current load consumption in watts
  estimatedRuntimeMinutes: number | null // Calculated runtime when discharging
  chargingStatus: ChargingStatus // Current battery state
}

