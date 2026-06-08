'use client'

/**
 * Global error boundary.
 *
 * Catches failures in the root layout itself. Because it replaces the layout,
 * it must render its own <html> and <body>. Uses inline monochrome styles so it
 * has no external dependencies. Prevents a fully blank screen in the worst case.
 */

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global] Render error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>
          Temporarily unavailable
        </h1>
        <p style={{ fontSize: '14px', margin: '0 0 16px' }}>
          The dashboard will refresh on the next load.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            fontSize: '14px',
            fontWeight: 700,
            padding: '8px 16px',
            border: '2px solid #000000',
            backgroundColor: '#ffffff',
            color: '#000000',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </body>
    </html>
  )
}
