// Minimal hand-rolled service worker (M4). No build step knows the hashed asset
// names, so instead of precaching a fixed list we cache on demand: the first
// online visit populates the cache, and every later load — including fully
// offline — is served from it. Deliberately dependency-free (no workbox /
// vite-plugin-pwa) so it can't break under rolldown-vite.

const CACHE = 'dnt-v1'
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', () => {
  // Take over as soon as the new worker is installed rather than waiting for
  // every old tab to close — a push-to-main deploy should reach the player fast.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  const isFont = FONT_ORIGINS.includes(url.origin)
  // Leave anything else (other cross-origin requests) to the network untouched.
  if (!sameOrigin && !isFont) return

  // Navigations: network-first so a fresh deploy's index.html (and its new
  // hashed asset names) is picked up when online; fall back to cache offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(request)
          return cached || caches.match(new URL('index.html', self.registration.scope).href)
        }
      })(),
    )
    return
  }

  // Everything else — hashed JS/CSS (immutable), the favicon, fonts: cache-first.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const fresh = await fetch(request)
      // Cache successful and opaque (cross-origin font) responses for next time.
      if (fresh.ok || fresh.type === 'opaque') {
        const cache = await caches.open(CACHE)
        cache.put(request, fresh.clone())
      }
      return fresh
    })(),
  )
})
