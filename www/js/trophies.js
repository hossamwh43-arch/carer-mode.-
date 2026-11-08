/* trophies.js — سجل بطولات اللاعب: قائمة موحّدة بكل لقب (و«وصيف» النهائيات) مع الموسم والنادي والبطولة.
   السجل u.tlog = [{ s: موسم, k: مفتاح اللقب, r: 'w' لقب | 'f' وصيف, c: نادي اللاعب وقتها, x: معرّف الدوري/البلد أو السنة, y?: سنة البطولة }].
   العدّادات القديمة u.trophies تبقى كما هي (تُحدَّث من أماكنها)؛ هذا الملف يضيف السجل فقط ويرمّم الحفظ القديم من سجل المواسم. لا عشوائية هنا. */
(function (G) {
  'use strict';
  const P = (id) => G.S.players[id];
  const T = (G.Trophies = {});

  // مفتاح ← [رمز، اسم افتراضي]
  T.KEYS = { liga: ['🥇', 'الدوري'], d2: ['🥈', 'الدرجة الثانية'], cup: ['🏆', 'الكأس المحلية'], sup: ['🛡️', 'السوبر'], ucl: ['🌟', 'دوري أبطال أوروبا'], wc: ['🌍', 'كأس العالم'], ac: ['🏅', 'كأس آسيا'], bd: ['👑', 'الكرة الذهبية'] };
  T.ORDER = ['liga', 'd2', 'cup', 'sup', 'ucl', 'wc', 'ac', 'bd'];

  T.name = (e) => {
    switch (e.k) {
      case 'liga': case 'd2': return G.leagueName(e.x || 'ESP1');
      case 'cup': return G.cupName(e.x);
      case 'sup': return G.supName(e.x);
      case 'bd': return 'الكرة الذهبية';
      default: return (T.KEYS[e.k] || ['', e.k])[1];
    }
  };
  T.icon = (e) => (e.r === 'f' ? '🥈' : (T.KEYS[e.k] || ['🏆'])[0]);
  // عنوان الفترة: سنة البطولة لما يخص السنوات (المنتخبات/الكرة الذهبية)، وإلا الموسم
  T.when = (e) => (e.y ? String(e.y) : G.Season.label(e.s));

  const same = (a, b) => a.s === b.s && a.k === b.k && a.r === b.r && a.c === b.c && a.x === b.x && a.y === b.y;
  // يضيف إدخالًا (بلا تكرار). o: { r, c, x, y, s }
  T.add = (u, k, o) => {
    if (!u || !T.KEYS[k]) return false;
    o = o || {};
    const e = { s: o.s != null ? o.s : (G.S ? G.S.season : 0), k, r: o.r === 'f' ? 'f' : 'w' };
    if (o.c) e.c = o.c;
    if (o.x != null) e.x = o.x;
    if (o.y != null) e.y = o.y;
    u.tlog = u.tlog || [];
    if (u.tlog.some((q) => same(q, e))) return false;
    u.tlog.push(e);
    return true;
  };
  T.list = (u, res) => (u && u.tlog ? u.tlog.filter((e) => !res || e.r === res) : []);
  T.count = (u, k, res) => T.list(u, res || 'w').filter((e) => e.k === k).length;
  T.won = (u, season, k) => T.list(u, 'w').some((e) => e.s === season && e.k === k);
  T.total = (u) => T.list(u, 'w').length;

  // أحدث الألقاب أولًا (بالموسم ثم ترتيب الإضافة داخل الموسم)
  T.sorted = (u, res) => T.list(u, res).map((e, i) => ({ e, i })).sort((a, b) => (b.e.s - a.e.s) || (b.i - a.i)).map((o) => o.e);

  // ترميم الحفظ القديم: يبني السجل من صفوف المواسم والمنتخب والكرة الذهبية (يُنفَّذ مرة واحدة لكل لاعب)
  T.backfill = () => {
    const S = G.S, u = S && S.user ? P(S.user) : null;
    if (!u || u.tlog) return false;
    u.tlog = [];
    (u.car || []).forEach((r) => {
      const t = r.trophies || {};
      if (t.liga) T.add(u, 'liga', { s: r.season, c: r.club, x: r.lgId || 'ESP1' });
      if (t.d2) T.add(u, 'd2', { s: r.season, c: r.club, x: r.lgId });
      if (t.ucl) T.add(u, 'ucl', { s: r.season, c: r.club });
      else if (r.ucExit === 'final' && r.uc && r.uc.apps >= 3) T.add(u, 'ucl', { s: r.season, c: r.club, r: 'f' });
      if (!t.liga && !t.d2 && r.pos === 2 && r.lg && r.lg.apps >= 10 && !r.loan) T.add(u, G.LEAGUES[r.lgId] && G.LEAGUES[r.lgId].tier === 2 ? 'd2' : 'liga', { s: r.season, c: r.club, x: r.lgId || 'ESP1', r: 'f' });
    });
    (u.ntCar || []).forEach((e) => {
      const def = G.TOURS && G.TOURS[e.t], s = e.y - G.CONFIG.startYear;
      if (!def) return;
      if (e.title) T.add(u, def.key, { s, y: e.y });
      else if (e.res === 'final' && e.apps >= 2) T.add(u, def.key, { s, y: e.y, r: 'f' });
    });
    (u.bdCar || []).forEach((e) => { if (e.r === 1) T.add(u, 'bd', { s: e.y - G.CONFIG.startYear, y: e.y }); });
    return true;
  };
  G.migrations = G.migrations || [];
  G.migrations.push(T.backfill);
})(window.G = window.G || {});
