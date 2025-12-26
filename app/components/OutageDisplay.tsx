/**
 * Power outage schedule display components.
 *
 * Visual representation of hourly power outage schedule.
 * Uses black/white tiles with diagonal fills for partial outages.
 *
 * @module OutageDisplay
 */

import type { HourlyOutage } from '@/lib/types'

/**
 * Props for the OutageTile component.
 */
interface OutageTileProps {
  /** Hour label (00-23) */
  hour: string
  /** Outage fraction (0-1) */
  fraction: number
  /** Which half of the hour is affected */
  halfAffected: 'none' | 'first' | 'second' | 'both'
  /** Whether the schedule is confirmed (false shows grey instead of black) */
  scheduleUnavailable?: boolean
}

/**
 * Single hour tile showing outage status.
 *
 * Visual states:
 * - No outage: White background with black text
 * - Full outage: Black background with white text
 * - Partial (first half): Left diagonal fill
 * - Partial (second half): Right diagonal fill
 * - Schedule unavailable: Grey instead of black
 *
 * @param props - Component props
 */
export function OutageTile({
  hour,
  fraction,
  halfAffected,
  scheduleUnavailable = false,
}: OutageTileProps) {
  const tileWidth = 23
  const tileHeight = 32

  // Light grey color for unavailable schedule
  const greyColor = '#999'

  // Determine visual state
  const isFullOutage = fraction >= 1 || halfAffected === 'both'
  const isNoOutage = fraction === 0
  const isPartial = !isNoOutage && !isFullOutage

  // When schedule is unavailable, use grey instead of black
  const fillColor = scheduleUnavailable ? greyColor : '#000'

  // Text positioning and color based on state
  let textX = tileWidth / 2
  let textColor = '#000'

  if (isFullOutage) {
    textColor = '#fff'
  } else if (isPartial) {
    // Position text in the white area for contrast
    if (halfAffected === 'first') {
      textX = tileWidth * 0.7 // Right side (white area)
    } else if (halfAffected === 'second') {
      textX = tileWidth * 0.3 // Left side (white area)
    }
  }

  return (
    <svg
      width={tileWidth}
      height={tileHeight}
      viewBox={`0 0 ${tileWidth} ${tileHeight}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* White background */}
      <rect x="0" y="0" width={tileWidth} height={tileHeight} fill="#fff" />

      {/* Full outage: solid fill (black or grey depending on schedule availability) */}
      {isFullOutage && (
        <rect x="0" y="0" width={tileWidth} height={tileHeight} fill={fillColor} />
      )}

      {/* Partial outage: diagonal fill */}
      {isPartial && halfAffected === 'first' && (
        // Left triangle (bottom-left to top-right diagonal, left side filled)
        <polygon points={`0,${tileHeight} 0,0 ${tileWidth},0`} fill={fillColor} />
      )}
      {isPartial && halfAffected === 'second' && (
        // Right triangle (bottom-left to top-right diagonal, right side filled)
        <polygon points={`0,${tileHeight} ${tileWidth},0 ${tileWidth},${tileHeight}`} fill={fillColor} />
      )}

      {/* Hour label */}
      <text
        x={textX}
        y={tileHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="inherit"
        fill={textColor}
      >
        {hour}
      </text>
    </svg>
  )
}

/**
 * Props for the OutageRow component.
 */
interface OutageRowProps {
  /** Day label (e.g., "Today", "Tomorrow") */
  label: string
  /** Array of 24 hourly outage data points */
  schedule: HourlyOutage[]
  /** Whether the schedule is confirmed for this day */
  scheduleApplies?: boolean
}

/**
 * Row of 24 outage tiles representing one day.
 *
 * @param props - Component props
 * @param props.label - Day label displayed on the left
 * @param props.schedule - Array of 24 HourlyOutage objects
 * @param props.scheduleApplies - Whether schedule is confirmed (affects tile colors)
 */
export function OutageRow({
  label,
  schedule,
  scheduleApplies = true,
}: OutageRowProps) {
  return (
    <div className="outage-day">
      <span className="outage-day-label">{label}</span>
      <div className="outage-tiles">
        {schedule.map((s, i) => (
          <OutageTile
            key={i}
            hour={s.hour}
            fraction={s.fraction}
            halfAffected={s.halfAffected}
            scheduleUnavailable={!scheduleApplies}
          />
        ))}
      </div>
    </div>
  )
}
