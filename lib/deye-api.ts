/**
 * Deye Cloud API Client
 *
 * Handles authentication and data fetching from Deye Cloud API.
 * API Documentation: https://eu1-developer.deyecloud.com/swagger-ui.html
 */

import { createHash } from 'crypto'
import { deyeConfig, dataFetchConfig } from './config'
import { formatKyivDateTimeForLog } from './time-utils'
import type { BackupPowerData, BatteryHistoryPoint, ChargingStatus } from './types'

// =============================================================================
// Logging
// =============================================================================

const getTimestamp = () => formatKyivDateTimeForLog()

const logImportant = (tag: string, ...args: unknown[]) => {
  console.log(`[${tag}]`, getTimestamp(), ...args)
}

// =============================================================================
// Authentication
// =============================================================================

type DeyeToken = {
  accessToken: string
  expiresAt: number // Unix timestamp
}

// In-memory token cache (will be refreshed on each cold start)
let cachedToken: DeyeToken | null = null

/**
 * Hash password using SHA256 (required by Deye API)
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * Get a valid access token, refreshing if necessary.
 */
async function getAccessToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken
  }

  // Validate config
  if (!deyeConfig.appId || !deyeConfig.appSecret || !deyeConfig.email || (!deyeConfig.password && !deyeConfig.hashedPassword)) {
    logImportant('deye', '⚠ Missing Deye credentials (DEYE_APP_ID, DEYE_APP_SECRET, DEYE_EMAIL, DEYE_PASSWORD or DEYE_HASHED_PASSWORD)')
    return null
  }

  logImportant('deye', '→ Authenticating with Deye Cloud API')

  try {
    const url = `${deyeConfig.apiUrl}/v1.0/account/token?appId=${encodeURIComponent(deyeConfig.appId)}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appSecret: deyeConfig.appSecret,
        email: deyeConfig.email,
        password: deyeConfig.hashedPassword || hashPassword(deyeConfig.password),
      }),
      cache: 'no-store', // Don't cache auth requests
    })

    if (!response.ok) {
      throw new Error(`Auth failed with status ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || data.code !== '1000000') {
      throw new Error(data.msg || `Authentication failed with code ${data.code}`)
    }

    // Token can be in data.accessToken or data.data.accessToken
    const accessToken = data.accessToken || data.data?.accessToken
    const expiresIn = data.expiresIn || data.data?.expiresIn

    if (!accessToken) {
      throw new Error('No access token in response')
    }

    // Cache the token (expiresIn is in seconds)
    cachedToken = {
      accessToken,
      expiresAt: Date.now() + (expiresIn || 3600) * 1000,
    }

    logImportant('deye', '✓ Authentication successful')
    return accessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('deye', '✗ Authentication failed:', message)
    cachedToken = null
    return null
  }
}

// =============================================================================
// Measure Point Key Matching
// =============================================================================

/**
 * Measure point key variants (different inverter models use different keys).
 * Keys are matched case-insensitively with partial matching.
 */
const MEASURE_POINT_KEYS = {
  batteryPower: ['batterypower', 'battppower', 'battery_power', 'batt_power'],
  loadPower: ['loadpower', 'totalloadpower', 'load_power', 'total_load_power', 'usepower'],
} as const

/**
 * Find a numeric value from dataList by checking multiple possible key names.
 */
function findValueByKeys(
  dataList: Array<{ key?: string; value?: string }>,
  keys: readonly string[]
): number | null {
  for (const item of dataList) {
    const itemKey = item.key?.toLowerCase() || ''
    if (keys.some((k) => itemKey.includes(k)) && item.value) {
      const parsed = parseFloat(item.value)
      if (!isNaN(parsed)) {
        return parsed
      }
    }
  }
  return null
}

// =============================================================================
// Runtime Calculation
// =============================================================================

/**
 * Calculate estimated runtime in minutes based on battery capacity and discharge power.
 * Formula: (capacity_wh * (soc/100)) / discharge_power_w * 60
 */
function calculateRuntimeMinutes(
  batteryPercent: number,
  dischargePowerWatts: number
): number | null {
  if (dischargePowerWatts <= 0) return null // Not discharging

  const availableEnergyWh = deyeConfig.batteryCapacityWh * (batteryPercent / 100)
  const runtimeHours = availableEnergyWh / dischargePowerWatts
  return Math.round(runtimeHours * 60)
}

/**
 * Determine charging status from battery power value.
 * Positive = discharging, negative = charging, near zero = idle.
 */
function getChargingStatus(batteryPowerWatts: number | null): ChargingStatus {
  if (batteryPowerWatts === null) return 'unknown'
  if (batteryPowerWatts > 50) return 'discharging' // >50W threshold to avoid noise
  if (batteryPowerWatts < -50) return 'charging' // <-50W threshold
  return 'idle'
}

// =============================================================================
// Device Data Fetching
// =============================================================================

type DeviceLatestResponse = {
  success: boolean
  code: string
  msg?: string
  deviceDataList?: Array<{
    deviceSn?: string
    collectionTime?: number // Unix timestamp in seconds
    dataList?: Array<{
      key?: string
      value?: string
      unit?: string
    }>
  }>
}

/**
 * Fetch latest device data including battery SOC, grid status, and power flow.
 */
async function fetchDeviceLatest(token: string): Promise<{
  batteryPercent: number
  gridConnected: boolean
  lastUpdate: string
  batteryPowerWatts: number | null
  loadPowerWatts: number | null
} | null> {
  if (!deyeConfig.deviceSn) {
    logImportant('deye', '⚠ Missing DEYE_DEVICE_SN')
    return null
  }

  try {
    const url = `${deyeConfig.apiUrl}/v1.0/device/latest`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceList: [deyeConfig.deviceSn],
      }),
      next: { revalidate: dataFetchConfig.backupRevalidateSeconds },
    })

    if (!response.ok) {
      throw new Error(`Device latest API responded with ${response.status}`)
    }

    const data: DeviceLatestResponse = await response.json()

    if (!data.success || data.code !== '1000000') {
      logImportant('deye', '✗ Device latest API error:', data.code, data.msg)
      throw new Error(data.msg || 'Failed to get device data')
    }

    logImportant('deye', '→ Device latest response received, devices:', data.deviceDataList?.length || 0)

    const deviceData = data.deviceDataList?.[0]
    if (!deviceData) {
      throw new Error('No device data in response')
    }

    // Parse data list to find battery SOC, grid status, and power values
    const dataList = deviceData.dataList || []
    let batteryPercent = 0
    let gridConnected = false

    for (const item of dataList) {
      // Battery SOC: key "SOC"
      if (item.key?.toLowerCase() === 'soc' && item.value) {
        batteryPercent = parseFloat(item.value) || 0
      }
      // Grid connection: detect by grid voltage presence
      // If GridVoltageL1L2 (or similar) > 100V, grid is connected
      if (item.key?.toLowerCase().includes('gridvoltage') && item.value) {
        const voltage = parseFloat(item.value) || 0
        if (voltage > 100) {
          gridConnected = true
        }
      }
    }

    // Extract power flow data using flexible key matching
    const batteryPowerWatts = findValueByKeys(dataList, MEASURE_POINT_KEYS.batteryPower)
    const loadPowerWatts = findValueByKeys(dataList, MEASURE_POINT_KEYS.loadPower)

    // Convert Unix timestamp (seconds) to ISO string
    const lastUpdate = deviceData.collectionTime
      ? new Date(deviceData.collectionTime * 1000).toISOString()
      : new Date().toISOString()

    return {
      batteryPercent,
      gridConnected,
      lastUpdate,
      batteryPowerWatts,
      loadPowerWatts,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('deye', '✗ Failed to fetch device latest:', message)
    return null
  }
}

/**
 * Fetch battery history for the last 24 hours.
 * Note: API limits to 5-day window max.
 */
async function fetchDeviceHistory(token: string): Promise<BatteryHistoryPoint[]> {
  if (!deyeConfig.deviceSn) {
    return []
  }

  try {
    const url = `${deyeConfig.apiUrl}/v1.0/device/historyRaw`

    // Get data for last 24 hours (timestamps in seconds, not milliseconds)
    const endTimestamp = Math.floor(Date.now() / 1000)
    const startTimestamp = endTimestamp - 24 * 60 * 60

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceSn: deyeConfig.deviceSn,
        startTimestamp,
        endTimestamp,
        measurePoints: ['SOC'], // Standard measurement point for state of charge
      }),
      next: { revalidate: dataFetchConfig.backupHistoryRevalidateSeconds },
    })

    if (!response.ok) {
      throw new Error(`Device history API responded with ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || data.code !== '1000000') {
      logImportant('deye', '✗ Device history API error:', data.code, data.msg)
      throw new Error(data.msg || 'Failed to get device history')
    }

    logImportant('deye', '→ Device history response received, data points:', data.dataList?.length || 0)

    // Parse history data - response has dataList with time and itemList
    const points: BatteryHistoryPoint[] = []
    const historyList = data.dataList || []

    for (const item of historyList) {
      if (item.time && item.itemList) {
        // Find SOC value in itemList
        for (const dataPoint of item.itemList) {
          if (dataPoint.key?.toLowerCase().includes('soc') && dataPoint.value !== undefined) {
            points.push({
              time: new Date(item.time * 1000).toISOString(), // Convert seconds to ms
              percent: parseFloat(dataPoint.value) || 0,
            })
            break // Only take the first SOC value per timestamp
          }
        }
      }
    }

    // Sort by time chronologically (oldest first)
    points.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    // Target 96 points for 15-minute granularity over 24 hours
    const TARGET_HISTORY_POINTS = 96

    // Downsample evenly if we have more points, ensuring the most recent point is always included
    if (points.length > TARGET_HISTORY_POINTS) {
      const step = (points.length - 1) / (TARGET_HISTORY_POINTS - 1)
      const sampled: BatteryHistoryPoint[] = []
      for (let i = 0; i < TARGET_HISTORY_POINTS; i++) {
        sampled.push(points[Math.round(i * step)])
      }
      return sampled
    }

    return points
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('deye', '✗ Failed to fetch device history:', message)
    return []
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch complete backup power data including current status and 24h history.
 */
export async function fetchBackupPower(): Promise<BackupPowerData | null> {
  logImportant('deye', '→ Fetching backup power data')

  // Check if Deye is configured
  if (!deyeConfig.appId || !deyeConfig.appSecret || !deyeConfig.email || (!deyeConfig.password && !deyeConfig.hashedPassword) || !deyeConfig.deviceSn) {
    logImportant('deye', '⚠ Deye not configured - using mock data')
    return null
  }

  try {
    const token = await getAccessToken()
    if (!token) {
      return null
    }

    // Fetch current status and history in parallel
    const [latest, history] = await Promise.all([
      fetchDeviceLatest(token),
      fetchDeviceHistory(token),
    ])

    if (!latest) {
      return null
    }

    // Calculate charging status and runtime estimate
    const chargingStatus = getChargingStatus(latest.batteryPowerWatts)
    const estimatedRuntimeMinutes =
      chargingStatus === 'discharging' && latest.batteryPowerWatts
        ? calculateRuntimeMinutes(latest.batteryPercent, latest.batteryPowerWatts)
        : null

    const data: BackupPowerData = {
      batteryPercent: latest.batteryPercent,
      gridConnected: latest.gridConnected,
      lastUpdate: latest.lastUpdate,
      history24h: history,
      fetchedAt: new Date().toISOString(),
      // Power flow data
      batteryPowerWatts: latest.batteryPowerWatts,
      loadPowerWatts: latest.loadPowerWatts,
      estimatedRuntimeMinutes,
      chargingStatus,
    }

    logImportant('deye', '✓ Backup power data fetched', {
      battery: data.batteryPercent,
      grid: data.gridConnected,
      historyPoints: history.length,
      batteryPower: data.batteryPowerWatts,
      loadPower: data.loadPowerWatts,
      runtime: data.estimatedRuntimeMinutes,
      status: data.chargingStatus,
    })

    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('deye', '✗ Failed to fetch backup power:', message)
    return null
  }
}
