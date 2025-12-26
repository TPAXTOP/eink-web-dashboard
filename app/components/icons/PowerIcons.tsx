/**
 * Power status icon components for e-paper display.
 *
 * SVG icons for battery, grid, and power flow status.
 * Optimized for monochrome e-paper rendering.
 *
 * @module PowerIcons
 */

import type { ChargingStatus } from '@/lib/types'

/**
 * Battery level indicator icon.
 * Shows fill level proportional to percentage.
 *
 * @param props.pct - Battery percentage (0-100)
 */
export function BatteryIcon({ pct }: { pct: number }) {
  const fillHeight = Math.round((pct / 100) * 30)
  const fillY = 10 + (30 - fillHeight)
  return (
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <rect x="4" y="8" width="24" height="36" rx="4" ry="4" stroke="#000" strokeWidth="2" fill="none" />
      <rect x="11" y="2" width="10" height="6" rx="2" ry="2" stroke="#000" strokeWidth="2" fill="#000" />
      {fillHeight > 0 && (
        <rect x="6" y={fillY} width="20" height={fillHeight} rx={fillY > 36 ? 2 : 0} ry={fillY > 36 ? 2 : 0} fill="#000" />
      )}
    </svg>
  )
}

/**
 * Grid connected indicator (filled lightning bolt).
 * Shows when mains power is available.
 */
export function GridOnIcon() {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <polygon points="13,2 6,14 11,14 11,22 18,10 13,10" fill="#000" stroke="#000" strokeWidth="1" />
    </svg>
  )
}

/**
 * Grid disconnected indicator (outlined lightning bolt with strike-through).
 * Shows when mains power is not available.
 */
export function GridOffIcon() {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <polygon points="13,2 6,14 11,14 11,22 18,10 13,10" fill="none" stroke="#000" strokeWidth="2" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="#000" strokeWidth="2" />
    </svg>
  )
}

/**
 * Charging status indicator.
 * Shows arrow direction based on battery status.
 *
 * @param props.status - Current charging status
 */
export function StatusIcon({ status }: { status: ChargingStatus }) {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      {status === 'discharging' && (
        <>
          <line x1="12" y1="4" x2="12" y2="18" stroke="#000" strokeWidth="2" />
          <polyline points="6,12 12,20 18,12" fill="none" stroke="#000" strokeWidth="2" />
        </>
      )}
      {status === 'charging' && (
        <>
          <line x1="12" y1="6" x2="12" y2="20" stroke="#000" strokeWidth="2" />
          <polyline points="6,12 12,4 18,12" fill="none" stroke="#000" strokeWidth="2" />
        </>
      )}
      {(status === 'idle' || status === 'unknown') && (
        <polyline points="5,12 10,18 19,6" fill="none" stroke="#000" strokeWidth="2" />
      )}
    </svg>
  )
}

/**
 * Load/consumption indicator (gauge icon).
 * Shows current power consumption status.
 */
export function LoadIcon() {
  return (
    <svg width="32" height="48" viewBox="0 0 24 24" fill="none" style={{ shapeRendering: 'crispEdges' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#000" strokeWidth="2" />
      <line x1="12" y1="12" x2="17" y2="7" stroke="#000" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="#000" />
    </svg>
  )
}
