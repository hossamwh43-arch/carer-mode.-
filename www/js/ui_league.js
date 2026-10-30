/* ui_league.js — صفحة الدوري (دوري اللاعب + دوريات العالم) وصفحة دوري أبطال أوروبا: الترتيب، المباريات، الإقصائيات، الهدافون والصنّاع */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];

  const World = () => G.World;
  const userLgId = () => (G.S.league && G.S.league.lg) || World().viewLg();
  UI.lgName = (lg) => G.leagueName(lg);

  // قائمة الهدافين/الصنّاع لمسابقة معيّنة ('lg' أو 'uc' أو 'nt')
  function top(comp, kind, n, filterClub) {
    const S = G.S, list = Object.values(S.players).filter((p) => p.club && p.st[comp] && p.st[comp][0] > 0 && (!filterClub || filterClub(p.club)));
    const s = (p) => p.st[comp];
    list.sort((a, b) => kind === 'g'
      ? (s(b)[1] - s(a)[1]) || (s(b)[2] - s(a)[2]) || (s(a)[4] - s(b)[4])
      : (s(b)[2] - s(a)[2]) || (s(b)[1] - s(a)[1]) || (s(a)[4] - s(b)[4]));
    return list.slice(0, n);
  }
  function listTable(list, comp, kind) {
    const uid = G.S.user;
    return '<div class="card"><table class="t"><tr><th>#</th><th class="l">اللاعب</th><th>' + (kind === 'g' ? 'أهداف' : 'صناعة') + '</th><th>' + (kind === 'g' ? 'صناعة' : 'أهداف') + '</th><th>لعب</th><th>تقييم</th></tr>' +
      list.map((p, i) => { const s = p.st[comp]; return '<tr class="' + (p.id === uid ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="l"><div>' + esc(p.n) + '</div><div class="sm mut">' + esc(UI.cname(p.club)) + '</div></td><td><b>' + (kind === 'g' ? s[1] : s[2]) + '</b></td><td>' + (kind === 'g' ? s[2] : s[1]) + '</td><td>' + s[0] + '</td><td>' + (s[0] ? (s[3] / s[0]).toFixed(1) : '—') + '</td></tr>'; }).join('') + '</table></div>';
  }
  function topTable(comp, kind) {
    const S = G.S, inL = {};
    if (comp === 'lg' && S.league) S.league.clubs.forEach((id) => { inL[id] = true; });
    const list = top(comp, kind, 15, comp === 'uc' ? (id) => S.ucl && S.ucl.teams.indexOf(id) >= 0 : comp === 'lg' ? (id) => !!inL[id] : null);
    if (!list.length) return '<div class="card mut c">لا توجد إحصاءات بعد — ستظهر مع تقدّم المباريات.</div>';
    return listTable(list, comp, kind);
  }

  // لون منطقة المركز i (من 0) في دوري: تأهل الأبطال/الصعود (z1) أو الهبوط (z3)
  UI.lgZone = (lgId, i, n) => {
    const def = G.LEAGUES[lgId];
    if (!def) return '';
    const slots = G.UCL_SLOTS[lgId] || 0, up = def.up || 0, down = def.down || 0;
    return i < slots || i < up ? 'z1' : down && i >= n - down ? 'z3' : '';
  };

  // جدول ترتيب أي دوري (كامل أو مضغوط) مع مناطق التأهل والهبوط والصعود
  function tableFor(lgId) {
    const S = G.S, mine = me().club, L = World().leagueOf(lgId), def = G.LEAGUES[lgId];
    if (!L || !def) return '<div class="card mut c">لا يوجد جدول لهذا الدوري الآن.</div>';
    const order = G.League.sorted(L), n = order.length, slots = G.UCL_SLOTS[lgId] || 0, up = def.up || 0, down = def.down || 0;
    const zone = (i) => UI.lgZone(lgId, i, n);
    const legend = def.tier === 1
      ? '<span class="pos">▌</span> المراكز 1–' + slots + ': التأهل لدوري الأبطال · <span class="neg">▌</span> المراكز ' + (n - down + 1) + '–' + n + ': الهبوط إلى ' + esc(G.leagueName(def.other))
      : '<span class="pos">▌</span> المراكز 1–' + up + ': الصعود المباشر إلى ' + esc(G.leagueName(def.other));
    return '<div class="card"><table class="t"><tr><th>#</th><th class="l">النادي</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>فارق</th><th>نقاط</th></tr>' +
      order.map((id, i) => { const r = L.table[id]; return '<tr class="' + (id === mine ? 'me ' : '') + zone(i) + '"><td>' + (i + 1) + '</td><td class="l">' + UI.clubTag(id, 18) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td class="ltr">' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>'; }).join('') +
      '</table><p class="sm mut" style="margin:8px 0 0">' + legend + '</p></div>';
  }
  UI.lgTable = tableFor;

  // الجولة «الحالية» في دوري المستخدم: آخر جولة موعدها لا يتجاوز الأسبوع الحالي
  function curRound(L) {
    const w = G.S.week || 1; let r = 1;
    L.wk.forEach((x, i) => { if (x <= w) r = i + 1; });
    return r;
  }
  function leagueFixtures() {
    const S = G.S, mine = me().club, L = S.league, R = G.League.rounds(L);
    let r = U.clamp(UI.sub.lgRound || curRound(L), 1, R);
    const fx = G.League.round(r, L);
    return '<div class="row sb" style="margin-bottom:8px"><button class="btn sm" data-a="lgRound" data-v="' + (r - 1) + '">→ السابقة</button><b>الجولة ' + r + ' / ' + R + '</b><button class="btn sm" data-a="lgRound" data-v="' + (r + 1) + '">التالية ←</button></div>' +
      '<div class="card">' + fx.map((f) => '<div class="row sb" style="padding:8px 0;border-bottom:1px solid rgba(36,50,79,.5);' + (f.h === mine || f.a === mine ? 'background:rgba(34,197,94,.1);border-radius:8px;padding-inline:6px' : '') + '"><span class="grow" style="text-align:start">' + UI.clubTag(f.h, 20) + '</span><b class="sco" style="min-width:56px;text-align:center">' + (f.played ? f.hg + ' - ' + f.ag : '—') + '</b><span class="grow" style="text-align:end;display:flex;justify-content:flex-end">' + UI.clubTag(f.a, 20) + '</span></div>').join('') + '</div>' +
      '<div class="sm mut c" style="margin-bottom:8px">الجولة ' + r + ' تُلعب في الأسبوع ' + L.wk[r - 1] + '</div><button class="btn sm" data-a="lgRound" data-v="' + curRound(L) + '">الجولة الحالية</button>';
  }

  // حركة الصعود والهبوط (من نهاية الموسم الماضي)
  function movesCard() {
    const mv = G.S.lastMoves;
    if (!mv || !mv.length) return '';
    return '<div class="card"><h3>🔁 الصعود والهبوط بعد الموسم الماضي</h3>' + mv.map((m) =>
      '<div class="sm" style="padding:6px 0;border-bottom:1px solid rgba(36,50,79,.5)"><b>' + esc(G.COUNTRY_AR[m.country] || m.country) + '</b>' +
      '<div><span class="neg">▼ هبط:</span> ' + m.rel.map((id) => esc(UI.cname(id))).join('، ') + '</div>' +
      '<div><span class="pos">▲ صعد:</span> ' + m.pro.map((id) => esc(UI.cname(id))).join('، ') + '</div></div>').join('') + '</div>';
  }

  // آخر نتائج دوري (للدوريات المحاكاة في الخلفية)
  function lastResults(lgId) {
    const lr = World().lastResults(lgId);
    if (!lr) return '';
    return '<div class="card"><h4>نتائج الجولة ' + lr.r + '</h4>' + lr.list.map((f) => '<div class="row sb sm" style="padding:5px 0"><span class="grow" style="text-align:start">' + esc(UI.cname(f.h)) + '</span><b class="sco" style="min-width:50px;text-align:center">' + f.hg + ' - ' + f.ag + '</b><span class="grow" style="text-align:end">' + esc(UI.cname(f.a)) + '</span></div>').join('') + '</div>';
  }

  function worldTab() {
    const S = G.S, mine = userLgId();
    let sel = UI.sub.wlg;
    if (!G.LEAGUES[sel]) sel = G.LEAGUE_ORDER.find((x) => x !== mine) || 'ENG1';
    const chip = (id) => '<button class="chip ' + (sel === id ? 'on' : '') + '" data-a="wlg" data-v="' + id + '">' + esc(G.LEAGUES[id].short) + (id === mine ? ' ★' : '') + '</button>';
    let h = '<div class="card"><label class="f">الدرجة الأولى</label><div class="chips">' + G.LEAGUE_ORDER.filter((x) => G.LEAGUES[x].tier === 1).map(chip).join('') + '</div>' +
      '<label class="f">الدرجة الثانية</label><div class="chips">' + G.LEAGUE_ORDER.filter((x) => G.LEAGUES[x].tier === 2).map(chip).join('') + '</div></div>';
    h += '<h3 style="margin:6px 2px">' + esc(G.leagueName(sel)) + '</h3>' + tableFor(sel) + lastResults(sel);
    const sc = World().scorers(sel, 8);
    if (sc.length) { h += '<h4 style="margin:10px 2px 6px">هدّافو الدوري</h4>' + listTable(sc, 'lg', 'g'); }
    else if (G.LEAGUES[sel].tier === 2 && sel !== mine) h += '<div class="card mut sm">أندية هذه الدرجة تُحاكى بالأرقام فقط، فلا توجد إحصاءات للاعبين فيها حتى تصعد أو تلعب أمامها.</div>';
    const champs = S.hist.filter((x) => x.champs && x.champs[sel]);
    if (champs.length) h += '<div class="card"><h4>أبطال المواسم السابقة</h4>' + champs.slice().reverse().map((x) => '<div class="kv"><span>' + x.label + '</span><b>' + esc(UI.cname(x.champs[sel])) + '</b></div>').join('') + '</div>';
    return h + movesCard();
  }

  UI.screens.league = () => {
    const S = G.S, vl = World().viewLg(), def = G.LEAGUES[vl];
    if (!S.league) {
      return '<div class="card c"><div style="font-size:40px">🏟️</div><h3>الدوري لم ينطلق بعد</h3><p class="mut">سيُنشأ جدول ' + (def.n - 1) * 2 + ' جولة لـ' + esc(def.ar) + ' عند بدء الموسم (' + G.Season.label(S.season) + ').</p></div>' + movesCard() +
        (S.hist.length ? '<div class="card"><h3>أبطال الدوري السابقون</h3>' + S.hist.slice().reverse().map((h) => '<div class="kv"><span>' + h.label + '</span><b>' + esc(UI.cname(h.champion)) + '</b></div>').join('') + '</div>' : '');
    }
    const tabs = UI.tabs('lg', [['table', 'الترتيب'], ['fix', 'المباريات'], ['scorers', 'الهدافون'], ['assists', 'الصنّاع'], ['world', '🌍 العالم']], 'table');
    const t = UI.curTab('lg', 'table');
    const own = '<div class="notice ok" style="margin-top:0">' + esc(G.leagueName(S.league.lg)) + ' · ' + (S.league.clubs.length) + ' ناديًا</div>';
    return tabs + (t === 'table' ? own + tableFor(S.league.lg) : t === 'fix' ? leagueFixtures() : t === 'scorers' ? topTable('lg', 'g') : t === 'assists' ? topTable('lg', 'a') : worldTab());
  };
  UI.on('lgRound', (v) => { UI.sub.lgRound = U.clamp(+v, 1, G.S.league ? G.League.rounds(G.S.league) : 38); });
  UI.on('wlg', (v) => { if (G.LEAGUES[v]) UI.sub.wlg = v; });

  // ---------- دوري الأبطال ----------
  const clubIn = (id) => G.S.ucl && G.S.ucl.teams.indexOf(id) >= 0;

  function uclTable() {
    const u = G.S.ucl, mine = me().club, order = G.Ucl.sorted();
    return '<div class="card"><table class="t"><tr><th>#</th><th class="l">النادي</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>فارق</th><th>نقاط</th></tr>' +
      order.map((id, i) => { const r = u.league.table[id]; return '<tr class="' + (id === mine ? 'me ' : '') + (i < 8 ? 'z1' : i < 24 ? 'z2' : 'z3') + '"><td>' + (i + 1) + '</td><td class="l">' + UI.clubTag(id, 18) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td class="ltr">' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>'; }).join('') +
      '</table><p class="sm mut" style="margin:8px 0 0"><span class="pos">▌</span> 1–8 إلى دور الـ16 مباشرةً · <span class="gold">▌</span> 9–24 إلى الملحق · <span class="neg">▌</span> 25–36 خارج البطولة</p></div>';
  }

  function tieCard(t) {
    const l1 = t.legs[0], l2 = t.legs[1], mine = me().club;
    const leg = (f, n) => '<div class="row sb sm" style="padding:3px 0"><span class="mut">' + n + ' (أ' + f.w + ')</span><span>' + esc(UI.cname(f.h)) + '</span><b class="sco">' + (f.played ? f.hg + ' - ' + f.ag : '—') + '</b><span>' + esc(UI.cname(f.a)) + '</span></div>';
    let agg = '';
    if (l1.played && l2.played) {
      const lo = l1.hg + l2.ag, hi = l1.ag + l2.hg;
      agg = '<div class="sm c" style="margin-top:4px">المجموع: <b class="ltr">' + esc(UI.cname(t.hi)) + ' ' + hi + ' - ' + lo + ' ' + esc(UI.cname(t.lo)) + '</b>' + (l2.pens ? ' (ركلات الترجيح)' : '') + '</div>';
    }
    const w = t.winner;
    return '<div class="card" style="' + (t.hi === mine || t.lo === mine ? 'border-color:var(--acc)' : '') + '"><div class="row sb"><span>' + UI.clubTag(t.hi, 20) + (w === t.hi ? ' ✅' : '') + '</span><span class="mut sm">مقابل</span><span>' + UI.clubTag(t.lo, 20) + (w === t.lo ? ' ✅' : '') + '</span></div>' + leg(l1, 'ذهاب') + leg(l2, 'إياب') + agg + '</div>';
  }

  function uclKo() {
    const u = G.S.ucl, ST = G.Ucl.STAGE_AR;
    let h = '';
    ['po', 'r16', 'qf', 'sf'].forEach((st) => {
      if (u.ties[st].length) h += '<h4 style="margin:12px 2px 6px">' + ST[st] + '</h4>' + u.ties[st].map(tieCard).join('');
    });
    if (u.final) {
      const f = u.final;
      h += '<h4 style="margin:12px 2px 6px">النهائي</h4><div class="card hl">' + UI.fixLine(f, true) + '<div class="sm mut c">' + (f.played ? '' : 'الأسبوع ' + f.w + ' · ملعب محايد') + '</div></div>';
    }
    if (u.winner) h += '<div class="card hl c"><div style="font-size:40px">🏆</div><h3>بطل أوروبا: ' + esc(UI.cname(u.winner)) + '</h3></div>';
    return h || '<div class="card mut c">ستبدأ الأدوار الإقصائية بعد انتهاء مرحلة الدوري (الملحق في الأسبوع 30).</div>';
  }

  function uclMine() {
    const S = G.S, mine = me().club, u = S.ucl;
    if (!clubIn(mine)) return '<div class="card mut c">ناديك لا يشارك في دوري الأبطال هذا الموسم.</div>';
    const fx = G.Ucl.allFixtures().filter((f) => f.h === mine || f.a === mine).sort((a, b) => a.w - b.w);
    return '<div class="card">' + fx.map((f) => '<div style="padding:8px 0;border-bottom:1px solid rgba(36,50,79,.5)"><div class="sm mut">' + UI.fixLabel(f) + ' · الأسبوع ' + f.w + '</div><div class="row sb"><span>' + UI.clubTag(f.h, 20) + '</span><b class="sco">' + (f.played ? f.hg + ' - ' + f.ag + (f.pens ? ' (' + f.pens.h + '-' + f.pens.a + ')' : '') : '—') + '</b><span>' + UI.clubTag(f.a, 20) + '</span></div></div>').join('') + '</div>' +
      '<p class="sm mut">الدور القادم يتحدد بحسب ترتيبك. الخروج من البطولة يظهر هنا فور حدوثه.</p>';
  }

  UI.screens.ucl = () => {
    const S = G.S;
    if (!S.ucl) {
      const mine = me().club, q = S.uclTeams || [], inL = q.filter((id) => S.clubs[id].lg), out = q.filter((id) => !S.clubs[id].lg);
      const my = S.clubs[mine], mySlots = my && my.lg ? G.UCL_SLOTS[my.lg] : 0;
      return '<div class="card c"><div style="font-size:40px">⭐</div><h3>دوري أبطال أوروبا ' + G.Season.label(S.season) + '</h3><p class="mut">تُجرى القرعة تلقائيًا عند بدء الموسم (36 فريقًا، مرحلة دوري من 8 مباريات).</p>' +
        (q.indexOf(mine) >= 0 ? '<div class="notice ok">✅ ناديك مؤهل لدوري الأبطال هذا الموسم.</div>' : '<div class="notice">ناديك غير مؤهل هذا الموسم. ' + (mySlots ? 'أنهِ ضمن أول ' + mySlots + ' في ' + esc(G.leagueName(my.lg)) : 'تتأهل الأندية من الدوريات الخمسة الكبرى بحسب ترتيبها') + ' أو انتقل إلى نادٍ مشارك.</div>') + '</div>' +
        G.LEAGUE_ORDER.filter((lg) => G.UCL_SLOTS[lg]).map((lg) => { const ids = inL.filter((id) => S.clubs[id].lg === lg); return ids.length ? '<div class="card"><h3>' + esc(G.leagueName(lg)) + ' <span class="sm mut">(' + G.UCL_SLOTS[lg] + ' مقاعد)</span></h3><div class="chips">' + ids.map((id) => '<span class="chip ' + (id === mine ? 'on' : '') + '">' + UI.clubTag(id, 18) + '</span>').join('') + '</div></div>' : ''; }).join('') +
        '<div class="card"><h3>أندية من بقية أوروبا</h3><div class="chips">' + out.map((id) => '<span class="chip ' + (id === mine ? 'on' : '') + '">' + esc(UI.cname(id)) + '</span>').join('') + '</div></div>' +
        (S.uclHistory.length ? '<div class="card"><h3>الأبطال السابقون</h3>' + S.uclHistory.slice().reverse().map((h) => '<div class="kv"><span>' + G.Season.label(h.season) + '</span><b>' + esc(UI.cname(h.winner)) + '</b></div>').join('') + '</div>' : '');
    }
    const tabs = UI.tabs('uc', [['table', 'الترتيب'], ['mine', 'مبارياتي'], ['ko', 'الإقصائيات'], ['scorers', 'الهدافون'], ['assists', 'الصنّاع']], 'table');
    const t = UI.curTab('uc', 'table');
    const head = '<div class="notice ok">المرحلة الحالية: <b>' + G.Ucl.STAGE_AR[S.ucl.phase] + '</b></div>';
    return tabs + head + (t === 'table' ? uclTable() : t === 'mine' ? uclMine() : t === 'ko' ? uclKo() : t === 'scorers' ? topTable('uc', 'g') : topTable('uc', 'a'));
  };
})(window.G = window.G || {});
