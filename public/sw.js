// Plate Together service worker — app-shell caching for installable PWA + offline.
// Bump CACHE when changing this file to evict the old cache.
const CACHE = 'pt-v1'
const SHELL = ['/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Only handle same-origin; let Firebase / cross-origin requests pass straight through.
  if (url.origin !== self.location.origin) return

  // Navigations: network-first so a fresh deploy's index (with new asset hashes) always wins,
  // falling back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Hashed build assets are immutable — cache-first is safe and fast.
  event.respondWith(
    caches.match(req).then(cached =>
      cached ||
      fetch(req).then(res => {
        if (res.ok && url.pathname.startsWith('/assets/')) {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy))
        }
        return res
      })
    )
  )
})
