/* ui_worldrank.js — شاشة «تصنيفات العالم» (المزيد ← تصنيفات العالم): أندية · منتخبات · أرشيف سنوي.
   عرض فقط: لا يغيّر حالة اللعبة ولا يستهلك U.rnd. المحرك في world_rank.js. الفكرة الأصلية من حزمة «player_career_upgrade»؛
   أُعيدت كتابتها هنا لتعرض شريط التبديل فعلًا، وتحدّ القائمة بأفضل 50 مع صف ناديك/منتخبك، وتلتزم رموز الهندسة الموحّدة. */
(function (G) {
  'use strict';
  const UI = G.UI, R = G.WorldRank;
  if (!UI || !R) return;
  const esc = UI.esc, SHOW = R.KEEP;
  const num = (n) => Number(n).toLocaleString('en');
  const me = () => G.S.players[G.S.user];
  const lgName = (lg, id) => (lg && G.leagueName ? G.leagueName(lg) : (id && G.S.clubs[id] && G.S.clubs[id].country ? 'دوري ' + UI.natName(G.S.clubs[id].country) : 'خارج الدوريات الخمسة'));
  const confName = (c) => (G.CONF_AR && G.CONF_AR[c]) || c || '';

  // رتبة كل عنصر في آخر أرشيف (لعرض الصعود والهبوط بعدد المراكز)
  const prevRanks = (kind) => {
    const h = R.history(), last = h.length ? h[h.length - 1] : null, m = {};
    if (last) (kind === 'nations' ? last.nations : last.clubs).forEach((x, i) => { m[x.i] = i + 1; });
    return m;
  };
  const move = (prev, rank) => {
    if (prev == null) return '<span class="wr-mv flat">—</span>';
    const d = prev - rank;
    return d > 0 ? '<span class="wr-mv up">' + UI.ico('arrowup') + d + '</span>' : d < 0 ? '<span class="wr-mv down">' + UI.ico('arrowdown') + (-d) + '</span>' : '<span class="wr-mv flat">=</span>';
  };
  const emblem = (kind, x, size) => (kind === 'nations' ? UI.natBadge(x.id, size) : UI.badge(x.id, size));
  const sub = (kind, x) => (kind === 'nations'
    ? esc(confName(x.conf))
    : esc(lgName(x.lg, x.id)) + (x.pos ? ' · المركز المحلي ' + x.pos : ''));

  const rowHtml = (kind, x, prev, mine) => '<div class="wr-row' + (mine ? ' me' : '') + '"><b class="wr-pos">' + x.rank + '</b><span class="wr-emblem">' + emblem(kind, x, 34) + '</span>' +
    '<span class="wr-name"><b>' + esc(x.name) + '</b><small>' + sub(kind, x) + '</small></span>' +
    '<span class="wr-score"><b>' + num(x.score) + '</b>' + (prev === false ? '' : move(prev, x.rank)) + '</span></div>';

  const podium = (kind, list) => {
    const top = list.slice(0, 3); if (top.length < 3) return '';
    const cell = (x, cls) => '<div class="wr-pod ' + cls + '"><span class="wr-medal">' + UI.ico(cls === 'p1' ? 'crown' : 'medal') + '</span><span class="wr-pe">' + emblem(kind, x, cls === 'p1' ? 46 : 38) + '</span><small>' + esc(x.name) + '</small><strong>' + num(x.score) + '</strong></div>';
    return '<div class="wr-podium">' + cell(top[1], 'p2') + cell(top[0], 'p1') + cell(top[2], 'p3') + '</div>';
  };

  const board = (kind, list) => {
    const prev = prevRanks(kind), u = me(), hasHist = R.history().length > 0;
    const isMine = (x) => (kind === 'nations' ? x.id === u.nat : x.id === u.club);
    const shown = list.slice(0, SHOW);
    let h = '<div class="card wr-board"><div class="wr-bh"><h3>' + (kind === 'nations' ? 'أفضل المنتخبات' : 'أفضل الأندية') + '</h3><span class="wr-count">' + num(list.length) + (kind === 'nations' ? ' منتخبًا' : ' ناديًا') + '</span></div>';
    h += shown.map((x) => rowHtml(kind, x, hasHist ? prev[x.id] : false, isMine(x))).join('');
    const mine = list.find(isMine);
    if (mine && mine.rank > SHOW) h += '<div class="wr-gap">⋯</div>' + rowHtml(kind, mine, hasHist ? prev[mine.id] : false, true);
    return h + '</div>';
  };

  const live = (kind) => {
    const list = kind === 'nations' ? R.buildNations() : R.buildClubs();
    const S = G.S;
    return '<section class="wr-hero"><small>' + (kind === 'nations' ? 'تصنيف المنتخبات' : 'تصنيف الأندية') + '</small><h2>' + (kind === 'nations' ? 'أقوى منتخبات العالم' : 'أقوى أندية العالم') + '</h2>' +
      '<p>ترتيب الموسم ' + S.season + ' الحالي — يُؤرشف رسميًا عند نهاية كل موسم، والأسهم تقارن بآخر أرشيف.</p>' + podium(kind, list) + '</section>' + board(kind, list) +
      '<p class="wr-note">' + (kind === 'nations'
        ? 'القوة الأساسية للمنتخب + انجراف قوته المسجّل + مكافآت البطولات الدولية المؤرشفة فقط (كأس العالم أثقل من كأس آسيا). ليس نسخة من تصنيف FIFA الرسمي.'
        : 'سمعة النادي + مركزه المحلي + مردود نقاطه + لقب الدوري + لقب دوري الأبطال في الموسم. تصنيف داخل عالم اللعبة وليس تصنيف UEFA الرسمي.') + '</p>';
  };

  const archive = () => {
    const h = R.history();
    if (!h.length) return '<div class="card c"><h3>الأرشيف السنوي</h3><p class="sm mut">يُحفظ أول تصنيف رسمي عند نهاية أول موسم تُكمله بعد تثبيت هذا التحديث. لا يمكن توليد تاريخ سابق غير موجود في حفظك.</p></div>';
    const recs = h.slice().reverse();
    const sel = recs.find((r) => r.n === UI.sub.wrYear) || recs[0];
    const u = me();
    let t = '<div class="card"><h3>الأرشيف السنوي</h3><p class="sm mut">اضغط سنة لعرض أفضل 10 أندية ومنتخبات فيها.</p><table class="t"><tr><th>السنة</th><th class="l">أفضل نادٍ</th><th class="l">أفضل منتخب</th></tr>';
    t += recs.map((r) => {
      const c = G.S.clubs[r.clubs[0] && r.clubs[0].i], n = G.NATIONS[r.nations[0] && r.nations[0].i];
      return '<tr class="' + (r.n === sel.n ? 'me' : '') + '" data-a="wrYear" data-v="' + r.n + '" style="cursor:pointer"><td>' + r.y + '</td><td class="l">' + esc(c ? c.name : '—') + '</td><td class="l">' + esc(n ? n.ar : '—') + '</td></tr>';
    }).join('') + '</table></div>';
    const cl = R.rowsOf(sel, 'clubs').slice(0, 10), nt = R.rowsOf(sel, 'nations').slice(0, 10);
    t += '<div class="card wr-board"><div class="wr-bh"><h3>أفضل 10 أندية — ' + sel.y + '</h3></div>' + cl.map((x) => rowHtml('clubs', x, false, x.id === u.club)).join('') + '</div>';
    t += '<div class="card wr-board"><div class="wr-bh"><h3>أفضل 10 منتخبات — ' + sel.y + '</h3></div>' + nt.map((x) => rowHtml('nations', x, false, x.id === u.nat)).join('') + '</div>';
    return t;
  };

  // ---------- Build 28: نوافذ زمنية للأندية (الجاري · سنة · 5 · 10 · 50 · 100) ----------
  const WIN_LABEL = { 1: 'آخر سنة', 5: 'آخر 5 سنوات', 10: 'آخر 10 سنوات', 50: 'آخر 50 سنة', 100: 'آخر 100 سنة' };
  const WIN_SHORT = { 1: 'سنة', 5: '5 سنوات', 10: '10 سنوات', 50: '50 سنة', 100: '100 سنة' };
  const winChips = (sel) => '<div class="chips fl wr-win" role="tablist" aria-label="نافذة التصنيف">' +
    [['now', 'الموسم الجاري']].concat(R.WINDOWS.map((n) => [String(n), WIN_SHORT[n]])).map((x) => '<button class="chip' + (String(sel) === x[0] ? ' on' : '') + '" role="tab" aria-selected="' + (String(sel) === x[0]) + '" data-a="wrWin" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';

  const winRow = (x, mine, n) => {
    const t = [];
    if (x.lgT) t.push('دوري ' + x.lgT);
    if (x.uclT) t.push('أبطال ' + x.uclT);
    return '<div class="wr-row' + (mine ? ' me' : '') + '"><b class="wr-pos">' + x.rank + '</b><span class="wr-emblem">' + UI.badge(x.id, 34) + '</span>' +
      '<span class="wr-name"><b>' + esc(x.name) + '</b><small>' + esc(lgName(x.lg)) + (t.length ? ' · ألقاب مواسمك: ' + t.join(' · ') : '') + '</small></span>' +
      '<span class="wr-score"><b>' + num(x.score) + '</b><small class="wr-avg">' + num(x.avg) + ' / موسم</small></span></div>';
  };

  const windowView = (n) => {
    const W = R.window(n), u = me(), list = W.rows, shown = list.slice(0, SHOW), mine = list.find((x) => x.id === u.club);
    const ranks = R.WINDOWS.map((k) => { const w = k === n ? W : R.window(k), r = w.rows.find((x) => x.id === u.club); return [k, r ? r.rank : null]; });
    let h = '<section class="wr-hero"><small>تصنيف الأندية</small><h2>أقوى أندية ' + WIN_LABEL[n].replace('آخر ', 'آخر ') + '</h2>' +
      '<p>مجموع نقاط أداء كل موسم: مركز الدوري المحلي (بوزن قوة الدوري) + لقب الدوري + مرحلة دوري الأبطال.</p>' + podium('clubs', list) + '</section>';
    h += '<div class="card wr-cover"><div class="row sb"><b>مصدر البيانات</b><span class="sm mut">' + W.real + ' حقيقي · ' + W.est + ' تقديري</span></div>' + UI.bar(W.real / n * 100, '') +
      '<p class="sm mut" style="margin:8px 0 0">' + (W.real === 0 ? 'لم تُكمل أي موسم بعد، فكل المواسم هنا تقديرية من سمعة النادي التاريخية.' : W.est === 0 ? 'كل هذه المواسم لُعبت فعلًا في عالمك.' : W.real + ' من ' + n + ' موسمًا لُعبت فعلًا في عالمك والباقي تقدير تاريخي يُستبدل بنتائج حقيقية مع كل موسم تُكمله.') + '</p></div>';
    h += '<div class="card wr-mine"><div class="sm mut" style="margin-bottom:6px">مكانة ' + esc(G.S.clubs[u.club].name) + '</div><div class="wr-ranks">' +
      ranks.map((x) => '<div class="' + (x[0] === n ? 'on' : '') + '"><b>' + (x[1] || '—') + '</b><small>' + WIN_SHORT[x[0]] + '</small></div>').join('') + '</div></div>';
    h += '<div class="card wr-board"><div class="wr-bh"><h3>أفضل الأندية — ' + WIN_LABEL[n] + '</h3><span class="wr-count">' + num(list.length) + ' ناديًا</span></div>' + shown.map((x) => winRow(x, x.id === u.club, n)).join('');
    if (mine && mine.rank > SHOW) h += '<div class="wr-gap">⋯</div>' + winRow(mine, true, n);
    h += '</div><p class="wr-note">المواسم التي سبقت بدء لعبتك «تقديرية»: تُحسب من سمعة النادي عند بداية اللعبة مع إرث الأندية العريقة وموجات صعود وهبوط عبر العقود — وليست سجلًّا رسميًا. الألقاب المعروضة من مواسمك الفعلية فقط، ولا تُختلق ألقاب تاريخية.</p>';
    return h;
  };

  UI.screens.worldrank = () => {
    const T = UI.tabs('wr', [['clubs', 'الأندية'], ['nations', 'المنتخبات'], ['history', 'الأرشيف']], 'clubs');
    const mode = UI.curTab('wr', 'clubs');
    if (mode === 'history') return T + archive();
    if (mode === 'nations') return T + live('nations');
    const win = UI.sub.wrWin && UI.sub.wrWin !== 'now' ? +UI.sub.wrWin : 'now';
    return T + winChips(win) + (win === 'now' ? live('clubs') : windowView(win));
  };
  UI.titles.worldrank = 'تصنيفات العالم';
  UI.on('wrYear', (v) => { UI.sub.wrYear = +v; });
  UI.on('wrWin', (v) => { UI.sub.wrWin = v === 'now' ? 'now' : +v; });
})(window.G = window.G || {});
