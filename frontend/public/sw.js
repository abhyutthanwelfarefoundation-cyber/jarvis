// frontend/public/sw.js — JARVIS Service Worker
const CACHE = 'jarvis-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install — cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[SW] Cache failed (some files may not exist yet):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip API calls — always go to network for these
  if (url.hostname !== location.hostname || url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests (page loads)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(OFFLINE_URL) || caches.match('/')
      )
    );
    return;
  }

  // For everything else — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});