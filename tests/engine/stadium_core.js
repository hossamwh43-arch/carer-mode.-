/* اختبار منطق «الملعب المرئي» الصافي (Node بلا متصفح): الإحداثيات والمنظور والأطقم وتخطيط الهجمات، وأهم شرط: لا يمسّ عشوائية اللعبة.
   الاستخدام: node tests/engine/stadium_core.js */
const { load } = require('./loader');
const { G } = load();
const SC = G.Stadium;
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
G.Season.newGame({ name: 'ح', nat: 'IQ', age: 19, pos: 'CM', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: 'ath', seed: 3, diff: 'normal' });

// 1) عزل العشوائية: حالة مولّد اللعبة لا تتغير بأي استدعاء
const rs0 = G.rngState;
const r = SC.rng(SC.hash('m1:2026'));
const seq1 = [r(), r(), r()], r2 = SC.rng(SC.hash('m1:2026')), seq2 = [r2(), r2(), r2()];
ok(JSON.stringify(seq1) === JSON.stringify(seq2), 'المولّد الخاص حتمي بالبذرة');
ok(SC.rng(SC.hash('a'))() !== SC.rng(SC.hash('b'))(), 'بذور مختلفة ⇒ قيم مختلفة');

// 2) تموضع الخطط
const forms = Object.keys(SC.FORM_XY);
forms.forEach((f) => ['h', 'a'].forEach((side) => {
  const slots = G.FORMATIONS[f], xi = slots.map((s, i) => ({ id: 'p' + i, slot: s }));
  const lay = SC.layout(xi, f, side, (ff) => G.FORMATIONS[ff]);
  const inb = lay.every((e) => e.base[0] >= 0 && e.base[0] <= SC.L && e.base[1] >= 4 && e.base[1] <= SC.W - 4);
  let minD = 99; for (let i = 0; i < lay.length; i++) for (let j = i + 1; j < lay.length; j++) minD = Math.min(minD, SC.dist(lay[i].base, lay[j].base));
  const gk = lay.find((e) => e.slot === 'GK'), st = lay.filter((e) => e.slot === 'ST');
  const gkOk = side === 'h' ? gk.base[0] > SC.L - 8 : gk.base[0] < 8;
  const stOk = st.every((e) => (side === 'h' ? e.base[0] < SC.L / 2 + 8 : e.base[0] > SC.L / 2 - 8));
  ok(inb && minD >= 7 && gkOk && stOk, f + ' / ' + side + ': داخل الملعب، أقل مسافة بين لاعبين ' + minD.toFixed(1) + 'م، الحارس عند مرماه، المهاجمون في نصف الخصم');
}));
// عند طرد لاعب (10 لاعبين) أو تبديل بخانة مختلفة لا ينهار التوزيع
const f433 = G.FORMATIONS['4-3-3'], xi10 = f433.slice(0, 10).map((s, i) => ({ id: 'q' + i, slot: s }));
ok(SC.layout(xi10, '4-3-3', 'h', (ff) => G.FORMATIONS[ff]).length === 10, 'تشكيلة من 10 لاعبين تُوزَّع بلا خطأ');

// 3) الأطقم: لا تعارض بين أي ناديين في العالم، ولا الحارس مع القميصين
const clubs = Object.values(G.S.clubs).filter((c) => c.c && c.c.length >= 2);
let clash = 0, gkClash = 0, pairs = 0;
for (let i = 0; i < clubs.length; i++) for (let j = 0; j < clubs.length; j += 3) {
  if (i === j) continue; pairs++;
  const k = SC.kits(clubs[i].c, clubs[j].c);
  if (SC.cdist(k.h.shirt, k.a.shirt) < SC.CLASH) clash++;
  if ([k.h.gk, k.a.gk].some((g) => SC.cdist(g, k.h.shirt) <= SC.CLASH * 0.7 || SC.cdist(g, k.a.shirt) <= SC.CLASH * 0.7)) gkClash++;
}
ok(clash === 0, 'لا تعارض قمصان بين أي مباراتين (' + pairs + ' مباراة مفحوصة، ' + clubs.length + ' ناديًا)');
ok(gkClash === 0, 'قميص الحارس يختلف عن قميصي الفريقين في كل المباريات المفحوصة (' + gkClash + ' تعارض)');

// 4) الإسقاط (المنظور)
[['tv', 360, 238], ['top', 360, 238], ['tv', 412, 272]].forEach(([mode, w, h]) => {
  const cam = { mode, zoom: 1 };
  const far = SC.project(cam, w, h, 52.5, 0), near = SC.project(cam, w, h, 52.5, SC.W), c = SC.project(cam, w, h, 52.5, SC.CZ);
  const corners = [[0, 0], [SC.L, 0], [0, SC.W], [SC.L, SC.W]].map(([x, z]) => SC.project(cam, w, h, x, z));
  const inside = corners.every((p) => p[0] >= -w * 0.06 && p[0] <= w * 1.06 && p[1] >= 0 && p[1] <= h);
  ok(far[1] < c[1] && c[1] < near[1] && inside, mode + ' ' + w + '×' + h + ': ترتيب العمق صحيح وأركان الملعب داخل الإطار');
  if (mode === 'tv') ok(far[2] < near[2], 'tv: المقياس عند الحد البعيد أصغر منه عند القريب (' + far[2].toFixed(2) + ' < ' + near[2].toFixed(2) + ')');
  ok(Math.abs(c[0] - w / 2) < 1, mode + ': منتصف الملعب في منتصف الشاشة أفقيًا');
});
const fz = SC.project({ mode: 'tv', zoom: 1.6, cx: 30, cz: 34 }, 360, 238, 30, 34);
ok(Math.abs(fz[0] - 180) < 1 && Math.abs(fz[1] - 238 * 0.6) < 2, 'كاميرا التتبع: نقطة التركيز في مركز الإطار (' + fz[0].toFixed(0) + ',' + fz[1].toFixed(0) + ')');

// 5) تخطيط الهجمات
const mk = (side, n) => Array.from({ length: n }, (_, i) => ({ id: side + i, slot: i === 0 ? 'GK' : i < 5 ? 'CB' : i < 8 ? 'CM' : 'ST', x: side === 'h' ? SC.L - 5 - i * 5 : 5 + i * 5, z: 8 + (i * 6) % 52 }));
const rnd = SC.rng(7); let bad = 0, cnt = { goal: 0, save: 0, miss: 0 }, dmax = 0, dmin = 99, t0 = Date.now();
for (let k = 0; k < 600; k++) {
  const side = k % 2 ? 'h' : 'a', outcome = ['goal', 'save', 'miss'][k % 3], ents = mk(side, 11);
  const pl = SC.planAttack(rnd, { side, ents, shooter: k % 5 ? ents[9].id : null, assist: k % 4 ? ents[7].id : null, outcome });
  if (!pl) { bad++; continue; }
  cnt[outcome]++;
  const gx = SC.goalX(side), mouth = SC.GOAL_W / 2, tg = pl.shot.to;
  if (!pl.seq.every((id) => id[0] === side)) bad++;
  if (outcome === 'goal' && !(Math.abs(tg[1] - SC.CZ) < mouth && tg[2] < 2.44 && Math.abs(tg[0] - gx) < 1.5)) bad++;
  if (outcome === 'save' && !(Math.abs(tg[1] - SC.CZ) < mouth && tg[2] < 2.44)) bad++;
  if (outcome === 'miss' && !(Math.abs(tg[1] - SC.CZ) > mouth || tg[2] > 2.44)) bad++;
  const toGoal = gx < SC.L / 2 ? -1 : 1;
  if (!(pl.shot.from[0] * toGoal > (gx - toGoal * 30) * toGoal - 0.001)) bad++; // المسدِّد داخل 30م من المرمى
  if (pl.seq[pl.seq.length - 1] !== (k % 5 ? ents[9].id : pl.seq[pl.seq.length - 1])) bad++;
  const d = SC.planDuration(pl, 1); dmax = Math.max(dmax, d); dmin = Math.min(dmin, d);
}
ok(bad === 0, '600 هجمة مخطَّطة (' + JSON.stringify(cnt) + '): الأهداف داخل المرمى، التصديات قابلة للتصدي، الإهدارات خارجه، والتمريرات من لاعبي المهاجم فقط (' + bad + ' مخالفة)');
ok(dmin >= 1.2 && dmax <= 7, 'مدة الهجمة بين ' + dmin.toFixed(1) + ' و' + dmax.toFixed(1) + ' ثانية');
ok((Date.now() - t0) / 600 < 1, 'تخطيط الهجمة سريع (' + ((Date.now() - t0) / 600).toFixed(3) + ' مللي/هجمة)');
ok(G.rngState === rs0, 'حالة مولّد عشوائية اللعبة لم تتغيّر إطلاقًا (' + rs0 + ')');
console.log('\nstadium_core: ' + fails + ' فشل');
process.exit(fails ? 1 : 0);
