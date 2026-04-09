// ═══════════════════════════════════════════════
//  VMA Tracker — Service Worker
//  ⚠️ Incrémente CACHE_VERSION à chaque mise à jour
// ═══════════════════════════════════════════════

const CACHE_VERSION = 'v1';
const CACHE_NAME = `vma-tracker-${CACHE_VERSION}`;

// Fichiers à mettre en cache au premier chargement
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Bibliothèques externes (optionnel — nécessite réseau au 1er chargement)
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;700&display=swap'
];

// ── Installation : mise en cache des assets ──
self.addEventListener('install', event => {
  console.log(`[SW ${CACHE_VERSION}] Installation...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des assets...');
        // On ignore les erreurs sur les ressources externes (fonts, CDN)
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => cache.add(url).catch(e => console.warn('[SW] Échec cache:', url, e)))
        );
      })
      .then(() => self.skipWaiting()) // Active immédiatement le nouveau SW
  );
});

// ── Activation : suppression des anciens caches ──
self.addEventListener('activate', event => {
  console.log(`[SW ${CACHE_VERSION}] Activation...`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('vma-tracker-') && key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

// ── Fetch : stratégie Cache First avec fallback réseau ──
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached; // Servi depuis le cache
        }
        // Pas en cache → réseau
        return fetch(event.request)
          .then(response => {
            // Mettre en cache les nouvelles ressources valides
            if (response && response.status === 200 && response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // Hors ligne et pas en cache
            console.warn('[SW] Ressource non disponible hors ligne:', event.request.url);
          });
      })
  );
});
