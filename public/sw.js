// Service Worker for AL FAROOQ FOODS - 100% Offline PWA
const CACHE_NAME = 'al-farooq-foods-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  '/al-farooq-foods-logo.png',
  '/icon-light-32x32.png',
  '/apple-icon.png',
  '/icon.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  
  const url = new URL(event.request.url)
  // Do not intercept or cache Next.js internal chunks, dev resources, or API routes
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.includes('webpack') || url.pathname.includes('hot-update')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone)
              })
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse
          }
          const responseClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return networkResponse
        })
        .catch(() => {
          // If offline and request is for page navigation, return cached root
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        })
    })
  )
})
