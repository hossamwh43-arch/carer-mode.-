// اختبار محرك: «المدير الفني» (Build 28) — تعيين حتمي بلا عشوائية، قرار التعاقد بالقيمة الحدّية (لا نجم خامس بمركز مكتظّ؛ تُسدّ الثغرة أولًا)،
// بيع/إعارة الفائض، إقالة وتعيين في نهاية الموسم، ترحيل الحفظ القديم، حجم الحفظ، ومقارنة أمام المنطق القديم (D.on=false) على نفس البذرة.
// الاستخدام: node tests/engine/director.js [مواسم المقارنة=3]
const { load } = require('./loader');
const N = +(process.argv[2] || 3);
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };
const NEW = { name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: 3, diff: 'normal' };
function boot(off) { const { G } = load(); if (off) G.Director.on = false; G.Season.newGame(NEW); G.S.preLeft = 0; G.Season.startSeason(); return G; }
const play = (G) => { G.S.tour = 9; for (let i = 0; i < 80; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => G.Transfers.rejectOffer(o.id)); if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break; } if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish(); };
const next = (G) => { const rr = G.Season.rollover(); if (G.S.userExpired && G.Transfers.emergencyContract) G.Transfers.emergencyContract(); if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); } return rr; };

// ---------- 1) التعيين ----------
let G = boot(false); const D = G.Director, T = G.Transfers, S = G.S;
const clubs = Object.values(S.clubs);
ok(clubs.every((c) => c.mgr && c.mgr.n && D.STYLES[c.mgr.st]), 'لكل الأندية (' + clubs.length + ') مدير بأسلوب معروف');
ok(new Set(clubs.map((c) => c.mgr.n)).size === clubs.length, 'أسماء المديرين فريدة');
ok(clubs.every((c) => c.mgr.age >= 40 && c.mgr.age <= 66 && c.mgr.rt >= 46 && c.mgr.rt <= 94 && c.mgr.since >= 1), 'العمر والكفاءة والمدة ضمن النطاق');
const styles = {}; clubs.forEach((c) => { styles[c.mgr.st] = (styles[c.mgr.st] || 0) + 1; });
ok(Object.keys(styles).length === 6, 'الأساليب الستة كلها حاضرة: ' + JSON.stringify(styles));
const bigStars = clubs.filter((c) => c.rep >= 82), smallStars = clubs.filter((c) => c.rep < 70);
const sh = (a) => a.filter((c) => c.mgr.st === 'stars').length / a.length;
ok(sh(bigStars) > sh(smallStars), 'الأندية الكبرى أميل لمدير «يعشق النجوم» (' + (sh(bigStars) * 100).toFixed(0) + '% مقابل ' + (sh(smallStars) * 100).toFixed(0) + '%)');
// حتمية + لا عشوائية + ترحيل
const before = JSON.stringify(clubs.map((c) => [c.id, c.mgr])), rng0 = JSON.stringify(S.rng);
clubs.forEach((c) => { delete c.mgr; });
G.migrations.forEach((f) => { try { f(); } catch (e) { /* مثل التطبيق */ } });
ok(JSON.stringify(Object.values(S.clubs).map((c) => [c.id, c.mgr])) === before, 'ترحيل حفظ قديم بلا مديرين يعيد المديرين أنفسهم بالضبط (حتمي)');
ok(JSON.stringify(S.rng) === rng0, 'التعيين/الترحيل لا يستهلك عشوائية اللعبة');
ok(D.init() === 0, 'إعادة التعيين لا تغيّر شيئًا');

// ---------- 2) القيمة الحدّية: لا تكديس ----------
const club = S.clubs.rma, q = T.clubQ(club);
const pool = () => club.squad.map((id) => S.players[id]).filter((p) => p && !p.user);
const mk = (pos, ovr, id) => { const b = JSON.parse(JSON.stringify(pool()[0])); b.id = id; b.pos = pos; b.ovr = ovr; b.pot = ovr; b.age = 26; b.club = null; b.user = false; b.parent = null; b.parentPays = false; b.ct = { y: 3, w: 1000 }; b.val = 2e6; G.Players.refresh(b); b.ovr = ovr; S.players[id] = b; return b; };
club.form = '4-3-3'; club.tb = 5e9; club.wcap = 1e9;
const sts = pool().filter((p) => p.pos === 'ST'); while (sts.length < 4) { const x = pool().find((p) => p.pos !== 'ST' && p.pos !== 'GK' && !sts.includes(p)); x.pos = 'ST'; sts.push(x); }
sts.forEach((p) => { p.ovr = Math.round(q + 6); });
pool().filter((p) => p.pos === 'LB').forEach((p) => { p.ovr = 50; });
const star = mk('ST', Math.round(q + 6), '__star'), lb = mk('LB', Math.round(q + 1), '__lb');
club.mgr.st = 'balanced'; club.mgr.rt = 70;
const by = { ST: [star], LB: [lb] };
let cands = D.candidates(club, by, 0) || [];
ok(!cands.some((c) => c.p.id === '__star'), 'نجم خامس بمركز مكتظّ (ST بـ4 نجوم و خانة واحدة) مرفوض — يضيف صفرًا للتشكيلة الأساسية');
ok(cands.some((c) => c.p.id === '__lb' && c.kind === 'upgrade' && c.gain >= D.minGain(club)), 'ظهير أيسر أفضل من الأساسي (50) مرشّح بقيمة حدّية كبيرة (' + (cands[0] ? cands[0].gain.toFixed(1) : '—') + ')');
ok(cands.length && cands[0].p.id === '__lb', 'الثغرة أولًا: الظهير الأيسر في صدارة المرشّحين');
const wk = D.weakSlots(club, D.view(club)); ok(wk.length && wk[0].pos === 'LB', 'الثغرة الأكبر عند المدير: الظهير الأيسر (' + (wk[0] && wk[0].pos) + ')');
// الأسلوب يغيّر القرار: «يعشق النجوم» يخفّض عتبة الكسب، «يبني بالشباب» يرفعها
club.mgr.st = 'stars'; const gS = D.minGain(club); club.mgr.st = 'youth'; const gY = D.minGain(club); club.mgr.st = 'balanced';
ok(gS < D.minGain(club) && gY > D.minGain(club), 'أسلوب النجوم أقل تشددًا في الكسب الأدنى من المتوازن، والشباب أكثر');
const rngB = JSON.stringify(S.rng); D.candidates(club, by, 1); D.surplusList(club); D.view(club); ok(JSON.stringify(S.rng) === rngB, 'تقدير المرشّحين لا يستهلك العشوائية');
delete S.players.__star; delete S.players.__lb;
// الفائض: نجم دكة فوق البديل الأول
const sp = D.surplusList(S.clubs.rma); ok(Array.isArray(sp), 'قائمة الفائض تُحسب (' + sp.length + ')');

// ---------- 3) مواسم: إقالة/تعيين + حجم + مقارنة قبل/بعد ----------
function run(off) {
  const g = boot(off), gt = g.Transfers; const m = { pile: [], bstar: [], holes: [], chg: [], sizes: [] };
  for (let s = 1; s <= N; s++) {
    play(g); const top5 = ['ESP1', 'ENG1', 'ITA1', 'GER1', 'FRA1'];
    const rr = next(g); if (!rr.ok) break;
    let n = 0, pile = 0, bstar = 0, holes = 0;
    top5.forEach((lg) => g.World.members(lg).forEach((id) => {
      const c = g.S.clubs[id]; if (!c || c.light) return; n++; const qq = gt.clubQ(c);
      const pl = c.squad.map((x) => g.S.players[x]).filter((p) => p && !p.user), slots = g.Lineup.slots(c), xi = g.Lineup.best(pl, slots, 0) || [], inX = {}; xi.forEach((x) => { inX[x.id] = 1; });
      const need = {}; slots.forEach((x) => { need[x] = (need[x] || 0) + 1; });
      const byPos = {}; pl.filter((p) => p.ovr >= qq - 4).forEach((p) => { byPos[p.pos] = (byPos[p.pos] || 0) + 1; });
      Object.keys(byPos).forEach((k) => { pile += Math.max(0, byPos[k] - (need[k] || 0) - 1); });
      bstar += pl.filter((p) => p.ovr >= qq + 1 && !inX[p.id]).length; xi.forEach((x) => { if (g.Lineup.eff(g.S.players[x.id], x.slot) < qq - 8) holes++; });
    }));
    m.pile.push(pile / n); m.bstar.push(bstar / n); m.holes.push(holes / n); m.chg.push((g.S.mgrChanges || []).length);
    m.sizes.push(JSON.stringify(Object.values(g.S.clubs).map((c) => c.mgr)).length);
  }
  return { g, m };
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const A = run(false), B = run(true);
const mA = A.m, mB = B.m, GA = A.g;
console.log('— قياس ' + N + ' مواسم (بذرة 3): المدير الفني مقابل المنطق القديم');
console.log('   تكدّس المركز  ' + avg(mA.pile).toFixed(2) + ' مقابل ' + avg(mB.pile).toFixed(2) + ' · نجوم على الدكة ' + avg(mA.bstar).toFixed(2) + ' مقابل ' + avg(mB.bstar).toFixed(2) + ' · ثغرات ' + avg(mA.holes).toFixed(2) + ' مقابل ' + avg(mB.holes).toFixed(2));
console.log('   عدّادات بيع الفائض: ' + JSON.stringify(GA.Director.stats));
ok(avg(mA.pile) <= avg(mB.pile) * 1.02, 'تكدّس المراكز مع المدير ≤ المنطق القديم (' + avg(mA.pile).toFixed(2) + ' مقابل ' + avg(mB.pile).toFixed(2) + ')');
ok(avg(mA.holes) <= avg(mB.holes) * 1.15 + 0.03, 'ثغرات التشكيلة لا تسوء (' + avg(mA.holes).toFixed(2) + ' مقابل ' + avg(mB.holes).toFixed(2) + ')');
ok(avg(mA.bstar) <= avg(mB.bstar) * 1.25 + 0.03, 'نجوم الدكة لا تزداد (' + avg(mA.bstar).toFixed(2) + ' مقابل ' + avg(mB.bstar).toFixed(2) + ')');
const X = GA.Director.stats; ok(X.sold + X.loan > 0, 'المديرون يبيعون/يعيرون الفائض فعلًا (بيع ' + X.sold + ' · إعارة ' + X.loan + ')');
ok(mA.chg.every((c) => c >= 3 && c <= 70), 'تغييرات المديرين كل موسم معقولة: ' + mA.chg.join('، '));
const cs = Object.values(GA.S.clubs); ok(cs.every((c) => c.mgr) && new Set(cs.map((c) => c.mgr.n)).size === cs.length, 'بعد المواسم: لكل ناد مدير وأسماء فريدة');
const changed = cs.filter((c) => c.mgr.hist && c.mgr.hist.length); ok(changed.length > 0 && changed.every((c) => c.mgr.hist[0].n && c.mgr.log.length >= 1), 'من خلف مديرًا يسجّل سابقه وسبب التعيين (' + changed.length + ' ناديًا)');
ok(Math.max.apply(null, mA.sizes) < 120000, 'حجم بيانات المديرين في الحفظ صغير (' + (Math.max.apply(null, mA.sizes) / 1000).toFixed(0) + ' ألف حرف)');
play(GA); // الموسم التالي يُلعب بسلام بعد كل التغييرات
const un = Object.values(GA.S.players).filter((p) => p.user); ok(un.length === 1, 'لاعب المستخدم سليم');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
process.exit(fail ? 1 : 0);
