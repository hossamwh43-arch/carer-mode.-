/* league.js — الدوري الإسباني: جدول ذهاب وإياب، ترتيب، تحقق من سلامة الجدول */
(function (G) {
  'use strict';
  const U = G.U;
  const League = (G.League = {});

  const emptyRow = () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

  // طريقة الدائرة (Circle method) لجدول 38 جولة
  League.make = (ids, season) => {
    const n = ids.length;
    const arr = U.shuffle(ids.slice());
    const first = [];
    const run = {}, bal = {}; // run: سلسلة متتالية (+ داخل / - خارج)، bal: توازن
    ids.forEach((id) => { run[id] = 0; bal[id] = 0; });
    const cost = (h, a) => {
      let c = bal[h] - bal[a];
      if (run[h] >= 2) c += 100;
      if (run[a] <= -2) c += 100;
      return c;
    };
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) {
        let h = arr[i], a = arr[n - 1 - i];
        if (cost(a, h) < cost(h, a)) { const t = h; h = a; a = t; }
        run[h] = run[h] > 0 ? run[h] + 1 : 1; run[a] = run[a] < 0 ? run[a] - 1 : -1;
        bal[h]++; bal[a]--;
        round.push({ h, a });
      }
      first.push(round);
      arr.splice(1, 0, arr.pop());
    }
    const second = first.map((rd) => rd.map((f) => ({ h: f.a, a: f.h })));
    const all = first.concat(second);
    const rounds = all.map((rd, ri) => rd.map((f) => ({
      id: 'LL' + season + '-' + (ri + 1) + '-' + f.h + '-' + f.a, comp: 'LL', r: ri + 1, h: f.h, a: f.a, played: false, hg: null, ag: null
    })));
    const table = {};
    ids.forEach((id) => { table[id] = emptyRow(); });
    return { clubs: ids.slice(), rounds, table };
  };

  League.fixtures = () => [].concat.apply([], G.S.league.rounds);
  League.roundFixtures = (r) => G.S.league.rounds[r - 1] || [];

  League.record = (fix, hg, ag) => {
    if (fix.played) throw new Error('مباراة مكررة: ' + fix.id);
    const L = G.S.league;
    fix.played = true; fix.hg = hg; fix.ag = ag;
    const H = L.table[fix.h], A = L.table[fix.a];
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; A.l++; H.pts += 3; }
    else if (hg < ag) { A.w++; H.l++; A.pts += 3; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  };

  League.sorted = (L) => {
    L = L || G.S.league;
    return L.clubs.slice().sort((x, y) => {
      const a = L.table[x], b = L.table[y];
      return (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf) || (G.C(x).name < G.C(y).name ? -1 : 1);
    });
  };
  League.position = (id) => League.sorted().indexOf(id) + 1;

  // إعادة بناء الجدول من النتائج (أداة إصلاح)
  League.rebuild = (L) => {
    L = L || G.S.league;
    L.clubs.forEach((id) => { L.table[id] = emptyRow(); });
    L.rounds.forEach((rd) => rd.forEach((f) => {
      if (!f.played) return;
      const H = L.table[f.h], A = L.table[f.a];
      H.p++; A.p++; H.gf += f.hg; H.ga += f.ag; A.gf += f.ag; A.ga += f.hg;
      if (f.hg > f.ag) { H.w++; A.l++; H.pts += 3; } else if (f.hg < f.ag) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
    }));
  };

  // التحقق: يعيد قائمة الأخطاء (فارغة = سليم)
  League.validate = (L) => {
    L = L || G.S.league;
    const err = [];
    let sgf = 0, sga = 0, sp = 0, playedFix = 0;
    L.clubs.forEach((id) => {
      const t = L.table[id];
      if (t.p !== t.w + t.d + t.l) err.push(id + ': عدد المباريات لا يساوي ف+ت+خ');
      if (t.pts !== 3 * t.w + t.d) err.push(id + ': النقاط غير صحيحة');
      sgf += t.gf; sga += t.ga; sp += t.p;
    });
    if (sgf !== sga) err.push('مجموع الأهداف له/عليه غير متساوٍ');
    const seen = {};
    L.rounds.forEach((rd, i) => {
      const inRound = {};
      rd.forEach((f) => {
        if (!f.played) return;
        playedFix++;
        if (inRound[f.h] || inRound[f.a]) err.push('نادٍ لعب مرتين في الجولة ' + (i + 1));
        inRound[f.h] = inRound[f.a] = true;
        const key = f.h + '>' + f.a;
        if (seen[key]) err.push('مباراة مكررة ' + key);
        seen[key] = true;
      });
    });
    if (sp !== playedFix * 2) err.push('عدد المباريات في الترتيب لا يطابق المباريات الملعوبة');
    // مطابقة الترتيب مع إعادة حسابه من النتائج
    const chk = { clubs: L.clubs, rounds: L.rounds, table: {} };
    League.rebuild(chk);
    L.clubs.forEach((id) => {
      const a = L.table[id], b = chk.table[id];
      if (a.pts !== b.pts || a.gf !== b.gf || a.ga !== b.ga || a.p !== b.p) err.push(id + ': الترتيب لا يطابق النتائج المسجلة');
    });
    return err;
  };

  League.isComplete = () => G.S.league.rounds.every((rd) => rd.every((f) => f.played));
})(window.G = window.G || {});
