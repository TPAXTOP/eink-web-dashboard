# E-Paper Dashboard

A Next.js 15 application designed for a monochrome e-paper display (800x480 resolution). Displays weather information for Kyiv, USD/UAH exchange rates, power outage schedules, and backup battery status.

## Features

- **Weather Data**: Current temperature, humidity, wind speed, hourly forecast for Kyiv
- **Exchange Rates**: USD/UAH rates with 30-day historical chart
- **Power Outages**: Yasno API integration for planned outage schedules
- **Backup Power**: Deye Cloud API integration for solar inverter/battery status
- **E-Paper Optimized**: High contrast, monochrome design for e-ink displays
- **Server Components**: All data is fetched and rendered on the server (no client JS)
- **Automatic Caching**: Next.js ISR (Incremental Static Regeneration) with stale-while-revalidate

## Architecture Overview

### Rendering Model

All pages are **Server Components only** - no client-side JavaScript for data fetching. Pages use ISR (Incremental Static Regeneration) with automatic background revalidation.

### Data Flow

```
Request → Server Component → lib/data-fetchers.ts or lib/deye-api.ts
        → External APIs → Next.js fetch cache → HTML response
```

### Caching Behavior

- **Fresh data**: Served from cache immediately
- **Stale data**: Served from cache while revalidating in background
- **On error**: Returns `null` (errors are NOT cached - only successful responses are cached)

This ensures failed API calls don't persist in cache, and the dashboard gracefully degrades to show "--" placeholders.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or bun

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your API keys
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXCHANGERATE_API_KEY` | API key from [exchangerate.host](https://exchangerate.host) | Yes |
| `YASNO_GROUP_ID` | Outage group ID (e.g., "1.1", "2.2") | No (default: "1.1") |
| `DEYE_APP_ID` | Deye Cloud developer app ID | No* |
| `DEYE_APP_SECRET` | Deye Cloud developer app secret | No* |
| `DEYE_EMAIL` | Deye Cloud account email | No* |
| `DEYE_PASSWORD` | Deye Cloud account password (plain) | No* |
| `DEYE_PASSWORD_HASHED` | Deye Cloud password (SHA256 hashed) | No* |
| `DEYE_DEVICE_SN` | Inverter serial number | No* |
| `DEYE_BATTERY_CAPACITY_WH` | Battery capacity in Wh (default: 5120) | No |

*Deye variables are optional. If not configured, mock battery data is displayed.

### API Key Setup

**exchangerate.host**:
1. Sign up at [exchangerate.host](https://exchangerate.host)
2. Get your API key from the dashboard
3. Add to `.env.local` as `EXCHANGERATE_API_KEY`

**Deye Cloud** (for backup power monitoring):
1. Register at [eu1-developer.deyecloud.com](https://eu1-developer.deyecloud.com)
2. Create an application to get App ID and App Secret
3. Use the same email/password as your Deye Cloud mobile app account

## Project Structure

```
├── app/                       # Next.js App Router
│   ├── components/            # React components
│   │   ├── icons/            # SVG icon components
│   │   │   ├── WeatherIcons.tsx
│   │   │   ├── PowerIcons.tsx
│   │   │   └── index.ts
│   │   ├── BatteryGraph.tsx  # Battery history chart
│   │   ├── FxChart.tsx       # Exchange rate chart
│   │   ├── OutageDisplay.tsx # Outage schedule tiles
│   │   └── index.ts
│   ├── power/                 # E-paper power page
│   │   ├── page.tsx
│   │   └── power.css
│   ├── about/                 # About page
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main dashboard
├── lib/                       # Shared utilities
│   ├── config.ts              # Configuration constants
│   ├── data-fetchers.ts       # Weather, FX, outage API clients
│   ├── deye-api.ts            # Deye Cloud API client
│   ├── logger.ts              # Centralized logging
│   ├── types.ts               # TypeScript type definitions
│   ├── time-utils.ts          # Kyiv timezone formatting
│   ├── format-utils.ts        # Value formatting
│   ├── weather-codes.ts       # Weather code descriptions
│   ├── weather-helpers.ts     # Weather icon helpers
│   └── power-format-utils.ts  # Power value formatting
├── public/                    # Static assets
└── next.config.js             # Next.js configuration
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main dashboard with weather and FX rates |
| `/power` | E-paper optimized power page (800x480) |
| `/about` | About page |

## Caching Strategy

| Data Source | Revalidation Interval | Notes |
|-------------|----------------------|-------|
| Weather | 30 minutes | Open-Meteo updates hourly |
| Exchange Rates | 12 hours | Rates change slowly |
| Outage Schedule | 15 minutes | Schedules published daily |
| Battery Status | 5 minutes | Real-time monitoring |
| Battery History | 5 minutes | Historical data |

## Error Handling

The application uses a **null propagation pattern** for error handling:

1. Data fetchers return `null` on any error
2. Errors are logged with appropriate severity (error/warn/info)
3. Pages render gracefully with "--" placeholders when data is unavailable
4. Only successful HTTP responses are cached (errors don't pollute cache)

### Logging

The application uses a centralized logger (`lib/logger.ts`) with four levels:

- `logError`: Critical failures (uses `console.error`)
- `logWarn`: Potential issues like missing config (uses `console.warn`)
- `logInfo`: Significant events like successful fetches (uses `console.log`)
- `logDebug`: Verbose diagnostics (only in development)

All logs include a `[tag]` prefix and Kyiv timezone timestamp.

## Development Guidelines

### Adding New Components

1. Create component in `app/components/`
2. Add JSDoc documentation
3. Export from `app/components/index.ts`
4. Use only monochrome colors (#000 and #fff)

### Adding New API Integrations

1. Create fetcher in `lib/` following `data-fetchers.ts` pattern
2. Add types to `lib/types.ts`
3. Use shared logger from `lib/logger.ts`
4. Add configuration to `lib/config.ts`
5. Return `null` on errors (don't throw)

### Display Constraints

- **Resolution**: 800x480 pixels
- **Colors**: Pure black (#000000) and white (#FFFFFF) only
- **No animations**: E-paper has slow refresh
- **No gradients**: Binary display only
- **Fonts**: Use readable fonts with thick strokes

## Troubleshooting

### Weather data not loading
- Check internet connectivity
- Open-Meteo API is free and doesn't require authentication

### Exchange rates showing "--"
- Verify `EXCHANGERATE_API_KEY` is set correctly
- Check [exchangerate.host](https://exchangerate.host) for API status

### Battery status showing mock data
- Verify all DEYE_* environment variables are set
- Check Deye Cloud credentials are correct
- Ensure device serial number matches your inverter

### Outage schedule not loading
- Yasno API may be temporarily unavailable
- Check `YASNO_GROUP_ID` matches your address group

### Build errors after changes
- Run `npm run build` locally before deploying
- Check TypeScript errors with `npm run lint`

## Deployment

The app deploys automatically to Vercel. Just push to the main branch.

### Vercel Configuration

1. Connect your GitHub repository to Vercel
2. Add environment variables in Project Settings
3. Deploy

No additional configuration needed - Next.js works out of the box on Vercel.

## License

ISC
