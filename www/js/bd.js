/* bd.js — الكرة الذهبية: ترتيب شهري للمرشحين وحفل التتويج في نهاية الموسم.
 * الدرجة (0–100) = 0.18·الشهرة + 0.20·نجاح الفريق + 0.37·الأداء + 0.25·أثر البطولات الكبرى (دوري الأبطال، حسم الدوري، كأس العالم/آسيا).
 * لا يستخدم U.rnd أبدًا: التذبذب الصغير بين اللاعبين «بصمة» ثابتة من (البذرة|الموسم|المعرّف) فلا يتأثر مسار المحاكاة. */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const BD = (G.BD = {});
  const clamp = U.clamp;
  const W = { fame: 0.18, team: 0.20, perf: 0.37, ev: 0.25 };
  const MONTH = 4;            // لقطة كل 4 أسابيع
  const LAST = 36;            // آخر لقطة شهرية (ثم النهائية في نهاية الموسم)
  BD.W = W;
  BD.FACTORS = [['fame', 'الشهرة'], ['team', 'نجاح الفريق'], ['perf', 'الأداء'], ['ev', 'البطولات الكبرى']];

  BD.get = () => {
    const S = G.S;
    if (!S.bd) S.bd = { hist: [], cur: null };
    if (!S.bd.cur || S.bd.cur.season !== S.season) S.bd.cur = { season: S.season, snaps: [], track: [], closed: false, done: false };
    return S.bd;
  };
  BD.year = (season) => G.CONFIG.startYear + (season == null ? G.S.season : season);

  const noise = (id) => ((G.World.hashStr(id + '|' + G.S.seed + '|' + G.S.season) % 1000) / 1000 - 0.5) * 3; // ±1.5
  const WG = { ST: 1, LW: 1.05, RW: 1.05, CAM: 1.15, CM: 1.5, CDM: 2, LB: 2, RB: 2, CB: 2.5, GK: 6 };
  const CW = { ST: 0.45, LW: 0.45, RW: 0.45, CAM: 0.45, CM: 0.3, LB: 0.3, RB: 0.3, CDM: 0.15, CB: 0.15, GK: 0.15 };
  const UCL_PROG = { league: 0.12, po: 0.4, r16: 0.55, qf: 0.68, sf: 0.82, final: 0.93, winner: 1 };
  const UCL_EV = { league: 0, po: 0, r16: 0.1, qf: 0.25, sf: 0.45, final: 0.65, winner: 1 };
  const NT_EV = { winner: 1, final: 0.62, third: 0.45, sf: 0.38, qf: 0.18, r16: 0.07, r32: 0.02, group: 0 };
  const PRESTIGE = { ENG1: 1, ESP1: 1, GER1: 0.92, ITA1: 0.92, FRA1: 0.85 };

  // مشاركة اللاعب في بطولة: نسبة المباريات × جودة الأداء
  function inv(apps, g, a, avg, need) {
    if (!apps) return 0;
    return clamp(apps / need, 0, 1) * clamp(0.5 + 0.35 * clamp((avg - 6.3) / 1.5, 0, 1) + 0.15 * clamp((g + a * 0.7) / (need * 0.5), 0, 1), 0, 1);
  }
  const st = (p, k) => { const s = p.st[k] || [0, 0, 0, 0, 0]; return { apps: s[0], g: s[1], a: s[2], avg: s[0] ? s[3] / s[0] : 0, min: s[4] }; };

  // معطيات الفريق لكل نادٍ: مركز الدوري، مرحلة الأبطال، بطل الدوري
  function clubCtx() {
    const S = G.S, out = {}, cur = BD.get().cur;
    G.World.order().forEach((lg) => {
      const ord = G.World.sortedOf(lg), n = ord.length, def = G.LEAGUES[lg];
      if (!n) return;
      const done = G.World.complete(lg);
      ord.forEach((id, i) => { out[id] = { lg, pos: i + 1, share: n > 1 ? (n - 1 - i) / (n - 1) : 1, prest: def.tier === 1 ? PRESTIGE[lg] || 0.9 : 0.4, champ: i === 0 && (done || cur.closed), lead: i === 0, tier: def.tier }; });
    });
    // تكريمات فردية: هدّاف/صانع كل دوري كبير (وهدّاف الأبطال)
    const hon = (out._hon = {});
    G.World.order().forEach((lg) => {
      const def = G.LEAGUES[lg];
      if (def.tier !== 1) return;
      const pr = PRESTIGE[lg] || 0.9;
      const sc = G.World.scorers(lg, 1)[0];
      if (sc && sc.st.lg[1] >= 6) hon[sc.id] = (hon[sc.id] || 0) + 14 * pr;
      const as = G.World.leaguePlayers(lg).filter((p) => p.st.lg[2] > 0).sort((a, b) => b.st.lg[2] - a.st.lg[2])[0];
      if (as && as.st.lg[2] >= 6) hon[as.id] = (hon[as.id] || 0) + 7 * pr;
    });
    const ub = Object.keys(S.players).map((k) => S.players[k]).filter((p) => p.club && p.st.uc && p.st.uc[1] >= 3).sort((a, b) => b.st.uc[1] - a.st.uc[1])[0];
    if (ub) hon[ub.id] = (hon[ub.id] || 0) + 10;
    const u = S.ucl;
    if (u) {
      const so = u.phase === 'league' ? G.Ucl.sorted() : null;
      u.teams.forEach((id) => {
        const c = out[id] || (out[id] = { lg: null, pos: 0, share: 0, prest: 0.3, champ: false, lead: false, tier: 0 });
        const ex = u.exit[id] || 'league';
        let pr = UCL_PROG[ex] || 0.12;
        if (ex === 'league' && so) pr = 0.12 + 0.28 * (36 - so.indexOf(id)) / 36; // ما زال في مرحلة الدوري
        c.ucl = ex; c.uprog = pr; c.uev = UCL_EV[ex] || 0;
      });
    }
    return out;
  }

  function legacy(id, nm) {
    const h = (G.S.bd && G.S.bd.hist) || [];
    let b = 0;
    h.forEach((x) => { if (x.winner && (x.winner.id === id || (nm && x.winner.n === nm))) b += 5; else if ((x.top || []).slice(1, 3).some((t) => t.id === id)) b += 2; });
    return Math.min(15, b);
  }

  // درجة لاعب واحد
  function score(p, cx, S, week) {
    const club = C(p.club), c = cx[p.club] || { share: 0.3, prest: 0.4, pos: 0 };
    const lg = st(p, 'lg'), uc = st(p, 'uc'), nt = st(p, 'nt');
    const apps = lg.apps + uc.apps, mins = lg.min + uc.min;
    // الشهرة
    let fame = p.user ? (G.Media ? G.Media.pop() : 20) : clamp((p.ovr - 62) * 2.7 + ((club ? club.rep : 60) - 60) * 0.35, 0, 100);
    fame = clamp(fame + legacy(p.id, p.n), 0, 100);
    // نجاح الفريق
    const ls = c.share * (c.prest || 0.4);
    const team = 100 * clamp(0.38 * ls + 0.62 * (c.uprog || 0), 0, 1);
    // الأداء
    let perf = 0;
    if (apps > 0) {
      const avg = (lg.avg * lg.apps + uc.avg * uc.apps) / apps;
      const ratingN = clamp((avg - 6.2) / 1.8, 0, 1);
      const wg = WG[p.pos] || 2, g = lg.g + uc.g, a = uc.a + lg.a;
      const contN = clamp(((g * wg + a * wg * 1.4) / apps) / 0.95, 0, 1);
      const cw = CW[p.pos] || 0.3;
      const expected = Math.max(4, week) * 90 * 0.9;
      const vol = clamp(mins / (expected * 0.6), 0, 1);
      perf = 100 * ((1 - cw) * ratingN + cw * contN) * (0.35 + 0.65 * vol);
      perf = clamp((perf - 55) / 45, 0, 1) * 100; // النجوم وحدهم فوق 55: توسيع الفروق في القمة
    }
    // أثر البطولات الكبرى
    let ev = 0;
    if (c.ucl && c.uev) ev += 100 * c.uev * inv(uc.apps, uc.g, uc.a, uc.avg, 7);
    if (c.tier === 1) {
      const iv = inv(lg.apps, lg.g, lg.a, lg.avg, 24);
      if (c.champ) ev += 55 * c.prest * iv;
      else if (c.lead && week >= 24) ev += 55 * c.prest * iv * 0.5 * clamp((week - 24) / 15, 0, 1);
    } else if (c.tier === 2 && c.champ) ev += 10 * inv(lg.apps, lg.g, lg.a, lg.avg, 24);
    const I = S.intl, cur = S.bd.cur;
    if (I && I.done && cur.closed && nt.apps > 0 && I.res[p.nat] !== undefined) {
      const res = G.Intl.finalRes(I, p.nat), k = I.type === 'WC' ? 1 : 0.45;
      let v = 100 * (NT_EV[res] || 0) * inv(nt.apps, nt.g, nt.a, nt.avg, 4);
      if (I.mvp && I.mvp.pid === p.id) v += 25;
      if (I.boot && I.boot.pid === p.id) v += 15;
      ev += v * k;
    }
    const hz = cx._hon || {}, k0 = cur.closed ? 1 : clamp((week - 8) / 28, 0.2, 1);
    if (hz[p.id]) ev += hz[p.id] * k0;
    ev = clamp(ev, 0, 100);
    let total0 = W.fame * fame + W.team * team + W.perf * perf + W.ev * ev + noise(p.id);
    const total = total0 > 92 ? 92 + (total0 - 92) * 0.5 : total0; // سقف ناعم يحفظ الترتيب
    return { fame: Math.round(fame), team: Math.round(team), perf: Math.round(perf), ev: Math.round(ev), t: Math.round(total * 10) / 10 };
  }

  // الترتيب الكامل (يُرجع القائمة مرتبة)
  BD.rank = (week) => {
    const S = G.S, cx = clubCtx(), out = [];
    BD.get();
    Object.keys(S.players).forEach((id) => {
      const p = S.players[id];
      if (!p.club || p.ntc || !C(p.club) || C(p.club).nt || p.age < 16) return;
      if (!p.user && p.ovr < 66) return;
      const s = score(p, cx, S, week == null ? S.week : week);
      s.id = id;
      out.push(s);
    });
    out.sort((a, b) => b.t - a.t);
    return out;
  };

  const brief = (e, rank) => {
    const p = P(e.id), club = p && C(p.club);
    return { id: e.id, n: p ? p.n : '—', club: club ? club.name : '—', cid: p ? p.club : null, nat: p ? p.nat : '', pos: p ? p.pos : '', ovr: p ? p.ovr : 0, t: e.t, fame: e.fame, team: e.team, perf: e.perf, ev: e.ev, rank, user: !!(p && p.user) };
  };

  // لقطة شهرية: تُحفظ أفضل 20 + ترتيب اللاعب المستخدم
  BD.snapshot = (w, final) => {
    const S = G.S, b = BD.get(), cur = b.cur, list = BD.rank(w), uid = S.user;
    const mi = list.findIndex((e) => e.id === uid);
    const prev = cur.snaps.length ? cur.snaps[cur.snaps.length - 1] : null;
    const prevRank = {}; if (prev) prev.list.forEach((x) => { prevRank[x.id] = x.rank; });
    const top = list.slice(0, 20).map((e, i) => { const x = brief(e, i + 1); x.d = prevRank[e.id] ? prevRank[e.id] - (i + 1) : null; return x; });
    const me = mi >= 0 ? brief(list[mi], mi + 1) : null;
    if (me) me.d = prev && prev.me ? prev.me.rank - me.rank : null;
    // فرص الفوز (softmax على أفضل 30)
    const top30 = list.slice(0, 30), mx = top30.length ? top30[0].t : 0, ex = top30.map((e) => Math.exp((e.t - mx) / 3.5)), sum = ex.reduce((s, v) => s + v, 0) || 1;
    top.forEach((x, i) => { x.pr = Math.round(ex[i] / sum * 100); });
    if (me) me.pr = mi < 30 ? Math.round(ex[mi] / sum * 100) : 0;
    const snap = { w, final: !!final, list: top, me, n: list.length };
    cur.snaps.push(snap); if (cur.snaps.length > 2) cur.snaps.shift();
    if (me) cur.track.push({ w, r: me.rank, t: me.t });
    return snap;
  };

  // يُستدعى بعد كل أسبوع منتهٍ
  BD.weekly = (w) => {
    if (w < MONTH || w > LAST || w % MONTH !== 0) return null;
    const snap = BD.snapshot(w, false), u = P(G.S.user);
    if (G.Press) G.safe(() => G.Press.onBDMonth(snap), 'press');
    if (snap.me && snap.list.length) {
      const lead = snap.list[0], me = snap.me;
      const t = me.rank <= 30 ? 'أنت في المركز ' + me.rank + ' بين المرشحين للكرة الذهبية (' + me.t.toFixed(1) + ' نقطة).' : 'لم تدخل بعدُ قائمة أفضل 30 مرشحًا للكرة الذهبية (المركز ' + me.rank + ').';
      G.Inbox.add('news', 'ترتيب الكرة الذهبية — ' + (w / MONTH) + '/9', t + ' المتصدر: ' + lead.n + ' (' + lead.club + ' · ' + lead.t.toFixed(1) + ').' + (me.rank > 1 && me.rank <= 30 ? ' الفارق عن الصدارة ' + (lead.t - me.t).toFixed(1) + ' نقطة.' : ''));
    }
    return snap;
  };

  // نهاية الموسم: إغلاق الموسم (حسم الدوري) ثم محاولة التتويج
  BD.seasonEnd = () => { BD.get().cur.closed = true; };
  BD.afterTournament = () => { BD.tryFinalize(); };
  BD.tryFinalize = () => {
    const S = G.S, cur = BD.get().cur;
    if (!cur.closed || cur.done) return null;
    if (S.intl && !S.intl.done) return null;       // ننتظر نهاية كأس العالم/آسيا
    return BD.finalize();
  };

  BD.finalize = () => {
    const S = G.S, b = BD.get(), cur = b.cur, u = P(S.user);
    cur.done = true;
    const snap = BD.snapshot(39, true), list = snap.list, me = snap.me;
    const I = S.intl && S.intl.done ? S.intl : null;
    const win = list[0];
    const rec = {
      season: S.season, year: BD.year(), label: G.Season.label(S.season), winner: { id: win.id, n: win.n, club: win.club, nat: win.nat, pos: win.pos, t: win.t, user: win.user },
      top: list.slice(0, 10).map((x) => ({ id: x.id, n: x.n, club: x.club, nat: x.nat, t: x.t, user: x.user })),
      me: me ? { rank: me.rank, t: me.t, fame: me.fame, team: me.team, perf: me.perf, ev: me.ev } : null,
      tour: I ? { type: I.type, winner: I.winner } : null
    };
    b.hist.push(rec);
    if (b.hist.length > 40) b.hist.shift();
    S.bdLast = rec;
    u.bdCar = u.bdCar || [];
    if (me) u.bdCar.push({ y: rec.year, r: me.rank, t: me.t });
    if (win.user) {
      u.trophies = u.trophies || {}; u.trophies.bd = (u.trophies.bd || 0) + 1;
      G.Inbox.add('award', 'الكرة الذهبية ' + rec.year + '!', 'تُوِّجتَ بالكرة الذهبية ' + rec.year + ' بأعلى درجة (' + win.t.toFixed(1) + ') — أفضل لاعب في العالم! 🏆');
    } else if (me && me.rank <= 3) {
      G.Inbox.add('award', 'الكرة الذهبية ' + rec.year + ': المركز ' + me.rank, 'احتللتَ المركز ' + me.rank + ' في ترتيب الكرة الذهبية ' + rec.year + '. الفائز: ' + win.n + ' (' + win.club + ').');
    } else if (me && me.rank <= 10) {
      G.Inbox.add('award', 'الكرة الذهبية ' + rec.year + ': ضمن أفضل 10', 'جئتَ في المركز ' + me.rank + ' بين أفضل لاعبي العالم. الفائز: ' + win.n + ' (' + win.club + ').');
    } else {
      G.Inbox.add('news', 'الكرة الذهبية ' + rec.year, 'فاز بها ' + win.n + ' (' + win.club + ')' + (me ? ' · ترتيبك ' + me.rank : '') + '.');
    }
    // أثر الشهرة على اللاعب
    if (G.Media && G.S.media) {
      const m = G.S.media, d = win.user ? 9 : me && me.rank <= 3 ? 3 : me && me.rank <= 10 ? 1.2 : 0;
      if (d) m.pop = Math.round(clamp(m.pop + d, 0, 100) * 100) / 100;
    }
    if (G.Press) G.safe(() => G.Press.onBD && G.Press.onBD(rec), 'press');
    return rec;
  };

  // مراكز اللاعب المستخدم عبر السنين (للعرض)
  BD.userBest = () => { const c = P(G.S.user).bdCar || []; return c.length ? c.reduce((m, x) => Math.min(m, x.r), 9999) : null; };

  G.migrations = G.migrations || [];
  G.migrations.push(() => { const S = G.S; if (S && !S.bd) S.bd = { hist: [], cur: null }; });
})(window.G = window.G || {});
