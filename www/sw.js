/* sw.js — Service Worker بسيط: يخزّن ملفات اللعبة للعمل بدون إنترنت (PWA) */
const VER = 'fcc-v2'; // ارفع الرقم عند إضافة/تغيير ملفات ليُحدَّث المخزَّن لدى المستخدمين
const FILES = [
  './', 'index.html', 'manifest.json', 'css/style.css', 'icons/icon.svg', 'js/util.js', 'js/data.js', 'js/save.js', 'js/players.js', 'js/league.js',
  'js/lineup.js', 'js/coach.js', 'js/match.js', 'js/live.js', 'js/moments.js', 'js/ucl.js', 'js/training.js', 'js/transfers.js', 'js/media.js',
  'js/season.js', 'js/sim.js', 'js/ui_core.js', 'js/audio.js', 'js/ui_fx.js', 'js/ui_charts.js', 'js/ui_card.js', 'js/ui_media.js', 'js/ui_guide.js',
  'js/ui_start.js', 'js/ui_home.js', 'js/ui_league.js', 'js/ui_match.js', 'js/ui_train.js', 'js/ui_market.js', 'js/ui_career.js', 'js/ui_sim.js',
  'js/main.js'
];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VER).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// الشبكة أولًا مع الرجوع للذاكرة المؤقتة (حتى تصل التحديثات عند توفر الإنترنت)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(VER).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
