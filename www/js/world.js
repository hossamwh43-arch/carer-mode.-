/* world.js — العالم الموسّع: الدوريات الخمسة الكبرى ودرجاتها الثانية، جداولها، الصعود والهبوط، تشكيلات أندية الدرجة الثانية عند الحاجة.
   التمثيل: دوري المستخدم يبقى بالصيغة الكاملة القديمة (S.league: كائنات مباريات)، وبقية الدوريات بصيغة مضغوطة (S.others[id]) توفّر حجم الحفظ.
   أندية الدرجة الثانية «خفيفة» (club.light) بلا لاعبين حتى تُصعَّد أو يلعب ضدها المستخدم، فتُولَّد تشكيلتها عندئذ (ensureSquad). */
(function (G) {
  'use strict';
  const U = G.U, C = (id) => G.S.clubs[id], P = (id) => G.S.players[id];
  const World = (G.World = {});
  const emptyRow = () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  const COUNTRIES = ['ESP', 'ENG', 'ITA', 'GER', 'FRA'];

  World.order = () => G.LEAGUE_ORDER;
  World.members = (lgId) => Object.keys(G.S.clubs).filter((id) => G.S.clubs[id].lg === lgId).sort();
  World.lgOfClub = (id) => (G.S.clubs[id] ? G.S.clubs[id].lg || null : null);
  World.tierOf = (lgId) => (G.LEAGUES[lgId] ? G.LEAGUES[lgId].tier : 0);
  // الدوري الذي يلعب فيه نادي المستخدم (null إن كان نادٍ خارجي لا دوري محلي له)
  World.userLg = () => { const u = P(G.S.user); return u && C(u.club) ? C(u.club).lg || null : null; };
  // الدوري المعروض في S.league (نادي المستخدم الخارجي يرى الدوري الإسباني للاطلاع فقط)
  World.viewLg = () => World.userLg() || 'ESP1';

  // ---------- أندية خفيفة ----------
  World.wageEstimate = (rep) => {
    const q = 0.62 * rep + 31, p = { ovr: q - 3, pot: q - 3, age: 26, ct: { y: 3 } };
    return Math.round(G.Players.wageFor(p) * 24 * 1.1);
  };
  // قوة النادي الفعّالة (تقابل متوسط التشكيلة الأساسية)
  World.eff = (club) => {
    if (!club.light && club.squad && club.squad.length >= 11) return G.Players.clubStrength(club) + 0.8;
    return 0.62 * club.rep + 29.8;
  };
  // بذرة ثابتة لكل (نادٍ، موسم، مسيرة): نفس التشكيلة في معاينة اختيار النادي وفي اللعبة، ولا تستهلك عشوائية المحاكاة
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  World.hashStr = hashStr;
  World.ensureSquad = (cid) => {
    const club = C(cid), S = G.S;
    if (!club || !club.light) return false;
    club.light = false; club.squad = [];
    const keep = G.rngState;
    U.seed(hashStr(cid + '|' + (S.seed || 1) + '|' + (S.season || 1)));
    try { G.Players.genSquad(club); } finally { G.rngState = keep; }
    return true;
  };
  World.ensureLeagueSquads = (lgId) => { World.members(lgId).forEach((id) => World.ensureSquad(id)); };

  // ---------- محاكاة مباراة بين ناديين (أحدهما أو كلاهما خفيف) ----------
  World.simMatch = (hid, aid) => {
    const ch = C(hid), ca = C(aid);
    if (!ch.light && !ca.light) { const r = G.Match.quick(hid, aid, { comp: 'lg' }); return [r.hg, r.ag]; }
    const eh = World.eff(ch) + U.gauss() * 1.2, ea = World.eff(ca) + U.gauss() * 1.2;
    const Rh = { A: eh, D: eh, M: eh }, Ra = { A: ea, D: ea, M: ea };
    return [U.poisson(G.Lineup.lambda(Rh, Ra, true)), U.poisson(G.Lineup.lambda(Ra, Rh, false))];
  };

  World.rec = (table, h, a, hg, ag) => {
    const H = table[h], A = table[a];
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; A.l++; H.pts += 3; } else if (hg < ag) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
  };

  // ---------- الصيغة المضغوطة ----------
  World.makeCompact = (lgId, season) => {
    const ids = World.members(lgId);
    const full = G.League.make(ids, season, lgId);
    const idx = {}; ids.forEach((id, i) => { idx[id] = i; });
    return { lg: lgId, season, clubs: ids, sched: full.rounds.map((rd) => rd.map((f) => [idx[f.h], idx[f.a]])), wk: full.wk, res: full.rounds.map(() => 0), table: full.table };
  };
  World.expand = (c) => {
    const rounds = c.sched.map((rd, ri) => rd.map((m, k) => {
      const h = c.clubs[m[0]], a = c.clubs[m[1]], r = c.res[ri] ? c.res[ri][k] : 0;
      return { id: 'LL' + c.season + '-' + (ri + 1) + '-' + h + '-' + a, comp: 'LL', r: ri + 1, h, a, played: !!r, hg: r ? r[0] : null, ag: r ? r[1] : null, w: c.wk[ri] };
    }));
    return { clubs: c.clubs.slice(), rounds, table: JSON.parse(JSON.stringify(c.table)), wk: c.wk.slice(), lg: c.lg, season: c.season };
  };
  World.compactOf = (L) => {
    const idx = {}; L.clubs.forEach((id, i) => { idx[id] = i; });
    const sched = L.rounds.map((rd) => rd.map((f) => [idx[f.h], idx[f.a]]));
    const res = L.rounds.map((rd) => (rd.some((f) => f.played) ? rd.map((f) => (f.played ? [f.hg, f.ag] : 0)) : 0));
    return { lg: L.lg, season: L.season, clubs: L.clubs.slice(), sched, wk: L.wk.slice(), res, table: JSON.parse(JSON.stringify(L.table)) };
  };

  // جدول أي دوري (الصيغتان تحملان clubs و table)
  World.leagueOf = (lgId) => {
    const S = G.S;
    if (S.league && S.league.lg === lgId) return S.league;
    return (S.others && S.others[lgId]) || null;
  };
  World.sortedOf = (lgId) => { const L = World.leagueOf(lgId); return L ? G.League.sorted(L) : []; };
  World.positionIn = (lgId, id) => World.sortedOf(lgId).indexOf(id) + 1;

  // ---------- بدء الموسم: جداول كل الدوريات ----------
  World.startSeason = (season) => {
    const S = G.S, ulg = World.viewLg();
    S.others = {}; S.lgId = ulg;
    World.order().forEach((lg) => {
      if (lg === ulg) { World.ensureLeagueSquads(lg); S.league = G.League.make(World.members(lg), season, lg); }
      else S.others[lg] = World.makeCompact(lg, season);
    });
  };

  // محاكاة مباريات الدوريات الأخرى في أسبوع تقويمي
  World.simWeek = (week) => {
    const S = G.S;
    if (!S.others) return 0;
    let n = 0;
    World.order().forEach((lg) => {
      const c = S.others[lg];
      if (!c) return;
      c.wk.forEach((w, ri) => {
        if (w !== week) return;
        const rd = c.sched[ri], out = c.res[ri] || rd.map(() => 0);
        rd.forEach((m, k) => {
          if (out[k]) return;
          const h = c.clubs[m[0]], a = c.clubs[m[1]], sc = World.simMatch(h, a);
          out[k] = sc; World.rec(c.table, h, a, sc[0], sc[1]); n++;
        });
        c.res[ri] = out;
      });
    });
    return n;
  };

  // انتقال المستخدم لنادٍ في دوري آخر أثناء الموسم: يتبدّل دوري المستخدم الكامل مع المضغوط
  World.syncUser = () => {
    const S = G.S;
    if (!S.league || !S.others) return false;
    const club = C(P(S.user).club), lg = club && club.lg;
    if (!lg || lg === S.league.lg) return false;
    const nc = S.others[lg];
    if (!nc) return false;
    World.ensureLeagueSquads(lg);
    S.others[S.league.lg] = World.compactOf(S.league);
    S.league = World.expand(nc); delete S.others[lg]; S.lgId = lg;
    return true;
  };

  // ---------- نهاية الموسم ----------
  // ترتيب أندية الدوريات الكبرى لتحديد المتأهلين لدوري الأبطال
  World.uclOrders = () => {
    const out = {};
    Object.keys(G.UCL_SLOTS).forEach((lg) => { const o = World.sortedOf(lg); if (o.length) out[lg] = o; });
    return out;
  };
  World.champions = () => {
    const out = {};
    World.order().forEach((lg) => { const o = World.sortedOf(lg); if (o.length && World.complete(lg)) out[lg] = o[0]; });
    return out;
  };
  World.complete = (lgId) => {
    const L = World.leagueOf(lgId);
    if (!L) return false;
    const R = L.rounds ? L.rounds.length : L.sched.length;
    const n = L.clubs.length;
    return L.table[L.clubs[0]].p >= 2 * (n - 1) && R > 0;
  };

  // الصعود والهبوط: يُنفَّذ مرة في الصيف قبل التصفير. يعيد قائمة الحركات للعرض والأخبار
  World.promoRel = () => {
    const S = G.S, moves = [];
    COUNTRIES.forEach((cn) => {
      const top = G.LG_TOP_OF[cn], low = G.LEAGUES[top].other;
      if (!World.complete(top) || !World.complete(low)) return;
      const tt = World.sortedOf(top), lt = World.sortedOf(low);
      const rel = tt.slice(tt.length - G.LEAGUES[top].down), pro = lt.slice(0, G.LEAGUES[low].up);
      rel.forEach((id) => { C(id).lg = low; });
      pro.forEach((id) => {
        const c = C(id); c.lg = top;
        World.ensureSquad(id);
        c.tb += G.Players.budgetFor(c.rep) * 0.5; // مكافأة الصعود
        c.wcap = Math.max(c.wcap, Math.round(G.Transfers.wageBill(c) * 1.15));
      });
      moves.push({ country: cn, top, low, rel, pro, champ: tt[0], champLow: lt[0] });
    });
    return moves;
  };

  // ---------- تخفيف الأندية: يُبقي حجم الحفظ محدودًا ----------
  // نادٍ في الدرجة الثانية خارج دوري المستخدم يعود «خفيفًا»: أفضل لاعبيه يُباعون لأندية الدرجة الأولى والباقون يعتزلون/يختفون.
  World.lighten = (cid) => {
    const S = G.S, club = C(cid), user = P(S.user);
    if (!club || club.light || (user && user.club === cid)) return false;
    const buyers = Object.keys(S.clubs).filter((id) => { const c = S.clubs[id]; return c.lg && G.LEAGUES[c.lg].tier === 1 && !c.light; });
    const list = club.squad.map(P).filter((p) => p && !p.user).sort((a, b) => b.ovr - a.ovr);
    list.forEach((p, i) => {
      if (p.parentPays) return;
      let sold = false;
      if (i < 8 && p.age <= 33 && p.ovr >= 62) {
        const cand = buyers.filter((id) => { const q = G.Transfers.clubQ(S.clubs[id]); return p.ovr >= q - 4 && p.ovr <= q + 7; });
        if (cand.length) { G.Transfers.execute(p, U.pick(cand), 0, G.Players.wageFor(p), U.int(2, 4)); sold = true; }
      }
      if (!sold) { club.squad = club.squad.filter((x) => x !== p.id); delete S.players[p.id]; }
    });
    club.squad = club.squad.filter((x) => P(x));
    club.light = true; club.wcap = World.wageEstimate(club.rep);
    return true;
  };
  World.lightenAll = () => {
    const keep = World.viewLg();
    let n = 0;
    Object.keys(G.S.clubs).forEach((id) => { const c = G.S.clubs[id]; if (c.lg && G.LEAGUES[c.lg].tier === 2 && c.lg !== keep && World.lighten(id)) n++; });
    return n;
  };
  // اللاعبون الأحرار الذين لا يريدهم أحد يختفون (لا تتراكم بيانات بلا فائدة)
  World.pruneFree = () => {
    const S = G.S;
    S.free = (S.free || []).filter((id) => {
      const p = P(id);
      if (!p) return false;
      if (!p.user && (p.age >= 34 || p.ovr < 55)) { delete S.players[id]; return false; }
      return true;
    });
  };

  // ---------- أدوات للعرض ----------
  // نتائج آخر جولة لُعبت في دوري (الصيغتان)
  World.lastResults = (lgId) => {
    const L = World.leagueOf(lgId);
    if (!L) return null;
    let r = 0;
    if (L.rounds) {
      L.rounds.forEach((rd, i) => { if (rd.some((f) => f.played)) r = i + 1; });
      return r ? { r, list: L.rounds[r - 1].filter((f) => f.played).map((f) => ({ h: f.h, a: f.a, hg: f.hg, ag: f.ag })) } : null;
    }
    L.res.forEach((x, i) => { if (x) r = i + 1; });
    if (!r) return null;
    const out = L.res[r - 1];
    return { r, list: L.sched[r - 1].map((m, k) => ({ h: L.clubs[m[0]], a: L.clubs[m[1]], hg: out[k] ? out[k][0] : null, ag: out[k] ? out[k][1] : null })).filter((x) => x.hg != null) };
  };
  World.leaguePlayers = (lgId) => {
    const S = G.S, set = {};
    World.members(lgId).forEach((id) => { set[id] = true; });
    return Object.keys(S.players).map((k) => S.players[k]).filter((p) => p.club && set[p.club]);
  };
  // هدّافو دوري (من لاعبي الأندية الكاملة)
  World.scorers = (lgId, n) => World.leaguePlayers(lgId).filter((p) => p.st.lg[1] > 0).sort((a, b) => (b.st.lg[1] - a.st.lg[1]) || (b.st.lg[2] - a.st.lg[2]) || (b.st.lg[3] / b.st.lg[0] - a.st.lg[3] / a.st.lg[0])).slice(0, n || 10);

  // ---------- ترقية الحفظ القديم (v2) ----------
  // يضيف الدوري/الخفّة للأندية، وينشئ الأندية الناقصة. اللعب في الموسم الجاري يستمر كما هو، والعالم الموسّع يبدأ من الموسم التالي.
  World.migrate = () => {
    const S = G.S;
    if (!S || S.ver >= 3) return false;
    const list = G.worldClubs();
    list.forEach((d) => {
      let c = S.clubs[d.id];
      if (c) { c.lg = d.lg; c.liga = !!d.lg; if (c.light === undefined) c.light = false; return; }
      const tier = d.lg ? G.LEAGUES[d.lg].tier : 1;
      c = S.clubs[d.id] = { id: d.id, name: d.name, country: d.country, rep: d.rep, c: d.c, form: d.form, liga: !!d.lg, lg: d.lg, squad: [], tb: G.Players.budgetFor(d.rep) * (0.8 + U.rnd() * 0.4), light: tier === 2 };
      if (c.light) c.wcap = World.wageEstimate(c.rep); else G.Players.genSquad(c);
    });
    if (S.league && !S.league.wk) { S.league.wk = S.league.rounds.map((r, i) => i + 1); S.league.lg = 'ESP1'; S.league.season = S.season; }
    S.others = S.others || (S.phase === 'season' || S.phase === 'end' ? {} : null);
    S.lgId = S.lgId || 'ESP1';
    Object.keys(S.players).forEach((k) => { const p = S.players[k]; if (p.st && !p.st.nt) p.st.nt = [0, 0, 0, 0, 0]; });
    if (!S.hist) S.hist = [];
    S.ver = 3;
    return true;
  };
  G.migrations = G.migrations || [];
  G.migrations.push(World.migrate);
})(window.G = window.G || {});
