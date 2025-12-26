/**
 * E-Paper Power Page - Server Component
 *
 * Optimized for 800x480 monochrome e-paper display.
 * Displays weather, power outage schedule, and backup power status.
 *
 * @module power/page
 */

import type { Metadata, Viewport } from 'next'
import { fetchWeather, fetchOutageSchedule, getHourlyOutages } from '@/lib/data-fetchers'
import { fetchBackupPower } from '@/lib/deye-api'
import { describeWeather } from '@/lib/weather-codes'
import { formatKyivDateTimeForDisplay } from '@/lib/time-utils'
import { weatherCodeToIcon, formatHourlyTime } from '@/lib/weather-helpers'
import { formatRuntime, formatPower } from '@/lib/power-format-utils'
import {
  WeatherIcon,
  BatteryIcon,
  GridOnIcon,
  GridOffIcon,
  StatusIcon,
  LoadIcon,
} from '@/app/components/icons'
import { BatteryGraph } from '@/app/components/BatteryGraph'
import { OutageRow } from '@/app/components/OutageDisplay'
import './power.css'

/** Revalidate every 15 minutes (matches outage schedule refresh) */
export const revalidate = 900

export const metadata: Metadata = {
  title: 'E-Paper Dashboard',
}

export const viewport: Viewport = {
  width: 800,
  height: 480,
  initialScale: 1,
  userScalable: false,
}

// =============================================================================
// Mock Data (fallback when Deye API is not configured)
// =============================================================================

const mockBackup = {
  batteryPercent: 90,
  gridConnected: true,
  lastUpdate: new Date().toISOString(),
  // 96 points at 15-minute intervals for 24 hours
  history24h: Array.from({ length: 96 }, (_, i) => ({
    time: new Date(Date.now() - (95 - i) * 15 * 60 * 1000).toISOString(),
    percent: Math.round(85 + Math.sin(i / 8) * 10), // Varies between 75-95%
  })),
  fetchedAt: new Date().toISOString(),
  // Power flow mock data
  batteryPowerWatts: -350, // Negative = charging (grid connected)
  loadPowerWatts: 450,
  estimatedRuntimeMinutes: null, // Not discharging
  chargingStatus: 'charging' as const,
}

// =============================================================================
// Main Panel Page Component
// =============================================================================

/**
 * Main power page component.
 *
 * Fetches and displays:
 * - Current weather and hourly forecast
 * - Power outage schedule for today and tomorrow
 * - Backup power status with battery graph
 */
export default async function PanelPage() {
  // Fetch real data in parallel
  const [weatherData, outageSchedule, backupPowerData] = await Promise.all([
    fetchWeather(),
    fetchOutageSchedule(),
    fetchBackupPower(),
  ])

  // Convert outage schedule to hourly fractions for display
  const outage = getHourlyOutages(outageSchedule)

  // Use real backup data if available, otherwise fallback to mock
  const backup = backupPowerData || mockBackup

  // Prepare weather display data
  const currentIcon = weatherData ? weatherCodeToIcon(weatherData.weatherCode) : 'cloudy'
  const currentCondition = weatherData ? describeWeather(weatherData.weatherCode) : 'No data'
  const currentTemp = weatherData ? Math.round(weatherData.temperature) : '--'
  const currentHumidity = weatherData?.humidity ?? null

  // Filter hourly forecast to show only future hours (not past)
  const now = new Date()
  const hourlyForecast = weatherData?.hourly?.filter((h) => {
    const forecastTime = new Date(h.time)
    return forecastTime.getTime() > now.getTime()
  }).slice(0, 6) || []

  return (
    <div className="panel-container">
      {/* Weather Widget - Left Column (240px) */}
      <div className="weather-column">
        <div className="weather-header">
          <div className="weather-city">Kyiv, Ukraine</div>
        </div>

        <div className="weather-current">
          <div className="weather-icon">
            <WeatherIcon icon={currentIcon} size={48} />
          </div>
          <div className="weather-temp">{currentTemp}°</div>
          <div className="weather-condition">{currentCondition}</div>
          {currentHumidity !== null && (
            <div className="weather-humidity">Humidity: {currentHumidity}%</div>
          )}
        </div>

        <div className="weather-hourly">
          {hourlyForecast.length > 0 ? (
            hourlyForecast.map((h, i) => (
              <div key={i} className="hourly-item">
                <span className="hourly-time">{formatHourlyTime(h.time)}</span>
                <WeatherIcon icon={weatherCodeToIcon(h.weatherCode)} size={24} />
                <span className="hourly-temp">{Math.round(h.temperature)}°</span>
              </div>
            ))
          ) : (
            <div className="hourly-item">
              <span className="hourly-time">--:--</span>
              <span className="hourly-temp">--°</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column (560px) */}
      <div className="right-column">
        {/* Power Outage Schedule Widget - Top */}
        <div className="outage-widget">
          <div className="outage-title">Power outage</div>
          <OutageRow
            label="Today"
            schedule={outage.today.hours}
            scheduleApplies={outage.today.scheduleApplies}
          />
          <OutageRow
            label="Tomorrow"
            schedule={outage.tomorrow.hours}
            scheduleApplies={outage.tomorrow.scheduleApplies}
          />
        </div>

        {/* Backup Power Supply Widget - Bottom */}
        <div className="backup-widget">
          <div className="backup-title-row">
            <span className="backup-title">Backup power supply</span>
            <span className="backup-timestamp">
              Updated: {formatKyivDateTimeForDisplay(backup.lastUpdate)}
            </span>
          </div>
          <div className="backup-header">
            <div className="backup-item">
              <BatteryIcon pct={backup.batteryPercent} />
              <span className="backup-value-lg">{backup.batteryPercent}%</span>
            </div>
            <div className="backup-item">
              {backup.gridConnected ? <GridOnIcon /> : <GridOffIcon />}
              <span className="backup-value-lg">{backup.gridConnected ? 'ON' : 'OFF'}</span>
            </div>
            <div className="backup-item">
              <StatusIcon status={backup.chargingStatus} />
              <span className="backup-value-lg">
                {backup.chargingStatus === 'discharging'
                  ? (backup.estimatedRuntimeMinutes ? formatRuntime(backup.estimatedRuntimeMinutes) : 'Drain')
                  : backup.chargingStatus === 'charging' ? 'Charge' : 'Idle'}
              </span>
            </div>
            <div className="backup-item">
              <LoadIcon />
              <span className="backup-value-lg">{formatPower(backup.loadPowerWatts)}</span>
            </div>
          </div>
          <div className="backup-graph">
            <BatteryGraph history={backup.history24h} />
          </div>
        </div>
      </div>
    </div>
  )
}
