/* ui_press.js — صفحة الصحافة: أخبار الصحف العشر (مديح/نقد/أخبار) بمرشّحات، وبطاقة «آخر الأخبار» في الرئيسية.
 * واجهة فقط: لا U.rnd ولا تعديل للحالة سوى علامة «مقروء». */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc;
  UI.titles.press = 'الصحافة';

  const TONE_CLS = { p: 'g', c: 'r', n: 'b' };
  const TYPES = [['all', 'الكل'], ['mine', 'عنك'], ['p', 'مديح'], ['c', 'نقد'], ['n', 'أخبار']];

  function card(a, isNew) {
    const o = G.Press.OUTLETS[a.o], P = a.pid ? G.S.players[a.pid] : null;
    return '<div class="card" style="' + (a.u ? 'border-color:rgba(var(--cc-rgb)/.5);' : '') + '"><div class="row sb" style="margin-bottom:6px"><span class="sm"><b>' + o.ic + ' ' + esc(o.n) + '</b> <span class="mut">· ' + (a.s === G.S.season ? '' : G.Season.label(a.s) + ' · ') + 'الأسبوع ' + a.w + '</span></span>' +
      '<span class="row" style="gap:6px">' + (isNew ? '<span class="pill y">جديد</span>' : '') + (a.u ? '<span class="pill y">عنك</span>' : '') + '<span class="pill ' + TONE_CLS[a.t] + '">' + G.Press.TONE_AR[a.t] + '</span></span></div>' +
      '<div style="font-weight:700;line-height:1.5">' + esc(a.h) + '</div><p class="sm mut" style="margin:6px 0 0;line-height:1.7">' + esc(a.b) + '</p>' +
      (P && !a.u ? '<div class="sm mut" style="margin-top:6px">' + esc(P.n) + ' · ' + esc(UI.cname(P.club)) + ' · ' + G.POS_AR[P.pos] + '</div>' : '') + '</div>';
  }

  UI.screens.press = () => {
    const pr = G.Press.get();
    if (UI._pressBase == null) UI._pressBase = pr.seen;
    const base = UI._pressBase;
    const ty = UI.sub.pressT || 'all', ou = UI.sub.pressO == null ? 'all' : UI.sub.pressO, lim = UI.sub.pressN || 25;
    const f = {};
    if (ty === 'mine') f.mine = true; else if (ty !== 'all') f.tone = ty;
    if (ou !== 'all') f.outlet = Number(ou);
    const list = G.Press.list(f);
    G.Press.markSeen();
    let h = '<div class="card hl"><div class="row sb"><h2 style="margin:0">📰 الصحافة</h2><span class="pill b">' + pr.feed.length + ' خبرًا</span></div><div class="sm mut" style="margin-top:6px">عشر صحف ومواقع تكتب عنك وعن نجوم العالم: مديح وانتقاد وأخبار. تتبدّل النبرة بحسب الصحيفة.</div></div>';
    h += '<div class="chips">' + TYPES.map((t) => '<button class="chip ' + (ty === t[0] ? 'on' : '') + '" data-a="pressT" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    h += '<div class="chips" style="overflow-x:auto;flex-wrap:nowrap;white-space:nowrap"><button class="chip ' + (ou === 'all' ? 'on' : '') + '" data-a="pressO" data-v="all">كل الصحف</button>' + G.Press.OUTLETS.map((o, i) => '<button class="chip ' + (String(ou) === String(i) ? 'on' : '') + '" data-a="pressO" data-v="' + i + '">' + o.ic + ' ' + esc(o.n) + '</button>').join('') + '</div>';
    if (!list.length) return h + '<div class="card mut c">' + (pr.feed.length ? 'لا أخبار بهذا الترشيح.' : 'لم تصدر أخبار بعد — ستبدأ الصحف الكتابة مع انطلاق الموسم.') + '</div>';
    h += list.slice(0, lim).map((a) => card(a, a.id > base)).join('');
    if (list.length > lim) h += '<button class="btn" data-a="pressMore">عرض المزيد (' + (list.length - lim) + ')</button>';
    return h;
  };

  // بطاقة الرئيسية: خبر عنك + أحدث الأخبار
  UI.newsCard = () => {
    UI._pressBase = null;
    const pr = G.Press ? G.Press.get() : null;
    if (!pr || !pr.feed.length) return '';
    const mine = pr.feed.find((a) => a.u), rest = pr.feed.filter((a) => a !== mine).slice(0, mine ? 2 : 3), items = (mine ? [mine] : []).concat(rest), un = G.Press.unread();
    return '<div class="card"><div class="row sb"><b>📰 آخر الأخبار</b><button class="btn sm" data-a="go" data-v="press">' + (un ? un + ' جديد · ' : '') + 'كل الأخبار</button></div>' +
      items.map((a) => { const o = G.Press.OUTLETS[a.o]; return '<div style="padding:8px 0;border-top:1px solid rgba(36,50,79,.5)"><div class="sm mut">' + o.ic + ' ' + esc(o.n) + ' · <span class="' + (a.t === 'p' ? 'pos' : a.t === 'c' ? 'neg' : '') + '">' + G.Press.TONE_AR[a.t] + '</span>' + (a.u ? ' · <b class="gold">عنك</b>' : '') + '</div><div style="font-weight:600;line-height:1.5">' + esc(a.h) + '</div></div>'; }).join('') + '</div>';
  };

  UI.on('pressT', (v) => { UI.sub.pressT = v; UI.sub.pressN = 25; });
  UI.on('pressO', (v) => { UI.sub.pressO = v; UI.sub.pressN = 25; });
  UI.on('pressMore', () => { UI.sub.pressN = (UI.sub.pressN || 25) + 25; });
})(window.G = window.G || {});
