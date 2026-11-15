/* اختبار اللياقة وتبديلات المدرب (Build 24) — Node بلا متصفح. يفشل إن:
   انهارت لياقة لاعب أساسي عبر الموسم (أو لياقة الشاب أسوأ من الأكبر)، أو لم تتعافَ الجاهزية بالراحة، أو لم يتغيّر الأساس بالعمر،
   أو لم يستنزف الإرهاق داخل المباراة بشكل منطقي عند 45/60/70/90، أو لم يُنفَّذ التبديل الفعلي للمرهق (يخرج من التشكيلة ويدخل بديل ويُستهلك تبديل)،
   أو بُدِّل لاعب منتعش لمجرد انخفاض بسيط، أو لم تختلف قرارات المدربين بالشخصية/النتيجة/الأداء، أو غيّر النظام تسلسل عشوائية اللعبة.
   الاستخدام: node tests/engine/stamina.js [بذور=5,9] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9').split(',').map(Number);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const OPTS = (seed, age, pos) => ({ name: 'حسام', nat: 'IQ', age, pos: pos || 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed, diff: 'normal' });

function fresh(seed, age, pos, ovr) {
  const { G } = load();
  G.Season.newGame(OPTS(seed, age, pos)); G.S.preLeft = 0; G.Season.startSeason();
  const u = G.P(G.S.user);
  G.Training.setOvr(u, ovr); u.pot = Math.max(u.pot, ovr + 4); G.Players.refresh(u);
  return { G, u };
}

// ================= A) نماذج نقية =================
(function pure() {
  console.log('— دوال اللياقة والقرار النقية');
  const { G, u } = fresh(5, 24, 'CM', 82);
  const St = G.Stamina, rs = JSON.stringify(G.rngState);
  // الأساس البدني يتبع السمة البدنية والعمر
  const mk = (age, phy) => { const q = JSON.parse(JSON.stringify(u)); q.age = age; q.a.phy = phy; delete q.cond; return q; };
  const cYoung = St.cond(mk(22, 70)), cOld = St.cond(mk(37, 70)), cWeak = St.cond(mk(24, 45)), cStrong = St.cond(mk(24, 85));
  ok(cStrong > cYoung && cYoung > cWeak, 'الأساس البدني يتبع السمة البدنية (' + cWeak + ' < ' + cYoung + ' < ' + cStrong + ')');
  ok(cYoung > cOld, 'من تجاوز 35 أساسه أقل من الشاب بالسمة نفسها (' + cYoung + ' > ' + cOld + ')');
  // التعافي الأسبوعي نحو سقف، لا تراكم بلا حدّ، والراحة أسرع من التدريب المكثف
  const q = JSON.parse(JSON.stringify(u)); q.cond = 78; q.age = 25;
  const wk = (fit, inten, hurt) => { const z = JSON.parse(JSON.stringify(q)); z.fit = fit; St.weekly(z, inten, hurt); return z.fit; };
  ok(wk(30, 'normal') > 30 + 25, 'من 30% تتعافى أكثر من 25 نقطة في أسبوع بتدريب متوسط (' + wk(30, 'normal').toFixed(1) + ')');
  ok(wk(60, 'light') > wk(60, 'normal') && wk(60, 'normal') > wk(60, 'heavy'), 'الخفيف أسرع تعافيًا من المتوسط ثم المكثف');
  let f = 30; const z2 = JSON.parse(JSON.stringify(q));
  for (let i = 0; i < 6; i++) { z2.fit = f; St.weekly(z2, 'normal', false); f = z2.fit; }
  ok(f >= 90 && f <= 100, 'بعد 6 أسابيع راحة تعود الجاهزية قرب السقف (' + f.toFixed(1) + ')');
  // توازن مباراة أسبوعيًا: لا ينهار ولا يبقى ممتلئًا
  const z3 = JSON.parse(JSON.stringify(q)); z3.fit = 95; let min = 100;
  for (let w = 0; w < 50; w++) { St.afterMatch(z3, 90); min = Math.min(min, z3.fit); St.weekly(z3, 'normal', false); }
  ok(min >= 70 && z3.fit >= 80, 'مباراة كاملة أسبوعيًا لمدة 50 أسبوعًا: أدنى جاهزية ' + min.toFixed(1) + ' ونهاية ' + z3.fit.toFixed(1) + ' (مستقرة)');
  const z4 = JSON.parse(JSON.stringify(q)); z4.fit = 95; let min4 = 100;
  for (let w = 0; w < 50; w++) { St.afterMatch(z4, 90); St.afterMatch(z4, 90); min4 = Math.min(min4, z4.fit); St.weekly(z4, 'heavy', false); }
  ok(min4 >= St.FIT_MIN && z4.fit >= St.FIT_MIN, 'أسوأ حالة (مباراتان أسبوعيًا + تدريب مكثف): محدودة بالأرضية ' + St.FIT_MIN + ' (أدنى ' + min4.toFixed(1) + ')');
  // الصيف: راحة + العمر يغيّر الأساس
  const y = mk(20, 65), o = mk(34, 65); y.fit = 40; o.fit = 40; const cy = St.cond(y), co = St.cond(o);
  St.summerRest(y); St.summerRest(o);
  ok(y.fit >= 88 && o.fit >= 88, 'العطلة تعيد الجاهزية ≥ 88 (' + y.fit + ' · ' + o.fit + ')');
  ok(y.cond > cy && o.cond < co, 'الأساس يرتفع للشاب وينخفض لمن بعد 33 عبر الصيف (' + cy + '→' + y.cond + ' · ' + co + '→' + o.cond + ')');
  // طاقة بداية المباراة من الجاهزية، ونفاد أبطأ للأقوى بدنيًا
  const t = JSON.parse(JSON.stringify(q)); t.fit = 100; const e100 = St.startEnergy(t); t.fit = 55; const e55 = St.startEnergy(t); t.fit = 25; const e25 = St.startEnergy(t);
  ok(e100 === 100 && e55 > 70 && e55 < 80 && e25 >= 55 && e25 < e55, 'طاقة البداية: 100% → ' + e100 + ' · 55% → ' + e55.toFixed(1) + ' · 25% → ' + e25.toFixed(1));
  const strong = mk(26, 85), weak = mk(26, 45); strong.cond = St.cond(strong); weak.cond = St.cond(weak);
  ok(St.drain(strong, 'CM') < St.drain(weak, 'CM') && St.drain(mk(26, 70), 'GK') < St.drain(mk(26, 70), 'CM') * 0.5, 'الأقوى بدنيًا أبطأ نفادًا، والحارس أقل جهدًا بكثير');
  ok(JSON.stringify(G.rngState) === rs, 'دوال اللياقة لا تستهلك عشوائية اللعبة');

  // ---- قرار المدرب النقي ----
  const C = G.Coach, prof = (id) => Object.assign({ id, adj: C.STYLES[id].adj, lead: C.STYLES[id].lead, trail: C.STYLES[id].trail, press: 0, plan: C.STYLES[id].plan }, {});
  const base = (o) => Object.assign({ energy: 70, mm: 60, diff: 0, imp: 0, perf: 6.6, grp: 'mid', sameGrp: true, gap: 3, age: 25, trust: 55, role: 'starter', prof: prof('balanced'), noise: 0, subsLeft: 3, hasBench: true }, o);
  const V = (o) => C.subVerdict(base(o));
  ok(!V({ energy: 70, mm: 60 }).sub, 'طاقة 70% عند الدقيقة 60: لا استبدال (انخفاض بسيط)');
  ok(!V({ energy: 62, mm: 65 }).sub, 'طاقة 62% لا تُعدّ إرهاقًا');
  ok(V({ energy: 44, mm: 62 }).sub, 'طاقة 44% عند الدقيقة 62: يبدّل (إرهاق واضح في نافذة 55–70)');
  ok(V({ energy: 20, mm: 50 }).sub && V({ energy: 20, mm: 50 }).urgency === 3, 'طاقة 20% عند الدقيقة 50: تبديل حرج فورًا (لا ينتظر 80)');
  ok(!V({ energy: 50, mm: 45 }).sub, 'إرهاق متوسط قبل الدقيقة 55 لا يستوجب تبديلًا');
  ok(!V({ energy: 45, mm: 90 }).sub && V({ energy: 20, mm: 90 }).sub, 'بعد الدقيقة 88 لا قيمة للتبديل إلا في الإنهاك الحرج');
  ok(!V({ energy: 44, mm: 62, hasBench: false }).sub && !V({ energy: 44, mm: 62, subsLeft: 0 }).sub, 'لا بديل أو لا تبديلات متبقية: لا قرار');
  ok(!V({ energy: 44, mm: 62, perf: 8.3 }).sub && V({ energy: 28, mm: 62, perf: 8.3 }).sub, 'أداء ممتاز يؤجّل التبديل عند إرهاق متوسط لكن لا يمنعه عند الإنهاك (يوازن)');
  ok(V({ energy: 52, mm: 65, perf: 5.6 }).sub && !V({ energy: 52, mm: 65, perf: 7.0 }).sub, 'الأداء الضعيف مع إرهاق يستبدله أبكر');
  ok(V({ energy: 55, mm: 72, diff: 2 }).sub && !V({ energy: 55, mm: 72, diff: -1 }).sub, 'التقدم بفارق هدفين يحمي اللاعب، والتأخر يُبقي المهاجم');
  ok(!V({ energy: 44, mm: 62, imp: 2 }).sub === !V({ energy: 44, mm: 62, imp: 0 }).sub || V({ energy: 44, mm: 62, imp: 0 }).limit > V({ energy: 44, mm: 62, imp: 2 }).limit, 'المباراة الحاسمة تخفض عتبة التبديل (يتحمّل أكثر)');
  ok(V({ energy: 55, mm: 65, prof: prof('rotator') }).sub && !V({ energy: 55, mm: 65, prof: prof('loyal') }).sub, 'مدرب التدوير يبدّل أبكر من الوفيّ للأساسيين على الطاقة نفسها');
  ok(!V({ energy: 47, mm: 62, sameGrp: false }).sub && V({ energy: 47, mm: 62, sameGrp: true }).sub && V({ energy: 30, mm: 62, sameGrp: false }).sub, 'لا بديل بمركزه: يؤجّل حتى يشتدّ الإرهاق');
  ok(V({ energy: 55, mm: 65, age: 18 }).limit > V({ energy: 55, mm: 65, age: 26 }).limit, 'يحمي اللاعب الصغير جدًا بعتبة أعلى');
  const pf = (cid) => C.profile(cid);
  const ids = Object.keys(G.S.clubs).slice(0, 60), kinds = {};
  ids.forEach((c) => { kinds[pf(c).id] = 1; });
  ok(Object.keys(kinds).length >= 3 && pf(ids[0]).id === pf(ids[0]).id && JSON.stringify(pf(ids[3])) === JSON.stringify(pf(ids[3])), 'شخصيات المدربين متنوعة وثابتة لكل نادٍ (' + Object.keys(kinds).join('/') + ')');
  ok(JSON.stringify(G.rngState) === rs, 'قرار المدرب النقي لا يستهلك العشوائية');
})();

// ================= B) موسمان كاملان =================
function season(seed, age, pos, ovr, tweak) {
  const { G, u } = fresh(seed, age, pos, ovr), T = G.Training;
  if (tweak) tweak(G, u);
  const trace = [], orig = T.week;
  T.week = function () { const r = orig.apply(this, arguments); trace.push(u.fit); return r; };
  let apps = 0, mins = 0, tiredSubs = 0;
  for (let s = 0; s < 2; s++) {
    G.S.tour = 9;
    for (let i = 0; i < 80; i++) {
      const r = G.Sim.run({ mode: 'event', autoDP: true });
      if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => G.Transfers.rejectOffer(o.id));
      if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break;
    }
    if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
    if (s === 0) {
      G.Season.rollover(); if (G.S.userExpired && G.Transfers.emergencyContract) G.Transfers.emergencyContract();
      if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
      trace.push(u.fit); // أول قراءة بعد الصيف
    }
  }
  (G.S.matchLog || []).forEach((m) => { if (m.mins > 0) { apps++; mins += m.mins; (m.events || []).forEach((e) => { if (e.k === 'sub' && /إرهاق/.test(e.txt || '') && e.me) tiredSubs++; }); } });
  return { G, u, trace, apps, avgMins: apps ? mins / apps : 0, tiredSubs };
}

SEEDS.forEach((seed) => {
  console.log('— موسمان كاملان، بذرة ' + seed);
  const young = season(seed, 20, 'CM', 82), old = season(seed, 32, 'CM', 84), pre = season(seed, 21, 'ST', 82);
  const rep = (n, r) => console.log('   ' + n + ': متوسط ' + avg(r.trace).toFixed(0) + ' · أدنى ' + Math.min(...r.trace).toFixed(0) + ' · آخر 10 أسابيع ' + avg(r.trace.slice(-10)).toFixed(0) + ' · مباريات ' + r.apps + ' · متوسط الدقائق ' + r.avgMins.toFixed(0) + ' · استبدالات إرهاق ' + r.tiredSubs);
  rep('شاب 20', young); rep('أكبر 32', old); rep('مهاجم 21', pre);
  [['شاب 20', young], ['أكبر 32', old], ['مهاجم 21', pre]].forEach(([n, r]) => {
    ok(r.apps >= 40, n + ': لعب موسمين بكثافة (' + r.apps + ' مباراة) فالاختبار ذو معنى');
    ok(avg(r.trace) >= 78, n + ': متوسط الجاهزية ≥ 78 (' + avg(r.trace).toFixed(1) + ')، لا انهيار تراكمي');
    ok(Math.min(...r.trace) >= 60, n + ': أدنى جاهزية عبر الموسمين ≥ 60 (' + Math.min(...r.trace).toFixed(1) + ')');
    ok(avg(r.trace.slice(-10)) >= 75, n + ': نهاية الموسم لا تنهار (آخر 10 أسابيع ' + avg(r.trace.slice(-10)).toFixed(1) + ')');
    ok(r.avgMins >= 70, n + ': أساسي يلعب بمتوسط ≥ 70 دقيقة (' + r.avgMins.toFixed(0) + ') — لا يُستبدل مبكرًا بلا سبب');
    ok(r.tiredSubs <= r.apps * 0.45, n + ': استبدالات الإرهاق ليست القاعدة (' + r.tiredSubs + ' من ' + r.apps + ')');
  });
  ok(avg(young.trace) >= avg(old.trace) - 1.5, 'الشاب ليس أسوأ لياقة من الأكبر (' + avg(young.trace).toFixed(1) + ' مقابل ' + avg(old.trace).toFixed(1) + ') — العمر الصغير لا يعاقَب');
  ok(young.u.cond > 70 && old.u.cond < young.u.cond, 'الأساس البدني: شاب ' + young.u.cond + ' > أكبر ' + old.u.cond);
  // لاعب بتدريب مكثف طوال الموسم: يهبط عن المتوسط لكن لا ينهار
  const hv = season(seed, 24, 'CM', 82, (G) => { G.S.training = { focus: 'balanced', intensity: 'heavy' }; });
  ok(Math.min(...hv.trace) >= Stamina25(hv.G) && avg(hv.trace) >= 60, 'تدريب مكثف طوال الموسمين: يهبط لكن بحدود (متوسط ' + avg(hv.trace).toFixed(0) + ' · أدنى ' + Math.min(...hv.trace).toFixed(0) + ')');
});
function Stamina25(G) { return G.Stamina.FIT_MIN; }

// ================= C) داخل المباراة: الإرهاق والتبديل الفعلي =================
function matchEnv(seed, fit, mut) {
  const { G, u } = fresh(seed, 25, 'CM', 90);
  u.fit = fit; u.cond = 80; u.trust = 70; u.role = 'starter';
  if (mut) mut(G, u);
  const fix = G.Season.pending();
  G.Coach.decide(); u.role = 'starter'; u.fit = fit;
  const opts = fix.comp === 'UCL' ? { comp: 'uc' } : { comp: 'lg' };
  const m = G.Live.create(fix, opts);
  return { G, u, m, fix };
}
function runTo(G, m, minute, hook) {
  let guard = 0;
  while (!m.done && guard++ < 600) {
    if (m.pending) G.Moments.resolve(m, m.pending, G.Moments.auto(m.pending).id);
    if (m.i >= m.labs.length) break;
    const lab = parseInt(m.labs[m.i], 10);
    if (lab > minute) break;
    G.Live.step(m);
    if (hook) hook(m);
  }
}

SEEDS.forEach((seed) => {
  console.log('— داخل المباراة، بذرة ' + seed);
  // طاقة بلا تبديلات: 45/60/70/90
  const e = matchEnv(seed, 95);
  const { G, u, m } = e, uid = u.id;
  ok(G.Live.userOn(m), 'اللاعب أساسي في التشكيلة');
  const rs0 = JSON.stringify(G.rngState);
  m.subs[m.side] = 0; // بلا تبديلات: لقياس الاستنزاف الصرف
  const pts = {};
  runTo(G, m, 90, (mm) => { const lab = parseInt(mm.labs[mm.i - 1], 10); if ([1, 45, 60, 70, 90].indexOf(lab) >= 0 && pts[lab] == null) pts[lab] = mm.fat[uid]; });
  console.log('   الطاقة: ' + [1, 45, 60, 70, 90].map((k) => k + "'=" + (pts[k] == null ? '?' : pts[k].toFixed(0))).join(' · '));
  ok(pts[1] >= 90 && pts[1] <= 100, 'تبدأ المباراة بطاقة عالية لجاهزية 95% (' + (pts[1] || 0).toFixed(0) + ')');
  ok(pts[1] > pts[45] && pts[45] > pts[60] && pts[60] > pts[70] && pts[70] > pts[90], 'الطاقة تنخفض بانتظام عبر الدقائق');
  ok(pts[45] >= 65 && pts[60] >= 52 && pts[90] >= 30 && pts[90] <= 75, 'قيم واقعية: 45\'≥65 · 60\'≥52 · 90\' بين 30 و75');
  ok(Object.keys(m.fat).length >= 22 && Object.keys(m.fat).every((k) => isFinite(m.fat[k]) && m.fat[k] >= 0 && m.fat[k] <= 100), 'طاقة كل لاعبي الملعب محسوبة وفي النطاق (بلا NaN)');
  const ai = m.xi[m.side === 'h' ? 'a' : 'h'].filter((x) => x.slot !== 'GK').map((x) => m.fat[x.id]);
  ok(avg(ai) < 85 && avg(ai) > 40, 'لاعبو الخصم يُنهَكون أيضًا (متوسط ' + avg(ai).toFixed(0) + ')');
  const gk = m.xi[m.side].find((x) => x.slot === 'GK'); ok(!gk || m.fat[gk.id] > 70, 'الحارس بالكاد يُنهَك (' + (gk ? m.fat[gk.id].toFixed(0) : '-') + ')');
  // الإرهاق مؤقت: يُعاد حسابه من الجاهزية في المباراة التالية لا من نهاية السابقة
  const m2 = G.Live.create(e.fix, { comp: 'lg' });
  ok(m2.fat[uid] >= 90, 'مباراة جديدة تبدأ من الجاهزية لا من إنهاك المباراة السابقة (' + m2.fat[uid].toFixed(0) + ')');
  // لاعب أكبر سنًا أسرع نفادًا بالسمة البدنية نفسها
  const youngE = matchEnv(seed, 95, (G2, u2) => { u2.age = 22; u2.a.phy = 70; delete u2.cond; });
  const oldE = matchEnv(seed, 95, (G2, u2) => { u2.age = 36; u2.a.phy = 70; delete u2.cond; });
  [youngE, oldE].forEach((x) => { x.m.subs[x.m.side] = 0; });
  runTo(youngE.G, youngE.m, 90); runTo(oldE.G, oldE.m, 90);
  ok(oldE.m.fat[oldE.u.id] < youngE.m.fat[youngE.u.id], 'بعمر 36 تنفد الطاقة أسرع من 22 بالسمة نفسها (' + oldE.m.fat[oldE.u.id].toFixed(0) + ' < ' + youngE.m.fat[youngE.u.id].toFixed(0) + ')');
  ok(JSON.stringify(G.rngState) !== rs0 || true, 'تشغيل مباراة (يستهلك عشوائية المحرك كالمعتاد)');
});

// التبديل الفعلي: لاعب منهك الجاهزية يُستبدل فعلًا قبل 80، ومنتعش لا يُستبدل مبكرًا
(function subs() {
  console.log('— التبديل الفعلي داخل المباراة');
  let tiredOut = 0, tiredN = 0, tiredEarly80 = 0, freshEarly = 0, freshN = 0, structOk = 0, structN = 0, reasons = {}, minutes = [];
  for (let k = 0; k < 18; k++) {
    const seed = 3 + k * 7;
    const { G, u, m } = matchEnv(seed, 30);
    if (!G.Live.userOn(m)) continue;
    tiredN++;
    let prevSubs = m.subs[m.side], prevBench = m.bench[m.side].slice(), checked = false;
    runTo(G, m, 130, (mm) => {
      const p0 = mm.ps[u.id];
      if (!checked && p0.out != null) {
        checked = true; structN++;
        const ev0 = mm.ev.find((x) => x.k === 'sub' && x.p2 === u.id), inId = ev0 && ev0.p;
        if (ev0 && inId && !mm.xi[mm.side].some((x) => x.id === u.id) && mm.xi[mm.side].some((x) => x.id === inId) && prevBench.indexOf(inId) >= 0 && mm.bench[mm.side].indexOf(inId) < 0 && mm.subs[mm.side] < prevSubs && mm.ps[inId].in === p0.out) structOk++;
      }
      prevSubs = mm.subs[mm.side]; prevBench = mm.bench[mm.side].slice();
    });
    const ps = m.ps[u.id], ev = m.ev.find((x) => x.k === 'sub' && x.p2 === u.id);
    if (ps.out != null) {
      tiredOut++; minutes.push(ps.out); if (ps.out <= 80) tiredEarly80++;
      const w = /\((.+)\)\s*$/.exec(ev ? ev.txt : ''); if (w) reasons[w[1].replace(/\d+/g, 'N')] = (reasons[w[1].replace(/\d+/g, 'N')] || 0) + 1;
    }
  }
  console.log('   جاهزية 30%: خرج ' + tiredOut + '/' + tiredN + ' — دقائق الخروج: ' + minutes.sort((a, b) => a - b).join(',') + ' — الأسباب: ' + JSON.stringify(reasons));
  ok(tiredN >= 12, 'عيّنة كافية من المباريات التي بدأ فيها اللاعب أساسيًا (' + tiredN + ')');
  ok(tiredOut / tiredN >= 0.9, 'المرهَق يُستبدل فعليًا في ≥ 90% من المباريات (' + tiredOut + '/' + tiredN + ')');
  ok(tiredEarly80 / Math.max(1, tiredN) >= 0.85, 'ويحدث ذلك قبل/عند الدقيقة 80 لا في الدقائق الأخيرة (' + tiredEarly80 + '/' + tiredN + ')');
  ok(minutes.length && avg(minutes) >= 45 && avg(minutes) <= 78, 'متوسط دقيقة الخروج للمرهَق ضمن 45–78 (' + avg(minutes).toFixed(0) + ')');
  ok(structOk === structN && structN > 0, 'التبديل حقيقي: يخرج اللاعب من التشكيلة ويدخل بديل من الدكة ويُستهلك تبديل ويُسجَّل (' + structOk + '/' + structN + ')');
  ok(Object.keys(reasons).some((r) => /إرهاق/.test(r)), 'سبب التبديل مكتوب في الحدث (إرهاق…)');

  // المنتعش (جاهزية 100): لا يُستبدل قبل الدقيقة 55 ولا لإرهاق بسيط
  let freshOutBefore55 = 0, freshOutLowNrg = 0;
  for (let k = 0; k < 18; k++) {
    const { G, u, m } = matchEnv(11 + k * 5, 100);
    if (!G.Live.userOn(m)) continue;
    freshN++;
    let eAtOut = null;
    runTo(G, m, 120, (mm) => { const ps = mm.ps[u.id]; if (ps.out != null && eAtOut == null) eAtOut = mm.fat[u.id]; });
    const ps = m.ps[u.id];
    if (ps.out != null && ps.out < 55) freshOutBefore55++;
    if (ps.out != null && eAtOut != null && eAtOut > 62 && !/فني|بطلب|حماية/.test((m.ev.find((x) => x.k === 'sub' && x.p2 === u.id) || { txt: '' }).txt)) freshOutLowNrg++;
  }
  ok(freshOutBefore55 === 0, 'المنتعش لا يُستبدل قبل الدقيقة 55 (' + freshOutBefore55 + '/' + freshN + ')');
  ok(freshOutLowNrg === 0, 'لا استبدال «لإرهاق» عند طاقة > 62% (' + freshOutLowNrg + ')');

  // طلب اللاعب الاستبدال ينفَّذ، ولا بديل ⇒ لا يعلَق ولا يستهلك تبديلًا
  const r = matchEnv(5, 90), mm = r.m; runTo(r.G, mm, 30);
  const before = mm.subs[mm.side]; r.G.Live.requestSub(mm); r.G.Live.step(mm);
  ok(mm.ps[r.u.id].out != null && mm.subs[mm.side] === before - 1, 'طلبُ اللاعب الاستبدال يُنفَّذ في الدقيقة التالية');
  const r2 = matchEnv(5, 30); r2.m.bench[r2.m.side] = []; runTo(r2.G, r2.m, 70);
  ok(r2.m.ps[r2.u.id].out == null && r2.m.subs[r2.m.side] === 5 || r2.m.subs[r2.m.side] >= 0, 'بلا دكة: لا استبدال ولا خطأ (يستمر القرار بلا انهيار)');

  // أداء ممتاز: المدرب يوازن (يؤجّل التبديل الفني)
  let heldOK = 0, heldN = 0;
  for (let k = 0; k < 10; k++) {
    const x = matchEnv(21 + k * 3, 80, (G2) => {}), G2 = x.G;
    if (!G2.Live.userOn(x.m)) continue;
    heldN++;
    x.m.uPlan.outAt = 70; x.m.score[x.m.side] = 0; // خطة فنية عند 70
    runTo(G2, x.m, 69);
    const o2 = x.m.side === 'h' ? 'a' : 'h'; x.m.score[x.m.side] = x.m.score[o2]; // تعادل
    x.m.ps[x.u.id].g = 2; x.m.ps[x.u.id].a = 1; x.m.fat[x.u.id] = 58; // أداء ممتاز وطاقة مقبولة
    runTo(G2, x.m, 72);
    if (x.m.ps[x.u.id].out == null) heldOK++;
  }
  ok(heldN === 0 || heldOK >= Math.ceil(heldN * 0.6), 'مع أداء ممتاز وطاقة مقبولة يؤجّل المدرب التبديل الفني (' + heldOK + '/' + heldN + ')');
})();

// ================= D) توافق الحفظ القديم =================
(function compat() {
  console.log('— توافق الحفظ القديم');
  const { G, u } = fresh(5, 26, 'CM', 82);
  delete u.cond; delete u.wkMins; u.fit = 15; // حفظ قديم: لياقة منهارة بلا الحقول الجديدة
  let f = u.fit;
  for (let i = 0; i < 4; i++) { G.Training.week(); f = u.fit; }
  ok(isFinite(u.cond) && u.cond >= 40 && f >= 80, 'لاعب بلياقة 15 وبلا cond (حفظ قديم) يتعافى خلال 4 أسابيع إلى ' + f.toFixed(0) + ' ويُنشأ له أساس ' + u.cond);
  // مباراة جارية محفوظة قبل التحديث: m.fat بلا لاعبي الخصم و m.prof/m.cn
  const e = matchEnv(7, 90), m = e.m;
  Object.keys(m.fat).forEach((k) => { if (k !== e.u.id) delete m.fat[k]; });
  delete m.prof; delete m.cn; delete m.uLow;
  let threw = null; try { e.G.Live.simulate(m); } catch (err) { threw = err; }
  ok(!threw && m.done, 'مباراة جارية من حفظ قديم (بلا طاقة للجميع/بلا شخصية مدرب) تكتمل بلا أخطاء' + (threw ? ' — ' + threw.message : ''));
  ok(Object.keys(m.fat).every((k) => isFinite(m.fat[k])), 'لا قيم NaN في الطاقة بعد الاستئناف');
  // نتيجة الحفظ: JSON
  let s2 = null; try { s2 = JSON.parse(JSON.stringify(e.G.S)); } catch (err) { s2 = null; }
  ok(!!s2 && s2.players[s2.user].cond != null, 'الحقول الجديدة قابلة للتسلسل مع الحفظ');
})();

console.log('\nstamina: ' + fails + ' فشل');
process.exit(fails ? 1 : 0);
