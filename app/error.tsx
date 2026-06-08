'use client'

/**
 * Route-level error boundary for the dashboard.
 *
 * Catches any uncaught exception thrown while rendering a page (or its server
 * components) and shows a readable monochrome fallback instead of a blank
 * screen. The "Retry" control re-renders the route, which re-attempts the
 * underlying data fetches.
 */

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error in server/client logs for diagnostics.
    console.error('[dashboard] Render error:', error)
  }, [error])

  return (
    <main className="dashboard">
      <header className="page-header">
        <h1>Kyiv Weather · USD/UAH</h1>
      </header>
      <section className="panel">
        <div className="panel-header">
          <h2>Temporarily unavailable</h2>
        </div>
        <p className="error-message">
          The dashboard could not be rendered. It will refresh on the next load.
        </p>
        <button type="button" className="retry-button" onClick={() => reset()}>
          Retry
        </button>
      </section>
    </main>
  )
}
