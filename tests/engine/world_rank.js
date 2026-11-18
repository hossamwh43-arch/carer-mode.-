/* اختبار «تصنيفات العالم» (Node بلا متصفح، ~1 دقيقة): يلعب N موسمًا مرتين على البذرة نفسها —
   مرة والأرشفة تعمل ومرة والأرشفة معطّلة — ويفشل إن: لم يُؤرشف كل موسم مرة واحدة، أو كان الترتيب غير مرتّب/فيه معرّف تالف،
   أو استهلكت الأرشفة عشوائية اللعبة (حالة RNG أو أبطال الدوريات تختلف)، أو انتفخ حجم الأرشيف، أو عاد خطأ وزن كأس العالم ('WC' مقابل 'wc').
   الاستخدام: node tests/engine/world_rank.js [مواسم=5] [بذرة=3] */
const { load } = require('./loader');
const N = +(process.argv[2] || 5), SEED = +(process.argv[3] || 3);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

function run(enabled) {
  const { G } = load();
  const T = G.Transfers;
  if (!enabled) G.WorldRank.archive = () => null;
  G.Season.newGame({ name: 'حسام', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: SEED, diff: 'normal' });
  G.S.preLeft = 0; G.Season.startSeason();
  const champs = [];
  for (let s = 1; s <= N; s++) {
    G.S.tour = 9;
    for (let i = 0; i < 80; i++) {
      const r = G.Sim.run({ mode: 'event', autoDP: true });
      if (G.S.offers && G.S.offers.length) G.S.offers.slice().forEach((o) => T.rejectOffer(o.id));
      if (G.S.phase === 'end' || (r && r.run && r.run.stop && r.run.stop.reason === 'end')) break;
    }
    if (G.S.intl && !G.S.intl.done) G.Intl.autoFinish();
    champs.push(JSON.stringify(G.World.champions()));
    const rr = G.Season.rollover();
    if (!rr.ok) break;
    if (G.S.userExpired && T.emergencyContract) T.emergencyContract();
    if (G.S.phase === 'summer') { G.S.preLeft = 0; G.Season.startSeason(); }
    if (G.S.phase === 'retired') break;
  }
  return { G, champs, rng: JSON.stringify(G.rngState), played: champs.length };
}

console.log('— تشغيل مع الأرشفة');
const A = run(true);
const G = A.G, H = G.S.worldRankHistory || [];
ok(H.length === A.played, 'أُرشف كل موسم مرة واحدة (' + H.length + ' سجلًا لـ ' + A.played + ' مواسم)');
ok(H.every((r, i) => i === 0 || r.n > H[i - 1].n), 'السجلات مرتّبة تصاعديًا بلا تكرار');
ok(H.every((r) => r.clubs.length === G.WorldRank.KEEP && r.nations.length === G.WorldRank.KEEP), 'كل سجل فيه أفضل ' + G.WorldRank.KEEP + ' نادٍ و' + G.WorldRank.KEEP + ' منتخبًا');
const sorted = (a) => a.every((x, i) => i === 0 || a[i - 1].s >= x.s);
ok(H.every((r) => sorted(r.clubs) && sorted(r.nations)), 'كل القوائم مرتّبة تنازليًا بالنقاط');
ok(H.every((r) => new Set(r.clubs.map((x) => x.i)).size === r.clubs.length && new Set(r.nations.map((x) => x.i)).size === r.nations.length), 'لا معرّف مكرّر داخل أي قائمة');
ok(H.every((r) => r.clubs.every((x) => G.S.clubs[x.i]) && r.nations.every((x) => G.NATIONS[x.i])), 'كل معرّف يشير إلى نادٍ/منتخب موجود');
const bytes = JSON.stringify(H).length;
ok(bytes <= 4500 * Math.max(1, H.length), 'حجم الأرشيف مضغوط (' + bytes + ' بايت لـ ' + H.length + ' مواسم ≈ ' + Math.round(bytes / Math.max(1, H.length)) + ' لكل موسم)');
ok(H.length < 2 || H[1].nations.some((x) => x.c !== null), 'من الموسم الثاني يظهر فرق النقاط عن الأرشيف السابق للمنتخبات');
const rows = G.WorldRank.rowsOf(H[H.length - 1], 'clubs');
ok(rows.length === G.WorldRank.KEEP && rows.every((x, i) => x.rank === i + 1 && x.name && x.lg !== undefined), 'rowsOf يعيد صفوفًا مرتّبة بأسماء ودوري');
const live = G.WorldRank.buildClubs();
ok(live.length === Object.keys(G.S.clubs).length && live[0].rep >= 80, 'ترتيب الأندية الحي يغطي كل الأندية والأول من النخبة (سمعة ' + live[0].rep + ')');
ok(JSON.stringify(JSON.parse(JSON.stringify(G.S)).worldRankHistory) === JSON.stringify(H), 'الأرشيف يسلم من دورة حفظ/تحميل JSON');

// وزن كأس العالم أثقل من كأس آسيا (كان يقارن 'wc' بأحرف صغيرة فلا يُحتسب)
const base = (type) => { G.S.intlHist = [{ type, winner: 'BR' }]; return G.WorldRank.buildNations().find((x) => x.id === 'BR').score; };
const none = (() => { G.S.intlHist = []; return G.WorldRank.buildNations().find((x) => x.id === 'BR').score; })();
const wc = base('WC'), ac = base('AC');
ok(wc - none === G.WorldRank.W.wcWin && ac - none === G.WorldRank.W.acWin && wc > ac, 'بطل كأس العالم +' + (wc - none) + ' وبطل آسيا +' + (ac - none) + ' (الأول أثقل)');

// الحد الأقصى لعدد المواسم المحفوظة
G.S.worldRankHistory = [];
for (let n = 1; n <= G.WorldRank.MAX_SEASONS + 7; n++) G.WorldRank.archive(2000 + n, n);
const h2 = G.S.worldRankHistory;
ok(h2.length === G.WorldRank.MAX_SEASONS && h2[0].n === 8 && h2[h2.length - 1].n === G.WorldRank.MAX_SEASONS + 7, 'يُحتفظ بآخر ' + G.WorldRank.MAX_SEASONS + ' موسمًا فقط (الأقدم يُحذف)');
G.WorldRank.archive(2047, G.WorldRank.MAX_SEASONS + 7);
ok(G.S.worldRankHistory.length === G.WorldRank.MAX_SEASONS, 'إعادة أرشفة الموسم نفسه تستبدل ولا تكرّر');

console.log('— تشغيل بلا أرشفة (للمقارنة: الأرشفة قراءة فقط)');
const B = run(false);
ok(A.rng === B.rng, 'حالة العشوائية متطابقة مع/بلا الأرشفة (لا استهلاك U.rnd)');
ok(JSON.stringify(A.champs) === JSON.stringify(B.champs), 'أبطال كل الدوريات متطابقون مع/بلا الأرشفة (' + A.champs.length + ' مواسم)');
ok((B.G.S.worldRankHistory || []).length === 0, 'المقارنة فعلًا بلا أرشيف');

console.log('\nworld_rank: ' + fails + ' فشل');
process.exit(fails ? 1 : 0);
