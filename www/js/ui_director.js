/* ui_director.js — واجهة «المدير الفني» (Build 28): بطاقة المدير في شاشة النادي، شاشة «مدربو الأندية» (قائمة لكل دوري + تفاصيل
   وقرارات التعاقد الأخيرة وما يبحث عنه)، وسطر المدير في تشكيلة الخصم. قراءة فقط: لا عشوائية ولا تغيير للحالة. */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc, D = () => G.Director;
  const C = (id) => G.S.clubs[id];
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);

  UI.mgrLine = (cid) => { const m = C(cid) && C(cid).mgr; return m ? 'المدير الفني: ' + esc(m.n) + ' · ' + esc(D().STYLES[m.st].ar) : ''; };
  // ما يبحث عنه المدير الآن (من تقدير التشكيلة الحالية): مراكز ناقصة العدد أو ضعيفة قياسًا بمستوى النادي
  const needsOf = (club) => {
    const v = D().view(club); if (!v) return [];
    return uniq(D().shortPos(club).slice(0, 2).map((x) => x.pos).concat(D().weakSlots(club, v).slice(0, 2).map((x) => x.pos))).slice(0, 3).map((p) => G.POS_AR[p]);
  };

  UI.mgrCard = (cid, opts) => {
    const c = C(cid), m = c && c.mgr; if (!m) return '';
    opts = opts || {};
    const st = D().STYLES[m.st] || D().STYLES.balanced, need = c.light ? [] : needsOf(c);
    const tenure = Math.max(1, G.S.season - m.since + (G.S.phase === 'summer' ? 0 : 1));
    return '<div class="card mg"><div class="row sb"><div class="row"><span class="tl-ic">' + UI.ico(st.ico) + '</span><div><b>المدير الفني · ' + esc(m.n) + '</b><div class="sm mut">' + m.age + ' سنة · ' + tenure + (tenure > 2 ? ' مواسم' : ' موسم') + ' مع النادي</div></div></div><span class="pill b">' + esc(st.ar) + '</span></div>' +
      '<p class="sm mut" style="margin:8px 0 0">' + esc(st.d) + ' يتعاقد بالقيمة الحدّية: لا يوقّع لاعبًا إلا إذا سيبدأ ويحسّن التشكيلة، فلا تكديس لنجوم في مركز واحد.</p>' +
      '<div class="row sb sm" style="margin-top:10px"><span class="mut">كفاءة التعاقدات</span><b>' + m.rt + '</b></div>' + UI.bar(m.rt) +
      (c.light ? '' : '<div class="kv"><span>يبحث الآن عن</span><b>' + (need.length ? esc(need.join('، ')) : 'لا ثغرات واضحة') + '</b></div>') +
      ((m.log && m.log.length) ? '<div class="mg-log">' + m.log.map((l) => '<div class="sm"><span class="mut">م' + l.s + '</span> ' + esc(l.t) + '</div>').join('') + '</div>' : '<div class="sm mut" style="margin-top:8px">لا تعاقدات مسجّلة بعد؛ تظهر قراراته هنا مع سببها.</div>') +
      ((m.hist && m.hist.length && !opts.noHist) ? '<div class="sm mut" style="margin-top:8px">سبقه: ' + m.hist.map((h) => esc(h.n)).join('، ') + '</div>' : '') + '</div>';
  };

  const lgIds = () => G.LEAGUE_ORDER.filter((l) => G.LEAGUES[l] && G.LEAGUES[l].tier === 1);
  UI.screens.mgrs = () => {
    const S = G.S, ids = lgIds(), mine = G.World.viewLg ? G.World.viewLg() : ids[0];
    const sel = UI.sub.mgLg || (ids.indexOf(mine) >= 0 ? mine : ids[0]);
    const chips = '<div class="chips fl st-flt" role="tablist" aria-label="الدوري">' + ids.concat(['oth']).map((l) => '<button class="chip' + (sel === l ? ' on' : '') + '" role="tab" aria-selected="' + (sel === l) + '" data-a="mgLg" data-v="' + l + '">' + (l === 'oth' ? 'أندية أخرى' : esc(G.LEAGUES[l].short || G.LEAGUES[l].ar)) + '</button>').join('') + '</div>';
    let list = Object.keys(S.clubs).map((id) => S.clubs[id]).filter((c) => c.mgr && (sel === 'oth' ? !c.lg || ids.indexOf(c.lg) < 0 : c.lg === sel) && (sel !== 'oth' || !c.light)).sort((a, b) => b.rep - a.rep || (a.id < b.id ? -1 : 1));
    let h = '<div class="card hl"><div class="row sb"><h2 style="margin:0">مدربو الأندية</h2><span class="pill b">' + Object.values(S.clubs).filter((c) => c.mgr).length + ' مدربًا</span></div>' +
      '<p class="sm mut" style="margin:6px 0 0">لكل نادٍ مدير فني بأسلوب وكفاءة يقرّران الصفقات: يسدّ الثغرات أولًا، لا يكدّس النجوم في مركز واحد، ويبيع الفائض لمن يحتاجه. تُقيل الأندية مدربيها بعد المواسم المخيّبة. الأسماء مولَّدة وليست حقيقية.</p></div>';
    const ch = S.mgrChanges || [];
    if (ch.length && S.phase === 'summer') h += '<div class="card"><h3>تغييرات الصيف</h3>' + ch.slice(0, 8).map((x) => '<div class="kv"><span>' + esc(UI.cname(x.id)) + '</span><span class="sm">' + esc(x.to) + ' <span class="mut">خلفًا لـ ' + esc(x.from) + '</span></span></div>').join('') + (ch.length > 8 ? '<div class="sm mut">و' + (ch.length - 8) + ' تغييرات أخرى</div>' : '') + '</div>';
    h += chips + '<div class="card st-list">' + (list.length ? list.map((c) => {
      const st = D().STYLES[c.mgr.st], last = c.mgr.log && c.mgr.log[0];
      return '<button class="st-r" data-a="mgrOpen" data-v="' + c.id + '"><span class="mg-b">' + UI.badge(c.id, 36) + '</span><span class="st-n"><span class="st-nm">' + esc(c.mgr.n) + '</span></span><span class="st-c">' + esc(c.name) + ' · ' + esc(st.ar) + '</span><span class="st-s"><b>' + c.mgr.rt + '</b> كفاءة</span>' + (last ? '<span class="st-t">' + esc(last.t) + '</span>' : '') + '</button>';
    }).join('') : '<div class="mut c">لا أندية هنا.</div>') + '</div>';
    return h;
  };
  UI.titles.mgrs = 'مدربو الأندية';
  UI.on('mgLg', (v) => { UI.sub.mgLg = v; });
  UI.on('mgrOpen', (id) => { const c = C(id); if (!c) return false; UI.sheet('<div class="sqp"><div class="row" style="gap:10px;margin-bottom:8px">' + UI.badge(id, 36) + '<h3 style="margin:0">' + esc(c.name) + '</h3></div>' + UI.mgrCard(id) + '<button class="btn pri" data-a="closeSheet">إغلاق</button></div>'); return false; });
})(window.G = window.G || {});
