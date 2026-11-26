/* money.js — Build 29: نظام مالي حقيقي للاعب (كان الراتب والرعاة أرقامًا للعرض فقط ولم يكن هناك رصيد).
   • رصيد S.money.bal يُغذّى أسبوعيًا بالراتب والرعاة ومكافآت المباريات/التوقيع (من عدّادات S.fin الموجودة) ويُخصم منه ضريبة تصاعدية ومعيشة وصيانة الممتلكات وعمولة الوكيل.
   • إنفاق له أثر حقيقي: منزل (تعافٍ أسرع للياقة) · سيارة (شعبية) · فريق طبي (إصابات أقل وأقصر) · مدرب خاص (خبرة أكثر) · استثمارات (عائد موسمي متقلّب).
   • حقول اختيارية: S.money يُنشأ عند أول استدعاء (حفظ قديم يبدأ برصيد 0 وبلا أثر رجعي: sync يلتقط عدّادات S.fin الحالية).
   • لا يستهلك U.rnd إلا عند وجود استثمار (عائد الموسم)، فلا يغيّر مسار من لا يستثمر. */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Money = (G.Money = {});
  const F = 52 / 39; // 52 أسبوعًا في السنة موزّعة على 39 أسبوعًا من الموسم (كما في Media.weekly)

  // مستويات الممتلكات: cost سعر الشراء · up كلفة الأسبوع (تشمل المعيشة للمنزل)
  Money.ASSETS = {
    house: { ar: 'السكن', ic: 'home', desc: 'يسرّع تعافي لياقتك أسبوعيًا', lv: [
      { ar: 'شقة مستأجرة', cost: 0, up: 500, eff: 0, txt: 'بلا أثر' },
      { ar: 'شقة فاخرة', cost: 350000, up: 1100, eff: 0.08, txt: 'تعافٍ أسرع +8٪' },
      { ar: 'فيلا', cost: 1500000, up: 2800, eff: 0.16, txt: 'تعافٍ أسرع +16٪' },
      { ar: 'قصر', cost: 6000000, up: 7500, eff: 0.24, txt: 'تعافٍ أسرع +24٪' }] },
    car: { ar: 'السيارة', ic: 'sparkle', desc: 'صورتك العامة: شعبية أعلى أسبوعيًا', lv: [
      { ar: 'بلا سيارة خاصة', cost: 0, up: 0, eff: 0, txt: 'بلا أثر' },
      { ar: 'سيارة عائلية', cost: 60000, up: 80, eff: 0.01, txt: 'شعبية +0.01 أسبوعيًا' },
      { ar: 'سيارة رياضية', cost: 250000, up: 250, eff: 0.02, txt: 'شعبية +0.02 أسبوعيًا' },
      { ar: 'سيارة نادرة', cost: 900000, up: 600, eff: 0.035, txt: 'شعبية +0.035 أسبوعيًا' }] },
    med: { ar: 'الفريق الطبي', ic: 'plus', desc: 'إصابات أقل وأقصر', lv: [
      { ar: 'طبيب النادي فقط', cost: 0, up: 0, eff: [0, 0], txt: 'بلا أثر' },
      { ar: 'طبيب خاص', cost: 150000, up: 600, eff: [0.08, 0.12], txt: 'خطر الإصابة −8٪ · الغياب −12٪' },
      { ar: 'طاقم طبي كامل', cost: 700000, up: 2200, eff: [0.15, 0.25], txt: 'خطر الإصابة −15٪ · الغياب −25٪' }] },
    coach: { ar: 'المدرب الخاص', ic: 'dumbbell', desc: 'خبرة أكثر من المباريات والتدريب', lv: [
      { ar: 'تدريب النادي فقط', cost: 0, up: 0, eff: 0, txt: 'بلا أثر' },
      { ar: 'مدرب شخصي', cost: 120000, up: 700, eff: 0.06, txt: 'خبرة +6٪' },
      { ar: 'أكاديمية خاصة', cost: 600000, up: 2500, eff: 0.12, txt: 'خبرة +12٪' }] }
  };
  Money.KINDS = ['house', 'med', 'coach', 'car'];
  Money.INV = { min: 10000, lo: -0.06, span: 0.22 }; // عائد موسمي بين −6٪ و+16٪ (متوسط +5٪)
  Money.TAX = [[15000, 0.15], [60000, 0.28], [Infinity, 0.4]]; // ضريبة تصاعدية على الدخل الأسبوعي (شرائح)
  Money.SIGN_TAX = 0.35;
  Money.TRADE_IN = 0.5; // عند الترقية يُسترد نصف سعر المستوى الحالي

  const blank = (s) => ({ s: s, wage: 0, spons: 0, bonus: 0, signing: 0, inv: 0, tax: 0, upkeep: 0, agent: 0, buy: 0 });
  Money.st = () => {
    const S = G.S;
    if (!S.money) {
      const f = S.fin || {};
      S.money = { v: 1, bal: 0, since: S.season, sync: { s: f.signing || 0, b: f.bonus || 0, a: f.agent || 0 }, own: { house: 0, car: 0, med: 0, coach: 0 }, inv: 0, cur: blank(S.season), hist: [], log: [] };
    }
    return S.money;
  };
  Money.level = (k) => (Money.st().own[k] || 0);
  Money.cur = (k) => Money.ASSETS[k].lv[Money.level(k)];
  Money.next = (k) => Money.ASSETS[k].lv[Money.level(k) + 1] || null;
  Money.upgradeCost = (k) => { const n = Money.next(k); return n ? Math.max(0, n.cost - Math.round(Money.cur(k).cost * Money.TRADE_IN)) : 0; };

  // ---------- أثر الإنفاق على اللعبة ----------
  Money.recBonus = () => (G.S && G.S.money ? Money.cur('house').eff : 0);
  Money.xpMult = (u) => (u && u.user && G.S && G.S.money ? 1 + Money.cur('coach').eff : 1);
  Money.injRisk = () => (G.S && G.S.money ? Money.cur('med').eff[0] : 0);
  Money.injLen = () => (G.S && G.S.money ? Money.cur('med').eff[1] : 0);

  Money.tax = (x) => {
    let t = 0, prev = 0;
    Money.TAX.forEach((b) => { if (x > prev) t += (Math.min(x, b[0]) - prev) * b[1]; prev = b[0]; });
    return Math.round(t);
  };
  Money.upkeep = () => { let s = 0; Money.KINDS.forEach((k) => { s += Money.cur(k).up; }); return s; };

  const add = (m, key, v) => { m.cur[key] = Math.round((m.cur[key] || 0) + v); };
  const log = (m, t) => { m.log.unshift({ s: G.S.season, w: G.S.week, t: t }); if (m.log.length > 20) m.log.length = 20; };

  // ---------- أسبوعيًا (بعد Media.weekly) ----------
  Money.week = () => {
    const S = G.S, u = P(S.user);
    if (!u || S.phase !== 'season') return null;
    const m = Money.st();
    if (m.cur.s !== S.season) m.cur = blank(S.season);
    const wage = u.ct && !S.userExpired ? u.ct.w * F : 0;
    const spons = G.Media ? G.Media.sponsorWeek(G.Media.get().pop) * F : 0;
    const f = S.fin || {};
    const signing = Math.max(0, (f.signing || 0) - m.sync.s), bonus = Math.max(0, (f.bonus || 0) - m.sync.b), agent = Math.max(0, (f.agent || 0) - m.sync.a);
    m.sync = { s: f.signing || 0, b: f.bonus || 0, a: f.agent || 0 };
    const taxable = wage + spons + bonus;
    const tax = Money.tax(taxable) + Math.round(signing * Money.SIGN_TAX), up = Money.upkeep();
    const inc = wage + spons + bonus + signing, exp = tax + up + agent;
    m.bal = Math.max(0, Math.round(m.bal + inc - exp));
    add(m, 'wage', wage); add(m, 'spons', spons); add(m, 'bonus', bonus); add(m, 'signing', signing);
    add(m, 'tax', tax); add(m, 'upkeep', up); add(m, 'agent', agent);
    // أثر السيارة: صورة عامة أفضل (بطيء جدًا ولا يتجاوز 100)
    const car = Money.cur('car').eff;
    if (car && G.Media) { const md = G.Media.get(); md.pop = Math.min(100, Math.round((md.pop + car) * 100) / 100); }
    return { inc: Math.round(inc), exp: Math.round(exp) };
  };

  // تقدير الأسبوع القادم للعرض (بلا مكافآت المباريات): دخل − ضريبة − صيانة
  Money.preview = () => {
    const S = G.S, u = P(S.user);
    const wage = u && u.ct && !S.userExpired ? u.ct.w * F : 0, spons = G.Media ? G.Media.sponsorWeek(G.Media.get().pop) * F : 0;
    const tax = Money.tax(wage + spons), up = Money.upkeep();
    return { wage: Math.round(wage), spons: Math.round(spons), tax: tax, up: up, net: Math.round(wage + spons - tax - up) };
  };

  // ---------- نهاية الموسم: عائد الاستثمار وأرشفة السنة ----------
  Money.seasonEnd = () => {
    const S = G.S, m = Money.st();
    if (m.cur.s !== S.season) m.cur = blank(S.season);
    if (m.inv > 0) {
      const r = Money.INV.lo + U.rnd() * Money.INV.span, gain = Math.round(m.inv * r);
      m.inv += gain; add(m, 'inv', gain);
      log(m, 'عائد الاستثمار ' + (gain >= 0 ? '+' : '') + U.money(gain) + ' (' + (r * 100).toFixed(1) + '٪)');
      if (G.Inbox) G.Inbox.add('news', gain >= 0 ? 'عائد استثماراتك' : 'خسارة في استثماراتك', (gain >= 0 ? 'ربحت ' : 'خسرت ') + U.money(Math.abs(gain)) + ' من استثماراتك هذا الموسم (' + (r * 100).toFixed(1) + '٪).');
    }
    const c = m.cur, inc = c.wage + c.spons + c.bonus + c.signing + Math.max(0, c.inv), exp = c.tax + c.upkeep + c.agent + c.buy + Math.max(0, -c.inv);
    m.hist.push({ s: S.season, inc: Math.round(inc), exp: Math.round(exp), net: Math.round(inc - exp), bal: m.bal, inv: m.inv });
    if (m.hist.length > 40) m.hist.shift();
    m.cur = blank(S.season + 1);
  };

  Money.netWorth = () => {
    const m = Money.st();
    let a = 0; Money.KINDS.forEach((k) => { a += Math.round(Money.cur(k).cost * Money.TRADE_IN); });
    return m.bal + m.inv + a;
  };

  // ---------- أفعال اللاعب ----------
  Money.buy = (k) => {
    if (!Money.ASSETS[k]) return { ok: false, msg: 'خيار غير معروف' };
    const m = Money.st(), nx = Money.next(k);
    if (!nx) return { ok: false, msg: 'وصلت لأعلى مستوى' };
    const cost = Money.upgradeCost(k);
    if (m.bal < cost) return { ok: false, msg: 'رصيدك لا يكفي: تحتاج ' + U.money(cost) };
    m.bal -= cost; m.own[k] = Money.level(k) + 1; add(m, 'buy', cost);
    log(m, 'اشتريت ' + nx.ar + ' بـ ' + U.money(cost));
    if (G.Inbox) G.Inbox.add('news', 'عملية شراء: ' + nx.ar, 'دفعت ' + U.money(cost) + ' — ' + nx.txt + '. كلفة الصيانة الأسبوعية صارت ' + U.money(Money.upkeep()) + '.');
    return { ok: true, cost: cost, lv: nx };
  };
  Money.invest = (amt) => {
    const m = Money.st(); amt = Math.floor(amt / 1000) * 1000;
    if (!(amt >= Money.INV.min)) return { ok: false, msg: 'أقل مبلغ للاستثمار ' + U.money(Money.INV.min) };
    if (m.bal < amt) return { ok: false, msg: 'رصيدك لا يكفي' };
    m.bal -= amt; m.inv += amt; log(m, 'استثمرت ' + U.money(amt));
    return { ok: true, amt: amt };
  };
  Money.divest = (amt) => {
    const m = Money.st(); amt = Math.min(Math.floor(amt / 1000) * 1000, m.inv);
    if (!(amt > 0)) return { ok: false, msg: 'لا استثمارات لسحبها' };
    m.inv -= amt; m.bal += amt; log(m, 'سحبت ' + U.money(amt) + ' من الاستثمار');
    return { ok: true, amt: amt };
  };
})(window.G = window.G || {});
