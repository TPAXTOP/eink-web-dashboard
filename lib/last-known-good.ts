/**
 * Last-known-good fallback layer for data fetching.
 *
 * Wraps a fetcher so that, when a refresh fails, the most recent successful
 * result is returned instead of nothing. This keeps the UI showing the previous
 * readings (with a "stale" marker) rather than blanking the section.
 *
 * STORAGE: A module-level in-memory Map, mirroring the existing in-memory token
 * cache in `lib/deye-api.ts`. This respects the project's "no file caching" rule.
 * It persists across requests on a warm server instance; on a cold start the
 * store is empty, so the first request after a cold start with a failing upstream
 * shows "Unavailable" until the next success.
 */

/**
 * Result of a resilient fetch.
 */
export type Resilient<T> = {
  /** Displayed data: fresh on success, or the last-known-good value when stale. */
  data: T | null
  /** True when the latest fetch failed and `data` is from a prior success. */
  stale: boolean
  /** ISO timestamp of when `data` was last successfully fetched (null if never). */
  storedAt: string | null
}

type Cached<T> = { data: T; storedAt: string }

const store = new Map<string, Cached<unknown>>()

/**
 * Run `fetcher` and fall back to the last successful result on failure.
 *
 * - On a non-null result: store it and return it as fresh.
 * - On null/throw: return the stored last-known-good value as `stale`, if any.
 * - If there is no stored value yet: return `{ data: null, stale: false }`.
 *
 * @param key - Stable cache key identifying the data type (e.g. "weather").
 * @param fetcher - The underlying fetch function (returns null on failure).
 */
export async function withLastKnownGood<T>(
  key: string,
  fetcher: () => Promise<T | null>,
): Promise<Resilient<T>> {
  let fresh: T | null = null

  try {
    fresh = await fetcher()
  } catch {
    fresh = null
  }

  if (fresh !== null) {
    const storedAt = new Date().toISOString()
    store.set(key, { data: fresh, storedAt })
    return { data: fresh, stale: false, storedAt }
  }

  const cached = store.get(key) as Cached<T> | undefined
  if (cached) {
    return { data: cached.data, stale: true, storedAt: cached.storedAt }
  }

  return { data: null, stale: false, storedAt: null }
}
