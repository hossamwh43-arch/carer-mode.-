/* ui_market.js — سوق الانتقالات والعقود: العروض، التفاوض، الأندية المهتمة، الإعارة، التجديد، طلب الانتقال، سجل الانتقالات */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const T = () => G.Transfers;
  const week = (v) => UI.money(v) + ' / أسبوع';
  const TYPE_AR = { transfer: 'عرض انتقال', loan: 'عرض إعارة', free: 'عقد لاعب حر' };

  const isUcl = (id) => (G.S.uclTeams || []).indexOf(id) >= 0;
  const foreignWarn = (id) => (G.S.clubs[id].liga ? '' : '<div class="notice" style="margin:8px 0 0">⚠️ نادٍ من خارج الدوريات الخمسة الكبرى: ستلعب دوري الأبطال فقط ولن يكون لك دوري محلي (لا يوجد دوري محاكى له في اللعبة).</div>');

  function windowCard() {
    const S = G.S, w = S.window || {}, p = me();
    let h = '<div class="card ' + (w.open ? 'hl' : '') + '"><div class="row sb"><b>' + (w.open ? '🟢 السوق مفتوح (' + (w.kind === 'winter' ? 'شتوي' : 'صيفي') + ')' : '🔴 السوق مغلق') + '</b>' + (S.transferRequest ? '<span class="pill y">قدّمتَ طلب انتقال</span>' : '') + '</div>';
    if (!w.open) h += '<p class="sm mut" style="margin:6px 0 0">يُفتح السوق الشتوي في الأسبوع 19 (حتى 21) والصيفي بعد نهاية الموسم.</p>';
    if (S.userExpired) h += '<div class="notice bad" style="margin-top:8px">⚠️ انتهى عقدك — اختر عرضًا أو جدّد قبل بدء الموسم.</div>';
    if (p.parentPays) h += '<div class="notice" style="margin-top:8px">🔁 أنت معار إلى ' + esc(UI.cname(p.club)) + ' من ' + esc(UI.cname(p.parent)) + ' حتى نهاية الموسم.</div>';
    return h + '</div>';
  }

  // ---------- العروض ----------
  function offerCard(o) {
    const p = me(), c = G.S.clubs[o.club];
    if (o.type === 'transfer') o.stance = T().stance(p, o.fee);
    const ev = G.Coach.evaluateAt(p, o.club);
    const feeRow = o.type === 'transfer' ? '<div class="kv"><span>رسوم الانتقال</span><b>' + UI.money(o.fee) + '</b></div>' : o.type === 'loan' ? '<div class="sm" style="padding:6px 0">🔁 إعارة حتى نهاية الموسم، ثم تعود إلى ناديك الأصلي ويبقى راتبك منه.</div>' : '';
    const terms = o.type === 'loan' ? '' : '<div class="kv"><span>الراتب</span><b>' + week(o.wage) + '</b></div><div class="kv"><span>مدة العقد</span><span>' + o.years + ' سنوات</span></div>';
    return '<div class="card" style="border-color:' + (o.type === 'transfer' ? 'var(--gold)' : 'var(--blue)') + '"><div class="row sb"><span>' + UI.clubTag(o.club, 26) + '</span><span class="pill ' + (o.type === 'transfer' ? 'y' : o.type === 'loan' ? 'b' : 'g') + '">' + TYPE_AR[o.type] + '</span></div>' +
      '<div class="sm mut" style="margin:6px 0">سمعة النادي ' + c.rep + (isUcl(o.club) ? ' · 🏆 يشارك في دوري الأبطال' : '') + (o.note ? ' · ' + esc(o.note) : '') + '</div>' +
      feeRow + terms + '<div class="kv"><span>دورك المتوقع هناك</span><span>' + UI.rolePill(ev.role) + (ev.rival ? ' <span class="sm mut">أمام ' + esc(G.S.players[ev.rival].n) + ' (' + G.S.players[ev.rival].ovr + ')</span>' : '') + '</span></div>' +
      (o.type === 'transfer' && !o.stance.ok ? '<div class="notice bad" style="margin:8px 0 0">' + esc(o.stance.why) + (G.S.transferRequest ? '' : ' — يمكنك تقديم طلب انتقال لرفع فرصة الموافقة.') + '</div>' : '') +
      foreignWarn(o.club) + (o.expires != null && o.type !== 'free' ? '<div class="sm mut" style="margin-top:6px">ينتهي العرض بنهاية الأسبوع ' + o.expires + '</div>' : '') +
      '<div class="grid2" style="margin-top:8px"><button class="btn pri sm" style="width:100%" data-a="offerAccept" data-v="' + o.id + '"' + (o.type === 'transfer' && !o.stance.ok ? ' disabled' : '') + '>✅ ' + (o.type === 'loan' ? 'اقبل الإعارة' : 'اقبل') + '</button>' +
      '<button class="btn red sm" style="width:100%" data-a="offerReject" data-v="' + o.id + '">✖ ارفض</button>' +
      (o.type !== 'loan' ? '<button class="btn sm" style="width:100%" data-a="offerNeg" data-v="' + o.id + '">🤝 تفاوض على الراتب</button>' : '') +
      (o.type === 'transfer' && !o.pressed ? '<button class="btn sm" style="width:100%" data-a="offerPress" data-v="' + o.id + '">📈 استغلّ المنافسة</button>' : '') + '</div></div>';
  }

  function offersTab() {
    const S = G.S, p = me(), list = S.offers || [];
    let h = '';
    if (!list.length) h += '<div class="card c"><div style="font-size:36px">📭</div><p class="mut">لا توجد عروض الآن. تأتي العروض في فترات الانتقالات بحسب أدائك وتقييمك ودورك في الفريق.</p></div>';
    else h += list.map(offerCard).join('');
    if (S.userExpired) h += '<div class="card"><h4>الخيار الأخير</h4><p class="sm mut">إن لم يعجبك أي عرض: سنة واحدة مع ناديك الحالي بأجر مخفّض.</p><button class="btn" data-a="emergency">عقد قصير بالحد الأدنى</button></div>';
    return h;
  }

  // ---------- الأندية المهتمة ----------
  function interestTab() {
    const S = G.S, p = me(), w = S.window && S.window.open;
    if (p.parentPays) return '<div class="card mut c">لا يمكنك التفاوض مع أندية أخرى أثناء الإعارة.</div>';
    const list = T().interested();
    const LV = { 3: ['مهتم جدًا', 'g'], 2: ['مهتم', 'y'], 1: ['اهتمام ضعيف', ''] };
    let h = '<div class="notice">الأندية المهتمة تُحسب من فارق تقييمك عن لاعبي مركزك فيها، وقدرتها المالية على راتبك ورسوم انتقالك (' + UI.money(p.val) + ' قيمتك السوقية).</div>';
    if (!list.length) return h + '<div class="card mut c">لا أندية مهتمة حاليًا. طوّر مستواك وقدّم أداءً أفضل.</div>';
    h += list.map((x) => {
      const c = S.clubs[x.club], ev = G.Coach.evaluateAt(p, x.club);
      return '<div class="card"><div class="row sb"><span>' + UI.clubTag(x.club, 24) + '</span><span class="pill ' + LV[x.level][1] + '">' + LV[x.level][0] + '</span></div><div class="sm mut" style="margin:6px 0">سمعة ' + c.rep + (isUcl(x.club) ? ' · 🏆 الأبطال' : '') + (c.liga ? '' : ' · أجنبي') + '</div>' +
        '<div class="kv"><span>دورك المتوقع</span><span>' + UI.rolePill(ev.role) + '</span></div>' + foreignWarn(x.club) +
        '<button class="btn sm" style="margin-top:8px" data-a="askClub" data-v="' + x.club + '"' + (w ? '' : ' disabled') + '>📨 اطلب عرضًا رسميًا</button></div>';
    }).join('');
    return h;
  }

  // ---------- العقد ----------
  function contractTab() {
    const S = G.S, p = me(), club = S.clubs[p.club];
    let h = '<div class="card"><h3>عقدي</h3><div class="kv"><span>النادي</span><b>' + esc(club.name) + '</b></div>' +
      '<div class="kv"><span>المدة المتبقية</span><b class="' + (p.ct.y <= 1 ? 'neg' : '') + '">' + (p.parentPays ? 'إعارة' : p.ct.y + ' سنة') + '</b></div>' +
      '<div class="kv"><span>الراتب</span><span>' + week(p.ct.w) + ' (≈ ' + UI.money(p.ct.w * 52) + ' سنويًا)</span></div>' +
      '<div class="kv"><span>قيمتك السوقية</span><b class="gold">' + UI.money(p.val) + '</b></div>' +
      '<div class="kv"><span>العمر / التقييم / الإمكانات</span><span>' + p.age + ' / ' + p.ovr + ' / ' + p.pot + '</span></div></div>';
    h += '<div class="notice">القيمة السوقية تتأثر بتقييمك وعمرك وإمكاناتك ومدة عقدك وأدائك الأخير (' + (p.form.length ? 'متوسط آخر مباريات ' + G.Coach.formAvg(p).toFixed(1) : 'لم تلعب بعد') + ').</div>';
    const rn = G.S.renew && G.S.renew.season === S.season ? G.S.renew.terms : null;
    if (T().canRenew()) {
      h += '<div class="card"><h4>تجديد العقد</h4>' + (rn && rn.status === 'withdrawn' ? '<p class="neg sm">سحب النادي عرض التجديد هذا الموسم.</p>' : '<p class="sm mut">يمكنك التفاوض على عقد جديد مع ' + esc(club.name) + ' (عقدك ينتهي خلال ' + p.ct.y + ' سنة).</p><button class="btn gold" data-a="renewOpen">📝 تفاوض على التجديد</button>') + '</div>';
    }
    if (!p.parentPays) {
      h += '<div class="card"><h4>طلبات خاصة</h4>' +
        '<button class="btn" data-a="reqTransfer"' + (S.transferRequest ? ' disabled' : '') + '>🚪 ' + (S.transferRequest ? 'تم تقديم طلب الانتقال' : 'قدّم طلب انتقال') + '</button>' +
        '<button class="btn" data-a="reqLoan">🔁 اطلب إعارة لزيادة دقائق اللعب</button>' +
        '<p class="sm mut" style="margin:8px 0 0">طلب الانتقال يخفض ثقة المدرب (−8) لكنه يزيد العروض ويجعل ناديك أكثر استعدادًا للبيع. الإعارة متاحة فقط لأندية الدوري الإسباني وللاعبين حتى 25 سنة.</p></div>';
    }
    h += '<div class="card"><h4>تاريخي مع الأندية</h4>' + p.hist.slice().reverse().map((x) => '<div class="kv"><span>' + G.Season.label(x.season) + ' · ' + esc(UI.cname(x.club)) + '</span><span class="mut sm">' + (x.type === 'join' ? 'بداية المسيرة' : x.type === 'loan' ? 'إعارة' : x.type === 'free' ? 'لاعب حر' : 'انتقال ' + UI.money(x.fee)) + '</span></div>').join('') + '</div>';
    return h;
  }

  function logTab() {
    const log = G.S.tlog || [];
    if (!log.length) return '<div class="card mut c">لا صفقات مسجّلة بعد.</div>';
    return '<div class="card">' + log.slice(0, 40).map((t) => '<div class="msg"><div class="row sb"><b' + (t.user ? ' class="gold"' : '') + '>' + esc(t.name) + ' <span class="mut sm">(' + t.ovr + ')</span></b><span class="pill ' + (t.user ? 'y' : '') + '">' + (t.fee ? UI.money(t.fee) : 'حر') + '</span></div><div class="sm mut">' + G.Season.label(t.season) + ' · ' + esc(t.from ? UI.cname(t.from) : 'لاعب حر') + ' ← ' + esc(UI.cname(t.to)) + '</div></div>').join('') + '</div>';
  }

  UI.screens.market = () => {
    const S = G.S, n = (S.offers || []).length;
    const tabs = UI.tabs('mk', [['offers', 'العروض' + (n ? ' (' + n + ')' : '')], ['interest', 'الأندية المهتمة'], ['contract', 'عقدي'], ['log', 'سجل الصفقات']], 'offers');
    const t = UI.curTab('mk', 'offers');
    return windowCard() + tabs + (t === 'offers' ? offersTab() : t === 'interest' ? interestTab() : t === 'contract' ? contractTab() : logTab());
  };

  // ---------- التفاوض ----------
  const src = () => {
    const n = UI.neg;
    if (!n) return null;
    if (n.mode === 'renew') return G.S.renew ? G.S.renew.terms : null;
    return (G.S.offers || []).find((x) => x.id === n.id) || null;
  };
  const maxYears = () => (me().age >= 31 ? 2 : 5);
  function negHtml() {
    const n = UI.neg, s = src();
    if (!n || !s || s.status === 'withdrawn') return '<h3>' + (n && n.msg ? esc(n.msg) : 'لم يعد العرض متاحًا') + '</h3><button class="btn" data-a="closeSheet">إغلاق</button>';
    const club = n.mode === 'renew' ? me().club : s.club;
    const left = 3 - (s.tries || 0);
    return '<h3>' + (n.mode === 'renew' ? 'تجديد العقد مع ' : 'تفاوض مع ') + esc(UI.cname(club)) + '</h3>' +
      '<div class="kv"><span>العرض الحالي</span><span>' + week(s.wage) + ' · ' + s.years + ' سنوات</span></div><div class="kv"><span>محاولات متبقية</span><b>' + Math.max(0, left) + ' من 3</b></div>' +
      '<label class="f">الراتب الأسبوعي المطلوب</label><div class="row"><button class="btn sm" data-a="negAdj" data-v="-10">−10%</button><button class="btn sm" data-a="negAdj" data-v="-5">−5%</button><div class="grow c b gold" style="font-size:17px">' + UI.money(n.wage) + '</div><button class="btn sm" data-a="negAdj" data-v="5">+5%</button><button class="btn sm" data-a="negAdj" data-v="10">+10%</button></div>' +
      '<label class="f">مدة العقد</label><div class="chips">' + [1, 2, 3, 4, 5].filter((y) => y <= maxYears()).map((y) => '<button class="chip ' + (n.years === y ? 'on' : '') + '" data-a="negYears" data-v="' + y + '">' + y + '</button>').join('') + '</div>' +
      (n.msg ? '<div class="notice ' + (n.agreed ? 'ok' : '') + '" style="margin-top:12px">' + esc(n.msg) + '</div>' : '') +
      (n.agreed ? '<button class="btn pri" data-a="negSign">✍️ وقّع الآن</button>' : '<button class="btn pri" data-a="negSend">أرسل المقترح</button>') + '<button class="btn" data-a="closeSheet">إغلاق</button>';
  }
  const reneg = () => UI.sheetRender(negHtml);

  UI.on('offerNeg', (id) => {
    const o = G.S.offers.find((x) => x.id === id);
    if (!o) return;
    UI.neg = { mode: 'offer', id, wage: o.wage, years: o.years, msg: '', agreed: false };
    reneg(); return false;
  });
  UI.on('renewOpen', () => {
    const S = G.S;
    if (!S.renew || S.renew.season !== S.season) S.renew = { season: S.season, terms: T().renewalTerms() };
    const t = S.renew.terms;
    UI.neg = { mode: 'renew', wage: t.wage, years: t.years, msg: '', agreed: false };
    reneg(); return false;
  });
  UI.on('negAdj', (v) => { UI.neg.wage = U.clamp(U.roundTo(UI.neg.wage * (1 + (+v) / 100), 500), 800, 600000); UI.neg.agreed = false; reneg(); return false; });
  UI.on('negYears', (v) => { UI.neg.years = +v; UI.neg.agreed = false; reneg(); return false; });
  UI.on('negSend', () => {
    const n = UI.neg, s = src();
    if (!s) { reneg(); return false; }
    const r = T().negotiate(s, n.wage, n.years);
    if (r.res === 'accept') { n.agreed = true; n.wage = r.wage; n.years = r.years; n.msg = 'وافق النادي على: ' + week(r.wage) + ' لمدة ' + r.years + ' سنوات.'; }
    else if (r.res === 'counter') { n.wage = r.wage; n.years = r.years; n.msg = r.msg + ': ' + week(r.wage) + '. يمكنك قبوله بإرساله أو تعديله.'; }
    else if (r.res === 'withdraw') {
      n.msg = r.msg;
      if (n.mode === 'offer') G.S.offers = G.S.offers.filter((x) => x.id !== n.id); else s.status = 'withdrawn';
    } else { n.msg = r.msg; n.wage = Math.min(n.wage, r.wage || n.wage); }
    G.Save.save(); reneg(); return false;
  });
  UI.on('negSign', () => {
    const n = UI.neg, s = src();
    if (!s) return false;
    let r;
    if (n.mode === 'renew') { r = T().renew(s, s.wage, s.years); if (r.ok) G.S.renew = null; }
    else r = T().acceptOffer(n.id, s.wage, s.years);
    if (!r.ok) { n.msg = r.msg; n.agreed = false; reneg(); return false; }
    G.Coach.decide(); G.Save.save(); UI.closeSheet(); UI.toast(n.mode === 'renew' ? 'تم تجديد العقد ✅' : 'تم الانتقال إلى ' + UI.cname(r.to) + ' ✅'); UI.render();
    UI.fx('coin'); UI.banner('win', n.mode === 'renew' ? '✍️ تم تجديد العقد' : '✍️ انتقال جديد', n.mode === 'renew' ? UI.cname(G.S.players[G.S.user].club) : UI.cname(r.to), { confetti: 18 });
    return false;
  });

  // ---------- قبول/رفض/ضغط ----------
  UI.on('offerAccept', (id) => {
    const o = G.S.offers.find((x) => x.id === id);
    if (!o) return;
    const p = me(), ev = G.Coach.evaluateAt(p, o.club);
    const body = o.type === 'loan' ? 'ستنتقل معارًا إلى <b>' + esc(UI.cname(o.club)) + '</b> حتى نهاية الموسم ثم تعود.'
      : 'الانتقال إلى <b>' + esc(UI.cname(o.club)) + '</b>' + (o.fee ? ' مقابل ' + UI.money(o.fee) : ' كلاعب حر') + '<br>الراتب: ' + week(o.wage) + ' · ' + o.years + ' سنوات';
    UI.confirm('تأكيد القرار', body + '<br>دورك المتوقع: <b>' + G.Coach.ROLE_AR[ev.role] + '</b>' + (G.S.clubs[o.club].liga ? '' : '<br><span class="neg">⚠️ نادٍ أجنبي — دوري أبطال فقط.</span>'), () => {
      const r = T().acceptOffer(id, o.wage, o.years);
      if (r.ok) { G.Coach.decide(); G.Save.save(); UI.toast('تم! أنت الآن في ' + UI.cname(r.to)); } else UI.toast(r.msg);
      UI.render();
      if (r.ok) { UI.fx('coin'); UI.banner('win', o.type === 'loan' ? '🔁 إعارة جديدة' : '✍️ انتقال جديد', UI.cname(r.to), { confetti: 18 }); }
    }, 'تأكيد');
    return false;
  });
  UI.on('offerReject', (id) => { T().rejectOffer(id); G.Save.save(); UI.toast('رفضتَ العرض'); });
  UI.on('offerPress', (id) => { const r = T().pressure(id); G.Save.save(); UI.toast(r.msg); });
  UI.on('askClub', (cid) => { const r = T().ask(cid); G.Save.save(); UI.toast(r.ok ? 'قدّم النادي عرضًا رسميًا — راجع تبويب العروض' : r.msg); if (r.ok) UI.sub.mk = 'offers'; });
  UI.on('reqTransfer', () => {
    UI.confirm('طلب الانتقال؟', 'سيغضب المدرب وتنخفض ثقته بك (−8)، لكن ستصلك عروض أكثر ولن يعرقل النادي رحيلك.', () => { const r = T().requestTransfer(); G.Save.save(); UI.toast(r.ok ? 'تم تقديم الطلب' : r.msg); UI.render(); }, 'قدّم الطلب');
    return false;
  });
  UI.on('reqLoan', () => { const r = T().requestLoan(); G.Save.save(); UI.toast(r.ok ? 'وصلتك ' + r.n + ' عروض إعارة' : r.msg); if (r.ok) UI.sub.mk = 'offers'; });
  UI.on('emergency', () => {
    UI.confirm('عقد قصير بالحد الأدنى؟', 'سنة واحدة مع ناديك الحالي براتب مخفّض (حوالي 60% من راتبك المعتاد).', () => { const r = T().emergencyContract(); G.Save.save(); UI.toast(r.ok ? 'تم تمديد عقدك' : r.msg); UI.render(); }, 'وافق');
    return false;
  });
})(window.G = window.G || {});
