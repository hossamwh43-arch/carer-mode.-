/* agent.js — وكيل الأعمال، علاقة اللاعب بناديه وسمعته، وعود الدور، مكافآت العقد، مزاد العروض
   يرتبط بـ transfers.js (العروض والتفاوض) وcoach.js (دور اللاعب) وpress.js (الأخبار). لا يضيف قاعدة بيانات: يقرأ لاعبي الحفظ وأنديته.
   الحالة الجديدة (كلها اختيارية وتُنشأ عند الحاجة، فالحفظ القديم يعمل كما هو):
     S.ag   الوكيل {tier,name,rel,deals,fees,msgs,last}    S.rel  {club,loyal,ex,cool,moves,tick}
     S.fin  {signing,bonus,agent,season}                    S.treq {status,...} (رد النادي على طلب الانتقال)
     p.promise وعد الدور للاعب المستخدم                     p.ct.ab / p.ct.gb مكافأة المشاركة/الهدف */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const A = (G.Agent = {});
  const T = () => G.Transfers;

  A.TIERS = [null,
    { id: 1, ar: 'وكيل محلي', rate: 0.04, wage: 0.03, offers: 1.05, tries: 3, rounds: 1, minPop: 0, minOvr: 0, desc: 'يعرف الأندية القريبة ويفاوض بهدوء' },
    { id: 2, ar: 'وكيل دولي', rate: 0.06, wage: 0.06, offers: 1.15, tries: 4, rounds: 2, minPop: 30, minOvr: 72, desc: 'علاقات واسعة وسقف راتب أعلى ومحاولة تفاوض إضافية' },
    { id: 3, ar: 'وكيل النخبة', rate: 0.08, wage: 0.10, offers: 1.30, tries: 4, rounds: 3, minPop: 55, minOvr: 82, desc: 'يدير مزادًا حقيقيًا بين كبار الأندية' }
  ];
  const NAMES = ['كريم السالم', 'ماركو فيلوتي', 'دانيال أوكافور', 'خوسيه ريبيرا', 'ليون هارتمان', 'سامي الراشد', 'ألكسي بوبوف', 'عمر الحيدري', 'ديفيد كوستا', 'يوسف العبيدي'];
  A.ROLE_AR = { starter: 'أساسي', rotation: 'تناوب', prospect: 'موهبة تُصقل', none: 'بلا ضمانات' };
  A.ROLE_RANK = { none: 0, prospect: 1, rotation: 2, starter: 3 };

  // ---------- الحالة ----------
  A.state = () => {
    const S = G.S;
    if (!S.rel) S.rel = { club: 50, loyal: 50, ex: {}, cool: {}, moves: [], tick: 0 };
    if (!S.fin) S.fin = { signing: 0, bonus: 0, agent: 0, season: { s: S.season, bonus: 0 } };
    if (!S.treq) S.treq = { status: 'none' };
    return S;
  };
  A.rel = () => A.state().rel;
  A.fin = () => A.state().fin;
  A.tick = () => A.rel().tick || 0;
  const clamp = U.clamp;

  A.has = () => !!(G.S.ag && G.S.ag.tier);
  A.tier = () => (A.has() ? G.S.ag.tier : 0);
  A.info = () => (A.has() ? A.TIERS[G.S.ag.tier] : null);
  A.boost = () => { const t = A.info(); return t ? { wage: t.wage, offers: t.offers, tries: t.tries } : { wage: 0, offers: 1, tries: 3 }; };
  A.skill = () => (A.has() ? clamp(0.05 * A.tier() + (G.S.ag.rel - 50) / 400, 0, 0.3) : 0);
  A.maxTries = () => A.boost().tries;

  A.eligible = (tier) => {
    const t = A.TIERS[tier], u = P(G.S.user), pop = G.Media ? G.Media.pop() : 0;
    if (!t) return { ok: false, why: 'درجة غير معروفة' };
    const ok = pop >= t.minPop || u.ovr >= t.minOvr;
    return { ok, why: ok ? '' : 'يتطلب شعبية ' + t.minPop + '+ أو تقييمًا ' + t.minOvr + '+' };
  };
  A.hire = (tier) => {
    const S = A.state(), e = A.eligible(tier);
    if (!e.ok) return { ok: false, msg: e.why };
    if (A.tier() === tier) return { ok: false, msg: 'هذا وكيلك الحالي' };
    const keep = S.ag && S.ag.name ? null : U.pick(NAMES);
    S.ag = { tier, name: keep || U.pick(NAMES.filter((n) => n !== (S.ag && S.ag.name))), rel: 55, deals: S.ag ? S.ag.deals || 0 : 0, fees: S.ag ? S.ag.fees || 0 : 0, msgs: [], since: { s: S.season, w: S.week }, last: { work: -9, auc: -9, scout: -9 } };
    G.Inbox.add('agent', 'وكيل جديد', 'تعاقدتَ مع ' + S.ag.name + ' (' + A.TIERS[tier].ar + '). عمولته ' + Math.round(A.TIERS[tier].rate * 100) + '٪ من العقود التي يبرمها.');
    return { ok: true };
  };
  A.fire = () => {
    const S = G.S;
    if (!A.has()) return { ok: false, msg: 'لا تملك وكيلًا' };
    const nm = S.ag.name; S.ag = null;
    G.Inbox.add('agent', 'إنهاء التعاقد مع الوكيل', 'أنهيتَ العمل مع ' + nm + '. ستفاوض بنفسك من الآن.');
    return { ok: true };
  };
  A.say = (text, toInbox) => {
    const S = G.S;
    if (!A.has()) return;
    S.ag.msgs = S.ag.msgs || [];
    S.ag.msgs.unshift({ s: S.season, w: S.week, t: text });
    if (S.ag.msgs.length > 12) S.ag.msgs.length = 12;
    if (toInbox) G.Inbox.add('agent', 'وكيلك ' + S.ag.name, text);
  };
  // عمولة الوكيل: نسبة من أجر السنة الأولى + مكافأة التوقيع (تُدفع مرة عند توقيع عقد جديد عبره)
  A.commission = (wage, bonus) => (A.has() ? Math.round((wage * 52 + (bonus || 0)) * A.info().rate / 1000) * 1000 : 0);

  // ---------- مكافآت العقد ----------
  const attacker = (pos) => pos === 'ST' || pos === 'LW' || pos === 'RW' || pos === 'CAM';
  // قيمة الحزمة بما يعادلها أسبوعيًا (يقارنها النادي بسقفه)
  A.wEq = (t, pos) => (t.wage || 0) + (t.bonus || 0) / Math.max(1, (t.years || 1) * 52) + (t.ab || 0) * 0.75 + (t.gb || 0) * (attacker(pos) ? 0.5 : 0.2);
  A.payMatch = (summary) => {
    const S = A.state(), u = P(S.user);
    if (!summary || !(summary.mins > 0) || summary.comp === 'NT' || !u.ct) return 0;
    const pay = (u.ct.ab || 0) + (u.ct.gb || 0) * (summary.g || 0);
    if (pay > 0) {
      S.fin.bonus += pay;
      if (!S.fin.season || S.fin.season.s !== S.season) S.fin.season = { s: S.season, bonus: 0 };
      S.fin.season.bonus += pay;
      summary.bonus = pay;
    }
    return pay;
  };

  // ---------- وعد الدور ----------
  A.setPromise = (p, clubId, role) => {
    if (!role || role === 'none') { p.promise = null; return; }
    p.promise = { role, club: clubId, left: 10, s: G.S.season, w: G.S.week };
  };
  A.checkPromise = () => {
    const S = A.state(), p = P(S.user), pr = p.promise;
    if (!pr || pr.done) return;
    if (pr.club !== p.club) { p.promise = null; return; }
    if (pr.left > 0) pr.left--;
    if (pr.left > 0) return;
    const rank = { starter: 3, rotation: 2, bench: 1, out: 0, injured: 2, suspended: 2 };
    const ok = (rank[p.role] == null ? 1 : rank[p.role]) >= (pr.role === 'prospect' ? 1 : pr.role === 'rotation' ? 2 : 3);
    pr.done = true;
    if (ok) {
      S.rel.club = clamp(S.rel.club + 6, 0, 100); p.trust = clamp(p.trust + 4, 0, 100);
      if (A.has()) S.ag.rel = clamp(S.ag.rel + 2, 0, 100);
      G.Inbox.add('coach', 'وفى المدرب بوعده', 'وعدك ' + C(p.club).name + ' بدور «' + A.ROLE_AR[pr.role] + '» وها هو يتحقق. ثقة المدرب وعلاقتك بالنادي في ارتفاع.');
    } else {
      S.rel.club = clamp(S.rel.club - 8, 0, 100); p.trust = clamp(p.trust - 5, 0, 100);
      S.rel.broken = S.season; // يمنح طلب انتقال بلا غضب هذا الموسم
      G.Inbox.add('coach', 'لم يُوفَّ بالوعد', 'وعدك ' + C(p.club).name + ' بدور «' + A.ROLE_AR[pr.role] + '» لكنك لا تحصل عليه. تحقّ لك مطالبة النادي بالرحيل دون أن يعدّه خيانة.');
      A.say('النادي أخلّ بوعده. يمكننا تقديم طلب انتقال الآن بأقل كلفة.', false);
    }
  };

  // ---------- العلاقات والسمعة ----------
  A.relLabel = (v) => (v >= 75 ? 'ممتازة' : v >= 58 ? 'جيدة' : v >= 42 ? 'عادية' : v >= 25 ? 'متوترة' : 'سيئة');
  A.loyalLabel = (v) => (v >= 75 ? 'وفيّ' : v >= 58 ? 'مستقر' : v >= 42 ? 'عادي' : v >= 25 ? 'متقلّب' : 'مرتزق');
  A.exOf = (clubId) => (A.rel().ex[clubId] || 0);
  A.cooling = (clubId) => (A.rel().cool[clubId] || 0) > A.tick();
  A.cool = (clubId, weeks) => { A.rel().cool[clubId] = A.tick() + weeks; };
  A.hurt = (clubId, d) => { const r = A.rel(); r.ex[clubId] = clamp((r.ex[clubId] || 0) + d, -100, 100); };

  // بعد أي انتقال للاعب المستخدم: يحدّث العلاقات والسمعة ويكتب الخبر
  A.onMove = (info) => {
    const S = A.state(), r = S.rel, p = P(S.user), byReq = !!info.byRequest;
    if (info.from) {
      let d = byReq ? -28 : info.kind === 'loan' ? 2 : 6;
      if (!byReq && info.kind !== 'loan' && info.tenure >= 3) d += 6; // رحيل بعد خدمة طويلة يُحترم
      A.hurt(info.from, d);
      if (byReq) A.cool(info.from, 30);
    }
    if (info.kind !== 'loan') {
      r.loyal = clamp(r.loyal - (byReq ? 9 : 3), 0, 100);
      r.moves = (r.moves || []).concat([S.season]).slice(-6);
      if (r.moves.filter((s) => s >= S.season - 1).length >= 2) r.loyal = clamp(r.loyal - 4, 0, 100); // تنقّل متكرر
      r.club = clamp(48 + ((info.score || 50) - 50) / 4 + (info.role && info.role !== 'none' ? 3 : 0), 0, 100);
    }
    S.treq = { status: 'none' }; S.transferRequest = false;
    if (A.has()) { S.ag.deals++; S.ag.rel = clamp(S.ag.rel + 3, 0, 100); }
    if (G.Press) G.safe(() => G.Press.onUserMove(Object.assign({ p: p.id }, info)), 'press');
  };

  // ---------- أسبوعي ----------
  A.weekly = () => {
    const S = A.state(), r = S.rel, p = P(S.user);
    r.tick = (r.tick || 0) + 1;
    if (p.parentPays) { return; }
    const role = p.role;
    r.club = clamp(r.club + (role === 'starter' ? 0.35 : role === 'out' ? -0.5 : role === 'bench' ? -0.1 : 0) + (S.treq.status !== 'none' ? -0.3 : 0) + (50 - r.club) * 0.01, 0, 100);
    r.loyal = clamp(r.loyal + 0.04 + (50 - r.loyal) * 0.004, 0, 100);
    Object.keys(r.ex).forEach((k) => { r.ex[k] = Math.abs(r.ex[k]) < 0.5 ? 0 : r.ex[k] * 0.995; }); // تلاشي بطيء للعداوة/الودّ
    A.checkPromise();
  };

  // نهاية الموسم: ولاء من يبقى، وتصفير طلبات الموسم
  A.seasonEnd = () => {
    const S = A.state(), r = S.rel;
    if (!(r.moves || []).includes(S.season)) r.loyal = clamp(r.loyal + 3, 0, 100);
    S.treq = { status: 'none' }; S.reoffer = [];
    if (r.broken && r.broken < S.season) delete r.broken;
    S.fin.season = { s: S.season + 1, bonus: 0 };
  };

  // ---------- استطلاع السوق وطلب عروض عبر الوكيل ----------
  A.work = () => {
    const S = A.state(), p = P(S.user), a = S.ag, tr = T();
    if (!A.has()) return { ok: false, msg: 'لا تملك وكيلًا' };
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة — يعمل الوكيل حين تُفتح' };
    if (p.parentPays) return { ok: false, msg: 'أنت معار حاليًا' };
    if (a.last.work > A.tick()) return { ok: false, msg: 'وكيلك ما زال يتواصل مع الأندية — جرّب بعد ' + (a.last.work - A.tick()) + ' أسبوع' };
    a.last.work = A.tick() + 2;
    const made = [];
    tr.suitors().filter((x) => x.afford && x.score >= 42 && !S.offers.some((o) => o.club === x.club && o.type === 'transfer')).slice(0, 8).forEach((x) => {
      if (made.length >= 1 + A.tier()) return;
      if (U.rnd() < 0.45 + A.tier() * 0.12 + (x.score - 50) / 200) { const o = tr.makeOffer(C(x.club), p); if (o) { o.agent = true; made.push(C(x.club).name); } }
    });
    if (!made.length) { A.say('تواصلتُ مع الأندية ولم يتقدّم أحد رسميًا بعد. سأعاود المحاولة.', false); return { ok: true, n: 0, msg: 'لم تصل عروض جديدة هذه المرة' }; }
    tr.refreshRivals();
    A.say('تواصلتُ مع الأندية وتقدّم ' + made.join(' و') + ' بعرض رسمي.', true);
    return { ok: true, n: made.length, msg: 'تقدّم ' + made.length + ' ' + (made.length === 1 ? 'نادٍ' : 'أندية') + ' بعروض عبر وكيلك' };
  };

  // ---------- المزاد بين الأندية ----------
  A.auction = () => {
    const S = A.state(), a = S.ag, tr = T();
    if (!A.has()) return { ok: false, msg: 'المزاد يحتاج وكيلًا' };
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    const live = () => S.offers.filter((o) => o.type === 'transfer' && o.status !== 'withdrawn');
    if (live().length < 2) return { ok: false, msg: 'المزاد يحتاج عرضين على الأقل من أندية مختلفة' };
    if (a.last.auc > A.tick()) return { ok: false, msg: 'أقمتَ مزادًا حديثًا — انتظر ' + (a.last.auc - A.tick()) + ' أسبوع' };
    a.last.auc = A.tick() + 3;
    const pos = P(S.user).pos, out = [];
    for (let r = 0; r < A.info().rounds; r++) {
      const L = live().sort((x, y) => A.wEq(y, pos) - A.wEq(x, pos));
      if (L.length < 2) break;
      const lead = L[0], lw = A.wEq(lead, pos);
      L.slice(1).forEach((o) => {
        const target = lw * (1.02 + U.rnd() * 0.03), cap = o.maxWage * (1 + A.boost().wage);
        if (target > cap * 1.02 || tr.clubNeedsOut(o)) { // لا يستطيع مجاراة الأعلى: ينسحب
          o.status = 'withdrawn'; out.push(C(o.club).name); return;
        }
        if (U.rnd() < 0.7) { const add = target - A.wEq(o, pos); if (add > 0) { o.wage = U.roundTo(o.wage + add, 500); o.auction = true; } }
      });
      if (U.rnd() < 0.5 && lw * 1.03 <= lead.maxWage * (1 + A.boost().wage)) { lead.wage = U.roundTo(lead.wage * 1.03, 500); lead.auction = true; }
    }
    S.offers = S.offers.filter((o) => o.status !== 'withdrawn');
    const best = live().sort((x, y) => A.wEq(y, pos) - A.wEq(x, pos))[0];
    let msg = 'انتهى المزاد: ' + (best ? 'أفضل عرض من ' + C(best.club).name + ' بقيمة ' + U.money(best.wage) + ' أسبوعيًا' : 'لم يبقَ أي عرض');
    if (out.length) msg += ' — انسحب: ' + out.join('، ');
    A.say(msg, true);
    tr.refreshRivals();
    return { ok: true, msg, out };
  };

  // ---------- تفويض الوكيل بالتفاوض ----------
  A.delegate = (offerId) => {
    const S = A.state(), o = S.offers.find((x) => x.id === offerId), tr = T();
    if (!A.has()) return { ok: false, msg: 'لا تملك وكيلًا' };
    if (!o || o.type === 'loan') return { ok: false, msg: 'لا يمكن تفويض هذا العرض' };
    if ((o.tries || 0) >= A.maxTries()) return { ok: false, msg: 'استُنفدت محاولات التفاوض على هذا العرض' };
    o.tries = (o.tries || 0) + 1;
    const pos = P(S.user).pos, cap = o.maxWage * (1 + A.boost().wage), base = A.wEq(o, pos), room = Math.max(0, cap - base);
    const win = U.rnd() < 0.5 + A.skill() + Math.min(3, o.rivals || 0) * 0.04;
    const gain = win ? room * (0.8 + U.rnd() * 0.18) : room * (0.25 + U.rnd() * 0.25);
    o.wage = U.roundTo(o.wage + gain * 0.7, 500);
    o.bonus = Math.round(((o.bonus || 0) + gain * 0.3 * Math.max(1, o.years) * 52) / 5000) * 5000;
    if (S.window && S.window.open && !win && o.tries >= A.maxTries() && U.rnd() < 0.15) { // نادرًا يغضب النادي من إصرار الوكيل
      o.status = 'withdrawn'; S.offers = S.offers.filter((x) => x !== o);
      A.hurt(o.club, -6); A.cool(o.club, 8);
      return { ok: false, collapsed: true, msg: 'غضب ' + C(o.club).name + ' من إصرار الوكيل وسحب عرضه' };
    }
    const msg = (win ? 'نجح وكيلك في رفع العرض: ' : 'حقق وكيلك زيادة محدودة: ') + U.money(o.wage) + ' أسبوعيًا' + (o.bonus ? ' + مكافأة توقيع ' + U.money(o.bonus) : '');
    A.say(msg, false);
    return { ok: true, win, msg };
  };

  // ---------- التفاوض بين الناديين على الرسوم ----------
  A.pushFee = (offerId) => {
    const S = A.state(), o = S.offers.find((x) => x.id === offerId), tr = T(), p = P(S.user);
    if (!A.has()) return { ok: false, msg: 'التفاوض بين الناديين يحتاج وكيلًا' };
    if (!o || o.type !== 'transfer') return { ok: false, msg: 'عرض غير صالح' };
    const sv = tr.sellerView(p, o.fee, C(o.club));
    if (sv.ok) return { ok: false, msg: 'النادي البائع موافق أصلًا' };
    if (sv.code === 'loan') return { ok: false, msg: sv.why };
    const club = C(o.club);
    if (sv.ask > club.tb) { A.say('النادي المشتري لا يملك ميزانية ' + U.money(sv.ask) + ' — لا فائدة من الضغط.', false); return { ok: false, msg: 'ميزانية النادي المشتري لا تصل لسعر البائع' }; }
    if (U.rnd() < 0.40 + A.skill() + A.tier() * 0.05 + (o.score || 50) / 400) {
      o.fee = Math.round(sv.ask / 25000) * 25000; tr.restance();
      const msg = 'نجح وكيلك: اتفق النادي المشتري مع البائع على ' + U.money(o.fee);
      A.say(msg, true); return { ok: true, msg };
    }
    S.offers = S.offers.filter((x) => x !== o); A.hurt(o.club, -4); A.cool(o.club, 10);
    A.say('فشلت المفاوضات بين الناديين على رسوم ' + C(o.club).name + ' وانسحب النادي.', true);
    return { ok: false, collapsed: true, msg: 'فشلت المفاوضات بين الناديين وانسحب ' + club.name };
  };

  G.migrations = G.migrations || [];
  G.migrations.push(() => { if (G.S && G.S.user) A.state(); });
})(window.G = window.G || {});
