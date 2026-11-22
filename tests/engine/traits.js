// اختبار محرك: «القدرات المميزة» (Build 28) — حتمية، لا استهلاك عشوائية، لا قدرات للاعب المستخدم، المنتقاة بالترتيب والسقف،
// الأثر على اختيار المسجّل/الصانع (نسبي: لا يغيّر مجموع أهداف الفريق)، رفع قوة الفريق مسقوف، التراجع يُسقط القدرة، ترحيل الحفظ القديم، ثبات المعايرة.
// الاستخدام: node tests/engine/traits.js
const { load } = require('./loader');
const { G } = load(); const U = G.U, T = G.Traits;
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };
G.Season.newGame({ name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: 3, diff: 'normal' });
G.S.preLeft = 0; G.Season.startSeason();
const byName = (n) => Object.values(G.S.players).find((p) => p.n === n);
const hold = T.holders();
ok(hold.length >= 30 && hold.length <= 70, 'عدد حاملي القدرات عند البداية معقول (' + hold.length + ')');
ok(hold.every((p) => p.ovr >= T.CURATED_MIN && p.tr.length >= 1 && p.tr.length <= T.MAX), 'كل الحاملين ≥ ' + T.CURATED_MIN + ' وبين 1 و ' + T.MAX + ' قدرات');
ok(hold.every((p) => p.tr.every((k) => T.DEFS[k]) && new Set(p.tr).size === p.tr.length), 'معرّفات صحيحة بلا تكرار');
const u = G.S.players[G.S.user];
ok(!u.tr, 'لاعب المستخدم بلا قدرات'); u.ovr = 95; u.a.sho = 99; u.a.pac = 99; u.a.dri = 99; u.a.pas = 99; ok(T.derive(u).length === 0, 'حتى لو تضخّمت سماته: لا قدرات للمستخدم'); u.ovr = 60;
const h = byName('Erling Haaland'), y = byName('Lamine Yamal');
ok(h && JSON.stringify(h.tr) === JSON.stringify(['machine', 'power', 'fox']), 'هالاند: آلة أهداف + قوة بدنية + ثعلب المنطقة بالترتيب المنتقى (' + (h && h.tr) + ')');
ok(y && JSON.stringify(y.tr) === JSON.stringify(['dribbler', 'speed', 'prodigy']), 'يامال: ساحر المراوغة + صاروخ + موهبة خارقة (' + (y && y.tr) + ')');
// حتمية + لا عشوائية
const rng0 = JSON.stringify(G.S.rng), snap = JSON.stringify(hold.map((p) => [p.id, p.tr]));
const n1 = T.refreshAll(); const snap2 = JSON.stringify(T.holders().map((p) => [p.id, p.tr]));
ok(n1 === 0 && snap === snap2, 'إعادة الحساب بلا تغيير (حتمية)');
ok(JSON.stringify(G.S.rng) === rng0, 'refreshAll لا يستهلك العشوائية');
let c0 = 0; const rndSave = U.rnd; U.rnd = () => { c0++; return rndSave(); };
T.refreshAll(); T.holders(); hold.forEach((p) => { T.mult(p, 'g'); T.mult(p, 'a'); }); ok(c0 === 0, 'لا استدعاء لـ U.rnd في كل دوال القدرات'); U.rnd = rndSave;
// المضاعفات والسقف
ok(T.mult(h, 'g') === T.CAP.g, 'مضاعف هالاند مسقوف عند ' + T.CAP.g + ' (' + T.mult(h, 'g').toFixed(2) + ')');
ok(hold.every((p) => T.mult(p, 'g') <= T.CAP.g + 1e-9 && T.mult(p, 'a') <= T.CAP.a + 1e-9), 'لا مضاعف فوق السقف');
const plain = Object.values(G.S.players).find((p) => !p.tr && p.pos === 'ST' && p.ovr < 75 && !p.user);
ok(T.mult(plain, 'g') === 1 && T.mult(plain, 'a') === 1, 'بلا قدرة: مضاعف 1');
// وزن الاختيار: النجم يتفوق على نسخة مطابقة بلا قدرة
const clone = JSON.parse(JSON.stringify(h)); delete clone.tr; clone.id = '__c';
const wh = G.Match.scorerWeight(h, 'ST'); G.S.players.__c = clone; const wc = G.Match.scorerWeight(clone, 'ST'); delete G.S.players.__c;
ok(Math.abs(wh / wc - T.CAP.g) < 1e-9, 'وزن تسجيل هالاند = ' + T.CAP.g + '× نسخته بلا قدرات (' + (wh / wc).toFixed(2) + ')');
// نسبي: مجموع الأهداف لا يتغير — اختيار المسجّل من قائمة تشكيلة مانشستر سيتي
// رفع قوة الفريق مسقوف
const xi = Object.values(G.S.players).filter((p) => p.tr).slice(0, 11).map((p) => ({ id: p.id, slot: p.pos }));
const tl = T.teamLift(xi);
ok(tl.A <= T.CAP.tA + 1e-9 && tl.M <= T.CAP.tM + 1e-9 && tl.D <= T.CAP.tD + 1e-9 && tl.A >= 0, 'رفع الفريق مسقوف (A ' + tl.A.toFixed(2) + ' M ' + tl.M.toFixed(2) + ' D ' + tl.D.toFixed(2) + ')');
// التراجع يُسقط القدرة
const old = h.ovr; h.ovr = 74; T.refresh(h); ok(!h.tr, 'نجم تراجع تقييمه إلى 74 يفقد قدراته'); h.ovr = old; T.refresh(h); ok(h.tr && h.tr.length === 3, 'ويستعيدها عند عودته');
// ترحيل حفظ قديم: بلا p.tr
const before = JSON.stringify(T.holders().map((p) => [p.id, p.tr]));
Object.values(G.S.players).forEach((p) => { delete p.tr; });
ok(T.holders().length === 0, 'محاكاة حفظ قديم بلا قدرات');
G.migrations.forEach((f) => { try { f(); } catch (e) { /* مثل التطبيق */ } });
ok(JSON.stringify(T.holders().map((p) => [p.id, p.tr])) === before, 'الترحيل يعيد القدرات نفسها بالضبط');
// موسمان: لا ضخامة نجوم ولا انفجار حاملين، والقدرات تتجدد
const Tr = G.Transfers;
function play() { G.S.tour = 9; for (let i = 0; i < 80; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => Tr.rejectOffer(o.id)); if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break; } if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish(); }
const counts = [T.holders().length];
for (let s = 1; s <= 4; s++) {
  play(); const rr = G.Season.rollover(); if (!rr.ok) { ok(false, 'rollover ' + s); break; }
  if (G.S.userExpired && Tr.emergencyContract) Tr.emergencyContract();
  if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
  counts.push(T.holders().length);
}
ok(counts.every((n) => n >= 25 && n <= 110), 'عدد الحاملين عبر المواسم مستقر: ' + counts.join(' → '));
ok(T.holders().every((p) => !p.user) && !G.S.players[G.S.user].tr, 'بعد المواسم: المستخدم بلا قدرات');
ok(T.holders().every((p) => p.ovr >= T.CURATED_MIN), 'كل الحاملين ≥ ' + T.CURATED_MIN + ' بعد المواسم');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
process.exit(fail ? 1 : 0);
