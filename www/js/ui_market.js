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

  // ألوان هوية النادي → متغيرات CSS (rgb ثلاثية لتدرجات شفافة؛ الألوان الداكنة جدًا تُفتَّح قليلًا كي تُرى على الخلفية)
  const rgbOf = (hex) => {
    let h = String(hex || '#3b82f6').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    if (h.length !== 6) h = '3b82f6';
    let r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    if ([r, g, b].some((v) => isNaN(v))) { r = 59; g = 130; b = 246; }
    if (Math.max(r, g, b) < 110) { r = Math.round(r + (255 - r) * 0.34); g = Math.round(g + (255 - g) * 0.34); b = Math.round(b + (255 - b) * 0.34); }
    return r + ' ' + g + ' ' + b;
  };
  const ck = (id) => { const c = G.S.clubs[id], a = (c && c.c) || ['#3b82f6', '#ffffff']; return '--k:' + rgbOf(a[0]) + ';--k2:' + rgbOf(a[1] || '#ffffff'); };
  const tile = (lab, val, unit, cls) => '<div class="of-t' + (cls ? ' ' + cls : '') + '"><small>' + lab + '</small><b>' + val + '</b>' + (unit ? '<i>' + unit + '</i>' : '') + '</div>';

  // شريط حالة السوق: مؤشر مباشر + عدّ تنازلي لإغلاق النافذة (معلومات من UI.windowInfo فقط)
  function windowCard() {
    const S = G.S, w = S.window || {}, p = me(), i = UI.windowInfo();
    let h = '<div class="mk-win ' + (w.open ? 'on' : 'off') + '"><div class="mk-r"><span class="mk-dot"></span><div class="mk-tt"><b>' + (w.open ? 'السوق مفتوح' + (w.kind === 'winter' ? ' · شتوي' : ' · صيفي') : 'السوق مغلق') + '</b><small>' + i.text + '</small></div>' + (S.transferRequest ? '<span class="pill y">طلب انتقال</span>' : '') + '</div>' +
      '<div class="mk-bar">' + UI.bar(i.pct, i.open ? '' : 'gold') + '</div></div>';
    if (S.userExpired) h += '<div class="notice bad">⚠️ انتهى عقدك — اختر عرضًا أو جدّد قبل بدء الموسم.</div>';
    if (p.parentPays) h += '<div class="notice">🔁 أنت معار إلى ' + esc(UI.cname(p.club)) + ' من ' + esc(UI.cname(p.parent)) + ' حتى نهاية الموسم.</div>';
    return h;
  }

  // ---------- العروض: بطاقة عرض رسمي بهوية لون النادي ----------
  function offerCard(o, top) {
    const p = me(), c = G.S.clubs[o.club];
    if (o.type === 'transfer') o.stance = T().stance(p, o.fee);
    const ev = G.Coach.evaluateAt(p, o.club);
    const tiles = o.type === 'loan' ? tile('النوع', 'إعارة', '', 'wide') + tile('المدة', 'حتى نهاية الموسم', '', 'wide') + tile('الراتب', 'من ناديك', '', 'wide') :
      tile('الراتب', UI.money(o.wage), '/ أسبوع') + tile('مدة العقد', o.years, 'سنوات') + (o.type === 'transfer' ? tile('رسوم الانتقال', UI.money(o.fee), '', 'fee') : tile('الرسوم', 'حر', '', 'fee'));
    const ratio = o.type === 'transfer' && p.val ? Math.round(o.fee / p.val * 100) : 0;
    const type = o.type === 'transfer' ? 'tr' : o.type === 'loan' ? 'ln' : 'fr';
    return '<article class="offer o-' + type + (top ? ' top' : '') + '" style="' + ck(o.club) + '"><div class="of-hero"><div class="of-in">' +
      '<div class="of-tags"><span class="of-type">' + TYPE_AR[o.type] + '</span>' + (top ? '<span class="of-best">★ أفضل عرض</span>' : '') + '</div>' +
      '<h3>' + esc(UI.cname(o.club)) + '</h3><div class="of-sub">سمعة ' + c.rep + (isUcl(o.club) ? ' · يشارك في دوري الأبطال' : '') + (o.note ? ' · ' + esc(o.note) : '') + '</div></div><div class="of-crest">' + UI.badge(o.club, 84) + '</div></div>' +
      '<div class="of-tiles">' + tiles + '</div>' +
      (ratio ? '<div class="of-val"><div class="row sb sm"><span class="mut">قيمتك السوقية ' + UI.money(p.val) + '</span><b>الرسوم ' + ratio + '٪ منها</b></div>' + UI.bar(Math.min(100, ratio / 1.5), ratio >= 100 ? 'gold' : '') + '</div>' : '') +
      '<div class="of-role"><span class="mut">دورك المتوقع</span><span>' + UI.rolePill(ev.role) + (ev.rival ? ' <span class="sm mut">أمام ' + esc(G.S.players[ev.rival].n) + ' (' + G.S.players[ev.rival].ovr + ')</span>' : '') + '</span></div>' +
      (o.type === 'transfer' && !o.stance.ok ? '<div class="notice bad" style="margin:8px 0 0">' + esc(o.stance.why) + (G.S.transferRequest ? '' : ' — يمكنك تقديم طلب انتقال لرفع فرصة الموافقة.') + '</div>' : '') +
      foreignWarn(o.club) + (o.expires != null && o.type !== 'free' ? '<div class="of-exp">⏳ ينتهي العرض بنهاية الأسبوع ' + o.expires + '</div>' : '') +
      '<div class="of-act"><button class="btn pri of-go" data-a="offerAccept" data-v="' + o.id + '"' + (o.type === 'transfer' && !o.stance.ok ? ' disabled' : '') + '>✅ ' + (o.type === 'loan' ? 'اقبل الإعارة' : 'اقبل العرض') + '</button>' +
      '<div class="of-sec">' + (o.type !== 'loan' ? '<button class="btn sm" data-a="offerNeg" data-v="' + o.id + '">🤝 تفاوض</button>' : '') +
      (o.type === 'transfer' && !o.pressed ? '<button class="btn sm" data-a="offerPress" data-v="' + o.id + '">📈 استغلّ المنافسة</button>' : '') +
      '<button class="btn red sm" data-a="offerReject" data-v="' + o.id + '">✖ ارفض</button></div></div></article>';
  }

  // حالة «لا عروض»: تشرح أين نحن من نوافذ الانتقال وتعدّ الأسابيع للنافذة التالية (زينة/معلومة فقط)
  UI.windowInfo = () => {
    const S = G.S, w = S.week || 1, SE = G.Season, wo = SE.WINTER_OPEN, wc = SE.WINTER_CLOSE, last = SE.LAST_WEEK, pl = (n) => (n === 1 ? 'أسبوع واحد' : n === 2 ? 'أسبوعان' : n <= 10 ? n + ' أسابيع' : n + ' أسبوعًا');
    if (S.window && S.window.open) {
      if (S.window.kind === 'winter') { const n = Math.max(1, wc - w); return { open: true, pct: ((w - wo + 1) / (wc - wo)) * 100, title: 'السوق الشتوي مفتوح', text: 'يُغلق بعد ' + pl(n) + '. العروض تصل بحسب أدائك وتقييمك ودورك.' }; }
      return { open: true, pct: 100, title: 'السوق الصيفي مفتوح', text: 'يبقى مفتوحًا حتى بدء الموسم. العروض تصل بحسب أدائك وتقييمك ودورك.' };
    }
    if (S.phase === 'season' && w < wo) return { open: false, pct: ((w - 1) / (wo - 1)) * 100, title: 'السوق مغلق الآن', text: 'يُفتح السوق الشتوي بعد ' + pl(wo - w) + ' (الأسبوع ' + wo + ').' };
    if (S.phase === 'season' && w < last) return { open: false, pct: ((w - wc) / (last - wc)) * 100, title: 'أُغلق السوق الشتوي', text: 'السوق الصيفي يُفتح بعد نهاية الموسم، أي بعد ' + pl(last - w) + '.' };
    return { open: false, pct: 100, title: 'السوق مغلق الآن', text: 'يُفتح السوق الصيفي عند الانتقال للموسم التالي.' };
  };
  function windowEmpty() {
    const i = UI.windowInfo();
    return '<div class="card empty-st"><div class="es-ic">' + UI.ico('swap') + '</div><h3>لا عروض الآن</h3>' +
      '<div style="margin:6px 0 8px">' + UI.bar(i.pct, i.open ? '' : 'gold') + '</div><p class="sm" style="margin:0"><b>' + i.title + '</b> — ' + i.text + '</p>' +
      '<p class="sm mut" style="margin:8px 0 0">وللحصول على عروض أكثر: العب أساسيًا، ارفع تقييمك، وحافظ على ثقة المدرب.</p></div>';
  }

  function offersTab() {
    const S = G.S, p = me(), list = S.offers || [];
    let h = '';
    if (!list.length) h += windowEmpty();
    else {
      const best = list.length > 1 ? list.filter((x) => x.type !== 'loan').slice().sort((x, y) => (y.wage * y.years) - (x.wage * x.years))[0] : null;
      h += list.map((o) => offerCard(o, best && best.id === o.id)).join('');
    }
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
      return '<div class="card int" style="' + ck(x.club) + '"><div class="int-r"><span class="int-c">' + UI.badge(x.club, 46) + '</span><div class="int-n"><b>' + esc(UI.cname(x.club)) + '</b><small class="mut">سمعة ' + c.rep + (isUcl(x.club) ? ' · الأبطال' : '') + (c.liga ? '' : ' · أجنبي') + '</small></div>' +
        '<div class="int-l lv' + x.level + '" title="' + LV[x.level][0] + '"><i></i><i></i><i></i><small>' + LV[x.level][0] + '</small></div></div>' +
        '<div class="kv"><span>دورك المتوقع</span><span>' + UI.rolePill(ev.role) + '</span></div>' + foreignWarn(x.club) +
        '<button class="btn sm" style="margin-top:8px;width:100%" data-a="askClub" data-v="' + x.club + '"' + (w ? '' : ' disabled') + '>📨 اطلب عرضًا رسميًا</button></div>';
    }).join('');
    return h;
  }

  // ---------- العقد ----------
  function contractTab() {
    const S = G.S, p = me(), club = S.clubs[p.club];
    const yl = p.parentPays ? 0 : p.ct.y, seg = [1, 2, 3, 4, 5].map((n) => '<i class="' + (n <= yl ? 'on' : '') + '"></i>').join('');
    let h = '<section class="ctr" style="' + ck(p.club) + '"><div class="ctr-top"><div class="ctr-in"><small>عقدي الحالي</small><h2>' + esc(club.name) + '</h2><div class="ctr-chips"><span>' + p.age + ' سنة</span><span>تقييم ' + p.ovr + '</span><span>إمكانات ' + p.pot + '</span></div></div><div class="of-crest">' + UI.badge(p.club, 84) + '</div></div>' +
      '<div class="of-tiles">' + tile('الراتب', UI.money(p.ct.w), '/ أسبوع') + tile('المتبقي', p.parentPays ? 'إعارة' : p.ct.y, p.parentPays ? '' : (p.ct.y === 1 ? 'سنة' : 'سنوات'), p.ct.y <= 1 && !p.parentPays ? 'warn' : '') + tile('قيمتك السوقية', UI.money(p.val), '', 'fee') + '</div>' +
      '<div class="ctr-yrs"><div class="row sb sm"><span class="mut">مدة العقد المتبقية</span><span class="mut">≈ ' + UI.money(p.ct.w * 52) + ' سنويًا</span></div><div class="segs">' + seg + '</div></div></section>';
    h += '<div class="notice">القيمة السوقية تتأثر بتقييمك وعمرك وإمكاناتك ومدة عقدك وأدائك الأخير (' + (p.form.length ? 'متوسط آخر مباريات ' + G.Coach.formAvg(p).toFixed(1) : 'لم تلعب بعد') + ').</div>';
    const rn = G.S.renew && G.S.renew.season === S.season ? G.S.renew.terms : null;
    if (T().canRenew()) {
      h += '<div class="card"><h4>تجديد العقد</h4>' + (rn && rn.status === 'withdrawn' ? '<p class="neg sm">سحب النادي عرض التجديد هذا الموسم.</p>' : '<p class="sm mut">يمكنك التفاوض على عقد جديد مع ' + esc(club.name) + ' (عقدك ينتهي خلال ' + p.ct.y + ' سنة).</p><button class="btn gold" data-a="renewOpen">📝 تفاوض على التجديد</button>') + '</div>';
    }
    if (!p.parentPays) {
      h += '<div class="card"><h4>طلبات خاصة</h4>' +
        '<button class="btn" data-a="reqTransfer"' + (S.transferRequest ? ' disabled' : '') + '>🚪 ' + (S.transferRequest ? 'تم تقديم طلب الانتقال' : 'قدّم طلب انتقال') + '</button>' +
        '<button class="btn" data-a="reqLoan">🔁 اطلب إعارة لزيادة دقائق اللعب</button>' +
        '<div class="sm mut" style="margin:8px 0 0">' + UI.more('', 'طلب الانتقال يخفض ثقة المدرب (−8) لكنه يزيد العروض ويجعل ناديك أكثر استعدادًا للبيع. الإعارة متاحة فقط لأندية الدوري الإسباني وللاعبين حتى 25 سنة.', 'ماذا يفعل طلب الانتقال؟') + '</div></div>';
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
    return '<div class="neg-h" style="' + ck(club) + '"><span class="of-crest sm">' + UI.badge(club, 52) + '</span><div><small class="mut">' + (n.mode === 'renew' ? 'تجديد العقد' : 'طاولة التفاوض') + '</small><h3>' + esc(UI.cname(club)) + '</h3></div><div class="tries" title="المحاولات المتبقية">' + [0, 1, 2].map((i) => '<i class="' + (i < Math.max(0, left) ? 'on' : '') + '"></i>').join('') + '</div></div>' +
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
