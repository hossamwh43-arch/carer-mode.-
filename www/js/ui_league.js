/* ui_league.js — صفحة الدوري الإسباني وصفحة دوري أبطال أوروبا: الترتيب، المباريات، الإقصائيات، الهدافون والصنّاع */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];

  // قائمة الهدافين/الصنّاع لمسابقة معيّنة ('lg' أو 'uc')
  function top(comp, kind, n, filterClub) {
    const S = G.S, list = Object.values(S.players).filter((p) => p.club && p.st[comp][0] > 0 && (!filterClub || filterClub(p.club)));
    const s = (p) => p.st[comp];
    list.sort((a, b) => kind === 'g'
      ? (s(b)[1] - s(a)[1]) || (s(b)[2] - s(a)[2]) || (s(a)[4] - s(b)[4])
      : (s(b)[2] - s(a)[2]) || (s(b)[1] - s(a)[1]) || (s(a)[4] - s(b)[4]));
    return list.slice(0, n);
  }
  function topTable(comp, kind) {
    const list = top(comp, kind, 15, comp === 'uc' ? (id) => G.S.ucl && G.S.ucl.teams.indexOf(id) >= 0 : null);
    if (!list.length) return '<div class="card mut c">لا توجد إحصاءات بعد — ستظهر مع تقدّم المباريات.</div>';
    const uid = G.S.user;
    return '<div class="card"><table class="t"><tr><th>#</th><th class="l">اللاعب</th><th>' + (kind === 'g' ? 'أهداف' : 'صناعة') + '</th><th>' + (kind === 'g' ? 'صناعة' : 'أهداف') + '</th><th>لعب</th><th>تقييم</th></tr>' +
      list.map((p, i) => { const s = p.st[comp]; return '<tr class="' + (p.id === uid ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="l"><div>' + esc(p.n) + '</div><div class="sm mut">' + esc(UI.cname(p.club)) + '</div></td><td><b>' + (kind === 'g' ? s[1] : s[2]) + '</b></td><td>' + (kind === 'g' ? s[2] : s[1]) + '</td><td>' + s[0] + '</td><td>' + (s[0] ? (s[3] / s[0]).toFixed(1) : '—') + '</td></tr>'; }).join('') + '</table></div>';
  }

  function leagueTable() {
    const S = G.S, L = S.league, mine = me().club, order = G.League.sorted();
    return '<div class="card"><table class="t"><tr><th>#</th><th class="l">النادي</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>فارق</th><th>نقاط</th></tr>' +
      order.map((id, i) => { const r = L.table[id]; return '<tr class="' + (id === mine ? 'me ' : '') + (i < 4 ? 'z1' : '') + '"><td>' + (i + 1) + '</td><td class="l">' + UI.clubTag(id, 18) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td class="ltr">' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>'; }).join('') +
      '</table><p class="sm mut" style="margin:8px 0 0"><span class="pos">▌</span> المراكز 1–4: التأهل لدوري الأبطال. (لا هبوط في هذه النسخة)</p></div>';
  }

  function leagueFixtures() {
    const S = G.S, mine = me().club;
    let r = UI.sub.lgRound || U.clamp(S.week || 1, 1, 38);
    r = U.clamp(r, 1, 38);
    const fx = G.League.roundFixtures(r);
    return '<div class="row sb" style="margin-bottom:8px"><button class="btn sm" data-a="lgRound" data-v="' + (r - 1) + '">→ السابقة</button><b>الجولة ' + r + ' / 38</b><button class="btn sm" data-a="lgRound" data-v="' + (r + 1) + '">التالية ←</button></div>' +
      '<div class="card">' + fx.map((f) => '<div class="row sb" style="padding:8px 0;border-bottom:1px solid rgba(36,50,79,.5);' + (f.h === mine || f.a === mine ? 'background:rgba(34,197,94,.1);border-radius:8px;padding-inline:6px' : '') + '"><span class="grow" style="text-align:start">' + UI.clubTag(f.h, 20) + '</span><b class="sco" style="min-width:56px;text-align:center">' + (f.played ? f.hg + ' - ' + f.ag : '—') + '</b><span class="grow" style="text-align:end;display:flex;justify-content:flex-end">' + UI.clubTag(f.a, 20) + '</span></div>').join('') + '</div>' +
      '<button class="btn sm" data-a="lgRound" data-v="' + U.clamp(S.week || 1, 1, 38) + '">الجولة الحالية</button>';
  }

  UI.screens.league = () => {
    const S = G.S;
    if (!S.league) {
      return '<div class="card c"><div style="font-size:40px">🏟️</div><h3>الدوري لم ينطلق بعد</h3><p class="mut">سيُنشأ جدول 38 جولة عند بدء الموسم (' + G.Season.label(S.season) + ').</p></div>' +
        (S.hist.length ? '<div class="card"><h3>أبطال الدوري السابقون</h3>' + S.hist.slice().reverse().map((h) => '<div class="kv"><span>' + h.label + '</span><b>' + esc(UI.cname(h.champion)) + '</b></div>').join('') + '</div>' : '');
    }
    const tabs = UI.tabs('lg', [['table', 'الترتيب'], ['fix', 'المباريات'], ['scorers', 'الهدافون'], ['assists', 'الصنّاع']], 'table');
    const t = UI.curTab('lg', 'table');
    return tabs + (t === 'table' ? leagueTable() : t === 'fix' ? leagueFixtures() : t === 'scorers' ? topTable('lg', 'g') : topTable('lg', 'a'));
  };
  UI.on('lgRound', (v) => { UI.sub.lgRound = U.clamp(+v, 1, 38); });

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
      const mine = me().club, q = S.uclTeams || [], spain = q.filter((id) => S.clubs[id].liga), foreign = q.filter((id) => !S.clubs[id].liga);
      return '<div class="card c"><div style="font-size:40px">⭐</div><h3>دوري أبطال أوروبا ' + G.Season.label(S.season) + '</h3><p class="mut">تُجرى القرعة تلقائيًا عند بدء الموسم (36 فريقًا، مرحلة دوري من 8 مباريات).</p>' +
        (q.indexOf(mine) >= 0 ? '<div class="notice ok">✅ ناديك مؤهل لدوري الأبطال هذا الموسم.</div>' : '<div class="notice">ناديك غير مؤهل هذا الموسم. أنهِ ضمن أول 4 في الدوري أو انتقل إلى نادٍ مشارك.</div>') + '</div>' +
        '<div class="card"><h3>الأندية الإسبانية المؤهلة</h3><div class="chips">' + spain.map((id) => '<span class="chip ' + (id === mine ? 'on' : '') + '">' + UI.clubTag(id, 18) + '</span>').join('') + '</div></div>' +
        '<div class="card"><h3>الأندية الأجنبية المؤهلة</h3><div class="chips">' + foreign.map((id) => '<span class="chip ' + (id === mine ? 'on' : '') + '">' + esc(UI.cname(id)) + '</span>').join('') + '</div></div>' +
        (S.uclHistory.length ? '<div class="card"><h3>الأبطال السابقون</h3>' + S.uclHistory.slice().reverse().map((h) => '<div class="kv"><span>' + G.Season.label(h.season) + '</span><b>' + esc(UI.cname(h.winner)) + '</b></div>').join('') + '</div>' : '');
    }
    const tabs = UI.tabs('uc', [['table', 'الترتيب'], ['mine', 'مبارياتي'], ['ko', 'الإقصائيات'], ['scorers', 'الهدافون'], ['assists', 'الصنّاع']], 'table');
    const t = UI.curTab('uc', 'table');
    const head = '<div class="notice ok">المرحلة الحالية: <b>' + G.Ucl.STAGE_AR[S.ucl.phase] + '</b></div>';
    return tabs + head + (t === 'table' ? uclTable() : t === 'mine' ? uclMine() : t === 'ko' ? uclKo() : t === 'scorers' ? topTable('uc', 'g') : topTable('uc', 'a'));
  };
})(window.G = window.G || {});
