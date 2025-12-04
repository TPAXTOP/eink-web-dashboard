/**
 * Server-side HTML template rendering.
 * Generates static HTML with pre-populated data from cache.
 */

import * as cache from './cache.js'
import { formatKyivDateTimeForDisplay, formatKyivTime } from './time-utils.js'

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

const describeWeather = (code: number): string => WEATHER_CODES[code] || 'N/A'

const formatRate = (value: number | undefined): string => {
  if (typeof value !== 'number') return '--'
  return value.toFixed(2)
}

const formatTime = (isoString: string | undefined): string => {
  if (!isoString) return '--'
  return formatKyivTime(isoString)
}

const formatDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '--'
  return formatKyivDateTimeForDisplay(isoString)
}

/**
 * Generate an SVG chart for the FX data.
 * E-paper compatible: monochrome, no animations.
 */
const renderFxChartSvg = (points: cache.FxPoint[]): string => {
  if (!points.length) {
    return '<svg width="720" height="200" role="img" aria-label="No chart data available"></svg>'
  }

  const width = 720
  const height = 200
  const padding = { top: 20, right: 50, bottom: 30, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = points.map((p) => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  // Scale functions
  const scaleX = (i: number) => padding.left + (i / (points.length - 1)) * chartWidth
  const scaleY = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight

  // Generate path
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.value).toFixed(1)}`)
    .join(' ')

  // Generate X-axis labels (show every ~5th label)
  const labelInterval = Math.max(1, Math.floor(points.length / 6))
  const xLabels = points
    .filter((_, i) => i % labelInterval === 0 || i === points.length - 1)
    .map((p, idx, arr) => {
      const originalIndex = points.indexOf(p)
      const x = scaleX(originalIndex)
      const label = p.date.slice(5) // MM-DD format
      return `<text x="${x.toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="11" fill="#000">${label}</text>`
    })
    .join('\n    ')

  // Generate Y-axis labels
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal]
    .map((v) => {
      const y = scaleY(v)
      return `<text x="${width - 5}" y="${y.toFixed(1)}" text-anchor="end" font-size="11" fill="#000" dominant-baseline="middle">${formatRate(v)}</text>`
    })
    .join('\n    ')

  // Generate horizontal grid lines
  const gridLines = [minVal, (minVal + maxVal) / 2, maxVal]
    .map((v) => {
      const y = scaleY(v)
      return `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" stroke="#000" stroke-dasharray="2,4" stroke-width="0.5" />`
    })
    .join('\n    ')

  // Generate data points
  const dataPoints = points
    .map((p, i) => {
      const x = scaleX(i)
      const y = scaleY(p.value)
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="#000" />`
    })
    .join('\n    ')

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="USD to UAH rates for the last 30 days">
    ${gridLines}
    <path d="${pathData}" fill="none" stroke="#000" stroke-width="2" />
    ${dataPoints}
    ${xLabels}
    ${yLabels}
  </svg>`
}

/**
 * Render the complete HTML page with cached data.
 */
export const renderDashboard = (): string => {
  const weather = cache.getWeather()
  const weatherError = cache.getWeatherError()
  const fx = cache.getFx()
  const fxError = cache.getFxError()
  const lastUpdated = cache.getLastUpdated()

  // Weather section values
  const weatherTemp = weather ? `${Math.round(weather.temperature)} °C` : '-- °C'
  const weatherCondition = weather ? describeWeather(weather.weatherCode) : '--'
  const weatherHumidity = weather ? `${weather.humidity} %` : '-- %'
  const weatherWind = weather ? `${weather.windSpeed} m/s` : '-- m/s'
  const weatherStatus = weather
    ? `As of ${formatTime(weather.time)}`
    : weatherError
      ? 'Unavailable'
      : 'Loading...'
  const weatherErrorHtml = weatherError
    ? `<p class="error-message" id="weatherError">${weatherError}</p>`
    : '<p class="error-message" id="weatherError" hidden>Unable to load weather data.</p>'

  // FX section values
  const fxToday = fx ? formatRate(fx.latest?.value) : '--'
  const fxMin = fx ? formatRate(fx.min) : '--'
  const fxMax = fx ? formatRate(fx.max) : '--'
  const fxStatus = fx
    ? `Data from ${fx.source}`
    : fxError
      ? 'Unavailable'
      : 'Loading...'
  const fxErrorHtml = fxError
    ? `<p class="error-message" id="fxError">${fxError}</p>`
    : '<p class="error-message" id="fxError" hidden>Unable to load exchange rate data.</p>'
  const fxChartHtml = fx?.points?.length ? renderFxChartSvg(fx.points) : renderFxChartSvg([])

  // Last updated timestamp
  const updatedAtText = lastUpdated
    ? `Last updated: ${formatDateTime(lastUpdated)}`
    : 'Updated: --'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kyiv Weather &amp; USD/UAH Dashboard</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <main class="dashboard" aria-live="polite">
      <header class="page-header" aria-label="Dashboard header">
        <h1>Kyiv Weather · USD/UAH</h1>
        <p id="updatedAt" aria-live="polite">${updatedAtText}</p>
      </header>

      <section class="panel panel-weather" aria-labelledby="weather-title">
        <div class="panel-header">
          <h2 id="weather-title">Weather in Kyiv</h2>
          <p id="weatherStatus" class="panel-status">${weatherStatus}</p>
        </div>
        <div class="weather-grid">
          <p class="primary-figure" id="weatherTemp">${weatherTemp}</p>
          <div class="metric">
            <p class="metric-label">Condition</p>
            <p class="metric-value" id="weatherCondition">${weatherCondition}</p>
          </div>
          <div class="metric">
            <p class="metric-label">Humidity</p>
            <p class="metric-value" id="weatherHumidity">${weatherHumidity}</p>
          </div>
          <div class="metric">
            <p class="metric-label">Wind</p>
            <p class="metric-value" id="weatherWind">${weatherWind}</p>
          </div>
        </div>
        ${weatherErrorHtml}
      </section>

      <section class="panel panel-fx" aria-labelledby="fx-title">
        <div class="panel-header">
          <h2 id="fx-title">USD → UAH rate (30 days)</h2>
          <p id="fxStatus" class="panel-status">${fxStatus}</p>
        </div>
        <div class="fx-body">
          <div class="fx-meta">
            <div>
              <p class="metric-label">Today's rate</p>
              <p class="metric-value" id="fxToday">${fxToday}</p>
            </div>
            <div>
              <p class="metric-label">30d min</p>
              <p class="metric-value" id="fxMin">${fxMin}</p>
            </div>
            <div>
              <p class="metric-label">30d max</p>
              <p class="metric-value" id="fxMax">${fxMax}</p>
            </div>
          </div>
          <div class="chart-wrapper">
            ${fxChartHtml}
          </div>
        </div>
        ${fxErrorHtml}
      </section>
    </main>
  </body>
</html>
`
}
