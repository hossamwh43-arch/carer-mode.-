/* ui_intl.js — صفحة المنتخبات: كأس العالم وكأس آسيا (المجموعات، الإقصاء، الهدّافون، التاريخ) وبطاقة نهاية الموسم.
 * لا تستخدم U.rnd أبدًا (واجهة فقط) — كل الأرقام تأتي من الحالة المحفوظة. */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const N = (c) => G.NATIONS[c];
  const GL = 'ABCDEFGHIJKL';
  const codeOf = (id) => String(id).slice(3);

  // شارة المنتخب (ألوان القميص + الرمز) — لا تحتاج وجود نادٍ مجسّم
  UI.natBadge = (code, size) => (N(code) ? UI.badgeOf(N(code).c, code, size || 22) : '');
  UI.natTag = (code, size, cls) => '<span class="club ' + (cls || '') + '">' + UI.natBadge(code, size || 22) + '<span>' + esc(G.Intl.name(code)) + '</span></span>';

  UI.titles.intl = () => (G.S && G.S.intl ? G.S.intl.name : 'المنتخبات');

  // هل المنتخب ما زال في البطولة؟
  function alive(I, code) {
    if (I.done) return I.res[code] === 'winner';
    if (!I.ko) return true;
    return I.fx.some((f) => !f.played && (f.h === G.Intl.NTID(code) || f.a === G.Intl.NTID(code)));
  }
  function stageNow(I) {
    if (I.done) return 'انتهت البطولة';
    if (!I.ko) return 'دور المجموعات · الجولة ' + Math.min(3, I.day) + ' من 3';
    return G.STAGE_NT_AR[I.stage] || I.stage;
  }
  const resAr = (r) => G.Intl.stageAr(r);
  const pill = (t, c) => '<span class="pill ' + (c || '') + '">' + t + '</span>';

  // ---------- مباراة (سطر نتيجة) ----------
  function resLine(f) {
    const h = codeOf(f.h), a = codeOf(f.a), uid = G.Intl.userTeam();
    const mine = uid && (f.h === uid || f.a === uid);
    const sc = f.played ? '<b class="sco">' + f.hg + ' - ' + f.ag + '</b>' + (f.pens ? '<div class="sm mut">(' + f.pens.h + ' - ' + f.pens.a + ' ر.ج)</div>' : '') : '<span class="mut">ضد</span>';
    return '<div style="padding:8px 0;border-bottom:1px solid rgba(36,50,79,.5)' + (mine ? ';background:rgba(var(--cc-rgb)/.08)' : '') + '"><div class="sm mut">' + (f.stage === 'group' ? 'المجموعة ' + GL[f.g] + ' · الجولة ' + f.day : G.STAGE_NT_AR[f.stage]) + '</div>' +
      '<div class="row sb"><span>' + UI.natTag(h, 20) + '</span><span style="text-align:center;min-width:64px">' + sc + '</span><span>' + UI.natTag(a, 20) + '</span></div></div>';
  }

  // ---------- مباراتك (أزرار اللعب) ----------
  function actionCard() {
    const S = G.S, I = S.intl, pf = G.Intl.pending(), u = me();
    if (I.done) {
      let h = '<div class="card hl"><h3>🏆 انتهت ' + esc(I.name) + '</h3><div class="kv"><span>البطل</span><b>' + UI.natTag(I.winner, 22) + '</b></div><div class="kv"><span>الوصيف</span><span>' + UI.natTag(I.runner, 20) + '</span></div>' +
        (I.third ? '<div class="kv"><span>المركز الثالث</span><span>' + UI.natTag(I.third, 20) + '</span></div>' : '') +
        (I.boot ? '<div class="kv"><span>هدّاف البطولة</span><span>' + esc(I.boot.n) + ' <span class="mut sm">(' + esc(G.Intl.name(I.boot.nat)) + ' · ' + I.boot.g + ' ⚽)</span></span></div>' : '') +
        (I.mvp ? '<div class="kv"><span>أفضل لاعب</span><span' + (I.mvp.user ? ' class="gold b"' : '') + '>' + esc(I.mvp.n) + ' <span class="mut sm">(' + esc(G.Intl.name(I.mvp.nat)) + ')</span></span></div>' : '') + '</div>';
      if (S.phase === 'end') h += '<button class="btn pri" data-a="rollover">⏭️ الانتقال للموسم التالي</button>';
      return h;
    }
    if (S.active && S.active.fixId && S.active.fixId.indexOf('NT') === 0) {
      const f = G.Season.findFix(S.active.fixId);
      return '<div class="card mom-card"><h3>⏱️ مباراة جارية مع المنتخب</h3>' + (f ? UI.fixLine(f, true) : '') + '<button class="btn pri" data-a="resumeMatch">▶ متابعة المباراة</button></div>';
    }
    if (pf) {
      const act = u.role === 'starter' || u.role === 'rotation' || u.role === 'bench';
      return '<div class="card nm"><div class="row sb"><h3>مباراة منتخبك</h3>' + pill(stageNow(I), 'b') + '</div><div class="sm mut">' + esc(UI.fixLabel(pf)) + '</div>' + UI.fixLine(pf, true) +
        '<div class="notice" style="margin-top:8px">🗒️ ' + esc(u.roleInfo ? u.roleInfo.text : 'منتخب ' + G.Intl.name(u.nat)) + '</div>' +
        '<button class="btn pri" data-a="playMatch" data-v="' + pf.id + '" data-v2="i">' + (act ? '🎮 العب المباراة (تفاعلي)' : '👁️ شاهد المباراة') + '</button>' +
        '<button class="btn" data-a="playMatch" data-v="' + pf.id + '" data-v2="s">⚡ محاكاة المباراة (نتيجة فورية)</button>' +
        '<button class="btn" data-a="intlAll">⏩ محاكاة بقية البطولة كاملة</button></div>';
    }
    return '<div class="card"><h3>' + esc(stageNow(I)) + '</h3><p class="sm mut">' + (I.user.qualified && I.user.called && !G.Intl.userAvail() ? 'أنت غير جاهز للمشاركة (إصابة/إيقاف) — ستُحاكى مباريات منتخبك بدونك.' : I.user.qualified ? 'لا مباراة لمنتخبك الآن.' : 'منتخبك خارج البطولة — يمكنك المتابعة أو محاكاتها.') + '</p>' +
      '<button class="btn pri" data-a="intlRun">⏭ تقدّم (يوم ← مباراة منتخبك التالية)</button><button class="btn" data-a="intlAll">⏩ محاكاة البطولة كاملة</button></div>';
  }

  // ---------- حالة منتخبك ----------
  function myTeamCard() {
    const I = G.S.intl, u = me(), nat = I.user.nat, T = G.TOURS[I.type];
    let t;
    if (!I.user.qualified) t = (T.conf && N(nat) && N(nat).conf !== T.conf) ? 'بطولة قارية لا تخص منتخبك (' + esc(G.Intl.name(nat)) + ' في ' + esc(N(nat).conf) + ').' : 'لم يتأهل منتخبك (' + esc(G.Intl.name(nat)) + ') إلى هذه البطولة.';
    else if (!I.user.called) t = 'تأهل ' + esc(G.Intl.name(nat)) + ' لكن المدرب لم يستدعِك — طوّر مستواك لتنافس على مكان.';
    else {
      const r = G.Intl.finalRes(I, nat), al = alive(I, nat);
      t = 'مع ' + esc(G.Intl.name(nat)) + ' — ' + (al ? (I.done ? (r === 'third' ? 'المركز الثالث' : 'بطل!') : 'ما زال في البطولة (' + esc(stageNow(I)) + ')') : 'ودّعتم عند: ' + esc(resAr(r))) + ' · دورك: ' + (G.Coach.ROLE_AR[I.user.role] || '');
    }
    const st = u.st.nt || [0, 0, 0, 0, 0];
    return '<div class="card"><div class="row"><span>' + UI.natBadge(nat, 36) + '</span><div class="grow"><b>منتخبك</b><div class="sm mut">' + t + '</div></div></div>' +
      (st[0] ? '<div class="row wrap sm" style="margin-top:8px"><span>مشاركات: ' + (st[0] - (I.user.apps0 || 0)) + '</span><span>⚽ ' + st[1] + '</span><span>🅰️ ' + st[2] + '</span><span>تقييم: ' + (st[0] ? UI.rating(st[3] / st[0]) : '—') + '</span></div>' : '') + '</div>';
  }

  // ---------- المجموعات ----------
  function groupsView() {
    const I = G.S.intl, uc = I.user.nat, T = G.TOURS[I.type];
    const legend = '<p class="sm mut" style="margin:0 0 10px"><span class="pos">▌</span> الأول والثاني يتأهلان · <span class="gold">▌</span> الثالث قد يتأهل (أفضل ' + T.thirds + ' من أصحاب المركز الثالث)</p>';
    return legend + I.groups.map((g, gi) => {
      const ord = G.Intl.groupOrder(gi);
      return '<div class="card"><div class="row sb"><b>المجموعة ' + GL[gi] + '</b><span class="sm mut">' + (g.indexOf(uc) >= 0 ? '⭐ مجموعة منتخبك' : '') + '</span></div><table class="t"><tr><th>#</th><th class="l">المنتخب</th><th>لعب</th><th>فارق</th><th>نقاط</th></tr>' +
        ord.map((c, i) => { const r = I.table[c]; return '<tr class="' + (c === uc ? 'me ' : '') + (i < 2 ? 'z1' : i === 2 ? 'z2' : '') + '"><td>' + (i + 1) + '</td><td class="l">' + UI.natTag(c, 18) + '</td><td>' + r.p + '</td><td class="ltr">' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>'; }).join('') + '</table></div>';
    }).join('');
  }

  // ---------- الإقصاء ----------
  function koView() {
    const I = G.S.intl, T = G.TOURS[I.type];
    let h = '';
    T.ko.forEach((st) => {
      const fx = I.fx.filter((f) => f.stage === st || (st === 'final' && f.stage === 'third'));
      if (!fx.length) { h += '<div class="card"><h3>' + G.STAGE_NT_AR[st] + '</h3><p class="sm mut">لم تتحدد المباريات بعد.</p></div>'; return; }
      h += '<div class="card"><h3>' + G.STAGE_NT_AR[st] + '</h3>' + fx.map(resLine).join('') + '</div>';
    });
    return h;
  }

  // ---------- الهدّافون ----------
  function scorersView() {
    const I = G.S.intl, uid = G.S.user;
    const all = Object.keys(I.pl).map((k) => I.pl[k]);
    if (!all.length) return '<div class="card mut c">لا أهداف بعد — ستظهر الأرقام مع تقدّم المباريات.</div>';
    const tbl = (list, kind) => '<div class="card"><h3>' + (kind === 'g' ? '⚽ الهدّافون' : '🅰️ الصنّاع') + '</h3><table class="t"><tr><th>#</th><th class="l">اللاعب</th><th>' + (kind === 'g' ? 'أهداف' : 'صناعة') + '</th><th>' + (kind === 'g' ? 'صناعة' : 'أهداف') + '</th></tr>' +
      list.map((o, i) => '<tr class="' + (o.pid === uid ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="l"><div>' + esc(o.n) + '</div><div class="sm mut">' + UI.natTag(o.nat, 16) + '</div></td><td><b>' + (kind === 'g' ? o.g : o.a) + '</b></td><td>' + (kind === 'g' ? o.a : o.g) + '</td></tr>').join('') + '</table></div>';
    const gs = all.slice().sort((a, b) => (b.g - a.g) || (b.a - a.a)).slice(0, 12).filter((o) => o.g > 0);
    const as = all.slice().sort((a, b) => (b.a - a.a) || (b.g - a.g)).slice(0, 8).filter((o) => o.a > 0);
    return (gs.length ? tbl(gs, 'g') : '') + (as.length ? tbl(as, 'a') : '');
  }

  // ---------- القادمة + التاريخ ----------
  function nextTour() {
    const S = G.S, I = S.intl;
    const start = I && I.done ? S.season + 1 : S.phase === 'end' && !I ? S.season + 1 : S.season;
    for (let k = 0; k < 8; k++) { const t = G.Intl.dueType(start + k); if (t) return { type: t, ahead: start + k - S.season, year: G.Intl.endYear(start + k) }; }
    return null;
  }
  function upcomingCard() {
    const S = G.S, I = S.intl;
    if (I && !I.done) return '';
    const nt = nextTour(), u = me(), nat = u.nat;
    if (!nt) return '';
    const T = G.TOURS[nt.type], rank = G.NATION_ORDER.slice().sort((a, b) => G.Intl.lvlBase(b) - G.Intl.lvlBase(a)).indexOf(nat) + 1;
    const cont = T.conf && N(nat) && N(nat).conf !== T.conf;
    const r = G.Intl.userRole();
    return '<div class="card"><h3>📅 البطولة القادمة</h3><div class="kv"><span>' + esc(T.ar) + ' ' + nt.year + '</span><b>' + (nt.ahead === 0 ? 'نهاية هذا الموسم' : nt.ahead === 1 ? 'بعد موسم' : 'بعد ' + nt.ahead + ' مواسم') + '</b></div>' +
      '<div class="kv"><span>منتخبك</span><span>' + UI.natTag(nat, 20) + '</span></div>' +
      (cont ? '<p class="sm mut">بطولة آسيوية — منتخبك ليس من آسيا فلن يشارك فيها.</p>' :
        '<div class="kv"><span>ترتيب منتخبك بين ' + G.NATION_ORDER.length + ' منتخبًا</span><b>' + rank + '</b></div><div class="kv"><span>دورك لو أُقيمت اليوم</span><span>' + UI.rolePill(r.role === 'out' ? 'out' : r.role) + '</span></div><p class="sm mut">التأهل يعتمد على قوة المنتخب، ويرفعك أداؤك وتقييمك فرص الاستدعاء. المنتخبات الكبرى أصعب في حجز مكان فيها.</p>') + '</div>';
  }
  function histView() {
    const S = G.S, u = me(), hist = (S.intlHist || []).slice().reverse();
    let h = upcomingCard();
    const car = u.ntCar || [];
    if (car.length) {
      const tot = car.reduce((s, e) => ({ a: s.a + e.apps, g: s.g + e.g, s: s.s + e.a }), { a: 0, g: 0, s: 0 });
      h += '<div class="card"><h3>🌍 مسيرتك الدولية (' + esc(G.Intl.name(u.nat)) + ')</h3><div class="grid3"><div class="stat"><b>' + tot.a + '</b><small>مباراة</small></div><div class="stat"><b>' + tot.g + '</b><small>هدف</small></div><div class="stat"><b>' + tot.s + '</b><small>صناعة</small></div></div>' +
        '<table class="t" style="margin-top:10px"><tr><th class="l">البطولة</th><th>النتيجة</th><th>م</th><th>هـ</th><th>ص</th></tr>' +
        car.slice().reverse().map((e) => '<tr><td class="l sm">' + esc(G.TOURS[e.t].short) + ' ' + e.y + '</td><td class="sm">' + (e.title ? '<b class="gold">البطل 🏆</b>' : e.q ? esc(resAr(e.res)) : 'لم يتأهل') + '</td><td>' + e.apps + '</td><td>' + e.g + '</td><td>' + e.a + '</td></tr>').join('') + '</table></div>';
    }
    if (!hist.length) return h + '<div class="card mut c">لم تُقَم أي بطولة بعد. أول بطولة: ' + (nextTour() ? esc(G.TOURS[nextTour().type].ar) + ' ' + nextTour().year : '—') + '.</div>';
    h += hist.map((x) => '<div class="card"><div class="row sb"><b>' + esc(x.name) + '</b>' + (x.user && x.user.title ? pill('بطل مع منتخبك 🏆', 'y') : '') + '</div>' +
      '<div class="kv"><span>🏆 البطل</span><b>' + UI.natTag(x.winner, 20) + '</b></div><div class="kv"><span>🥈 الوصيف</span><span>' + UI.natTag(x.runner, 18) + '</span></div>' +
      (x.third ? '<div class="kv"><span>المركز الثالث</span><span>' + UI.natTag(x.third, 18) + '</span></div>' : '') +
      (x.boot ? '<div class="kv"><span>هدّاف البطولة</span><span>' + esc(x.boot.n) + ' <span class="mut sm">(' + esc(G.Intl.name(x.boot.nat)) + ' · ' + x.boot.g + ')</span></span></div>' : '') +
      (x.mvp ? '<div class="kv"><span>أفضل لاعب</span><span' + (x.mvp.user ? ' class="gold b"' : '') + '>' + esc(x.mvp.n) + '</span></div>' : '') +
      (x.user && x.user.q ? '<div class="kv"><span>منتخبك</span><span>' + (x.user.title ? 'بطل' : esc(resAr(x.user.res))) + ' · ' + x.user.apps + ' مباراة · ' + x.user.g + ' هدف</span></div>' : '<div class="sm mut">منتخبك لم يشارك.</div>') + '</div>').join('');
    return h;
  }

  // ---------- الشاشة ----------
  UI.screens.intl = () => {
    const S = G.S, I = S.intl;
    if (!I) return '<div class="card hl"><h2>🌍 المنتخبات</h2><p class="sm mut">كأس العالم كل 4 سنوات (48 منتخبًا) وكأس آسيا في السنة التي تليها. تُقام في صيف نهاية الموسم، وإن كان منتخبك مؤهلًا واستدعاك المدرب فستلعب مبارياته بنفسك.</p></div>' + histView();
    const T = UI.tabs('intl', [['now', 'البطولة'], ['grp', 'المجموعات'], ['ko', 'الإقصاء'], ['sc', 'الهدّافون'], ['hist', 'التاريخ']], 'now'), tab = UI.curTab('intl', 'now');
    let h = '<div class="card hl"><div class="row sb"><h2 style="margin:0">🌍 ' + esc(I.name) + '</h2>' + pill(stageNow(I), I.done ? 'g' : 'b') + '</div>' +
      '<div class="sm mut" style="margin-top:6px">' + I.teams.length + ' منتخبًا · ' + (I.hosts.length ? 'استضافة: ' + I.hosts.map((c) => esc(G.Intl.name(c))).join('، ') : '') + '</div></div>' + T;
    if (tab === 'now') {
      h += actionCard() + myTeamCard();
      const days = I.fx.filter((f) => f.played);
      const last = days.length ? Math.max.apply(null, days.map((f) => f.day)) : 0;
      if (last) h += '<div class="card"><h3>آخر النتائج</h3>' + days.filter((f) => f.day === last).map(resLine).join('') + '</div>';
    } else if (tab === 'grp') h += groupsView();
    else if (tab === 'ko') h += I.ko ? koView() : '<div class="card mut c">يبدأ الإقصاء بعد انتهاء دور المجموعات.</div>';
    else if (tab === 'sc') h += scorersView();
    else h += histView();
    return h;
  };

  // ---------- بطاقة الصفحة الرئيسية في نهاية الموسم ----------
  UI.intlCard = () => {
    const S = G.S, I = S.intl;
    if (!I) return '';
    const u = me();
    if (I.done) return '<div class="card"><div class="row sb"><b>🌍 ' + esc(I.name) + '</b><button class="btn sm" data-a="go" data-v="intl">التفاصيل</button></div><div class="sm" style="margin-top:6px">البطل: ' + UI.natTag(I.winner, 18) + (I.user.qualified ? ' · منتخبك: ' + (I.res[I.user.nat] === 'winner' ? '<b class="gold">بطل!</b>' : esc(resAr(G.Intl.finalRes(I, I.user.nat)))) : '') + '</div></div>';
    const pf = G.Intl.pending();
    let h = '<div class="card hl"><div class="row sb"><h3 style="margin:0">🌍 ' + esc(I.name) + '</h3>' + pill(stageNow(I), 'b') + '</div>';
    h += '<p class="sm mut" style="margin:8px 0">' + (I.user.qualified ? (I.user.called ? 'منتخبك (' + esc(G.Intl.name(I.user.nat)) + ') مؤهل — ' + (pf ? 'مباراتك القادمة جاهزة.' : 'تابع البطولة.') : 'منتخبك مؤهل لكنك لم تُستدعَ.') : 'منتخبك (' + esc(G.Intl.name(I.user.nat)) + ') غير مشارك. يمكنك المتابعة أو المحاكاة.') + '</p>';
    if (S.active && S.active.fixId && S.active.fixId.indexOf('NT') === 0) h += '<button class="btn pri" data-a="resumeMatch">▶ متابعة المباراة</button>';
    else if (pf) h += '<button class="btn pri" data-a="playMatch" data-v="' + pf.id + '" data-v2="i">🎮 العب مباراة المنتخب</button><button class="btn" data-a="playMatch" data-v="' + pf.id + '" data-v2="s">⚡ محاكاة المباراة</button>';
    else h += '<button class="btn pri" data-a="intlRun">⏭ تقدّم في البطولة</button>';
    h += '<div class="grid2"><button class="btn" data-a="go" data-v="intl">📋 صفحة البطولة</button><button class="btn" data-a="intlAll">⏩ محاكاة كاملة</button></div></div>';
    return h;
  };

  // ---------- الإجراءات ----------
  UI.on('intlRun', () => {
    const I = G.S.intl;
    if (!I || I.done) return;
    G.Intl.run(); G.Save.save();
    if (I.done) { UI.toast('انتهت ' + I.name + ' 🏆'); UI.snd && UI.snd('done'); }
    else if (G.Intl.pending()) UI.toast('مباراة منتخبك جاهزة');
  });
  UI.on('intlAll', () => {
    UI.confirm('محاكاة البطولة كاملة؟', 'ستُحاكى كل المباريات المتبقية' + (G.Intl.pending() ? ' بما فيها مباريات منتخبك (يُحسب أداؤك فيها)' : '') + ' ولن تتمكن من لعبها يدويًا.', () => {
      G.Intl.autoFinish(); G.Save.save();
      UI.toast('انتهت ' + G.S.intl.name);
      UI.render();
    }, 'محاكاة');
    return false;
  });
})(window.G = window.G || {});
