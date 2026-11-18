/* world_rank.js — تصنيف عالمي سنوي للأندية والمنتخبات (محرك فقط، بلا واجهة، بلا عشوائية).
   الفكرة الأصلية من حزمة «player_career_upgrade»؛ دُمجت هنا مع إصلاحات: فصل الواجهة (ui_worldrank.js)،
   رمز بطولة كأس العالم 'WC' (كان يُقارن بـ 'wc' فلا يُحتسب وزنه)، وأرشيف مضغوط لا يضخّم الحفظ.
   لا يستهلك U.rnd ولا يغيّر شيئًا في اللعبة: قراءة فقط ثم يكتب S.worldRankHistory (آخر 40 موسمًا). */
(function (G) {
  'use strict';
  const R = (G.WorldRank = {});
  const S = () => G.S;
  const KEEP = 50, MAX_SEASONS = 40;
  R.KEEP = KEEP; R.MAX_SEASONS = MAX_SEASONS;
  // أوزان النقاط — معلنة هنا ليراها من يريد ضبطها
  R.W = { clubRep: 12, clubPos: 180, clubForm: 140, clubTitle: 150, clubUcl: 220, nationLvl: 24, wcWin: 180, acWin: 95, runner: 18, third: 9 };

  const ensure = () => { const s = S(); if (!Array.isArray(s.worldRankHistory)) s.worldRankHistory = []; return s.worldRankHistory; };

  // ترتيب الأندية الحالي من السمعة + المركز المحلي + مردود النقاط + لقب الدوري + لقب دوري الأبطال
  R.buildClubs = () => {
    const s = S(), W = R.W, rows = [];
    const champs = (G.World && G.World.champions) ? G.World.champions() : {};
    const orderCache = {};
    Object.keys(s.clubs || {}).forEach((id) => {
      const c = s.clubs[id]; if (!c) return;
      const lg = c.lg || '';
      let played = 0, points = 0, pos = 0, size = 0;
      const L = lg && G.World ? G.World.leagueOf(lg) : null;
      if (L && L.table && L.table[id]) {
        const t = L.table[id]; played = t.p || 0; points = t.pts || 0;
        const order = orderCache[lg] || (orderCache[lg] = G.World.sortedOf(lg));
        pos = order.indexOf(id) + 1; size = order.length;
      }
      const title = champs[lg] === id, ucl = !!(s.ucl && s.ucl.winner === id);
      const posScore = pos && size ? Math.round((size - pos + 1) / size * W.clubPos) : 0;
      const formScore = played ? Math.round(points / (played * 3) * W.clubForm) : 0;
      const score = Math.round((c.rep || 50) * W.clubRep + posScore + formScore + (title ? W.clubTitle : 0) + (ucl ? W.clubUcl : 0));
      rows.push({ id, name: c.name || id, lg, pos, score, rep: c.rep || 50, title, ucl });
    });
    rows.sort((a, b) => b.score - a.score || b.rep - a.rep || (a.id < b.id ? -1 : 1));
    rows.forEach((x, i) => { x.rank = i + 1; });
    return rows;
  };

  // ترتيب المنتخبات: القوة الأساسية + انجراف القوة المسجّل + مكافآت البطولات المؤرشفة فعلًا فقط
  R.buildNations = () => {
    const s = S(), W = R.W, hist = ensure(), last = hist.length ? hist[hist.length - 1] : null;
    const prev = {};
    if (last && last.nations) last.nations.forEach((x) => { prev[x.i] = x.s; });
    let bonus = {};
    (s.intlHist || []).forEach((t) => {
      if (!t) return;
      if (t.winner) bonus[t.winner] = (bonus[t.winner] || 0) + (t.type === 'WC' ? W.wcWin : W.acWin);
      if (t.runner) bonus[t.runner] = (bonus[t.runner] || 0) + W.runner;
      if (t.third) bonus[t.third] = (bonus[t.third] || 0) + W.third;
    });
    const rows = (G.NATION_ORDER || []).map((id) => {
      const n = G.NATIONS[id] || {}, base = Number(n.lvl || 50), drift = Number((s.ntDrift || {})[id] || 0);
      const score = Math.round((base + drift) * W.nationLvl + (bonus[id] || 0));
      return { id, name: n.ar || id, conf: n.conf || '', base, score, change: prev[id] == null ? null : score - prev[id] };
    });
    rows.sort((a, b) => b.score - a.score || b.base - a.base || (a.id < b.id ? -1 : 1));
    rows.forEach((x, i) => { x.rank = i + 1; });
    return rows;
  };

  // أرشفة مضغوطة (معرّف + نقاط + مركز) لأفضل KEEP من كل قائمة؛ الأسماء تُستعاد من اللعبة عند العرض
  R.archive = (year, season) => {
    const s = S(), hist = ensure();
    const clubs = R.buildClubs().slice(0, KEEP).map((x) => ({ i: x.id, s: x.score, p: x.pos }));
    const nations = R.buildNations().slice(0, KEEP).map((x) => ({ i: x.id, s: x.score, c: x.change }));
    const rec = { y: Number(year || s.year || 1), n: Number(season || s.season || 1), clubs, nations };
    const at = hist.findIndex((x) => x.n === rec.n);
    if (at >= 0) hist[at] = rec; else hist.push(rec);
    hist.sort((a, b) => a.n - b.n);
    if (hist.length > MAX_SEASONS) hist.splice(0, hist.length - MAX_SEASONS);
    return rec;
  };

  // يعيد سجلًا مؤرشفًا إلى صفوف جاهزة للعرض (الاسم والدوري من اللعبة)
  R.rowsOf = (rec, kind) => {
    const s = S();
    if (kind === 'nations') {
      return rec.nations.map((x, i) => { const n = G.NATIONS[x.i] || {}; return { rank: i + 1, id: x.i, name: n.ar || x.i, conf: n.conf || '', score: x.s, change: x.c == null ? null : x.c }; });
    }
    return rec.clubs.map((x, i) => { const c = s.clubs[x.i] || {}; return { rank: i + 1, id: x.i, name: c.name || x.i, lg: c.lg || '', pos: x.p || 0, score: x.s }; });
  };

  R.history = () => ensure();
  G.migrations = G.migrations || [];
  G.migrations.push(() => { if (G.S) ensure(); });
})(window.G = window.G || {});
