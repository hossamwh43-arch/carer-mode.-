/* ui_profile.js — شاشات «ملفي» و«النادي» و«التشكيلة» بالأسلوب السينمائي (غلاف + تبويبات + بطاقات أفقية).
   عرض فقط: يقرأ بيانات اللاعب والنادي الموجودة ولا يغيّر الحالة ولا يستهلك U.rnd (التشكيلة تُطلب بلا ضوضاء). */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const lg = (p) => G.Season.statOf(p, 'lg');

  const avgForm = (p) => { const f = (p.form || []).slice(-5); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0; };
  const tone = (frac) => (frac >= 0.6 ? '' : frac >= 0.35 ? 'gold' : 'red');

  // ---------- ملفي ----------
  function hero(p) {
    const foot = p.foot === 'L' ? 'اليسرى' : 'اليمنى';
    return UI.cinePlayer(p, { big: true, act: '<button class="hbtn" data-a="cardOpen">' + UI.ico('pcard') + ' بطاقتي</button>', chips: [UI.ico('shirt') + ' القدم ' + foot, p.h + ' سم', p.w + ' كغ', G.Season.label(G.S.season)] });
  }

  function gaugeCard(p) {
    const f = avgForm(p), ft = Math.round(p.fit), tr = Math.round(p.trust);
    const g = (ring, lab, sub) => '<div class="g1">' + ring + '<span>' + lab + '</span><small>' + sub + '</small></div>';
    return '<div class="card gauges"><div class="gauge3">' +
      g(UI.ring(f ? (f - 5) / 4 : 0, f ? f.toFixed(1) : '—', '', 76, f ? tone((f - 5) / 4) : 'dim'), 'الفورمة', f ? 'آخر ' + Math.min(5, (p.form || []).length) + ' مباريات' : 'لا مباريات بعد') +
      g(UI.ring(ft / 100, ft + '%', '', 76, ft < 50 ? 'red' : ft < 75 ? 'gold' : ''), 'اللياقة', ft < 50 ? 'تحتاج راحة' : ft < 75 ? 'متوسطة' : 'ممتازة') +
      g(UI.ring(tr / 100, tr, '', 76, tr < 30 ? 'red' : tr < 55 ? 'gold' : ''), 'ثقة المدرب', G.Coach.trustLabel(p.trust)) + '</div></div>';
  }

  function devCard(p) {
    const T = G.Training, need = T.need(p.lvl), xpf = need ? p.xp / need : 0;
    const gi = G.Growth ? G.Growth.info(p) : null;
    let h = '<div class="card"><div class="row sb"><h3>التطور</h3><span>' + UI.stars(p.pot) + '</span></div>' +
      '<div class="pot-row"><div><small class="mut">التقييم الآن</small><b>' + p.ovr + '</b></div><div class="pot-mid"><div class="potbar"><i style="width:' + U.clamp(p.ovr, 0, 100) + '%"></i><em style="inset-inline-start:' + U.clamp(p.pot, 0, 100) + '%"></em></div></div><div class="r"><small class="mut">الإمكانات</small><b class="gold">' + p.pot + '</b></div></div>' +
      '<div class="row sb sm" style="margin-top:12px"><span>المستوى <b>' + p.lvl + '</b></span><span class="mut">' + Math.round(p.xp) + ' / ' + need + ' خبرة</span></div>' + UI.bar(xpf * 100, 'gold');
    if (p.dp) h += '<button class="btn pri sm-go" data-a="goSub" data-v="train" data-v2="tr:attrs">' + UI.ico('plus') + ' اصرف ' + p.dp + (p.dp === 1 ? ' نقطة تطوير' : ' نقاط تطوير') + '</button>';
    else h += '<p class="sm mut" style="margin:8px 0 0">كل مستوى جديد يمنحك نقطة تطوير تصرفها على السمات.</p>';
    if (gi && UI.growthPills) h += UI.growthPills(p);
    return h + '</div>';
  }

  function contractCard(p) {
    if (!p.ct) return '';
    return '<div class="card"><div class="row sb"><div class="row">' + UI.badge(p.club, 30) + '<div><b>' + esc(UI.cname(p.club)) + '</b><div class="sm mut">' + p.ct.y + ' ' + (p.ct.y === 1 ? 'سنة متبقية' : 'سنوات متبقية') + ' · ' + UI.money(p.ct.w) + ' أسبوعيًا</div></div></div>' +
      '<button class="btn sm" data-a="goSub" data-v="market" data-v2="mk:contract">العقد</button></div></div>';
  }

  function ovTab(p) {
    let h = gaugeCard(p) + devCard(p);
    h += '<div class="card"><div class="row sb"><b>دورك في الفريق</b>' + UI.rolePill(p.role) + '</div>' + (p.roleInfo && p.roleInfo.text ? '<p class="sm mut" style="margin:8px 0 0">' + esc(p.roleInfo.text) + '</p>' : '') +
      '<div class="grid2" style="margin-top:12px"><button class="btn sm" data-a="cardOpen" style="width:100%">' + UI.ico('pcard') + ' بطاقتي</button><button class="btn sm" data-a="goSub" data-v="train" data-v2="tr:coach" style="width:100%">' + UI.ico('clipboard') + ' قرار المدرب</button></div></div>';
    h += contractCard(p);
    if (UI.trophyCard) h += UI.trophyCard();
    if (UI.bdCard) h += UI.bdCard();
    if (UI.mediaCard) h += UI.mediaCard();
    return h;
  }

  // ---------- السمات ----------
  const FN = ['gk', 'sho', 'pas', 'dri'], PH = ['pac', 'phy'], MN = ['iq', 'def'];
  function abRow(p, k) {
    const v = p.a[k] || 0, g = (p.gain && p.gain[k]) || 0, rel = (G.Players.OVR_W[p.pos][k] || 0) >= 0.2;
    return '<div class="ab"><span class="ab-n">' + G.Players.ATTR_AR[k] + (rel ? '<i class="ab-k" title="أساسية لمركزك"></i>' : '') + '</span>' + UI.bar(v, v >= 80 ? 'gold' : v >= 62 ? '' : 'blue') + '<b>' + v + '</b>' + (g > 0 ? '<em>+' + g + '</em>' : '<em></em>') + '</div>';
  }
  function atTab(p) {
    const gk = p.pos === 'GK';
    const keys = G.Players.ATTRS.filter((k) => (k === 'gk' ? gk : gk ? !!G.Players.OVR_W.GK[k] : true));
    const grp = (title, list) => { const ks = list.filter((k) => keys.indexOf(k) >= 0); return ks.length ? '<div class="card"><h4>' + title + '</h4>' + ks.map((k) => abRow(p, k)).join('') + '</div>' : ''; };
    return '<div class="card">' + UI.radar(p) + '</div>' + grp('الفنية', FN) + grp('البدنية', PH) + grp('الذهنية والتكتيكية', MN) +
      '<p class="sm mut" style="margin:0 2px 8px"><i class="ab-k"></i> سمة أساسية لمركزك (' + G.POS_AR[p.pos] + ') · «+» ما اكتسبته هذا الموسم</p>' +
      '<button class="btn" data-a="goSub" data-v="train" data-v2="tr:attrs">' + UI.ico('dumbbell') + ' تطوير السمات' + (p.dp ? ' (' + p.dp + ' نقاط)' : '') + '</button>';
  }

  // ---------- الإحصائيات ----------
  function statRow(title, s) {
    return '<div class="card"><h4>' + title + '</h4><div class="grid4"><div class="stat"><b>' + s.apps + '</b><small>مباراة</small></div><div class="stat"><b>' + s.g + '</b><small>هدف</small></div><div class="stat"><b>' + s.a + '</b><small>صناعة</small></div><div class="stat"><b>' + (s.apps ? s.avg.toFixed(1) : '—') + '</b><small>تقييم</small></div></div></div>';
  }
  function spark(p) {
    const list = (G.S.matchLog || []).filter((m) => m.mins > 0 && m.rating).slice(0, 12).reverse();
    if (!list.length) return '';
    return '<div class="card"><h4>تقييمك في آخر المباريات</h4><div class="spark">' + list.map((m) => '<div class="sp"><i class="' + UI.ratingCls(m.rating) + '" style="height:' + U.clamp((m.rating - 4.5) / 5 * 100, 8, 100).toFixed(0) + '%"></i><b>' + m.rating.toFixed(1) + '</b></div>').join('') + '</div></div>';
  }
  function stTab(p) {
    const S = G.S, tot = G.Season.careerTotals(), uc = G.Season.statOf(p, 'uc'), nt = G.Season.statOf(p, 'nt');
    let h = statRow((S.league ? G.leagueName(S.league.lg) : 'الدوري') + ' · ' + G.Season.label(S.season), lg(p));
    if (uc.apps) h += statRow('دوري أبطال أوروبا', uc);
    if (nt.apps) h += statRow(S.intl ? S.intl.name : 'المنتخب', nt);
    h += spark(p);
    h += '<div class="card"><h4>مسيرتك حتى الآن</h4><div class="grid3"><div class="stat"><b>' + tot.apps + '</b><small>مباراة</small></div><div class="stat"><b>' + tot.g + '</b><small>هدف</small></div><div class="stat"><b>' + tot.a + '</b><small>صناعة</small></div>' +
      '<div class="stat"><b>' + (tot.avg ? tot.avg.toFixed(2) : '—') + '</b><small>متوسط التقييم</small></div><div class="stat"><b>' + tot.seasons + '</b><small>مواسم</small></div><div class="stat"><b>' + tot.titles + '</b><small>ألقاب</small></div></div>' +
      '<div class="kv" style="margin-top:8px"><span>' + UI.ico('cardyellow') + ' إنذارات</span><b>' + p.cards.y + '</b></div><div class="kv"><span>' + UI.ico('cardred') + ' طرد</span><b>' + p.cards.r + '</b></div></div>';
    h += '<button class="btn" data-a="go" data-v="stats">' + UI.ico('chart') + ' كل الإحصائيات والإنجازات</button>';
    return h;
  }

  UI.screens.profile = () => {
    const p = me(), t = UI.curTab('pf', 'ov');
    const tabs = UI.tabs('pf', [['ov', 'نظرة عامة'], ['at', 'السمات'], ['st', 'الإحصائيات']], 'ov');
    return hero(p) + tabs + (t === 'at' ? atTab(p) : t === 'st' ? stTab(p) : ovTab(p));
  };

  // ---------- النادي ----------
  const GRP = { GK: 'gk', CB: 'def', LB: 'def', RB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'att', RW: 'att', ST: 'att' };
  const squadOf = (cid) => (G.S.clubs[cid].squad || []).map((id) => G.S.players[id]).filter(Boolean);

  UI.screens.club = () => {
    const S = G.S, p = me(), cid = p.club, c = S.clubs[cid];
    const pos = S.league ? G.League.position(cid) : 0, r = S.league && S.league.table ? S.league.table[cid] : null;
    const chips = [S.league ? esc(G.leagueName(S.league.lg)) : '', pos ? 'المركز ' + pos : '', 'خطة <span class="ltr">' + esc(c.form) + '</span>'];
    let h = UI.cineClub(cid, c.name, p.parentPays ? 'معار من ' + UI.cname(p.parent) : 'ناديك', chips);
    if (r) h += '<div class="grid3 kpis"><div class="stat"><b>' + pos + '</b><small>المركز</small></div><div class="stat"><b>' + r.pts + '</b><small>نقطة (' + r.p + ' مباراة)</small></div><div class="stat"><b class="ltr ' + (r.gf - r.ga >= 0 ? 'pos' : 'neg') + '">' + (r.gf - r.ga > 0 ? '+' : '') + (r.gf - r.ga) + '</b><small>فارق الأهداف</small></div></div>';
    // المدرب: قراره بشأنك وثقته (لا توجد شخصية مدرب مسمّاة في اللعبة، فنعرض ما يخصّك فعلًا)
    h += '<div class="card mgr"><div class="row sb"><div class="row"><span class="tl-ic">' + UI.ico('clipboard') + '</span><div><b>المدرب</b><div class="sm mut">تقييمه لأدائك: ' + G.Coach.evaluation(p) + '</div></div></div>' + UI.rolePill(p.role) + '</div>' +
      '<div class="row sb sm" style="margin-top:10px"><span class="mut">الثقة</span><span>' + Math.round(p.trust) + ' — ' + G.Coach.trustLabel(p.trust) + '</span></div>' + UI.bar(p.trust, p.trust < 30 ? 'red' : '') +
      '<button class="btn sm" style="margin-top:10px;width:100%" data-a="goSub" data-v="train" data-v2="tr:coach">تفاصيل قرار المدرب</button></div>';
    // التدريب
    const t = S.training || {}, fo = G.Training.FOCUS.find((x) => x.id === t.focus), it = G.Training.INTENSITY[t.intensity];
    h += '<div class="card"><div class="row sb"><div class="row"><span class="tl-ic">' + UI.ico('dumbbell') + '</span><div><b>تدريب الأسبوع</b><div class="sm mut">تركيز: ' + (fo ? fo.ar : '—') + ' · شدة: ' + (it ? it.ar : '—') + '</div></div></div><button class="btn sm" data-a="go" data-v="train">تغيير</button></div></div>';
    // نجوم الفريق
    const stars = squadOf(cid).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 8);
    if (stars.length) h += '<div class="sec-h"><h3>نجوم الفريق</h3><button class="lnk" data-a="go" data-v="squad">كل التشكيلة</button></div><div class="snap">' +
      stars.map((q) => '<div class="pc ' + UI.tierCls(q) + (q.user ? ' me' : '') + '"><b>' + q.ovr + '</b><i>' + q.pos + '</i><span>' + esc(String(q.n).split(/\s+/).slice(-1)[0]) + '</span></div>').join('') + '</div>';
    if (UI.miniTable) h += UI.miniTable();
    // التكتيك: الخطة والتشكيلة (لا يوجد تغيير للخطة من اللاعب في اللعبة)
    h += '<div class="card"><div class="row sb"><div class="row"><span class="tl-ic">' + UI.ico('target') + '</span><div><b>التكتيك</b><div class="sm mut">خطة اللعب <span class="ltr">' + esc(c.form) + '</span> · يقرّرها مدرب النادي</div></div></div><button class="btn sm" data-a="go" data-v="squad">التشكيلة</button></div></div>';
    return h;
  };

  // ---------- التشكيلة ----------
  const FILT = [['all', 'الكل'], ['gk', 'حراس'], ['def', 'دفاع'], ['mid', 'وسط'], ['att', 'هجوم']];
  UI.screens.squad = () => {
    const S = G.S, u = me(), cid = u.club, c = S.clubs[cid], f = UI.sub.sq || 'all', all = !!UI.sub.sqAll;
    const L = G.Lineup.forClub(cid, { role: u.role, rotStart: false, noise: 0 });
    let h = '<div class="card sq-pitch"><div class="row sb"><b>التشكيلة المتوقعة</b><span class="pill b ltr">' + esc(c.form) + '</span></div>' + UI.pitch(L.xi, cid, { hi: u.id }) +
      '<div class="row sb sm"><span class="mut">دورك</span>' + UI.rolePill(u.role) + '</div></div>';
    let list = squadOf(cid).slice().sort((a, b) => b.ovr - a.ovr);
    const total = list.length;
    if (f !== 'all') list = list.filter((q) => GRP[q.pos] === f);
    h += '<div class="chips fl">' + FILT.map((x) => '<button class="chip ' + (f === x[0] ? 'on' : '') + '" data-a="sqFilter" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    const shown = all ? list : list.slice(0, 10);
    h += '<div class="card sq-list">' + (shown.length ? shown.map((q) => {
      const xi = L.xi.some((x) => x.id === q.id);
      return '<div class="sq-r' + (q.user ? ' me' : '') + '"><i class="sq-pos">' + q.pos + '</i><span class="sq-n">' + esc(q.n) + (q.user ? ' <em>أنت</em>' : '') + (q.inj > 0 ? ' <span class="pill r">مصاب</span>' : xi ? ' <span class="sq-xi" title="أساسي">●</span>' : '') + '</span><span class="sq-a">' + q.age + '</span><b class="sq-o ' + UI.tierCls(q) + '">' + q.ovr + '</b></div>';
    }).join('') : '<div class="mut c">لا لاعبين في هذه الخانة.</div>') + '</div>';
    if (list.length > 10) h += '<button class="btn sm" style="width:100%" data-a="sqAll">' + (all ? 'عرض أقل' : 'عرض الكل (' + list.length + (f === 'all' ? '' : ' من ' + total) + ')') + '</button>';
    return h;
  };
  UI.on('sqFilter', (v) => { UI.sub.sq = v; UI.sub.sqAll = false; });
  UI.on('sqAll', () => { UI.sub.sqAll = !UI.sub.sqAll; });
})(window.G = window.G || {});
