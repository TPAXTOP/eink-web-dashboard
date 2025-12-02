/**
 * Client-side JavaScript for the e-paper dashboard.
 *
 * NOTE: This file is intentionally minimal.
 * All data is now pre-rendered server-side for e-paper compatibility.
 * No asynchronous fetching occurs on the client.
 *
 * The server fetches weather and FX data in the background at configurable
 * intervals and caches it. When a client requests the page, the server
 * responds with fully static HTML containing all data.
 */

// No client-side data fetching - page is server-rendered
console.log('[client] Dashboard loaded (server-rendered, no async fetching)')
