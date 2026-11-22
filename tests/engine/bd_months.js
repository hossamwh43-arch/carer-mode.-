// اختبار محرك: لقطات الكرة الذهبية الشهرية لكل شهر + ترحيل الحفظ القديم + رحلة السباق في الأرشيف
const { load } = require('./loader');
const { G } = load(); const U = G.U;
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };
G.Season.newGame({ name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: 3, diff: 'normal' });
G.S.preLeft = 0; G.Season.startSeason();
const T = G.Transfers;
function play() { G.S.tour = 9; for (let i = 0; i < 80; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => T.rejectOffer(o.id)); if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break; } if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish(); }
play();
const ms = G.BD.months();
ok(ms.length >= 9, 'لقطات الموسم المحفوظة ' + ms.length + ' (≥ 9)');
ok(ms.every((m, i) => i === 0 || m.k > ms[i - 1].k), 'الأشهر مرتبة تصاعديًا: ' + ms.map((m) => m.k).join(','));
ok(ms.slice(0, 9).every((m, i) => m.k === i + 1 && m.list.length >= 10), 'الأشهر 1..9 كلها بقوائم ≥ 10');
ok(ms.some((m) => m.final), 'توجد لقطة نهائية');
ok(G.S.bd.cur.snaps === undefined, 'الحقل القديم snaps غير موجود');
const R = G.BD.race(5);
ok(R && R.rows.length === 5 && R.ks.length === ms.length, 'سباق المتصدرين 5 صفوف × ' + (R && R.ks.length) + ' أشهر');
ok(R.rows.every((r) => r.pts.length === R.ks.length), 'مسار كل لاعب بطول الأشهر');
console.log('  المتصدر: ' + ms.map((m) => m.list[0].n.split(' ').pop() + ':' + m.list[0].t.toFixed(0)).join(' | '));
// التتويج وأرشفة الرحلة
const rr = G.Season.rollover(); ok(rr.ok, 'rollover');
const rec = G.S.bd.hist[G.S.bd.hist.length - 1];
ok(rec && rec.months && rec.months.length === ms.length, 'الأرشيف يحوي رحلة السباق ' + (rec && rec.months && rec.months.length));
ok(rec.months[0].top.length === 5 && typeof rec.months[0].top[0].t === 'number', 'كل شهر مؤرشف بأفضل 5');
ok(G.BD.months().length === 0, 'موسم جديد = لا لقطات');
// ترحيل حفظ قديم: cur.snaps → months
G.S.bd.cur = { season: G.S.season, snaps: [{ w: 4, final: false, list: [{ id: 'x', n: 'A', t: 50 }], me: null, n: 1 }, { w: 8, final: false, list: [{ id: 'x', n: 'A', t: 55 }], me: null, n: 1 }], track: [], closed: false, done: false };
const mm = G.BD.months();
ok(mm.length === 2 && mm[0].k === 1 && mm[1].k === 2 && G.S.bd.cur.snaps === undefined, 'ترحيل snaps القديمة → months (k=1,2)');
// الحجم
G.S.bd.cur.months = [];
console.log('  حجم سجل الكرة الذهبية: ' + JSON.stringify(G.S.bd).length + ' حرف');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); process.exit(fail ? 1 : 0);
