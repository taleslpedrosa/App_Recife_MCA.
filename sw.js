const CACHE_NAME = 'museu-recife-v15';

const ASSETS_ESTRUTURAIS = [
    './',
    './index.html',
    './manifest.json',
    './js/schema.js',
    './js/telemetry.js',
    './js/sync.js',
    './js/store.js',
    './js/i18n.js',
    './js/dados.js',
    './css/style.css',
    './js/map.js',
    './js/routes.js',
    './js/ui.js',
    './js/sheets.js',
    './js/app.js',
    './vendor/leaflet/leaflet.css',
    './vendor/leaflet/leaflet.js',
    './imagens/icone-192.png',
    './imagens/icone-512.png',
    './imagens/Torre_Malakoff.jpg',
    './imagens/paco_do_frevo_1.jpg',
    './imagens/paco_do_frevo_2.jpg',
    './imagens/Parque_das_Esculturas_1.jpg'
];

// Instala o Service Worker e armazena os recursos essenciais no cache
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_ESTRUTURAIS).catch(err => {
                console.warn('Algum asset opcional falhou no precache:', err);
            });
        })
    );
});

// Limpa caches antigos quando uma nova versão for publicada
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estratégia de cache: Cache First com fallback de rede para assets locais,
// e Network First com fallback de cache para recursos externos/tiles
self.addEventListener('fetch', (event) => {
    // Apenas intercepta requisições GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Atualiza em background se for uma requisição interna (Stale-While-Revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => { /* Sem conexão, mantém cache */ });
                
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // Se for imagem externa de fallback ou tile de mapa com sucesso, guarda em cache temporário
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback offline se necessário
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
