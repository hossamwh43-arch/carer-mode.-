// اختبار محرك: نوافذ تصنيف الأندية 1/5/10/50/100 — حتمية، لا استهلاك عشوائية، تقدير→حقيقي، ألقاب فعلية فقط، ترحيل حفظ قديم، حجم
const { load } = require('./loader');
const { G } = load(); const U = G.U, R = G.WorldRank;
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };
G.Season.newGame({ name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: 3, diff: 'normal' });
G.S.preLeft = 0; G.Season.startSeason();
ok(!!G.S.crk && Object.keys(G.S.crk.base).length === 212, 'crk مهيّأ لكل الأندية (' + Object.keys(G.S.crk.base).length + ')');
const rng0 = JSON.stringify(G.S.rng);
const w1 = R.window(100), w2 = R.window(100);
ok(JSON.stringify(w1.rows.slice(0, 30)) === JSON.stringify(w2.rows.slice(0, 30)), 'النافذة حتمية (نفس النتيجة مرتين)');
ok(JSON.stringify(G.S.rng) === rng0, 'حساب النوافذ لا يستهلك العشوائية');
ok(R.WINDOWS.every((n) => { const w = R.window(n); return w.real === 0 && w.est === n && w.rows.length === 212; }), 'قبل أول موسم: كل النوافذ تقديرية بالكامل (212 ناديًا)');
ok(R.window(1).rows.every((r) => r.lgT === 0 && r.uclT === 0) && R.window(100).rows.every((r) => r.lgT === 0 && r.uclT === 0), 'لا ألقاب مختلقة في المواسم التقديرية');
const top100 = R.window(100).rows.slice(0, 8).map((r) => r.id);
ok(top100.indexOf('rma') >= 0 && top100.indexOf('bay') >= 0 && top100.indexOf('juv') >= 0, 'أول 8 أندية في 100 سنة تضم العريقة: ' + top100.join(' '));
const top5 = R.window(5).rows.slice(0, 8).map((r) => r.id);
ok(top5.indexOf('mci') >= 0 && top5.indexOf('psg') >= 0, 'أول 8 في آخر 5 سنوات تضم الحديثة (مان سيتي/باريس): ' + top5.join(' '));
const T = G.Transfers;
function play() { G.S.tour = 9; for (let i = 0; i < 80; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => T.rejectOffer(o.id)); if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break; } if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish(); }
const champs = [];
for (let s = 1; s <= 3; s++) {
  play(); const ch = G.World.champions(); const lastLg = ch.ESP1; const ucl = G.S.ucl && G.S.ucl.winner; champs.push({ lastLg, ucl, ch });
  const rr = G.Season.rollover(); ok(rr.ok, 'rollover ' + s);
  if (G.S.userExpired && T.emergencyContract) T.emergencyContract();
  if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
}
ok(R.crkSeasons().length === 3, 'سُجّلت 3 مواسم (' + R.crkSeasons().length + ')');
const w5 = R.window(5); ok(w5.real === 3 && w5.est === 2, 'نافذة 5: 3 حقيقي + 2 تقدير (' + w5.real + '+' + w5.est + ')');
const w1b = R.window(1), rec = R.crkSeasons()[2];
ok(w1b.real === 1 && w1b.rows.every((r) => r.score === (rec.p[r.id] || 0)), 'نافذة سنة = نقاط آخر موسم حقيقي حرفيًا');
const champ1 = champs[2].ch.ESP1, ucl1 = champs[2].ucl;
ok(champ1 && w1b.rows.find((r) => r.id === champ1).lgT >= 1, 'بطل الدوري الإسباني الأخير يحمل لقبًا (' + champ1 + ')');
ok(ucl1 && w1b.rows.find((r) => r.id === ucl1).uclT === 1, 'بطل دوري الأبطال الأخير يحمل لقب أبطال (' + ucl1 + ')');
ok(R.window(10).rows.reduce((a, r) => a + r.uclT, 0) === 3, 'ألقاب الأبطال في نافذة 10 = 3 (الفعلية فقط)');
// استمرارية: متوسط نقاط أفضل 20 ناديًا حقيقيًا مقابل التقدير
const real = R.window(1).rows.slice(0, 20).reduce((a, r) => a + r.score, 0) / 20;
const rows = R.window(100).rows; // مكوّن تقديري بالكامل تقريبًا: متوسط/موسم لأفضل 20 ≈ حقيقي ± 40٪
const est = rows.slice(0, 20).reduce((a, r) => a + r.avg, 0) / 20;
ok(Math.abs(est - real) / real < 0.45, 'استمرارية الحدّ: حقيقي ' + real.toFixed(0) + ' مقابل تقدير ' + est.toFixed(0) + ' / موسم');
console.log('  حجم S.crk: ' + JSON.stringify(G.S.crk).length + ' حرف بعد 3 مواسم');
// ترحيل حفظ قديم بلا crk
const saved = JSON.parse(JSON.stringify(G.S.crk)); delete G.S.crk;
(G.migrations || []).forEach((f) => { try { f(); } catch (e) { console.log('migration err', e.message); } });
ok(!!G.S.crk && R.window(100).rows.length === 212, 'حفظ بلا crk يُرمَّم تلقائيًا ويعمل (النوافذ سليمة)');
ok(R.window(5).real === 0, 'الحفظ القديم يبدأ بلا مواسم حقيقية (لا تاريخ مختلق)');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); process.exit(fail ? 1 : 0);
