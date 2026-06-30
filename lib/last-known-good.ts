/**
 * Last-known-good fallback layer for data fetching.
 *
 * Wraps a fetcher so that, when a refresh fails, the most recent successful
 * result keeps being shown (with a "stale" marker) rather than blanking the
 * section.
 *
 * STORAGE: Next.js `unstable_cache`, which is backed by the Data Cache and so
 * persists across serverless instances and cold starts on Vercel. This is the
 * key difference from the previous module-level in-memory Map, which was wiped
 * on every cold start and therefore almost never had a value to fall back to.
 *
 * HOW THE FALLBACK WORKS: `unstable_cache` only stores the *return value* of the
 * wrapped function. When that function THROWS during a background revalidation,
 * Next catches the error and serves the previously cached (stale) value instead
 * of caching the failure. Our fetchers therefore throw on failure (rather than
 * returning null), so a failed refresh transparently yields the last good value.
 *
 * A fetcher may still legitimately return `null` to mean "not configured / no
 * data" (e.g. missing API key); that is a stable state and is cached as-is.
 */

import { unstable_cache } from 'next/cache'

/**
 * Result of a resilient fetch.
 */
export type Resilient<T> = {
  /** Displayed data: fresh on success, or the last-known-good value when stale. */
  data: T | null
  /** True when the displayed data is older than its expected refresh window. */
  stale: boolean
  /** ISO timestamp of when `data` was last successfully fetched (null if never). */
  storedAt: string | null
}

/**
 * Any cacheable payload carries the timestamp of its last successful fetch.
 */
type Timestamped = { fetchedAt: string }

/**
 * Whether an ISO timestamp is older than `maxAgeSeconds` (or missing).
 */
function isStale(iso: string | null | undefined, maxAgeSeconds: number): boolean {
  if (!iso) return true
  const ageSeconds = (Date.now() - new Date(iso).getTime()) / 1000
  return ageSeconds > maxAgeSeconds
}

/**
 * Build a resilient getter around a throwing fetcher.
 *
 * - Success: store the value and return it (stale=false unless its `fetchedAt`
 *   is already older than `staleMaxAgeSeconds`).
 * - Refresh failure with a prior success: `unstable_cache` serves the last good
 *   value; we mark it `stale` based on its age.
 * - Fetcher returns `null` ("not configured"): pass it through, not stale.
 * - Never fetched successfully and the fetch fails: return `{ data: null }`.
 *
 * @param key - Stable cache key identifying the data type (e.g. "weather").
 * @param fetcher - Underlying fetch function. Throws on failure; may return null
 *   to signal a stable "no data" state.
 * @param options.revalidate - How long (seconds) a cached value stays fresh.
 * @param options.staleMaxAgeSeconds - Age (seconds) past which data is "stale".
 */
export function createResilientGetter<T extends Timestamped>(
  key: string,
  fetcher: () => Promise<T | null>,
  options: { revalidate: number; staleMaxAgeSeconds: number },
): () => Promise<Resilient<T>> {
  const getCached = unstable_cache(fetcher, [key], {
    revalidate: options.revalidate,
    tags: [key],
  })

  return async (): Promise<Resilient<T>> => {
    try {
      const data = await getCached()
      if (data === null) {
        return { data: null, stale: false, storedAt: null }
      }
      return {
        data,
        stale: isStale(data.fetchedAt, options.staleMaxAgeSeconds),
        storedAt: data.fetchedAt,
      }
    } catch {
      // Fetch failed and there is no cached value to fall back to (e.g. the
      // very first request after a cold start while the upstream is down).
      return { data: null, stale: false, storedAt: null }
    }
  }
}
