/* sw.js — Service Worker بسيط: يخزّن ملفات اللعبة للعمل بدون إنترنت (PWA) */
const VER = 'fcc-v21'; // ارفع الرقم عند إضافة/تغيير ملفات ليُحدَّث المخزَّن لدى المستخدمين
const FILES = [
  './', 'index.html', 'manifest.json', 'css/style.css', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'css/fonts/barlow-700.woff',
  'css/fonts/barlow-800.woff', 'css/fonts/barlow-800i.woff', 'css/fonts/kufi.woff', 'css/fonts/plex-400.woff', 'css/fonts/plex-500.woff',
  'css/fonts/plex-700.woff', 'js/util.js', 'js/data.js', 'js/data_world.js', 'js/data_nations.js', 'js/data_players.js', 'js/save.js', 'js/players.js', 'js/league.js', 'js/world.js', 'js/cups.js', 'js/trophies.js', 'js/lineup.js', 'js/coach.js', 'js/match.js',
  'js/live.js', 'js/stadium_core.js', 'js/moments.js', 'js/ucl.js', 'js/intl.js', 'js/bd.js', 'js/press.js', 'js/training.js', 'js/growth.js', 'icons/logo.webp', 'icons/bg-stadium.svg', 'js/transfers.js', 'js/agent.js', 'js/media.js', 'js/season.js', 'js/sim.js', 'js/ui_core.js',
  'js/ui_icons.js', 'js/audio.js', 'js/ui_fx.js', 'js/ui_charts.js', 'js/ui_card.js', 'js/ui_media.js', 'js/ui_guide.js', 'js/ui_start.js',
  'js/ui_home.js', 'js/ui_league.js', 'js/ui_intl.js', 'js/ui_bd.js', 'js/ui_news.js', 'js/ui_stadium.js', 'js/ui_match.js', 'js/ui_train.js', 'js/ui_market.js', 'js/ui_agent.js', 'js/ui_career.js', 'js/ui_nav.js', 'js/ui_profile.js', 'js/ui_center.js', 'js/ui_trophy_art.js', 'js/ui_cups.js', 'js/ui_sim.js', 'js/main.js'
];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VER).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// الشبكة أولًا مع الرجوع للذاكرة المؤقتة (حتى تصل التحديثات عند توفر الإنترنت).
// v4: لا نخزّن إلا الاستجابات الناجحة من نفس الأصل (لا نُسمّم الذاكرة بصفحة 404)، ونتجاهل نص الاستعلام عند الرجوع
// للذاكرة، وأي تنقّل بلا إنترنت يعود لـindex.html المخزَّنة.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((r) => {
      if (r && r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(VER).then((c) => c.put(req, cp)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
