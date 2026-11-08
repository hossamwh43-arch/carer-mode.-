/* ui_nav.js — الملاحة الرئيسية: خمسة تبويبات سفلية (الرئيسية · مسيرتي · المباريات · النادي · المزيد) وأقسام فرعية لكل تبويب،
   ثم المكوّنات المشتركة للواجهة السينمائية (غلاف اللاعب، حلقة النسبة، الحالة الفارغة) وشاشة «المزيد».
   عرض وتنقل فقط: لا يغيّر حالة اللعبة ولا يستهلك U.rnd، وكل المسارات القديمة (UI.screens.*) والأفعال (data-a) تعمل كما هي. */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];

  // ---------- المجموعات: كل تبويب سفلي له قسم افتراضي وأقسام فرعية (شريط علوي لاصق) ----------
  UI.GROUPS = {
    home: { ar: 'الرئيسية', ico: 'home', def: 'home', items: [['home', 'الرئيسية']] },
    me: { ar: 'مسيرتي', ico: 'user', def: 'profile', items: [['profile', 'ملفي'], ['career', 'السجل'], ['trophies', 'البطولات'], ['market', 'الانتقالات'], ['stats', 'الإنجازات'], ['bd', 'الجوائز']] },
    matches: { ar: 'المباريات', ico: 'pitch', def: 'matches', items: [['matches', 'المركز'], ['league', 'الدوري'], ['cup', 'الكأس'], ['ucl', 'الأبطال'], ['intl', 'المنتخبات']] },
    club: { ar: 'النادي', ico: 'club', def: 'club', items: [['club', 'النادي'], ['squad', 'التشكيلة'], ['train', 'التدريب']] },
    more: { ar: 'المزيد', ico: 'grid', def: 'more', items: [['more', 'المزيد'], ['press', 'الصحافة'], ['inbox', 'الرسائل'], ['settings', 'الإعدادات']] }
  };
  UI.GROUP_ORDER = ['home', 'me', 'matches', 'club', 'more'];
  const R2G = { match: 'matches', simreport: 'home' };
  UI.GROUP_ORDER.forEach((g) => UI.GROUPS[g].items.forEach((it) => { R2G[it[0]] = g; }));
  UI.groupOf = (route) => R2G[route] || 'home';
  // كل مسار داخل مجموعة لا يعرض زر الرجوع (التنقل الجانبي بالشريط العلوي)؛ الباقي (المباراة، تقرير المحاكاة) يعرضه
  UI.MAIN = Object.keys(R2G).filter((r) => r !== 'match' && r !== 'simreport');
  // بعد الاعتزال: مسارات السجل فقط
  UI.RETIRED_OK = ['career', 'stats', 'settings', 'profile', 'more', 'trophies'];
  UI.lastIn = {};

  UI.titles.profile = 'ملف اللاعب';
  UI.titles.matches = 'مركز المباريات';
  UI.titles.club = () => (G.S ? UI.cname(G.S.players[G.S.user].club) : 'النادي');
  UI.titles.squad = 'التشكيلة';
  UI.titles.more = 'المزيد';
  UI.titles.bd = 'الكرة الذهبية';
  UI.titles.intl = 'المنتخبات';
  UI.titles.press = 'الصحافة والأخبار';
  UI.titles.cup = 'الكأس والسوبر';
  UI.titles.trophies = 'سجل البطولات';

  const allowed = (r) => !(G.S && G.S.phase === 'retired') || UI.RETIRED_OK.indexOf(r) >= 0;

  // الشريط الفرعي (يظهر فقط للمجموعات ذات أكثر من قسم)
  UI.switcher = () => {
    const g = UI.GROUPS[UI.groupOf(UI.cur)];
    if (!g || g.items.length < 2) return '';
    const items = g.items.filter((it) => allowed(it[0]));
    if (items.length < 2) return '';
    const unread = G.Inbox ? G.Inbox.unread() : 0;
    return '<nav class="sw" aria-label="أقسام ' + g.ar + '">' + items.map((it) =>
      '<button class="' + (it[0] === UI.cur ? 'on' : '') + '" data-a="go" data-v="' + it[0] + '"' + (it[0] === UI.cur ? ' aria-current="page"' : '') + '>' + it[1] +
      (it[0] === 'inbox' && unread ? '<i class="sw-n">' + unread + '</i>' : '') + '</button>').join('') + '</nav>';
  };

  // مزامنة الشريط السفلي: التبويب النشط + نقاط التنبيه (مباراة تنتظر، رسائل غير مقروءة، مؤتمر صحفي)
  UI.navSync = () => {
    const S = G.S, g = UI.groupOf(UI.cur), retired = S && S.phase === 'retired';
    document.querySelectorAll('#bottomnav button').forEach((b) => {
      b.classList.toggle('on', b.dataset.g === g);
      b.classList.toggle('hidden', !!retired && (b.dataset.g === 'matches' || b.dataset.g === 'club'));
    });
    let md = false, mo = false;
    try { md = !!(S && S.phase === 'season' && (S.active || G.Season.pending())); } catch (e) { /* زينة */ }
    try { mo = !!((G.Inbox && G.Inbox.unread()) || (G.Media && G.Media.pending())); } catch (e) { /* زينة */ }
    // شعار النادي في الشريط العلوي (يُستبدل بزر الرجوع داخل الصفحات الفرعية)
    const tc = document.getElementById('tbCrest'), bb = document.getElementById('backBtn');
    if (tc && S) { try { const cid = S.players[S.user].club; if (tc.dataset.c !== cid) { tc.dataset.c = cid; tc.innerHTML = UI.badge(cid, 32); } } catch (e) { /* زينة */ } tc.classList.toggle('hidden', !!bb && !bb.classList.contains('hidden')); }
    const a = document.getElementById('matchDot'), b2 = document.getElementById('moreDot');
    if (a) a.classList.toggle('hidden', !md);
    if (b2) b2.classList.toggle('hidden', !mo);
  };

  // الضغط على تبويب سفلي يفتح قسمه الافتراضي دائمًا (المباريات ← المركز، مسيرتي ← ملفي ...) فيبقى السلوك متوقعًا
  UI.on('goGroup', (g) => {
    const def = UI.GROUPS[g];
    if (!def) return false;
    UI.cur = def.def;
    window.scrollTo(0, 0);
  });
  // انتقال إلى قسم + تبويب داخلي في خطوة واحدة (v = المسار، v2 = «مفتاح:قيمة»)
  UI.on('goSub', (v, v2) => {
    const q = String(v2 || '').split(':');
    UI.cur = v; if (q[0]) UI.sub[q[0]] = q[1]; window.scrollTo(0, 0);
  });

  // ---------- مكوّنات مشتركة ----------
  // حالة فارغة موحّدة: أيقونة + عنوان + شرح + زر اختياري
  UI.empty = (ic, title, sub, btn) => '<div class="card empty-st"><div class="es-ic">' + UI.ico(ic) + '</div><h3>' + title + '</h3>' + (sub ? '<p class="sm mut">' + sub + '</p>' : '') + (btn || '') + '</div>';

  // حلقة نسبة متحرّكة (تُرسم بالحركة عند دخول الشاشة)
  UI.ring = (frac, big, small, size, cls) => {
    size = size || 64;
    const r = 26, len = 2 * Math.PI * r, off = len * (1 - U.clamp(frac, 0, 1));
    return '<div class="ring ' + (cls || '') + '" style="width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="rg-bg" cx="32" cy="32" r="' + r + '"/>' +
      '<circle class="rg-fg" cx="32" cy="32" r="' + r + '" style="stroke-dasharray:' + len.toFixed(1) + ';stroke-dashoffset:' + off.toFixed(1) + ';--len:' + len.toFixed(1) + '"/></svg><b' + (String(big).length > 3 ? ' class="l"' : '') + '>' + big + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</div>';
  };

  // غلاف سينمائي للاعب: خلفية ملعب ليلي بلون النادي + بورتريه كبير + التقييم والاسم والنادي
  // opt.chips: وسوم زجاجية أسفل الغلاف · opt.act: زر صغير أعلى الغلاف · opt.extra: html بعد سطر النادي · opt.big: بورتريه أكبر
  UI.cinePlayer = (p, opt) => {
    opt = opt || {};
    const club = G.S.clubs[p.club], tc = UI.tierCls(p);
    const chips = (opt.chips || []).filter(Boolean).map((c) => '<span class="hchip">' + c + '</span>').join('');
    return '<section class="cine ' + tc + (opt.big ? ' big' : '') + '"><div class="cine-top"><div class="cine-ovr"><b class="ovr ' + tc + '">' + p.ovr + '</b><small>' + p.pos + '</small></div>' +
      '<div class="cine-kick">' + (UI.natBadge(p.nat, 18) || '') + '<span>منتخب ' + esc(UI.natName(p.nat)) + '</span></div>' + (opt.act ? '<div class="cine-act">' + opt.act + '</div>' : '') + '</div>' +
      '<div class="cine-body"><div class="cine-art">' + UI.avatar(p.look, p.club, opt.big ? 210 : 176) + '</div><div class="cine-in">' +
      '<h1 class="cine-name">' + esc(p.n) + '</h1><div class="cine-sub">' + G.POS_AR[p.pos] + ' · ' + p.age + ' سنة · رقم ' + p.num + '</div>' +
      '<div class="cine-club">' + UI.badge(p.club, 22) + '<span>' + esc(club ? club.name : '') + '</span></div>' + (opt.extra || '') + '</div></div>' +
      (chips ? '<div class="cine-chips">' + chips + '</div>' : '') + '</section>';
  };

  // غلاف النادي (شعار كبير بدل البورتريه)
  UI.cineClub = (clubId, title, sub, chips) => {
    const c = G.S.clubs[clubId];
    return '<section class="cine is-club"><div class="cine-top"><div class="cine-kick"><span>' + esc(sub || '') + '</span></div></div><div class="cine-body"><div class="cine-art crest">' + UI.badge(clubId, 150) + '</div><div class="cine-in">' +
      '<h1 class="cine-name">' + esc(title || (c ? c.name : '')) + '</h1></div></div>' + ((chips || []).filter(Boolean).length ? '<div class="cine-chips">' + chips.filter(Boolean).map((x) => '<span class="hchip">' + x + '</span>').join('') + '</div>' : '') + '</section>';
  };

  // ---------- المزيد ----------
  function tile(route, ico, title, sub, badge, act) {
    return '<button class="tile" data-a="' + (act || 'go') + '"' + (route ? ' data-v="' + route + '"' : '') + '><span class="tl-ic">' + UI.ico(ico) + '</span><span class="tl-t"><b>' + title + '</b><small>' + sub + '</small></span>' + (badge ? '<i class="tl-n">' + badge + '</i>' : '') + '</button>';
  }
  UI.tile = tile;
  UI.screens.more = () => {
    const S = G.S, retired = S.phase === 'retired', unread = G.Inbox ? G.Inbox.unread() : 0;
    let pr = null; try { pr = G.Media && G.Media.pending(); } catch (e) { /* لا شيء */ }
    const tiles = [];
    if (!retired) {
      tiles.push(tile('inbox', 'mail', 'الرسائل', unread ? unread + ' غير مقروءة' : 'العروض والإشعارات', unread));
      tiles.push(tile('press', 'mic', 'الصحافة والأخبار', pr ? 'مؤتمر صحفي ينتظرك' : 'أخبار وشعبية', pr ? '!' : ''));
      tiles.push(tile('intl', 'globe', 'المنتخبات', S.intl ? esc(S.intl.name) : 'كأس العالم وآسيا'));
      tiles.push(tile('league', 'podium', 'المسابقات', 'الدوري ودوري الأبطال'));
      tiles.push(tile('cup', 'shield', 'الكأس والسوبر', 'القرعة والنتائج والأبطال'));
      tiles.push(tile('bd', 'crown', 'الكرة الذهبية', 'ترتيب المرشحين'));
    }
    tiles.push(tile('trophies', 'trophy', 'سجل البطولات', 'ألقابك ووصافاتك موسمًا بموسم'));
    tiles.push(tile('stats', 'chart', 'الإحصائيات', 'الموسم والإنجازات والسجل'));
    tiles.push(tile('career', 'book', 'سجل المسيرة', 'موسمًا بموسم'));
    if (!retired && S.simReport) tiles.push(tile('simreport', 'ffwd', 'تقرير المحاكاة', 'آخر تقرير'));
    tiles.push(tile('', 'bulb', 'دليل اللعبة', 'شرح مختصر', '', 'tourOpen'));
    tiles.push(tile('settings', 'gear', 'الإعدادات والحفظ', 'الصوت · التصدير · الصعوبة'));
    return '<div class="tiles">' + tiles.join('') + '</div>' +
      '<div class="card more-foot"><div class="row sb"><span class="sm mut">آخر حفظ</span><span class="sm">' + (S.savedAt ? new Date(S.savedAt).toLocaleString('ar') : '—') + '</span></div>' +
      '<div class="row sb" style="margin-top:6px"><span class="sm mut">اللعبة</span><span class="sm">مسيرة لاعب · الإصدار 3.4</span></div></div>';
  };
})(window.G = window.G || {});
