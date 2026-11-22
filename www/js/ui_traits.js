/* ui_traits.js — واجهة «القدرات المميزة» (Build 28): أيقونات/رقائق القدرات، شاشة «نجوم العالم»، وبطاقة نجم (قدراته ومنافسوه).
   قراءة فقط: لا يستهلك U.rnd ولا يغيّر الحالة. */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc, T = () => G.Traits;
  const GRP = G.POS_GROUP;
  const KIND = { machine: 'att', sniper: 'att', fox: 'att', power: 'att', speed: 'att', dribbler: 'att', wingback: 'att', prodigy: 'att', maestro: 'mid', engine: 'mid', anchor: 'def', wall: 'def', keeper: 'def' };

  // أيقونات صغيرة بجانب الاسم (مع عنوان للقارئ الشاشي)
  UI.traitIcons = (p) => {
    const tr = p && p.tr; if (!tr || !tr.length) return '';
    return '<span class="trs" role="img" aria-label="' + esc(tr.map((k) => T().DEFS[k].ar).join('، ')) + '">' + tr.map((k) => '<i class="tri k-' + (KIND[k] || 'att') + '" title="' + esc(T().DEFS[k].ar) + '">' + UI.ico(T().DEFS[k].ico) + '</i>').join('') + '</span>';
  };
  UI.traitChips = (p) => {
    const tr = p && p.tr; if (!tr || !tr.length) return '';
    return '<div class="trc-w">' + tr.map((k) => '<span class="trc k-' + (KIND[k] || 'att') + '">' + UI.ico(T().DEFS[k].ico) + '<b>' + esc(T().DEFS[k].ar) + '</b></span>').join('') + '</div>';
  };
  // وصف الأثر بالعربية (أرقام فعلية من التعريف)
  const effect = (d) => {
    const o = [];
    if (d.g && d.g > 1) o.push('حصته من أهداف فريقه +' + Math.round((d.g - 1) * 100) + '٪');
    if (d.a && d.a > 1) o.push('حصته من صناعة فريقه +' + Math.round((d.a - 1) * 100) + '٪');
    if (d.tA || d.tM) o.push('يرفع قوة هجوم/وسط فريقه');
    if (d.tD) o.push('يرفع قوة دفاع فريقه');
    return o.join(' · ');
  };
  UI.traitList = (p) => {
    const tr = p && p.tr; if (!tr || !tr.length) return '';
    return '<div class="tr-list">' + tr.map((k) => { const d = T().DEFS[k]; return '<div class="tr-it k-' + (KIND[k] || 'att') + '"><span class="tr-ic">' + UI.ico(d.ico) + '</span><div><b>' + esc(d.ar) + '</b><div class="sm mut">' + esc(d.d) + '</div><div class="sm tr-fx">' + esc(effect(d)) + '</div></div></div>'; }).join('') + '</div>';
  };

  const lg = (p) => (p.st && p.st.lg) || [0, 0, 0];
  // هدّافو الدوريات الخمسة هذا الموسم (قراءة فقط)
  const topScorers = (n) => {
    const out = [];
    ['ESP1', 'ENG1', 'ITA1', 'GER1', 'FRA1'].forEach((l) => { if (G.LEAGUES[l]) G.World.scorers(l, 5).forEach((p) => out.push(p)); });
    return out.sort((a, b) => lg(b)[1] - lg(a)[1] || b.ovr - a.ovr).slice(0, n);
  };

  const row = (p) => {
    const s = lg(p), att = GRP[p.pos] === 'att' || GRP[p.pos] === 'mid';
    return '<button class="st-r" data-a="starOpen" data-v="' + p.id + '"><b class="sq-o ' + UI.tierCls(p) + '">' + p.ovr + '</b><span class="st-n"><span class="st-nm">' + esc(p.n) + '</span>' + UI.traitIcons(p) + '</span><span class="st-c">' + esc(UI.cname(p.club)) + ' · ' + G.POS_AR[p.pos] + ' · ' + p.age + '</span>' +
      '<span class="st-s">' + (s[0] ? (att ? '<b>' + s[1] + '</b> هدف · <b>' + s[2] + '</b> صناعة' : s[0] + ' مباراة') : '—') + '</span><span class="st-t">' + esc(p.tr.map((k) => T().DEFS[k].ar).join(' · ')) + '</span></button>';
  };

  UI.screens.stars = () => {
    const f = UI.sub.stF || 'all', all = !!UI.sub.stAll;
    const holders = T().holders(), cnt = {};
    holders.forEach((p) => p.tr.forEach((k) => { cnt[k] = (cnt[k] || 0) + 1; }));
    let list = f === 'all' ? holders : holders.filter((p) => p.tr.indexOf(f) >= 0);
    const flt = '<div class="chips fl st-flt" role="tablist" aria-label="تصفية بالقدرة"><button class="chip' + (f === 'all' ? ' on' : '') + '" role="tab" aria-selected="' + (f === 'all') + '" data-a="starFilter" data-v="all">الكل · ' + holders.length + '</button>' +
      T().ORDER.filter((k) => cnt[k]).map((k) => '<button class="chip' + (f === k ? ' on' : '') + '" role="tab" aria-selected="' + (f === k) + '" data-a="starFilter" data-v="' + k + '">' + esc(T().DEFS[k].ar) + ' · ' + cnt[k] + '</button>').join('') + '</div>';
    let h = '<div class="card hl"><div class="row sb"><h2 style="margin:0">نجوم العالم</h2><span class="pill b">' + holders.length + ' نجمًا</span></div>' +
      '<p class="sm mut" style="margin:6px 0 0">كل نجم يحمل قدرات تميّزه عن غيره: تزيد حصته من أهداف فريقه وتمريراته الحاسمة، وبعضها يرفع قوة فريقه كله. تُراجع القدرات في نهاية كل موسم: يظهر نجوم جدد ويفقدها من يتراجع مستواه.</p></div>';
    const sc = topScorers(6);
    if (f === 'all' && sc.length && sc[0] && lg(sc[0])[1] > 0) {
      h += '<div class="card"><h3>سباق الهدّافين — الدوريات الخمسة</h3>' + sc.map((p, i) => '<button class="st-r st-r2" data-a="starOpen" data-v="' + p.id + '"><b class="st-rk">' + (i + 1) + '</b><span class="st-n"><span class="st-nm">' + esc(p.n) + '</span>' + UI.traitIcons(p) + '</span><span class="st-c">' + esc(UI.cname(p.club)) + '</span><span class="st-s"><b>' + lg(p)[1] + '</b> هدف</span></button>').join('') + '</div>';
    }
    h += flt;
    const shown = all ? list : list.slice(0, 20);
    h += '<div class="card st-list">' + (shown.length ? shown.map(row).join('') : '<div class="mut c">لا نجوم بهذه القدرة حاليًا.</div>') + '</div>';
    if (list.length > 20) h += '<button class="btn sm" style="width:100%" data-a="starAll">' + (all ? 'عرض أقل' : 'عرض الكل (' + list.length + ')') + '</button>';
    return h;
  };
  UI.titles.stars = 'نجوم العالم';

  // بطاقة نجم: قدراته بأثرها، إحصاءاته، ومنافسوه في المركز نفسه
  UI.starSheet = (id) => {
    const q = G.S.players[id]; if (!q) return false;
    const s = G.Season.statOf(q, 'lg'), g = GRP[q.pos];
    const FAM = { ST: 'ST', LW: 'W', RW: 'W', CAM: 'CAM', CM: 'CM', CDM: 'CDM', LB: 'FB', RB: 'FB', CB: 'CB', GK: 'GK' };
    const rivals = Object.values(G.S.players).filter((x) => x.id !== q.id && !x.user && FAM[x.pos] === FAM[q.pos] && x.ovr >= 80 && x.club !== q.club)
      .sort((a, b) => (g === 'gk' || g === 'def' ? b.ovr - a.ovr : lg(b)[1] + lg(b)[2] - lg(a)[1] - lg(a)[2] || b.ovr - a.ovr)).slice(0, 4);
    UI.sheet('<div class="sqp"><div class="sqp-h"><div class="ovr ' + UI.tierCls(q) + '">' + q.ovr + '</div><div class="grow"><h3>' + esc(q.n) + '</h3><div class="sm mut">' + G.POS_AR[q.pos] + ' · ' + q.age + ' سنة · ' + esc(UI.natName(q.nat)) + ' · ' + esc(UI.cname(q.club)) + '</div></div></div>' +
      (q.tr && q.tr.length ? '<h4 style="margin:12px 0 6px">القدرات المميزة</h4>' + UI.traitList(q) : '<div class="card mut sm">لا قدرات مميزة حاليًا.</div>') +
      '<div class="grid3" style="margin:12px 0"><div class="stat"><b>' + s.apps + '</b><small>مباراة دوري</small></div><div class="stat"><b>' + s.g + '</b><small>هدف</small></div><div class="stat"><b>' + s.a + '</b><small>صناعة</small></div></div>' +
      (rivals.length ? '<h4 style="margin:12px 0 6px">منافسوه في مركزه</h4>' + rivals.map((x) => { const t = lg(x); return '<div class="kv st-rv"><span class="st-rn">' + esc(x.n) + UI.traitIcons(x) + '<small class="mut"> ' + esc(UI.cname(x.club)) + '</small></span><b>' + x.ovr + (t[0] ? ' · ' + t[1] + '/' + t[2] : '') + '</b></div>'; }).join('') : '') +
      '<button class="btn pri" data-a="closeSheet">إغلاق</button></div>');
    return false;
  };
  UI.on('starOpen', (id) => UI.starSheet(id));
  UI.on('starFilter', (v) => { UI.sub.stF = v; UI.sub.stAll = false; });
  UI.on('starAll', () => { UI.sub.stAll = !UI.sub.stAll; });
})(window.G = window.G || {});
