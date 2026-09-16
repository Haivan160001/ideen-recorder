/* Haelt die App-Huelle offline verfuegbar und nimmt geteilte Bilder entgegen.
   Die Spracherkennung selbst braucht Internet, da Chrome sie serverseitig
   ausfuehrt. */
var CACHE = 'ideen-v3';
var SHELL = ['./', './index.html', './assemble.js', './manifest.webmanifest',
             './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Android schickt ein geteiltes Bild als POST hierher. Bewusst werden NUR die
   Angaben zur Datei uebernommen, nicht ihr Inhalt: das Bild liegt ohnehin schon
   auf dem Geraet und wird spaeter per USB in Originalqualitaet abgeholt. Es in
   den Browserspeicher zu kopieren wuerde es verdoppeln, verkleinern und den
   Export aufblaehen. */
function geteiltesBild(e) {
  return e.respondWith((function () {
    return e.request.formData().then(function (fd) {
      var p = new URLSearchParams();
      var f = fd.get('bild');
      if (f && typeof f === 'object') {
        p.set('bild', f.name || '');
        p.set('groesse', String(f.size || 0));
        p.set('typ', f.type || '');
        p.set('stand', String(f.lastModified || 0));
      }
      var t = fd.get('text') || fd.get('titel') || fd.get('url') || '';
      if (t) p.set('text', String(t));
      return Response.redirect('./?' + p.toString(), 303);
    })['catch'](function (err) {
      return Response.redirect('./?fehler=' + encodeURIComponent(err.message || 'unbekannt'), 303);
    });
  })());
}

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  if (e.request.method === 'POST' && /\/teilen\/?$/.test(url.pathname)) {
    geteiltesBild(e);
    return;
  }
  if (e.request.method !== 'GET') return;

  /* Netz zuerst, damit Aktualisierungen sofort ankommen; Cache als Rueckfall. */
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    })['catch'](function () {
      return caches.match(e.request).then(function (treffer) {
        return treffer || caches.match('./index.html');
      });
    })
  );
});
