// sw.js

// 1. MUDANÇA IMPORTANTE: Mudamos o nome do cache.
//    Isso força o Service Worker a criar um novo cache com os ficheiros atualizados.
const CACHE_NAME = 'romaneios-cache-v2'; 
const urlsToCache = [
  '/',
  '/index.html',
];

// O evento 'install' é acionado quando o novo Service Worker é detetado
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Novo cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 2. Força o novo Service Worker a tornar-se ativo imediatamente
        return self.skipWaiting();
      })
  );
});

// O evento 'activate' é acionado quando o novo Service Worker assume o controlo
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 3. Apaga todos os caches antigos que não estão na lista de permissões
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('A apagar cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
        // 4. Diz ao novo Service Worker para assumir o controlo de todas as páginas abertas
        return self.clients.claim();
    })
  );
});


self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta ir primeiro à rede para obter a versão mais recente
    fetch(event.request).catch(() => {
      // Se a rede falhar (offline), serve a partir do cache
      return caches.match(event.request);
    })
  );
});
