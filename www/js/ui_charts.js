/* ui_charts.js — رسوم SVG خفيفة بلا مكتبات: رادار السمات، خط التطوّر، أعمدة التقييمات والأهداف، وعرض التشكيلة على الملعب.
   كل الدوال تُرجع نصوص HTML/SVG فقط (لا تلمس حالة اللعبة ولا العشوائية). الألوان من متغيّرات CSS فتتبع الثيم. */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

  UI.ATTR_SHORT = { pac: 'السرعة', sho: 'التسديد', pas: 'التمرير', dri: 'المراوغة', def: 'الدفاع', phy: 'البدنية', iq: 'الوعي', gk: 'الحراسة' };
  // محاور البطاقة والرادار: ستة لكل لاعب (الحارس: سماته الفعلية الستّ الأعلى صلة)
  UI.axes = (p) => (p.pos === 'GK' ? ['gk', 'iq', 'phy', 'pac', 'pas', 'dri'] : ['pac', 'sho', 'pas', 'dri', 'def', 'phy']);

  // ---------- الرادار ----------
  // base (اختياري): قيم بداية الموسم تُرسم منقّطة للمقارنة
  UI.radar = (p, opt) => {
    opt = opt || {};
    const ax = UI.axes(p), W = 320, H = 268, cx = 160, cy = 138, R = 80;
    const sc = (v) => U.clamp((v - 20) / 75, 0.04, 1);
    const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const poly = (vals) => vals.map((v, i) => pt(i, R * sc(v)).map((n) => n.toFixed(1)).join(',')).join(' ');
    const cur = ax.map((k) => p.a[k] || 0);
    const base = opt.base !== false && p.gain ? ax.map((k) => (p.a[k] || 0) - (p.gain[k] || 0)) : null;
    const grew = base && base.some((v, i) => v !== cur[i]);
    let s = '<svg class="radar" viewBox="0 0 ' + W + ' ' + H + '" style="direction:ltr" role="img" aria-label="مخطط سمات اللاعب">';
    [40, 60, 80, 95].forEach((v) => { s += '<polygon class="ch-ring" points="' + ax.map((_, i) => pt(i, R * sc(v)).map((n) => n.toFixed(1)).join(',')).join(' ') + '"/>'; });
    ax.forEach((_, i) => { const e = pt(i, R); s += '<line class="ch-axis" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>'; });
    if (grew) s += '<polygon class="rd-base" points="' + poly(base) + '"/>';
    s += '<polygon class="rd-cur" points="' + poly(cur) + '"/>';
    cur.forEach((v, i) => { const q = pt(i, R * sc(v)); s += '<circle class="rd-dot" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.2"/>'; });
    ax.forEach((k, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 3, sx = Math.cos(a), sy = Math.sin(a), lx = cx + (R + 14) * sx, ly = cy + (R + 14) * sy;
      const anchor = sx > 0.3 ? 'start' : sx < -0.3 ? 'end' : 'middle', off = sy < -0.5 ? -4 : sy > 0.5 ? 24 : 9, d = grew ? cur[i] - base[i] : 0;
      s += '<text class="rd-v" x="' + lx.toFixed(1) + '" y="' + (ly + off - 13).toFixed(1) + '" text-anchor="' + anchor + '">' + cur[i] + (d > 0 ? '<tspan class="rd-up"> +' + d + '</tspan>' : '') + '</text>' +
        '<text class="ch-txt" x="' + lx.toFixed(1) + '" y="' + (ly + off).toFixed(1) + '" text-anchor="' + anchor + '">' + UI.ATTR_SHORT[k] + '</text>';
    });
    return s + '</svg>' + (grew ? '<div class="sm mut c"><span class="lg lg-cur"></span> الآن &nbsp; <span class="lg lg-base"></span> بداية الموسم</div>' : '');
  };

  // ---------- خط التطوّر ----------
  // pts: [{l: تسمية المحور, v: قيمة}]؛ opt: {h, ref:{v,label}, min, max, dec, color, every}
  UI.lineChart = (pts, opt) => {
    opt = opt || {};
    if (!pts || pts.length < 2) return '<div class="mut sm c" style="padding:18px 0">تظهر الرسمة بعد موسم واحد على الأقل.</div>';
    const W = 320, H = opt.h || 150, L = 30, Rr = 12, T = 16, B = 24, dec = opt.dec || 0;
    let lo = opt.min != null ? opt.min : Math.min.apply(null, pts.map((q) => q.v)), hi = opt.max != null ? opt.max : Math.max.apply(null, pts.map((q) => q.v));
    if (opt.ref) { lo = Math.min(lo, opt.ref.v); hi = Math.max(hi, opt.ref.v); }
    if (hi - lo < 4 * (dec ? 0.5 : 1)) { hi += 2; lo -= 2; }
    const pad = (hi - lo) * 0.12; lo = opt.min != null ? lo : lo - pad; hi = opt.max != null ? hi : hi + pad;
    const X = (i) => L + (W - L - Rr) * (pts.length === 1 ? 0.5 : i / (pts.length - 1)), Y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const fmt = (v) => (dec ? v.toFixed(dec) : String(Math.round(v)));
    let s = '<svg class="lchart" viewBox="0 0 ' + W + ' ' + H + '" style="direction:ltr" role="img">';
    for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3, y = Y(v); s += '<line class="ch-grid" x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + y.toFixed(1) + '"/><text class="ch-txt" x="' + (L - 4) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>'; }
    if (opt.ref) { const y = Y(opt.ref.v); s += '<line class="ch-ref" x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + y.toFixed(1) + '"/><text class="ch-reft" x="' + (W - Rr) + '" y="' + (y - 3).toFixed(1) + '" text-anchor="end">' + esc(opt.ref.label || '') + '</text>'; }
    const line = pts.map((q, i) => X(i).toFixed(1) + ',' + Y(q.v).toFixed(1)).join(' ');
    s += '<polygon class="ch-area" points="' + X(0).toFixed(1) + ',' + (H - B) + ' ' + line + ' ' + X(pts.length - 1).toFixed(1) + ',' + (H - B) + '"/><polyline class="ch-line" points="' + line + '"/>';
    const every = opt.every || Math.ceil(pts.length / 7);
    pts.forEach((q, i) => {
      s += '<circle class="ch-dot" cx="' + X(i).toFixed(1) + '" cy="' + Y(q.v).toFixed(1) + '" r="' + (i === pts.length - 1 ? 4 : 2.6) + '"/>';
      if (i % every === 0 || i === pts.length - 1) s += '<text class="ch-txt" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(q.l) + '</text>';
    });
    const last = pts[pts.length - 1];
    s += '<text class="ch-last" x="' + X(pts.length - 1).toFixed(1) + '" y="' + (Y(last.v) - 8).toFixed(1) + '" text-anchor="end">' + fmt(last.v) + '</text>';
    return s + '</svg>';
  };

  // ---------- أعمدة تقييمات المباريات ----------
  // list بالترتيب الزمني: [{r: تقييم, res: 'w'|'d'|'l', tip}]
  UI.ratingBars = (list) => {
    if (!list || !list.length) return '<div class="mut sm c" style="padding:18px 0">لا مباريات بعد.</div>';
    const W = 320, H = 132, L = 24, Rr = 8, T = 10, B = 18, lo = 4, hi = 10, n = list.length;
    const bw = Math.min(16, (W - L - Rr) / n * 0.72), Y = (v) => T + (H - T - B) * (1 - (U.clamp(v, lo, hi) - lo) / (hi - lo));
    const avg = U.avg(list.map((x) => x.r));
    let s = '<svg class="lchart" viewBox="0 0 ' + W + ' ' + H + '" style="direction:ltr" role="img">';
    [5, 6, 7, 8, 9].forEach((v) => { s += '<line class="ch-grid" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ch-txt" x="' + (L - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + v + '</text>'; });
    list.forEach((x, i) => {
      const cx = L + (W - L - Rr) * ((i + 0.5) / n), y = Y(x.r), cls = x.r >= 7 ? 'bar-g' : x.r >= 6.2 ? 'bar-y' : 'bar-r';
      s += '<rect class="' + cls + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, H - B - y).toFixed(1) + '" rx="3"><title>' + esc((x.tip || '') + ' ' + f1(x.r)) + '</title></rect>';
      if (x.res) s += '<circle class="rs-' + x.res + '" cx="' + cx.toFixed(1) + '" cy="' + (H - 8) + '" r="2.6"/>';
    });
    s += '<line class="ch-ref" x1="' + L + '" y1="' + Y(avg).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + Y(avg).toFixed(1) + '"/><text class="ch-reft" x="' + (W - Rr) + '" y="' + (Y(avg) - 3).toFixed(1) + '" text-anchor="end">متوسط ' + f1(avg) + '</text>';
    return s + '</svg>';
  };

  // ---------- أعمدة مزدوجة (أهداف/صناعة لكل موسم) ----------
  UI.pairBars = (rows) => {
    if (!rows || !rows.length) return '';
    const W = 320, H = 128, L = 24, Rr = 8, T = 14, B = 22, n = rows.length;
    const mx = Math.max(3, Math.max.apply(null, rows.map((r) => Math.max(r.g, r.a)))), Y = (v) => T + (H - T - B) * (1 - v / mx);
    const slot = (W - L - Rr) / n, bw = Math.min(14, slot * 0.36), every = Math.ceil(n / 7);
    let s = '<svg class="lchart" viewBox="0 0 ' + W + ' ' + H + '" style="direction:ltr" role="img"><line class="ch-grid" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - Rr) + '" y2="' + (H - B) + '"/>';
    rows.forEach((r, i) => {
      const c = L + slot * (i + 0.5);
      [[r.g, 'bar-g', -1], [r.a, 'bar-b', 1]].forEach(([v, cls, d]) => {
        const x = d < 0 ? c - bw - 1 : c + 1, y = Y(v);
        s += '<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, H - B - y).toFixed(1) + '" rx="2.5"/>';
        if (v > 0) s += '<text class="ch-txt" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 3).toFixed(1) + '" text-anchor="middle">' + v + '</text>';
      });
      if (i % every === 0 || i === n - 1) s += '<text class="ch-txt" x="' + c.toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(r.l) + '</text>';
    });
    return s + '</svg><div class="sm mut c"><span class="lg lg-g"></span> أهداف &nbsp; <span class="lg lg-b"></span> صناعة</div>';
  };

  // ---------- الملعب والتشكيلة ----------
  // إحداثيات الخانات (x%, y%) لكل خطة بترتيب G.FORMATIONS؛ المهاجمون في الأعلى والحارس في الأسفل
  const PITCH = {
    '4-3-3': [[50, 91], [13, 71], [37, 76], [63, 76], [87, 71], [50, 57], [27, 44], [73, 44], [15, 20], [85, 20], [50, 14]],
    '4-2-3-1': [[50, 91], [13, 71], [37, 76], [63, 76], [87, 71], [36, 57], [64, 57], [50, 37], [16, 35], [84, 35], [50, 13]],
    '4-4-2': [[50, 91], [13, 71], [37, 76], [63, 76], [87, 71], [38, 49], [62, 49], [14, 45], [86, 45], [38, 16], [62, 16]]
  };
  const lines = '<svg class="pitch-bg" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><rect x="1" y="1" width="66" height="98" class="pl"/><line x1="1" y1="50" x2="67" y2="50" class="pl"/><circle cx="34" cy="50" r="8" class="pl"/><rect x="14" y="1" width="40" height="15" class="pl"/><rect x="24" y="1" width="20" height="6" class="pl"/><rect x="14" y="84" width="40" height="15" class="pl"/><rect x="24" y="93" width="20" height="6" class="pl"/></svg>';
  // xi: [{id, slot}]؛ opt: {form, hi: معرّف يُبرَز}
  UI.pitch = (xi, clubId, opt) => {
    opt = opt || {};
    const club = G.S.clubs[clubId], form = opt.form || (club && club.form) || '4-3-3', pos = PITCH[form] || PITCH['4-3-3'];
    const kit = club ? club.c : ['#22c55e', '#0f5132'];
    const lum = (hex) => { const h = hex.replace('#', ''); return (0.299 * parseInt(h.substr(0, 2), 16) + 0.587 * parseInt(h.substr(2, 2), 16) + 0.114 * parseInt(h.substr(4, 2), 16)) / 255; };
    const tx = lum(kit[0]) > 0.6 ? '#111' : '#fff';
    // نوزّع اللاعبين على خانات الخطة بحسب رمز الخانة (لا بحسب الفهرس) كي لا تختل المواضع بعد طرد أو تبديل
    const slots = (G.FORMATIONS[form] || G.FORMATIONS['4-3-3']).slice(), usedIdx = {};
    let s = '<div class="pitch">' + lines;
    xi.forEach((x) => {
      const p = G.S.players[x.id];
      let i = slots.findIndex((c, j) => c === x.slot && !usedIdx[j]);
      if (i < 0) i = slots.findIndex((c, j) => !usedIdx[j]);
      if (i >= 0) usedIdx[i] = true;
      const q = pos[i] || [50, 50];
      if (!p) return;
      const nm = String(p.n).split(/\s+/).slice(-1)[0];
      s += '<div class="pp' + (x.id === opt.hi ? ' me' : '') + '" style="left:' + q[0] + '%;top:' + q[1] + '%"><i style="background:' + kit[0] + ';border-color:' + kit[1] + ';color:' + tx + '">' + p.ovr + '</i><span>' + esc(nm) + '</span></div>';
    });
    return s + '</div>';
  };
})(window.G = window.G || {});
