# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-Paper Dashboard - A Next.js 14 application for monochrome e-paper displays (800x480 resolution). Displays weather for Kyiv and USD/UAH exchange rates. Deployed on Vercel.

## Commands

```bash
npm run dev    # Development server at http://localhost:3000
npm run build  # Production build
npm start      # Start production server
npm run lint   # Run Next.js linter
```

## Architecture

### Rendering Model
All pages are **Server Components only** - no client-side JavaScript for data fetching. Pages use ISR (Incremental Static Regeneration) with automatic background revalidation.

### Data Flow
```
Request → Server Component → fetchDashboardData() (lib/data-fetchers.ts)
        → External APIs → Next.js fetch cache → HTML response
```

### Key Modules

| Module | Purpose |
|--------|---------|
| `lib/data-fetchers.ts` | External API calls with Next.js caching |
| `lib/types.ts` | TypeScript type definitions |
| `lib/config.ts` | Configuration constants and revalidation intervals |
| `lib/time-utils.ts` | Kyiv timezone formatting (all times in Europe/Kyiv) |
| `lib/weather-codes.ts` | Open-Meteo weather code descriptions |

### External APIs
- **Weather**: Open-Meteo API (no auth required) - revalidates every 30 min
- **Exchange Rates**: exchangerate.host (requires `EXCHANGERATE_API_KEY`) - revalidates every 12 hours

### Routes
- `/` - Main dashboard (weather + FX rates)
- `/panel` - E-paper optimized 800x480 view
- `/api/weather` - Weather data endpoint
- `/api/fx` - Exchange rates endpoint
- `/api/healthz` - Health check

## Critical Constraints

### Display Requirements
- Fixed 800x480 pixel viewport
- **Monochrome only**: Pure black (#000000) and white (#FFFFFF)
- No animations, gradients, or shadows
- System fonts only

### Data Fetching Pattern
```typescript
// Use Next.js built-in fetch caching - NOT manual file caching
const response = await fetch(url, {
  next: { revalidate: 1800 } // seconds
})
```

### Timezone
All timestamps must display in Kyiv timezone (`Europe/Kyiv`). Use utilities from `lib/time-utils.ts`.

## Prohibited Patterns

- Client-side data fetching (useEffect, useState for data)
- Manual file-based caching
- Heavy charting libraries (use inline SVG)
- Gray colors or gradients
- CSS animations or transitions

## Environment Variables

Required in `.env.local` for development or Vercel settings for production:
```
EXCHANGERATE_API_KEY=<your_key>
```
