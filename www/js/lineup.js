/* lineup.js — اختيار التشكيلة الأساسية والبدلاء وحساب قوة الفريق */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Lineup = (G.Lineup = {});

  const PRI = { GK: 0, CB: 1, ST: 2, LB: 3, RB: 3, CDM: 4, CAM: 5, CM: 6, LW: 7, RW: 7 };
  const GRP = { GK: 'gk', LB: 'def', RB: 'def', CB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'att', RW: 'att', ST: 'att' };

  Lineup.avail = (p) => p && !p.inj && !p.susp;
  Lineup.eff = (p, slot) => p.ovr - G.Players.posPenalty(p.pos, slot);
  Lineup.slots = (club) => G.FORMATIONS[club.form] || G.FORMATIONS['4-3-3'];

  // يختار أفضل 11 لاعبًا من pool لخطة معيّنة
  Lineup.best = (pool, slots, noise) => {
    const order = slots.map((s, i) => ({ s, i })).sort((a, b) => PRI[a.s] - PRI[b.s]);
    const used = {}, xi = new Array(slots.length);
    for (const { s, i } of order) {
      let best = null, bs = -1e9;
      for (const p of pool) {
        if (used[p.id]) continue;
        const sc = Lineup.eff(p, s) + (noise ? (U.rnd() * 2 - 1) * noise : 0);
        if (sc > bs) { bs = sc; best = p; }
      }
      if (!best) return null;
      used[best.id] = true;
      xi[i] = { id: best.id, slot: s };
    }
    return xi;
  };

  Lineup.bench = (pool, xi, size) => {
    const inXI = {};
    xi.forEach((x) => { inXI[x.id] = true; });
    const rest = pool.filter((p) => !inXI[p.id]).sort((a, b) => b.ovr - a.ovr);
    const out = [], gk = rest.find((p) => p.pos === 'GK');
    if (gk) out.push(gk.id);
    const need = { def: 2, mid: 2, att: 2 };
    rest.forEach((p) => {
      const g = GRP[p.pos];
      if (g !== 'gk' && need[g] > 0 && out.length < size) { out.push(p.id); need[g]--; }
    });
    rest.forEach((p) => { if (out.length < size && out.indexOf(p.id) < 0 && p.pos !== 'GK') out.push(p.id); });
    return out.slice(0, size);
  };

  // opts: noise (تدوير للذكاء الاصطناعي)، rotStart (هل يبدأ اللاعب في دور rotation)
  Lineup.forClub = (clubId, opts) => {
    opts = opts || {};
    const club = G.C(clubId), S = G.S;
    const all = club.squad.map(P).filter(Boolean);
    const user = all.find((p) => p.user);
    let pool = all.filter((p) => !p.user && Lineup.avail(p));
    if (pool.length < 14) { // نقص بسبب الإصابات: نكمل بأقل المصابين غيابًا
      const extra = all.filter((p) => !p.user && !Lineup.avail(p)).sort((a, b) => (a.inj || 0) - (b.inj || 0));
      pool = pool.concat(extra.slice(0, 14 - pool.length));
    }
    const slots = Lineup.slots(club);
    let xi = Lineup.best(pool, slots, opts.noise == null ? 1.2 : opts.noise);
    if (!xi) { // نقص حاد في اللاعبين: نستخدم الجميع
      xi = Lineup.best(all.filter((p) => !p.inj || p.user), slots, 0) || [];
    }
    let bench = Lineup.bench(pool, xi, 7);
    if (user && Lineup.avail(user)) {
      const role = opts.role || user.role || 'bench';
      const asStarter = role === 'starter' || (role === 'rotation' && opts.rotStart);
      if (asStarter && xi.length) {
        // أفضل خانة لمركز اللاعب: نفس المركز أولًا ثم الأقل عقوبة، وعند التساوي أضعف شاغل
        let bi = -1, bs = 1e9;
        xi.forEach((x, i) => {
          const inc = P(x.id);
          const key = G.Players.posPenalty(user.pos, x.slot) * 100 + Lineup.eff(inc, x.slot);
          if (key < bs) { bs = key; bi = i; }
        });
        const old = xi[bi];
        xi[bi] = { id: user.id, slot: xi[bi].slot };
        bench = [old.id].concat(bench).slice(0, 7);
      } else if (role !== 'out') {
        bench = bench.slice(0, 6).concat([user.id]);
        // نضع اللاعب في مقدمة البدلاء ليظهر دوره
        bench = [user.id].concat(bench.filter((i) => i !== user.id)).slice(0, 7);
      }
    }
    return { clubId, formation: club.form, xi, bench };
  };

  // قوة الفريق: A هجوم، D دفاع، M وسط
  Lineup.ratings = (xi, extra) => {
    const g = { gk: [], def: [], mid: [], att: [] };
    xi.forEach((x) => {
      const p = P(x.id);
      let e = Lineup.eff(p, x.slot);
      if (p.user && p.fit != null && p.fit < 70) e -= (70 - p.fit) * 0.1;
      if (extra && extra.fat && extra.fat[p.id] != null && extra.fat[p.id] < 60) e -= (60 - extra.fat[p.id]) * 0.05;
      g[GRP[x.slot]].push(e);
      if (x.slot === 'CAM') g.att.push(e - 3);
      if (x.slot === 'CDM') g.def.push(e - 4);
    });
    const av = (a, d) => (a.length ? U.avg(a) : d);
    const gk = av(g.gk, 40), def = av(g.def, 55), mid = av(g.mid, 55), att = av(g.att, 55);
    let A = 0.55 * att + 0.30 * mid + 0.15 * def;
    let D = 0.45 * def + 0.20 * mid + 0.35 * gk;
    const missing = 11 - xi.length;
    if (missing > 0) { A -= 3 * missing; D -= 3 * missing; }
    return { A, D, M: mid, gk };
  };

  // الأهداف المتوقعة (λ) لفريق ضد آخر
  Lineup.lambda = (rA, rB, home) => {
    const base = 1.26 * (home === true ? 1.10 : home === false ? 0.92 : 1);
    return U.clamp(base * Math.exp(0.042 * (rA.A - rB.D)) * Math.exp(0.012 * (rA.M - rB.M)), 0.12, 5.5);
  };

  // ---------- توقّع مباراة (للعرض فقط) ----------
  // بلا أي عشوائية: تشكيلتان بلا ضوضاء + توزيع بواسون مستقل لكل فريق (نفس معادلة المحاكاة السريعة)، ولا يستهلك U.rnd أبدًا
  // فيبقى تسلسل العشوائية المحفوظ كما هو سواء فتح اللاعب شاشة التوقعات أم لم يفتحها.
  Lineup.LIVE_K = { start: 1.22, bench: 1.05, out: 1.03 };
  const pois = (l, n) => { const out = [Math.exp(-l)]; for (let k = 1; k <= n; k++) out.push(out[k - 1] * l / k); return out; };
  Lineup.predict = (hid, aid, opts) => {
    opts = opts || {};
    const u = G.S.players[G.S.user];
    const side = (cid) => (u && cid === u.club ? { role: u.role, rotStart: false, noise: 0 } : { noise: 0 });
    const L = { h: Lineup.forClub(hid, side(hid)), a: Lineup.forClub(aid, side(aid)) };
    const R = { h: Lineup.ratings(L.h.xi), a: Lineup.ratings(L.a.xi) };
    const lam = { h: Lineup.lambda(R.h, R.a, opts.neutral ? null : true), a: Lineup.lambda(R.a, R.h, opts.neutral ? null : false) };
    // اللحظات التفاعلية (تظهر فقط حين يكون اللاعب في الملعب) تُضيف فرصًا فوق معدّل التسديد الأساسي، فتزيد أهداف مباراته
    // ≈ 22% للفريقين مقارنةً بمحاكاة الذكاء الاصطناعي؛ نعايرها هنا كي تطابق التوقعات ما يحدث فعلًا (يتحقق منها tests/predict-test.js).
    const us = u && (hid === u.club ? 'h' : aid === u.club ? 'a' : null);
    const k = !us ? 1 : L[us].xi.some((x) => x.id === u.id) ? Lineup.LIVE_K.start : L[us].bench.indexOf(u.id) >= 0 ? Lineup.LIVE_K.bench : Lineup.LIVE_K.out;
    lam.h *= k; lam.a *= k;
    const N = 9, ph = pois(lam.h, N), pa = pois(lam.a, N), sc = [];
    let w = 0, d = 0, l = 0, tot = 0;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const p = ph[i] * pa[j]; tot += p;
      if (i > j) w += p; else if (i === j) d += p; else l += p;
      sc.push({ h: i, a: j, p });
    }
    sc.sort((x, y) => y.p - x.p);
    return { L, R, lam, k, pH: w / tot, pD: d / tot, pA: l / tot, top: sc.slice(0, 3).map((x) => ({ h: x.h, a: x.a, p: x.p / tot })), cs: { h: Math.exp(-lam.a), a: Math.exp(-lam.h) } };
  };
})(window.G = window.G || {});
