/* world_rank.js — تصنيف عالمي سنوي للأندية والمنتخبات (محرك فقط، بلا واجهة، بلا عشوائية).
   الفكرة الأصلية من حزمة «player_career_upgrade»؛ دُمجت هنا مع إصلاحات: فصل الواجهة (ui_worldrank.js)،
   رمز بطولة كأس العالم 'WC' (كان يُقارن بـ 'wc' فلا يُحتسب وزنه)، وأرشيف مضغوط لا يضخّم الحفظ.
   لا يستهلك U.rnd ولا يغيّر شيئًا في اللعبة: قراءة فقط ثم يكتب S.worldRankHistory (آخر 40 موسمًا).
   Build 28: تصنيف الأندية بنوافذ زمنية (آخر 1/5/10/50/100 سنة). يُسجَّل لكل موسم منتهٍ نقاط كل ناديه (S.crk.seasons، آخر 100 موسم)،
   وتُكمَّل النافذة بما قبل بداية اللعبة بتقدير تاريخي حتمي (بلا عشوائية) من سمعة النادي الابتدائية + «إرث» الأندية العريقة + موجات عهود؛
   والتقدير مُعلَن في الواجهة ويُستبدل بنتيجة حقيقية كلما أكمل اللاعب موسمًا. لا ألقاب مختلَقة: الألقاب المعروضة من مواسمك الفعلية فقط. */
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
    R.recordSeason(rec.y, rec.n); // Build 28: نقاط الموسم لكل نادٍ لنوافذ 1/5/10/50/100
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


  // ================= Build 28: نوافذ التصنيف (1 / 5 / 10 / 50 / 100 سنة) =================
  R.WINDOWS = [1, 5, 10, 50, 100];
  R.MAX_CRK = 100;
  // نقاط الموسم الواحد: أداء الدوري المحلي (مركز + لقب) × معامل قوة الدوري + مرحلة دوري الأبطال
  R.SP = { pos: 100, title: 40, ucl: { winner: 120, final: 90, sf: 68, qf: 48, r16: 34, po: 20, league: 12 }, tier2: 0.3, ext: 0.55, lgCoef: { ESP1: 1, ENG1: 1, ITA1: 0.92, GER1: 0.9, FRA1: 0.8 } };
  // نقاط محلية تقديرية للأندية التي لا دوري محلي لها في اللعبة (سبورتينغ، بنفيكا، أياكس…): من السمعة فقط
  const extDom = (rep) => Math.max(8, Math.min(90, (rep - 55) * 3.2));
  // إرث تاريخي (فرق عن سمعة اليوم): الأندية العريقة أعلى من سمعتها الحالية والمموَّلة حديثًا أدنى — تقدير لا سجلّ رسمي
  R.LEGACY = { rma: 6, fcb: 4, bay: 5, juv: 8, mil: 9, int: 6, mun: 7, liv: 5, ars: 3, aja: 9, ben: 7, por: 5, mci: -6, psg: -9, new: -2, rbl: -14, hof: -12, wob: -5, bri: -8, bou: -9, bre: -8, ful: -5, com: -8, cry: -4, tot: -2, che: 0, nap: 1, ath: 3, avl: 3, nfo: 4, eve: 5, lee: 3, sev: 1, val: 2, atm: 0, lyo: 2, mar: 4, mon: 0, sun: 3, whu: 0, bvb: 1, bmg: 3, ham: 5, stu: 2, sge: 0, cel: 6, clt: 6, fey: 4, psv: 3, spo: 3, gal: 0, fen: 0, oly: 2, sha: 0, clb: 2, sal: -8, cop: -2, b04: -8, ata: -10, vil: -6, gir: -8, rso: -3, bet: -3, lil: -2, fre: -4, ren: -2, bol: 2, tor: 4, laz: 2, fio: 2, rom: 1 };

  const hash01 = (str) => { // FNV-1a → [0,1): ثابت تمامًا، لا عشوائية
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };
  const crk = () => {
    const s = S();
    if (!s.crk || typeof s.crk !== 'object') s.crk = { v: 1, y0: s.year || 2025, base: {}, seasons: [] };
    if (!s.crk.y0) s.crk.y0 = s.year || 2025;
    if (!s.crk.base) s.crk.base = {};
    if (!Array.isArray(s.crk.seasons)) s.crk.seasons = [];
    const b = s.crk.base;
    Object.keys(s.clubs || {}).forEach((id) => { if (b[id] == null) b[id] = s.clubs[id].rep || 50; }); // سمعة البداية (ثابتة بعد أول تسجيل)
    return s.crk;
  };
  R.init = () => { if (S() && S().clubs) crk(); };

  // سمعة النادي «التاريخية» في سنة معيّنة: ابتدائية + إرث + موجة عهد بطيئة (خاصة بكل نادٍ) + تذبذب سنوي صغير
  R.stature = (id, year) => {
    const base = crk().base[id] != null ? crk().base[id] : 60;
    const ph = hash01(id + '#ph') * 6.2832, per = 28 + hash01(id + '#per') * 30;
    const era = 6 * Math.sin(ph + year * 6.2832 / per);
    const wob = (hash01(id + '|' + year) - 0.5) * 6;
    // الإرث يتلاشى للسنوات الأخيرة (آخر 5 سنوات = سمعة اليوم فقط، ويكتمل قبل ~40 سنة) فيبقى تصنيف 5/10 سنوات قريبًا من الواقع الحديث
    const ago = crk().y0 - year, w = Math.max(0, Math.min(1, (ago - 5) / 35));
    return Math.max(35, Math.min(97, base + (R.LEGACY[id] || 0) * w + era * (0.5 + 0.5 * w) + wob));
  };
  // نقاط موسم تقديرية لمستوى سمعة h (جدول معاير على محاكاة اللعبة نفسها؛ يُقرأ بالاستيفاء الخطي)
  R.EST = [[40, 0], [48, 2], [54, 11], [60, 17], [66, 27], [72, 43], [78, 57], [84, 87], [90, 113], [96, 124]]; // متوسط نقاط الموسم الفعلية في المحاكاة (8 مواسم × بذرتين) لكل مستوى سمعة
  R.estPts = (h) => {
    const T = R.EST;
    if (h <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) if (h <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]); }
    return T[T.length - 1][1];
  };

  // نقاط ناديٍ في الموسم الجاري المنتهي (تُسجَّل عند الأرشفة)
  R.seasonPts = (id, champs) => {
    const s = S(), c = s.clubs[id], P = R.SP; if (!c) return 0;
    const lg = c.lg || '', L = lg && G.World ? G.World.leagueOf(lg) : null;
    let dom;
    if (L && L.table && L.table[id]) {
      const order = G.World.sortedOf(lg), pos = order.indexOf(id) + 1, size = order.length;
      const lgm = G.LEAGUES[lg] || {};
      const coef = lgm.tier === 2 ? P.tier2 : (P.lgCoef[lg] || 0.8);
      dom = ((size - pos + 1) / size * P.pos + (champs && champs[lg] === id ? P.title : 0)) * coef;
    } else dom = extDom(c.rep || 50) * P.ext;
    const ex = s.ucl && s.ucl.exit ? s.ucl.exit[id] : null;
    return Math.round(dom + (ex && P.ucl[ex] ? P.ucl[ex] : 0));
  };
  R.recordSeason = (year, season) => {
    const s = S(), K = crk(), champs = (G.World && G.World.champions) ? G.World.champions() : {};
    const p = {};
    Object.keys(s.clubs || {}).forEach((id) => { const v = R.seasonPts(id, champs); if (v > 0) p[id] = v; });
    const ch = {}; Object.keys(champs).forEach((lg) => { if (champs[lg]) ch[lg] = champs[lg]; });
    const rec = { n: Number(season || s.season), y: Number(year || s.year), p, ch, u: (s.ucl && s.ucl.winner) || null };
    const at = K.seasons.findIndex((x) => x.n === rec.n);
    if (at >= 0) K.seasons[at] = rec; else K.seasons.push(rec);
    K.seasons.sort((a, b) => a.n - b.n);
    if (K.seasons.length > R.MAX_CRK) K.seasons.splice(0, K.seasons.length - R.MAX_CRK);
    return rec;
  };

  // نافذة آخر N موسمًا مكتملًا: مجموع نقاط كل نادٍ (حقيقي من عالمك حيث وُجد، وإلا تقدير تاريخي) + ألقابه الفعلية
  R.window = (N) => {
    const s = S(), K = crk(), cur = s.season, ids = Object.keys(s.clubs || {});
    const by = {}; K.seasons.forEach((x) => { by[x.n] = x; });
    let real = 0;
    const rows = ids.map((id) => ({ id, name: s.clubs[id].name || id, lg: s.clubs[id].lg || '', rep: s.clubs[id].rep || 50, score: 0, lgT: 0, uclT: 0, est: 0 }));
    const idx = {}; rows.forEach((r) => { idx[r.id] = r; });
    for (let j = 1; j <= N; j++) {
      const n = cur - j, rec = by[n], year = (s.year || 2025) - j;
      if (rec) {
        real++;
        rows.forEach((r) => { const v = rec.p[r.id]; if (v) r.score += v; });
        Object.keys(rec.ch || {}).forEach((lg) => { const r = idx[rec.ch[lg]]; if (r) r.lgT++; });
        if (rec.u && idx[rec.u]) idx[rec.u].uclT++;
      } else {
        rows.forEach((r) => { r.score += R.estPts(R.stature(r.id, year)); r.est++; });
      }
    }
    rows.forEach((r) => { r.score = Math.round(r.score); r.avg = Math.round(r.score / N); });
    rows.sort((a, b) => b.score - a.score || b.rep - a.rep || (a.id < b.id ? -1 : 1));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return { n: N, real, est: N - real, rows };
  };
  R.crkSeasons = () => crk().seasons;

  R.history = () => ensure();
  G.migrations = G.migrations || [];
  G.migrations.push(() => { if (G.S) { ensure(); R.init(); } });
})(window.G = window.G || {});
