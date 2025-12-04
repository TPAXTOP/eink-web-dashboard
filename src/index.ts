/**
 * Express application entry point.
 *
 * ARCHITECTURE (Vercel Serverless Compatible):
 * - Cold start with empty cache: BLOCKING initial fetch (wait for data)
 * - Warm requests with cached data: NON-BLOCKING background refresh
 * - All routes serve cached data (never call APIs directly in handlers)
 * - Data fetching centralized in data-fetchers.ts
 */

import express, { Application } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import {
  startBackgroundWorkers,
  stopBackgroundWorkers,
  triggerBackgroundRefresh,
  ensureInitialData,
} from './data-fetchers.js'
import { renderDashboard } from './template.js'
import { renderPanel } from './panel-template.js'
import * as cache from './cache.js'
import { loggingConfig } from './config.js'
import { formatKyivDateTimeForLog } from './time-utils.js'

const require = createRequire(import.meta.url)

// =============================================================================
// Logging Helpers
// =============================================================================

const getTimestamp = () => formatKyivDateTimeForLog()

const log = (...args: unknown[]) => {
  if (loggingConfig.verbose) {
    console.log('[server]', getTimestamp(), ...args)
  }
}

const logImportant = (...args: unknown[]) => {
  console.log('[server]', getTimestamp(), ...args)
}

// =============================================================================
// Environment Setup
// =============================================================================

/**
 * Load environment variables from .env file if not already set.
 * Only used in local development; Vercel injects env vars automatically.
 */
const hydrateEnvFromDotenv = () => {
  if (process.env.EXCHANGERATE_API_KEY) {
    return
  }

  try {
    require('dotenv').config()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'dotenv is not installed; skipping .env loading. Set EXCHANGERATE_API_KEY manually.',
        error instanceof Error ? error.message : error
      )
    }
  }
}

hydrateEnvFromDotenv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: Application = express()
const publicDir = path.join(__dirname, '..', 'public')

// Serve static files (CSS, images, etc.) but NOT index.html
app.use(express.static(publicDir, { index: false }))

// =============================================================================
// Main Routes
// =============================================================================

/**
 * Home route - Server-side rendered HTML with cached data.
 *
 * BEHAVIOR:
 * - If cache is empty (cold start): WAIT for initial data fetch
 * - If cache has data: Render immediately, refresh in background
 */
app.get('/', async (_req, res) => {
  log('GET / - rendering dashboard')

  // Ensure we have data to show (blocking on cold start, non-blocking otherwise)
  await ensureInitialData()

  // Trigger background refresh for stale data (non-blocking)
  triggerBackgroundRefresh()

  // Render with current cached data
  const html = renderDashboard()
  log('Sending HTML response', { length: html.length })
  res.type('html').send(html)
})

/**
 * About page - Static HTML file.
 */
app.get('/about', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'))
})

/**
 * E-Paper Panel route - Server-rendered static dashboard for 800x480 e-paper display.
 *
 * BEHAVIOR:
 * - If cache is empty (cold start): WAIT for initial data fetch
 * - If cache has data: Render immediately, refresh in background
 */
app.get('/panel', async (_req, res) => {
  log('GET /panel - rendering e-paper panel')

  // Ensure we have data to show (blocking on cold start, non-blocking otherwise)
  await ensureInitialData()

  // Trigger background refresh for stale data (non-blocking)
  triggerBackgroundRefresh()

  // Render with current cached data
  const html = renderPanel()
  log('Sending panel HTML response', { length: html.length })
  res.type('html').send(html)
})

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * Sample API endpoint - static JSON data.
 */
app.get('/api-data', (_req, res) => {
  res.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
  })
})

/**
 * FX data API endpoint - returns cached exchange rate data.
 *
 * CACHE-ONLY: Never fetches from external API directly.
 * Returns cached data if available, or error if cache is empty.
 * Background refresh is triggered if data is stale.
 */
app.get('/api/fx', async (_req, res) => {
  log('GET /api/fx')

  // Ensure we have data (blocking on cold start)
  await ensureInitialData()

  // Trigger background refresh if stale (non-blocking)
  triggerBackgroundRefresh()

  // Return cached data
  const cachedFx = cache.getFx()
  if (cachedFx) {
    return res.json({
      points: cachedFx.points,
      meta: {
        latest: cachedFx.latest,
        min: cachedFx.min,
        max: cachedFx.max,
        source: cachedFx.source,
        refreshedAt: cachedFx.fetchedAt,
      },
    })
  }

  // No cached data available
  const error = cache.getFxError()
  return res.status(503).json({
    error: error || 'Exchange rate data not yet available. Please try again shortly.',
    hint: 'Data is fetched in the background. Refresh the page in a few seconds.',
  })
})

/**
 * Weather data API endpoint - returns cached weather data.
 *
 * CACHE-ONLY: Never fetches from external API directly.
 * Returns cached data if available, or error if cache is empty.
 */
app.get('/api/weather', async (_req, res) => {
  log('GET /api/weather')

  // Ensure we have data (blocking on cold start)
  await ensureInitialData()

  // Trigger background refresh if stale (non-blocking)
  triggerBackgroundRefresh()

  // Return cached data
  const cachedWeather = cache.getWeather()
  if (cachedWeather) {
    return res.json({
      temperature: cachedWeather.temperature,
      humidity: cachedWeather.humidity,
      windSpeed: cachedWeather.windSpeed,
      weatherCode: cachedWeather.weatherCode,
      time: cachedWeather.time,
      refreshedAt: cachedWeather.fetchedAt,
    })
  }

  // No cached data available
  const error = cache.getWeatherError()
  return res.status(503).json({
    error: error || 'Weather data not yet available. Please try again shortly.',
    hint: 'Data is fetched in the background. Refresh the page in a few seconds.',
  })
})

/**
 * Cache status endpoint - debugging/monitoring.
 * Returns current cache state without triggering refresh.
 */
app.get('/api/cache-status', (_req, res) => {
  const diagnostics = cache.getDiagnostics()
  res.json(diagnostics)
})

/**
 * Health check endpoint.
 */
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cacheStatus: cache.hasData() ? 'populated' : 'empty',
    environment: process.env.VERCEL ? 'vercel' : 'local',
  })
})

// =============================================================================
// Server Startup
// =============================================================================

// Vercel serverless: ensureInitialData() handles cold start data fetching
// Local development: Start background workers for better DX
if (!process.env.VERCEL) {
  // Start background workers when server starts (local dev only)
  startBackgroundWorkers().catch((err) => {
    logImportant('Failed to start background workers', err)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logImportant('SIGTERM received, shutting down')
    stopBackgroundWorkers()
    process.exit(0)
  })

  process.on('SIGINT', () => {
    logImportant('SIGINT received, shutting down')
    stopBackgroundWorkers()
    process.exit(0)
  })

  // Start server for local development
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    logImportant(`Listening on http://localhost:${port}`)
  })
} else {
  logImportant('Running in Vercel serverless mode')
}

export default app
