import express, { Application } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { startBackgroundWorkers, stopBackgroundWorkers, ensureFreshData } from './data-fetchers.js'
import { renderDashboard } from './template.js'
import { renderPanel } from './panel-template.js'
import * as cache from './cache.js'

const require = createRequire(import.meta.url)

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

type FxPoint = {
  date: string
  value: number
}

const toIsoDate = (date: Date) => date.toISOString().split('T')[0]

const FX_BASE_URL = 'https://api.exchangerate.host/timeframe'

const logFx = (...args: unknown[]) => {
  console.log('[fx]', ...args)
}

const buildFxUrl = (startDate: string, endDate: string, apiKey: string) => {
  const url = new URL(FX_BASE_URL)
  url.searchParams.set('base', 'USD')
  url.searchParams.set('symbols', 'UAH')
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('source', 'USD')
  url.searchParams.set('places', '4')
  url.searchParams.set('amount', '1')
  url.searchParams.set('access_key', apiKey)
  return url.toString()
}

const pickQuoteValue = (quoteRecord: Record<string, unknown>, targetPair: string) => {
  const direct = quoteRecord[targetPair]
  if (typeof direct === 'number') {
    return direct
  }

  const fallbackKey = Object.keys(quoteRecord).find((key) => key.endsWith('UAH'))
  const fallbackValue = fallbackKey ? quoteRecord[fallbackKey] : undefined
  return typeof fallbackValue === 'number' ? fallbackValue : undefined
}

const parseFxPayload = (payload: unknown) => {
  logFx('Parsing FX payload snapshot', typeof payload)
  if (!payload || typeof payload !== 'object') {
    throw new Error('FX payload missing')
  }

  const record = payload as {
    success?: boolean
    error?: { type?: string; info?: string }
    rates?: Record<string, { UAH?: number }>
    quotes?: Record<string, number | Record<string, unknown>>
    timestamp?: number
  }

  if (record.success === false) {
    throw new Error(record.error?.info || 'FX upstream reported an error')
  }

  if (record.rates) {
    logFx('Found rates field with keys', Object.keys(record.rates).length)
    const points: FxPoint[] = Object.keys(record.rates)
      .sort()
      .map((dateKey) => ({
        date: dateKey,
        value: record.rates?.[dateKey]?.UAH,
      }))
      .filter((point): point is FxPoint => typeof point.value === 'number')

    if (points.length) {
      return points
    }
  }

  if (record.quotes) {
    const targetPair = 'USDUAH'
    const quotes = record.quotes
    const points: FxPoint[] = []

    for (const [outerKey, outerValue] of Object.entries(quotes)) {
      if (typeof outerValue === 'number') {
        if (outerKey === targetPair) {
          const date =
            typeof record.timestamp === 'number'
              ? new Date(record.timestamp * 1000).toISOString().split('T')[0]
              : toIsoDate(new Date())
          points.push({ date, value: outerValue })
        }
        continue
      }

      if (outerValue && typeof outerValue === 'object') {
        const value = pickQuoteValue(outerValue, targetPair)
        if (typeof value === 'number') {
          points.push({ date: outerKey, value })
        }
      }
    }

    if (points.length) {
      return points.sort((a, b) => (a.date < b.date ? -1 : 1))
    }
  }

  throw new Error('FX payload missing rates or quotes data')
}

// Serve static files (CSS, images, etc.) but NOT index.html
app.use(express.static(publicDir, { index: false }))

// Home route - Server-side rendered HTML with cached data
app.get('/', async (_req, res) => {
  // Ensure data is fresh (lazy refresh for Vercel compatibility)
  await ensureFreshData()
  const html = renderDashboard()
  res.type('html').send(html)
})

app.get('/about', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'))
})

// E-Paper Panel route - Server-rendered static dashboard for 800x480 e-paper display
app.get('/panel', (_req, res) => {
  const html = renderPanel()
  res.type('html').send(html)
})

// Example API endpoint - JSON
app.get('/api-data', (req, res) => {
  res.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
  })
})

app.get('/api/fx', async (_req, res) => {
  // Return cached data if available
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

  // Fallback to live fetch if cache is empty
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) {
    logFx('Missing EXCHANGERATE_API_KEY env')
    return res
      .status(503)
      .json({ error: 'Exchange rate API key missing. Set EXCHANGERATE_API_KEY.' })
  }

  try {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - 29)

    const requestUrl = buildFxUrl(toIsoDate(start), toIsoDate(end), apiKey)
    logFx('Requesting rates', { start: toIsoDate(start), end: toIsoDate(end), url: requestUrl })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const upstreamResponse = await fetch(requestUrl, {
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text()
      logFx('Upstream error response', { status: upstreamResponse.status, body: text })
      throw new Error(`FX upstream responded with ${upstreamResponse.status}`)
    }

    const payload = await upstreamResponse.json().catch((error) => {
      throw new Error(`FX payload parsing failed: ${error instanceof Error ? error.message : error}`)
    })

    const points = parseFxPayload(payload)
    const values = points.map((point) => point.value)
    const latest = points[points.length - 1]

    logFx('Received FX data', {
      points: points.length,
      preview: points.slice(-3),
    })

    return res.json({
      points,
      meta: {
        latest,
        min: Math.min(...values),
        max: Math.max(...values),
        source: 'exchangerate.host',
        refreshedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to fetch FX data', error)
    return res.status(502).json({ error: 'Unable to load exchange rate data right now.' })
  }
})

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Vercel serverless: Use lazy refresh (no background workers needed)
// Local development: Start background workers for better DX
if (!process.env.VERCEL) {
  // Start background workers when server starts (local dev only)
  startBackgroundWorkers().catch((err) => {
    console.error('[server] Failed to start background workers', err)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received, shutting down')
    stopBackgroundWorkers()
    process.exit(0)
  })

  process.on('SIGINT', () => {
    console.log('[server] SIGINT received, shutting down')
    stopBackgroundWorkers()
    process.exit(0)
  })

  // Start server for local development
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`[server] Listening on http://localhost:${port}`)
  })
} else {
  console.log('[server] Running in Vercel serverless mode (lazy refresh)')
}

export default app
