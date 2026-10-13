/* ui_home.js — الصفحة الرئيسية: بطاقة اللاعب، المباراة القادمة، حالة الأسبوع/السوق، ملخص نهاية الموسم، الرسائل */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const S_ = () => G.S, me = () => G.S.players[G.S.user];

  // ---------- أدوات مشتركة للمباريات ----------
  UI.fixLabel = (f) => {
    if (f.comp === 'LL') return 'الدوري الإسباني · الجولة ' + f.r;
    const st = G.Ucl.STAGE_AR[f.stage] || '';
    if (f.stage === 'league') return 'دوري الأبطال · ' + st + ' · الجولة ' + f.r;
    if (f.stage === 'final') return 'دوري الأبطال · النهائي (ملعب محايد)';
    return 'دوري الأبطال · ' + st + (f.leg ? ' · ' + (f.leg === 1 ? 'الذهاب' : 'الإياب') : '');
  };
  UI.fixLine = (f, big) => {
    const sc = f.played ? '<b class="sco">' + f.hg + ' - ' + f.ag + '</b>' + (f.pens ? '<div class="sm mut ltr">(' + f.pens.h + '-' + f.pens.a + ' ر.ج)</div>' : '') : '<span class="mut">ضد</span>';
    return '<div class="score"><div class="tm">' + UI.badge(f.h, big ? 44 : 32) + '<div>' + esc(UI.cname(f.h)) + '</div></div><div class="' + (big ? 'sc' : '') + '" style="min-width:70px;text-align:center">' + sc + '</div><div class="tm">' + UI.badge(f.a, big ? 44 : 32) + '<div>' + esc(UI.cname(f.a)) + '</div></div></div>';
  };

  function playerCard(p) {
    const S = S_(), club = S.clubs[p.club];
    const ft = Math.round(p.fit);
    let h = '<div class="card hl"><div class="row">' + UI.avatar(p.look, p.club, 78) +
      '<div class="grow"><h3 style="margin:0">' + esc(p.n) + '</h3><div>' + UI.clubTag(p.club, 20) + '</div>' +
      '<div class="sm mut">' + G.POS_AR[p.pos] + ' · ' + p.age + ' سنة · رقم ' + p.num + ' · ' + UI.natName(p.nat) + '</div>' +
      (p.parentPays ? '<div class="sm gold">معار من ' + esc(UI.cname(p.parent)) + '</div>' : '') + '</div>' +
      '<div class="ovr">' + p.ovr + '</div></div>' +
      '<div class="grid3" style="margin-top:10px"><div class="stat"><b>' + UI.stars(p.pot) + '</b><small>الإمكانات</small></div>' +
      '<div class="stat"><b>' + UI.rolePill(p.role) + '</b><small>دورك الحالي</small></div>' +
      '<div class="stat"><b>' + Math.round(p.trust) + '</b><small>' + G.Coach.trustLabel(p.trust) + '</small></div></div>';
    if (p.roleInfo && p.roleInfo.text) h += '<p class="sm mut" style="margin:8px 0 2px">🗒️ ' + esc(p.roleInfo.text) + '</p>';
    h += '<div class="row sb sm" style="margin-top:8px"><span>اللياقة</span><span>' + ft + '%</span></div>' + UI.bar(ft, ft < 50 ? 'red' : ft < 75 ? 'gold' : '');
    if (p.inj > 0) h += '<div class="notice bad" style="margin-top:8px">🩹 مصاب — يغيب ' + p.inj + ' أسبوع/أسابيع</div>';
    if (p.susp > 0) h += '<div class="notice bad" style="margin-top:8px">🟥 موقوف عن المباراة القادمة</div>';
    h += '<div style="margin-top:10px"><div class="sm mut" style="margin-bottom:4px">آخر التقييمات</div>' + UI.formDots(p.form) + '</div></div>';
    return h;
  }

  function nextMatchCard() {
    const S = S_(), u = me(), pend = G.Season.pending();
    let h = '';
    if (S.active) {
      const f = G.Season.findFix(S.active.fixId);
      h += '<div class="card mom-card"><h3>⏱️ مباراة جارية</h3>' + (f ? UI.fixLine(f, true) : '') + '<button class="btn pri" data-a="resumeMatch">▶ متابعة المباراة</button></div>';
      return h;
    }
    if (pend) {
      const act = u.role === 'starter' || u.role === 'rotation' || u.role === 'bench';
      h += '<div class="card"><div class="row sb"><h3>المباراة القادمة</h3><span class="pill b">' + UI.week() + '</span></div><div class="sm mut" style="margin-bottom:8px">' + UI.fixLabel(pend) + '</div>' + UI.fixLine(pend, true);
      if (u.role === 'injured' || u.role === 'suspended') h += '<div class="notice bad" style="margin-top:8px">' + (u.role === 'injured' ? 'أنت مصاب ولن تشارك' : 'أنت موقوف ولن تشارك') + ' — يمكنك مشاهدة المباراة أو محاكاتها.</div>';
      else if (u.role === 'out') h += '<div class="notice" style="margin-top:8px">لست ضمن قائمة المباراة حسب قرار المدرب.</div>';
      h += '<button class="btn pri" data-a="playMatch" data-v="' + pend.id + '" data-v2="i">' + (act ? '🎮 العب المباراة (تفاعلي)' : '👁️ شاهد المباراة') + '</button>' +
        '<button class="btn" data-a="playMatch" data-v="' + pend.id + '" data-v2="s">⚡ محاكاة كاملة (نتيجة فورية)</button></div>';
      return h;
    }
    const nx = G.Season.nextFixture();
    h += '<div class="card"><div class="row sb"><h3>' + UI.week() + '</h3><span class="pill g">لا مباراة لك الآن</span></div>' +
      (nx ? '<div class="sm mut">مباراتك القادمة: الأسبوع ' + nx.w + ' — ' + UI.fixLabel(nx) + '</div>' : '<div class="sm mut">لا مباريات متبقية لك هذا الموسم.</div>') +
      '<button class="btn pri" data-a="advanceWeek">⏭️ إنهاء الأسبوع (يُجري التدريب)</button></div>';
    return h;
  }

  function weekCard() {
    const S = S_(), u = me(), t = S.training || {};
    const fo = G.Training.FOCUS.find((x) => x.id === t.focus), it = G.Training.INTENSITY[t.intensity];
    let h = '<div class="card"><div class="row sb"><b>🏋️ تدريب الأسبوع</b><button class="btn sm" data-a="go" data-v="train">تغيير</button></div><div class="sm mut" style="margin-top:6px">تركيز: ' + (fo ? fo.ar : '—') + ' · شدة: ' + (it ? it.ar : '—') + (u.dp ? ' · <b class="gold">' + u.dp + ' نقطة تطوير غير مصروفة</b>' : '') + '</div></div>';
    if (S.window && S.window.open) {
      const n = (S.offers || []).length;
      h += '<div class="card"><div class="row sb"><b>🔁 سوق الانتقالات مفتوح (' + (S.window.kind === 'winter' ? 'شتوي' : 'صيفي') + ')</b><button class="btn sm" data-a="go" data-v="market">' + (n ? n + ' عروض' : 'افتح') + '</button></div></div>';
    }
    return h;
  }

  function miniTable() {
    const S = S_(), u = me();
    if (!S.league) return '';
    const order = G.League.sorted(), mine = u.club, idx = order.indexOf(mine);
    if (idx < 0) return '';
    const lo = U.clamp(idx - 2, 0, order.length - 5), rows = order.slice(lo, lo + 5);
    return '<div class="card"><div class="row sb"><b>🏆 الدوري الإسباني</b><button class="btn sm" data-a="go" data-v="league">الجدول كاملًا</button></div><table class="t"><tr><th>#</th><th class="l">النادي</th><th>لعب</th><th>فارق</th><th>نقاط</th></tr>' +
      rows.map((id) => { const r = S.league.table[id], pos = order.indexOf(id) + 1; return '<tr class="' + (id === mine ? 'me ' : '') + (pos <= 4 ? 'z1' : '') + '"><td>' + pos + '</td><td class="l">' + UI.clubTag(id, 18) + '</td><td>' + r.p + '</td><td class="ltr">' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>'; }).join('') + '</table></div>';
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

  function lastMatch() {
    const lm = S_().lastMatch;
    if (!lm) return '';
    const mine = lm.userSide, gf = mine === 'h' ? lm.score.h : lm.score.a, ga = mine === 'h' ? lm.score.a : lm.score.h;
    const res = gf > ga ? 'فوز' : gf < ga ? 'خسارة' : 'تعادل';
    return '<div class="card"><div class="row sb"><b>آخر مباراة</b><span class="pill ' + (gf > ga ? 'g' : gf < ga ? 'r' : 'y') + '">' + res + '</span></div><div class="sm mut">' + (lm.comp === 'LL' ? 'الدوري' : 'دوري الأبطال') + '</div>' +
      '<div class="score" style="margin:8px 0"><div class="tm">' + esc(UI.cname(lm.h)) + '</div><div class="sc">' + lm.score.h + ' - ' + lm.score.a + '</div><div class="tm">' + esc(UI.cname(lm.a)) + '</div></div>' +
      '<div class="row wrap sm"><span>التقييم: ' + UI.rating(lm.rating) + '</span><span>الدقائق: ' + lm.mins + '</span><span>⚽ ' + lm.g + '</span><span>🅰️ ' + lm.as + '</span>' + (lm.motm ? '<span class="pill y">نجم المباراة</span>' : '') + '</div><button class="btn sm" style="margin-top:10px" data-a="lastMatchView">تفاصيل المباراة</button></div>';
  }

  function inboxPreview() {
    const list = (S_().inbox || []).slice(0, 3);
    if (!list.length) return '';
    return '<div class="card"><div class="row sb"><b>✉️ الرسائل</b><button class="btn sm" data-a="go" data-v="inbox">الكل</button></div>' + list.map((m) => '<div class="msg ' + (m.read ? '' : 'unread') + '"><b>' + esc(m.title) + '</b><div class="sm mut">' + esc(m.text) + '</div></div>').join('') + '</div>';
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

  function endPanel() {
    const S = S_(), sm = S.summary;
    if (!sm) return '<div class="card"><button class="btn pri" data-a="rollover">الانتقال للموسم التالي</button></div>';
    const r = sm.row, cl = (id) => esc(UI.cname(id));
    let h = '<div class="card hl"><h2>🏁 انتهى موسم ' + r.label + '</h2><div class="kv"><span>بطل الدوري</span><b>' + cl(sm.champion) + '</b></div>' +
      (sm.uclWinner ? '<div class="kv"><span>بطل أوروبا</span><b>' + cl(sm.uclWinner) + '</b></div>' : '') +
      '<div class="kv"><span>مركز ناديك</span><span>' + (r.pos || '—') + '</span></div>' +
      '<div class="kv"><span>الدوري</span><span>' + r.lg.apps + ' مباراة · ' + r.lg.g + ' هدف · ' + r.lg.a + ' صناعة · متوسط ' + (r.lg.apps ? r.lg.avg.toFixed(2) : '—') + '</span></div>' +
      (r.uc.apps ? '<div class="kv"><span>دوري الأبطال</span><span>' + r.uc.apps + ' · ' + r.uc.g + ' هدف · ' + r.uc.a + ' صناعة · متوسط ' + r.uc.avg.toFixed(2) + '</span></div>' : '') +
      '<div class="kv"><span>تقييمك</span><span>' + r.ovrStart + ' ← ' + r.ovrEnd + '</span></div></div>';
    const mine = (sm.awards || []).filter((a) => a.user);
    if (r.trophies.liga || r.trophies.ucl || mine.length) {
      h += '<div class="card"><h3>🏆 إنجازاتك</h3>' + (r.trophies.liga ? '<div>🥇 بطل الدوري الإسباني</div>' : '') + (r.trophies.ucl ? '<div>🌟 بطل دوري أبطال أوروبا</div>' : '') + mine.map((a) => '<div>🎖️ ' + G.Season.AWARD_AR[a.type] + '</div>').join('') + '</div>';
    }
    h += '<div class="card"><h3>🎖️ جوائز الموسم</h3>' + (sm.awards || []).map((a) => '<div class="kv"><span>' + G.Season.AWARD_AR[a.type] + '</span><span' + (a.user ? ' class="gold b"' : '') + '>' + esc(a.name) + ' <span class="mut sm">(' + cl(a.club) + ' · ' + a.value + ')</span></span></div>').join('') + '</div>';
    h += '<button class="btn pri" data-a="rollover">⏭️ الانتقال للموسم التالي</button>';
    if (G.Season.canRetire()) h += '<button class="btn red" data-a="retireAsk">🏁 اعتزال</button>';
    return h;
  }

  UI.screens.home = () => {
    const S = S_(), u = me();
    let h = playerCard(u);
    if (UI.noStorage) h = '<div class="notice bad">⚠️ التخزين المحلي غير متاح في هذا المتصفح (ربما وضع التصفح الخاص): لن يُحفظ تقدّمك بعد الإغلاق. استخدم «تصدير الحفظ» من الإعدادات.</div>' + h;
    if (S.phase === 'summer') h += summerPanel();
    else if (S.phase === 'season') h += nextMatchCard() + weekCard() + lastMatch() + miniTable() + uclLine();
    else if (S.phase === 'end') h += endPanel();
    h += inboxPreview();
    if (S.check && !S.check.ok) h += '<div class="notice bad">⚠️ تم رصد خلل في الجدول وإصلاحه تلقائيًا.</div>';
    return h;
  };

  // ---------- الإجراءات ----------
  UI.on('preseason', () => {
    const r = G.Season.preseason();
    if (!r) { UI.toast('لا حصص إعداد متبقية'); return; }
    UI.toast('انتهت الحصة: +' + r.xp + ' XP' + (r.ups ? ' · مستوى جديد!' : '') + (r.attrUps.length ? ' · تحسّن: ' + r.attrUps.map((k) => G.Players.ATTR_AR[k]).join('، ') : ''));
  });

  UI.on('startSeason', () => {
    const r = G.Season.startSeason();
    if (!r.ok) { UI.toast(r.msg); return; }
    UI.cur = 'home'; UI.toast('انطلق الموسم ' + G.Season.label(G.S.season) + ' — بالتوفيق!');
  });

  UI.on('advanceWeek', () => {
    const w = G.S.week, r = G.Season.advanceWeek();
    if (!r.ok) { UI.toast(r.msg); return; }
    if (G.S.phase === 'end') { UI.toast('انتهى الموسم!'); return; }
    const t = r.training;
    UI.toast('انتهى الأسبوع ' + w + ' · +' + t.xp + ' XP' + (t.attrUps.length ? ' · تحسّن: ' + t.attrUps.map((k) => G.Players.ATTR_AR[k]).join('، ') : ''));
  });

  UI.on('rollover', () => {
    const r = G.Season.rollover();
    if (!r.ok) { UI.toast(r.msg); return; }
    const g = r.growth;
    UI.cur = 'home'; UI.sub = {};
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
