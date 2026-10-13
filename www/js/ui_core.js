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

  // ---------- التنقل والرسم ----------
  UI.go = (tab, keepScroll) => { UI.cur = tab; UI.render(); if (!keepScroll) window.scrollTo(0, 0); };
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
    UI.chrome(true);
    app.className = 'app' + (UI.cur === 'match' ? ' nobot' : '');
    $('#bottomnav').classList.toggle('hidden', UI.cur === 'match');
    $('#topTitle').textContent = UI.titles[UI.cur] || '';
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
    UI.sheet('<h3>القائمة</h3><button class="btn" data-a="menuGo" data-v="career">📖 مسيرتي</button><button class="btn" data-a="menuGo" data-v="stats">📊 الإحصائيات والإنجازات</button><button class="btn" data-a="menuGo" data-v="settings">⚙️ الإعدادات والحفظ</button><button class="btn" data-a="closeSheet">إغلاق</button>');
    return false;
  });
  UI.on('menuGo', (v) => { UI.closeSheet(); UI.cur = v; window.scrollTo(0, 0); });
})(window.G = window.G || {});
