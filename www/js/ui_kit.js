/* ui_kit.js — Build 34 (Visual Overhaul): مكوّنات نظام التصميم الموحّد. زينة وتركيب HTML فقط: لا حالة ولا عشوائية ولا حفظ.
   - UI.stadiumArt(clubId, opt): ملعب ليلي متجهي (SVG) بألوان النادي — مدرّجات بجمهور ملوّن وكشّافات وعشب بخطوط. ثابت (بلا حركة) فخفيف على الهاتف.
   - UI.secHead / UI.kpi / UI.lrow / UI.formStrip / UI.zoneBar: لبنات للشاشات (تُصمَّم في css/premium.css).
   كلها تعمل ولو غابت (الشاشات تتحقق من وجودها)، فلا اعتماد صلب. */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc;

  // ---------- أدوات صغيرة ----------
  const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const okHex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  let seq = 0;

  // ---------- الملعب الليلي ----------
  // opt.h: ارتفاع العرض بالبكسل (الافتراضي 220) · opt.v: رقم النمط (يُشتق من النادي) · opt.ball: كرة أمام المرمى · opt.mid: يجعل المنتصف أكثر سطوعًا (يخلي مكانًا للنص)
  UI.stadiumArt = (clubId, opt) => {
    opt = opt || {};
    const c = G.S && G.S.clubs ? G.S.clubs[clubId] : null;
    const a = okHex(UI.clubAccent ? UI.clubAccent(clubId) : null, '#ffc53d'), b = okHex(c && c.c && c.c[1] ? c.c[1] : null, '#e8eefc');
    const hs = hash(clubId || 'x'), v = opt.v != null ? opt.v : hs % 4, u = 'sa' + (++seq);
    const H = 240, W = 390, HZ = 148;               // أفق الملعب
    const ex = [[36, 100, 290, 354], [28, 92, 298, 362], [44, 108, 282, 346], [32, 96, 294, 358]][v];  // مواضع الكشّافات
    const roof = [66, 56, 72, 62][v];               // انحناء سقف المدرّج الخلفي
    // مدرّج خلفي بجمهور: نقاط بلون النادي ولونه الثاني
    const bowl = 'M-10 ' + (HZ + 2) + ' L-10 ' + (HZ - 34) + ' Q195 ' + (HZ - 34 - roof * 0.9) + ' 400 ' + (HZ - 34) + ' L400 ' + (HZ + 2) + ' Z';
    const upper = 'M-10 ' + (HZ - 34) + ' Q195 ' + (HZ - 34 - roof * 0.9) + ' 400 ' + (HZ - 34) + ' L400 ' + (HZ - 42) + ' Q195 ' + (HZ - 42 - roof * 0.9) + ' -10 ' + (HZ - 42) + ' Z';
    // خطوط العشب بمنظور: أشرطة متناوبة تتسع نحو المشاهد
    const xl = (y) => 70 - 70 * (y - HZ) / (H - HZ), xr = (y) => 320 + 70 * (y - HZ) / (H - HZ);
    let stripes = '';
    const N = 8, ys = [];
    for (let i = 0; i <= N; i++) ys.push(HZ + (H - HZ) * Math.pow(i / N, 1.55));
    for (let i = 0; i < N; i++) {
      const y1 = ys[i], y2 = ys[i + 1];
      stripes += '<path d="M' + xl(y1).toFixed(1) + ' ' + y1.toFixed(1) + ' L' + xr(y1).toFixed(1) + ' ' + y1.toFixed(1) + ' L' + xr(y2).toFixed(1) + ' ' + y2.toFixed(1) + ' L' + xl(y2).toFixed(1) + ' ' + y2.toFixed(1) + 'Z" fill="' + (i % 2 ? '#14573e' : '#104a35') + '"/>';
    }
    const my = ys[3];                               // خط المنتصف
    let lights = '', cones = '';
    ex.forEach((x, i) => {
      const left = x < 195, top = 34 + ((hs >> (i * 3)) & 7), tx = left ? x + 4 : x - 4;
      lights += '<rect x="' + (x - 1) + '" y="' + (top + 8) + '" width="2" height="' + (HZ - top - 6) + '" fill="#0b1226"/>' +
        '<rect x="' + (x - 11) + '" y="' + top + '" width="22" height="9" rx="1.5" fill="#101a35" stroke="#2a3a63" stroke-width=".6"/>' +
        '<path d="M' + (x - 9) + ' ' + (top + 2) + 'h4v2h-4zM' + (x - 3) + ' ' + (top + 2) + 'h4v2h-4zM' + (x + 3) + ' ' + (top + 2) + 'h4v2h-4zM' + (x - 9) + ' ' + (top + 5.5) + 'h4v2h-4zM' + (x - 3) + ' ' + (top + 5.5) + 'h4v2h-4zM' + (x + 3) + ' ' + (top + 5.5) + 'h4v2h-4z" fill="#fff6dc"/>' +
        '<circle cx="' + x + '" cy="' + (top + 5) + '" r="22" fill="url(#' + u + 'gl)"/>';
      cones += '<path d="M' + (x - 9) + ' ' + (top + 9) + ' L' + (x + 9) + ' ' + (top + 9) + ' L' + (tx + (left ? 120 : -120) + 46) + ' ' + (H) + ' L' + (tx + (left ? 120 : -120) - 46) + ' ' + H + 'Z" fill="url(#' + u + 'bm)"/>';
    });
    // لوحات الإعلان على حافة الملعب (ألوان النادي)
    let ads = '';
    for (let i = 0; i < 12; i++) { const x = 74 + i * 20.4, col = i % 3 === 0 ? a : i % 3 === 1 ? '#e8eefc' : b; ads += '<rect x="' + x.toFixed(1) + '" y="' + (HZ - 4) + '" width="18" height="4.4" fill="' + col + '" opacity="' + (i % 3 === 1 ? '.55' : '.8') + '"/>'; }
    const ball = opt.ball ? '<ellipse cx="236" cy="226" rx="9" ry="2.4" fill="#000" opacity=".45"/><circle cx="236" cy="219" r="7" fill="#f4f6fb"/><path d="m236 215.2 3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="#10172c"/><circle cx="233.6" cy="216.4" r="2.6" fill="#fff" opacity=".6"/>' : '';
    return '<svg class="sta-art" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"' + (opt.h ? ' style="height:' + opt.h + 'px"' : '') + '><defs>' +
      '<linearGradient id="' + u + 'sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060e"/><stop offset=".5" stop-color="#09122a"/><stop offset="1" stop-color="' + a + '" stop-opacity=".30"/></linearGradient>' +
      '<linearGradient id="' + u + 'bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6" stop-opacity=".22"/><stop offset=".6" stop-color="#cfe0ff" stop-opacity=".06"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + u + 'hz"><stop offset="0" stop-color="' + a + '" stop-opacity=".34"/><stop offset=".6" stop-color="' + a + '" stop-opacity=".08"/><stop offset="1" stop-color="' + a + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + u + 'pl" cx=".5" cy=".18" r=".75"><stop offset="0" stop-color="#d9ffe6" stop-opacity=".30"/><stop offset=".55" stop-color="#9bffc4" stop-opacity=".07"/><stop offset="1" stop-color="#9bffc4" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + u + 'gl"><stop offset="0" stop-color="#fff7e0" stop-opacity=".9"/><stop offset=".3" stop-color="#ffe9b0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + u + 'st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1732"/><stop offset="1" stop-color="#070d1d"/></linearGradient>' +
      '<linearGradient id="' + u + 'vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a15" stop-opacity=".1"/><stop offset=".55" stop-color="#060a15" stop-opacity="0"/><stop offset="1" stop-color="#060a15" stop-opacity=".92"/></linearGradient>' +
      '<pattern id="' + u + 'cr" width="7" height="5" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.6" r="1.15" fill="' + a + '" opacity=".62"/><circle cx="5.3" cy="4.1" r="1.05" fill="' + b + '" opacity=".4"/><circle cx="5.3" cy="1.2" r=".7" fill="#fff" opacity=".18"/></pattern></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'sk)"/>' +
      '<ellipse cx="195" cy="' + (HZ - 20) + '" rx="230" ry="120" fill="url(#' + u + 'hz)"/>' +
      '<path d="' + bowl + '" fill="url(#' + u + 'st)"/><path d="' + bowl + '" fill="url(#' + u + 'cr)"/>' +
      '<path d="' + upper + '" fill="#050a18"/><path d="M-10 ' + (HZ - 42) + ' Q195 ' + (HZ - 42 - roof * 0.9) + ' 400 ' + (HZ - 42) + '" fill="none" stroke="#9bb4ff" stroke-opacity=".28" stroke-width=".9"/>' +
      '<path d="M-10 ' + (HZ + 2) + ' L-10 ' + (HZ - 14) + ' L70 ' + (HZ - 8) + ' L70 ' + (HZ + 2) + 'Z" fill="#050a18" opacity=".75"/><path d="M400 ' + (HZ + 2) + ' L400 ' + (HZ - 14) + ' L320 ' + (HZ - 8) + ' L320 ' + (HZ + 2) + 'Z" fill="#050a18" opacity=".75"/>' +
      cones + lights +
      '<path d="M-10 ' + HZ + ' L70 ' + HZ + ' L0 ' + H + ' L-10 ' + H + 'Z" fill="url(#' + u + 'st)"/><path d="M-10 ' + HZ + ' L70 ' + HZ + ' L0 ' + H + ' L-10 ' + H + 'Z" fill="url(#' + u + 'cr)" opacity=".8"/>' +
      '<path d="M400 ' + HZ + ' L320 ' + HZ + ' L390 ' + H + ' L400 ' + H + 'Z" fill="url(#' + u + 'st)"/><path d="M400 ' + HZ + ' L320 ' + HZ + ' L390 ' + H + ' L400 ' + H + 'Z" fill="url(#' + u + 'cr)" opacity=".8"/>' +
      stripes + '<rect x="0" y="' + HZ + '" width="' + W + '" height="' + (H - HZ) + '" fill="url(#' + u + 'pl)"/>' + ads +
      '<g fill="none" stroke="#e8f2ee" stroke-opacity=".5" stroke-width="1.1"><path d="M' + xl(my).toFixed(1) + ' ' + my.toFixed(1) + ' L' + xr(my).toFixed(1) + ' ' + my.toFixed(1) + '"/><ellipse cx="195" cy="' + my.toFixed(1) + '" rx="46" ry="9"/><path d="M128 ' + (HZ + 1) + ' L140 ' + (HZ + 12) + ' L250 ' + (HZ + 12) + ' L262 ' + (HZ + 1) + '"/><path d="M168 ' + (HZ + 12) + ' Q195 ' + (HZ + 20) + ' 222 ' + (HZ + 12) + '"/></g>' +
      ball + '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'vg)"/></svg>';
  };

  // ---------- لبنات الشاشات ----------
  // عنوان قسم موحّد: شريط مائل بلون النادي + عدّاد اختياري + رابط اختياري
  UI.secHead = (title, o) => {
    o = o || {};
    return '<div class="sec-h2"><h3>' + title + (o.count != null ? ' <span class="cnt">' + o.count + '</span>' : '') + '</h3>' +
      (o.act ? '<button class="lnk" data-a="' + o.act + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') + (o.v2 != null ? ' data-v2="' + esc(o.v2) + '"' : '') + '>' + (o.label || 'المزيد') + '</button>' : '') + '</div>';
  };
  // مؤشّر رقمي: رقم كبير + عنوان صغير + (اختياري) دلتا ولون
  UI.kpi = (label, value, o) => {
    o = o || {};
    return '<div class="kpi' + (o.tone ? ' ' + o.tone : '') + '"' + (o.act ? ' data-a="' + o.act + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') + ' role="button" tabindex="0"' : '') + '><b class="num"' + (typeof value === 'number' ? ' data-cu="kpi:' + esc(label) + '" data-v="' + value + '"' : '') + '>' + value + '</b><small>' + label + '</small>' + (o.sub ? '<em>' + o.sub + '</em>' : '') + '</div>';
  };
  // سلسلة الأداء الأخير (نقاط ملوّنة): arr من 'w'|'d'|'l' أو 'g'|'y'|'r'
  UI.formStrip = (arr) => {
    const k = { w: 'g', d: 'y', l: 'r', g: 'g', y: 'y', r: 'r' };
    return '<span class="fstrip">' + (arr || []).slice(-5).map((t) => '<i class="' + (k[t] || 'y') + '"></i>').join('') + '</span>';
  };
  // صف قائمة موحّد: [ic|crest] عنوان/وصف ... قيمة ›  (يحلّ محل بطاقات متراصّة)
  UI.lrow = (o) => {
    const lead = o.crest ? UI.badge(o.crest, 34) : o.ic ? '<span class="lr-ic">' + UI.ico(o.ic) + '</span>' : '';
    const attr = o.act ? ' data-a="' + o.act + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') + (o.v2 != null ? ' data-v2="' + esc(o.v2) + '"' : '') : '';
    const tag = o.act ? 'button' : 'div';
    return '<' + tag + ' class="lrow' + (o.cls ? ' ' + o.cls : '') + '"' + attr + '>' + lead + '<span class="lr-t"><b>' + o.t + '</b>' + (o.s ? '<small>' + o.s + '</small>' : '') + '</span>' +
      (o.val != null ? '<span class="lr-v">' + o.val + '</span>' : '') + (o.act ? '<span class="lr-go">' + UI.ico('chevl') + '</span>' : '') + '</' + tag + '>';
  };
  // شريط منطقة جدول الدوري (أبطال/أوروبي/هبوط) بالمفتاح اللوني
  UI.zoneKey = (items) => '<div class="zkey">' + items.map((i) => '<span><i class="' + i[0] + '"></i>' + i[1] + '</span>').join('') + '</div>';
  // خط اللاعب (حارس/دفاع/وسط/هجوم) من رمز المركز: يلوّن شارة المركز في القوائم
  UI.posKind = (pos) => (pos === 'GK' ? 'gk' : /^(CB|LB|RB|LWB|RWB|SW)$/.test(pos) ? 'd' : /^(CDM|CM|CAM|LM|RM|DM|AM)$/.test(pos) ? 'm' : 'a');
  // مساعد: ملعب النادي كخلفية لعنصر (يُستعمل داخل .sta-wrap)
  UI.stadiumBg = (clubId, opt) => '<div class="sta-bg">' + UI.stadiumArt(clubId, opt) + '</div>';
})(window.G = window.G || {});
