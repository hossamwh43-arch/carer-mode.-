/* injury.js — Build 29: إصابات أكثر واقعية وخطة تعافٍ يختارها اللاعب.
   قبل Build 29: ~0.36٪ إصابة للاعب بالمباراة (≈ إصابتان كل 10 مواسم) والواقع ≈ 1 بالموسم. الآن ≈ 2.4٪ بالمباراة مع عامل عمر وإجهاد.
   خطط التعافي (للإصابات ≥ 3 أسابيع): راحة كاملة (بلا مخاطرة) · علاج مكثف (−25٪ من المدة، خطر انتكاسة صغير) · عودة مبكرة (−40٪، خطر انتكاسة كبير وتراجع لياقة).
   لا يستهلك أي أمر منه U.rnd خارج قرار اللاعب أو لحظة الإصابة نفسها. الحقول الجديدة اختيارية: u.injInfo. */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Injury = (G.Injury = {});

  Injury.TUNE = { perMin: 0.00026, aiPerMatch: 0.02, ageFrom: 28, agePer: 0.035 };

  // احتمال الإصابة بالدقيقة للاعب (يُستدعى من Live.injuries)
  Injury.perMin = (p, fatigue) => {
    let pr = Injury.TUNE.perMin;
    pr *= 1 + Math.max(0, p.age - Injury.TUNE.ageFrom) * Injury.TUNE.agePer;
    if (p.user) pr *= (1 - (G.Money ? G.Money.injRisk() : 0)) * (G.diff().inj || 1) * (1 + (100 - Math.min(100, fatigue == null ? 100 : fatigue)) / 60 + (p.training && p.training.heavy ? 0.3 : 0));
    return pr;
  };

  const NAMES = {
    light: ['شدّ عضلي بسيط', 'ارتجاج خفيف في الساق', 'التواء بسيط في الكاحل', 'إرهاق عضلي'],
    mid: ['التواء في الكاحل', 'إصابة في عضلة الفخذ', 'التهاب في وتر العرقوب', 'إصابة في الركبة'],
    hard: ['تمزق في عضلة الفخذ الخلفية', 'إصابة في الرباط الجانبي للركبة', 'كسر إجهاد في القدم', 'تمزق في الرباط الصليبي']
  };
  Injury.nameFor = (weeks, key) => {
    const a = weeks <= 2 ? NAMES.light : weeks <= 6 ? NAMES.mid : NAMES.hard;
    return a[G.World.hashStr(String(key)) % a.length];
  };

  Injury.PLANS = {
    rest: { ar: 'راحة كاملة', cut: 0, risk: 0, hint: 'تعافٍ طبيعي بلا مخاطرة' },
    treat: { ar: 'علاج مكثف', cut: 0.25, risk: 0.10, hint: 'يقصّر الغياب 25٪ وفيه خطر انتكاسة صغير (10٪)' },
    rush: { ar: 'عودة مبكرة', cut: 0.40, risk: 0.28, hint: 'يقصّر الغياب 40٪ لكن خطر الانتكاسة كبير (28٪) وتعود بلياقة أقل' }
  };
  Injury.PLAN_ORDER = ['rest', 'treat', 'rush'];

  // عند إصابة اللاعب (مباراة أو تدريب)
  Injury.onUser = (u, weeks, src) => {
    if (!u) return;
    const cut = G.Money ? G.Money.injLen() : 0; // الفريق الطبي يقصّر الغياب
    if (cut > 0 && weeks >= 2) { weeks = Math.max(1, Math.round(weeks * (1 - cut))); u.inj = weeks; }
    u.injInfo = { name: Injury.nameFor(weeks, u.id + '|' + G.S.season + '|' + G.S.week), weeks: weeks, left0: weeks, src: src || 'match', plan: weeks >= 3 ? null : 'rest', season: G.S.season, week: G.S.week };
  };
  Injury.pending = (u) => !!(u && u.inj >= 3 && u.injInfo && !u.injInfo.plan);

  Injury.choose = (id) => {
    const u = P(G.S.user), pl = Injury.PLANS[id];
    if (!u || !pl || !Injury.pending(u)) return { ok: false, msg: 'لا إصابة تنتظر خطة تعافٍ' };
    const before = u.inj;
    u.inj = Math.max(1, Math.round(u.inj * (1 - pl.cut)));
    u.injInfo.plan = id; u.injInfo.saved = before - u.inj;
    if (id === 'rush') u.fit = Math.max(40, (u.fit || 90) - 8);
    G.Inbox.add('injury', 'خطة التعافي: ' + pl.ar, 'اخترتَ «' + pl.ar + '» لإصابة ' + u.injInfo.name + (u.injInfo.saved > 0 ? ' فاختصرتَ ' + u.injInfo.saved + ' أسبوعًا (تغيب ' + u.inj + ').' : '.'));
    return { ok: true, weeks: u.inj };
  };

  // بعد خصم الأسبوع: إن شُفي اللاعب الآن وكانت خطته تحمل خطرًا فقد تنتكس
  Injury.tick = (u, before) => {
    if (!u || !u.injInfo || !(before > 0) || u.inj > 0) return;
    const info = u.injInfo, pl = Injury.PLANS[info.plan || 'rest'];
    u.injInfo = null;
    if (pl && pl.risk && U.rnd() < pl.risk) {
      u.inj = U.int(2, 4);
      u.injInfo = { name: 'انتكاسة: ' + info.name, weeks: u.inj, left0: u.inj, src: 'relapse', plan: 'rest', season: G.S.season, week: G.S.week };
      G.Inbox.add('injury', 'انتكاسة!', 'عاد الألم (' + info.name + ') بعد خطة «' + pl.ar + '» وستغيب ' + u.inj + ' أسبوعًا إضافية.');
    } else if (info.plan && info.plan !== 'rest') {
      G.Inbox.add('injury', 'تعافيتَ', 'نجحت خطة «' + pl.ar + '» وعدتَ جاهزًا.');
    }
  };
})(window.G = window.G || {});
