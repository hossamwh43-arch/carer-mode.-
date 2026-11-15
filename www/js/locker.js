/* locker.js — «غرفة الملابس»: علاقة اللاعب بزملائه في ناديه الحالي (0–100).
   المدرب (G.Coach/u.trust) والجماهير (G.Media.pop) والإدارة (S.rel.club) لهم أنظمتهم؛ هذا النظام يكمّل العلاقات الأربع بما كان ناقصًا: الزملاء.
   لا يستدعي U.rnd أبدًا (كل شيء اشتقاق ثابت من نتائج المباراة) فلا يمسّ تسلسل العشوائية ولا محرك المباراة.
   ما يرفعها: صناعة الأهداف، الفوز بدقائق كافية، أداء استثنائي، الاستقرار الطويل في النادي، الدور الأساسي.
   ما يخفضها: البطاقات الحمراء، الأداء الكارثي بدقائق كاملة، الهزائم المتتالية، الوصول الجديد (يبدأ غريبًا ثم يندمج)، ردّات الفعل النارية في المؤتمرات.
   أثرها الفعلي (لا شكلي): ±8% على الخبرة المكتسبة، سحب أسبوعي لثقة المدرب (±0.1/أسبوع)، ± حتى 0.6 نقطة سمة في المباراة عبر «كيمياء الفريق».
   الحالة في S.lk وتُنشأ عند أول طلب (فالحفظ القديم يُحمَّل كما هو). الواجهة: UI.relationsCard في ui_profile.js. */
(function (G) {
  'use strict';
  const U = G.U, clamp = U.clamp;
  const Locker = (G.Locker = {});
  Locker.START = 55;      // اللاعب الجديد في المسيرة
  Locker.NEWCOMER = 42;   // الوصول إلى نادٍ جديد
  Locker.XP = 600;        // أثر الخبرة: (v-50)/XP  → ±8%
  Locker.TRUST = 500;     // سحب ثقة المدرب أسبوعيًا: (v-50)/TRUST
  Locker.ATTR = 0.6;      // أقصى أثر على السمات (نقطة) عند v=100/0

  const absWeek = () => G.S.season * 45 + G.S.week;
  Locker.get = () => {
    const S = G.S;
    if (!S.lk) S.lk = { v: Locker.START, since: absWeek(), log: [], lose: 0 };
    if (S.lk.lose == null) S.lk.lose = 0;
    return S.lk;
  };
  Locker.value = () => Math.round(Locker.get().v);
  Locker.label = (v) => (v >= 75 ? 'قلب الفريق' : v >= 58 ? 'منسجم' : v >= 40 ? 'عادي' : v >= 22 ? 'متوتّر' : 'منبوذ');

  function add(d, why) {
    const lk = Locker.get(), old = lk.v;
    lk.v = clamp(lk.v + d, 0, 100);
    if (why && Math.abs(lk.v - old) >= 0.05) {
      lk.log.unshift({ s: G.S.season, w: G.S.week, d: Math.round((lk.v - old) * 10) / 10, t: why });
      if (lk.log.length > 8) lk.log.length = 8;
    }
    return lk.v - old;
  }
  Locker.add = add;

  // بعد كل مباراة نادٍ للمستخدم (لا المنتخب)
  Locker.after = (u, sum, ps) => {
    if (!sum || sum.mins <= 0) return;
    const lk = Locker.get(), home = u.club === sum.h, my = home ? sum.score.h : sum.score.a, op = home ? sum.score.a : sum.score.h;
    const won = my > op, lost = my < op;
    if (ps.a > 0) add(Math.min(1.8, 0.6 * ps.a), 'صنعتَ ' + (ps.a > 1 ? ps.a + ' أهداف' : 'هدفًا') + ' لزملائك');
    if (won && sum.mins >= 45) add(0.3, 'فوز مشترك');
    if (sum.rating && sum.rating >= 8.5 && sum.mins >= 45) add(0.5, 'أداء استثنائي رفع معنويات الفريق');
    if (sum.rating && sum.rating < 5.5 && sum.mins >= 70) add(-0.5, 'أداء ضعيف بدقائق كاملة');
    if (ps.red) add(ps.direct ? -3.5 : -1.5, ps.direct ? 'بطاقة حمراء مباشرة تركت الفريق بعشرة' : 'بطاقتان صفراوان وطرد');
    // سلسلة الهزائم: بعد الثالثة المتتالية يتوتّر الجو
    lk.lose = lost ? (lk.lose || 0) + 1 : 0;
    if (lk.lose >= 3) add(-0.6, lk.lose + ' هزائم متتالية');
    else if (lost) add(-0.1, '');
  };

  // أسبوعيًا: ميل نحو مستوى مستقر يحدده الدور والاستقرار + سحب ثقة المدرب
  Locker.weekly = () => {
    const S = G.S, u = G.P(S.user), lk = Locker.get();
    if (!u || !u.club) return;
    const tenure = Math.max(0, absWeek() - lk.since);
    const role = u.role === 'starter' ? 7 : u.role === 'rotation' ? 2 : u.role === 'bench' ? -3 : u.role === 'out' ? -8 : 0;
    const target = clamp(48 + role + Math.min(14, tenure / 5), 20, 82);
    add((target - lk.v) * 0.05);
    u.trust = clamp(u.trust + (lk.v - 50) / Locker.TRUST, 0, 100);
  };

  // انتقل اللاعب إلى نادٍ جديد: يبدأ غريبًا (قليل من الإرث السابق ينتقل: سمعة اللاعب الودود)
  Locker.moved = (u, loan) => {
    if (!u || !u.user) return;
    const lk = Locker.get(), carry = clamp((lk.v - 50) * 0.2, -4, 6);
    lk.v = clamp(Locker.NEWCOMER + carry, 0, 100); lk.since = absWeek(); lk.lose = 0;
    lk.log = [{ s: G.S.season, w: G.S.week, d: 0, t: loan ? 'وصلتَ معارًا: زملاء جدد' : 'ناديك الجديد: زملاء جدد ينتظرون أن يعرفوك' }];
  };

  // ردّة فعل نارية في مؤتمر صحفي ارتدّت (لا يُستدعى بلا قرار اللاعب)
  Locker.pressBad = () => add(-1.2, 'تصريح مثير للجدل في المؤتمر الصحفي');

  // الأثر الفعلي
  Locker.xpMult = () => (G.S && G.S.lk ? 1 + (Locker.value() - 50) / Locker.XP : 1);
  Locker.attr = () => (G.S && G.S.lk ? ((Locker.value() - 50) / 50) * Locker.ATTR : 0);

  Locker.info = () => {
    const lk = Locker.get(), v = Locker.value();
    return {
      v, label: Locker.label(v), xpPct: Math.round((Locker.xpMult() - 1) * 1000) / 10, attr: Math.round(Locker.attr() * 100) / 100,
      trustWeek: Math.round(((v - 50) / Locker.TRUST) * 100) / 100, weeks: Math.max(0, absWeek() - lk.since), log: lk.log.slice(0, 4)
    };
  };
})(window.G = window.G || {});
