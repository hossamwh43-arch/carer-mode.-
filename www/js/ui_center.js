/* ui_center.js — مركز المباريات: بطاقة المباراة السينمائية (تُستخدم في الرئيسية أيضًا)، أهمية المباراة، المعاينة والتشكيلة والجدول.
   عرض فقط: التوقعات من G.Lineup.predict (بلا عشوائية)، والأزرار تستدعي الأفعال القديمة نفسها (playMatch/resumeMatch/advanceWeek). */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const LAST = () => (G.Season.LAST_WEEK || 39);

  const f5 = (arr) => (arr && arr.length ? '<span class="f5">' + arr.map((t) => '<i class="' + t + '"></i>').join('') + '</span>' : '');
  const weeksTxt = (n) => (n <= 0 ? 'هذا الأسبوع' : n === 1 ? 'بعد أسبوع' : n === 2 ? 'بعد أسبوعين' : n <= 10 ? 'بعد ' + n + ' أسابيع' : 'بعد ' + n + ' أسبوعًا');

  // أهمية المباراة: 2 حاسمة (إقصائيات/نهائي)، 1 كبيرة (قمة، ليلة أبطال، بقاء)، 0 عادية
  UI.matchImportance = (f) => {
    const S = G.S, u = me();
    if (f.comp === 'SUP') return { lvl: 2, tag: 'نهائي ' + G.supName(f.cn, true) };
    if (f.comp === 'CUP') {
      if (f.stage === 'final') return { lvl: 2, tag: 'نهائي ' + G.cupName(f.cn, true) };
      if (f.stage === 'sf') return { lvl: 2, tag: 'نصف نهائي الكأس' };
      if (f.stage === 'qf' || f.stage === 'r16') return { lvl: 1, tag: 'مباراة إقصائية' };
      return { lvl: 0, tag: '' };
    }
    if (f.comp !== 'LL' && f.comp !== 'NT') {
      if (f.stage === 'final') return { lvl: 2, tag: 'نهائي دوري الأبطال' };
      if (f.stage && f.stage !== 'league') return { lvl: 2, tag: 'مباراة إقصائية' };
      return { lvl: 1, tag: 'ليلة أبطال أوروبا' };
    }
    try {
      const order = G.League.sorted(), n = order.length, opp = f.h === u.club ? f.a : f.h, po = order.indexOf(opp) + 1, pm = order.indexOf(u.club) + 1;
      if (po > 0 && pm > 0) {
        if (po <= 3 && pm <= 6 && po !== pm) return { lvl: 1, tag: 'قمة الدوري' };
        if (S.week >= 32 && Math.abs(po - pm) <= 2 && (pm <= 4 || pm > n - 5)) return { lvl: 1, tag: 'مواجهة حاسمة' };
        if (pm > n - 4 && po > n - 6) return { lvl: 1, tag: 'معركة البقاء' };
      }
    } catch (e) { /* الأهمية زينة فقط */ }
    return { lvl: 0, tag: '' };
  };

  const venueOf = (f) => (f.comp === 'NT' ? '' : f.neutral ? 'ملعب محايد' : f.h === me().club ? 'على أرضك' : 'خارج أرضك');
  const groundOf = (f) => (f.neutral ? 'ملعب محايد' : 'ملعب ' + UI.cname(f.h));

  // بطاقة المباراة: opt.pending (تُلعب الآن) · opt.compact (الرئيسية) · opt.info (ملعب/جولة) · opt.pred (بطاقة التوقع)
  UI.fixtureCard = (fix, opt) => {
    opt = opt || {};
    const S = G.S, u = me(), imp = UI.matchImportance(fix), form = fix.comp === 'LL' && S.league && !opt.compact ? UI.lgForm(S.league) : null;
    const wk = fix.w != null ? fix.w : S.week, cd = opt.pending ? '<span class="cd now">' + UI.ico('bolt') + ' جاهزة للعب الآن</span>' : '<span class="cd">' + UI.ico('hourglass') + ' ' + weeksTxt(wk - S.week) + '</span>';
    const team = (id) => '<div class="mc-t' + (id === u.club ? ' me' : '') + '">' + UI.badge(id, opt.compact ? 52 : 68) + '<b>' + esc(UI.cname(id)) + '</b>' + (form ? f5(form[id]) : '') + '</div>';
    let h = '<section class="mcta lv' + imp.lvl + (opt.compact ? ' compact' : '') + '">' + (imp.lvl ? '<div class="mc-rib">' + UI.ico('flame') + ' ' + imp.tag + '</div>' : '') +
      '<div class="mc-top"><span>' + esc(UI.fixLabel(fix)) + '</span><span class="venue">' + venueOf(fix) + '</span></div>' +
      '<div class="mc-teams">' + team(fix.h) + '<div class="mc-mid"><span class="vstag">ضد</span></div>' + team(fix.a) + '</div>' +
      '<div class="mc-cd">' + cd + '<span class="pill b">' + UI.week() + '</span></div>';
    if (opt.info) h += '<div class="mc-info"><span>' + UI.ico('pin') + ' ' + esc(groundOf(fix)) + '</span><span>' + UI.ico('calendar') + ' الأسبوع ' + wk + (fix.r ? ' · الجولة ' + fix.r : '') + '</span></div>';
    if (opt.pending) {
      const act = u.role === 'starter' || u.role === 'rotation' || u.role === 'bench';
      if (u.role === 'injured' || u.role === 'suspended') h += '<div class="notice bad" style="margin-top:10px">' + (u.role === 'injured' ? 'أنت مصاب ولن تشارك' : 'أنت موقوف ولن تشارك') + ' — يمكنك مشاهدة المباراة أو محاكاتها.</div>';
      h += '<button class="btn pri nm-go' + (imp.lvl ? ' pulse' : '') + '" data-a="playMatch" data-v="' + fix.id + '" data-v2="i">' + UI.ico(act ? 'gamepad' : 'eye') + ' ' + (act ? 'العب المباراة' : 'شاهد المباراة') + '</button>' +
        '<button class="btn sm nm-sim" data-a="playMatch" data-v="' + fix.id + '" data-v2="s">' + UI.ico('bolt') + ' محاكاة كاملة (نتيجة فورية)</button>';
    }
    if (opt.pred && UI.predCard) h += UI.predCard(fix);
    return h + '</section>';
  };

  // حالة المباراة الآن: جارية → متابعة · مباراة هذا الأسبوع → بطاقة اللعب · لا مباراة → الأسبوع القادم وزر إنهاء الأسبوع
  UI.nextMatchBlock = (opt) => {
    opt = opt || {};
    const S = G.S, pend = G.Season.pending();
    if (S.active) {
      const f = G.Season.findFix(S.active.fixId);
      return '<section class="mcta lv1' + (opt.compact ? ' compact' : '') + '"><div class="mc-rib">' + UI.ico('timer') + ' مباراة جارية</div>' + (f ? UI.fixLine(f, true) : '') + '<button class="btn pri nm-go pulse" data-a="resumeMatch">' + UI.ico('play') + ' متابعة المباراة</button></section>';
    }
    if (pend) return UI.fixtureCard(pend, { pending: true, compact: opt.compact, info: opt.info, pred: opt.pred });
    const nx = G.Season.nextFixture();
    let h = '';
    if (nx) h += UI.fixtureCard(nx, { compact: opt.compact, info: opt.info, pred: false });
    else h += UI.empty('check2', 'لا مباريات متبقية لك هذا الموسم', 'أنهِ الأسابيع المتبقية لإكمال الموسم.');
    return h + '<button class="btn pri" data-a="advanceWeek">' + UI.ico('ffwd') + ' إنهاء الأسبوع (يُجري التدريب)</button>';
  };

  // ---------- مركز المباريات ----------
  function vsBars(fix) {
    const pr = G.safe(() => G.Lineup.predict(fix.h, fix.a, { neutral: !!fix.neutral }), 'center.predict');
    if (!pr) return '';
    const u = me(), mine = fix.h === u.club ? 'h' : 'a', opp = mine === 'h' ? 'a' : 'h', R = pr.R;
    const bar = (lab, a, b) => '<div class="vs"><b class="ltr">' + Math.round(a) + '</b><div><div class="sm mut c">' + lab + '</div><div class="vsb"><i style="width:' + U.clamp(a - 30, 4, 70) / 0.7 + '%"></i><i class="o" style="width:' + U.clamp(b - 30, 4, 70) / 0.7 + '%"></i></div></div><b class="ltr">' + Math.round(b) + '</b></div>';
    return '<div class="card"><div class="row sb sm"><span>' + UI.clubTag(fix[mine], 18) + '</span><span>' + UI.clubTag(fix[opp], 18) + '</span></div>' + bar('الهجوم', R[mine].A, R[opp].A) + bar('الوسط', R[mine].M, R[opp].M) + bar('الدفاع', R[mine].D, R[opp].D) + bar('الحارس', R[mine].gk, R[opp].gk) + '</div>';
  }
  function standings(fix) {
    const S = G.S, u = me();
    if (fix.comp !== 'LL' || !S.league) return '';
    const order = G.League.sorted(), opp = fix.h === u.club ? fix.a : fix.h, pm = order.indexOf(u.club) + 1, po = order.indexOf(opp) + 1, T = S.league.table;
    if (!T[u.club] || !T[opp]) return '';
    const row = (id, pos) => '<div class="kv"><span>' + UI.clubTag(id, 20) + '</span><span>المركز <b>' + pos + '</b> · ' + T[id].pts + ' نقطة</span></div>';
    return '<div class="card"><h4>الترتيب قبل المباراة</h4>' + row(u.club, pm) + row(opp, po) + '</div>';
  }
  function preTab(fix) {
    const S = G.S, u = me();
    let h = (UI.predCard ? '<div class="card pred-card">' + UI.predCard(fix) + '</div>' : '') + vsBars(fix) + standings(fix);
    h += '<div class="card"><h4>أدائك الأخير</h4>' + UI.formDots(u.form) + '</div>';
    if (UI.uclLine && fix.comp === 'UCL') h += UI.uclLine();
    if (UI.cupLine && (fix.comp === 'CUP' || fix.comp === 'SUP')) h += UI.cupLine(fix);
    return h;
  }
  function xiTab(fix) {
    const u = me(), pr = G.safe(() => G.Lineup.predict(fix.h, fix.a, { neutral: !!fix.neutral }), 'center.xi');
    if (!pr) return UI.empty('clipboard', 'التشكيلة غير متاحة الآن');
    const mine = fix.h === u.club ? 'h' : 'a', L = pr.L[mine];
    const bench = L.bench.map((id) => G.S.players[id]).filter(Boolean).map((p) => esc(String(p.n).split(/\s+/).slice(-1)[0]) + ' <span class="mut">' + p.ovr + '</span>').join(' · ');
    return '<div class="card"><div class="row sb"><b>' + esc(UI.cname(u.club)) + '</b><span class="pill b ltr">' + esc(G.S.clubs[u.club].form) + '</span></div>' + UI.pitch(L.xi, u.club, { hi: u.id }) +
      '<div class="row sb sm"><span class="mut">دورك</span>' + UI.rolePill(u.role) + '</div>' + (u.roleInfo && u.roleInfo.text ? '<p class="sm mut" style="margin:8px 0 0">' + esc(u.roleInfo.text) + '</p>' : '') +
      '<div class="sm mut" style="margin-top:8px">الاحتياط: ' + (bench || '—') + '</div></div>' +
      '<button class="btn" data-a="predOpen" data-v="' + fix.id + '">' + UI.ico('eye') + ' تشكيلة الخصم</button>';
  }
  function schTab() {
    const S = G.S, u = me(), up = [];
    for (let w = S.week; w <= LAST() && up.length < 6; w++) { G.Season.userFixtures(w).forEach((f) => { if (!f.played && up.length < 6) up.push(Object.assign({}, f, { w })); }); }
    let h = '<div class="card"><h4>المباريات القادمة</h4>' + (up.length ? up.map((f) => {
      const opp = f.h === u.club ? f.a : f.h;
      return '<div class="rs"><span class="rs-w x">' + f.w + '</span><span class="rs-m">' + UI.clubTag(opp, 22) + '<small class="mut">' + esc(UI.fixLabel(f)) + '</small></span><span class="venue">' + venueOf(f) + '</span></div>';
    }).join('') : '<div class="mut sm c">لا مباريات قادمة.</div>') + '</div>';
    const log = (S.matchLog || []).slice(0, 6);
    h += '<div class="card"><h4>آخر النتائج</h4>' + (log.length ? log.map((m) => {
      const opp = m.userSide === 'h' ? m.a : m.h, gf = m.userSide === 'h' ? m.score.h : m.score.a, ga = m.userSide === 'h' ? m.score.a : m.score.h, k = gf > ga ? 'w' : gf < ga ? 'l' : 'd';
      return '<div class="rs"><span class="rs-w ' + k + '">' + (k === 'w' ? 'ف' : k === 'l' ? 'خ' : 'ت') + '</span><span class="rs-m">' + UI.clubTag(opp, 22) + '<small class="mut">' + UI.compName(m.comp) + '</small></span><b class="sco">' + gf + ' - ' + ga + '</b>' + (m.rating ? UI.rating(m.rating) : '') + '</div>';
    }).join('') + '<button class="btn sm" style="margin-top:10px;width:100%" data-a="lastMatchView">تفاصيل آخر مباراة</button>' : '<div class="mut sm c">لا مباريات بعد.</div>') + '</div>';
    return h;
  }

  UI.screens.matches = () => {
    const S = G.S;
    if (S.phase === 'summer') return UI.empty('sun', 'الموسم لم يبدأ بعد', 'أمامك فترة إعداد وسوق انتقالات؛ ابدأ الموسم من الرئيسية لتظهر مبارياتك هنا.', '<button class="btn pri" data-a="go" data-v="home">' + UI.ico('home') + ' إلى الرئيسية</button>');
    if (S.phase !== 'season') return UI.empty('trophy2', 'انتهى الموسم', 'تظهر مباريات الموسم القادم هنا بعد الانتقال إليه.', '<button class="btn pri" data-a="go" data-v="home">' + UI.ico('home') + ' إلى الرئيسية</button>') + (UI.intlCard ? UI.intlCard() : '');
    const pend = G.Season.pending(), act = S.active ? G.Season.findFix(S.active.fixId) : null, nx = pend || act || G.Season.nextFixture();
    let h = UI.nextMatchBlock({ info: true });
    const t = UI.curTab('mc', 'pre');
    h += UI.tabs('mc', [['pre', 'المعاينة'], ['xi', 'التشكيلة'], ['sch', 'الجدول والنتائج']], 'pre');
    if (t === 'sch' || !nx) h += schTab();
    else if (t === 'xi') h += xiTab(nx);
    else h += preTab(nx);
    return h;
  };
})(window.G = window.G || {});
