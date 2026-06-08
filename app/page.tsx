/**
 * Main Dashboard Page - Server Component
 *
 * Displays weather in Kyiv and USD/UAH exchange rates.
 * Designed for 800x480 monochrome e-paper display.
 *
 * ARCHITECTURE:
 * - Server Component: Data is fetched on the server
 * - Next.js caching: fetch() with revalidate handles caching automatically
 * - No client-side JavaScript for data fetching
 */

import { fetchDashboardData } from '@/lib/data-fetchers'
import { describeWeather } from '@/lib/weather-codes'
import { formatRate, formatTime, formatDateTime, formatDateTimeShort } from '@/lib/format-utils'
import { FxChart } from './components/FxChart'
import { StaleBadge } from './components/StaleBadge'

// Force dynamic rendering to ensure fresh data on each request
// This prevents build-time failures from being cached
export const dynamic = 'force-dynamic'

// Revalidate data every 30 minutes (matches weather interval)
export const revalidate = 1800

export default async function DashboardPage() {
  const { weather: weatherResult, fx: fxResult } = await fetchDashboardData()
  const weather = weatherResult.data
  const fx = fxResult.data

  // Weather section values
  const weatherTemp = weather ? `${Math.round(weather.temperature)} °C` : '-- °C'
  const weatherCondition = weather ? describeWeather(weather.weatherCode) : '--'
  const weatherHumidity = weather ? `${weather.humidity} %` : '-- %'
  const weatherWind = weather ? `${weather.windSpeed} m/s` : '-- m/s'
  const weatherStatus = weather
    ? `As of ${formatTime(weather.time)}`
    : 'Unavailable'
  const weatherError = !weather
  const weatherStale = weatherResult.stale

  // FX section values
  const fxToday = fx ? formatRate(fx.latest?.value) : '--'
  const fxMin = fx ? formatRate(fx.min) : '--'
  const fxMax = fx ? formatRate(fx.max) : '--'
  const fxStatus = fx
    ? `As of ${formatDateTimeShort(fx.updatedAt)}`
    : 'Unavailable'
  const fxError = !fx
  const fxStale = fxResult.stale

  // Page load timestamp (when this page was rendered)
  const pageLoadTime = new Date().toISOString()
  const updatedAtText = `Last updated: ${formatDateTime(pageLoadTime)}`

  return (
    <main className="dashboard" aria-live="polite">
      <header className="page-header" aria-label="Dashboard header">
        <h1>Kyiv Weather · USD/UAH</h1>
        <p className="updated-at" aria-live="polite">{updatedAtText}</p>
      </header>

      <section className="panel panel-weather" aria-labelledby="weather-title">
        <div className="panel-header">
          <h2 id="weather-title">Weather in Kyiv{weatherStale && <StaleBadge title={`Not updated — showing data ${weatherStatus.toLowerCase()}`} />}</h2>
          <p className="panel-status">{weatherStatus}</p>
        </div>
        <div className="weather-grid">
          <p className="primary-figure">{weatherTemp}</p>
          <div className="metric">
            <p className="metric-label">Condition</p>
            <p className="metric-value">{weatherCondition}</p>
          </div>
          <div className="metric">
            <p className="metric-label">Humidity</p>
            <p className="metric-value">{weatherHumidity}</p>
          </div>
          <div className="metric">
            <p className="metric-label">Wind</p>
            <p className="metric-value">{weatherWind}</p>
          </div>
        </div>
        {weatherError && (
          <p className="error-message">Unable to load weather data.</p>
        )}
      </section>

      <section className="panel panel-fx" aria-labelledby="fx-title">
        <div className="panel-header">
          <h2 id="fx-title">USD → UAH rate (30 days){fxStale && <StaleBadge title={`Not updated — showing data ${fxStatus.toLowerCase()}`} />}</h2>
          <p className="panel-status">{fxStatus}</p>
        </div>
        <div className="fx-body">
          <div className="fx-meta">
            <div>
              <p className="metric-label">Today&apos;s rate</p>
              <p className="metric-value">{fxToday}</p>
            </div>
            <div>
              <p className="metric-label">30d min</p>
              <p className="metric-value">{fxMin}</p>
            </div>
            <div>
              <p className="metric-label">30d max</p>
              <p className="metric-value">{fxMax}</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <FxChart points={fx?.points || []} />
          </div>
        </div>
        {fxError && (
          <p className="error-message">Unable to load exchange rate data.</p>
        )}
      </section>
    </main>
  )
}

