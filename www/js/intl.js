/* intl.js — المنتخبات الوطنية: كأس العالم (48 منتخبًا) وكأس آسيا (24 منتخبًا).
 * تُقام في صيف نهاية الموسم (بعد آخر مباراة وقبل الانتقال للموسم التالي): كأس العالم عند (سنة نهاية الموسم % 4 = 2) وكأس آسيا عند (= 3).
 * التمثيل: نوادٍ «مجسّمة» NT_xx بلا تشكيلة (للأسماء والشارات)؛ تشكيلات المنتخبات مختصرة في S.intl.squads (نجوم حقيقيون من اللعبة + أسماء مولّدة)،
 * ومباريات الذكاء الاصطناعي بواسون من مستوى المنتخب، أما مباريات اللاعب نفسه فتُلعب بمحرك المباراة الكامل على لاعبين مؤقتين (ntc) يُحذفون لاحقًا. */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const Intl = (G.Intl = {});
  const NTID = (c) => 'NT_' + c;
  const codeOf = (id) => String(id).slice(3);
  const W_SCORE = { ST: 8, LW: 6, RW: 6, CAM: 5, CM: 2.5, CDM: 1, LB: 1, RB: 1, CB: 1.4, GK: 0.02 };
  const W_ASSIST = { CAM: 7, LW: 6, RW: 6, CM: 4, LB: 3, RB: 3, ST: 2.5, CDM: 2, CB: 0.7, GK: 0.05 };
  const QUOTA = { GK: 3, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 1, LW: 2, RW: 2, ST: 2 };
  const hashStr = (s) => G.World.hashStr(String(s));

  Intl.NTID = NTID;
  Intl.endYear = (season) => G.CONFIG.startYear + season;
  Intl.dueType = (season) => {
    const y = Intl.endYear(season);
    const k = Object.keys(G.TOURS).find((t) => y % 4 === G.TOURS[t].mod);
    return k || null;
  };
  Intl.label = (type, year) => G.TOURS[type].ar + ' ' + year;
  Intl.name = (code) => (G.NATIONS[code] ? G.NATIONS[code].ar : code);
  Intl.active = () => !!(G.S && G.S.intl && !G.S.intl.done);
  Intl.hist = () => (G.S.intlHist = G.S.intlHist || []);

  // مستوى المنتخب (بعد الانجراف البطيء عبر السنين)
  Intl.lvlBase = (code) => (G.NATIONS[code] ? G.NATIONS[code].lvl : 50) + ((G.S.ntDrift || {})[code] || 0);
  Intl.lvl = (code) => { const I = G.S.intl; return I && I.lv && I.lv[code] != null ? I.lv[code] : Intl.lvlBase(code); };
  Intl.eff = (code) => 0.62 * Intl.lvl(code) + 29.8;

  // ---------- التجهيز ----------
  function byNat() {
    const out = {};
    Object.keys(G.S.players).forEach((id) => {
      const p = G.S.players[id];
      if (!p.user && p.club && !p.ntc && p.age <= 38) (out[p.nat] = out[p.nat] || []).push(p);
    });
    Object.keys(out).forEach((k) => out[k].sort((a, b) => b.ovr - a.ovr));
    return out;
  }
  // تشكيلة مختصرة (23): نجوم حقيقيون من اللعبة بحسب المراكز، وتُكمَل بأسماء مولّدة. العنصر: [المعرّف|0, الاسم, المركز, التقييم]
  function buildSquad(code, real, lvl) {
    const n = G.NATIONS[code], q = 0.62 * lvl + 31, quota = Object.assign({}, QUOTA), sq = [];
    (real || []).forEach((p) => { if (quota[p.pos] > 0 && sq.length < 23) { quota[p.pos]--; sq.push([p.id, p.n, p.pos, p.ovr]); } });
    Object.keys(quota).forEach((pos) => {
      for (let k = 0; k < quota[pos]; k++) {
        const drop = k === 0 ? U.rnd() * 2 - 1 : 3 + k * 2 + U.rnd() * 3;
        sq.push([0, G.Players.genName(n.group), pos, U.clamp(Math.round(q - drop + U.gauss() * 1.6), 40, 94)]);
      }
    });
    return sq;
  }
  function mkStub(code) {
    const n = G.NATIONS[code];
    return { id: NTID(code), name: n.ar, code, country: 'NT', rep: Math.round(Intl.lvl(code)), c: n.c.slice(), form: '4-3-3', squad: [], tb: 0, wcap: 0, liga: false, lg: null, light: true, nt: true };
  }
  const seedsOrder = (n) => { let a = [1, 2]; while (a.length < n) { const m = a.length * 2 + 1; a = a.reduce((o, x) => o.concat([x, m - x]), []); } return a; };

  Intl.setup = (type) => {
    const S = G.S, T = G.TOURS[type], year = Intl.endYear(S.season), u = P(S.user);
    const lv = {};
    G.NATION_ORDER.forEach((c) => { lv[c] = Intl.lvlBase(c); });
    const unat = u.nat, ubase = lv[unat];
    let bonus = 0;
    if (ubase != null) { bonus = U.clamp((u.ovr - (0.62 * ubase + 29.8)) * 0.2, 0, 3); lv[unat] += bonus; }
    // التصفيات (مختصرة): المستوى + تذبذب، حسب مقاعد كل قارة. المستضيفون يتأهلون تلقائيًا
    const pool = G.NATION_ORDER.filter((c) => !T.conf || G.NATIONS[c].conf === T.conf);
    const sc = {}; pool.forEach((c) => { sc[c] = lv[c] + U.gauss() * 4.5; });
    let hosts = (G.TOUR_HOSTS[year] || []).filter((c) => pool.indexOf(c) >= 0);
    if (!hosts.length) hosts = [U.pick(pool.slice().sort((a, b) => lv[b] - lv[a]).slice(0, 8))];
    const teams = hosts.slice();
    if (T.slots) {
      Object.keys(T.slots).forEach((conf) => {
        const need = T.slots[conf] - teams.filter((c) => G.NATIONS[c].conf === conf).length;
        pool.filter((c) => G.NATIONS[c].conf === conf && teams.indexOf(c) < 0).sort((a, b) => sc[b] - sc[a]).slice(0, Math.max(0, need)).forEach((c) => teams.push(c));
      });
    }
    // مقاعد الملحق العالمي: أفضل منتخبات غير أوروبية لم تتأهل مباشرة
    if (T.playoffs) pool.filter((c) => teams.indexOf(c) < 0 && G.NATIONS[c].conf !== 'UEFA').sort((a, b) => sc[b] - sc[a]).slice(0, T.playoffs).forEach((c) => teams.push(c));
    pool.filter((c) => teams.indexOf(c) < 0).sort((a, b) => sc[b] - sc[a]).forEach((c) => { if (teams.length < T.teams) teams.push(c); });
    // القرعة: أوعية بحسب المستوى (المستضيفون في الوعاء الأول)، ولا يجتمع أكثر من فريق من القارة نفسها (أوروبا حتى 2) في مجموعة
    const nG = T.groups, order = hosts.concat(teams.filter((c) => hosts.indexOf(c) < 0).sort((a, b) => lv[b] - lv[a]));
    const pots = [0, 1, 2, 3].map((k) => order.slice(k * nG, (k + 1) * nG));
    const cok = (g, conf) => !!T.conf || g.filter((c) => G.NATIONS[c].conf === conf).length < (conf === 'UEFA' ? 2 : 1);
    let groups = null;
    for (let att = 0; att < 300 && !groups; att++) {
      const g = []; for (let i = 0; i < nG; i++) g.push([]);
      U.shuffle(pots[0].slice()).forEach((c, i) => g[i].push(c));
      let ok = true;
      for (let k = 1; k < 4 && ok; k++) {
        const free = U.shuffle(g.map((x, i) => i));
        for (const c of U.shuffle(pots[k].slice())) {
          const at = free.findIndex((i) => cok(g[i], G.NATIONS[c].conf));
          if (at < 0) { ok = false; break; }
          g[free[at]].push(c); free.splice(at, 1);
        }
      }
      if (ok) groups = g;
    }
    if (!groups) { groups = []; for (let i = 0; i < nG; i++) groups.push([]); order.forEach((c, i) => groups[i % nG].push(c)); }
    const I = S.intl = { id: type + year, type, year, name: Intl.label(type, year), teams, groups, lv, hosts, day: 1, stage: 'group', ko: false, fx: [], table: {}, res: {}, pl: {}, squads: {}, done: false, user: null, boot: null, mvp: null };
    const pairs = [[[0, 1], [2, 3]], [[0, 2], [3, 1]], [[3, 0], [1, 2]]];
    groups.forEach((g, gi) => {
      g.forEach((c) => { I.table[c] = { g: gi, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; I.res[c] = 'group'; });
      pairs.forEach((dayPairs, di) => dayPairs.forEach((pr) => { I.fx.push({ id: 'NT' + year + type + '-g' + gi + '-' + (di + 1) + '-' + g[pr[0]] + g[pr[1]], comp: 'NT', day: di + 1, stage: 'group', g: gi, h: NTID(g[pr[0]]), a: NTID(g[pr[1]]), played: false, hg: null, ag: null, w: di + 1 }); }));
    });
    // نوادٍ مجسّمة + تشكيلات
    const pl = byNat();
    teams.forEach((c) => { S.clubs[NTID(c)] = mkStub(c); I.squads[c] = buildSquad(c, pl[c], lv[c]); });
    // حالة اللاعب المستخدم
    const qual = teams.indexOf(unat) >= 0;
    I.user = { nat: unat, qualified: qual, bonus: Math.round(bonus * 10) / 10, role: null, called: false, missed: 0, apps0: u.st.nt ? u.st.nt[0] : 0 };
    if (qual) { const r = Intl.userRole(); I.user.role = r.role; I.user.called = r.role !== 'out'; I.user.diff = r.diff; }
    return I;
  };

  // دور اللاعب في منتخب بلده (يقارن تقييمه بأضعف أساسي في المنتخب، كما في النادي)
  Intl.userRole = () => {
    const S = G.S, u = P(S.user), I = S.intl;
    const base = I && I.lv ? I.lv[u.nat] - (I.user ? I.user.bonus : 0) : Intl.lvlBase(u.nat);
    const eff = 0.62 * base + 29.8;
    const form = G.Coach.formAvg(u);
    let mine = u.ovr + (form - 6.5) * 1.2;
    if (u.age <= 21) mine += Math.min(3, Math.max(0, (u.pot - u.ovr) * 0.1));
    const diff = mine - (eff - 2.5);
    const role = diff >= 0.5 ? 'starter' : diff >= -2.5 ? 'rotation' : diff >= -10 ? 'bench' : 'out';
    return { role, diff: Math.round(diff * 10) / 10 };
  };
  Intl.userTeam = () => { const I = G.S.intl; return I && I.user && I.user.qualified && I.user.called ? NTID(I.user.nat) : null; };
  // هل يستطيع اللاعب خوض المباراة (غير مصاب/موقوف)؟
  Intl.userAvail = () => { const u = P(G.S.user); return !(u.inj > 0 || u.susp > 0); };

  // ---------- الاستدعاء من نهاية الموسم ----------
  Intl.onSeasonEnd = () => {
    const S = G.S, type = Intl.dueType(S.season);
    if (!type) return null;
    const I = Intl.setup(type), u = P(S.user), T = G.TOURS[type];
    const nm = Intl.label(type, I.year);
    if (I.user.qualified) {
      G.Inbox.add('news', nm + ': تأهّل ' + Intl.name(u.nat), 'تأهّل منتخب ' + Intl.name(u.nat) + ' إلى ' + nm + '. ' + (I.user.called ? 'تلقيتَ دعوة الانضمام إلى المنتخب (دورك المتوقع: ' + G.Coach.ROLE_AR[I.user.role] + ').' : 'لم يشمل المدرب اسمك في القائمة هذه المرة — طوّر مستواك لتنافس على مكان.'));
    } else {
      G.Inbox.add('news', nm + ': ' + (T.conf && G.NATIONS[u.nat] && G.NATIONS[u.nat].conf !== T.conf ? 'بطولة قارية لا تخص منتخبك' : 'غاب منتخبك'), (T.conf && G.NATIONS[u.nat] && G.NATIONS[u.nat].conf !== T.conf ? 'تُقام ' + nm + ' الآن، ويمكنك متابعتها من صفحة المنتخبات.' : 'لم يتأهل ' + Intl.name(u.nat) + ' إلى ' + nm + '. يمكنك متابعة البطولة من صفحة المنتخبات.'));
    }
    Intl.run(); // بلا مباريات للاعب: تُحاكى البطولة كاملة فورًا؛ وإلا تُحاكى الأيام حتى أول مباراة له
    return I;
  };

  // ---------- ترتيب المجموعات ----------
  const tieKey = (c) => hashStr(c + '|' + (G.S.intl ? G.S.intl.id : ''));
  const cmp = (I) => (a, b) => { const x = I.table[a], y = I.table[b]; return (y.pts - x.pts) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf) || (tieKey(a) - tieKey(b)); };
  Intl.groupOrder = (gi) => { const I = G.S.intl; return I.groups[gi].slice().sort(cmp(I)); };
  const rec = (t, gf, ga) => { t.p++; t.gf += gf; t.ga += ga; if (gf > ga) { t.w++; t.pts += 3; } else if (gf === ga) { t.d++; t.pts++; } else t.l++; };

  Intl.findFix = (id) => { const I = G.S.intl; return I ? I.fx.find((f) => f.id === id) || null : null; };

  Intl.record = (fix, hg, ag, pens) => {
    const I = G.S.intl;
    if (fix.played) throw new Error('مباراة منتخبات مكررة: ' + fix.id);
    fix.played = true; fix.hg = hg; fix.ag = ag; fix.pens = pens || null;
    const h = codeOf(fix.h), a = codeOf(fix.a);
    if (fix.stage === 'group') { rec(I.table[h], hg, ag); rec(I.table[a], ag, hg); }
    else {
      fix.win = hg !== ag ? (hg > ag ? h : a) : (pens && pens.h > pens.a ? h : a);
      const los = fix.win === h ? a : h;
      if (fix.stage !== 'third') I.res[los] = fix.stage;
      if (fix.stage === 'final') I.res[fix.win] = 'winner';
    }
  };

  // ---------- محاكاة مباراة بين منتخبين (ذكاء اصطناعي) ----------
  function xiOf(sq) {
    const used = {}, out = [];
    const pick = (poss, n) => sq.filter((e) => poss.indexOf(e[2]) >= 0 && !used[e[1]]).sort((a, b) => b[3] - a[3]).slice(0, n).forEach((e) => { used[e[1]] = true; out.push(e); });
    pick(['GK'], 1); pick(['CB'], 2); pick(['LB'], 1); pick(['RB'], 1); pick(['CDM'], 1); pick(['CM'], 1); pick(['CAM', 'CM', 'CDM'], 1); pick(['LW'], 1); pick(['ST'], 1); pick(['RW'], 1);
    sq.slice().sort((a, b) => b[3] - a[3]).forEach((e) => { if (out.length < 11 && !used[e[1]]) { used[e[1]] = true; out.push(e); } });
    return out;
  }
  const wS = (e) => (W_SCORE[e[2]] || 1) * Math.pow(Math.max(30, e[3]) / 65, 2.5);
  const wA = (e) => (W_ASSIST[e[2]] || 1) * Math.pow(Math.max(30, e[3]) / 65, 2.5);
  const keyOf = (code, e) => (e[0] ? e[0] : code + ':' + e[1]);
  function bump(I, code, e, g, a) {
    const k = keyOf(code, e), o = I.pl[k] || (I.pl[k] = { n: e[1], nat: code, pid: e[0] || null, g: 0, a: 0 });
    o.g += g; o.a += a;
  }

  Intl.simAI = (fix) => {
    const I = G.S.intl, ch = codeOf(fix.h), ca = codeOf(fix.a);
    const host = (c) => (I.hosts.indexOf(c) >= 0 ? 1.4 : 0);
    const eh = Intl.eff(ch) + host(ch) + U.gauss() * 1.1, ea = Intl.eff(ca) + host(ca) + U.gauss() * 1.1;
    const Rh = { A: eh, D: eh, M: eh }, Ra = { A: ea, D: ea, M: ea };
    const lam = { h: G.Lineup.lambda(Rh, Ra, null), a: G.Lineup.lambda(Ra, Rh, null) };
    let hg = U.poisson(lam.h), ag = U.poisson(lam.a), pens = null, et = false;
    if (fix.stage !== 'group' && hg === ag) {
      et = true; hg += U.poisson(lam.h * 0.33); ag += U.poisson(lam.a * 0.33);
      if (hg === ag) pens = G.Match.shootout(eh, ea);
    }
    const mins = et ? 120 : 90, res = { h: hg > ag ? 'w' : hg < ag ? 'l' : 'd', a: ag > hg ? 'w' : ag < hg ? 'l' : 'd' };
    [['h', ch, hg, ag], ['a', ca, ag, hg]].forEach((x) => {
      const side = x[0], code = x[1], gf = x[2], ga = x[3], xi = xiOf(I.squads[code] || []), goals = {}, ast = {};
      for (let i = 0; i < gf; i++) {
        const sc = U.wpick(xi, wS);
        if (!sc) continue;
        goals[sc[1]] = (goals[sc[1]] || 0) + 1;
        if (U.rnd() < 0.72) { const as = U.wpick(xi.filter((e) => e !== sc), wA); if (as) ast[as[1]] = (ast[as[1]] || 0) + 1; }
      }
      xi.forEach((e) => {
        const g = goals[e[1]] || 0, a = ast[e[1]] || 0;
        if (g || a) bump(I, code, e, g, a);
        if (e[0] && P(e[0])) G.Match.addStat(e[0], 'nt', mins, g, a, G.Match.rating(e[2], { mins, res: res[side], g, a, cs: ga === 0, conc: ga }));
      });
    });
    Intl.record(fix, hg, ag, pens);
    return fix;
  };

  // ---------- تقدّم البطولة ----------
  function startKO() {
    const I = G.S.intl, T = G.TOURS[I.type], cm = cmp(I);
    const wins = [], runs = [], thirds = [];
    I.groups.forEach((g, gi) => { const o = Intl.groupOrder(gi); wins.push(o[0]); runs.push(o[1]); thirds.push(o[2]); });
    const best3 = thirds.sort(cm).slice(0, T.thirds);
    const seeded = wins.sort(cm).concat(runs.sort(cm), best3);
    const adv = {}; seeded.forEach((c) => { adv[c] = true; });
    I.teams.forEach((c) => { if (!adv[c]) I.res[c] = 'group'; });
    I.ko = true; I.stage = T.ko[0];
    const ord = seedsOrder(seeded.length);
    for (let i = 0; i < ord.length; i += 2) mkKoFix(I.stage, seeded[ord[i] - 1], seeded[ord[i + 1] - 1], i / 2);
  }
  function mkKoFix(stage, h, a, i) {
    const I = G.S.intl;
    I.fx.push({ id: 'NT' + I.year + I.type + '-' + stage + '-' + i, comp: 'NT', day: I.day, stage, h: NTID(h), a: NTID(a), played: false, hg: null, ag: null, w: I.day, neutral: true });
    I.res[h] = stage; I.res[a] = stage;
  }
  function nextStage() {
    const I = G.S.intl, T = G.TOURS[I.type], prev = I.fx.filter((f) => f.stage === I.stage);
    const st = T.ko[T.ko.indexOf(I.stage) + 1];
    I.stage = st;
    for (let i = 0; i < prev.length; i += 2) mkKoFix(st, prev[i].win, prev[i + 1].win, i / 2);
    if (st === 'final' && T.third && prev.length === 2) { // مباراة المركز الثالث في اليوم نفسه
      const lo = prev.map((f) => (f.win === codeOf(f.h) ? codeOf(f.a) : codeOf(f.h)));
      I.fx.push({ id: 'NT' + I.year + I.type + '-third-0', comp: 'NT', day: I.day, stage: 'third', h: NTID(lo[0]), a: NTID(lo[1]), played: false, hg: null, ag: null, w: I.day, neutral: true });
    }
  }
  function progress() {
    const I = G.S.intl;
    if (!I.ko) { if (I.fx.filter((f) => f.stage === 'group').every((f) => f.played)) startKO(); return; }
    if (I.fx.filter((f) => f.stage === I.stage).every((f) => f.played)) { if (I.stage === 'final') Intl.finish(); else nextStage(); }
  }

  // أيام البطولة: يحاكي مباريات اليوم (عدا مباراة اللاعب إن كانت قائمة) ثم يغلق اليوم
  Intl.pending = () => {
    const I = G.S.intl;
    if (!I || I.done) return null;
    const ut = Intl.userTeam();
    if (!ut || !Intl.userAvail()) return null;
    return I.fx.find((f) => !f.played && f.day === I.day && (f.h === ut || f.a === ut)) || null;
  };
  Intl.step = () => {
    const S = G.S, I = S.intl, u = P(S.user);
    if (!I || I.done) return false;
    const ut = Intl.userTeam();
    I.fx.filter((f) => !f.played && f.day === I.day).forEach((f) => {
      if (ut && (f.h === ut || f.a === ut) && Intl.userAvail()) return; // مباراة اللاعب تُلعب بيده
      if (ut && (f.h === ut || f.a === ut)) I.user.missed++;            // غاب للإصابة/الإيقاف
      Intl.simAI(f);
    });
    if (I.done) return true;
    if (I.fx.some((f) => !f.played && f.day === I.day)) return false;
    I.day++;
    if (u.inj > 0) u.inj = Math.max(0, u.inj - 1);
    if (u.susp > 0) u.susp = Math.max(0, u.susp - 1);
    progress();
    return true;
  };
  // يتقدّم حتى مباراة اللاعب التالية (أو نهاية البطولة)
  Intl.run = () => {
    const I = G.S.intl;
    let guard = 0;
    while (I && !I.done && guard++ < 60) {
      if (Intl.pending()) return I;
      const moved = Intl.step();
      if (!moved && Intl.pending()) return I;
    }
    return I;
  };
  // محاكاة كل شيء بما فيها مباريات اللاعب (تستخدم محرك المباراة الكامل)
  Intl.autoFinish = () => {
    const I = G.S.intl;
    let guard = 0;
    while (I && !I.done && guard++ < 80) {
      const pf = Intl.pending();
      if (pf) G.Season.simUserMatch(pf.id);
      else Intl.step();
    }
    return I;
  };

  // ---------- مباريات اللاعب (محرك المباراة الكامل) ----------
  function fillSquad(code, withUser) {
    const S = G.S, I = S.intl, club = C(NTID(code)), sq = I.squads[code] || [], u = P(S.user), n = G.NATIONS[code];
    club.squad = [];
    const top = sq.slice().sort((a, b) => b[3] - a[3]).slice(0, 14);
    const shift = Intl.eff(code) - U.avg(top.map((e) => e[3])) + 0.8; // مواءمة القوة مع مستوى المنتخب (كما للأندية)
    let skip = null;
    if (withUser) {
      const grp = G.POS_GROUP[u.pos];
      const cand = sq.filter((e) => G.POS_GROUP[e[2]] === grp).sort((a, b) => a[3] - b[3]);
      skip = (cand[0] || sq[sq.length - 1]);
    }
    let num = 1;
    sq.forEach((e) => {
      if (e === skip) return;
      if (withUser && num === u.num) num++;
      const p = G.Players.gen({ pos: e[2], ovr: U.clamp(Math.round(e[3] + shift), 42, 94), age: U.int(22, 33), nat: code, group: n.group, club: NTID(code) });
      p.n = e[1]; p.ntc = 1; p.orig = e[0] || null; p.num = num++;
      S.players[p.id] = p; club.squad.push(p.id);
    });
    if (withUser) club.squad.push(u.id);
  }
  Intl.cleanup = () => {
    const S = G.S;
    Object.keys(S.players).forEach((id) => { if (S.players[id].ntc) delete S.players[id]; });
    Object.keys(S.clubs).forEach((id) => { if (S.clubs[id].nt) S.clubs[id].squad = []; });
  };
  Intl.prepare = (fix) => {
    const S = G.S, u = P(S.user), ut = Intl.userTeam();
    Intl.cleanup();
    [fix.h, fix.a].forEach((id) => fillSquad(codeOf(id), id === ut));
    const r = Intl.userRole();
    u.role = r.role; u.roleInfo = { text: 'منتخب ' + Intl.name(u.nat) + ' — ' + G.Coach.ROLE_AR[r.role], diff: r.diff };
    return fix;
  };
  Intl.matchOpts = (fix) => ({ comp: 'nt', neutral: true, userClub: Intl.userTeam(), ko: fix.stage === 'group' ? null : { prevH: 0, prevA: 0, final: fix.stage === 'final' } });

  // بعد اعتماد نتيجة مباراة اللاعب: تُسجَّل، وتُنسب أهداف اللاعبين الحقيقيين، ثم تُحاكى بقية مباريات اليوم وتتقدّم البطولة
  Intl.afterUserMatch = (fix, m) => {
    const I = G.S.intl, ch = codeOf(fix.h), ca = codeOf(fix.a);
    Intl.record(fix, m.score.h, m.score.a, m.pens);
    const ut = Intl.userTeam(), uc = ut ? codeOf(ut) : null;
    [ch, ca].forEach((code) => {
      Object.keys(m.ps).forEach((id) => {
        const p = P(id), ps = m.ps[id];
        if (!p) return;
        if (p.user) {
          if (code === uc && (ps.g || ps.a)) { const o = I.pl[id] || (I.pl[id] = { n: p.n, nat: code, pid: id, g: 0, a: 0 }); o.g += ps.g; o.a += ps.a; }
          return;
        }
        if (p.club !== NTID(code)) return;
        if (ps.g || ps.a) { const k = p.orig || code + ':' + p.n, o = I.pl[k] || (I.pl[k] = { n: p.n, nat: code, pid: p.orig || null, g: 0, a: 0 }); o.g += ps.g; o.a += ps.a; }
        const mins = m.result.mins[id] || 0;
        if (mins > 0 && p.orig && P(p.orig)) G.Match.addStat(p.orig, 'nt', mins, ps.g, ps.a, m.result.ratings[id] || 6.5);
      });
    });
    Intl.step(); // بقية مباريات اليوم
    Intl.run();
  };

  // ---------- النهاية والتاريخ ----------
  const STAGE_PTS = { winner: 0.8, final: 0.5, sf: 0.3, qf: 0.1 };
  Intl.finish = () => {
    const S = G.S, I = S.intl, T = G.TOURS[I.type], u = P(S.user);
    if (I.done) return I;
    const fin = I.fx.find((f) => f.stage === 'final');
    I.winner = fin.win; I.runner = fin.win === codeOf(fin.h) ? codeOf(fin.a) : codeOf(fin.h);
    const th = I.fx.find((f) => f.stage === 'third');
    I.third = th && th.win ? th.win : null;
    I.sf = I.fx.filter((f) => f.stage === 'sf').map((f) => (f.win === codeOf(f.h) ? codeOf(f.a) : codeOf(f.h)));
    // هدّاف البطولة
    const pl = Object.keys(I.pl).map((k) => I.pl[k]).sort((a, b) => (b.g - a.g) || (b.a - a.a));
    I.boot = pl[0] || null;
    // أفضل لاعب (من اللاعبين الحقيقيين واللاعب المستخدم): متوسط التقييم + إسهام تهديفي + تقدّم فريقه
    let best = null, bs = -1;
    Object.keys(S.players).forEach((id) => {
      const p = S.players[id], st = p.st && p.st.nt;
      if (p.ntc || !st || st[0] < 3) return;
      const code = p.nat, res = I.res[code];
      const sc = st[3] / st[0] + 0.25 * st[1] + 0.15 * st[2] + (STAGE_PTS[res] || 0);
      if (sc > bs) { bs = sc; best = p; }
    });
    I.mvp = best ? { pid: best.id, n: best.n, nat: best.nat, user: !!best.user } : null;
    I.done = true;
    // انجراف مستويات المنتخبات بحسب النتائج
    S.ntDrift = S.ntDrift || {};
    I.teams.forEach((c) => {
      const base = G.NATIONS[c].lvl, r = I.res[c];
      const d = (r === 'winner' ? 1.4 : r === 'final' ? 0.8 : r === 'sf' ? 0.4 : r === 'group' ? -0.35 : 0) + U.gauss() * 0.35;
      S.ntDrift[c] = U.clamp(Math.round(((S.ntDrift[c] || 0) + d) * 10) / 10, -9, 9);
      if (base + S.ntDrift[c] > 96) S.ntDrift[c] = 96 - base;
    });
    // سجل اللاعب المستخدم
    const nat = I.user.nat, qs = I.user.qualified, st = u.st.nt || [0, 0, 0, 0, 0];
    const entry = { y: I.year, t: I.type, nat, q: qs, called: I.user.called, res: qs ? Intl.finalRes(I, nat) : null, apps: st[0], g: st[1], a: st[2], avg: st[0] ? Math.round(st[3] / st[0] * 100) / 100 : 0, min: st[4], title: false, mvp: !!(I.mvp && I.mvp.user), boot: !!(I.boot && I.boot.pid === u.id) };
    if (qs && I.winner === nat && st[0] >= 2) { entry.title = true; u.trophies = u.trophies || {}; u.trophies[T.key] = (u.trophies[T.key] || 0) + 1; }
    u.ntCar = u.ntCar || []; u.ntCar.push(entry);
    I.userEntry = entry;
    // التاريخ العام
    Intl.hist().push({ id: I.id, type: I.type, year: I.year, name: I.name, winner: I.winner, runner: I.runner, third: I.third || null, sf: I.sf, boot: I.boot ? { n: I.boot.n, nat: I.boot.nat, g: I.boot.g } : null, mvp: I.mvp, user: { nat, q: qs, res: entry.res, apps: entry.apps, g: entry.g, title: entry.title } });
    if (I.user.qualified) {
      G.Inbox.add('award', I.name + ': ' + (entry.title ? 'بطل!' : STAGE_AR(entry.res)), (entry.title ? 'توّج منتخب ' + Intl.name(nat) + ' بلقب ' + I.name + (entry.apps ? ' وشاركتَ في ' + entry.apps + ' مباريات' : '') + '! 🏆' : 'انتهت مشاركة ' + Intl.name(nat) + ' عند: ' + STAGE_AR(entry.res) + '.') + (entry.apps ? ' أرقامك: ' + entry.apps + ' مباراة، ' + entry.g + ' هدف، ' + entry.a + ' صناعة.' : ''));
    }
    if (G.Media) G.safe(() => G.Media.tournament && G.Media.tournament(I, entry), 'media');
    if (G.BD) G.safe(() => G.BD.afterTournament && G.BD.afterTournament(I), 'bd');
    if (G.Press) G.safe(() => G.Press.onTournament && G.Press.onTournament(I), 'press');
    return I;
  };
  Intl.finalRes = (I, c) => (I.done && c === I.third ? 'third' : I.res[c]);
  const STAGE_AR = (r) => (r === 'winner' ? 'البطل' : r === 'final' ? 'وصيف البطل' : G.STAGE_NT_AR[r] || r || '—');
  Intl.stageAr = STAGE_AR;

  // يُستدعى في بداية الانتقال للموسم التالي: يحذف الأطراف المؤقتة (لاعبون/نوادٍ مجسّمة/تفاصيل البطولة) ويُبقي السجل
  Intl.archive = () => {
    const S = G.S;
    Intl.cleanup();
    Object.keys(S.clubs).forEach((id) => { if (S.clubs[id].nt) delete S.clubs[id]; });
    if (S.intl) { S.lastIntl = { id: S.intl.id, name: S.intl.name }; delete S.intl; }
  };

  G.migrations = G.migrations || [];
  G.migrations.push(() => { const S = G.S; if (!S) return; S.intlHist = S.intlHist || []; S.ntDrift = S.ntDrift || {}; });
})(window.G = window.G || {});
