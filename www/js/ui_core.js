/* ui_core.js — البنية الأساسية للواجهة: الرسم، الأحداث، النوافذ، الشارات والصور الرمزية */
(function (G) {
  'use strict';
  const U = G.U;
  const UI = (G.UI = { cur: 'home', sub: {}, acts: {}, ins: {}, screens: {}, titles: {} });
  const $ = (s) => document.querySelector(s);

  UI.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.P = (id) => G.S.players[id];
  UI.C = (id) => G.S.clubs[id];
  UI.cname = (id) => (G.S.clubs[id] ? G.S.clubs[id].name : '—');
  UI.user = () => G.S.players[G.S.user];
  UI.money = U.money;
  UI.num = (v, d) => (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0);

  UI.titles = { home: 'الرئيسية', league: 'الدوري الإسباني', ucl: 'دوري أبطال أوروبا', train: 'التدريب والمدرب', market: 'سوق الانتقالات', inbox: 'الرسائل', career: 'مسيرتي', stats: 'الإحصائيات والإنجازات', match: 'المباراة', settings: 'الإعدادات' };

  // ---------- الأدوات المرئية ----------
  const lum = (hex) => { const h = hex.replace('#', ''); const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  UI.abbr = (name) => { const w = name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 3)).toUpperCase(); };
  UI.badge = (id, size) => {
    const c = G.S.clubs[id]; size = size || 28;
    if (!c) return '';
    const c0 = c.c[0], c1 = c.c[1], tx = lum(c0) > 0.6 ? '#111' : '#fff';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 L36 8 V20 C36 30 28 36 20 39 C12 36 4 30 4 20 V8 Z" fill="' + c0 + '" stroke="' + c1 + '" stroke-width="2.4"/><path d="M20 2 L36 8 V20 C36 30 28 36 20 39 Z" fill="' + c1 + '" opacity=".55"/><text x="20" y="25" text-anchor="middle" font-size="12" font-weight="800" fill="' + tx + '" font-family="Arial,sans-serif">' + UI.abbr(c.name).slice(0, 3) + '</text></svg>';
  };
  UI.clubTag = (id, size) => '<span class="club">' + UI.badge(id, size || 22) + '<span>' + UI.esc(UI.cname(id)) + '</span></span>';

  UI.avatar = (look, clubId, size) => {
    look = look || {}; size = size || 72;
    const skin = G.LOOK.skin[look.skin || 0], hair = G.LOOK.hair[look.hair || 0], st = look.style || 0;
    const c = clubId && G.S && G.S.clubs[clubId] ? G.S.clubs[clubId].c : ['#22c55e', '#0f5132'];
    const hairSvg = [
      '<path d="M30 40 Q32 20 50 20 Q68 20 70 40 Q62 30 50 30 Q38 30 30 40Z" fill="' + hair + '"/>',
      '<g fill="' + hair + '"><circle cx="34" cy="30" r="8"/><circle cx="44" cy="23" r="9"/><circle cx="56" cy="23" r="9"/><circle cx="66" cy="30" r="8"/></g>',
      '<path d="M28 44 Q28 18 50 18 Q72 18 72 44 L72 62 L66 50 Q62 30 50 30 Q38 30 34 50 L28 62Z" fill="' + hair + '"/>',
      '',
      '<path d="M30 40 Q32 20 50 20 Q68 20 70 40 Q62 30 50 30 Q38 30 30 40Z" fill="' + hair + '"/><circle cx="74" cy="34" r="6" fill="' + hair + '"/>',
      '<path d="M44 20 Q50 12 56 20 L56 32 L44 32Z" fill="' + hair + '"/>'
    ][st] || '';
    return '<svg class="avatar" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" aria-hidden="true"><path d="M12 100 Q14 70 50 66 Q86 70 88 100Z" fill="' + c[0] + '"/><path d="M40 68 L50 80 L60 68" fill="none" stroke="' + c[1] + '" stroke-width="5" stroke-linejoin="round"/><rect x="43" y="52" width="14" height="16" rx="5" fill="' + skin + '"/><ellipse cx="50" cy="40" rx="21" ry="24" fill="' + skin + '"/>' + hairSvg + '<circle cx="42" cy="42" r="2.3" fill="#1a1a1a"/><circle cx="58" cy="42" r="2.3" fill="#1a1a1a"/><path d="M43 53 Q50 58 57 53" fill="none" stroke="#7a3b2e" stroke-width="2" stroke-linecap="round"/></svg>';
  };

  UI.stars = (pot) => { const n = U.clamp(Math.round((pot - 62) / 6), 1, 5); return '<span class="stars">' + '★'.repeat(n) + '<span class="mut">' + '☆'.repeat(5 - n) + '</span></span>'; };
  UI.ratingCls = (r) => (r >= 7 ? '' : r >= 6.2 ? 'mid' : 'low');
  UI.rating = (r) => (r == null ? '<span class="mut">—</span>' : '<span class="rating ' + UI.ratingCls(r) + '">' + Number(r).toFixed(1) + '</span>');
  UI.rolePill = (role) => { const m = { starter: 'g', rotation: 'y', bench: 'b', out: 'r', injured: 'r', suspended: 'r' }; return '<span class="pill ' + (m[role] || '') + '">' + (G.Coach.ROLE_AR[role] || role) + '</span>'; };
  UI.bar = (pct, cls) => '<div class="bar ' + (cls || '') + '"><i style="width:' + U.clamp(pct, 0, 100) + '%"></i></div>';
  UI.formDots = (form) => (form && form.length ? form.slice(-5).map((r) => '<span class="rating ' + UI.ratingCls(r) + '" style="min-width:34px;height:26px;font-size:12px">' + r.toFixed(1) + '</span>').join(' ') : '<span class="mut sm">لا مباريات بعد</span>');
  UI.week = () => 'الأسبوع ' + G.S.week + ' / 39';

  // ---------- النوافذ والرسائل ----------
  UI.toast = (msg, ms) => {
    const t = $('#toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(UI._tt);
    UI._tt = setTimeout(() => t.classList.add('hidden'), ms || 2600);
  };
  UI.sheet = (html) => { $('#sheet').innerHTML = html; $('#sheetWrap').classList.remove('hidden'); };
  UI.closeSheet = () => { $('#sheetWrap').classList.add('hidden'); $('#sheet').innerHTML = ''; UI._sheetFn = null; };
  UI.sheetRender = (fn) => { UI._sheetFn = fn; UI.sheet(fn()); };
  UI.confirm = (title, text, onYes, yesLabel) => {
    UI._yes = onYes;
    UI.sheet('<h3>' + UI.esc(title) + '</h3><p class="mut">' + text + '</p><button class="btn pri" data-a="yes">' + (yesLabel || 'تأكيد') + '</button><button class="btn" data-a="closeSheet">إلغاء</button>');
  };

  // ---------- تفضيلات الجهاز (لا تُحفظ مع المسيرة، تبقى حتى لو بدأتَ مسيرة جديدة) ----------
  const PREF_KEY = 'fcc_prefs_v1';
  UI.prefs = { sound: true, haptics: true, simAutoDP: false, simRest: true, simStop: { offers: true, window: true, injury: true, key: true, dp: false, role: false, press: false } };
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) { const p = JSON.parse(raw); Object.keys(p).forEach((k) => { if (k === 'simStop') Object.assign(UI.prefs.simStop, p.simStop || {}); else UI.prefs[k] = p[k]; }); }
  } catch (e) { /* التخزين غير متاح: نبقى على الافتراضي */ }
  UI.savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(UI.prefs)); } catch (e) { /* لا شيء */ } };

  // ---------- التنقل والرسم ----------
  UI.go = (tab, keepScroll) => { UI.cur = tab; UI.render(); if (!keepScroll) window.scrollTo(0, 0); };

  // سجل الشاشات لزر الرجوع: مسار بلا تكرار يُحدَّث تلقائيًا من UI.render عند تغيّر UI.cur أيًّا كان مصدر التغيير.
  // العودة إلى شاشة موجودة في المسار تقطعه عندها (الرئيسية → الدوري → التدريب → الدوري ⇒ المسار: [الرئيسية]).
  UI.MAIN = ['home', 'league', 'ucl', 'train', 'market'];
  UI.stack = [];
  UI._last = null;
  UI._back = false;
  UI._track = () => {
    const c = UI.cur;
    if (UI._last && UI._last !== c && !UI._back && UI._last !== 'match' && UI.stack.indexOf(UI._last) < 0) UI.stack.push(UI._last);
    UI._back = false;
    UI._last = c;
    const j = UI.stack.lastIndexOf(c);
    if (j >= 0) UI.stack.length = j;
    if (UI.stack.length > 10) UI.stack.shift();
  };
  // رجوع خطوة واحدة في المسار؛ تُرجع false إن لم يكن هناك ما يُرجَع إليه
  UI.goBack = () => {
    const S = G.S;
    let prev = null;
    while (UI.stack.length) {
      const c = UI.stack.pop();
      if (c === UI.cur || !UI.screens[c]) continue;
      if (S && S.phase === 'retired' && ['career', 'stats', 'settings'].indexOf(c) < 0) continue;
      prev = c; break;
    }
    if (!prev) return false;
    UI._back = true; UI.cur = prev; UI.render(); window.scrollTo(0, 0);
    return true;
  };

  // ---------- معالجة زر الرجوع (أندرويد/المتصفح) ----------
  // وحدات أخرى (المحاكاة مثلًا) تسجّل هنا دوال تُستشار أولًا؛ تُرجع true إن عالجت الضغطة.
  UI.backHooks = [];
  UI._exitAt = 0;
  const nativeApp = () => { try { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.App ? c.Plugins.App : null; } catch (e) { return null; } };
  const rootExit = () => {
    const now = Date.now();
    if (now - UI._exitAt < 2200) {
      UI._exitAt = 0;
      const app = nativeApp();
      if (app && app.exitApp) { try { app.exitApp(); } catch (e) { /* لا شيء */ } }
      return 'exit';
    }
    UI._exitAt = now;
    UI.toast('اضغط «رجوع» مرة أخرى للخروج (تقدّمك محفوظ)', 2000);
    return 'hint';
  };
  UI.onBack = () => {
    for (const h of UI.backHooks) { if (h()) return 'hook'; }
    const wrap = $('#sheetWrap');
    if (wrap && !wrap.classList.contains('hidden')) {
      UI.closeSheet();
      if (UI.mv && UI.mv.phase === 'live' && UI.mv.paused && UI.mv.autoPaused) { UI.mv.paused = false; UI.mv.autoPaused = false; if (UI.mvRepaint) UI.mvRepaint(); }
      return 'sheet';
    }
    const S = G.S;
    if (!S) {
      if (UI.wz) { if (UI.wz.step > 1) UI.wz.step--; else UI.wz = null; UI.render(); window.scrollTo(0, 0); return 'wizard'; }
      return rootExit();
    }
    if (UI.cur === 'match') {
      if (UI.mv && UI.mv.phase === 'live') {
        UI.mv.autoPaused = !UI.mv.paused; UI.mv.paused = true;
        UI.sheet('<h3>الخروج من المباراة؟</h3><p class="mut">تُحفظ المباراة كما هي ويمكنك استئنافها من الصفحة الرئيسية في أي وقت.</p><button class="btn pri" data-a="backStay">▶ متابعة اللعب</button><button class="btn red" data-a="backLeave">🏠 خروج</button>');
      } else { UI.mv = null; UI.cur = 'home'; UI.render(); window.scrollTo(0, 0); }
      return 'match';
    }
    if (UI.goBack()) return 'back';
    if (UI.cur !== 'home' && S.phase !== 'retired') { UI.cur = 'home'; UI.render(); window.scrollTo(0, 0); return 'home'; }
    return rootExit();
  };
  UI.initBack = () => {
    if (UI._backInit) return;
    UI._backInit = true;
    const app = nativeApp();
    if (app && app.addListener) { // تطبيق أندرويد (Capacitor): نمسك زر الرجوع بدل الخروج المباشر
      try { app.addListener('backButton', () => { G.safe(UI.onBack, 'back'); }); UI.nativeBack = true; } catch (e) { /* يبقى السلوك الافتراضي */ }
      return;
    }
    try { if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return; } catch (e) { /* لا شيء */ }
    // متصفح عادي: حارس للتاريخ حتى يعمل زر الرجوع داخل اللعبة بدل مغادرة الصفحة مباشرة
    try {
      if (!(history.state && history.state.g === 1)) { history.replaceState({ g: 0 }, ''); history.pushState({ g: 1 }, ''); }
      window.addEventListener('popstate', () => {
        const r = G.safe(UI.onBack, 'back');
        if (r === 'exit') { try { history.go(-1); } catch (e) { /* لا شيء */ } }
        else { try { history.pushState({ g: 1 }, ''); } catch (e) { /* لا شيء */ } }
      });
    } catch (e) { /* التاريخ غير متاح */ }
  };
  UI.tabs = (key, items, def) => {
    const cur = UI.sub[key] || def || items[0][0];
    return '<div class="tabs">' + items.map((it) => '<button class="tab ' + (cur === it[0] ? 'on' : '') + '" data-a="tab" data-v="' + key + '" data-v2="' + it[0] + '">' + it[1] + '</button>').join('') + '</div>';
  };
  UI.curTab = (key, def) => UI.sub[key] || def;

  UI.render = () => {
    const S = G.S, app = $('#app');
    const boot = $('#boot'); if (boot) boot.remove();
    if (!S) { UI.chrome(false); app.className = 'app nonav'; app.innerHTML = G.safe(() => UI.screens.start(), 'start') || ''; return; }
    if (S.phase === 'retired' && UI.cur !== 'career' && UI.cur !== 'stats' && UI.cur !== 'settings') UI.cur = 'career';
    UI._track();
    try { document.documentElement.style.setProperty('--cc', UI.clubAccent ? UI.clubAccent(S.players[S.user].club) : '#22c55e'); } catch (e) { /* لون النادي زينة فقط */ }
    if (UI.cur !== 'match' && G.Audio && G.Audio.crowdSrc) G.Audio.crowd(false); // أمان: لا ضجيج ملعب خارج شاشة المباراة
    UI.chrome(true);
    app.className = 'app' + (UI.cur === 'match' ? ' nobot' : '');
    $('#bottomnav').classList.toggle('hidden', UI.cur === 'match');
    $('#topTitle').textContent = UI.titles[UI.cur] || '';
    const bb = $('#backBtn');
    if (bb) bb.classList.toggle('hidden', !(UI.MAIN.indexOf(UI.cur) < 0 && UI.cur !== 'match' && (UI.stack.length > 0 || S.phase !== 'retired')));
    document.querySelectorAll('#bottomnav button').forEach((b) => b.classList.toggle('on', b.dataset.v === UI.cur));
    const ub = G.Inbox.unread(), bd = $('#inboxBadge');
    bd.textContent = ub; bd.classList.toggle('hidden', !ub);
    const scr = UI.screens[UI.cur] || UI.screens.home;
    let html = G.safe(scr, 'render:' + UI.cur);
    if (html == null) html = '<div class="card notice bad">حدث خطأ أثناء عرض هذه الصفحة. بياناتك محفوظة. ' + UI.esc(G.lastError ? G.lastError.msg : '') + '</div><button class="btn" data-a="go" data-v="home">العودة للرئيسية</button>';
    app.innerHTML = html;
    if (UI._sheetFn && !$('#sheetWrap').classList.contains('hidden')) $('#sheet').innerHTML = UI._sheetFn();
    if (UI.after) { const f = UI.after; UI.after = null; f(); }
  };
  UI.chrome = (on) => { $('#topbar').classList.toggle('hidden', !on); if (!on) $('#bottomnav').classList.add('hidden'); };

  // ---------- الأحداث ----------
  UI.on = (name, fn) => { UI.acts[name] = fn; };
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el) return;
    const fn = UI.acts[el.dataset.a];
    if (!fn) return;
    const r = G.safe(() => fn(el.dataset.v, el.dataset.v2, el), 'act:' + el.dataset.a);
    if (r !== false) UI.render();
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-in]');
    if (!el) return;
    const fn = UI.ins[el.dataset.in];
    if (fn) G.safe(() => fn(el.value, el), 'in:' + el.dataset.in);
  });
  UI.on('go', (v) => { UI.cur = v; window.scrollTo(0, 0); });
  UI.on('tab', (k, v) => { UI.sub[k] = v; });
  UI.on('closeSheet', () => { UI.closeSheet(); return false; });
  UI.on('yes', () => { const f = UI._yes; UI._yes = null; UI.closeSheet(); if (f) f(); });
  UI.on('menu', () => {
    UI.sheet('<h3>القائمة</h3><button class="btn" data-a="menuGo" data-v="career">📖 مسيرتي</button><button class="btn" data-a="menuGo" data-v="stats">📊 الإحصائيات والإنجازات</button><button class="btn" data-a="menuGo" data-v="settings">⚙️ الإعدادات والحفظ</button><button class="btn" data-a="tourOpen">📘 دليل اللعبة</button><button class="btn" data-a="closeSheet">إغلاق</button>');
    return false;
  });
  UI.on('menuGo', (v) => { UI.closeSheet(); UI.cur = v; window.scrollTo(0, 0); });
  // أفعال الرجوع (تُسجَّل هنا لأن UI.on تُعرَّف أعلاه)
  UI.on('backStay', () => { UI.closeSheet(); if (UI.mv) { UI.mv.paused = false; UI.mv.autoPaused = false; } if (UI.mvRepaint) UI.mvRepaint(); return false; });
  UI.on('backLeave', () => { UI.closeSheet(); if (UI.acts.mvLeave) return UI.acts.mvLeave(); });
  UI.on('goBack', () => { if (UI.goBack()) return false; UI.cur = 'home'; window.scrollTo(0, 0); });
})(window.G = window.G || {});
