// ★ 更新時はここのバージョン番号を上げる (v2 → v3 → v4...)
const CACHE_NAME = 'anoano-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // 新バージョンを即座に有効化
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      './',
      './index.html',
      './styles.css',
      './app.js',
      './icon.png',
      './manifest.json'
    ])),
  );
});

self.addEventListener('activate', (e) => {
  // 古いバージョンのキャッシュを自動削除
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // 即座に全タブに適用
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
