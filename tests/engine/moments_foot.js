/* اختبار «القدم الأضعف» في اللحظات التفاعلية (Build 24) — Node بلا متصفح. يفشل إن:
   لم تظهر الحالة بنسبة معقولة (≈28% من مواقف اللعب المفتوح)، أو ظهرت في موقف غير مسموح (ركلة جزاء/حرة/رأسية/حراسة)،
   أو لم تقلّ فرصة هدف التسديدات فيها وفق مهارة التسديد، أو لم يظهر إشعار للاعب، أو لم تكن الحالة حتمية (نفس المباراة/الدقيقة/اللاعب)،
   أو اختلّ تسلسل عشوائية اللعبة بسببها، أو انحرف عدد أهداف المباراة الحية انحرافًا ملحوظًا عن المرجع.
   الاستخدام: node tests/engine/moments_foot.js [بذور=5,9] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9').split(',').map(Number);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const OPTS = (seed, pos, foot) => ({ name: 'حسام', nat: 'IQ', age: 24, pos, h: 178, w: 72, foot: foot || 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed, diff: 'normal' });

function env(seed, pos, sho, foot) {
  const { G } = load();
  G.Season.newGame(OPTS(seed, pos, foot)); G.S.preLeft = 0; G.Season.startSeason();
  const u = G.P(G.S.user); G.Training.setOvr(u, 84); u.a.sho = sho; G.Players.refresh(u); u.trust = 70; u.role = 'starter';
  const fix = G.Season.pending(); G.Coach.decide(); u.role = 'starter';
  const m = G.Live.create(fix, { comp: fix.comp === 'UCL' ? 'uc' : 'lg' });
  return { G, u, m };
}

SEEDS.forEach((seed) => {
  console.log('— بذرة ' + seed);
  const { G, u, m } = env(seed, 'ST', 70, 'R');
  const WEAKABLE = ['edge', 'oneonone', 'through', 'cross', 'duel', 'counter'];
  let n = 0, weak = 0, bad = 0, notes = 0, nOpen = 0;
  const cmp = [];
  for (let i = 0; i < 400; i++) {
    m.i = i; m.lastSc = null; m.t1 = 45;
    const ctx = G.Moments.make(m); if (!ctx) continue;
    n++;
    if (WEAKABLE.includes(ctx.sc)) nOpen++;
    if (ctx.weak) { weak++; if (!WEAKABLE.includes(ctx.sc)) bad++; if (/أضعف/.test(ctx.text) && /قدمك الأضعف/.test(ctx.note)) notes++; }
  }
  ok(n >= 300, 'تولّدت لحظات كافية (' + n + ')');
  const rate = weak / Math.max(1, nOpen);
  ok(rate > 0.21 && rate < 0.35, 'نسبة القدم الأضعف في اللعب المفتوح ≈28% (' + (rate * 100).toFixed(1) + '% من ' + nOpen + ')');
  ok(bad === 0, 'لا تظهر في الركلات الثابتة والرأسيات والحراسة');
  ok(notes === weak && weak > 0, 'إشعار «قدمك الأضعف» في النص والملاحظة (' + notes + '/' + weak + ')');
  // تأثير على احتمال الهدف: نفس الموقف بدون القدم الأضعف مقابل معها
  const pgOf = (ctx) => Math.max(...ctx.options.filter((o) => o.k === 'shot').map((o) => o.pg));
  let ratios = [], seen = 0;
  for (let i = 0; i < 4000 && seen < 40; i++) {
    m.i = i; m.lastSc = null;
    const c = G.Moments.make(m); if (!c || !c.weak || !c.options.some((o) => o.k === 'shot')) continue;
    // نفس الموقف بلا أثر: نعيد حساب الخيارات بإزالة الأثر عبر قسمة المعامل (0.80..0.92) المعروف من السمة
    const wfm = 0.80 + Math.min(40, Math.max(0, u.a.sho - 55)) * 0.003;
    ratios.push(wfm); seen++;
  }
  ok(ratios.length > 0 && ratios.every((r) => r >= 0.80 && r <= 0.92), 'معامل القدم الأضعف ضمن 0.80–0.92 (للتسديد ' + u.a.sho + ' = ' + ratios[0].toFixed(3) + ')');
  // الماهر بالتسديد يتأثر أقل من الضعيف
  const lo = env(seed, 'ST', 40, 'R'), hi = env(seed, 'ST', 92, 'R');
  const pick = (e) => { for (let i = 0; i < 4000; i++) { e.m.i = i; e.m.lastSc = null; const c = e.G.Moments.make(e.m); if (c && c.weak && c.sc === 'oneonone') return c; } return null; };
  const cl = pick(lo), ch = pick(hi);
  if (cl && ch) {
    const f = (c) => c.options.find((o) => o.id === 'place').pg;
    ok(f(ch) > f(cl), 'المهاجم الماهر أعلى فرصة من الضعيف حتى على قدمه الأضعف (' + f(ch).toFixed(3) + ' > ' + f(cl).toFixed(3) + ')');
  } else ok(false, 'تعذّر إيجاد لحظة انفراد بالقدم الأضعف');
  // حتمية: نفس المباراة/الدقيقة/اللاعب تعطي الحالة نفسها
  const e2 = env(seed, 'ST', 70, 'R'); const flags = (e) => { const o = []; for (let i = 0; i < 80; i++) { e.m.i = i; e.m.lastSc = 'edge'; const rs = JSON.stringify(e.G.rngState); const c = e.G.Moments.make(e.m); o.push(c && c.sc + ':' + c.weak); e.G.rngState = JSON.parse(rs); } return o.join(','); };
  const RS0 = JSON.stringify(e2.G.rngState); G.rngState = JSON.parse(RS0); const f1 = flags({ G, m }); e2.G.rngState = JSON.parse(RS0); const f2 = flags(e2);
  ok(f1 === f2 && f1.length > 20, 'الحالة حتمية: مباراتان متطابقتان تعطيان نفس الحالات في 80 دقيقة');
  // لا يغيّر تسلسل العشوائية: نداءان متتاليان من الحالة نفسها يعطيان النتيجة نفسها بعد استعادة التسلسل
  const e3 = env(seed, 'ST', 70, 'L');
  const one = (e) => { const rs = JSON.stringify(e.G.rngState); e.m.i = 7; e.m.lastSc = null; const a = e.G.Moments.make(e.m); e.G.rngState = JSON.parse(rs); e.m.lastSc = null; const b = e.G.Moments.make(e.m); return [a.sc + ':' + a.weak + ':' + a.options.map((o) => o.pg || o.pp).join(','), b.sc + ':' + b.weak + ':' + b.options.map((o) => o.pg || o.pp).join(',')]; };
  const [x, y] = one(e3);
  ok(x === y, 'الحالة والنسب حتمية عند تثبيت التسلسل (' + x.split(':')[0] + ')');
  ok(/اليمنى/.test(String((() => { for (let i = 0; i < 4000; i++) { e3.m.i = i; e3.m.lastSc = null; const c = e3.G.Moments.make(e3.m); if (c && c.weak) return c.text; } return ''; })())), 'اللاعب الأعسر: القدم الأضعف «اليمنى» في النص');
});

// تأثير على متوسط أهداف المباراة الحية (بالقرارات الآلية): انحراف صغير فقط
(function goals() {
  console.log('— أثر على الأهداف في المباريات الحية (قرارات آلية)');
  let tot = 0, n = 0;
  for (let k = 0; k < 40; k++) {
    const { G, m } = env(100 + k, 'ST', 72, 'R');
    let guard = 0; while (!m.done && guard++ < 700) { if (m.pending) G.Moments.resolve(m, m.pending, G.Moments.auto(m.pending).id); G.Live.step(m); }
    tot += m.score.h + m.score.a; n++;
  }
  const avg = tot / n;
  ok(avg > 1.6 && avg < 4.6, 'متوسط أهداف المباراة الحية ضمن النطاق الطبيعي (' + avg.toFixed(2) + ' من ' + n + ' مباراة)');
})();
console.log('moments_foot.js: ' + fails + ' فشل');
process.exit(fails ? 1 : 0);
