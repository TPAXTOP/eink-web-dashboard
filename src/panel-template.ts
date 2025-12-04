/**
 * E-Paper Panel Template - Server-side rendered HTML
 * Optimized for 800x480 monochrome e-paper display.
 * Uses inline SVG icons and static rendering only.
 */

// =============================================================================
// Mock Data (to be replaced with real data integration)
// =============================================================================

/* <!-- TODO: Replace mock weather with real API --> */
const mockWeather = {
  location: "Kyiv, Ukraine",
  current: { temp_c: 17, condition: "Partly cloudy", icon: "partly-cloudy" },
  hourly: [
    { time: "11:00", icon: "partly-cloudy", temp_c: 18 },
    { time: "12:00", icon: "partly-cloudy", temp_c: 19 },
    { time: "13:00", icon: "cloudy", temp_c: 20 },
    { time: "14:00", icon: "rain", temp_c: 20 },
    { time: "15:00", icon: "partly-cloudy", temp_c: 21 },
    { time: "16:00", icon: "sunny", temp_c: 22 },
    { time: "17:00", icon: "sunny", temp_c: 21 },
    { time: "18:00", icon: "cloudy", temp_c: 19 }
  ]
}

/* <!-- TODO: Load outage schedule dynamically --> */
const mockOutageSchedule = {
  today: [
    { h: "00", fraction: 0 }, { h: "01", fraction: 0 }, { h: "02", fraction: 0 },
    { h: "03", fraction: 0 }, { h: "04", fraction: 0 }, { h: "05", fraction: 0 },
    { h: "06", fraction: 0 }, { h: "07", fraction: 0 }, { h: "08", fraction: 0 },
    { h: "09", fraction: 0.5 }, { h: "10", fraction: 1 }, { h: "11", fraction: 1 },
    { h: "12", fraction: 0.75 }, { h: "13", fraction: 0 }, { h: "14", fraction: 0 },
    { h: "15", fraction: 0 }, { h: "16", fraction: 0 }, { h: "17", fraction: 0 },
    { h: "18", fraction: 0 }, { h: "19", fraction: 0 }, { h: "20", fraction: 0 },
    { h: "21", fraction: 0 }, { h: "22", fraction: 0 }, { h: "23", fraction: 0 }
  ],
  tomorrow: [
    { h: "00", fraction: 0 }, { h: "01", fraction: 0 }, { h: "02", fraction: 0 },
    { h: "03", fraction: 0 }, { h: "04", fraction: 0 }, { h: "05", fraction: 0 },
    { h: "06", fraction: 0 }, { h: "07", fraction: 0.25 }, { h: "08", fraction: 0.5 },
    { h: "09", fraction: 1 }, { h: "10", fraction: 1 }, { h: "11", fraction: 1 },
    { h: "12", fraction: 0.5 }, { h: "13", fraction: 0 }, { h: "14", fraction: 0 },
    { h: "15", fraction: 0 }, { h: "16", fraction: 0 }, { h: "17", fraction: 0 },
    { h: "18", fraction: 0 }, { h: "19", fraction: 0 }, { h: "20", fraction: 0 },
    { h: "21", fraction: 0 }, { h: "22", fraction: 0 }, { h: "23", fraction: 0 }
  ]
}

/* <!-- TODO: Connect battery data to actual UPS telemetry --> */
const mockBackup = {
  battery_now_pct: 90,
  grid_connected: true,
  last_update: "2025-12-02 23:30",
  history_24h: [95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 86, 87, 88, 88, 89, 90, 90, 89, 88, 88, 89, 90, 90]
}

// =============================================================================
// SVG Icons - Inline for crisp e-paper rendering
// =============================================================================

const SVG_ICONS = {
  sunny: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <circle cx="24" cy="24" r="10" stroke="#000" stroke-width="2" fill="none"/>
    <line x1="24" y1="2" x2="24" y2="10" stroke="#000" stroke-width="2"/>
    <line x1="24" y1="38" x2="24" y2="46" stroke="#000" stroke-width="2"/>
    <line x1="2" y1="24" x2="10" y2="24" stroke="#000" stroke-width="2"/>
    <line x1="38" y1="24" x2="46" y2="24" stroke="#000" stroke-width="2"/>
    <line x1="8.5" y1="8.5" x2="14.2" y2="14.2" stroke="#000" stroke-width="2"/>
    <line x1="33.8" y1="33.8" x2="39.5" y2="39.5" stroke="#000" stroke-width="2"/>
    <line x1="8.5" y1="39.5" x2="14.2" y2="33.8" stroke="#000" stroke-width="2"/>
    <line x1="33.8" y1="14.2" x2="39.5" y2="8.5" stroke="#000" stroke-width="2"/>
  </svg>`,

  "sunny-small": `<svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <circle cx="24" cy="24" r="10" stroke="#000" stroke-width="3" fill="none"/>
    <line x1="24" y1="2" x2="24" y2="10" stroke="#000" stroke-width="3"/>
    <line x1="24" y1="38" x2="24" y2="46" stroke="#000" stroke-width="3"/>
    <line x1="2" y1="24" x2="10" y2="24" stroke="#000" stroke-width="3"/>
    <line x1="38" y1="24" x2="46" y2="24" stroke="#000" stroke-width="3"/>
    <line x1="8.5" y1="8.5" x2="14.2" y2="14.2" stroke="#000" stroke-width="3"/>
    <line x1="33.8" y1="33.8" x2="39.5" y2="39.5" stroke="#000" stroke-width="3"/>
    <line x1="8.5" y1="39.5" x2="14.2" y2="33.8" stroke="#000" stroke-width="3"/>
    <line x1="33.8" y1="14.2" x2="39.5" y2="8.5" stroke="#000" stroke-width="3"/>
  </svg>`,

  cloudy: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <path d="M12 36 C6 36 2 32 2 26 C2 20 6 16 12 16 C12 10 18 6 26 6 C34 6 40 12 40 20 C46 20 48 24 48 28 C48 34 44 36 38 36 Z" stroke="#000" stroke-width="2" fill="none"/>
  </svg>`,

  "cloudy-small": `<svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <path d="M12 36 C6 36 2 32 2 26 C2 20 6 16 12 16 C12 10 18 6 26 6 C34 6 40 12 40 20 C46 20 48 24 48 28 C48 34 44 36 38 36 Z" stroke="#000" stroke-width="3" fill="none"/>
  </svg>`,

  "partly-cloudy": `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <circle cx="16" cy="16" r="8" stroke="#000" stroke-width="2" fill="none"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="#000" stroke-width="2"/>
    <line x1="4" y1="16" x2="2" y2="16" stroke="#000" stroke-width="2"/>
    <line x1="6" y1="6" x2="8.8" y2="8.8" stroke="#000" stroke-width="2"/>
    <line x1="6" y1="26" x2="8.8" y2="23.2" stroke="#000" stroke-width="2"/>
    <path d="M14 40 C8 40 6 36 6 32 C6 28 10 24 14 24 C14 20 18 16 26 16 C34 16 38 22 38 28 C44 28 46 32 46 34 C46 38 42 40 38 40 Z" stroke="#000" stroke-width="2" fill="#fff"/>
  </svg>`,

  "partly-cloudy-small": `<svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <circle cx="16" cy="16" r="8" stroke="#000" stroke-width="3" fill="none"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="#000" stroke-width="3"/>
    <line x1="4" y1="16" x2="2" y2="16" stroke="#000" stroke-width="3"/>
    <line x1="6" y1="6" x2="8.8" y2="8.8" stroke="#000" stroke-width="3"/>
    <path d="M14 40 C8 40 6 36 6 32 C6 28 10 24 14 24 C14 20 18 16 26 16 C34 16 38 22 38 28 C44 28 46 32 46 34 C46 38 42 40 38 40 Z" stroke="#000" stroke-width="3" fill="#fff"/>
  </svg>`,

  rain: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <path d="M10 28 C4 28 2 24 2 20 C2 16 6 12 10 12 C10 6 16 2 24 2 C32 2 38 8 38 14 C44 14 46 18 46 22 C46 26 42 28 38 28 Z" stroke="#000" stroke-width="2" fill="none"/>
    <line x1="14" y1="34" x2="10" y2="44" stroke="#000" stroke-width="2"/>
    <line x1="24" y1="34" x2="20" y2="44" stroke="#000" stroke-width="2"/>
    <line x1="34" y1="34" x2="30" y2="44" stroke="#000" stroke-width="2"/>
  </svg>`,

  "rain-small": `<svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <path d="M10 28 C4 28 2 24 2 20 C2 16 6 12 10 12 C10 6 16 2 24 2 C32 2 38 8 38 14 C44 14 46 18 46 22 C46 26 42 28 38 28 Z" stroke="#000" stroke-width="3" fill="none"/>
    <line x1="14" y1="34" x2="10" y2="44" stroke="#000" stroke-width="3"/>
    <line x1="24" y1="34" x2="20" y2="44" stroke="#000" stroke-width="3"/>
    <line x1="34" y1="34" x2="30" y2="44" stroke="#000" stroke-width="3"/>
  </svg>`,

  battery: (pct: number) => {
    const fillHeight = Math.round((pct / 100) * 32)
    const fillY = 8 + (32 - fillHeight)
    return `<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
      <rect x="4" y="8" width="24" height="36" stroke="#000" stroke-width="2" fill="none"/>
      <rect x="10" y="2" width="12" height="6" stroke="#000" stroke-width="2" fill="none"/>
      <rect x="6" y="${fillY}" width="20" height="${fillHeight}" fill="#000"/>
    </svg>`
  },

  gridOn: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#000" stroke-width="2"/>
    <line x1="7" y1="8" x2="7" y2="16" stroke="#fff" stroke-width="2"/>
    <line x1="12" y1="6" x2="12" y2="18" stroke="#fff" stroke-width="2"/>
    <line x1="17" y1="8" x2="17" y2="16" stroke="#fff" stroke-width="2"/>
  </svg>`,

  gridOff: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: crispEdges;">
    <rect x="2" y="2" width="20" height="20" fill="none" stroke="#000" stroke-width="2"/>
    <line x1="4" y1="4" x2="20" y2="20" stroke="#000" stroke-width="2"/>
    <line x1="20" y1="4" x2="4" y2="20" stroke="#000" stroke-width="2"/>
  </svg>`
}

// =============================================================================
// Helper Functions
// =============================================================================

const getWeatherIcon = (iconName: string, size: 'large' | 'small' = 'large'): string => {
  const key = size === 'small' ? `${iconName}-small` : iconName
  return SVG_ICONS[key as keyof typeof SVG_ICONS] as string || SVG_ICONS[iconName as keyof typeof SVG_ICONS] as string || ''
}

const renderBatteryGraph = (history: number[]): string => {
  const width = 560
  const height = 100
  const padding = { top: 10, right: 40, bottom: 20, left: 40 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  if (history.length < 2) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="shape-rendering: crispEdges;"></svg>`
  }

  // Scale functions (Y: 0-100%)
  const scaleX = (i: number) => padding.left + (i / (history.length - 1)) * graphWidth
  const scaleY = (v: number) => padding.top + graphHeight - (v / 100) * graphHeight

  // Generate polyline path
  const points = history.map((v, i) => `${scaleX(i).toFixed(0)},${scaleY(v).toFixed(0)}`).join(' ')

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="shape-rendering: crispEdges;">
    <!-- Y-axis labels -->
    <text x="${padding.left - 4}" y="${padding.top + 4}" text-anchor="end" font-size="10" font-family="monospace" fill="#000">100%</text>
    <text x="${padding.left - 4}" y="${padding.top + graphHeight}" text-anchor="end" font-size="10" font-family="monospace" fill="#000">0%</text>
    <!-- X-axis labels -->
    <text x="${padding.left}" y="${height - 4}" text-anchor="start" font-size="10" font-family="monospace" fill="#000">24h</text>
    <text x="${width - padding.right}" y="${height - 4}" text-anchor="end" font-size="10" font-family="monospace" fill="#000">Now</text>
    <!-- Grid lines -->
    <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="#000" stroke-width="1" stroke-dasharray="2,4"/>
    <line x1="${padding.left}" y1="${scaleY(50)}" x2="${width - padding.right}" y2="${scaleY(50)}" stroke="#000" stroke-width="1" stroke-dasharray="2,4"/>
    <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${width - padding.right}" y2="${padding.top + graphHeight}" stroke="#000" stroke-width="1"/>
    <!-- Axes -->
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" stroke="#000" stroke-width="1"/>
    <!-- Data line -->
    <polyline points="${points}" fill="none" stroke="#000" stroke-width="2"/>
  </svg>`
}

// <!-- TODO: refine partial outage rendering if needed -->
const renderOutageTile = (hour: string, fraction: number): string => {
  const tileWidth = 23
  const tileHeight = 28
  
  let fillContent = ''
  if (fraction === 1) {
    // Full outage - completely black
    fillContent = `<rect x="1" y="1" width="${tileWidth - 2}" height="${tileHeight - 2}" fill="#000"/>`
  } else if (fraction > 0) {
    // Partial outage - horizontal fill from left proportional to fraction
    const fillWidth = Math.round((tileWidth - 2) * fraction)
    fillContent = `<rect x="1" y="1" width="${fillWidth}" height="${tileHeight - 2}" fill="#000"/>`
  }
  
  // Text color depends on fill amount
  const textColor = fraction >= 0.5 ? '#fff' : '#000'
  
  return `<svg width="${tileWidth}" height="${tileHeight}" viewBox="0 0 ${tileWidth} ${tileHeight}" style="shape-rendering: crispEdges;">
    <rect x="0" y="0" width="${tileWidth}" height="${tileHeight}" fill="none" stroke="#000" stroke-width="1"/>
    ${fillContent}
    <text x="${tileWidth / 2}" y="${tileHeight / 2 + 4}" text-anchor="middle" font-size="10" font-family="monospace" fill="${textColor}">${hour}</text>
  </svg>`
}

const renderOutageRow = (label: string, schedule: { h: string; fraction: number }[]): string => {
  const tiles = schedule.map(s => renderOutageTile(s.h, s.fraction)).join('')
  return `<div class="outage-row">
    <span class="outage-label">${label}</span>
    <div class="outage-tiles">${tiles}</div>
  </div>`
}

// =============================================================================
// Main Panel Template
// =============================================================================

export const renderPanel = (): string => {
  const weather = mockWeather
  const outage = mockOutageSchedule
  const backup = mockBackup

  // Weather hourly forecast
  const hourlyForecast = weather.hourly.map(h => `
    <div class="hourly-item">
      <span class="hourly-time">${h.time}</span>
      ${getWeatherIcon(h.icon, 'small')}
      <span class="hourly-temp">${h.temp_c}°</span>
    </div>
  `).join('')

  // Outage schedule
  const outageToday = renderOutageRow('Today', outage.today)
  const outageTomorrow = renderOutageRow('Tomorrow', outage.tomorrow)

  // Battery graph
  const batteryGraph = renderBatteryGraph(backup.history_24h)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=800, height=480, initial-scale=1.0, user-scalable=no">
  <title>E-Paper Dashboard</title>
  <style>
    /* Reset & Base */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      width: 800px;
      height: 480px;
      overflow: hidden;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.2;
    }
    
    /* Main Layout */
    .panel-container {
      display: flex;
      width: 800px;
      height: 480px;
    }
    
    /* Weather Column - Left */
    .weather-column {
      width: 200px;
      height: 480px;
      border-right: 1px solid #000;
      display: flex;
      flex-direction: column;
      padding: 8px;
    }
    
    .weather-header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 1px solid #000;
      margin-bottom: 8px;
    }
    
    .weather-city {
      font-size: 14px;
      font-weight: bold;
    }
    
    .weather-current {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #000;
      margin-bottom: 8px;
    }
    
    .weather-icon {
      margin-bottom: 4px;
    }
    
    .weather-temp {
      font-size: 42px;
      font-weight: bold;
      line-height: 1;
    }
    
    .weather-condition {
      font-size: 11px;
      margin-top: 4px;
    }
    
    .weather-hourly-title {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    
    .weather-hourly {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    
    .hourly-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px dotted #000;
    }
    
    .hourly-item:last-child {
      border-bottom: none;
    }
    
    .hourly-time {
      font-size: 11px;
      width: 40px;
    }
    
    .hourly-temp {
      font-size: 14px;
      font-weight: bold;
      width: 36px;
      text-align: right;
    }
    
    /* Right Column */
    .right-column {
      width: 600px;
      height: 480px;
      display: flex;
      flex-direction: column;
    }
    
    /* Outage Widget - Top Right */
    .outage-widget {
      padding: 8px;
      border-bottom: 1px solid #000;
    }
    
    .outage-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .outage-row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .outage-row:last-child {
      margin-bottom: 0;
    }
    
    .outage-label {
      width: 60px;
      font-size: 11px;
      font-weight: bold;
    }
    
    .outage-tiles {
      display: flex;
      gap: 1px;
    }
    
    .outage-legend {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 10px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .legend-box {
      width: 12px;
      height: 12px;
      border: 1px solid #000;
    }
    
    .legend-box.filled {
      background: #000;
    }
    
    .legend-box.partial {
      background: linear-gradient(to right, #000 50%, #fff 50%);
    }
    
    /* Backup Widget - Bottom Right */
    .backup-widget {
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
    }
    
    .backup-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .backup-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    
    .backup-battery {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .battery-pct {
      font-size: 28px;
      font-weight: bold;
    }
    
    .backup-grid {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    
    .backup-timestamp {
      margin-left: auto;
      font-size: 10px;
    }
    
    .backup-graph {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .backup-graph-label {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    /* SVG crisp edges */
    svg {
      shape-rendering: crispEdges;
    }
  </style>
</head>
<body>
  <div class="panel-container">
    <!-- Weather Widget - Left Column (200px) -->
    <!-- TODO: Replace mock weather with real API -->
    <div class="weather-column">
      <div class="weather-header">
        <div class="weather-city">${weather.location}</div>
      </div>
      
      <div class="weather-current">
        <div class="weather-icon">
          ${getWeatherIcon(weather.current.icon, 'large')}
        </div>
        <div class="weather-temp">${weather.current.temp_c}°</div>
        <div class="weather-condition">${weather.current.condition}</div>
      </div>
      
      <div class="weather-hourly-title">Hourly Forecast</div>
      <div class="weather-hourly">
        ${hourlyForecast}
      </div>
    </div>
    
    <!-- Right Column (600px) -->
    <div class="right-column">
      <!-- Power Outage Schedule Widget - Top -->
      <!-- TODO: Load outage schedule dynamically -->
      <div class="outage-widget">
        <div class="outage-title">Power outage</div>
        ${outageToday}
        ${outageTomorrow}
        <div class="outage-legend">
          <div class="legend-item">
            <div class="legend-box"></div>
            <span>No outage</span>
          </div>
          <div class="legend-item">
            <div class="legend-box filled"></div>
            <span>Full outage</span>
          </div>
          <div class="legend-item">
            <div class="legend-box partial"></div>
            <span>Partial</span>
          </div>
        </div>
      </div>
      
      <!-- Backup Power Supply Widget - Bottom -->
      <!-- TODO: Connect battery data to actual UPS telemetry -->
      <div class="backup-widget">
        <div class="backup-title">Backup power supply</div>
        <div class="backup-header">
          <div class="backup-battery">
            ${SVG_ICONS.battery(backup.battery_now_pct)}
            <span class="battery-pct">${backup.battery_now_pct}%</span>
          </div>
          <div class="backup-grid">
            ${backup.grid_connected ? SVG_ICONS.gridOn : SVG_ICONS.gridOff}
            <span>Grid: ${backup.grid_connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div class="backup-timestamp">Updated: ${backup.last_update}</div>
        </div>
        <div class="backup-graph-label">Battery level (24h)</div>
        <div class="backup-graph">
          ${batteryGraph}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}
