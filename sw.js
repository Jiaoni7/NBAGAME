// Service Worker - 王朝传奇 PWA 离线缓存
const CACHE = 'nba-dynasty-v8';
// 核心文件：必须缓存成功（缺一不可，决定能否离线启动）
const CORE = [
  './',
  'index.html',
  'game.js',
  'manifest.webmanifest'
];
// 可选文件：图标等，单个失败不影响 SW 安装
const OPTIONAL = [
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-1024.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 核心文件逐个缓存：即便个别失败也不阻断安装（避免"正在安装"卡死）
    await Promise.allSettled(CORE.map((url) => cache.add(url)));
    // 可选文件尽力缓存
    await Promise.allSettled(OPTIONAL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // 导航请求（打开页面）：网络优先，失败回退缓存首页，保证可离线启动
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then((r) => r || caches.match('index.html') || caches.match('./'))
      )
    );
    return;
  }
  // 其他资源：缓存优先，命中即返回，否则联网并写入缓存
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
