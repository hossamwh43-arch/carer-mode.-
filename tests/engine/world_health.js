/* صحة العالم عبر مواسم كثيرة (Node بلا متصفح): يلعب N موسمًا ويقيس
   النجوم وأعمار اللاعبين والاعتزال واللاعبين الجدد (regens) وتوزيع الأبطال ومعدل الأهداف وارتباط قوة النادي بالترتيب،
   ويفحص ثوابت (تكرار، مراجع تالفة، أحجام التشكيلات). الاستخدام: node tests/engine/world_health.js [مواسم=20] [بذرة=3] [--json]  */
const { load } = require('./loader');
const N = +(process.argv[2] || 20), SEED = +(process.argv[3] || 3), JSON_OUT = process.argv.includes('--json');
const { G } = load();
const U = G.U;
const rg = process.argv.find((a) => a.startsWith('--regen=')); if (rg) Object.assign(G.Transfers.REGEN, JSON.parse(rg.slice(8)));
const pl = process.argv.find((a) => a.startsWith('--players=')); if (pl) Object.assign(G.Players, JSON.parse(pl.slice(10)));
const tr = process.argv.find((a) => a.startsWith('--train=')); if (tr) Object.assign(G.Training, JSON.parse(tr.slice(8)));
const opts = { name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: SEED, diff: 'normal' };
G.Season.newGame(opts); G.S.preLeft = 0; G.Season.startSeason();

// عدّادات بالتغليف (لا تغيّر السلوك)
const cnt = { youth: 0, retired: 0, aiMoves: 0 };
const T = G.Transfers;
const _addYouth = T.addYouth; T.addYouth = function () { cnt.youth++; return _addYouth.apply(this, arguments); };
const _retire = T.retireOld; T.retireOld = function () { const b = Object.keys(G.S.players).length; const r = _retire.apply(this, arguments); cnt.retired += b - Object.keys(G.S.players).length; return r; };

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
function spearman(xs, ys) {
  const rk = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); o.forEach((e, k) => { r[e[1]] = k; }); return r; };
  const rx = rk(xs), ry = rk(ys), n = xs.length, mx = mean(rx), my = mean(ry);
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
const real = () => Object.values(G.S.players).filter((p) => !p.user);
const inClubs = () => real().filter((p) => p.club && G.S.clubs[p.club] && !G.S.clubs[p.club].light);

function playSeason() {
  G.S.tour = 9;
  for (let i = 0; i < 80; i++) {
    const r = G.Sim.run({ mode: 'event', autoDP: true });
    if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => T.rejectOffer(o.id));
    if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break;
  }
  if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
}

const rows = [], champs = {}, invariants = [];
const top5 = ['ESP1', 'ENG1', 'ITA1', 'GER1', 'FRA1'].filter((l) => G.LEAGUES[l]);
function snapshot(label, s) {
  const ps = inClubs(), ovr = ps.map((p) => p.ovr).sort((a, b) => b - a);
  const ages = ps.map((p) => p.age);
  return {
    label, n: Object.keys(G.S.players).length, free: (G.S.free || []).length,
    s85: ovr.filter((x) => x >= 85).length, s88: ovr.filter((x) => x >= 88).length, s90: ovr.filter((x) => x >= 90).length,
    top100: mean(ovr.slice(0, 100)), top500: mean(ovr.slice(0, 500)), mean: mean(ovr), age: mean(ages),
    old34: ages.filter((a) => a >= 34).length / (ages.length || 1), young20: ages.filter((a) => a <= 20).length / (ages.length || 1),
    best: ovr[0], size: (s % 5 === 0 || s === 1 || s === N) ? JSON.stringify(G.S).length : null
  };
}
function checkInvariants(tag) {
  const S = G.S, bad = [];
  const seen = {};
  Object.keys(S.clubs).forEach((cid) => {
    const c = S.clubs[cid]; if (c.light) return;
    c.squad.forEach((pid) => {
      const p = S.players[pid];
      if (!p) bad.push(tag + ' مرجع تالف: ' + cid + '→' + pid);
      else { if (p.club !== cid) bad.push(tag + ' اللاعب ' + pid + ' بتشكيلة ' + cid + ' وclub=' + p.club); if (seen[pid]) bad.push(tag + ' مكرر ' + pid); seen[pid] = 1; }
    });
    if (c.lg && c.squad.length < 18) bad.push(tag + ' تشكيلة صغيرة ' + cid + ' (' + c.squad.length + ')');
    if (c.squad.length > 40) bad.push(tag + ' تشكيلة ضخمة ' + cid + ' (' + c.squad.length + ')');
  });
  Object.values(S.players).forEach((p) => {
    if (p.club && (!S.clubs[p.club] || (!S.clubs[p.club].light && S.clubs[p.club].squad.indexOf(p.id) < 0) )) bad.push(tag + ' لاعب بلا تشكيلة ' + p.id + ' @' + p.club);
    if (p.ovr < 30 || p.ovr > 99 || p.age < 15 || (!p.user && p.age > 45) || !isFinite(p.ovr)) bad.push(tag + ' قيمة غير منطقية ' + p.id + ' ovr=' + p.ovr + ' age=' + p.age);
  });
  return bad;
}

let t0 = Date.now();
rows.push(snapshot('بداية', 0));
const effStart = {};
for (let s = 1; s <= N; s++) {
  top5.forEach((lg) => { effStart[lg] = G.World.members(lg).map((id) => ({ id, e: G.World.eff(G.S.clubs[id]) })); });
  const before = cnt.youth, bR = cnt.retired;
  playSeason();
  // نتائج الدوريات
  const lgStat = {};
  top5.forEach((lg) => {
    const o = G.World.sortedOf(lg), L = G.World.leagueOf(lg); if (!o.length) return;
    const tb = L.table, n = o.length;
    let gf = 0, p = 0; o.forEach((id) => { gf += tb[id].gf; p += tb[id].p; });
    const eff = effStart[lg]; const pts = o.map((id) => tb[id].pts);
    const xs = eff.map((e) => e.e), ys = eff.map((e) => tb[e.id].pts);
    lgStat[lg] = { champ: o[0], pts: tb[o[0]].pts, gpm: p ? gf / (p / 1) : 0, rho: spearman(xs, ys), spread: pts[0] - pts[n - 1] };
    champs[lg] = champs[lg] || {}; champs[lg][o[0]] = (champs[lg][o[0]] || 0) + 1;
  });
  const bad1 = checkInvariants('م' + s + ' نهاية'); invariants.push(...bad1);
  const rr = G.Season.rollover();
  if (!rr.ok) { invariants.push('rollover فشل: ' + rr.msg); break; }
  if (G.S.userExpired && T.emergencyContract) T.emergencyContract();
  if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
  const snap = snapshot('م' + s, s); snap.youth = cnt.youth - before; snap.retired = cnt.retired - bR; snap.lg = lgStat;
  snap.userAge = G.P(G.S.user).age; snap.userOvr = G.P(G.S.user).ovr;
  rows.push(snap);
  invariants.push(...checkInvariants('م' + s + ' بداية'));
  if (G.S.phase === 'retired') break;
}
const sec = ((Date.now() - t0) / 1000).toFixed(1);
if (JSON_OUT) { console.log(JSON.stringify({ rows, champs, invariants })); process.exit(0); }

const f = (x, d) => (+x).toFixed(d == null ? 1 : d);
console.log('== صحة العالم: ' + (rows.length - 1) + ' موسمًا · بذرة ' + SEED + ' · ' + sec + ' ث ==');
console.log('موسم | لاعبون | أحرار | ≥85 | ≥88 | ≥90 | أفضل | top100 | top500 | متوسط | عمر | ≥34% | ≤20% | جدد | اعتزل');
rows.forEach((r) => console.log([r.label.padEnd(5), String(r.n).padStart(6), String(r.free).padStart(5), String(r.s85).padStart(4), String(r.s88).padStart(4), String(r.s90).padStart(4), String(r.best).padStart(4), f(r.top100).padStart(6), f(r.top500).padStart(6), f(r.mean).padStart(5), f(r.age).padStart(4), f(r.old34 * 100, 0).padStart(4), f(r.young20 * 100, 0).padStart(4), String(r.youth == null ? '-' : r.youth).padStart(4), String(r.retired == null ? '-' : r.retired).padStart(5)].join(' | ')));
console.log('\n== الدوريات الخمسة الكبرى (متوسط كل المواسم) ==');
top5.forEach((lg) => {
  const L = rows.filter((r) => r.lg && r.lg[lg]).map((r) => r.lg[lg]);
  const cc = champs[lg] || {}; const tot = Object.values(cc).reduce((a, b) => a + b, 0), mx = Math.max(0, ...Object.values(cc));
  console.log(lg + ': أهداف/مباراة ' + f(mean(L.map((x) => x.gpm)) / 1, 2) + ' · ارتباط القوة↔الترتيب ' + f(mean(L.map((x) => x.rho)), 2) + ' · نقاط البطل ' + f(mean(L.map((x) => x.pts)), 0) + ' · فارق الأول-الأخير ' + f(mean(L.map((x) => x.spread)), 0) + ' · أبطال مختلفون ' + Object.keys(cc).length + '/' + tot + ' · أكثر نادٍ فاز ' + mx + ' مرات');
});
const sizes = rows.filter((r) => r.size).map((r) => r.label + ':' + Math.round(r.size / 1000) + 'K');
console.log('\nحجم الحفظ (حرف): ' + sizes.join('  '));
const ih = G.S.intlHist || [];
console.log('بطولات المنتخبات المؤرشفة: ' + ih.length + ' · الفائزون: ' + ih.map((x) => (x.winner || x.champ || '?')).join(' '));
console.log('\n== الثوابت ==');
const uniq = [...new Set(invariants)];
console.log(uniq.length ? uniq.slice(0, 25).join('\n') + (uniq.length > 25 ? '\n… +' + (uniq.length - 25) : '') : 'سليمة ✓');
process.exitCode = uniq.length ? 1 : 0;
