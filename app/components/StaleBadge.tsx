/**
 * Inline "data not updated" indicator.
 *
 * Rendered next to a section header when that section's latest refresh failed
 * and the displayed values are from a previous successful fetch.
 *
 * Implemented as a styled text glyph (not an <svg>) so it is unaffected by the
 * global `svg { width: 100% }` rule and never shifts the surrounding layout.
 * Monochrome only.
 *
 * @module StaleBadge
 */

interface StaleBadgeProps {
  /** Optional tooltip text (e.g. when the shown data was last updated). */
  title?: string
}

/**
 * Small monochrome warning marker indicating stale (not-updated) data.
 */
export function StaleBadge({ title = 'Data not updated' }: StaleBadgeProps) {
  return (
    <span
      className="stale-badge"
      role="img"
      aria-label={title}
      title={title}
    >
      !
    </span>
  )
}
