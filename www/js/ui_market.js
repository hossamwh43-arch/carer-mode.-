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
    let h = '<div class="mk-win ' + (w.open ? 'on' : 'off') + '"><div class="mk-r"><span class="mk-dot"></span><div class="mk-tt"><b>' + (w.open ? 'السوق مفتوح' + (w.kind === 'winter' ? ' · شتوي' : ' · صيفي') : 'السوق مغلق') + '</b><small>' + i.text + '</small></div>' + (w.open && w.dl ? '<span class="pill r">يوم الحسم</span>' : '') + (S.transferRequest ? '<span class="pill y">طلب انتقال</span>' : '') + '</div>' +
      '<div class="mk-bar">' + UI.bar(i.pct, i.open ? '' : 'gold') + '</div></div>';
    if (S.userExpired) h += '<div class="notice bad">⚠️ انتهى عقدك — اختر عرضًا أو جدّد قبل بدء الموسم.</div>';
    if (p.parentPays) h += '<div class="notice">🔁 أنت معار إلى ' + esc(UI.cname(p.club)) + ' من ' + esc(UI.cname(p.parent)) + ' حتى نهاية الموسم.</div>';
    return h;
  }

  // مكافآت الحزمة والدور الموعود (نصوص مختصرة تحت المربعات الثلاثة)
  function pkgChips(o) {
    if (o.type === 'loan') return o.buy ? '<div class="of-pk"><span class="pk"><small>بند شراء</small><b>' + UI.money(o.buy) + '</b></span></div>' : '';
    const it = [];
    if (o.bonus) it.push(['مكافأة توقيع', UI.money(o.bonus)]);
    if (o.ab) it.push(['مكافأة مشاركة', UI.money(o.ab)]);
    if (o.gb) it.push(['مكافأة هدف', UI.money(o.gb)]);
    if (o.role && o.role !== 'none') it.push(['دور موعود', G.Agent.ROLE_AR[o.role]]);
    return it.length ? '<div class="of-pk">' + it.map((x) => '<span class="pk"><small>' + x[0] + '</small><b>' + x[1] + '</b></span>').join('') + '</div>' : '';
  }
  // لماذا يريدك هذا النادي + حالة العرض (منافسة، مزاد، وكيل)
  function whyChips(o) {
    const a = [];
    if (o.agent) a.push(['عبر وكيلك', 'y']);
    if (o.reoffer) a.push(['عرض محسّن بعد رفضك', 'g']);
    if (o.auction) a.push(['ارتفع بالمزاد', 'g']);
    if (o.rivals > 0) a.push(['ينافسه ' + o.rivals + (o.rivals === 1 ? ' نادٍ آخر' : ' أندية أخرى'), 'b']);
    (o.why || []).forEach((w) => a.push([w, '']));
    return a.length ? '<div class="of-why">' + a.map((x) => '<span class="pill ' + x[1] + '">' + esc(x[0]) + '</span>').join('') + '</div>' : '';
  }

  // ---------- العروض: بطاقة عرض رسمي بهوية لون النادي ----------
  function offerCard(o, top) {
    const p = me(), c = G.S.clubs[o.club];
    if (o.type === 'transfer') o.stance = T().stance(p, o.fee);
    const ev = G.Coach.evaluateAt(p, o.club);
    const tiles = o.type === 'loan' ? tile('النوع', 'إعارة', '', 'wide') + tile('المدة', 'حتى نهاية الموسم', '', 'wide') + tile('الراتب', 'من ناديك', '', 'wide') :
      tile('الراتب', UI.money(o.wage), '/ أسبوع') + tile('مدة العقد', o.years, 'سنوات') + (o.type === 'transfer' ? tile('رسوم الانتقال', UI.money(o.fee), '', 'fee') : tile('الرسوم', 'حر', '', 'fee'));
    const ratio = o.type === 'transfer' && p.val ? Math.round(o.fee / p.val * 100) : 0;
    const hasAg = G.Agent.has();
    const type = o.type === 'transfer' ? 'tr' : o.type === 'loan' ? 'ln' : 'fr';
    return '<article class="offer o-' + type + (top ? ' top' : '') + '" style="' + ck(o.club) + '"><div class="of-hero"><div class="of-in">' +
      '<div class="of-tags"><span class="of-type">' + TYPE_AR[o.type] + '</span>' + (top ? '<span class="of-best">★ أفضل عرض</span>' : '') + '</div>' +
      '<h3>' + esc(UI.cname(o.club)) + '</h3><div class="of-sub">سمعة ' + c.rep + (isUcl(o.club) ? ' · يشارك في دوري الأبطال' : '') + (o.note ? ' · ' + esc(o.note) : '') + '</div></div><div class="of-crest">' + UI.badge(o.club, 84) + '</div></div>' +
      '<div class="of-tiles">' + tiles + '</div>' + pkgChips(o) + whyChips(o) +
      (ratio ? '<div class="of-val"><div class="row sb sm"><span class="mut">قيمتك السوقية ' + UI.money(p.val) + '</span><b>الرسوم ' + ratio + '٪ منها</b></div>' + UI.bar(Math.min(100, ratio / 1.5), ratio >= 100 ? 'gold' : '') + '</div>' : '') +
      '<div class="of-role"><span class="mut">دورك المتوقع</span><span>' + UI.rolePill(ev.role) + (ev.rival ? ' <span class="sm mut">أمام ' + esc(G.S.players[ev.rival].n) + ' (' + G.S.players[ev.rival].ovr + ')</span>' : '') + '</span></div>' +
      (o.type === 'transfer' && !o.stance.ok ? '<div class="notice bad" style="margin:8px 0 0">' + esc(o.stance.why) + (G.S.transferRequest ? '' : ' — يمكنك تقديم طلب انتقال لرفع فرصة الموافقة.') + (hasAg ? '<button class="btn sm" style="margin-top:8px;width:100%" data-a="agPushFee" data-v="' + o.id + '">🧑‍💼 فاوِض النادي البائع عبر وكيلك</button>' : '') + '</div>' : '') +
      (o.type === 'transfer' && o.stance.ok && o.stance.soft ? '<div class="notice" style="margin:8px 0 0">⚠️ ' + esc(o.stance.why) + (hasAg ? '<button class="btn sm" style="margin-top:8px;width:100%" data-a="agPushFee" data-v="' + o.id + '">🧑‍💼 سوِّ الرسوم عبر وكيلك قبل التوقيع</button>' : '') + '</div>' : '') +
      foreignWarn(o.club) + (o.expires != null && o.type !== 'free' ? '<div class="of-exp">⏳ ينتهي العرض بنهاية الأسبوع ' + o.expires + '</div>' : '') +
      '<div class="of-act"><button class="btn pri of-go" data-a="offerAccept" data-v="' + o.id + '"' + (o.type === 'transfer' && !o.stance.ok ? ' disabled' : '') + '>✅ ' + (o.type === 'loan' ? 'اقبل الإعارة' : 'اقبل العرض') + '</button>' +
      '<div class="of-sec">' + (o.type !== 'loan' ? '<button class="btn sm" data-a="offerNeg" data-v="' + o.id + '">🤝 تفاوض</button>' : '') +
      (hasAg && o.type !== 'loan' ? '<button class="btn sm" data-a="agDelegate" data-v="' + o.id + '">🧑‍💼 فوّض الوكيل</button>' : '') +
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
    // بطاقة النافذة في الأعلى تشرح الحالة والعدّ التنازلي؛ هنا نكتفي بالنصيحة حتى لا نكرّر نفس الرسالة
    return '<div class="card empty-st"><div class="es-ic">' + UI.ico('swap') + '</div><h3>لا عروض الآن</h3>' +
      '<p class="sm mut" style="margin:0">للحصول على عروض أكثر: العب أساسيًا، ارفع تقييمك، وحافظ على ثقة المدرب.</p></div>';
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
    let h = '<div class="notice">درجة اهتمام كل نادي تُحسب من مستواك مقابل فريقه، وحاجته في مركزك، وعمرك وإمكاناتك، وأدائك في آخر موسمين، وإنجازاتك وسمعتك، وعلاقتك به، وقدرته المالية على راتبك ورسومك (' + UI.money(p.val) + ' قيمتك السوقية).</div>';
    if (!list.length) return h + '<div class="card mut c">لا أندية مهتمة حاليًا. طوّر مستواك وقدّم أداءً أفضل.</div>';
    h += list.map((x) => {
      const c = S.clubs[x.club], ev = G.Coach.evaluateAt(p, x.club), cool = G.Agent.cooling(x.club);
      return '<div class="card int" style="' + ck(x.club) + '"><div class="int-r"><span class="int-c">' + UI.badge(x.club, 46) + '</span><div class="int-n"><b>' + esc(UI.cname(x.club)) + '</b><small class="mut">سمعة ' + c.rep + (isUcl(x.club) ? ' · الأبطال' : '') + (c.liga ? '' : ' · أجنبي') + ' · درجة الاهتمام ' + x.score + '</small></div>' +
        '<div class="int-l lv' + x.level + '" title="' + LV[x.level][0] + '"><i></i><i></i><i></i><small>' + LV[x.level][0] + '</small></div></div>' +
        (x.reasons.length ? '<div class="of-why" style="padding:0 0 8px">' + x.reasons.map((r) => '<span class="pill">' + esc(r) + '</span>').join('') + '</div>' : '') +
        '<div class="kv"><span>دورك المتوقع</span><span>' + UI.rolePill(ev.role) + '</span></div>' + foreignWarn(x.club) +
        '<button class="btn sm" style="margin-top:8px;width:100%" data-a="askClub" data-v="' + x.club + '"' + (w && !cool ? '' : ' disabled') + '>' + (cool ? '⏳ النادي لا يريد التفاوض الآن' : '📨 اطلب عرضًا رسميًا') + '</button></div>';
    }).join('');
    return h;
  }

  // ---------- العقد ----------
  const meter = (lab, v, txt, cls) => '<div class="rl"><div class="row sb sm"><span>' + lab + '</span><b>' + txt + '</b></div>' + UI.bar(v, cls || '') + '</div>';
  function relPanel() {
    const S = G.S, A = G.Agent, r = A.rel();
    let h = '<div class="card"><h4>علاقاتي وسمعتي</h4>' +
      meter('علاقتي بالنادي', Math.round(r.club), A.relLabel(r.club), r.club < 35 ? 'red' : r.club >= 60 ? '' : 'gold') +
      meter('سمعة الولاء', Math.round(r.loyal), A.loyalLabel(r.loyal), r.loyal < 35 ? 'red' : r.loyal >= 60 ? '' : 'gold') +
      (A.has() ? meter('ثقة وكيلي (' + esc(S.ag.name) + ')', Math.round(S.ag.rel), A.relLabel(S.ag.rel), 'blue') : '');
    const ex = Object.keys(r.ex).filter((k) => Math.abs(r.ex[k]) >= 10 && S.clubs[k]).sort((a, b) => Math.abs(r.ex[b]) - Math.abs(r.ex[a])).slice(0, 3);
    if (ex.length) h += '<div class="sm mut" style="margin-top:8px">أندية سابقة: ' + ex.map((k) => esc(UI.cname(k)) + ' (' + (r.ex[k] > 0 ? 'ودّ' : 'غضب') + ')').join('، ') + '</div>';
    h += '<div class="sm mut" style="margin-top:6px">علاقتك بالنادي ترفع أو تخفض ما يطلبه ثمنًا لبيعك وراتب تجديدك. الولاء يتراجع بالتنقل المتكرر وطلبات الرحيل ويعود تدريجيًا بالبقاء.</div></div>';
    return h;
  }
  function requestsCard() {
    const S = G.S, p = me(), tr = S.treq || { status: 'none' }, A = G.Agent;
    let h = '';
    if (tr.status !== 'none') {
      const ref = tr.status === 'refused', left = Math.max(0, (tr.until || 0) - A.tick());
      h += '<div class="card"><h4>طلب الانتقال الرسمي</h4><div class="notice ' + (ref ? 'bad' : '') + '"><b>' + (ref ? 'رفض النادي طلبك' : tr.status === 'accepted' ? 'النادي وافق على رحيلك' : 'النادي يشترط سعرًا مرتفعًا') + '</b><br>' + esc(tr.why || '') + '.</div>' +
        (ref ? '<p class="sm mut">يمكنك إعادة الطلب بعد ' + left + ' أسابيع، أو استمر بالأداء الجيد ليتغيّر رأي النادي.</p>' : '<button class="btn" data-a="reqWithdraw">↩️ اسحب الطلب</button>') + '</div>';
    }
    if (!p.parentPays) {
      h += '<div class="card"><h4>طلبات خاصة</h4>' +
        '<button class="btn" data-a="reqTransfer"' + (tr.status === 'accepted' || tr.status === 'cond' ? ' disabled' : '') + '>🚪 ' + (tr.status === 'accepted' || tr.status === 'cond' ? 'تم تقديم طلب الانتقال' : 'قدّم طلب انتقال') + '</button>' +
        '<button class="btn" data-a="reqLoan">🔁 اطلب إعارة لزيادة دقائق اللعب</button>' +
        (S.lreq ? '<div class="sm mut" style="margin:8px 0 0">آخر ردّ للنادي على الإعارة: ' + esc(S.lreq.why) + '</div>' : '') +
        '<div class="sm mut" style="margin:8px 0 0">' + UI.more('', 'طلب الانتقال يخفض ثقة المدرب (−8، أو −5 إن قدّمه وكيلك بهدوء) وعلاقتك بالنادي وسمعة ولائك. يردّ النادي: يوافق إن لم يعد يعوّل عليك، أو يشترط سعرًا مرتفعًا، أو يرفض إن كنت ركيزة. الإعارة يوافق عليها النادي إن كنت خارج التشكيلة أو موهبة شابة، وقد يحمل العرض بند شراء يفعّله النادي المعير نهاية الموسم إذا أعجبه أداؤك. تعمل الطلبات والعروض في نوافذ الانتقالات فقط.', 'كيف تعمل الطلبات؟') + '</div></div>';
    }
    return h;
  }
  function contractTab() {
    const S = G.S, p = me(), club = S.clubs[p.club], A = G.Agent;
    const yl = p.parentPays ? 0 : p.ct.y, seg = [1, 2, 3, 4, 5].map((n) => '<i class="' + (n <= yl ? 'on' : '') + '"></i>').join('');
    let h = '<section class="ctr" style="' + ck(p.club) + '"><div class="ctr-top"><div class="ctr-in"><small>عقدي الحالي</small><h2>' + esc(club.name) + '</h2><div class="ctr-chips"><span>' + p.age + ' سنة</span><span>تقييم ' + p.ovr + '</span><span>إمكانات ' + p.pot + '</span></div></div><div class="of-crest">' + UI.badge(p.club, 84) + '</div></div>' +
      '<div class="of-tiles">' + tile('الراتب', UI.money(p.ct.w), '/ أسبوع') + tile('المتبقي', p.parentPays ? 'إعارة' : p.ct.y, p.parentPays ? '' : (p.ct.y === 1 ? 'سنة' : 'سنوات'), p.ct.y <= 1 && !p.parentPays ? 'warn' : '') + tile('قيمتك السوقية', UI.money(p.val), '', 'fee') + '</div>' +
      ((p.ct.ab || p.ct.gb) ? '<div class="of-pk">' + (p.ct.ab ? '<span class="pk"><small>مكافأة مشاركة</small><b>' + UI.money(p.ct.ab) + '</b></span>' : '') + (p.ct.gb ? '<span class="pk"><small>مكافأة هدف</small><b>' + UI.money(p.ct.gb) + '</b></span>' : '') + '</div>' : '') +
      '<div class="ctr-yrs"><div class="row sb sm"><span class="mut">مدة العقد المتبقية</span><span class="mut">≈ ' + UI.money(p.ct.w * 52) + ' سنويًا</span></div><div class="segs">' + seg + '</div></div></section>';
    h += '<div class="notice">القيمة السوقية تتأثر بتقييمك وعمرك وإمكاناتك ومدة عقدك وأدائك الأخير (' + (p.form.length ? 'متوسط آخر مباريات ' + G.Coach.formAvg(p).toFixed(1) : 'لم تلعب بعد') + ').</div>';
    if (p.promise && !p.promise.done && p.promise.club === p.club) h += '<div class="notice ok">🤝 وعدك النادي بدور «' + A.ROLE_AR[p.promise.role] + '» — يُحكم على الوعد بعد ' + p.promise.left + ' أسابيع.</div>';
    const rn = G.S.renew && G.S.renew.season === S.season ? G.S.renew.terms : null;
    if (T().canRenew()) {
      h += '<div class="card"><h4>تجديد العقد</h4>' + (rn && rn.status === 'withdrawn' ? '<p class="neg sm">سحب النادي عرض التجديد هذا الموسم.</p>' : '<p class="sm mut">يمكنك التفاوض على عقد جديد مع ' + esc(club.name) + ' (عقدك ينتهي خلال ' + p.ct.y + ' سنة).</p><button class="btn gold" data-a="renewOpen">📝 تفاوض على التجديد</button>') + '</div>';
    }
    h += relPanel() + requestsCard();
    const f = A.fin();
    if (f.signing || f.bonus || f.agent) {
      h += '<div class="card"><h4>أرباح العقود</h4>' +
        '<div class="kv"><span>مكافآت التوقيع</span><b>' + UI.money(f.signing) + '</b></div>' +
        '<div class="kv"><span>مكافآت المباريات (كل المسيرة)</span><b>' + UI.money(f.bonus) + '</b></div>' +
        (f.season && f.season.s === S.season ? '<div class="kv"><span>مكافآت هذا الموسم</span><b>' + UI.money(f.season.bonus) + '</b></div>' : '') +
        '<div class="kv"><span>عمولات الوكلاء</span><b class="neg">−' + UI.money(f.agent) + '</b></div></div>';
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
    const tabs = UI.tabs('mk', [['offers', 'العروض' + (n ? ' (' + n + ')' : '')], ['interest', 'الأندية المهتمة'], ['agent', 'وكيلي'], ['contract', 'عقدي'], ['log', 'سجل الصفقات']], 'offers');
    const t = UI.curTab('mk', 'offers');
    return windowCard() + tabs + (t === 'offers' ? offersTab() : t === 'interest' ? interestTab() : t === 'agent' ? UI.agentTab() : t === 'contract' ? contractTab() : logTab());
  };

  // ---------- التفاوض ----------
  const src = () => {
    const n = UI.neg;
    if (!n) return null;
    if (n.mode === 'renew') return G.S.renew ? G.S.renew.terms : null;
    return (G.S.offers || []).find((x) => x.id === n.id) || null;
  };
  const maxYears = () => (me().age >= 31 ? 2 : 5);
  const WK = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12], ABP = [0, 3, 5, 8, 12], GBP = [0, 5, 10, 20];
  const near = (arr, v) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), arr[0]);
  const negFrom = (o, extra) => {
    const w = Math.max(1, o.wage);
    return Object.assign({ mode: 'offer', id: o.id, wage: o.wage, years: o.years, bw: near(WK, Math.round((o.bonus || 0) / w)), abp: near(ABP, Math.round((o.ab || 0) / w * 100)), gbp: near(GBP, Math.round((o.gb || 0) / w * 100)), role: o.role || 'none', msg: '', agreed: false }, extra || {});
  };
  const termsOf = (n) => ({ bonus: U.roundTo(n.wage * n.bw, 5000), ab: U.roundTo(n.wage * n.abp / 100, 500), gb: U.roundTo(n.wage * n.gbp / 100, 500), role: n.role });
  // تقدير وكيلك لسقف النادي (بضوضاء ثابتة ±5٪ لكل عرض): أفضلية الوكيل الحقيقية في التفاوض
  const capHint = (s, n) => {
    const h = String(s.id).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7), noise = 1 + ((h % 11) - 5) / 100;
    const est = s.maxWage * (1 + G.Agent.boost().wage) * noise, want = G.Agent.wEq(Object.assign({ wage: n.wage, years: n.years }, termsOf(n)), me().pos);
    return { est, pct: Math.round(want / est * 100) };
  };
  function negHtml() {
    const n = UI.neg, s = src(), A = G.Agent;
    if (!n || !s || s.status === 'withdrawn') return '<h3>' + (n && n.msg ? esc(n.msg) : 'لم يعد العرض متاحًا') + '</h3><button class="btn" data-a="closeSheet">إغلاق</button>';
    const club = n.mode === 'renew' ? me().club : s.club, offer = n.mode === 'offer';
    const mt = T().maxTries(), left = Math.max(0, mt - (s.tries || 0));
    const chips = (arr, cur, act, fmt) => '<div class="chips">' + arr.map((v) => '<button class="chip ' + (cur === v ? 'on' : '') + '" data-a="' + act + '" data-v="' + v + '">' + fmt(v) + '</button>').join('') + '</div>';
    let h = '<div class="neg-h" style="' + ck(club) + '"><span class="of-crest sm">' + UI.badge(club, 52) + '</span><div><small class="mut">' + (n.mode === 'renew' ? 'تجديد العقد' : 'طاولة التفاوض') + '</small><h3>' + esc(UI.cname(club)) + '</h3></div><div class="tries" title="المحاولات المتبقية">' + Array.from({ length: mt }, (x, i) => '<i class="' + (i < left ? 'on' : '') + '"></i>').join('') + '</div></div>' +
      '<div class="kv"><span>العرض الحالي</span><span>' + week(s.wage) + ' · ' + s.years + ' سنوات</span></div>' +
      (offer && (s.bonus || s.ab || s.gb) ? '<div class="kv"><span>المكافآت الحالية</span><span class="sm">' + [s.bonus ? 'توقيع ' + UI.money(s.bonus) : '', s.ab ? 'مشاركة ' + UI.money(s.ab) : '', s.gb ? 'هدف ' + UI.money(s.gb) : ''].filter(Boolean).join(' · ') + '</span></div>' : '') +
      '<div class="kv"><span>محاولات متبقية</span><b>' + left + ' من ' + mt + '</b></div>' +
      '<label class="f">الراتب الأسبوعي المطلوب</label><div class="row"><button class="btn sm" data-a="negAdj" data-v="-10">−10%</button><button class="btn sm" data-a="negAdj" data-v="-5">−5%</button><div class="grow c b gold" style="font-size:17px">' + UI.money(n.wage) + '</div><button class="btn sm" data-a="negAdj" data-v="5">+5%</button><button class="btn sm" data-a="negAdj" data-v="10">+10%</button></div>' +
      '<label class="f">مدة العقد</label><div class="chips">' + [1, 2, 3, 4, 5].filter((y) => y <= maxYears()).map((y) => '<button class="chip ' + (n.years === y ? 'on' : '') + '" data-a="negYears" data-v="' + y + '">' + y + '</button>').join('') + '</div>';
    if (offer) {
      h += '<label class="f">مكافأة التوقيع (أسابيع من راتبك)</label>' + chips(WK, n.bw, 'negBw', (v) => (v ? v : 'بلا')) +
        '<label class="f">مكافأة المشاركة (٪ من الراتب لكل مباراة)</label>' + chips(ABP, n.abp, 'negAbp', (v) => (v ? v + '٪' : 'بلا')) +
        '<label class="f">مكافأة الهدف (٪ من الراتب لكل هدف)</label>' + chips(GBP, n.gbp, 'negGbp', (v) => (v ? v + '٪' : 'بلا')) +
        '<label class="f">دورك في الفريق</label><div class="chips">' + ['none', 'rotation', 'starter'].map((r) => '<button class="chip ' + (n.role === r ? 'on' : '') + '" data-a="negRole" data-v="' + r + '">' + A.ROLE_AR[r] + '</button>').join('') + '</div>' +
        '<div class="sm mut" style="margin-top:6px">طلب دور أعلى مما يمنحه النادي طبيعيًا يرفع كلفته عليه، وإن لم يوفِ به المدرب خلال 10 أسابيع تتأثر علاقتك بالنادي.</div>';
      if (A.has()) {
        const c = capHint(s, n), cls = c.pct > 100 ? 'red' : c.pct > 88 ? 'gold' : '';
        h += '<div class="rl" style="margin-top:12px"><div class="row sb sm"><span>🧑‍💼 تقدير وكيلك لقدرة النادي</span><b>' + c.pct + '٪ من سقفه</b></div>' + UI.bar(Math.min(100, c.pct), cls) + '</div>';
      }
    }
    h += (n.msg ? '<div class="notice ' + (n.agreed ? 'ok' : '') + '" style="margin-top:12px">' + esc(n.msg) + '</div>' : '') +
      (n.agreed ? '<button class="btn pri" data-a="negSign">✍️ وقّع الآن</button>' : '<button class="btn pri" data-a="negSend"' + (left <= 0 ? ' disabled' : '') + '>أرسل المقترح</button>') +
      (offer && A.has() && !n.agreed ? '<button class="btn" data-a="agDelegate" data-v="' + n.id + '"' + (left <= 0 ? ' disabled' : '') + '>🧑‍💼 فوّض وكيلك بالتفاوض</button>' : '') +
      '<button class="btn" data-a="closeSheet">إغلاق</button>';
    return h;
  }
  const reneg = () => UI.sheetRender(negHtml);
  UI.negRefresh = (msg) => { const s = src(); if (UI.neg && UI._sheetFn && s) { UI.neg = negFrom(s, { msg: msg || '' }); reneg(); return true; } return false; };

  UI.on('offerNeg', (id) => {
    const o = G.S.offers.find((x) => x.id === id);
    if (!o) return;
    UI.neg = negFrom(o);
    reneg(); return false;
  });
  UI.on('renewOpen', () => {
    const S = G.S;
    if (!S.renew || S.renew.season !== S.season) S.renew = { season: S.season, terms: T().renewalTerms() };
    const t = S.renew.terms;
    UI.neg = { mode: 'renew', wage: t.wage, years: t.years, msg: '', agreed: false };
    reneg(); return false;
  });
  const touch = () => { UI.neg.agreed = false; reneg(); return false; };
  UI.on('negAdj', (v) => { UI.neg.wage = U.clamp(U.roundTo(UI.neg.wage * (1 + (+v) / 100), 500), 800, 600000); return touch(); });
  UI.on('negYears', (v) => { UI.neg.years = +v; return touch(); });
  UI.on('negBw', (v) => { UI.neg.bw = +v; return touch(); });
  UI.on('negAbp', (v) => { UI.neg.abp = +v; return touch(); });
  UI.on('negGbp', (v) => { UI.neg.gbp = +v; return touch(); });
  UI.on('negRole', (v) => { UI.neg.role = v; return touch(); });
  UI.on('negSend', () => {
    const n = UI.neg, s = src();
    if (!s) { reneg(); return false; }
    const offer = n.mode === 'offer', r = T().negotiate(s, n.wage, n.years, offer ? termsOf(n) : undefined);
    const apply = (x) => { n.wage = x.wage; n.years = x.years; if (offer) { const w = Math.max(1, x.wage); n.bw = near(WK, Math.round((x.bonus || 0) / w)); n.abp = near(ABP, Math.round((x.ab || 0) / w * 100)); n.gbp = near(GBP, Math.round((x.gb || 0) / w * 100)); n.role = x.role || n.role; } };
    if (r.res === 'accept') { n.agreed = true; apply(r); n.msg = 'وافق النادي على: ' + week(r.wage) + ' لمدة ' + r.years + ' سنوات' + (offer && r.bonus ? ' + مكافأة توقيع ' + UI.money(r.bonus) : '') + '.'; }
    else if (r.res === 'counter') { apply(r); n.msg = r.msg + ': ' + week(r.wage) + (r.bonus ? ' + مكافأة توقيع ' + UI.money(r.bonus) : '') + '. يمكنك قبوله بإرساله أو تعديله.'; }
    else if (r.res === 'withdraw') {
      n.msg = r.msg;
      if (n.mode === 'offer') G.S.offers = G.S.offers.filter((x) => x.id !== n.id); else s.status = 'withdrawn';
      UI.banner('opp', 'انسحب النادي', r.msg);
    } else { n.msg = r.msg; if (r.wage) n.wage = Math.min(n.wage, r.wage); }
    G.Save.save(); reneg(); return false;
  });
  UI.on('negSign', () => {
    const n = UI.neg, s = src();
    if (!s) return false;
    let r;
    if (n.mode === 'renew') { r = T().renew(s, s.wage, s.years); if (r.ok) G.S.renew = null; }
    else r = T().acceptOffer(n.id, s.wage, s.years);
    if (!r.ok) {
      if (r.collapsed) { UI.closeSheet(); G.Save.save(); UI.banner('opp', 'انهارت الصفقة', r.msg); UI.render(); return false; }
      n.msg = r.msg; n.agreed = false; reneg(); return false;
    }
    G.Coach.decide(); G.Save.save(); UI.closeSheet(); UI.toast(n.mode === 'renew' ? 'تم تجديد العقد ✅' : 'تم الانتقال إلى ' + UI.cname(r.to) + ' ✅'); UI.render();
    UI.fx('coin'); UI.banner('win', n.mode === 'renew' ? '✍️ تم تجديد العقد' : '✍️ انتقال جديد', n.mode === 'renew' ? UI.cname(G.S.players[G.S.user].club) : UI.cname(r.to), { confetti: 18 });
    return false;
  });

  // ---------- قبول/رفض/ضغط ----------
  UI.on('offerAccept', (id) => {
    const o = G.S.offers.find((x) => x.id === id);
    if (!o) return;
    const p = me(), ev = G.Coach.evaluateAt(p, o.club);
    const body = o.type === 'loan' ? 'ستنتقل معارًا إلى <b>' + esc(UI.cname(o.club)) + '</b> حتى نهاية الموسم ثم تعود.' + (o.buy ? '<br>بند الشراء: ' + UI.money(o.buy) : '')
      : 'الانتقال إلى <b>' + esc(UI.cname(o.club)) + '</b>' + (o.fee ? ' مقابل ' + UI.money(o.fee) : ' كلاعب حر') + '<br>الراتب: ' + week(o.wage) + ' · ' + o.years + ' سنوات' +
        (o.bonus ? '<br>مكافأة التوقيع: ' + UI.money(o.bonus) : '') + (o.role && o.role !== 'none' ? '<br>الدور الموعود: <b>' + G.Agent.ROLE_AR[o.role] + '</b>' : '') +
        (G.Agent.has() ? '<br><span class="mut">عمولة وكيلك: ' + UI.money(G.Agent.commission(o.wage, o.bonus)) + '</span>' : '') +
        (o.stance && o.stance.soft ? '<br><span class="neg">⚠️ ' + esc(o.stance.why) + '</span>' : '');
    UI.confirm('تأكيد القرار', body + '<br>دورك المتوقع: <b>' + G.Coach.ROLE_AR[ev.role] + '</b>' + (G.S.clubs[o.club].liga ? '' : '<br><span class="neg">⚠️ نادٍ أجنبي — دوري أبطال فقط.</span>'), () => {
      const r = T().acceptOffer(id, o.wage, o.years);
      if (r.ok) { G.Coach.decide(); G.Save.save(); UI.toast('تم! أنت الآن في ' + UI.cname(r.to)); } else { G.Save.save(); UI.toast(r.msg); }
      UI.render();
      if (r.ok) { UI.fx('coin'); UI.banner('win', o.type === 'loan' ? '🔁 إعارة جديدة' : '✍️ انتقال جديد', UI.cname(r.to), { confetti: 18 }); }
      else if (r.collapsed) UI.banner('opp', 'انهارت الصفقة', r.msg);
    }, 'تأكيد');
    return false;
  });
  UI.on('offerReject', (id) => { T().rejectOffer(id); G.Save.save(); UI.toast('رفضتَ العرض'); });
  UI.on('offerPress', (id) => { const r = T().pressure(id); G.Save.save(); UI.toast(r.msg); });
  UI.on('askClub', (cid) => { const r = T().ask(cid); G.Save.save(); UI.toast(r.ok ? 'قدّم النادي عرضًا رسميًا — راجع تبويب العروض' : r.msg); if (r.ok) UI.sub.mk = 'offers'; });
  UI.on('reqTransfer', () => {
    const A = G.Agent;
    UI.confirm('طلب الانتقال؟', 'سيغضب المدرب وتنخفض ثقته بك (' + (A.has() ? '−5 لأن وكيلك يقدّمه بهدوء' : '−8') + ')، وتتأثر علاقتك بالنادي وسمعة ولائك. يردّ النادي: قد يوافق، أو يشترط سعرًا مرتفعًا، أو يرفض إن كنت ركيزة لديه.', () => {
      const r = T().requestTransfer(); G.Save.save(); UI.toast(r.ok ? (r.status === 'refused' ? 'رفض النادي طلبك' : 'تم تقديم الطلب') : r.msg); UI.render();
    }, 'قدّم الطلب');
    return false;
  });
  UI.on('reqWithdraw', () => { const r = T().withdrawRequest(); G.Save.save(); UI.toast(r.ok ? 'سحبتَ الطلب' : r.msg); });
  UI.on('reqLoan', () => { const r = T().requestLoan(); G.Save.save(); UI.toast(r.ok ? 'وصلتك ' + r.n + ' عروض إعارة' : r.msg); if (r.ok) UI.sub.mk = 'offers'; });
  UI.on('emergency', () => {
    UI.confirm('عقد قصير بالحد الأدنى؟', 'سنة واحدة مع ناديك الحالي براتب مخفّض (حوالي 60% من راتبك المعتاد).', () => { const r = T().emergencyContract(); G.Save.save(); UI.toast(r.ok ? 'تم تمديد عقدك' : r.msg); UI.render(); }, 'وافق');
    return false;
  });
})(window.G = window.G || {});
