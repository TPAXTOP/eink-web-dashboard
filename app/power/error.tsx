'use client'

/**
 * Error boundary for the e-paper power route.
 *
 * Shows a minimal monochrome fallback within the 800x480 layout instead of a
 * blank screen if rendering throws. The route re-attempts data fetches on the
 * next request (the page is dynamically rendered).
 */

import { useEffect } from 'react'
import './power.css'

export default function PowerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[power] Render error:', error)
  }, [error])

  return (
    <div className="panel-container">
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Display temporarily unavailable
        </div>
        <div style={{ fontSize: '14px', marginBottom: '16px' }}>
          The panel will refresh on the next update.
        </div>
        <button type="button" className="retry-button" onClick={() => reset()}>
          Retry
        </button>
      </div>
    </div>
  )
}
