/* معايرة اللعبة مقابل أرقام كرة حقيقية (Node، بلا متصفح). يلعب N مواسم ويقيس لكل دوري كبير:
   أهداف المباراة، نسب فوز المضيف/التعادل/فوز الضيف، نقاط البطل والأخير لكل مباراة، وأهداف الهداف الأول؛ ثم يقارنها بمراجع موسم 2024/25
   (المصدر: sportytrader.com — «Comparing the Stats Across the Biggest Soccer Leagues»: الدوري الإنجليزي 2.92 أهداف/42-28-30، الإسباني 2.61/47-26-27،
   الإيطالي 2.70/41-29-30، الألماني 3.22/44-24-32، الفرنسي 2.98/47-22-31). الهداف الأول ونقاط البطل نطاقات تقريبية من تاريخ الدوريات.
   يفشل إن خرجت المتوسطات عن نطاق المرجع ± هامش (لعبة لا نسخة طبق الأصل). المقاس 6 مواسم/بذرة 3: متوسط الأهداف 2.72 مقابل 2.89، مضيف/تعادل/ضيف 44/24/32 مقابل 44/26/30؛ فجوة طابع الدوري (ألماني 2.66 مقابل 3.22) غير مُصلَحة وتُذكر في README. الاستخدام: node tests/engine/calib_real.js [مواسم=6] [بذرة=3] [--json] */
const { load } = require('./loader');
const N = +(process.argv[2] || 6), SEED = +(process.argv[3] || 3), JSON_OUT = process.argv.includes('--json');
const { G } = load();
const REF = { ENG1: { g: 2.92, h: 42, d: 28, a: 30 }, ESP1: { g: 2.61, h: 47, d: 26, a: 27 }, ITA1: { g: 2.70, h: 41, d: 29, a: 30 }, GER1: { g: 3.22, h: 44, d: 24, a: 32 }, FRA1: { g: 2.98, h: 47, d: 22, a: 31 } };
G.Season.newGame({ name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: SEED, diff: 'normal' });
G.S.preLeft = 0; G.Season.startSeason();
const T = G.Transfers;
function playSeason() {
  G.S.tour = 9;
  for (let i = 0; i < 80; i++) {
    const r = G.Sim.run({ mode: 'event', autoDP: true });
    if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => T.rejectOffer(o.id));
    if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break;
  }
  if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
}
const agg = {}; const lgs = Object.keys(REF).filter((l) => G.LEAGUES[l]);
lgs.forEach((l) => { agg[l] = { m: 0, goals: 0, h: 0, d: 0, a: 0, champPpg: [], lastPpg: [], top: [], top5: [], hg: 0, ag: 0, zero: 0, seasons: 0 }; });
for (let s = 1; s <= N; s++) {
  playSeason();
  lgs.forEach((lg) => {
    const L = G.World.leagueOf(lg), A = agg[lg]; if (!L) return;
    const add = (hg, ag) => { A.m++; A.goals += hg + ag; A.hg += hg; A.ag += ag; if (hg > ag) A.h++; else if (hg < ag) A.a++; else A.d++; if (hg + ag === 0) A.zero++; };
    if (L.rounds) L.rounds.forEach((rd) => rd.forEach((f) => { if (f.played) add(f.hg, f.ag); }));      // دوري المستخدم: مباريات كاملة
    else if (L.res) L.res.forEach((rd) => (rd || []).forEach((sc) => { if (sc) add(sc[0], sc[1]); })); // بقية الدوريات: نتائج مضغوطة
    const o = G.World.sortedOf(lg), tb = L.table; if (!o.length) return;
    A.champPpg.push(tb[o[0]].pts / tb[o[0]].p); A.lastPpg.push(tb[o[o.length - 1]].pts / tb[o[o.length - 1]].p);
    const sc = G.World.scorers(lg, 5); if (sc.length) { A.top.push(sc[0].st.lg[1]); A.top5.push(sc.reduce((a, p) => a + p.st.lg[1], 0) / sc.length); }
    A.seasons++;
  });
  const rr = G.Season.rollover(); if (!rr.ok) break;
  if (G.S.userExpired && T.emergencyContract) T.emergencyContract();
  if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
  if (G.S.phase === 'retired') break;
}
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const out = {};
lgs.forEach((lg) => { const A = agg[lg]; out[lg] = { m: A.m, g: A.goals / A.m, h: 100 * A.h / A.m, d: 100 * A.d / A.m, a: 100 * A.a / A.m, hg: A.hg / A.m, ag: A.ag / A.m, zero: 100 * A.zero / A.m, champ: mean(A.champPpg), last: mean(A.lastPpg), top: mean(A.top), top5: mean(A.top5), seasons: A.seasons }; });
if (JSON_OUT) { console.log(JSON.stringify(out)); process.exit(0); }
let fails = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const f = (x, d) => (+x).toFixed(d == null ? 2 : d);
console.log('== معايرة مقابل الواقع: ' + N + ' مواسم · بذرة ' + SEED + ' ==');
lgs.forEach((lg) => {
  const o = out[lg], r = REF[lg];
  console.log(lg + ' (' + o.m + ' مباراة، ' + o.seasons + ' مواسم): أهداف ' + f(o.g) + ' (مرجع ' + r.g + ') · مضيف/تعادل/ضيف ' + f(o.h, 0) + '/' + f(o.d, 0) + '/' + f(o.a, 0) + ' (مرجع ' + r.h + '/' + r.d + '/' + r.a + ') · 0-0: ' + f(o.zero, 1) + '% · نقاط/مباراة البطل ' + f(o.champ) + ' الأخير ' + f(o.last) + ' · الهداف الأول ' + f(o.top, 1) + ' (أول 5: ' + f(o.top5, 1) + ')');
  ok(Math.abs(o.g - r.g) <= 0.65, lg + ': أهداف المباراة ضمن ±0.65 من مرجع 2024/25 (' + f(o.g) + ' مقابل ' + r.g + ') — «طابع الدوري» (الألماني أعلى والإسباني أدنى) غير مُنمذَج، فالنطاق واسع عمدًا');
  ok(Math.abs(o.h - r.h) <= 8 && Math.abs(o.d - r.d) <= 8 && Math.abs(o.a - r.a) <= 8, lg + ': توزيع المضيف/التعادل/الضيف ضمن ±8 نقاط من موسم مرجعي واحد');
  ok(o.champ >= 1.95 && o.champ <= 2.6, lg + ': نقاط/مباراة البطل ضمن 1.95–2.6 (' + f(o.champ) + ')');
  ok(o.last >= 0.45 && o.last <= 1.0, lg + ': نقاط/مباراة الأخير ضمن 0.45–1.0 (' + f(o.last) + ')');
  ok(o.top >= 17 && o.top <= 36, lg + ': أهداف الهداف الأول ضمن 17–36 (' + f(o.top, 1) + ')');
});
const all = lgs.map((l) => out[l]); const gAvg = mean(all.map((x) => x.g)), refAvg = mean(lgs.map((l) => REF[l].g));
ok(Math.abs(gAvg - refAvg) <= 0.3, 'متوسط الدوريات الخمسة ضمن ±0.3 من المرجع (' + f(gAvg) + ' مقابل ' + f(refAvg) + ')');
console.log('\ncalib_real: ' + fails + ' فشل'); process.exit(fails ? 1 : 0);
