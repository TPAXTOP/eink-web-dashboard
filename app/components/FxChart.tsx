/**
 * FX Chart component - Renders SVG chart for exchange rate data.
 * E-paper compatible: monochrome, no animations.
 */

import type { FxPoint } from '@/lib/types'
import { formatRate } from '@/lib/format-utils'

interface FxChartProps {
  points: FxPoint[]
}

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

      {/* X-axis labels */}
      {points
        .filter((_, i) => i % labelInterval === 0 || i === points.length - 1)
        .map((p) => {
          const originalIndex = points.indexOf(p)
          const x = scaleX(originalIndex)
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

