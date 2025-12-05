# E-Paper Dashboard

A Next.js application designed for a monochrome e-paper display (800x480 resolution). Displays weather information for Kyiv and USD/UAH exchange rates.

## Features

- **Weather Data**: Current temperature, humidity, wind speed, and conditions for Kyiv
- **Exchange Rates**: USD/UAH rates with 30-day historical chart
- **E-Paper Optimized**: High contrast, monochrome design for e-ink displays
- **Server-Side Rendering**: All data is fetched and rendered on the server
- **Automatic Caching**: Next.js ISR (Incremental Static Regeneration) handles caching

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local and add your EXCHANGERATE_API_KEY
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
| `EXCHANGERATE_API_KEY` | API key from exchangerate.host | Yes |

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── fx/            # Exchange rate endpoint
│   │   ├── weather/       # Weather endpoint
│   │   ├── cache-status/  # Cache diagnostics
│   │   └── healthz/       # Health check
│   ├── components/        # React components
│   ├── panel/             # E-paper panel page
│   ├── about/             # About page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── lib/                    # Shared utilities
│   ├── config.ts          # Configuration
│   ├── data-fetchers.ts   # API data fetching
│   ├── types.ts           # TypeScript types
│   ├── time-utils.ts      # Timezone utilities
│   ├── weather-codes.ts   # Weather descriptions
│   └── format-utils.ts    # Value formatting
├── public/                 # Static assets
└── next.config.js          # Next.js configuration
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main dashboard with weather and FX rates |
| `/panel` | E-paper optimized panel (800x480) |
| `/about` | About page |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/weather` | Current weather data |
| `/api/fx` | Exchange rate data |
| `/api/cache-status` | Cache diagnostics |
| `/api/healthz` | Health check |

## Caching Strategy

- **Weather data**: Revalidates every 30 minutes
- **Exchange rates**: Revalidates every 12 hours
- **ISR**: Pages are statically generated and automatically regenerated in the background

## Deployment

The app deploys automatically to Vercel. Just push to the main branch.

### Vercel Configuration

1. Connect your GitHub repository to Vercel
2. Add environment variables in Project Settings
3. Deploy

No additional configuration needed - Next.js works out of the box on Vercel.

## Display Constraints

- **Resolution**: 800x480 pixels
- **Colors**: Pure black (#000000) and white (#FFFFFF) only
- **No animations**: E-paper has slow refresh
- **No interactivity**: Display-only design

## License

ISC
