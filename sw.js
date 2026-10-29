/* Service worker opsional: Ebook Wirid bisa dibuka offline setelah pernah dibuka sekali. */
const C = 'wirid-v3';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.add(new Request('./', { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter(k => k !== C);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    /* Ada versi lama? Muat ulang tab yang terbuka satu kali agar langsung memakai versi baru. */
    if (old.length) {
      const cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach(c => { try { c.navigate(c.url); } catch (_) {} });
    }
  })());
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    /* Halaman: jaringan dulu (maks. 4 detik) supaya pembaruan langsung terlihat; offline memakai salinan tersimpan. */
    e.respondWith((async () => {
      const c = await caches.open(C);
      try {
        const res = await Promise.race([fetch(r), new Promise((_, no) => setTimeout(() => no(0), 4000))]);
        if (res && res.ok) c.put('./', res.clone());
        return res;
      } catch (_) {
        return (await c.match('./')) || (await c.match(r, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }
  /* Berkas lain: salinan tersimpan dulu, diperbarui di latar belakang. */
  e.respondWith(caches.open(C).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || Response.error();
  }));
});
