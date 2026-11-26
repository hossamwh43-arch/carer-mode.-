/* اختبار نظام المال (Build 29) — Node بلا متصفح. يفشل إن:
   لم يتراكم الرصيد من الراتب والرعاة بعد موسم، أو لم يتطابق مجموع صافي المواسم مع الرصيد، أو أخطأت شرائح الضريبة،
   أو سُمح بشراء بلا رصيد أو لم تُخصم الكلفة (مع استرداد نصف المستوى عند الترقية)، أو لم يظهر أثر المنزل/الفريق الطبي/المدرب الخاص في المحرك،
   أو خرج عائد الاستثمار عن −6٪..+16٪، أو استهلك الاستثمار الفارغ عشوائية اللعبة، أو حصل حفظ قديم على رصيد رجعي، أو نزل الرصيد تحت الصفر.
   الاستخدام: node tests/engine/b29_money.js [بذور=5,9] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9').split(',').map(Number);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const OPTS = (seed, age, pos) => ({ name: 'حسام', nat: 'IQ', age, pos: pos || 'ST', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'gir', seed, diff: 'normal' });
function fresh(seed, age, pos) {
  const { G } = load();
  G.Season.newGame(OPTS(seed, age, pos)); G.S.preLeft = 0; G.Season.startSeason();
  return { G, u: G.P(G.S.user) };
}
function season(G) {
  G.S.tour = 9;
  for (let i = 0; i < 90; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break; }
  if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
}

(function pure() {
  console.log('— الضريبة التصاعدية');
  const { G } = fresh(5, 22);
  const T = G.Money.tax;
  ok(T(10000) === 1500, 'دخل أسبوعي 10,000 → 1,500 (' + T(10000) + ')');
  ok(T(30000) === 6450, 'دخل 30,000 → 6,450 (' + T(30000) + ')');
  ok(T(100000) === 30850, 'دخل 100,000 → 30,850 (' + T(100000) + ')');
  ok(T(0) === 0 && T(100000) / 100000 > T(10000) / 10000, 'تصاعدية: النسبة الفعلية تزيد بزيادة الدخل');
})();

(function accrual() {
  console.log('— تراكم الرصيد عبر موسم كامل');
  SEEDS.forEach((seed) => {
    const { G } = fresh(seed, 22); const m = G.Money.st();
    ok(m.bal === 0, 'بداية اللعبة: الرصيد 0');
    season(G);
    const rr = G.Season.rollover();
    const m2 = G.Money.st();
    ok(m2.hist.length === 1, 'بذرة ' + seed + ': سُجّل موسم واحد في الأرشيف');
    const h = m2.hist[0];
    ok(m2.bal > 0 && h.inc > h.exp && h.net > 0, 'بذرة ' + seed + ': دخل ' + h.inc + ' > مصروف ' + h.exp + ' ورصيد ' + m2.bal);
    ok(Math.abs(m2.bal - h.net) <= 800, 'بذرة ' + seed + ': الرصيد = صافي الموسم (فرق التقريب ' + Math.abs(m2.bal - h.net) + ')');
    ok(rr.ok !== false, 'rollover يعمل مع النظام المالي');
  });
})();

(function spending() {
  console.log('— الشراء والأثر');
  const { G, u } = fresh(5, 24), M = G.Money, m = M.st();
  ok(!M.buy('house').ok && M.level('house') === 0, 'لا شراء بلا رصيد');
  ok(!M.buy('nonsense').ok, 'نوع غير معروف يُرفض');
  m.bal = 400000; const r = M.buy('house');
  ok(r.ok && M.level('house') === 1 && m.bal === 50000, 'شقة فاخرة: الرصيد 400,000 → 50,000 (' + m.bal + ')');
  m.bal = 10000000;
  const c2 = M.upgradeCost('house'); ok(c2 === 1500000 - 175000, 'ترقية الفيلا تسترد نصف سعر الشقة: ' + c2);
  M.buy('house'); M.buy('house'); ok(M.level('house') === 3 && !M.buy('house').ok, 'أعلى مستوى للمنزل 3 ولا شراء بعده');
  // أثر المنزل على التعافي
  const q = JSON.parse(JSON.stringify(u)); q.user = true; q.cond = 70;
  M.st().own.house = 0; const base = G.Stamina.recRate(q, 'normal', false);
  M.st().own.house = 3; const rich = G.Stamina.recRate(q, 'normal', false);
  ok(rich > base * 1.2 && rich < base * 1.3, 'القصر يرفع معدل التعافي ≈ 24٪ (' + base.toFixed(3) + ' → ' + rich.toFixed(3) + ')');
  const ai = JSON.parse(JSON.stringify(q)); ai.user = false;
  ok(G.Stamina.recRate(ai, 'normal', false) === base, 'لاعب الذكاء الاصطناعي لا يتأثر بممتلكاتك');
  M.st().own.house = 0;
  // أثر الفريق الطبي
  const p0 = G.Injury.perMin(q, 85);
  M.st().own.med = 2; const p2 = G.Injury.perMin(q, 85);
  ok(Math.abs(p2 / p0 - 0.85) < 0.001, 'طاقم طبي كامل يقلّل خطر الإصابة 15٪ (' + (p2 / p0).toFixed(3) + ')');
  u.inj = 8; G.Injury.onUser(u, 8, 'match');
  ok(u.inj === 6 && u.injInfo.weeks === 6, 'ويقصّر الغياب 25٪: 8 → ' + u.inj);
  u.inj = 1; G.Injury.onUser(u, 1, 'match'); ok(u.inj === 1, 'إصابة أسبوع واحد لا تُقصَّر');
  M.st().own.med = 0;
  // أثر المدرب الخاص
  const x0 = G.Growth.xpMult(u); M.st().own.coach = 2; const x2 = G.Growth.xpMult(u);
  ok(Math.abs(x2 / x0 - 1.12) < 0.001, 'أكاديمية خاصة ترفع الخبرة 12٪ (' + (x2 / x0).toFixed(3) + ')');
  M.st().own.coach = 0;
})();

(function investing() {
  console.log('— الاستثمار');
  const { G } = fresh(5, 24), M = G.Money, m = M.st(), S = G.S;
  m.bal = 2000000;
  ok(!M.invest(5000).ok, 'أقل مبلغ 10,000');
  ok(M.invest(500000).ok && m.inv === 500000 && m.bal === 1500000, 'استثمار 500,000 ينقل المبلغ من الرصيد');
  ok(!M.invest(9000000).ok, 'لا استثمار فوق الرصيد');
  const rets = [];
  for (let i = 0; i < 60; i++) {
    m.inv = 1000000; m.cur = { s: S.season, wage: 0, spons: 0, bonus: 0, signing: 0, inv: 0, tax: 0, upkeep: 0, agent: 0, buy: 0 };
    M.seasonEnd(); rets.push((m.inv - 1000000) / 1000000);
  }
  const mn = Math.min(...rets), mx = Math.max(...rets), avg = rets.reduce((a, b) => a + b, 0) / rets.length;
  ok(mn >= -0.0601 && mx <= 0.1601, 'العائد ضمن −6٪..+16٪ (' + (mn * 100).toFixed(1) + '..' + (mx * 100).toFixed(1) + ')');
  ok(rets.some((r) => r < 0) && rets.some((r) => r > 0.08), 'العائد متقلّب فعلًا (يوجد خسارة وربح كبير)');
  ok(avg > 0.01 && avg < 0.09, 'متوسط العائد قرب +5٪ (' + (avg * 100).toFixed(1) + '٪)');
  m.inv = 300000; const b0 = m.bal; const d = M.divest(100000);
  ok(d.ok && m.inv === 200000 && m.bal === b0 + 100000, 'السحب يعيد المبلغ للرصيد');
  m.inv = 0; ok(!M.divest(1000).ok, 'لا سحب بلا استثمارات');
  // بلا استثمار لا يستهلك عشوائية
  const st1 = JSON.stringify(G.rngState); M.seasonEnd(); ok(JSON.stringify(G.rngState) === st1, 'نهاية موسم بلا استثمار لا تستهلك U.rnd');
})();

(function edge() {
  console.log('— حالات حدّية وحفظ قديم');
  const { G, u } = fresh(5, 24), M = G.Money, S = G.S;
  S.fin = { signing: 5000000, bonus: 2000000, agent: 100000, season: { s: S.season, bonus: 0 } }; delete S.money;
  M.week(); const m = M.st();
  ok(m.cur.signing === 0 && m.cur.bonus === 0 && m.cur.agent === 0, 'حفظ قديم فيه S.fin: لا رصيد رجعي لعدّادات سابقة');
  S.fin.signing += 100000; S.fin.bonus += 20000; S.fin.agent += 5000;
  const b0 = m.bal; M.week();
  ok(m.cur.signing === 100000 && m.cur.bonus === 20000 && m.cur.agent === 5000, 'مكافأة توقيع ومكافآت مباريات وعمولة وكيل جديدة تُحتسب مرة واحدة');
  M.week(); ok(m.cur.signing === 100000, 'ولا تُحتسب مرتين');
  ok(m.bal > b0, 'الرصيد ارتفع بعد المكافآت');
  // عقد منتهٍ: لا راتب، والرصيد لا ينزل تحت الصفر
  S.userExpired = true; G.Media.get().pop = 0; m.bal = 100; m.own.house = 3; M.week(); M.week();
  ok(m.bal === 0, 'الرصيد يقف عند الصفر ولا ينزل تحته مهما بلغت المصروفات (' + m.bal + ')');
  S.userExpired = false;
  const pv = M.preview(); ok(pv.net === pv.wage + pv.spons - pv.tax - pv.up, 'معاينة الأسبوع متسقة (' + pv.net + ')');
  ok(M.netWorth() === m.bal + m.inv + Math.round(6000000 * 0.5), 'صافي الثروة = رصيد + استثمارات + نصف قيمة الممتلكات');
})();

console.log(fails ? '\nفشل: ' + fails : '\nنجح الاختبار كله');
process.exit(fails ? 1 : 0);
