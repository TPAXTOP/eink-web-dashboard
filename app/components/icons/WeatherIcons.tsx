/**
 * Weather icon components for e-paper display.
 *
 * SVG icons optimized for monochrome rendering:
 * - Pure black strokes on transparent/white background
 * - Crisp edges for e-paper display
 * - Variable size support (24px for small, 48px for large)
 *
 * @module WeatherIcons
 */

/**
 * Props for weather icon components.
 */
export interface WeatherIconProps {
  /** Icon size in pixels (default: 48) */
  size?: number
}

/**
 * Clear/sunny weather icon with sun rays.
 */
export function SunnyIcon({ size = 48 }: WeatherIconProps) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <circle cx="24" cy="24" r="10" stroke="#000" strokeWidth={strokeWidth} fill="none" />
      <line x1="24" y1="2" x2="24" y2="10" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="24" y1="38" x2="24" y2="46" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="2" y1="24" x2="10" y2="24" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="38" y1="24" x2="46" y2="24" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="8.5" y1="8.5" x2="14.2" y2="14.2" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="33.8" y1="33.8" x2="39.5" y2="39.5" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="8.5" y1="39.5" x2="14.2" y2="33.8" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="33.8" y1="14.2" x2="39.5" y2="8.5" stroke="#000" strokeWidth={strokeWidth} />
    </svg>
  )
}

/**
 * Cloudy weather icon.
 */
export function CloudyIcon({ size = 48 }: WeatherIconProps) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <path
        d="M12 36 C6 36 2 32 2 26 C2 20 6 16 12 16 C12 10 18 6 26 6 C34 6 40 12 40 20 C46 20 48 24 48 28 C48 34 44 36 38 36 Z"
        stroke="#000"
        strokeWidth={strokeWidth}
        fill="none"
      />
    </svg>
  )
}

/**
 * Partly cloudy weather icon (sun behind cloud).
 */
export function PartlyCloudyIcon({ size = 48 }: WeatherIconProps) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <circle cx="16" cy="16" r="8" stroke="#000" strokeWidth={strokeWidth} fill="none" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="4" y1="16" x2="2" y2="16" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="6" y1="6" x2="8.8" y2="8.8" stroke="#000" strokeWidth={strokeWidth} />
      {size === 48 && (
        <line x1="6" y1="26" x2="8.8" y2="23.2" stroke="#000" strokeWidth={strokeWidth} />
      )}
      <path
        d="M14 40 C8 40 6 36 6 32 C6 28 10 24 14 24 C14 20 18 16 26 16 C34 16 38 22 38 28 C44 28 46 32 46 34 C46 38 42 40 38 40 Z"
        stroke="#000"
        strokeWidth={strokeWidth}
        fill="#fff"
      />
    </svg>
  )
}

/**
 * Rain weather icon (cloud with rain drops).
 */
export function RainIcon({ size = 48 }: WeatherIconProps) {
  const strokeWidth = size === 24 ? 3 : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <path
        d="M10 28 C4 28 2 24 2 20 C2 16 6 12 10 12 C10 6 16 2 24 2 C32 2 38 8 38 14 C44 14 46 18 46 22 C46 26 42 28 38 28 Z"
        stroke="#000"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <line x1="14" y1="34" x2="10" y2="44" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="24" y1="34" x2="20" y2="44" stroke="#000" strokeWidth={strokeWidth} />
      <line x1="34" y1="34" x2="30" y2="44" stroke="#000" strokeWidth={strokeWidth} />
    </svg>
  )
}

/**
 * Weather icon wrapper that selects appropriate icon based on type.
 *
 * @param props.icon - Icon type: 'sunny', 'cloudy', 'partly-cloudy', or 'rain'
 * @param props.size - Icon size in pixels (default: 48)
 */
export function WeatherIcon({ icon, size = 48 }: { icon: string; size?: number }) {
  switch (icon) {
    case 'sunny':
      return <SunnyIcon size={size} />
    case 'cloudy':
      return <CloudyIcon size={size} />
    case 'partly-cloudy':
      return <PartlyCloudyIcon size={size} />
    case 'rain':
      return <RainIcon size={size} />
    default:
      return <CloudyIcon size={size} />
  }
}
