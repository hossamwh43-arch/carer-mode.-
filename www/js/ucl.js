/* ucl.js — دوري أبطال أوروبا بالنظام الحديث: مرحلة الدوري (36 فريقًا × 8 مباريات) ثم الملحق والإقصائيات */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Ucl = (G.Ucl = {});

  const LEAGUE_WEEKS = [3, 5, 8, 11, 14, 17, 20, 23, 25, 27];
  const KO_WEEKS = { po: [30, 31], r16: [32, 33], qf: [34, 35], sf: [36, 37], final: [39] };
  Ucl.STAGE_AR = { league: 'مرحلة الدوري', po: 'ملحق الإقصائيات', r16: 'دور الـ16', qf: 'ربع النهائي', sf: 'نصف النهائي', final: 'النهائي', done: 'انتهت البطولة' };

  const emptyRow = () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  const strength = (id) => G.Players.clubStrength(G.C(id));

  // ---------- التأهل ----------
  // orders: ترتيب نهاية الموسم لكل دوري كبير { ESP1: [...], ENG1: [...] } (أو null في الموسم الأول: يُرتَّب بالسمعة)
  // المقاعد: G.UCL_SLOTS (20 ناديًا من الدوريات الخمسة) + G.CONFIG.uclOther من الأندية خارج هذه الدوريات
  Ucl.qualify = (orders) => {
    const S = G.S, all = Object.keys(S.clubs);
    const picked = [];
    Object.keys(G.UCL_SLOTS).forEach((lg) => {
      const o = orders && orders[lg] && orders[lg].length ? orders[lg] : all.filter((i) => S.clubs[i].lg === lg).sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
      o.slice(0, G.UCL_SLOTS[lg]).forEach((id) => picked.push(id));
    });
    const outside = all.filter((i) => !S.clubs[i].lg && !S.clubs[i].nt);
    const prev = S.uclHistory && S.uclHistory.length ? S.uclHistory[S.uclHistory.length - 1].exit || {} : {};
    const stageBonus = { final: 2, sf: 1.5, qf: 1, r16: 0.5 };
    const score = {};
    outside.forEach((id) => { score[id] = strength(id) + U.gauss() * 3.2 + (stageBonus[prev[id]] || 0); });
    const chosen = outside.sort((a, b) => score[b] - score[a]).slice(0, G.CONFIG.uclOther);
    // نادي اللاعب الخارجي (بلا دوري محلي في اللعبة) يتأهل دائمًا
    const u = P(S.user);
    if (u && u.club && !S.clubs[u.club].lg && chosen.indexOf(u.club) < 0) { chosen.pop(); chosen.push(u.club); }
    return picked.concat(chosen);
  };

  // ---------- القرعة والجدولة ----------
  const SIDE = (arr, pot) => pot.map((i) => arr[i]);
  Ucl.draw = (teams) => {
    const sorted = teams.slice().sort((a, b) => strength(b) - strength(a));
    const pots = [0, 1, 2, 3].map((k) => sorted.slice(k * 9, k * 9 + 9));
    const same = (a, b) => G.C(a).country === G.C(b).country; // لا مواجهات بين أندية الاتحاد نفسه في مرحلة الدوري (قدر الإمكان)
    let best = null, bestScore = 1e9;
    for (let attempt = 0; attempt < 400; attempt++) {
      const pp = pots.map((p) => U.shuffle(p.slice()));
      const edges = [];
      // بين الأوعية: كل فريق يستضيف فريقًا ويزور فريقًا من كل وعاء آخر
      for (let p = 0; p < 4; p++) for (let q = p + 1; q < 4; q++) for (let i = 0; i < 9; i++) {
        edges.push({ h: pp[p][i], a: pp[q][i] });
        edges.push({ h: pp[q][(i + 1) % 9], a: pp[p][i] });
      }
      // داخل الوعاء الواحد: دورة من 9
      for (let p = 0; p < 4; p++) for (let i = 0; i < 9; i++) edges.push({ h: pp[p][i], a: pp[p][(i + 1) % 9] });
      const clash = edges.filter((e) => same(e.h, e.a)).length;
      if (clash < bestScore) { bestScore = clash; best = edges; if (clash === 0) break; }
    }
    return { edges: best, pots, clashes: bestScore };
  };

  // جدولة 144 مباراة على جولات (كل فريق ≤ مباراة واحدة في الجولة)
  Ucl.schedule = (edges) => {
    let bestRounds = null;
    for (let attempt = 0; attempt < 250; attempt++) {
      const es = U.shuffle(edges.slice());
      const rounds = [];
      let ok = true;
      for (const e of es) {
        let placed = false;
        for (const r of rounds) {
          if (!r.used[e.h] && !r.used[e.a]) { r.used[e.h] = r.used[e.a] = true; r.list.push(e); placed = true; break; }
        }
        if (!placed) {
          if (rounds.length >= 10) { ok = false; break; }
          const r = { used: {}, list: [e] }; r.used[e.h] = r.used[e.a] = true; rounds.push(r);
        }
      }
      if (ok && (!bestRounds || rounds.length < bestRounds.length)) { bestRounds = rounds; if (rounds.length <= 8) break; }
    }
    if (!bestRounds) throw new Error('تعذّرت جدولة مرحلة الدوري');
    return bestRounds.map((r) => r.list);
  };

  Ucl.setup = (season, teams) => {
    const d = Ucl.draw(teams);
    const rounds = Ucl.schedule(d.edges);
    const table = {};
    teams.forEach((id) => { table[id] = emptyRow(); });
    const weeks = LEAGUE_WEEKS.slice(0, rounds.length);
    const U1 = {
      season, teams: teams.slice(), phase: 'league', clashes: d.clashes, weeks: { league: weeks },
      league: {
        table,
        rounds: rounds.map((rd, ri) => rd.map((e) => ({ id: 'UCL' + season + '-L' + (ri + 1) + '-' + e.h + '-' + e.a, comp: 'UCL', stage: 'league', r: ri + 1, h: e.h, a: e.a, played: false, hg: null, ag: null, w: weeks[ri] })))
      },
      ties: { po: [], r16: [], qf: [], sf: [] }, final: null, winner: null, exit: {}, seeds: []
    };
    teams.forEach((id) => { U1.exit[id] = 'league'; });
    return U1;
  };

  // ---------- أدوات ----------
  Ucl.allFixtures = (u) => {
    u = u || G.S.ucl;
    let out = [].concat.apply([], u.league.rounds);
    ['po', 'r16', 'qf', 'sf'].forEach((st) => u.ties[st].forEach((t) => { out = out.concat(t.legs); }));
    if (u.final) out.push(u.final);
    return out;
  };
  Ucl.fixturesForWeek = (w) => (G.S.ucl ? Ucl.allFixtures().filter((f) => f.w === w) : []);
  Ucl.sorted = (u) => {
    u = u || G.S.ucl;
    return u.teams.slice().sort((x, y) => {
      const a = u.league.table[x], b = u.league.table[y];
      return (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf) || (b.w - a.w) || (G.C(x).name < G.C(y).name ? -1 : 1);
    });
  };

  Ucl.findTie = (fix) => G.S.ucl.ties[fix.stage].find((t) => t.id === fix.tid);

  // سياق الإقصاء للمباراة (للوقت الإضافي والترجيح)
  Ucl.koCtx = (fix) => {
    if (fix.stage === 'final') return { prevH: 0, prevA: 0, final: true };
    if (fix.leg === 2) {
      const t = Ucl.findTie(fix), leg1 = t.legs[0];
      if (!leg1.played) return null;
      // في الذهاب: المضيف lo والضيف hi؛ في الإياب: المضيف hi
      return { prevH: leg1.ag, prevA: leg1.hg };
    }
    return null;
  };
  Ucl.neutral = (fix) => fix.stage === 'final';

  // تسجيل نتيجة مباراة (فريق الذكاء الاصطناعي أو المستخدم)
  Ucl.record = (fix, hg, ag, pens) => {
    if (fix.played) throw new Error('مباراة مكررة: ' + fix.id);
    fix.played = true; fix.hg = hg; fix.ag = ag; fix.pens = pens || null;
    const u = G.S.ucl;
    if (fix.stage === 'league') {
      const H = u.league.table[fix.h], A = u.league.table[fix.a];
      H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
      if (hg > ag) { H.w++; A.l++; H.pts += 3; } else if (hg < ag) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
    }
  };

  Ucl.simFixture = (fix) => {
    const r = G.Match.quick(fix.h, fix.a, { comp: 'uc', neutral: Ucl.neutral(fix), ko: Ucl.koCtx(fix) });
    Ucl.record(fix, r.hg, r.ag, r.pens);
    return r;
  };

  Ucl.tieWinner = (t) => {
    const [l1, l2] = t.legs;
    if (!l1.played || !l2.played) return null;
    // الذهاب: المضيف lo؛ الإياب: المضيف hi
    const lo = l1.hg + l2.ag, hi = l1.ag + l2.hg;
    if (hi !== lo) return hi > lo ? t.hi : t.lo;
    if (l2.pens) return l2.pens.h > l2.pens.a ? l2.h : l2.a; // مضيف الإياب = hi
    return t.hi;
  };

  const makeTie = (stage, id, hi, lo, weeks, season) => {
    const t = { id, stage, hi, lo, legs: [], winner: null };
    t.legs.push({ id: 'UCL' + season + '-' + id + '-1', comp: 'UCL', stage, leg: 1, h: lo, a: hi, played: false, hg: null, ag: null, w: weeks[0], tid: id });
    t.legs.push({ id: 'UCL' + season + '-' + id + '-2', comp: 'UCL', stage, leg: 2, h: hi, a: lo, played: false, hg: null, ag: null, w: weeks[1], tid: id });
    return t;
  };

  const stageDone = (arr) => arr.every((t) => t.legs.every((f) => f.played));

  // ينقل البطولة للمرحلة التالية متى اكتملت الحالية
  Ucl.advance = () => {
    const u = G.S.ucl, season = u.season;
    if (!u || u.phase === 'done') return;
    const leagueDone = u.league.rounds.every((rd) => rd.every((f) => f.played));
    if (u.phase === 'league' && leagueDone) {
      const order = Ucl.sorted(u);
      u.seeds = order.slice();
      order.forEach((id, i) => { u.exit[id] = i < 8 ? 'r16' : i < 24 ? 'po' : 'league'; });
      // الملحق: 9-24 (المصنفون 9-16 ضد 17-24)
      for (let i = 0; i < 8; i++) u.ties.po.push(makeTie('po', 'PO' + (i + 1), order[8 + i], order[23 - i], KO_WEEKS.po, season));
      u.phase = 'po';
    } else if (u.phase === 'po' && stageDone(u.ties.po)) {
      u.ties.po.forEach((t) => { t.winner = Ucl.tieWinner(t); u.exit[t.winner] = 'r16'; u.exit[t.winner === t.hi ? t.lo : t.hi] = 'po'; });
      for (let k = 0; k < 8; k++) {
        const direct = u.seeds[k], w = u.ties.po[7 - k].winner; // المصنف 1 ضد فائز PO8
        u.ties.r16.push(makeTie('r16', 'R' + (k + 1), direct, w, KO_WEEKS.r16, season));
      }
      u.phase = 'r16';
    } else if (u.phase === 'r16' && stageDone(u.ties.r16)) {
      u.ties.r16.forEach((t) => { t.winner = Ucl.tieWinner(t); u.exit[t.winner] = 'qf'; });
      const W = u.ties.r16.map((t) => t.winner);
      [[0, 7], [1, 6], [2, 5], [3, 4]].forEach(([a, b], k) => {
        const hi = u.seeds.indexOf(W[a]) < u.seeds.indexOf(W[b]) ? W[a] : W[b], lo = hi === W[a] ? W[b] : W[a];
        u.ties.qf.push(makeTie('qf', 'Q' + (k + 1), hi, lo, KO_WEEKS.qf, season));
      });
      u.phase = 'qf';
    } else if (u.phase === 'qf' && stageDone(u.ties.qf)) {
      u.ties.qf.forEach((t) => { t.winner = Ucl.tieWinner(t); u.exit[t.winner] = 'sf'; });
      const W = u.ties.qf.map((t) => t.winner);
      [[0, 3], [1, 2]].forEach(([a, b], k) => {
        const hi = u.seeds.indexOf(W[a]) < u.seeds.indexOf(W[b]) ? W[a] : W[b], lo = hi === W[a] ? W[b] : W[a];
        u.ties.sf.push(makeTie('sf', 'S' + (k + 1), hi, lo, KO_WEEKS.sf, season));
      });
      u.phase = 'sf';
    } else if (u.phase === 'sf' && stageDone(u.ties.sf)) {
      u.ties.sf.forEach((t) => { t.winner = Ucl.tieWinner(t); u.exit[t.winner] = 'final'; });
      const [a, b] = u.ties.sf.map((t) => t.winner);
      u.final = { id: 'UCL' + season + '-F', comp: 'UCL', stage: 'final', h: a, a: b, played: false, hg: null, ag: null, w: KO_WEEKS.final[0], neutral: true };
      u.phase = 'final';
    } else if (u.phase === 'final' && u.final.played) {
      const f = u.final;
      u.winner = f.hg > f.ag ? f.h : f.hg < f.ag ? f.a : (f.pens && f.pens.h > f.pens.a ? f.h : f.a);
      u.exit[u.winner] = 'winner';
      u.phase = 'done';
    } else return false;
    return true; // تغيّرت المرحلة؛ قد تحتاج استدعاءً آخر
  };
  Ucl.advanceAll = () => { let g = 0; while (g++ < 8 && Ucl.advance()) { /* تكرار حتى الاستقرار */ } };

  // نادي المستخدم: هل لا يزال في البطولة؟
  Ucl.userAlive = (clubId) => {
    const u = G.S.ucl;
    if (!u || u.teams.indexOf(clubId) < 0) return false;
    if (u.phase === 'done') return false;
    const ex = u.exit[clubId];
    return ex !== 'league' || u.phase === 'league';
  };

  // التحقق من سلامة مرحلة الدوري
  Ucl.validate = () => {
    const u = G.S.ucl, err = [];
    if (!u) return err;
    let sgf = 0, sga = 0, sp = 0, played = 0;
    u.teams.forEach((id) => {
      const t = u.league.table[id];
      if (t.p !== t.w + t.d + t.l || t.pts !== 3 * t.w + t.d) err.push('UCL ' + id + ': أرقام غير متسقة');
      sgf += t.gf; sga += t.ga; sp += t.p;
    });
    if (sgf !== sga) err.push('UCL: مجموع الأهداف غير متساوٍ');
    u.league.rounds.forEach((rd, i) => {
      const used = {};
      rd.forEach((f) => { if (used[f.h] || used[f.a]) err.push('UCL: نادٍ مكرر في الجولة ' + (i + 1)); used[f.h] = used[f.a] = true; if (f.played) played++; });
    });
    if (sp !== played * 2) err.push('UCL: عدد المباريات لا يطابق الترتيب');
    return err;
  };
})(window.G = window.G || {});
