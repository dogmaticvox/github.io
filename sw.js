// sw.js — Tiki App v3.3.0

const CACHE_NAME = 'tiki-app-v3.3.0';

// App-shell files: cache-first (pre-cached at install time)
const APP_SHELL = [
  './',
  './index.html',
  './recipes.json',
  './manifest.json',
  './images/tiki-background.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
];

// CDN resources: stale-while-revalidate (serve cached copy instantly,
// refresh in the background so the next visit gets the latest version)
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/lucide-static@0.473.0/font/lucide.ttf',
];

// --- Install: pre-cache app shell ---
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      // Cache CDN resources individually so one failure doesn't block install
      const cdnPromises = CDN_URLS.map(url =>
        cache.add(url).catch(err => console.warn('[SW] CDN cache miss (ok offline):', url, err))
      );
      return cache.addAll(APP_SHELL).then(() => Promise.all(cdnPromises));
    })
  );
});

// --- Activate: purge old caches ---
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    )
  );
  return self.clients.claim();
});

// --- Fetch ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // CDN resources: stale-while-revalidate
  if (CDN_URLS.some(cdn => url.startsWith(cdn))) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // App shell & everything else: cache-first, network fallback, offline page
  event.respondWith(cacheFirstWithOfflineFallback(event.request));
});

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(cache =>
    cache.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response && response.status === 200)
          cache.put(request, response.clone());
        return response;
      }).catch(() => null);
      // Return cached immediately; refresh in background
      return cached || networkFetch;
    })
  );
}

function cacheFirstWithOfflineFallback(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      // Cache successful responses for future offline use
      if (response && response.status === 200) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => {
      // Offline fallback: return the cached index.html for navigation requests
      if (request.mode === 'navigate') return caches.match('./index.html');
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    });
  });
}

// --- Handle skipWaiting message from app ---
self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') {
    console.log('[SW] Skip waiting');
    self.skipWaiting();
  }
});
