const CACHE = 'cove-gym-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest-gym.json',
  './icon-192.png',
  './icon-512.png'
];
// Nice to have offline, but install must not fail if it can't be fetched
const OPTIONAL = [
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap'
];

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS).then(() => Promise.all(OPTIONAL.map(u => cache.add(u).catch(() => {}))))
    ).then(() => self.skipWaiting())
  );
});

// Activate: clear old gym caches (leave the planner's caches alone)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('cove-gym-') && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function saveCopy(req, res) {
  if (res && res.status === 200 && res.type !== 'opaque') {
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(req, clone));
  }
  return res;
}

// Fetch: always answer from the saved copy first so the app opens instantly
// with no signal or a weak one; refresh the saved copy in the background.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(cached => {
        const update = fetch(e.request).then(res => saveCopy(e.request, res));
        e.waitUntil(update.catch(() => {}));
        return cached || caches.match('./index.html').then(r => r || update);
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => saveCopy(e.request, res))
    )
  );
});
