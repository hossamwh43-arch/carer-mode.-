/* stamina.js — نظام اللياقة بثلاث طبقات منفصلة (Build 24)
   كان في اللعبة رقم واحد `fit` يمثّل اللياقة الأساسية وطاقة المباراة معًا: كل مباراة تخصم ≈14 والتدريب الأسبوعي يعيد 4–14 فقط،
   فتتراكم الخسارة حتى القاع بغضّ النظر عن العمر (قياس: لاعب أساسي بعمر 20 → متوسط 53% وأدنى 26%، ويُستبدل «لإرهاق» في ~50 من 55 مباراة).
   الآن:
   1) اللياقة الأساسية  u.cond  (40–99): بطيئة التغير، تتحدد بالسمة البدنية والعمر والتدريب والدقائق والإصابات وتُرمَّم صيفًا.
   2) الجاهزية  u.fit  (25–100): ما يظهر «اللياقة %». تنخفض بعد المباراة وتتعافى أسّيًا نحو سقف يحدده cond وشدة التدريب،
      فلا تتراكم بلا حدّ (توازن مستقر عند ≈85% لأساسي بمباراة أسبوعيًا بتدريب متوسط).
   3) طاقة المباراة  m.fat[id]  (0–100): تبدأ من الجاهزية وتنفد دقيقة بدقيقة حسب السمة البدنية وcond والمركز، وتزول بانتهاء المباراة (إرهاق مؤقت).
   لا يستدعي U.rnd أبدًا (اشتقاقات ثابتة) فلا يغيّر تسلسل عشوائية اللعبة. الحقول الجديدة تُنشأ عند أول طلب فالحفظ القديم يُحمَّل كما هو. */
(function (G) {
  'use strict';
  const U = G.U, clamp = U.clamp;
  const Stamina = (G.Stamina = {});

  Stamina.FIT_MIN = 25;
  Stamina.COND_MIN = 40;
  Stamina.COND_MAX = 99;
  Stamina.MATCH_COST = 15;   // خصم الجاهزية لمباراة 90 دقيقة عند cond=0 قبل المعدِّلات (انظر matchCost)
  Stamina.REC = { light: 0.75, normal: 0.58, heavy: 0.38, hurt: 0.65 }; // نسبة الفجوة المستعادة أسبوعيًا نحو السقف

  // الجهد البدني النسبي للمركز (الحارس بالكاد يركض، الأجنحة والأظهرة أكثر)
  Stamina.POS_DEMAND = { GK: 0.35, CB: 0.9, LB: 1.1, RB: 1.1, CDM: 1.0, CM: 1.08, CAM: 1.0, LW: 1.1, RW: 1.1, ST: 0.95 };
  const demand = (pos) => Stamina.POS_DEMAND[pos] || 1;
  const phyOf = (p) => (p && p.a && p.a.phy != null ? p.a.phy : 60);

  // المستوى الطبيعي للّياقة الأساسية حسب السمة البدنية والعمر (قبل أثر التدريب)
  Stamina.natural = (p) => clamp(66 + (phyOf(p) - 60) * 0.6 - Math.max(0, p.age - 29) * 1.1, Stamina.COND_MIN, Stamina.COND_MAX);
  Stamina.cond = (p) => {
    if (p.cond == null) p.cond = Math.round(clamp(Stamina.natural(p) + (p.age <= 21 ? 1 : 0), Stamina.COND_MIN, 95));
    return p.cond;
  };

  // سقف الجاهزية: أعلى مستوى تعود إليه بعد راحة كافية (الأساس الأعلى = سقف أعلى؛ التدريب المكثف يخفضه مؤقتًا)
  Stamina.ceil = (p, intensity) => clamp(100 - (100 - Stamina.cond(p)) * 0.22 - (intensity === 'heavy' ? 5 : 0), 80, 100);

  const ageRec = (a) => (a <= 23 ? 1.08 : a <= 29 ? 1 : a <= 33 ? 0.92 : 0.84);
  Stamina.recRate = (p, intensity, hurt) => {
    const base = hurt ? Stamina.REC.hurt : (Stamina.REC[intensity] || Stamina.REC.normal);
    return clamp(base * ageRec(p.age) * (0.9 + (Stamina.cond(p) - 60) / 200) * (p.user && G.Money ? 1 + G.Money.recBonus() : 1), 0.2, 0.9);
  };

  // خصم الجاهزية بعد مباراة (الدقائق × الجهد × عكس اللياقة الأساسية)
  Stamina.matchCost = (p, mins) => (mins / 90) * Stamina.MATCH_COST * (1.3 - Stamina.cond(p) / 200) * (p.age >= 33 ? 1.08 : 1) * demand(p.pos);
  Stamina.afterMatch = (p, mins) => {
    if (!(mins > 0)) return 0;
    const c = Stamina.matchCost(p, mins);
    p.fit = clamp((p.fit == null ? 90 : p.fit) - c, Stamina.FIT_MIN, 100);
    p.wkMins = (p.wkMins || 0) + mins;
    return c;
  };

  // نهاية الأسبوع (يُستدعى من Training.week): يحدّث الأساس ثم الجاهزية. يعيد الزيادة في الجاهزية.
  Stamina.weekly = (p, intensity, hurt) => {
    const cond = Stamina.cond(p), mins = p.wkMins || 0;
    const train = intensity === 'heavy' ? 7 : intensity === 'light' ? -1 : 3;
    let T = Stamina.natural(p) + train + Math.min(3, mins / 30) - (hurt ? 5 : 0);
    T = clamp(T, Stamina.COND_MIN, Stamina.COND_MAX);
    p.cond = Math.round(clamp(cond + (T - cond) * 0.1, Stamina.COND_MIN, Stamina.COND_MAX) * 10) / 10;
    const before = p.fit == null ? 90 : p.fit, r = Stamina.recRate(p, intensity, hurt);
    p.fit = clamp(before + (Stamina.ceil(p, intensity) - before) * r, Stamina.FIT_MIN, 100);
    p.wkMins = 0;
    return p.fit - before;
  };

  // العطلة الصيفية: راحة كاملة ثم تدرّج بدني (يُستدعى من rollover ومن كل أسبوع إعداد)
  Stamina.summerRest = (p) => {   // عند نهاية الموسم
    const age = p.age;
    // العمر يغيّر الأساس سنويًا: الشاب يزداد، من تجاوز 30 يتراجع (المسار التفصيلي في natural)
    p.cond = Math.round(clamp(Stamina.cond(p) + (age <= 21 ? 1.5 : age <= 27 ? 0.3 : age <= 33 ? -0.8 : -1.5), Stamina.COND_MIN, Stamina.COND_MAX) * 10) / 10;
    p.fit = clamp(Math.max(p.fit == null ? 90 : p.fit, 88), Stamina.FIT_MIN, 100);
    p.wkMins = 0;
  };
  Stamina.preseason = (p) => {    // أسبوع إعداد: يُبنى الأساس ويعود السقف
    const T = clamp(Stamina.natural(p) + 6, Stamina.COND_MIN, Stamina.COND_MAX);
    p.cond = Math.round(clamp(Stamina.cond(p) + (T - Stamina.cond(p)) * 0.25, Stamina.COND_MIN, Stamina.COND_MAX) * 10) / 10;
    p.fit = clamp(Math.max(p.fit == null ? 90 : p.fit, Stamina.ceil(p, 'normal') - 2), Stamina.FIT_MIN, 100);
  };

  // ---------- طاقة المباراة ----------
  // البداية: لاعب جاهز 100% يبدأ بـ100، ومن جاهزيته 55% يبدأ ≈75
  Stamina.startEnergy = (p) => clamp(100 - (100 - (p.fit == null ? 90 : p.fit)) * 0.55, 55, 100);
  // النفاد في الدقيقة (للاعب المستخدم — يتأثر بالسمة البدنية والأساس والعمر والمركز)
  Stamina.drain = (p, pos, et) => {
    const base = (0.4 + (100 - phyOf(p)) * 0.003) * (1.3 - Stamina.cond(p) / 200) * (p.age >= 33 ? 1.06 : 1) * demand(pos || p.pos);
    return base * (et ? 1.3 : 1);
  };
  // لاعب ذكاء اصطناعي (بلا cond محفوظ): يُشتق من سمته البدنية فقط
  Stamina.drainAI = (p, pos, et) => {
    const cond = clamp(Stamina.natural(p), 50, 90);
    return (0.4 + (100 - phyOf(p)) * 0.003) * (1.3 - cond / 200) * demand(pos || p.pos) * (et ? 1.3 : 1);
  };

  Stamina.label = (v) => (v >= 90 ? 'منتعش' : v >= 75 ? 'جاهز' : v >= 55 ? 'متعب قليلًا' : v >= 40 ? 'مرهق' : 'منهك');
  Stamina.condLabel = (v) => (v >= 85 ? 'بدنية ممتازة' : v >= 72 ? 'بدنية جيدة' : v >= 60 ? 'بدنية متوسطة' : 'بدنية ضعيفة');
  Stamina.info = (p) => {
    const cond = Stamina.cond(p), fit = Math.round(p.fit == null ? 90 : p.fit);
    return { cond: Math.round(cond), fit, ceil: Math.round(Stamina.ceil(p)), label: Stamina.label(fit), condLabel: Stamina.condLabel(cond), start: Math.round(Stamina.startEnergy(p)) };
  };
})(window.G = window.G || {});
