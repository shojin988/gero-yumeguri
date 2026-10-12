const CACHE_NAME = 'gero-yumeguri-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/card.js',
  './js/congestion.js',
  './js/dom.js',
  './js/exterior.js',
  './js/facility-items.js',
  './js/format.js',
  './js/geo.js',
  './js/hours.js',
  './js/i18n.js',
  './js/list-view.js',
  './js/map-view.js',
  './js/messages.js',
  './js/plan-view.js',
  './js/planner.js',
  './js/storage.js',
  './data/facilities.json',
  './data/holidays.json',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const NETWORK_TIMEOUT_MS = 4000;

function updateCache(request, response) {
  caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, response))
    .catch((error) => console.warn('キャッシュの更新に失敗しました', error));
}

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      updateCache(request, response.clone());
    }
    return response;
  });
}

async function networkFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const networkPromise = fetchAndCache(request);

  if (!cached) {
    try {
      return await networkPromise;
    } catch (error) {
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      throw error;
    }
  }

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([networkPromise, timeoutPromise]);
  } catch {
    return cached;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  event.respondWith(networkFirst(event.request));
});
