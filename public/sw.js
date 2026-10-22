// Retirement worker: stop serving cached pages from earlier offline versions.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil((async () => {
 for (const key of await caches.keys()) if (key.startsWith('al-farooq')) await caches.delete(key)
 await self.registration.unregister()
 await self.clients.claim()
})()))
