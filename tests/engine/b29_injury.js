/* اختبار الإصابات وخطط التعافي (Build 29) — Node بلا متصفح. يفشل إن:
   كان معدل الإصابة بالمباراة خارج 1.5–4٪ للاعب أساسي، أو لم يزد الخطر بالعمر والإرهاق، أو لم تختصر الخطط المدة بنسبها،
   أو سُمح باختيار خطة مرتين، أو لم يظهر خطر الانتكاسة بنسبته (راحة = صفر)، أو انهار حفظ قديم فيه u.inj بلا injInfo،
   أو اختلفت النتائج بين تشغيلين بالبذرة نفسها.
   الاستخدام: node tests/engine/b29_injury.js [بذور=5,9] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9').split(',').map(Number);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const OPTS = (seed, age, pos) => ({ name: 'حسام', nat: 'IQ', age, pos: pos || 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed, diff: 'normal' });
function fresh(seed, age, pos) {
  const { G } = load();
  G.Season.newGame(OPTS(seed, age, pos)); G.S.preLeft = 0; G.Season.startSeason();
  return { G, u: G.P(G.S.user) };
}

(function rates() {
  console.log('— معدل الإصابة بالمباراة');
  const { G, u } = fresh(5, 24, 'ST');
  const I = G.Injury, m90 = (p, f) => 1 - Math.pow(1 - I.perMin(p, f), 90);
  const q = JSON.parse(JSON.stringify(u));
  const base = m90(q, 85);
  ok(base > 0.015 && base < 0.04, 'لاعب أساسي (24 سنة، لياقة 85) ≈ ' + (base * 100).toFixed(2) + '٪ بالمباراة (المطلوب 1.5–4٪)');
  q.age = 34; ok(m90(q, 85) > base * 1.15, 'ابن 34 أكثر عرضة من ابن 24 (' + (m90(q, 85) * 100).toFixed(2) + '٪)');
  q.age = 24; ok(m90(q, 40) > m90(q, 95), 'الإرهاق يرفع الخطر (لياقة 40 > لياقة 95)');
  const ai = JSON.parse(JSON.stringify(u)); ai.user = false;
  ok(I.perMin(ai, 50) === I.perMin(ai, 100), 'لاعب الذكاء الاصطناعي لا يتأثر بلياقتك/إعداداتك');
})();

(function plans() {
  console.log('— خطط التعافي');
  const { G, u } = fresh(5, 24, 'CM'), I = G.Injury;
  const hurt = (w) => { u.inj = w; u.fit = 90; I.onUser(u, w, 'match'); };
  hurt(2); ok(!I.pending(u) && u.injInfo.plan === 'rest', 'إصابة قصيرة (<3 أسابيع) لا تطلب قرارًا');
  ok(!I.choose('rush').ok, 'لا يمكن اختيار خطة لإصابة قصيرة');
  u.inj = 0; u.injInfo = null;
  hurt(8); ok(I.pending(u), 'إصابة 8 أسابيع تنتظر خطة');
  const r = I.choose('rest'); ok(r.ok && u.inj === 8 && !I.pending(u), 'راحة كاملة: المدة كما هي (' + u.inj + ')');
  ok(!I.choose('rush').ok && u.inj === 8, 'لا يمكن اختيار خطة ثانية للإصابة نفسها');
  hurt(8); I.choose('treat'); ok(u.inj === 6, 'علاج مكثف يقصّر 25٪: 8 → ' + u.inj);
  hurt(10); const fit0 = u.fit; I.choose('rush'); ok(u.inj === 6 && u.fit === fit0 - 8, 'عودة مبكرة تقصّر 40٪ (10 → ' + u.inj + ') وتخسر 8 لياقة (' + u.fit + ')');
  hurt(3); I.choose('rush'); ok(u.inj >= 1, 'لا تنزل المدة عن أسبوع');
  ok(I.nameFor(1, 'x') !== I.nameFor(20, 'x'), 'أسماء الإصابات تختلف بالخطورة');
})();

(function relapse() {
  console.log('— الانتكاسة');
  const { G, u } = fresh(7, 24, 'CM'), I = G.Injury;
  const trial = (plan, n) => {
    let rel = 0;
    for (let i = 0; i < n; i++) {
      u.inj = 0; u.injInfo = { name: 'اختبار', weeks: 5, left0: 5, src: 'match', plan, season: 1, week: 1 };
      I.tick(u, 1);
      if (u.inj > 0) { rel++; ok0(u.inj >= 2 && u.inj <= 4 && u.injInfo.src === 'relapse', null); }
    }
    return rel / n;
  };
  const ok0 = (c) => { if (!c) { fails++; console.log('  FAIL انتكاسة بمدة/نوع غير صحيح'); } };
  const N = 600, pr = trial('rush', N), pt = trial('treat', N), pe = trial('rest', N);
  ok(pe === 0, 'الراحة الكاملة بلا انتكاسة (' + pe + ')');
  ok(pt > 0.05 && pt < 0.16, 'العلاج المكثف ≈ 10٪ انتكاسة (' + (pt * 100).toFixed(1) + '٪)');
  ok(pr > 0.2 && pr < 0.36, 'العودة المبكرة ≈ 28٪ انتكاسة (' + (pr * 100).toFixed(1) + '٪)');
  u.inj = 3; u.injInfo = { name: 'اختبار', plan: 'rush' }; I.tick(u, 0); ok(u.inj === 3 && u.injInfo, 'لا يحدث شيء إن لم يكن اللاعب قد شُفي هذا الأسبوع');
})();

(function legacy() {
  console.log('— حفظ قديم فيه إصابة بلا injInfo');
  const { G, u } = fresh(5, 24, 'CM');
  u.inj = 4; delete u.injInfo;
  ok(!G.Injury.pending(u), 'لا قرار معلّق بلا injInfo');
  ok(!G.Injury.choose('rest').ok, 'choose لا ينهار ولا يعدّل');
  let err = null;
  try { for (let i = 0; i < 6 && !(G.S.phase === 'end'); i++) G.Sim.run({ mode: 'event', autoDP: true, maxWeeks: 1 }); } catch (e) { err = e; }
  ok(!err, 'محاكاة بعد تحميل حفظ قديم لا تنهار' + (err ? ' — ' + err.message : ''));
  ok(u.inj === 0, 'الإصابة القديمة تنتهي بالأسابيع (' + u.inj + ')');
})();

(function determinism() {
  console.log('— الحتمية بالبذرة');
  const run = () => {
    const { G, u } = fresh(SEEDS[0], 23, 'ST'); const log = [];
    const orig = G.Inbox.add; G.Inbox.add = function (t, ...r) { if (t === 'injury') log.push(G.S.week + ':' + r[0]); return orig.apply(this, [t, ...r]); };
    G.S.tour = 9;
    for (let i = 0; i < 60; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break; }
    return JSON.stringify([log, u.inj]);
  };
  const a = run(), b = run(); ok(a === b, 'تشغيلان بالبذرة نفسها يعطيان الإصابات نفسها');
})();

console.log(fails ? '\nفشل: ' + fails : '\nنجح الاختبار كله');
process.exit(fails ? 1 : 0);
