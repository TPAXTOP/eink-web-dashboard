/**
 * E-Paper Power Page - Server Component
 * Optimized for 800x480 monochrome e-paper display.
 * Uses inline SVG icons and static rendering only.
 */

import type { Metadata, Viewport } from 'next'
import { fetchWeather, fetchOutageSchedule, getHourlyOutages } from '@/lib/data-fetchers'
import { fetchBackupPower } from '@/lib/deye-api'
import { describeWeather } from '@/lib/weather-codes'
import { formatKyivDateTimeForDisplay, extractKyivHour } from '@/lib/time-utils'
import './power.css'

// Revalidate every 15 minutes (matches outage schedule refresh)
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
// Helper Functions
// =============================================================================

/**
 * Convert Open-Meteo weather code to icon name
 */
function weatherCodeToIcon(code: number): string {
  // Clear
  if (code === 0 || code === 1) return 'sunny'
  // Partly cloudy
  if (code === 2) return 'partly-cloudy'
  // Overcast, fog
  if (code === 3 || code === 45 || code === 48) return 'cloudy'
  // Rain, drizzle, showers
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 80 && code <= 82) return 'rain'
  // Snow
  if (code >= 71 && code <= 77) return 'cloudy'
  if (code >= 85 && code <= 86) return 'cloudy'
  // Thunderstorm
  if (code >= 95) return 'rain'
  return 'cloudy'
}

/**
 * Format ISO time string to display format (HH:MM)
 */
function formatHourlyTime(isoTime: string): string {
  // isoTime format: "2025-12-19T14:00" (already in Kyiv timezone from API)
  const timePart = isoTime.split('T')[1]
  return timePart ? timePart.slice(0, 5) : '--:--'
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
// SVG Icon Components
// =============================================================================

function SunnyIcon({ size = 48 }: { size?: number }) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <circle cx="24" cy="24" r="10" stroke="#000" strokeWidth={strokeWidth} fill="none" />
      <line x1="24" y1="2" x2="24" y2="10" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="24" y1="38" x2="24" y2="46" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="2" y1="24" x2="10" y2="24" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="38" y1="24" x2="46" y2="24" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="8.5" y1="8.5" x2="14.2" y2="14.2" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="33.8" y1="33.8" x2="39.5" y2="39.5" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="8.5" y1="39.5" x2="14.2" y2="33.8" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="33.8" y1="14.2" x2="39.5" y2="8.5" stroke="#000" strokeWidth={strokeWidth} />
    </svg>
  )
}

function CloudyIcon({ size = 48 }: { size?: number }) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <path
        d="M12 36 C6 36 2 32 2 26 C2 20 6 16 12 16 C12 10 18 6 26 6 C34 6 40 12 40 20 C46 20 48 24 48 28 C48 34 44 36 38 36 Z"
        stroke="#000"
        strokeWidth={strokeWidth}
        fill="none"
      />
    </svg>
  )
}

function PartlyCloudyIcon({ size = 48 }: { size?: number }) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <circle cx="16" cy="16" r="8" stroke="#000" strokeWidth={strokeWidth} fill="none" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="4" y1="16" x2="2" y2="16" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="6" y1="6" x2="8.8" y2="8.8" stroke="#000" strokeWidth={strokeWidth} />
      {size === 48 && (
        <line x1="6" y1="26" x2="8.8" y2="23.2" stroke="#000" strokeWidth={strokeWidth} />
      )}
      <path
        d="M14 40 C8 40 6 36 6 32 C6 28 10 24 14 24 C14 20 18 16 26 16 C34 16 38 22 38 28 C44 28 46 32 46 34 C46 38 42 40 38 40 Z"
        stroke="#000"
        strokeWidth={strokeWidth}
        fill="#fff"
      />
    </svg>
  )
}

function RainIcon({ size = 48 }: { size?: number }) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <path
        d="M10 28 C4 28 2 24 2 20 C2 16 6 12 10 12 C10 6 16 2 24 2 C32 2 38 8 38 14 C44 14 46 18 46 22 C46 26 42 28 38 28 Z"
        stroke="#000"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <line x1="14" y1="34" x2="10" y2="44" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="24" y1="34" x2="20" y2="44" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="34" y1="34" x2="30" y2="44" stroke="#000" strokeWidth={strokeWidth} />
    </svg>
  )
}

function BatteryIcon({ pct }: { pct: number }) {
  const fillHeight = Math.round((pct / 100) * 30)
  const fillY = 10 + (30 - fillHeight)
  return (
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <rect x="4" y="8" width="24" height="36" rx="4" ry="4" stroke="#000" strokeWidth="2" fill="none" />
      <rect x="11" y="2" width="10" height="6" rx="2" ry="2" stroke="#000" strokeWidth="2" fill="#000" />
      {fillHeight > 0 && (
        <rect x="6" y={fillY} width="20" height={fillHeight} rx={fillY > 36 ? 2 : 0} ry={fillY > 36 ? 2 : 0} fill="#000" />
      )}
    </svg>
  )
}

function GridOnIcon() {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <polygon points="13,2 6,14 11,14 11,22 18,10 13,10" fill="#000" stroke="#000" strokeWidth="1" />
    </svg>
  )
}

function GridOffIcon() {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <polygon points="13,2 6,14 11,14 11,22 18,10 13,10" fill="none" stroke="#000" strokeWidth="2" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="#000" strokeWidth="2" />
    </svg>
  )
}

function StatusIcon({ status }: { status: 'discharging' | 'charging' | 'idle' | 'unknown' }) {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      {status === 'discharging' && (
        <>
          <line x1="12" y1="4" x2="12" y2="18" stroke="#000" strokeWidth="2" />
          <polyline points="6,12 12,20 18,12" fill="none" stroke="#000" strokeWidth="2" />
        </>
      )}
      {status === 'charging' && (
        <>
          <line x1="12" y1="6" x2="12" y2="20" stroke="#000" strokeWidth="2" />
          <polyline points="6,12 12,4 18,12" fill="none" stroke="#000" strokeWidth="2" />
        </>
      )}
      {(status === 'idle' || status === 'unknown') && (
        <polyline points="5,12 10,18 19,6" fill="none" stroke="#000" strokeWidth="2" />
      )}
    </svg>
  )
}

function LoadIcon() {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#000" strokeWidth="2" />
      <line x1="12" y1="12" x2="17" y2="7" stroke="#000" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="#000" />
    </svg>
  )
}

function WeatherIcon({ icon, size = 48 }: { icon: string; size?: number }) {
  switch (icon) {
    case 'sunny':
      return <SunnyIcon size={size} />
    case 'cloudy':
      return <CloudyIcon size={size} />
    case 'partly-cloudy':
      return <PartlyCloudyIcon size={size} />
    case 'rain':
      return <RainIcon size={size} />
    default:
      return <CloudyIcon size={size} />
  }
}

// =============================================================================
// Helper Components
// =============================================================================

function BatteryGraph({ history }: { history: { time: string; percent: number }[] }) {
  const width = 528
  const height = 180
  const padding = { top: 16, right: 8, bottom: 32, left: 36 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  if (history.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ shapeRendering: 'crispEdges' }}
      />
    )
  }

  const scaleX = (i: number) => padding.left + (i / (history.length - 1)) * graphWidth
  const scaleY = (v: number) => padding.top + graphHeight - (v / 100) * graphHeight

  // Generate tick labels from actual data timestamps at 3-hour boundaries
  const getTickLabels = (): { x: number; label: string }[] => {
    const labels: { x: number; label: string }[] = []
    let lastLabelHour = -1

    for (let i = 0; i < history.length; i++) {
      const hourStr = extractKyivHour(history[i].time)
      const hour = parseInt(hourStr, 10)

      // Show label at 3-hour boundaries (0, 3, 6, 9, 12, 15, 18, 21)
      if (!isNaN(hour) && hour % 3 === 0 && hour !== lastLabelHour) {
        labels.push({
          x: scaleX(i),
          label: hourStr,
        })
        lastLabelHour = hour
      }
    }

    return labels
  }

  const tickLabels = getTickLabels()

  const points = history
    .map((h, i) => `${scaleX(i).toFixed(0)},${scaleY(h.percent).toFixed(0)}`)
    .join(' ')

  const baselineY = padding.top + graphHeight

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* Y-axis labels */}
      <text
        x={padding.left - 6}
        y={padding.top + 5}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#000"
      >
        100%
      </text>
      <text
        x={padding.left - 6}
        y={scaleY(50) + 4}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#000"
      >
        50%
      </text>
      <text
        x={padding.left - 6}
        y={padding.top + graphHeight + 4}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#000"
      >
        0%
      </text>
      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={width - padding.right}
        y2={padding.top}
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="4,6"
      />
      <line
        x1={padding.left}
        y1={scaleY(50)}
        x2={width - padding.right}
        y2={scaleY(50)}
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="4,6"
      />
      <line
        x1={padding.left}
        y1={baselineY}
        x2={width - padding.right}
        y2={baselineY}
        stroke="#000"
        strokeWidth="2"
      />
      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={baselineY}
        stroke="#000"
        strokeWidth="2"
      />
      {/* X-axis ticks at 3-hour intervals with absolute time labels */}
      {tickLabels.map((tick, i) => (
        <g key={`tick-${i}`}>
          <line x1={tick.x} y1={baselineY} x2={tick.x} y2={baselineY + 6} stroke="#000" strokeWidth="2" />
          <text
            x={tick.x}
            y={baselineY + 18}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fontFamily="inherit"
            fill="#000"
          >
            {tick.label}
          </text>
        </g>
      ))}
      {/* Data line - thicker for e-paper */}
      <polyline points={points} fill="none" stroke="#000" strokeWidth="3" />
    </svg>
  )
}

// =============================================================================
// Runtime Formatting Helpers
// =============================================================================

/**
 * Format runtime minutes as human-readable string.
 * Examples: "~2h 30m", "~45m", "~8h"
 */
function formatRuntime(minutes: number | null): string {
  if (minutes === null) return '--'

  if (minutes < 60) {
    return `~${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `~${hours}h`
  }

  return `~${hours}h ${remainingMinutes}m`
}

/**
 * Format power in watts with appropriate unit.
 * Examples: "850W", "1.2kW"
 */
function formatPower(watts: number | null): string {
  if (watts === null) return '--'

  const absWatts = Math.abs(watts)
  if (absWatts >= 1000) {
    return `${(absWatts / 1000).toFixed(1)}kW`
  }

  return `${Math.round(absWatts)}W`
}


// =============================================================================
// Outage Components
// =============================================================================

function OutageTile({
  hour,
  fraction,
  halfAffected,
  scheduleUnavailable = false,
}: {
  hour: string
  fraction: number
  halfAffected: 'none' | 'first' | 'second' | 'both'
  scheduleUnavailable?: boolean
}) {
  const tileWidth = 23
  const tileHeight = 32

  // Light grey color for unavailable schedule
  const greyColor = '#999'

  // Determine visual state
  const isFullOutage = fraction >= 1 || halfAffected === 'both'
  const isNoOutage = fraction === 0
  const isPartial = !isNoOutage && !isFullOutage

  // When schedule is unavailable, use grey instead of black
  const fillColor = scheduleUnavailable ? greyColor : '#000'

  // Text positioning and color based on state
  let textX = tileWidth / 2
  let textColor = '#000'

  if (isFullOutage) {
    textColor = '#fff'
  } else if (isPartial) {
    // Position text in the white area for contrast
    if (halfAffected === 'first') {
      textX = tileWidth * 0.7 // Right side (white area)
    } else if (halfAffected === 'second') {
      textX = tileWidth * 0.3 // Left side (white area)
    }
  }

  return (
    <svg
      width={tileWidth}
      height={tileHeight}
      viewBox={`0 0 ${tileWidth} ${tileHeight}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* White background */}
      <rect x="0" y="0" width={tileWidth} height={tileHeight} fill="#fff" />

      {/* Full outage: solid fill (black or grey depending on schedule availability) */}
      {isFullOutage && (
        <rect x="0" y="0" width={tileWidth} height={tileHeight} fill={fillColor} />
      )}

      {/* Partial outage: diagonal fill */}
      {isPartial && halfAffected === 'first' && (
        // Left triangle (bottom-left to top-right diagonal, left side filled)
        <polygon points={`0,${tileHeight} 0,0 ${tileWidth},0`} fill={fillColor} />
      )}
      {isPartial && halfAffected === 'second' && (
        // Right triangle (bottom-left to top-right diagonal, right side filled)
        <polygon points={`0,${tileHeight} ${tileWidth},0 ${tileWidth},${tileHeight}`} fill={fillColor} />
      )}

      {/* Hour label */}
      <text
        x={textX}
        y={tileHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="inherit"
        fill={textColor}
      >
        {hour}
      </text>
    </svg>
  )
}

function OutageRow({
  label,
  schedule,
  scheduleApplies = true,
}: {
  label: string
  schedule: { hour: string; fraction: number; halfAffected: 'none' | 'first' | 'second' | 'both' }[]
  scheduleApplies?: boolean
}) {
  return (
    <div className="outage-day">
      <span className="outage-day-label">{label}</span>
      <div className="outage-tiles">
        {schedule.map((s, i) => (
          <OutageTile
            key={i}
            hour={s.hour}
            fraction={s.fraction}
            halfAffected={s.halfAffected}
            scheduleUnavailable={!scheduleApplies}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Main Panel Page Component
// =============================================================================

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

