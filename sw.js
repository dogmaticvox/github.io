// sw.js

// Define a unique cache name for this version of the app.
// IMPORTANT: Change this name every time you update your app files.
const CACHE_NAME = 'tiki-app-v3.0.0';

// List of files to cache for offline use.
const urlsToCache = [
  './', // This caches the index.html file at the root
  './index.html',
  './manifest.json',
  './images/tiki-background.png', // Make sure this path is correct
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdn.tailwindcss.com', // Cache the Tailwind CSS file
  'https://cdn.jsdelivr.net/npm/lucide-static@0.473.0/font/lucide.ttf' // Cache the icon font
];

// --- Service Worker Installation ---
// This event fires when the service worker is first installed.
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// --- Service Worker Activation ---
// This event fires when the service worker is activated.
// It's a good place to clean up old caches.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache's name is not our current CACHE_NAME, we delete it.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // This line ensures the new service worker takes control of the page immediately.
  return self.clients.claim();
});

// --- Fetching Content ---
// This event fires for every network request made by the page.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // First, try to find a matching response in the cache.
    caches.match(event.request)
      .then(response => {
        // If a response is found in the cache, return it.
        if (response) {
          // console.log('[Service Worker] Returning from cache:', event.request.url);
          return response;
        }
        // If the request is not in the cache, fetch it from the network.
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request);
      })
  );
});


// --- Handling Updates ---
// This listens for the 'skipWaiting' message from the main page.
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[Service Worker] Skip waiting message received');
    self.skipWaiting();
  }
});
