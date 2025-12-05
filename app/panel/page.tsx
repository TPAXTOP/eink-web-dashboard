/**
 * E-Paper Panel Page - Server Component
 * Optimized for 800x480 monochrome e-paper display.
 * Uses inline SVG icons and static rendering only.
 */

import type { Metadata, Viewport } from 'next'
import './panel.css'

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
// Mock Data (to be replaced with real data integration)
// =============================================================================

const mockWeather = {
  location: 'Kyiv, Ukraine',
  current: { temp_c: 17, condition: 'Partly cloudy', icon: 'partly-cloudy' },
  hourly: [
    { time: '11:00', icon: 'partly-cloudy', temp_c: 18 },
    { time: '12:00', icon: 'partly-cloudy', temp_c: 19 },
    { time: '13:00', icon: 'cloudy', temp_c: 20 },
    { time: '14:00', icon: 'rain', temp_c: 20 },
    { time: '15:00', icon: 'partly-cloudy', temp_c: 21 },
    { time: '16:00', icon: 'sunny', temp_c: 22 },
    { time: '17:00', icon: 'sunny', temp_c: 21 },
    { time: '18:00', icon: 'cloudy', temp_c: 19 },
  ],
}

const mockOutageSchedule = {
  today: [
    { h: '00', fraction: 0 },
    { h: '01', fraction: 0 },
    { h: '02', fraction: 0 },
    { h: '03', fraction: 0 },
    { h: '04', fraction: 0 },
    { h: '05', fraction: 0 },
    { h: '06', fraction: 0 },
    { h: '07', fraction: 0 },
    { h: '08', fraction: 0 },
    { h: '09', fraction: 0.5 },
    { h: '10', fraction: 1 },
    { h: '11', fraction: 1 },
    { h: '12', fraction: 0.75 },
    { h: '13', fraction: 0 },
    { h: '14', fraction: 0 },
    { h: '15', fraction: 0 },
    { h: '16', fraction: 0 },
    { h: '17', fraction: 0 },
    { h: '18', fraction: 0 },
    { h: '19', fraction: 0 },
    { h: '20', fraction: 0 },
    { h: '21', fraction: 0 },
    { h: '22', fraction: 0 },
    { h: '23', fraction: 0 },
  ],
  tomorrow: [
    { h: '00', fraction: 0 },
    { h: '01', fraction: 0 },
    { h: '02', fraction: 0 },
    { h: '03', fraction: 0 },
    { h: '04', fraction: 0 },
    { h: '05', fraction: 0 },
    { h: '06', fraction: 0 },
    { h: '07', fraction: 0.25 },
    { h: '08', fraction: 0.5 },
    { h: '09', fraction: 1 },
    { h: '10', fraction: 1 },
    { h: '11', fraction: 1 },
    { h: '12', fraction: 0.5 },
    { h: '13', fraction: 0 },
    { h: '14', fraction: 0 },
    { h: '15', fraction: 0 },
    { h: '16', fraction: 0 },
    { h: '17', fraction: 0 },
    { h: '18', fraction: 0 },
    { h: '19', fraction: 0 },
    { h: '20', fraction: 0 },
    { h: '21', fraction: 0 },
    { h: '22', fraction: 0 },
    { h: '23', fraction: 0 },
  ],
}

const mockBackup = {
  battery_now_pct: 90,
  grid_connected: true,
  last_update: '2025-12-02 23:30',
  history_24h: [
    95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 86, 87, 88, 88, 89, 90, 90, 89, 88, 88, 89, 90,
    90,
  ],
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
  const fillHeight = Math.round((pct / 100) * 32)
  const fillY = 8 + (32 - fillHeight)
  return (
    <svg
      width="32"
      height="48"
      viewBox="0 0 32 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <rect x="4" y="8" width="24" height="36" stroke="#000" strokeWidth="2" fill="none" />
      <rect x="10" y="2" width="12" height="6" stroke="#000" strokeWidth="2" fill="none" />
      <rect x="6" y={fillY} width="20" height={fillHeight} fill="#000" />
    </svg>
  )
}

function GridOnIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#000" strokeWidth="2" />
      <line x1="7" y1="8" x2="7" y2="16" stroke="#fff" strokeWidth="2" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="#fff" strokeWidth="2" />
      <line x1="17" y1="8" x2="17" y2="16" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

function GridOffIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <rect x="2" y="2" width="20" height="20" fill="none" stroke="#000" strokeWidth="2" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="#000" strokeWidth="2" />
      <line x1="20" y1="4" x2="4" y2="20" stroke="#000" strokeWidth="2" />
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

function BatteryGraph({ history }: { history: number[] }) {
  const width = 560
  const height = 100
  const padding = { top: 10, right: 40, bottom: 20, left: 40 }
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

  const points = history.map((v, i) => `${scaleX(i).toFixed(0)},${scaleY(v).toFixed(0)}`).join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* Y-axis labels */}
      <text
        x={padding.left - 4}
        y={padding.top + 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="monospace"
        fill="#000"
      >
        100%
      </text>
      <text
        x={padding.left - 4}
        y={padding.top + graphHeight}
        textAnchor="end"
        fontSize="10"
        fontFamily="monospace"
        fill="#000"
      >
        0%
      </text>
      {/* X-axis labels */}
      <text
        x={padding.left}
        y={height - 4}
        textAnchor="start"
        fontSize="10"
        fontFamily="monospace"
        fill="#000"
      >
        24h
      </text>
      <text
        x={width - padding.right}
        y={height - 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="monospace"
        fill="#000"
      >
        Now
      </text>
      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={width - padding.right}
        y2={padding.top}
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="2,4"
      />
      <line
        x1={padding.left}
        y1={scaleY(50)}
        x2={width - padding.right}
        y2={scaleY(50)}
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="2,4"
      />
      <line
        x1={padding.left}
        y1={padding.top + graphHeight}
        x2={width - padding.right}
        y2={padding.top + graphHeight}
        stroke="#000"
        strokeWidth="1"
      />
      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + graphHeight}
        stroke="#000"
        strokeWidth="1"
      />
      {/* Data line */}
      <polyline points={points} fill="none" stroke="#000" strokeWidth="2" />
    </svg>
  )
}

function OutageTile({ hour, fraction }: { hour: string; fraction: number }) {
  const tileWidth = 23
  const tileHeight = 28

  let fillContent = null
  if (fraction === 1) {
    fillContent = <rect x="1" y="1" width={tileWidth - 2} height={tileHeight - 2} fill="#000" />
  } else if (fraction > 0) {
    const fillWidth = Math.round((tileWidth - 2) * fraction)
    fillContent = <rect x="1" y="1" width={fillWidth} height={tileHeight - 2} fill="#000" />
  }

  const textColor = fraction >= 0.5 ? '#fff' : '#000'

  return (
    <svg
      width={tileWidth}
      height={tileHeight}
      viewBox={`0 0 ${tileWidth} ${tileHeight}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      <rect
        x="0"
        y="0"
        width={tileWidth}
        height={tileHeight}
        fill="none"
        stroke="#000"
        strokeWidth="1"
      />
      {fillContent}
      <text
        x={tileWidth / 2}
        y={tileHeight / 2 + 4}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
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
}: {
  label: string
  schedule: { h: string; fraction: number }[]
}) {
  return (
    <div className="outage-row">
      <span className="outage-label">{label}</span>
      <div className="outage-tiles">
        {schedule.map((s, i) => (
          <OutageTile key={i} hour={s.h} fraction={s.fraction} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Main Panel Page Component
// =============================================================================

export default function PanelPage() {
  const weather = mockWeather
  const outage = mockOutageSchedule
  const backup = mockBackup

  return (
    <div className="panel-container">
      {/* Weather Widget - Left Column (200px) */}
      <div className="weather-column">
        <div className="weather-header">
          <div className="weather-city">{weather.location}</div>
        </div>

        <div className="weather-current">
          <div className="weather-icon">
            <WeatherIcon icon={weather.current.icon} size={48} />
          </div>
          <div className="weather-temp">{weather.current.temp_c}°</div>
          <div className="weather-condition">{weather.current.condition}</div>
        </div>

        <div className="weather-hourly-title">Hourly Forecast</div>
        <div className="weather-hourly">
          {weather.hourly.map((h, i) => (
            <div key={i} className="hourly-item">
              <span className="hourly-time">{h.time}</span>
              <WeatherIcon icon={h.icon} size={24} />
              <span className="hourly-temp">{h.temp_c}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column (600px) */}
      <div className="right-column">
        {/* Power Outage Schedule Widget - Top */}
        <div className="outage-widget">
          <div className="outage-title">Power outage</div>
          <OutageRow label="Today" schedule={outage.today} />
          <OutageRow label="Tomorrow" schedule={outage.tomorrow} />
          <div className="outage-legend">
            <div className="legend-item">
              <div className="legend-box"></div>
              <span>No outage</span>
            </div>
            <div className="legend-item">
              <div className="legend-box filled"></div>
              <span>Full outage</span>
            </div>
            <div className="legend-item">
              <div className="legend-box partial"></div>
              <span>Partial</span>
            </div>
          </div>
        </div>

        {/* Backup Power Supply Widget - Bottom */}
        <div className="backup-widget">
          <div className="backup-title">Backup power supply</div>
          <div className="backup-header">
            <div className="backup-battery">
              <BatteryIcon pct={backup.battery_now_pct} />
              <span className="battery-pct">{backup.battery_now_pct}%</span>
            </div>
            <div className="backup-grid">
              {backup.grid_connected ? <GridOnIcon /> : <GridOffIcon />}
              <span>Grid: {backup.grid_connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="backup-timestamp">Updated: {backup.last_update}</div>
          </div>
          <div className="backup-graph-label">Battery level (24h)</div>
          <div className="backup-graph">
            <BatteryGraph history={backup.history_24h} />
          </div>
        </div>
      </div>
    </div>
  )
}

