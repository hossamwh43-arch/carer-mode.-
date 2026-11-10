/* ui_home.js — الصفحة الرئيسية: بطاقة اللاعب، المباراة القادمة، حالة الأسبوع/السوق، ملخص نهاية الموسم، الرسائل */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const S_ = () => G.S, me = () => G.S.players[G.S.user];

  // ---------- أدوات مشتركة للمباريات ----------
  UI.fixLabel = (f) => {
    if (f.comp === 'LL') return (G.S && G.S.league ? G.leagueName(G.S.league.lg) : 'الدوري') + ' · الجولة ' + f.r;
    if (f.comp === 'NT') return (G.S.intl ? G.S.intl.name : 'المنتخبات') + ' · ' + (f.stage === 'group' ? 'المجموعة ' + 'ABCDEFGHIJKL'[f.g] + ' · الجولة ' + f.day : G.STAGE_NT_AR[f.stage] || f.stage) + (f.stage === 'final' || f.stage === 'third' ? ' (ملعب محايد)' : '');
    if (f.comp === 'CUP' || f.comp === 'SUP') return G.Cups.label(f).replace(' (ملعب محايد)', '');
    const st = G.Ucl.STAGE_AR[f.stage] || '';
    if (f.stage === 'league') return 'دوري الأبطال · ' + st + ' · الجولة ' + f.r;
    if (f.stage === 'final') return 'دوري الأبطال · النهائي (ملعب محايد)';
    return 'دوري الأبطال · ' + st + (f.leg ? ' · ' + (f.leg === 1 ? 'الذهاب' : 'الإياب') : '');
  };
  UI.compName = (c) => ({ LL: 'الدوري', NT: 'المنتخب', CUP: 'الكأس', SUP: 'السوبر' })[c] || 'دوري الأبطال';
  UI.fixLine = (f, big) => {
    const sc = f.played ? '<b class="sco">' + f.hg + ' - ' + f.ag + '</b>' + (f.pens ? '<div class="sm mut ltr">(' + f.pens.h + '-' + f.pens.a + ' ر.ج)</div>' : '') : '<span class="vstag">ضد</span>';
    return '<div class="score"><div class="tm">' + UI.badge(f.h, big ? 54 : 34) + '<div>' + esc(UI.cname(f.h)) + '</div></div><div class="' + (big ? 'sc' : '') + '" style="min-width:70px;text-align:center">' + sc + '</div><div class="tm">' + UI.badge(f.a, big ? 54 : 34) + '<div>' + esc(UI.cname(f.a)) + '</div></div></div>';
  };

  // أوسمة الزخم: سلسلة التألق وزخم اللحظات وأثر زملاء النجوم (تظهر فقط عند وجودها)
  function growthPills(p) {
    const gi = G.Growth.info(p), pills = [];
    if (gi.hot) pills.push('<span class="pill y">🔥 تألق نشط ×' + G.Growth.HOT_XP + '</span>');
    else if (gi.streak >= 2) pills.push('<span class="pill y">🔥 ' + gi.streak + '/' + gi.need + ' مباريات متألقة</span>');
    if (gi.glow) pills.push('<span class="pill g">🌟 زخم +' + gi.glow + '</span>');
    if (gi.syn >= 0.25) pills.push('<span class="pill b">🤝 زملاء نجوم +' + gi.mentorPct + '٪ خبرة</span>');
    return pills.length ? '<div class="row wrap" style="margin-top:8px;gap:6px">' + pills.join('') + '</div>' : '';
  }
  // ---------- لمحات أفقية (بطاقات صغيرة قابلة للتمرير) ----------
  function glance(u) {
    const S = S_(), c = [], tr = G.Training, lm = S.lastMatch;
    // آخر أداء
    if (lm) {
      const mine = lm.userSide, gf = mine === 'h' ? lm.score.h : lm.score.a, ga = mine === 'h' ? lm.score.a : lm.score.h, opp = mine === 'h' ? lm.a : lm.h;
      const k = gf > ga ? 'g' : gf < ga ? 'r' : 'y', rt = lm.rating || 0;
      c.push('<button class="gl" data-a="lastMatchView"><div class="gl-h"><span>آخر مباراة</span><span class="pill ' + k + '">' + (gf > ga ? 'فوز' : gf < ga ? 'خسارة' : 'تعادل') + '</span></div><div class="gl-b">' +
        (rt ? UI.ring((rt - 4) / 6, rt.toFixed(1), '', 62, rt >= 7 ? '' : rt >= 6.2 ? 'gold' : 'red') : '<div class="ring dim" style="width:62px;height:62px"><b>—</b></div>') +
        '<div class="gl-t"><b class="sco">' + gf + ' - ' + ga + '</b><small class="mut">ضد ' + esc(UI.cname(opp)) + '</small><small>' + (lm.mins ? UI.ico('ball') + ' ' + lm.g + ' · ' + UI.ico('assist') + ' ' + lm.as + (lm.motm ? ' · نجم المباراة' : '') : 'لم تشارك') + '</small></div></div></button>');
    }
    // إحصائيات الموسم
    const st = G.Season.statOf(u, 'lg'), uc = G.Season.statOf(u, 'uc');
    c.push('<button class="gl" data-a="goSub" data-v="profile" data-v2="pf:st"><div class="gl-h"><span>هذا الموسم</span><span class="pill b">' + (st.apps + uc.apps) + ' مباراة</span></div><div class="gl-trip"><div><b>' + (st.g + uc.g) + '</b><small>أهداف</small></div><div><b>' + (st.a + uc.a) + '</b><small>صناعة</small></div><div><b>' + (st.apps ? st.avg.toFixed(1) : '—') + '</b><small>تقييم</small></div></div></button>');
    // التطور
    const need = tr.need(u.lvl), xpf = need ? u.xp / need : 0;
    c.push('<button class="gl" data-a="goSub" data-v="profile" data-v2="pf:ov"><div class="gl-h"><span>التطور</span><span class="pill y">المستوى ' + u.lvl + '</span></div><div class="gl-b">' + UI.ring(xpf, Math.round(xpf * 100) + '%', '', 62, 'gold') +
      '<div class="gl-t"><b>' + u.ovr + ' ← ' + u.pot + '</b><small class="mut">التقييم ← الإمكانات</small><small>' + (u.dp ? '<b class="gold">' + u.dp + ' نقاط تطوير</b>' : 'تقدّم نحو المستوى التالي') + '</small></div></div></button>');
    // الدوري
    const r = S.league && S.league.table ? S.league.table[u.club] : null;   // قد يغيب ناديك عن جدول الدوري الحالي (انتقال في منتصف الموسم)
    if (r && S.phase === 'season') {
      const pos = G.League.position(u.club), fm = UI.lgForm ? UI.lgForm(S.league)[u.club] : null;
      c.push('<button class="gl" data-a="go" data-v="league"><div class="gl-h"><span>' + esc(G.leagueName(S.league.lg)) + '</span><span class="pill g">' + r.pts + ' نقطة</span></div><div class="gl-b"><div class="gl-pos"><b>' + pos + '</b><small>المركز</small></div><div class="gl-t"><small class="mut">' + r.p + ' مباراة · ' + r.w + ' فوز</small>' +
        '<span class="f5">' + (fm && fm.length ? fm.map((t) => '<i class="' + t + '"></i>').join('') : '') + '</span><small>' + (r.gf - r.ga >= 0 ? '+' : '') + (r.gf - r.ga) + ' فارق</small></div></div></button>');
    }
    return '<div class="sec-h"><h3>لمحة سريعة</h3></div><div class="snap">' + c.join('') + '</div>';
  }

  // بلاطتان: التدريب والسوق (تفاصيلهما في النادي/مسيرتي)
  function quick() {
    const S = S_(), u = me(), t = S.training || {}, fo = G.Training.FOCUS.find((x) => x.id === t.focus), it = G.Training.INTENSITY[t.intensity];
    let mk;
    if (S.window && S.window.open) { const n = (S.offers || []).length; mk = UI.tile('market', 'swap', 'السوق مفتوح', S.window.kind === 'winter' ? 'الميركاتو الشتوي' : 'الميركاتو الصيفي', n ? n : ''); }
    else mk = UI.tile('market', 'swap', 'السوق مغلق', UI.windowInfo ? UI.windowInfo().text : '');
    return '<div class="tiles two">' + UI.tile('train', 'dumbbell', 'تدريب الأسبوع', (fo ? fo.ar : '—') + ' · ' + (it ? it.ar : '—'), u.dp ? u.dp : '') + mk + '</div>';
  }

  function miniTable() {
    const S = S_(), u = me();
    if (!S.league) return '';
    const order = G.League.sorted(), mine = u.club, idx = order.indexOf(mine);
    if (idx < 0) return '';
    const lo = U.clamp(idx - 2, 0, order.length - 5), rows = order.slice(lo, lo + 5);
    return '<div class="card"><div class="row sb"><b>🏆 ' + esc(G.leagueName(S.league.lg)) + '</b><button class="btn sm" data-a="go" data-v="league">الجدول كاملًا</button></div><table class="t"><tr><th>#</th><th class="l">النادي</th><th>لعب</th><th>فارق</th><th>نقاط</th></tr>' +
      rows.map((id) => { const r = S.league.table[id], pos = order.indexOf(id) + 1; return '<tr class="' + (id === mine ? 'me ' : '') + UI.lgZone(S.league.lg, pos - 1, order.length) + '"><td>' + pos + '</td><td class="l">' + UI.clubTag(id, 18) + '</td><td>' + r.p + '</td><td class="ltr">' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>'; }).join('') + '</table></div>';
  }

  function uclLine() {
    const S = S_(), u = me();
    if (!S.ucl || S.ucl.teams.indexOf(u.club) < 0) return S.phase === 'season' ? '<div class="card"><div class="sm mut">⭐ ناديك لا يشارك في دوري الأبطال هذا الموسم.</div></div>' : '';
    const ex = S.ucl.exit[u.club], ST = G.Ucl.STAGE_AR;
    let t;
    if (S.ucl.winner === u.club) t = '🏆 بطل أوروبا!';
    else if (S.ucl.phase === 'done') t = 'انتهت مشاركتكم عند: ' + (ex === 'league' ? 'مرحلة الدوري' : ST[ex] || ex);
    else if (S.ucl.phase === 'league') { const o = G.Ucl.sorted(), r = S.ucl.league.table[u.club]; t = 'مرحلة الدوري — المركز ' + (o.indexOf(u.club) + 1) + ' من 36 · ' + r.pts + ' نقطة بعد ' + r.p + ' مباريات'; }
    else t = G.Ucl.userAlive(u.club) ? 'نادٍ في ' + ST[S.ucl.phase] : 'ودّع البطولة في ' + (ex === 'league' ? 'مرحلة الدوري' : ST[ex] || ex);
    return '<div class="card"><div class="row sb"><b>⭐ دوري الأبطال</b><button class="btn sm" data-a="go" data-v="ucl">التفاصيل</button></div><div class="sm" style="margin-top:6px">' + t + '</div></div>';
  }

  function summerPanel() {
    const S = S_(), u = me();
    let h = '<div class="card"><h3>☀️ الصيف — موسم ' + G.Season.label(S.season) + '</h3>';
    if (S.userExpired) {
      h += '<div class="notice bad">⚠️ انتهى عقدك — لا يمكنك بدء الموسم قبل التجديد أو التوقيع مع نادٍ.</div><button class="btn gold" data-a="go" data-v="market">📝 اذهب إلى العقود</button>';
    } else {
      h += '<p class="sm mut">أمامك فترة إعداد وسوق انتقالات مفتوح. عقدك: ' + u.ct.y + ' سنة · ' + UI.money(u.ct.w) + ' أسبوعيًا.</p>';
      if (S.preLeft > 0) h += '<button class="btn" data-a="preseason">🏃 حصة إعداد (' + S.preLeft + ' متبقية)</button>';
      h += '<button class="btn pri" data-a="startSeason">▶ ابدأ الموسم</button>';
      if (G.Season.canRetire()) h += '<button class="btn red" data-a="retireAsk">🏁 اعتزال</button>';
    }
    return h + '</div>' + (S.window && S.window.open ? '<div class="card"><div class="row sb"><b>🔁 سوق الانتقالات</b><button class="btn sm" data-a="go" data-v="market">' + ((S.offers || []).length ? S.offers.length + ' عروض' : 'افتح') + '</button></div></div>' : '');
  }

  // مصير النادي حسب مركزه في الجدول (هبوط/صعود/أبطال)
  function fate(r, sm) {
    const def = G.LEAGUES[r.lgId];
    if (!def || !r.pos || !sm.table) return '';
    const n = sm.table.length;
    let t = 'بقاء في الدوري';
    if (def.tier === 1) { if (r.pos > n - def.down) t = '<span class="neg">⬇ هبوط إلى ' + esc(G.leagueName(def.other)) + '</span>'; else if (r.pos <= (G.UCL_SLOTS[r.lgId] || 0)) t = '<span class="pos">⭐ تأهل لدوري الأبطال</span>'; }
    else if (r.pos <= def.up) t = '<span class="pos">⬆ صعود إلى ' + esc(G.leagueName(def.other)) + '</span>';
    return '<div class="kv"><span>مصير ناديك</span><span>' + t + '</span></div>';
  }

  function endPanel() {
    const S = S_(), sm = S.summary;
    if (!sm) return (UI.intlCard ? UI.intlCard() : '') + '<div class="card"><button class="btn pri" data-a="rollover">الانتقال للموسم التالي</button></div>';
    const r = sm.row, cl = (id) => esc(UI.cname(id));
    let h = (UI.intlCard ? UI.intlCard() : '') + (UI.bdCard ? UI.bdCard() : '') + '<div class="card hl"><h2>🏁 انتهى موسم ' + r.label + '</h2><div class="kv"><span>بطل الدوري</span><b>' + cl(sm.champion) + '</b></div>' +
      (sm.uclWinner ? '<div class="kv"><span>بطل أوروبا</span><b>' + cl(sm.uclWinner) + '</b></div>' : '') +
      '<div class="kv"><span>مركز ناديك</span><span>' + (r.pos || '—') + '</span></div>' + fate(r, sm) +
      '<div class="kv"><span>الدوري</span><span>' + r.lg.apps + ' مباراة · ' + r.lg.g + ' هدف · ' + r.lg.a + ' صناعة · متوسط ' + (r.lg.apps ? r.lg.avg.toFixed(2) : '—') + '</span></div>' +
      (r.uc.apps ? '<div class="kv"><span>دوري الأبطال</span><span>' + r.uc.apps + ' · ' + r.uc.g + ' هدف · ' + r.uc.a + ' صناعة · متوسط ' + r.uc.avg.toFixed(2) + '</span></div>' : '') +
      '<div class="kv"><span>تقييمك</span><span>' + r.ovrStart + ' ← ' + r.ovrEnd + '</span></div></div>';
    const mine = (sm.awards || []).filter((a) => a.user);
    if (G.Season.trophyTotal(r.trophies) || mine.length) {
      h += '<div class="card"><h3>🏆 إنجازاتك</h3>' + G.Season.TROPHY_DEFS.filter((d) => r.trophies[d[0]] && d[0] !== 'bd').map((d) => '<div>' + d[1] + ' ' + (d[0] === 'liga' || d[0] === 'd2' ? 'بطل ' + esc(G.leagueName(r.lgId)) : d[0] === 'ucl' ? 'بطل دوري أبطال أوروبا' : d[2]) + '</div>').join('') + mine.map((a) => '<div>🎖️ ' + G.Season.AWARD_AR[a.type] + '</div>').join('') + '</div>';
    }
    h += '<div class="card"><h3>🎖️ جوائز الموسم</h3>' + (sm.awards || []).map((a) => '<div class="kv"><span>' + G.Season.AWARD_AR[a.type] + '</span><span' + (a.user ? ' class="gold b"' : '') + '>' + esc(a.name) + ' <span class="mut sm">(' + cl(a.club) + ' · ' + a.value + ')</span></span></div>').join('') + '</div>';
    if (S.intl && !S.intl.done) h += '<div class="notice">🌍 أكمل ' + esc(S.intl.name) + ' (العب مباريات منتخبك أو حاكِها) قبل الانتقال للموسم التالي.</div>';
    else h += '<button class="btn pri" data-a="rollover">⏭️ الانتقال للموسم التالي</button>';
    if (G.Season.canRetire()) h += '<button class="btn red" data-a="retireAsk">🏁 اعتزال</button>';
    return h;
  }

  // غلاف الرئيسية: اللاعب والنادي والمنتخب والموسم ومركز الدوري
  function heroHome(u) {
    const S = S_(), pos = S.league && S.phase !== 'summer' ? G.League.position(u.club) : 0;
    const ph = S.phase === 'season' ? UI.week() : S.phase === 'summer' ? 'الصيف' : S.phase === 'end' ? 'نهاية الموسم' : '';
    return UI.cinePlayer(u, { extra: UI.mediaMini ? UI.mediaMini() : '', act: '<button class="hbtn" data-a="cardOpen">' + UI.ico('pcard') + ' بطاقتي</button>', chips: [G.Season.label(S.season) + (ph ? ' · ' + ph : ''), pos ? 'المركز ' + pos + ' · ' + esc(G.leagueName(S.league.lg)) : ''] });
  }

  UI.screens.home = () => {
    const S = S_(), u = me();
    if (UI.autoTour) UI.autoTour();
    const press = UI.pressCard ? UI.pressCard() : '';
    let h = '';
    if (UI.noStorage) h += '<div class="notice bad">⚠️ التخزين المحلي غير متاح في هذا المتصفح (ربما وضع التصفح الخاص): لن يُحفظ تقدّمك بعد الإغلاق. استخدم «تصدير الحفظ» من الإعدادات.</div>';
    h += heroHome(u);
    // الأهم أولًا: المباراة القادمة/الصيف، ثم المؤتمر الصحفي، ثم اللمحات والبلاطات
    const dks = UI.decisionStrip ? UI.decisionStrip() : '';
    if (S.phase === 'summer') h += summerPanel() + press + dks + (UI.simCard ? UI.simCard() : '') + quick();
    else if (S.phase === 'season') h += UI.nextMatchBlock({ compact: true }) + press + dks + glance(u) + quick() + (UI.simCard ? UI.simCard() : '');
    else if (S.phase === 'end') h += press + dks + endPanel();
    else h += press + dks;
    h += UI.newsDock ? UI.newsDock() : '';
    if (S.check && !S.check.ok) h += '<div class="notice bad">⚠️ تم رصد خلل في الجدول وإصلاحه تلقائيًا.</div>';
    return h;
  };
  UI.miniTable = miniTable; UI.uclLine = uclLine; UI.growthPills = growthPills;

  // ---------- الإجراءات ----------
  UI.on('stripToggle', () => { UI.homeOpen = !UI.homeOpen; });

  UI.on('preseason', () => {
    const r = G.Season.preseason();
    if (!r) { UI.toast('لا حصص إعداد متبقية'); return; }
    UI.toast('انتهت الحصة: +' + r.xp + ' XP' + (r.ups ? ' · مستوى جديد!' : '') + (r.attrUps.length ? ' · تحسّن: ' + r.attrUps.map((k) => G.Players.ATTR_AR[k]).join('، ') : ''));
    UI.levelFx(r);
  });

  UI.on('startSeason', () => {
    const r = G.Season.startSeason();
    if (!r.ok) { UI.toast(r.msg); return; }
    UI.cur = 'home'; UI.toast('انطلق الموسم ' + G.Season.label(G.S.season) + ' — بالتوفيق!');
  });

  UI.on('advanceWeek', () => {
    const w = G.S.week, r = G.Season.advanceWeek();
    if (!r.ok) { UI.toast(r.msg); return; }
    if (G.S.phase === 'end') { UI.toast('انتهى الموسم!'); UI.seasonFx(); return; }
    const t = r.training;
    UI.toast('انتهى الأسبوع ' + w + ' · +' + t.xp + ' XP' + (t.attrUps.length ? ' · تحسّن: ' + t.attrUps.map((k) => G.Players.ATTR_AR[k]).join('، ') : ''));
    UI.levelFx(t);
  });

  UI.on('rollover', () => {
    const r = G.Season.rollover();
    if (!r.ok) { UI.toast(r.msg); return; }
    const g = r.growth;
    UI.cur = 'home'; UI.sub = {}; UI.snd('done');
    UI.sheet('<h3>🌱 موسم جديد</h3><div class="kv"><span>تقييمك</span><b>' + g.from + ' ← ' + g.to + '</b></div>' + (g.note ? '<p class="sm mut">' + esc(g.note) + '</p>' : '') +
      '<div class="kv"><span>عمرك الآن</span><span>' + me().age + '</span></div>' + (r.expired ? '<div class="notice bad">انتهى عقدك — راجع صفحة الانتقالات لتجديد عقدك أو اختيار نادٍ جديد.</div>' : '') +
      '<button class="btn pri" data-a="closeSheet">متابعة</button>');
  });

  UI.on('retireAsk', () => {
    UI.confirm('اعتزال اللاعب؟', 'ستنتهي مسيرتك نهائيًا وتُحفظ إحصاءاتك في صفحة المسيرة. لا يمكن التراجع.', () => {
      const r = G.Season.retire();
      UI.toast(r.ok ? 'اعتزلتَ كرة القدم 🏁' : r.msg);
      UI.render();
    }, 'اعتزال');
    return false;
  });
})(window.G = window.G || {});
