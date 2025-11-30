const WEATHER_CODES = {
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

const selectors = {
  updatedAt: document.getElementById('updatedAt'),
  weatherStatus: document.getElementById('weatherStatus'),
  weatherTemp: document.getElementById('weatherTemp'),
  weatherCondition: document.getElementById('weatherCondition'),
  weatherHumidity: document.getElementById('weatherHumidity'),
  weatherWind: document.getElementById('weatherWind'),
  weatherError: document.getElementById('weatherError'),
  fxStatus: document.getElementById('fxStatus'),
  fxToday: document.getElementById('fxToday'),
  fxMin: document.getElementById('fxMin'),
  fxMax: document.getElementById('fxMax'),
  fxError: document.getElementById('fxError'),
  fxChart: document.getElementById('fxChart'),
}

const logClient = (...args) => console.log('[client]', ...args)

const CHART_JS_CDN =
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js'

let chartLibPromise = null

const loadChartLib = () => {
  if (window.Chart) {
    return Promise.resolve(window.Chart)
  }

  if (!chartLibPromise) {
    chartLibPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        `script[src="${CHART_JS_CDN}"]`
      )

      const resolveWithChart = () => {
        if (window.Chart) {
          logClient('Chart.js library ready')
          resolve(window.Chart)
        } else {
          reject(new Error('Chart.js script loaded but window.Chart missing'))
        }
      }

      if (existingScript) {
        logClient('Chart.js script already present, waiting for load event')
        existingScript.addEventListener('load', resolveWithChart, { once: true })
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load existing Chart.js script')),
          { once: true }
        )
        return
      }

      logClient('Injecting Chart.js script tag')
      const script = document.createElement('script')
      script.src = CHART_JS_CDN
      script.async = true
      script.integrity = 'Sse/HDqcypGpyTDpvZOJNnG0TT3feGQUkF9H+mnRvic+LjR+K1NhTt8f51KIQ3v3'
      script.crossOrigin = 'anonymous'
      script.referrerPolicy = 'no-referrer'
      script.onload = resolveWithChart
      script.onerror = () => reject(new Error('Failed to load Chart.js script'))
      document.head.appendChild(script)
    })
  }

  return chartLibPromise
}

let fxChartInstance = null

const formatTime = (isoString) => {
  if (!isoString) return '--'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

const formatRate = (value) => {
  if (typeof value !== 'number') return '--'
  return value.toFixed(2)
}

const updateTimestamp = (date = new Date()) => {
  selectors.updatedAt.textContent = `Last updated: ${date.toLocaleString('en-GB', {
    hour12: false,
  })}`
}

const describeWeather = (code) => WEATHER_CODES[code] || 'N/A'

const fetchWeather = async () => {
  logClient('Fetching weather data')
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Europe%2FKiev'

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Weather request failed with ${response.status}`)
  }
  const payload = await response.json()
  logClient('Weather payload received')
  return payload.current
}

const renderWeather = (current) => {
  if (!current) throw new Error('Weather payload missing current data')
  logClient('Rendering weather', current)

  selectors.weatherTemp.textContent = `${Math.round(current.temperature_2m)} °C`
  selectors.weatherCondition.textContent = describeWeather(current.weather_code)
  selectors.weatherHumidity.textContent = `${current.relative_humidity_2m} %`
  selectors.weatherWind.textContent = `${current.wind_speed_10m} m/s`
  selectors.weatherStatus.textContent = `As of ${formatTime(current.time)} Kyiv time`
  selectors.weatherError.hidden = true
}

const fetchFx = async () => {
  logClient('Fetching FX data from /api/fx')
  const response = await fetch('/api/fx')
  let payload = null

  try {
    payload = await response.json()
  } catch (error) {
    console.error('[client] Failed to parse FX payload', error)
  }

  if (!response.ok || !payload) {
    const message = payload?.error ?? `FX request failed with ${response.status}`
    throw new Error(message)
  }

  logClient('FX payload received', payload.meta)
  return payload
}

const renderFx = async ({ points = [], meta = {} }) => {
  if (!points.length) {
    throw new Error('FX data empty')
  }

  logClient('Rendering FX chart', { points: points.length, meta })

  const fallbackValues = points.map((point) => point.value)
  const latestValue = meta.latest?.value ?? fallbackValues[fallbackValues.length - 1]
  const minValue = typeof meta.min === 'number' ? meta.min : Math.min(...fallbackValues)
  const maxValue = typeof meta.max === 'number' ? meta.max : Math.max(...fallbackValues)

  selectors.fxToday.textContent = formatRate(latestValue)
  selectors.fxMin.textContent = formatRate(minValue)
  selectors.fxMax.textContent = formatRate(maxValue)
  selectors.fxStatus.textContent = meta.source ? `Live from ${meta.source}` : 'Live data'
  selectors.fxError.hidden = true

  const chartLib = await loadChartLib()

  const ctx = selectors.fxChart.getContext('2d')
  if (fxChartInstance) {
    fxChartInstance.destroy()
  }

  fxChartInstance = new chartLib(ctx, {
    type: 'line',
    data: {
      labels: points.map((point) => point.date.slice(5)),
      datasets: [
        {
          data: points.map((point) => point.value),
          borderColor: '#000000',
          backgroundColor: '#000000',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 2,
          pointBackgroundColor: '#000000',
        },
      ],
    },
    options: {
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          ticks: {
            color: '#000000',
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 10,
          },
          grid: {
            color: '#000000',
            borderDash: [2, 4],
          },
        },
        y: {
          ticks: {
            color: '#000000',
            callback: (value) => formatRate(value),
          },
          grid: {
            color: '#000000',
            borderDash: [2, 4],
          },
          beginAtZero: false,
        },
      },
    },
  })
}

const showError = (target, statusElement, message) => {
  target.textContent = message
  target.hidden = false
  statusElement.textContent = 'Unavailable'
}

const init = async () => {
  logClient('Initializing dashboard')
  try {
    selectors.weatherStatus.textContent = 'Fetching latest data...'
    const current = await fetchWeather()
    renderWeather(current)
  } catch (error) {
    console.error('[client] Weather pipeline failed', error)
    showError(selectors.weatherError, selectors.weatherStatus, 'Unable to load weather data.')
  }

  try {
    selectors.fxStatus.textContent = 'Fetching latest data...'
    const fxPayload = await fetchFx()
    await renderFx(fxPayload)
  } catch (error) {
    console.error('[client] FX pipeline failed', error)
    showError(
      selectors.fxError,
      selectors.fxStatus,
      error?.message || 'Unable to load exchange rate data.'
    )
  }

  updateTimestamp(new Date())
  logClient('Dashboard render complete')
}

window.addEventListener('DOMContentLoaded', init)
