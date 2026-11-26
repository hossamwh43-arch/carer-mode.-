/* اختبار خانات الحفظ الثلاث والضغط (Build 29) — Node بلا متصفح. يفشل إن:
   فشل ضغط/فكّ LZW في أي حالة (عربي/إيموجي/فراغ/تكرار) أو أخرج رموزًا غير آمنة (surrogates)، أو لم يضغط حفظًا حقيقيًا ≥ 3 مرات،
   أو لم تكن الخانة 1 هي مفاتيح الحفظ الأصلية (حفظ قديم لا يُفتح)، أو تغيّر محتوى مسيرة بعد تبريدها وإعادة تحميلها،
   أو لم يتّسع ثلاث مسيرات (واحدة ساخنة + نسخة احتياطية + اثنتان باردتان) في حصة 5.2 م.حرف، أو انهار التحميل عند تلف خانة مضغوطة،
   أو فُقد الحفظ الساخن عند فشل كتابة النسخة المضغوطة، أو حذف خانة أثّر في غيرها.
   الاستخدام: node tests/engine/b29_slots.js */
const { load } = require('./loader');
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const QUOTA = 5200000;
const OPTS = (seed, name, clubId) => ({ name: name || 'حسام', nat: 'IQ', age: 20, pos: 'ST', h: 178, w: 72, foot: 'R', look: { skin: 2, hair: 0, style: 0, beard: 0, band: 0 }, num: 8, clubId: clubId || 'gir', seed, diff: 'normal' });
const total = (mem) => Object.keys(mem).reduce((a, k) => a + k.length + mem[k].length, 0);
function newGame(G, seed, name, clubId) { G.Season.newGame(OPTS(seed, name, clubId)); G.S.preLeft = 0; G.Season.startSeason(); }
function play(G, weeks) { G.S.tour = 9; for (let i = 0; i < weeks; i++) { const r = G.Sim.run({ mode: 'event', autoDP: true }); if (r && r.run && r.run.stop && r.run.stop.reason === 'end') break; } }

(function lz() {
  console.log('— ضغط LZW');
  const { G } = load(), Sv = G.Save;
  const cases = {
    'فارغ': '', 'حرف واحد': 'a', 'تكرار': 'ab'.repeat(5000), 'عربي': 'مسيرة لاعب كرة قدم — حسام الموصلي '.repeat(300),
    'إيموجي (surrogate pairs)': '⚽🏆🔥 goal 🎉'.repeat(400), 'خليط': JSON.stringify({ a: [1, 2, 3], n: 'حسام 🏆', z: null, t: true }).repeat(200)
  };
  Object.keys(cases).forEach((k) => {
    const s = cases[k], p = Sv.pack(s);
    let back = null, err = null;
    try { back = p === null ? s : Sv.unpack(p); } catch (e) { err = e; }
    ok(!err && back === s, k + ': ذهاب وإياب مطابق' + (err ? ' — ' + err.message : ''));
    if (p) { let bad = 0; const body = p.slice(p.indexOf('\n', 5) + 1); for (let i = 0; i < body.length; i++) { const c = body.charCodeAt(i); if (c >= 0xD800 && c <= 0xDFFF) bad++; } ok(bad === 0, k + ': لا رموز surrogate في المخرج'); }
  });
  // عشوائي (نمط يحاكي JSON بأحرف متنوعة) مع تجاوز حدّ القاموس لاختبار التجميد
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let big = ''; for (let i = 0; i < 400000; i++) big += String.fromCharCode(rnd() < 0.7 ? 97 + Math.floor(rnd() * 6) : 0x600 + Math.floor(rnd() * 80));
  ok(Sv.unpack(Sv.pack(big)) === big, 'نص عشوائي 400 ألف حرف يملأ القاموس ويُفكّ بدقة');
  newGame(G, 5); play(G, 20);
  const raw = JSON.stringify(G.S); let t = Date.now(); const p = Sv.pack(raw); const tp = Date.now() - t; t = Date.now(); const back = Sv.unpack(p); const tu = Date.now() - t;
  ok(back === raw, 'حفظ حقيقي (' + Math.round(raw.length / 1024) + ' ك.ب) يعود مطابقًا');
  ok(raw.length / p.length >= 3, 'نسبة الضغط ' + (raw.length / p.length).toFixed(1) + '× (المطلوب ≥ 3×) · ضغط ' + tp + 'ms · فكّ ' + tu + 'ms');
})();

(function keys() {
  console.log('— مفاتيح الخانات وحفظ قديم');
  const { G, mem } = load(), Sv = G.Save;
  ok(Sv.slot === 1 && Sv.keys(1).main === G.CONFIG.saveKey && Sv.keys(1).bak === G.CONFIG.backupKey, 'الخانة 1 = مفاتيح الحفظ الأصلية (fcc_save_v1)');
  ok(Sv.keys(2).main !== Sv.keys(3).main && Sv.keys(2).main !== Sv.keys(1).main, 'الخانتان 2 و3 بمفاتيح مستقلة');
  ok(!Sv.setSlot(0) && !Sv.setSlot(4) && Sv.slot === 1, 'رقم خانة غير صالح يُرفض');
  // حفظ بنمط Build 28: بلا money/injInfo/offerQuota
  newGame(G, 5, 'قديم'); play(G, 15);
  const S = G.S; delete S.money; delete S.offerQuota; Object.values(S.players).forEach((p) => { delete p.injInfo; });
  Sv.save(true); const old = mem[G.CONFIG.saveKey];
  const g2 = load(); g2.mem[g2.G.CONFIG.saveKey] = old; g2.mem[g2.G.CONFIG.backupKey] = old;
  g2.G.Save.initSlot();
  ok(g2.G.Save.slot === 1 && g2.G.Save.load(), 'حفظ قديم يُفتح مباشرة في الخانة 1 بلا ترحيل');
  const sl = g2.G.Save.slots(); ok(sl[0].info && sl[0].info.name === 'قديم' && !sl[1].info && !sl[2].info, 'الخانة 1 فيها المسيرة القديمة والخانتان 2 و3 فارغتان');
  let err = null;
  try {
    const g = g2.G;
    if (g.S.phase === 'end') { if (g.S.intl && !g.S.intl.done) g.Intl.autoFinish(); const rr = g.Season.rollover(); if (!rr.ok) throw new Error('rollover'); if (g.S.phase === 'summer') { g.S.preLeft = 0; g.Season.startSeason(); } }
    play(g, 40); g.Save.save(true);
  } catch (e) { err = e; }
  ok(!err && g2.G.S.money && g2.G.S.money.v === 1, 'متابعة اللعب بعد التحميل تنشئ الحقول الجديدة (money) بلا أخطاء' + (err ? ' — ' + err.message : ''));
})();

(function switching() {
  console.log('— التبديل والتبريد والعودة');
  const { G, mem } = load(), Sv = G.Save, K1 = Sv.keys(1);
  newGame(G, 5, 'مسيرة-أولى', 'gir'); play(G, 30); Sv.save(true);
  const hot = mem[K1.main]; ok(hot.charAt(0) === '{' && !!mem[K1.bak] || hot.charAt(0) === '{', 'الخانة 1 ساخنة (JSON) أثناء اللعب');
  Sv.save(true); ok(!!mem[K1.bak], 'نسخة احتياطية موجودة للخانة النشطة');
  const before = mem[K1.main];
  ok(Sv.setSlot(2) && Sv.slot === 2, 'التبديل للخانة 2');
  ok(Sv.isPacked(mem[K1.main]) && !mem[K1.bak] && !!mem[Sv.META_KEY + 1], 'الخانة 1 صارت مضغوطة ونُقلت بطاقتها وأُزيلت نسختها الاحتياطية');
  ok(mem[K1.main].length < before.length / 3, 'حجمها نزل من ' + Math.round(before.length / 1024) + ' إلى ' + Math.round(mem[K1.main].length / 1024) + ' ك.ب');
  ok(!Sv.load(), 'الخانة 2 فارغة: لا حفظ يُحمَّل'); G.S = null;
  newGame(G, 9, 'مسيرة-ثانية', 'ath'); play(G, 25); Sv.save(true); Sv.save(true);
  const sl = Sv.slots();
  ok(sl[0].cold && sl[0].info.name === 'مسيرة-أولى' && !sl[0].active, 'الملخص: الخانة 1 باردة باسمها بلا فكّ ضغط');
  ok(sl[1].active && !sl[1].cold && sl[1].info.name === 'مسيرة-ثانية', 'الخانة 2 نشطة وساخنة');
  ok(!sl[2].info, 'الخانة 3 فارغة');
  // ثالثة ثم عودة للأولى: المحتوى مطابق حرفًا بحرف
  Sv.setSlot(3); G.S = null; newGame(G, 11, 'مسيرة-ثالثة', 'rma'); play(G, 20); Sv.save(true); Sv.save(true);
  const sizeAll = total(mem);
  ok(sizeAll < QUOTA * 0.9, 'ثلاث مسيرات (واحدة ساخنة + احتياطي + اثنتان باردتان) = ' + Math.round(sizeAll / 1024) + ' ك.ب من أصل ' + Math.round(QUOTA / 1024) + ' ك.ب');
  ok(Sv.unpack(mem[K1.main]) === before, 'النص المفكوك من الخانة الباردة مطابق حرفًا بحرف لما كان قبل التبريد');
  Sv.setSlot(1); G.S = null; ok(Sv.load(), 'تحميل الخانة 1 الباردة');
  ok(G.S.players[G.S.user].n === 'مسيرة-أولى', 'اللاعب هو نفسه');
  let err = null; try { play(G, 6); Sv.save(true); } catch (e) { err = e; }
  ok(!err && mem[K1.main].charAt(0) === '{', 'اللعب بعد التحميل يحفظ ساخنًا من جديد');
  Sv.setSlot(2); G.S = null; ok(Sv.load() && G.S.players[G.S.user].n === 'مسيرة-ثانية', 'الخانة 2 (باردة الآن) تُفتح سليمة');
  const s3 = Sv.slots()[2]; ok(s3.cold && s3.info.name === 'مسيرة-ثالثة', 'الخانة 3 باردة وسليمة');
})();

(function robustness() {
  console.log('— تلف ومساحة وحذف');
  const { G, mem } = load(), Sv = G.Save, K1 = Sv.keys(1), K2 = Sv.keys(2);
  newGame(G, 5, 'أ'); play(G, 12); Sv.save(true); Sv.setSlot(2); G.S = null; newGame(G, 9, 'ب'); play(G, 12); Sv.save(true); Sv.save(true);
  // تلف خانة مضغوطة
  mem[K1.main] = mem[K1.main].slice(0, 2000);
  Sv.setSlot(1); G.S = null; let err = null, r = null; try { r = Sv.load(); } catch (e) { err = e; }
  ok(!err && r === false, 'خانة مضغوطة تالفة: التحميل يفشل بهدوء بلا استثناء');
  // حذف خانة لا يمسّ غيرها
  const keep = mem[K2.main]; Sv.setSlot(2); ok(!!Sv.load(), 'تحميل الخانة 2'); Sv.save(true);
  Sv.deleteSlot(1); ok(!mem[K1.main] && !mem[Sv.META_KEY + 1] && !!mem[K2.main], 'حذف الخانة 1 لا يمسّ الخانة 2');
  ok(Sv.slots()[0].info === null && Sv.slots()[1].info, 'الملخص بعد الحذف: 1 فارغة و2 موجودة');
  // فشل الكتابة عند التبريد: الأصل الساخن يبقى
  const g = load(), S2 = g.G.Save, k = S2.keys(1);
  newGame(g.G, 5, 'ج'); play(g.G, 10); S2.save(true);
  const hot = g.mem[k.main];
  const origSet = globalThis.localStorage.setItem; globalThis.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  const cooled = S2.cool(1);
  globalThis.localStorage.setItem = origSet;
  ok(cooled === false && g.mem[k.main] === hot, 'فشل كتابة النسخة المضغوطة: الحفظ الساخن الأصلي سليم لم يُمسّ');
})();

console.log(fails ? '\nفشل: ' + fails : '\nنجح الاختبار كله');
process.exit(fails ? 1 : 0);
