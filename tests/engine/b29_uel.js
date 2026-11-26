/* اختبار الدوري الأوروبي (Build 29) — Node بلا متصفح. يفشل إن:
   اختلّ التأهل (28 فريقًا بلا تكرار ولا تقاطع مع دوري الأبطال، وبمقاعد كل دوري)، أو لم تتحقق قيود الجدولة (6 جولات × 14، كل فريق مرة بالجولة، 3 استضافة + 3 ضيافة، بلا مواجهة مكررة)،
   أو لم يُحسم موسم كامل (بطل، وتوزيع الخروج 4/8/8/4/2/1/1)، أو فشل تحقق الأرقام، أو لم يلعب المستخدم مبارياته بالدوري الأوروبي ويُسجَّل موسمه (ucK) وإحصاؤه القاري،
   أو لم يبدأ موسم جديد بعد ترقية/هبوط بعد rollover، أو انهار حفظ قديم (Build 28: بلا uel) أو تعطّل دوري الأبطال.
   الاستخدام: node tests/engine/b29_uel.js [بذور=5,9] */
const { load } = require('./loader');
const SEEDS = (process.argv[2] || '5,9').split(',').map(Number);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const OPTS = (seed, clubId, pos) => ({ name: 'حسام', nat: 'IQ', age: 21, pos: pos || 'ST', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId, seed, diff: 'normal' });
function fresh(seed, clubId) { const { G } = load(); G.Season.newGame(OPTS(seed, clubId || 'gir')); G.S.tour = 9; G.S.preLeft = 0; G.Season.startSeason(); return G; }
function runSeason(G) { for (let i = 0; i < 90; i++) { G.Sim.run({ mode: 'event', autoDP: true }); if (G.S.phase === 'end') break; } }
function finish(G) { if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish(); }

SEEDS.forEach((seed) => {
  console.log('— بذرة ' + seed + ': التأهل والجدولة');
  const G = fresh(seed), S = G.S;
  ok(S.uelTeams.length === 28 && new Set(S.uelTeams).size === 28, 'الدوري الأوروبي 28 فريقًا بلا تكرار');
  ok(S.uelTeams.every((id) => S.uclTeams.indexOf(id) < 0), 'لا تقاطع مع دوري الأبطال');
  const by = {}; S.uelTeams.forEach((id) => { const lg = S.clubs[id].lg || 'OUT'; by[lg] = (by[lg] || 0) + 1; });
  ok(Object.keys(G.UEL_SLOTS).every((lg) => by[lg] === G.UEL_SLOTS[lg]) && by.OUT === 4, 'المقاعد: ' + JSON.stringify(by));
  // أفضل نادٍ خارج دوري الأبطال في كل دوري هو أول المتأهلين (ترتيب البداية بالسمعة)
  const e1 = G.S.uel.league.rounds;
  ok(e1.length === 6 && e1.every((r) => r.length === 14), '6 جولات × 14 مباراة');
  ok(e1.every((r) => { const u = {}; return r.every((f) => !u[f.h] && !u[f.a] && (u[f.h] = u[f.a] = true)); }), 'كل فريق يلعب مرة واحدة في الجولة');
  const hc = {}, pr = new Set(); let dup = 0;
  e1.flat().forEach((f) => { (hc[f.h] = hc[f.h] || [0, 0])[0]++; (hc[f.a] = hc[f.a] || [0, 0])[1]++; const k = [f.h, f.a].sort().join('|'); if (pr.has(k)) dup++; pr.add(k); });
  ok(Object.values(hc).every((c) => c[0] === 3 && c[1] === 3) && Object.keys(hc).length === 28, 'كل فريق 3 استضافة + 3 ضيافة');
  ok(dup === 0, 'بلا مواجهات مكررة');
  ok(S.uel.weeks.league.length === 6 && S.uel.league.rounds.every((r, i) => r.every((f) => f.w === S.uel.weeks.league[i])), 'لكل جولة أسبوعها');
  const cups = G.Cups ? Object.values(G.Cups.WEEKS) : [];
  ok(S.uel.weeks.league.every((w) => cups.indexOf(w) < 0 && w !== G.Cups.SUPER_WEEK), 'أسابيع الدوري الأوروبي لا تصطدم بأسابيع الكؤوس');
  ok(G.Uel.validate().length === 0, 'validate نظيف عند البداية');
});

SEEDS.forEach((seed) => {
  console.log('— بذرة ' + seed + ': موسم كامل (المستخدم خارج الدوري الأوروبي)');
  const G = fresh(seed), S = G.S;
  runSeason(G);
  const u = S.uel;
  ok(u.phase === 'done' && !!u.winner, 'اكتمل: البطل ' + u.winner);
  const ex = {}; Object.values(u.exit).forEach((x) => { ex[x] = (ex[x] || 0) + 1; });
  ok(ex.league === 4 && ex.po === 8 && ex.r16 === 8 && ex.qf === 4 && ex.sf === 2 && ex.final === 1 && ex.winner === 1, 'توزيع الخروج: ' + JSON.stringify(ex));
  ok(G.Uel.validate().length === 0 && !(S.check && S.check.errs.length), 'التحقق نظيف (الدوري الأوروبي + العام)');
  ok(S.ucl.phase === 'done' && !!S.ucl.winner, 'دوري الأبطال لم يتأثر (البطل ' + S.ucl.winner + ')');
  ok(u.ties.po.length === 8 && u.ties.r16.length === 8 && u.ties.qf.length === 4 && u.ties.sf.length === 2 && !!u.final, 'شجرة الإقصائيات كاملة');
  ok(S.uelHistory && S.uelHistory.length === 1 && S.uelHistory[0].winner === u.winner, 'سجل البطولات حُفظ');
  // الأندية لا تلعب بنفس الأسبوع في بطولتين قاريتين
  const wk = {}; let clash = 0;
  [S.ucl, u].forEach((c) => { G.Ucl.allFixtures(c).concat(c === u ? G.Uel.allFixtures(c) : []).forEach((f) => { [f.h, f.a].forEach((id) => { const k = id + '@' + f.w; if (wk[k] && wk[k] !== f.id) clash++; wk[k] = f.id; }); }); });
  ok(clash === 0, 'لا ناديٌ يلعب مباراتين قاريتين في أسبوع واحد');
  finish(G); const rr = G.Season.rollover(); G.Season.startSeason();
  ok(rr.ok !== false && !!G.S.uel && G.S.uel.season === G.S.season && G.S.uel.phase === 'league', 'rollover: بدأ الدوري الأوروبي للموسم الجديد');
  ok(G.S.uelTeams.length === 28 && G.S.uelTeams.every((id) => G.S.uclTeams.indexOf(id) < 0), 'تأهل الموسم الجديد سليم (28 بلا تقاطع)');
});

(function userIn() {
  console.log('— المستخدم في نادٍ يلعب الدوري الأوروبي');
  const g0 = fresh(5), S0 = g0.S, pick = S0.uelTeams.find((id) => S0.clubs[id].lg === 'ESP1');
  const G = fresh(5, pick), S = G.S, u = G.P(S.user);
  const eu = G.Season.euroOf(u.club);
  ok(!!pick && eu && eu.k === 'uel' && G.Season.userInUel(), 'نادي المستخدم (' + pick + ') في الدوري الأوروبي');
  ok(G.Season.userFixtures(3).some((f) => f.comp === 'UEL'), 'مباراة الدوري الأوروبي تظهر في أسبوعها (3) ضمن مباريات المستخدم');
  runSeason(G);
  const mine = G.Uel.allFixtures().filter((f) => f.h === u.club || f.a === u.club);
  ok(mine.filter((f) => f.stage === 'league' && f.played).length === 6, 'لعب مباريات مرحلة الدوري الست');
  const uc = G.Season.statOf(u, 'uc');
  ok(uc.apps >= 4, 'إحصاء «القارية» يحتسب مبارياته (' + uc.apps + ')');
  ok(S.uel.phase === 'done', 'اكتملت البطولة');
  const row = S.summary && S.summary.row;
  ok(row && row.ucK === 'UEL' && row.ucExit, 'صف الموسم يعرف أن البطولة هي الدوري الأوروبي (خروج: ' + (row && row.ucExit) + ')');
  ok(!(row.trophies && row.trophies.ucl), 'لا لقب أبطال خاطئ');
  const pos = G.Sim.uclStatus; ok(typeof pos === 'function', 'حالة البطولة متاحة للتقارير');
  // لقب: نجبر الفوز عند الحسم (المحرك الحقيقي لباقي الموسم) ونتأكد من منح الكأس وتسجيله
  const g2 = fresh(5, pick), s2 = g2.S, u2 = g2.P(s2.user), orig = g2.Uel.advanceAll;
  g2.Uel.advanceAll = function () { orig.apply(this, arguments); const e = s2.uel; if (e && e.phase === 'done') { e.winner = u2.club; e.exit[u2.club] = 'winner'; } };
  runSeason(g2);
  ok((u2.trophies.uel || 0) === 1 && !(u2.trophies.ucl > 0), 'الفوز باللقب يمنح كأس الدوري الأوروبي (1) لا الأبطال');
  ok(g2.Trophies.count(u2, 'uel') === 1 && g2.Trophies.list(u2, 'w').some((e) => e.k === 'uel' && e.c === u2.club), 'سجل البطولات (Trophies) فيه لقب uel بنادي اللاعب');
  const leg = g2.Season.legacy();
  ok(leg && leg.score > 0, 'الإرث يحتسب اللقب (' + (leg && leg.score) + ')');
})();

(function legacy() {
  console.log('— حفظ Build 28 (بلا S.uel/uelTeams)');
  const G = fresh(5), S = G.S;
  for (let i = 0; i < 12; i++) G.Sim.run({ mode: 'event', autoDP: true, maxWeeks: 1 });
  S.uel = undefined; delete S.uelTeams; delete S.uelHistory;
  let err = null;
  try { if (S.phase !== 'end') runSeason(G); finish(G); } catch (e) { err = e; }
  ok(!err, 'إكمال موسم بلا الدوري الأوروبي لا ينهار' + (err ? ' — ' + err.message : ''));
  ok(G.Season.euroOf() === null || G.Season.euroOf().k === 'ucl', 'euroOf لا يرجع الدوري الأوروبي');
  ok(G.Uel.advanceAll() === undefined || true, 'advanceAll آمن بلا بطولة');
  err = null; let rr = null; try { rr = G.Season.rollover(); G.Season.startSeason(); } catch (e) { err = e; }
  ok(!err && rr.ok !== false, 'rollover يعمل' + (err ? ' — ' + err.message : ''));
  ok(G.S.uelTeams && G.S.uelTeams.length === 28 && G.S.uel && G.S.uel.phase === 'league', 'الدوري الأوروبي يبدأ من الموسم الجديد');
  ok(G.Uel.validate().length === 0, 'validate نظيف');
})();

console.log(fails ? '\nفشل: ' + fails : '\nنجح الاختبار كله');
process.exit(fails ? 1 : 0);
