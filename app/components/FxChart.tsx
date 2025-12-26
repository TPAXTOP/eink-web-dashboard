/**
 * Exchange rate chart component for e-paper display.
 *
 * Renders an SVG line chart of historical FX data points.
 * Optimized for monochrome e-paper: uses only black strokes, no animations.
 *
 * @module FxChart
 */

import type { FxPoint } from '@/lib/types'
import { formatRate } from '@/lib/format-utils'

/**
 * Props for the FxChart component.
 */
interface FxChartProps {
  /** Array of FX data points with date and value */
  points: FxPoint[]
}

/**
 * Renders an SVG line chart of exchange rate history.
 *
 * Features:
 * - Auto-scaling Y-axis based on data range
 * - Grid lines at min, mid, and max values
 * - X-axis date labels at regular intervals
 * - Individual data point markers
 *
 * @param props - Component props
 * @param props.points - Array of FX data points to display
 * @returns SVG element with chart visualization
 *
 * @example
 * <FxChart points={[{ date: '2025-12-25', value: 41.55 }, ...]} />
 */
export function FxChart({ points }: FxChartProps) {
  if (!points.length) {
    return (
      <svg width="720" height="200" role="img" aria-label="No chart data available"></svg>
    )
  }

  const width = 720
  const height = 200
  const padding = { top: 20, right: 50, bottom: 30, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = points.map((p) => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  // Scale functions
  const scaleX = (i: number) => padding.left + (i / (points.length - 1)) * chartWidth
  const scaleY = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight

  // Generate path
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.value).toFixed(1)}`)
    .join(' ')

  // Generate X-axis labels (show every ~5th label)
  const labelInterval = Math.max(1, Math.floor(points.length / 6))

  // Y-axis label values
  const yLabelValues = [minVal, (minVal + maxVal) / 2, maxVal]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="USD to UAH rates for the last 30 days"
    >
      {/* Grid lines */}
      {yLabelValues.map((v) => (
        <line
          key={`grid-${v}`}
          x1={padding.left}
          y1={scaleY(v).toFixed(1)}
          x2={width - padding.right}
          y2={scaleY(v).toFixed(1)}
          stroke="#000"
          strokeDasharray="2,4"
          strokeWidth="0.5"
        />
      ))}

      {/* Data path */}
      <path d={pathData} fill="none" stroke="#000" strokeWidth="2" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={`point-${i}`}
          cx={scaleX(i).toFixed(1)}
          cy={scaleY(p.value).toFixed(1)}
          r="2"
          fill="#000"
        />
      ))}

      {/* X-axis labels - track index during filter to avoid O(n) indexOf lookup */}
      {points
        .map((p, i) => ({ point: p, index: i }))
        .filter(({ index }) => index % labelInterval === 0 || index === points.length - 1)
        .map(({ point: p, index }) => {
          const x = scaleX(index)
          const label = p.date.slice(5) // MM-DD format
          return (
            <text
              key={`xlabel-${p.date}`}
              x={x.toFixed(1)}
              y={height - 5}
              textAnchor="middle"
              fontSize="11"
              fill="#000"
            >
              {label}
            </text>
          )
        })}

      {/* Y-axis labels */}
      {yLabelValues.map((v) => (
        <text
          key={`ylabel-${v}`}
          x={width - 5}
          y={scaleY(v).toFixed(1)}
          textAnchor="end"
          fontSize="11"
          fill="#000"
          dominantBaseline="middle"
        >
          {formatRate(v)}
        </text>
      ))}
    </svg>
  )
}

