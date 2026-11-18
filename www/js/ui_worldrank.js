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
  const lgName = (lg) => (lg && G.leagueName ? G.leagueName(lg) : 'نادٍ حر');
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
    : esc(lgName(x.lg)) + (x.pos ? ' · المركز المحلي ' + x.pos : ''));

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

  UI.screens.worldrank = () => {
    const T = UI.tabs('wr', [['clubs', 'الأندية'], ['nations', 'المنتخبات'], ['history', 'الأرشيف']], 'clubs');
    const mode = UI.curTab('wr', 'clubs');
    return T + (mode === 'history' ? archive() : live(mode === 'nations' ? 'nations' : 'clubs'));
  };
  UI.titles.worldrank = 'تصنيفات العالم';
  UI.on('wrYear', (v) => { UI.sub.wrYear = +v; });
})(window.G = window.G || {});
