// sw.js - Service Worker for Tiki App v2.0

// Define a cache name, including a version number
const CACHE_NAME = 'tiki-app-cache-v2.0.4'; // Updated version to match app

// List the essential files and resources needed for the app shell to work offline
const urlsToCache = [
  '.', // Cache the current directory (resolves to index.html for root access)
  'index.html', // Cache the main HTML file explicitly
  'manifest.json', // Cache the manifest file
  // External resources loaded by the app:
  'https://cdn.tailwindcss.com', // Tailwind CSS
  // SortableJS was removed, so its CDN link is no longer cached.
  'https://cdn.jsdelivr.net/npm/lucide-static@0.473.0/font/lucide.ttf', // Lucide font
  // Paths to your icon files
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'images/tiki-background.png'
];

// Install event: Open cache and add app shell files
self.addEventListener('install', event => {
  console.log(`[Service Worker] Install event for ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[Service Worker] Opened cache: ${CACHE_NAME}`);
        return cache.addAll(urlsToCache)
          .then(() => console.log('[Service Worker] Essential files cached successfully.'))
          .catch(error => console.error('[Service Worker] Failed to cache essential files:', error, urlsToCache));
      })
      .catch(error => {
        console.error('[Service Worker] Failed to open cache:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log(`[Service Worker] Activate event for ${CACHE_NAME}`);
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If the cache name isn't in our whitelist, delete it
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    // Ensure the activated service worker takes control of all clients immediately
    .then(() => self.clients.claim())
  );
});

// Fetch event: Serve from cache first, fallback to network (Cache-First strategy for app shell)
self.addEventListener('fetch', event => {
  // We only want to apply this strategy to GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache - fetch from network
        // console.log('[Service Worker] Serving from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('[Service Worker] Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('[Service Worker] Fetch failed; returning offline fallback or error for:', event.request.url, error);
          // Optionally, you could return a custom offline fallback page here:
          // return caches.match('/offline.html'); 
          // For now, just let the browser handle the error if it's not in cache and network fails
        });
      })
  );
});
