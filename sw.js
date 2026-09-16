/* Haelt die App-Huelle offline verfuegbar. Die Spracherkennung selbst
   braucht trotzdem Internet, da Chrome sie serverseitig ausfuehrt. */
var CACHE = 'ideen-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Netz zuerst, damit Aktualisierungen sofort ankommen; Cache als Rueckfall. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    })['catch'](function () { return caches.match(e.request); })
  );
});
