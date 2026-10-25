/* ui_card.js — بطاقة اللاعب بأسلوب FIFA (4 فئات)، لون النادي، رسوم مسيرتي، وتوقّع المباراة مع التشكيلة على الملعب.
   عرض فقط: لا يغيّر حالة اللعبة ولا يستهلك العشوائية (التوقعات تأتي من G.Lineup.predict وهي خالية من U.rnd). */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const pct = (v) => Math.round(v * 100) + '%';
  const lum = (hex) => { const h = hex.replace('#', ''); return (0.299 * parseInt(h.substr(0, 2), 16) + 0.587 * parseInt(h.substr(2, 2), 16) + 0.114 * parseInt(h.substr(4, 2), 16)) / 255; };

  // ---------- الفئات ولون النادي ----------
  UI.tier = (p) => { const o = p.ovr; return o >= 85 ? { id: 'elite', ar: 'نخبة' } : o >= 75 ? { id: 'gold', ar: 'ذهبية' } : o >= 65 ? { id: 'silver', ar: 'فضية' } : { id: 'bronze', ar: 'برونزية' }; };
  UI.tierCls = (p) => 't-' + UI.tier(p).id;
  // لون بارز بما يكفي على الخلفية الداكنة من ألوان النادي (وإلا الأخضر الافتراضي)
  UI.clubAccent = (id) => {
    const c = G.S && G.S.clubs[id];
    if (!c || !c.c) return '#22c55e';
    for (const col of c.c) { const l = lum(col); if (l >= 0.28 && l <= 0.93) return col; }
    return '#22c55e';
  };

  // ---------- بطاقة FIFA ----------
  UI.fifaCard = (p) => {
    const t = UI.tier(p), ax = UI.axes(p);
    const stats = ax.map((k) => '<div><b>' + (p.a[k] || 0) + '</b><span>' + UI.ATTR_SHORT[k] + '</span></div>').join('');
    return '<div class="fcw"><div class="fcard t-' + t.id + '"><div class="fc-top"><div class="fc-l"><div class="fc-ovr">' + p.ovr + '</div><div class="fc-pos">' + p.pos + '</div><div class="fc-bd">' + UI.badge(p.club, 26) + '</div></div>' +
      '<div class="fc-av">' + UI.avatar(p.look, p.club, 118) + '</div></div><div class="fc-name">' + esc(p.n) + '</div><div class="fc-ln"></div><div class="fc-stats">' + stats + '</div>' +
      '<div class="fc-foot">' + t.ar + ' · ' + esc(UI.natName(p.nat)) + '</div></div></div>';
  };
  UI.on('cardOpen', () => {
    UI.sheetRender(() => {
      const p = me();
      return '<h3>🃏 بطاقتي</h3>' + UI.fifaCard(p) + '<div class="row sb sm" style="margin-bottom:4px"><span>الفئة: <b>' + UI.tier(p).ar + '</b></span><span>الإمكانات: ' + UI.stars(p.pot) + '</span></div>' +
        '<div class="card" style="margin-top:6px">' + UI.radar(p) + '</div><p class="sm mut">الفئة بحسب تقييمك: برونزية تحت 65، فضية 65–74، ذهبية 75–84، نخبة 85 فأكثر.</p><button class="btn" data-a="closeSheet">إغلاق</button>';
    });
    return false;
  });

  // ---------- رسوم المسيرة ----------
  const shortLabel = (l) => String(l).replace(/^\d{2}(\d{2})\/(\d{2})$/, '$1/$2');
  UI.careerCharts = (p) => {
    const S = G.S, car = p.car || [], playing = S.phase === 'season' || S.phase === 'summer';
    let h = '';
    // تطوّر التقييم: بداية المسيرة ثم نهاية كل موسم ثم الآن
    const pts = [];
    if (car.length) pts.push({ l: 'بداية', v: car[0].ovrStart });
    car.forEach((r) => pts.push({ l: shortLabel(r.label), v: r.ovrEnd }));
    if (playing) pts.push({ l: car.length ? 'الآن' : 'بداية', v: p.ovr });
    h += '<div class="card"><h4>📈 تطوّر تقييمك العام</h4>' + UI.lineChart(pts, { ref: { v: p.pot, label: 'الإمكانات ' + p.pot }, h: 158 }) + '</div>';
    // تقييمات المباريات
    const log = (S.matchLog || []).filter((m) => m.mins > 0 && m.rating).slice(0, 20).reverse().map((m) => {
      const gf = m.userSide === 'h' ? m.score.h : m.score.a, ga = m.userSide === 'h' ? m.score.a : m.score.h;
      let res = gf > ga ? 'w' : gf < ga ? 'l' : 'd';
      if (res === 'd' && m.pens) res = (m.userSide === 'h' ? m.pens.h - m.pens.a : m.pens.a - m.pens.h) > 0 ? 'w' : 'l';
      const opp = m.userSide === 'h' ? m.a : m.h;
      return { r: m.rating, res, tip: UI.cname(opp) + ' ' + gf + '-' + ga };
    });
    h += '<div class="card"><h4>📊 تقييماتك في آخر ' + (log.length || '') + ' مباراة</h4>' + UI.ratingBars(log) + (log.length ? '<div class="sm mut c"><span class="lg lg-g"></span> 7 فأكثر &nbsp; <span class="lg lg-y"></span> 6.2–7 &nbsp; <span class="lg lg-r"></span> أقل</div><div class="sm mut c">النقطة تحت العمود = نتيجة المباراة: <span class="rs-dot w"></span>فوز <span class="rs-dot d"></span>تعادل <span class="rs-dot l"></span>خسارة</div>' : '')+ '</div>';
    // أهداف وصناعة لكل موسم
    const rows = car.map((r) => ({ l: shortLabel(r.label), g: r.lg.g + r.uc.g, a: r.lg.a + r.uc.a }));
    if (playing) { const lg = G.Season.statOf(p, 'lg'), uc = G.Season.statOf(p, 'uc'); rows.push({ l: 'الآن', g: lg.g + uc.g, a: lg.a + uc.a }); }
    if (rows.some((r) => r.g || r.a)) h += '<div class="card"><h4>⚽ أهدافك وصناعتك لكل موسم</h4>' + UI.pairBars(rows) + '</div>';
    return h;
  };

  // ---------- توقّع المباراة ----------
  const fixOf = (id) => G.Season.findFix(id);
  const pred = (fix) => G.safe(() => G.Lineup.predict(fix.h, fix.a, { neutral: !!fix.neutral }), 'predict');
  UI.predCard = (fix) => {
    const u = me(), pr = pred(fix);
    if (!pr) return '';
    const mine = fix.h === u.club ? 'h' : 'a', opp = mine === 'h' ? 'a' : 'h';
    const w = mine === 'h' ? pr.pH : pr.pA, l = mine === 'h' ? pr.pA : pr.pH, d = pr.pD, t = pr.top[0];
    const sc = mine === 'h' ? t.h + '-' + t.a : t.a + '-' + t.h;
    return '<div class="pred"><div class="row sb sm"><b>🔮 توقّع نتيجة الـ90 دقيقة</b><span class="mut">تقدير إحصائي</span></div>' +
      '<div class="pbar"><i class="pw" style="width:' + (w * 100).toFixed(1) + '%"></i><i class="pd" style="width:' + (d * 100).toFixed(1) + '%"></i><i class="pl" style="width:' + (l * 100).toFixed(1) + '%"></i></div>' +
      '<div class="row sb sm"><span class="pos">فوز ' + pct(w) + '</span><span class="gold">تعادل ' + pct(d) + '</span><span class="neg">خسارة ' + pct(l) + '</span></div>' +
      '<div class="sm mut" style="margin-top:6px">الأهداف المتوقعة <b class="ltr">' + pr.lam[mine].toFixed(1) + ' – ' + pr.lam[opp].toFixed(1) + '</b> · أرجح نتيجة <b class="ltr">' + sc + '</b> (' + pct(t.p) + ')</div>' +
      '<button class="btn sm" data-a="predOpen" data-v="' + fix.id + '">📋 التشكيلة المتوقعة وقوة الفريقين</button></div>';
  };
  UI.on('predOpen', (fid) => { UI.sub.pp = 'm'; UI._pf = fid; UI.sheetRender(predSheet); return false; });
  UI.on('ppTab', (v) => { UI.sub.pp = v; UI.sheetRender(predSheet); return false; });
  function predSheet() {
    const fix = fixOf(UI._pf), u = me();
    if (!fix) return '<h3>التشكيلة</h3><div class="mut">المباراة غير متاحة.</div><button class="btn" data-a="closeSheet">إغلاق</button>';
    const pr = pred(fix), mine = fix.h === u.club ? 'h' : 'a', opp = mine === 'h' ? 'a' : 'h', tab = UI.sub.pp === 'o' ? 'o' : 'm', side = tab === 'm' ? mine : opp, cid = fix[side];
    const bar = (lab, a, b) => '<div class="vs"><b class="ltr">' + Math.round(a) + '</b><div><div class="sm mut c">' + lab + '</div><div class="vsb"><i style="width:' + U.clamp(a - 30, 4, 70) / 0.7 + '%"></i><i class="o" style="width:' + U.clamp(b - 30, 4, 70) / 0.7 + '%"></i></div></div><b class="ltr">' + Math.round(b) + '</b></div>';
    const R = pr.R;
    const benchNames = pr.L[side].bench.map((id) => G.S.players[id]).filter(Boolean).map((p) => esc(String(p.n).split(/\s+/).slice(-1)[0]) + ' <span class="mut">' + p.ovr + '</span>').join(' · ');
    return '<h3>📋 ' + esc(UI.fixLabel(fix)) + '</h3>' +
      '<div class="sm mut c" style="margin-bottom:6px">القوة (تشكيلة متوقعة): ' + UI.clubTag(fix[mine], 16) + ' ضد ' + UI.clubTag(fix[opp], 16) + '</div>' +
      bar('الهجوم', R[mine].A, R[opp].A) + bar('الوسط', R[mine].M, R[opp].M) + bar('الدفاع', R[mine].D, R[opp].D) + bar('الحارس', R[mine].gk, R[opp].gk) +
      '<div class="chips" style="margin-top:10px"><button class="chip ' + (tab === 'm' ? 'on' : '') + '" data-a="ppTab" data-v="m">فريقك</button><button class="chip ' + (tab === 'o' ? 'on' : '') + '" data-a="ppTab" data-v="o">الخصم</button></div>' +
      '<div class="sm mut c" style="margin-top:6px">' + esc(UI.cname(cid)) + ' · خطة <span class="ltr">' + esc(G.S.clubs[cid].form) + '</span>' + (tab === 'm' ? ' · أنت: ' + UI.rolePill(u.role) : '') + '</div>' +
      UI.pitch(pr.L[side].xi, cid, { hi: u.id }) + '<div class="sm mut">الاحتياط: ' + (benchNames || '—') + '</div>' +
      '<p class="sm mut">التشكيلة تقدير لأرجح التشكيلات؛ قد يغيّر المدرب بعض الأسماء، وتُحسب المحاكاة بعشوائية المباراة الفعلية.</p><button class="btn" data-a="closeSheet">إغلاق</button>';
  }
})(window.G = window.G || {});
