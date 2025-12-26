/**
 * Battery history graph component for e-paper display.
 *
 * Renders 24-hour battery level history as an SVG line chart.
 * Shows percentage on Y-axis, 3-hour intervals on X-axis.
 *
 * @module BatteryGraph
 */

import { extractKyivHour } from '@/lib/time-utils'

/**
 * Single battery history data point.
 */
interface BatteryHistoryPoint {
  /** ISO timestamp of measurement */
  time: string
  /** Battery state of charge (0-100%) */
  percent: number
}

/**
 * Props for the BatteryGraph component.
 */
interface BatteryGraphProps {
  /** Array of battery history points */
  history: BatteryHistoryPoint[]
}

/**
 * Renders an SVG line chart of battery level history.
 *
 * Features:
 * - Fixed Y-axis scale (0-100%)
 * - Grid lines at 0%, 50%, 100%
 * - X-axis labels at 3-hour intervals based on actual data timestamps
 * - Thick line stroke for e-paper visibility
 *
 * @param props - Component props
 * @param props.history - Array of battery history points to display
 * @returns SVG element with graph visualization
 *
 * @example
 * <BatteryGraph history={[{ time: '2025-12-26T12:00:00Z', percent: 85 }, ...]} />
 */
export function BatteryGraph({ history }: BatteryGraphProps) {
  const width = 528
  const height = 180
  const padding = { top: 16, right: 8, bottom: 32, left: 36 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  if (history.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ shapeRendering: 'crispEdges' }}
      />
    )
  }

  const scaleX = (i: number) => padding.left + (i / (history.length - 1)) * graphWidth
  const scaleY = (v: number) => padding.top + graphHeight - (v / 100) * graphHeight

  /**
   * Generate tick labels from actual data timestamps at 3-hour boundaries.
   */
  const getTickLabels = (): { x: number; label: string }[] => {
    const labels: { x: number; label: string }[] = []
    let lastLabelHour = -1

    for (let i = 0; i < history.length; i++) {
      const hourStr = extractKyivHour(history[i].time)
      const hour = parseInt(hourStr, 10)

      // Show label at 3-hour boundaries (0, 3, 6, 9, 12, 15, 18, 21)
      if (!isNaN(hour) && hour % 3 === 0 && hour !== lastLabelHour) {
        labels.push({
          x: scaleX(i),
          label: hourStr,
        })
        lastLabelHour = hour
      }
    }

    return labels
  }

  const tickLabels = getTickLabels()

  const points = history
    .map((h, i) => `${scaleX(i).toFixed(0)},${scaleY(h.percent).toFixed(0)}`)
    .join(' ')

  const baselineY = padding.top + graphHeight

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* Y-axis labels */}
      <text
        x={padding.left - 6}
        y={padding.top + 5}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#000"
      >
        100%
      </text>
      <text
        x={padding.left - 6}
        y={scaleY(50) + 4}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#000"
      >
        50%
      </text>
      <text
        x={padding.left - 6}
        y={padding.top + graphHeight + 4}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#000"
      >
        0%
      </text>

      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={width - padding.right}
        y2={padding.top}
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="4,6"
      />
      <line
        x1={padding.left}
        y1={scaleY(50)}
        x2={width - padding.right}
        y2={scaleY(50)}
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="4,6"
      />
      <line
        x1={padding.left}
        y1={baselineY}
        x2={width - padding.right}
        y2={baselineY}
        stroke="#000"
        strokeWidth="2"
      />

      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={baselineY}
        stroke="#000"
        strokeWidth="2"
      />

      {/* X-axis ticks at 3-hour intervals with absolute time labels */}
      {tickLabels.map((tick, i) => (
        <g key={`tick-${i}`}>
          <line x1={tick.x} y1={baselineY} x2={tick.x} y2={baselineY + 6} stroke="#000" strokeWidth="2" />
          <text
            x={tick.x}
            y={baselineY + 18}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fontFamily="inherit"
            fill="#000"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* Data line - thicker for e-paper */}
      <polyline points={points} fill="none" stroke="#000" strokeWidth="3" />
    </svg>
  )
}
