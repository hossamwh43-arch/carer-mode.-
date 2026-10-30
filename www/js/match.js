/* match.js — أدوات المباراة المشتركة + المحاكاة السريعة لمباريات الذكاء الاصطناعي */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Match = (G.Match = {});

  const W_SCORE = { ST: 8, LW: 6, RW: 6, CAM: 5, CM: 2.5, CDM: 1, LB: 1, RB: 1, CB: 1.4, GK: 0.02 };
  const W_ASSIST = { CAM: 7, LW: 6, RW: 6, CM: 4, LB: 3, RB: 3, ST: 2.5, CDM: 2, CB: 0.7, GK: 0.05 };
  const GRP = G.POS_GROUP;

  Match.scorerWeight = (p, slot) => (W_SCORE[slot] || 1) * Math.pow(Math.max(20, p.a.sho) / 65, 1.5);
  Match.assistWeight = (p, slot) => (W_ASSIST[slot] || 1) * Math.pow(Math.max(20, p.a.pas) / 65, 1.5);
  Match.pickScorer = (list) => U.wpick(list, (x) => Match.scorerWeight(P(x.id), x.slot));
  Match.pickAssist = (list, exceptId) => U.wpick(list.filter((x) => x.id !== exceptId), (x) => Match.assistWeight(P(x.id), x.slot));

  Match.injWeeks = () => { const r = U.rnd(); return r < 0.55 ? U.int(1, 2) : r < 0.88 ? U.int(3, 6) : U.int(7, 16); };

  // تقييم اللاعب (من 3 إلى 10)
  Match.rating = (pos, o) => {
    let r = 6.45 + U.gauss() * 0.3;
    if (o.mins < 20) r = 6.3 + U.gauss() * 0.15;
    else r += o.res === 'w' ? 0.3 : o.res === 'l' ? -0.3 : 0;
    r += (o.g || 0) * 0.95 + (o.a || 0) * 0.6 + (o.sot || 0) * 0.06 - (o.big || 0) * 0.22;
    r += (o.momOk || 0) * 0.16 - (o.momBad || 0) * 0.14;
    const g = GRP[pos];
    if (o.mins >= 45) {
      if (o.cs) r += g === 'gk' ? 0.55 : g === 'def' ? 0.4 : g === 'mid' ? 0.12 : 0;
      else if (o.conc > 1 && (g === 'gk' || g === 'def')) r -= 0.18 * (o.conc - 1);
    }
    if (g === 'gk') r += (o.saves || 0) * 0.12;
    r -= (o.yel || 0) * 0.25 + (o.red || 0) * 1.6 + (o.pen || 0) * 0.3;
    return U.clamp(Math.round(r * 10) / 10, 3, 10);
  };

  Match.addStat = (pid, comp, mins, g, a, rating) => {
    const p = P(pid);
    if (!p || mins <= 0) return;
    const s = p.st[comp] || (p.st[comp] = [0, 0, 0, 0, 0]);
    s[0]++; s[1] += g; s[2] += a; s[3] += rating; s[4] += mins;
  };

  // ركلات الترجيح (محاكاة)
  Match.shootout = (hGK, aGK) => {
    const ph = U.clamp(0.76 - (aGK - 75) * 0.002, 0.6, 0.88), pa = U.clamp(0.76 - (hGK - 75) * 0.002, 0.6, 0.88);
    let h = 0, a = 0, i = 0;
    for (i = 1; i <= 5; i++) {
      if (U.rnd() < ph) h++;
      if (U.rnd() < pa) a++;
      if (h > a + (5 - i) || a > h + (5 - i)) break;
    }
    while (h === a) { if (U.rnd() < ph) h++; if (U.rnd() < pa) a++; if (h === a) continue; }
    return { h, a };
  };

  // ---------- المحاكاة السريعة ----------
  // ctx: { comp: 'lg'|'uc', neutral, ko: {prevH, prevA, final} }
  Match.quick = (hid, aid, ctx) => {
    ctx = ctx || {};
    const comp = ctx.comp || 'lg';
    const L = { h: G.Lineup.forClub(hid, { noise: 1.2 }), a: G.Lineup.forClub(aid, { noise: 1.2 }) };
    const R = { h: G.Lineup.ratings(L.h.xi), a: G.Lineup.ratings(L.a.xi) };
    const lam = { h: G.Lineup.lambda(R.h, R.a, ctx.neutral ? null : true), a: G.Lineup.lambda(R.a, R.h, ctx.neutral ? null : false) };
    let hg = U.poisson(lam.h), ag = U.poisson(lam.a);
    const sides = ['h', 'a'];
    // خطط التبديل: يخرج لاعب ويدخل بديل
    const plan = {};
    sides.forEach((s) => {
      const out = U.shuffle(L[s].xi.filter((x) => x.slot !== 'GK')).slice(0, 3);
      plan[s] = out.map((x) => {
        const g = GRP[x.slot];
        const bench = L[s].bench.map(P).filter((b) => b && b.pos !== 'GK' && (GRP[b.pos] === g || !g));
        const inn = bench.length ? bench[0] : null;
        return inn ? { out: x.id, inn: inn.id, slot: x.slot, t: U.int(58, 84) } : null;
      }).filter(Boolean);
      // لا نكرر البديل نفسه
      const seen = {};
      plan[s] = plan[s].filter((e) => !seen[e.inn] && (seen[e.inn] = true));
    });
    const mins = {}, goals = {}, ast = {};
    sides.forEach((s) => {
      L[s].xi.forEach((x) => { mins[x.id] = 90; });
      plan[s].forEach((e) => { mins[e.out] = e.t; mins[e.inn] = 90 - e.t; });
    });
    const onPitch = (s, t) => {
      const list = L[s].xi.map((x) => ({ id: x.id, slot: x.slot }));
      plan[s].forEach((e) => { if (e.t < t) { const i = list.findIndex((y) => y.id === e.out); if (i >= 0) list[i] = { id: e.inn, slot: e.slot }; } });
      return list;
    };
    const assignGoals = (s, n, tMax) => {
      for (let i = 0; i < n; i++) {
        const t = tMax === 120 ? U.int(91, 120) : U.int(1, 90);
        const list = onPitch(s, t);
        const sc = Match.pickScorer(list);
        if (!sc) continue;
        goals[sc.id] = (goals[sc.id] || 0) + 1;
        if (U.rnd() < 0.72) { const as = Match.pickAssist(list, sc.id); if (as) ast[as.id] = (ast[as.id] || 0) + 1; }
      }
    };
    assignGoals('h', hg, 90); assignGoals('a', ag, 90);
    let pens = null, et = false;
    if (ctx.ko && ctx.ko.prevH + hg === ctx.ko.prevA + ag) {
      et = true;
      const eh = U.poisson(lam.h * 0.33), ea = U.poisson(lam.a * 0.33);
      assignGoals('h', eh, 120); assignGoals('a', ea, 120);
      hg += eh; ag += ea;
      sides.forEach((s) => L[s].xi.forEach((x) => { if (mins[x.id] === 90) mins[x.id] = 120; }));
      if (ctx.ko.prevH + hg === ctx.ko.prevA + ag) pens = Match.shootout(R.h.gk, R.a.gk);
    }
    const res = { h: hg > ag ? 'w' : hg < ag ? 'l' : 'd', a: ag > hg ? 'w' : ag < hg ? 'l' : 'd' };
    const conc = { h: ag, a: hg };
    sides.forEach((s) => {
      const ids = Object.keys(mins);
      L[s].xi.concat(plan[s].map((e) => ({ id: e.inn, slot: e.slot }))).forEach((x) => {
        const p = P(x.id);
        if (!p || !(mins[x.id] > 0)) return;
        const g = goals[x.id] || 0, a = ast[x.id] || 0;
        const r = Match.rating(p.pos, { mins: mins[x.id], res: res[s], g, a, cs: conc[s] === 0, conc: conc[s] });
        Match.addStat(x.id, comp, mins[x.id], g, a, r);
        if (!p.user && U.rnd() < 0.007 * (mins[x.id] / 90)) p.inj = Match.injWeeks();
      });
    });
    return { hg, ag, et, pens, lam };
  };
})(window.G = window.G || {});
