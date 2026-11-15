/* اختبار «نهاية المسيرة» و«غرفة الملابس» (Node بلا متصفح): يلعب لاعبًا نجمًا من عمر 30 حتى الاعتزال ويفشل إن:
   وصل عمره بعد الموسم الأخير الإجباري، أو لم يتراجع تقييمه بعد 35 تراجعًا حقيقيًا، أو أُجبر عقده على مدة غير منطقية بعد 37،
   أو لم تتحرك علاقة الزملاء بالأفعال (صناعة/حمراء/وصول جديد)، أو كسرت الأثر الفعلي (خبرة/كيمياء) حدودها، أو غيّر النظام عشوائية اللعبة.
   الاستخدام: node tests/engine/career_end.js [بذور=5,9] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9').split(',').map(Number);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

function play(G, T) {
  G.S.tour = 9;
  for (let i = 0; i < 80; i++) {
    const r = G.Sim.run({ mode: 'event', autoDP: true });
    if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => T.rejectOffer(o.id));
    if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break;
  }
  if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
}

SEEDS.forEach((seed) => {
  const { G } = load(), T = G.Transfers;
  const opts = { name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed, diff: 'normal' };
  G.Season.newGame(opts); G.S.preLeft = 0; G.Season.startSeason();
  const u = G.P(G.S.user);
  // نجم بعمر 30 (لقياس الذيل العمري): تقييم 88 وإمكانات 88
  u.age = 30; G.Training.setOvr(u, 88); u.pot = 88; G.Players.refresh(u);
  if (u.ovr < 86) { ok(false, 'تعذّر رفع تقييم اللاعب للاختبار (' + u.ovr + ')'); return; }
  console.log('— بذرة ' + seed);
  const rows = [], rng0 = () => JSON.stringify(G.rngState);
  let maxAge = 0, retired = false, badYears = 0;
  for (let s = 1; s <= 20 && !retired; s++) {
    play(G, T);
    const agePre = u.age, ovrPre = u.ovr, plan = G.Season.retirePlan();
    const rr = G.Season.rollover();
    if (!rr.ok) { ok(false, 'rollover فشل: ' + rr.msg); break; }
    if (rr.retired) { retired = true; rows.push({ s, ageEnd: agePre, ovr: ovrPre, forced: true, plan }); break; }
    if (G.S.userExpired && T.emergencyContract) T.emergencyContract();
    maxAge = Math.max(maxAge, u.age);
    if (u.age >= 37 && u.ct && u.ct.y > 1) badYears++;
    rows.push({ s, ageEnd: agePre, ovr: u.ovr, lk: G.Locker.value() });
    if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
  }
  console.log('   ' + rows.map((r) => (r.ageEnd) + 'س:' + r.ovr).join(' › '));
  ok(retired && G.S.phase === 'retired', 'اللاعب اعتزل إجباريًا قبل الأربعين+ (' + (retired ? 'عمر ' + G.S.retiredAt.age : 'لم يعتزل') + ')');
  ok(G.S.retiredAt && G.S.retiredAt.forced === true && G.S.retiredAt.age === G.Season.RETIRE.forced, 'اعتزال إجباري مسجَّل بعمر الموسم الأخير ' + G.Season.RETIRE.forced);
  ok(maxAge <= G.Season.RETIRE.forced, 'لا يصل عمر اللاعب بعد الموسم الأخير: ' + maxAge);
  const at = (a) => (rows.find((r) => r.ageEnd === a) || {}).ovr;
  const o34 = at(34), o40 = at(40);
  ok(o34 != null && o40 != null && o34 - o40 >= 5, 'تراجع حقيقي بين 34 و40: ' + o34 + ' → ' + o40 + ' (≥5)');
  ok(o40 != null && o40 <= 86, 'لا يبقى فوق 86 بعمر 40 (' + o40 + ')');
  ok(badYears === 0, 'عقود من تجاوز 37 لا تتعدى سنة (مخالفات ' + badYears + ')');
  // الإرث من أرقام حقيقية
  const L = G.Season.legacy(), tot = G.Season.careerTotals();
  ok(L.apps === tot.apps && L.goals === tot.g && L.assists === tot.a && L.seasons === (u.car || []).length, 'الإرث يطابق مجاميع المسيرة (' + L.apps + ' مباراة، ' + L.goals + ' هدف)');
  ok(L.peak >= 88 && isFinite(L.score) && L.score >= 0 && !!L.tier, 'درجة الإرث منطقية (' + L.score + ' — ' + L.tier + ')');
  ok(L.clubs >= 1, 'عدد النوادي ' + L.clubs);
});

// ---------- غرفة الملابس ----------
(function locker() {
  console.log('— غرفة الملابس');
  const { G } = load();
  G.Season.newGame({ name: 'حسام', nat: 'IQ', age: 22, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: 5, diff: 'normal' });
  G.S.preLeft = 0; G.Season.startSeason();
  const u = G.P(G.S.user), L = G.Locker, rs = JSON.stringify(G.rngState);
  ok(L.value() === L.START, 'بداية 55 (قيمة ' + L.value() + ')');
  const mk = (o) => Object.assign({ mins: 90, rating: 7, score: { h: 1, a: 0 }, h: u.club }, o);
  const base = L.value();
  L.after(u, mk({}), { a: 2, red: 0 }); const a1 = L.value();
  ok(a1 > base, 'صناعتان في فوز ترفعان العلاقة (' + base + ' → ' + a1 + ')');
  L.after(u, mk({ rating: 5.0, score: { h: 0, a: 2 } }), { a: 0, red: 1, direct: true }); const a2 = L.value();
  ok(a2 < a1 - 3, 'بطاقة حمراء مباشرة + خسارة + أداء ضعيف تخفضها (' + a1 + ' → ' + a2 + ')');
  for (let i = 0; i < 3; i++) L.after(u, mk({ score: { h: 0, a: 1 } }), { a: 0, red: 0 });
  ok(L.get().lose >= 3, 'سلسلة هزائم متتالية تُحصى (' + L.get().lose + ')');
  L.after(u, mk({ score: { h: 2, a: 0 } }), { a: 0, red: 0 });
  ok(L.get().lose === 0, 'الفوز يكسر سلسلة الهزائم');
  const before = L.value(); L.moved(u, false);
  ok(L.value() <= L.NEWCOMER + 6 && L.value() >= L.NEWCOMER - 4, 'الوصول إلى نادٍ جديد يبدأ غريبًا (' + before + ' → ' + L.value() + ')');
  L.get().v = 100; ok(L.xpMult() <= 1.0834 && L.xpMult() >= 1.08 && Math.abs(L.attr() - L.ATTR) < 1e-9, 'أقصى أثر: خبرة ' + L.xpMult().toFixed(3) + ' · كيمياء ' + L.attr());
  L.get().v = 0; ok(L.xpMult() >= 0.916 && L.xpMult() <= 0.9174 && Math.abs(L.attr() + L.ATTR) < 1e-9, 'أدنى أثر: خبرة ' + L.xpMult().toFixed(3) + ' · كيمياء ' + L.attr());
  // أسبوعيًا: ميل نحو هدف يحدده الدور والاستقرار، وسحب ثقة المدرب بعلامة العلاقة
  L.get().v = 90; u.role = 'starter'; u.trust = 50; const t0 = u.trust; L.weekly();
  ok(L.value() < 90 && u.trust > t0, 'أسبوعيًا: علاقة مرتفعة جدًّا تهدأ نحو هدفها وتزيد الثقة (' + L.value() + ' · ثقة ' + u.trust.toFixed(2) + ')');
  L.get().v = 15; u.trust = 50; L.weekly(); ok(u.trust < 50, 'علاقة سيئة تسحب ثقة المدرب للأسفل (' + u.trust.toFixed(2) + ')');
  ok(JSON.stringify(G.rngState) === rs, 'النظام لا يستهلك عشوائية اللعبة');
  const info = L.info(); ok(info.label && info.log.length >= 1 && isFinite(info.xpPct), 'info() صالح للعرض');
  // تأثير على المحرك: bonus في سياق المباراة
  G.Growth.on = true; L.get().v = 100;
  const c = G.Growth.matchCtx(u, u.club); ok(c.bonus >= L.ATTR - 1e-9, 'كيمياء الفريق تدخل سياق المباراة (bonus ' + c.bonus.toFixed(2) + ')');
})();

console.log('\ncareer_end: ' + fails + ' فشل');
process.exit(fails ? 1 : 0);
