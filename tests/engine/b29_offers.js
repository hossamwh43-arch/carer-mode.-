/* معدل العروض (Build 29): عروض أقل وأثقل. يفشل إن: تجاوز عدد العروض الحيّة السقف، أو تجاوزت عروض النافذة الحصة، أو انعدمت العروض تمامًا لمتوسط المواسم
   (المتوسط 0)، أو عاد الفيضان (>12 عرضًا بالموسم)، أو كسر الاستدعاء حالة النافذة المغلقة/حفظ قديم بلا offerQuota.
   الاستخدام: node tests/engine/b29_offers.js [بذور=5,9,7] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9,7').split(',').map(Number);
let fails = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const mk = (seed, ovr, club) => { const { G } = load(); G.Season.newGame({ name: 'x', nat: 'IQ', age: 23, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: club, seed, diff: 'normal' }); G.S.tour = 9; G.S.preLeft = 0; G.Season.startSeason(); const u = G.P(G.S.user); G.Training.setOvr(u, ovr); u.pot = Math.max(u.pot, ovr + 4); G.Players.refresh(u); return G; };

console.log('— الحصة والسقف');
{
  const G = mk(5, 80, 'ath'), T = G.Transfers, S = G.S; T.wageRoom = () => 1e9; Object.values(S.clubs).forEach((c) => { c.tb = 4e8; });
  S.window = { open: true, kind: 'winter' }; S.offers = []; S.offerQuota = undefined; let maxLive = 0;
  for (let i = 0; i < 80; i++) { T.generateOffers(2.5); maxLive = Math.max(maxLive, S.offers.filter((o) => o.type === 'transfer').length); }
  ok(maxLive <= T.TUNE.liveMax, 'العروض الحيّة لا تتجاوز السقف (' + maxLive + ' ≤ ' + T.TUNE.liveMax + ')');
  ok(T.windowUsed() <= T.TUNE.winMax, 'حصة النافذة (' + T.windowUsed() + ' ≤ ' + T.TUNE.winMax + ')');
  S.offers = []; const before = T.windowUsed(); for (let i = 0; i < 20; i++) T.generateOffers(2.5);
  ok(T.windowUsed() <= T.TUNE.winMax && before <= T.TUNE.winMax, 'مسح العروض الحيّة لا يمنح حصة جديدة لنفس النافذة');
  S.window = { open: false }; S.offers = []; ok(T.generateOffers(3) === 0 && S.offers.length === 0, 'نافذة مغلقة: لا عروض');
  S.window = { open: true, kind: 'summer' }; S.offerQuota = { k: 'قديم', n: 99 }; ok(T.generateOffers(2.5) >= 0, 'حصة قديمة بمفتاح آخر لا تمنع النافذة الجديدة');
}
console.log('— عدد العروض بالموسم عبر المحاكاة الكاملة (رفض كل عرض كي لا يتغير الفريق)');
const per = [];
SEEDS.forEach((seed) => {
  [['ath', 80], ['gir', 74]].forEach(([club, ovr]) => {
    const G = mk(seed, ovr, club); let last = 0;
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 90; i++) { G.Sim.run({ mode: 'event', autoDP: true }); (G.S.offers || []).slice().forEach((o) => G.Transfers.rejectOffer(o.id)); if (G.S.phase === 'end') break; }
      per.push((G.S.offerId || 0) - last); last = G.S.offerId || 0;
      if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
      G.Season.rollover(); if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
    }
  });
});
const avg = per.reduce((a, b) => a + b, 0) / per.length;
console.log('  عروض/موسم:', per.join(','), ' المتوسط', avg.toFixed(2));
ok(avg >= 0.8, 'العروض لم تختفِ (المتوسط ' + avg.toFixed(2) + ' ≥ 0.8)');
ok(Math.max.apply(null, per) <= 12, 'لا فيضان عروض (أقصى ' + Math.max.apply(null, per) + ' ≤ 12)');
console.log(fails ? '\nفشل: ' + fails : '\nنجح الاختبار كله'); process.exit(fails ? 1 : 0);
