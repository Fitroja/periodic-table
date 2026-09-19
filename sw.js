/**
 * sw.js — Service Worker
 * فایل‌های خود برنامه با راهبرد «شبکه اول، کش پشتیبان» و کتابخانه‌های CDN
 * با راهبرد «کش اول» نگه‌داری می‌شوند تا برنامه آفلاین هم اجرا شود.
 */
const VERSION = 'pt3d-v4';
const APP_CACHE = `${VERSION}-app`;
const CDN_CACHE = `${VERSION}-cdn`;

const APP_SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/scene.js',
  'js/ui.js',
  'js/layouts.js',
  'js/audio.js',
  'js/periodic-data.js',
  'manifest.webmanifest',
  'icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // کتابخانه‌ها و فونت‌های بیرونی تغییر نمی‌کنند: کش اول
  if (!isSameOrigin) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request)
            .then((res) => {
              if (res.ok || res.type === 'opaque') {
                const copy = res.clone();
                caches.open(CDN_CACHE).then((c) => c.put(request, copy));
              }
              return res;
            })
            .catch(() => hit)
      )
    );
    return;
  }

  // فایل‌های خود برنامه: شبکه اول تا نسخه تازه همیشه دیده شود
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit || caches.match('index.html'))
      )
  );
});
