/**
 * Shared fetch helpers.
 *
 * @module fetch-utils
 */

/**
 * `fetch` with a hard timeout.
 *
 * No external request may hang the request that triggered it. When `timeoutMs`
 * elapses the underlying connection is aborted and the returned promise rejects
 * (with a `TimeoutError`), which callers treat as a fetch failure.
 *
 * Always uses `cache: 'no-store'` unless the caller overrides it: caching is
 * handled one layer up by `unstable_cache` (see `lib/last-known-good.ts`), so
 * the raw request must not be cached by Next's fetch Data Cache as well.
 *
 * @param input - Request URL or Request object.
 * @param init - Standard fetch options (merged; `signal` is set by this helper).
 * @param timeoutMs - Abort the request after this many milliseconds.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  return fetch(input, {
    cache: 'no-store',
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  })
}
