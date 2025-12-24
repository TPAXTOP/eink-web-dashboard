/**
 * Deye Cloud API Client
 *
 * Handles authentication and data fetching from Deye Cloud API.
 * API Documentation: https://eu1-developer.deyecloud.com/swagger-ui.html
 */

import { createHash } from 'crypto'
import { deyeConfig, dataFetchConfig } from './config'
import { formatKyivDateTimeForLog } from './time-utils'
import type { BackupPowerData, BatteryHistoryPoint } from './types'

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
  if (!deyeConfig.appId || !deyeConfig.appSecret || !deyeConfig.email || !deyeConfig.password) {
    logImportant('deye', '⚠ Missing Deye credentials (DEYE_APP_ID, DEYE_APP_SECRET, DEYE_EMAIL, DEYE_PASSWORD)')
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
        password: hashPassword(deyeConfig.password),
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
 * Fetch latest device data including battery SOC and grid status.
 */
async function fetchDeviceLatest(token: string): Promise<{
  batteryPercent: number
  gridConnected: boolean
  lastUpdate: string
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

    // Parse data list to find battery SOC and grid status
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

    // Convert Unix timestamp (seconds) to ISO string
    const lastUpdate = deviceData.collectionTime
      ? new Date(deviceData.collectionTime * 1000).toISOString()
      : new Date().toISOString()

    return {
      batteryPercent,
      gridConnected,
      lastUpdate,
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

    // Sort by time and limit to 24 points (hourly)
    points.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    // Sample to 24 points if we have more
    if (points.length > 24) {
      const step = Math.floor(points.length / 24)
      return points.filter((_, i) => i % step === 0).slice(0, 24)
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
  if (!deyeConfig.appId || !deyeConfig.appSecret || !deyeConfig.email || !deyeConfig.password || !deyeConfig.deviceSn) {
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

    const data: BackupPowerData = {
      batteryPercent: latest.batteryPercent,
      gridConnected: latest.gridConnected,
      lastUpdate: latest.lastUpdate,
      history24h: history,
      fetchedAt: new Date().toISOString(),
    }

    logImportant('deye', '✓ Backup power data fetched', {
      battery: data.batteryPercent,
      grid: data.gridConnected,
      historyPoints: history.length,
    })

    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logImportant('deye', '✗ Failed to fetch backup power:', message)
    return null
  }
}
