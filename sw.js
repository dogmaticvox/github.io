// sw.js - Service Worker for Tiki App

// Define a cache name, including a version number
const CACHE_NAME = 'tiki-app-cache-v1.7'; // Increment version if you change cached files

// List the essential files and resources needed for the app shell to work offline
const urlsToCache = [
  // Root directory (often resolves to index.html) - important for start_url
  '.', // Cache the current directory
  'index.html', // Cache the main HTML file explicitly
  'manifest.json', // Cache the manifest file
  // External resources loaded by the app:
  'https://cdn.tailwindcss.com', // Tailwind CSS
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js', // SortableJS
  'https://cdn.jsdelivr.net/npm/lucide-static@0.473.0/font/lucide.ttf', // Lucide font
  // Add paths to your actual icon files once created
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // Note: The inline SVG background doesn't need separate caching as it's part of index.html
];

// Install event: Open cache and add app shell files
self.addEventListener('install', event => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        // Use addAll for atomic caching - if one fails, none are added
        return cache.addAll(urlsToCache)
          .then(() => console.log('[Service Worker] Essential files cached successfully.'))
          .catch(error => console.error('[Service Worker] Failed to cache essential files:', error));
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
  console.log('[Service Worker] Activate event');
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
    // Ensure the activated service worker takes control immediately
    .then(() => self.clients.claim())
  );
});

// Fetch event: Serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  // console.log('[Service Worker] Fetching:', event.request.url);
  event.respondWith(
    // Try to find the response in the cache
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the cached response
        if (response) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        // Cache miss - fetch from the network
        // console.log('[Service Worker] Serving from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Optional: Cache the fetched response for future offline use
            // Be careful caching everything, especially dynamic data or large files
            // Only cache GET requests
            if (event.request.method === 'GET') {
              // Clone the response because response streams can only be consumed once
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  // console.log('[Service Worker] Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            // Handle fetch errors (e.g., offline and not in cache)
            console.error('[Service Worker] Fetch failed:', error);
            // Optionally return a custom offline fallback page/response here
            // For now, just let the browser handle the error
          });
      })
  );
});
