/* ui_avatar.js — صورة اللاعب (Build 27): بورتريه رياضي بظلال وإضاءة بدل الوجه الكرتوني السابق.
   - الواجهة نفسها: UI.avatar(look, clubId, size[, seed]) — look {skin, hair, style, beard, band} بلا أي حقل جديد في بيانات اللاعب.
   - التنوّع: ألوان البشرة/الشعر/القصّة/اللحية/الشريط من look كما هي، وملامح الوجه الدقيقة (عرض الوجه والفك والأذنين والحاجبين والعينين
     وتباعدهما والأنف والفم ولون القزحية وشكل ياقة القميص) تُشتقّ من تجزئة ثابتة لـ (seed + look). الـ seed = اسم اللاعب، فيبقى وجهه نفسه في الرئيسية
     والملف والبطاقة، ويختلف عن وجه لاعب آخر بالمظهر نفسه.
   - زينة فقط: لا تلمس حالة اللعبة ولا U.rnd (مولّد محلي صغير مزروع بالتجزئة). قميص اللاعب بنمط شعار ناديه ولونيه. */
(function (G) {
  'use strict';
  const UI = G.UI;

  // ---------- أدوات ----------
  const hx = (h) => { h = String(h || '#888888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.substr(0, 2), 16) || 0, parseInt(h.substr(2, 2), 16) || 0, parseInt(h.substr(4, 2), 16) || 0]; };
  const hex = (r) => '#' + r.map((v) => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2)).join('');
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };
  const lum = (h) => { const c = hx(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
  const f = (n) => Math.round(n * 100) / 100;
  const hashStr = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  let uid = 0;

  UI.avatar = (look, clubId, size, seed) => {
    look = look || {}; size = size || 72;
    const L = G.LOOK, sk = look.skin | 0, hr = look.hair | 0, st = look.style | 0, bd = look.beard | 0, bn = look.band | 0;
    const skin = L.skin[sk] || L.skin[0], hair = L.hair[hr] || L.hair[0];
    const club = clubId && G.S && G.S.clubs[clubId] ? G.S.clubs[clubId] : null;
    const kit = club ? club.c : ['#22c55e', '#0f5132'], k0 = kit[0], k1 = kit[1] || '#ffffff';
    const pat = club ? UI.crestPattern(clubId).pat : 6;
    const rnd = prng(hashStr(String(seed == null ? '' : seed).trim() + ':' + [sk, hr, st, bd, bn].join(',')));
    const R = (a, b) => a + (b - a) * rnd();
    const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
    const id = 'av' + (++uid);

    // ---------- ملامح مشتقّة (ثابتة لكل seed+look) ----------
    const cx = 50, w = R(19.2, 23.2), jaw = R(11.8, 17.6), chin = R(61.8, 66.6), es = R(0.85, 1.25);
    const brow = { t: R(1.2, 3.1), a: R(-0.8, 1.8), y: R(-1, 1) }, eyeX = R(9.2, 11.8), eyeS = R(0.9, 1.14), noseW = R(0.8, 1.34);
    const quiff = R(8.4, 11.4), hlY = R(21.2, 25), slant = R(-0.5, 0.9), mir = rnd() < 0.5, freck = rnd();
    const mouthT = pick([0, 1, 1, 2, 3, 0, 1]), mouthW = R(4.6, 5.8);
    const darkSkin = sk >= 3;
    const iris = pick(darkSkin ? ['#2b1b12', '#2b1b12', '#4a2c1a', '#3a2414'] : sk === 2 ? ['#2b1b12', '#4a2c1a', '#6b4423', '#4a2c1a', '#5b6b3a'] : ['#2b1b12', '#4a2c1a', '#6b4423', '#5b6b3a', '#3f6a8a', '#4a2c1a']);
    const collar = pick([0, 0, 1, 2]); // 0 ياقة V · 1 ياقة مستديرة · 2 بولو
    const hi = mix(skin, '#ffffff', 0.13), lo = mix(skin, '#3b1500', 0.2), lo2 = mix(skin, '#2a0d00', 0.36);
    const lip = mix(skin, '#8d2f35', darkSkin ? 0.3 : 0.42), lipHi = mix(lip, '#ffffff', 0.18);
    const hHi = hr === 0 ? '#4b5163' : mix(hair, '#ffffff', 0.28), hLo = mix(hair, '#000000', 0.38), hMid = mix(hair, '#000000', 0.14);
    const browC = mix(hair, '#000000', hr === 6 ? 0.55 : 0.25);
    const c0 = mix(k0, '#ffffff', 0.1), c1d = mix(k0, '#000000', 0.34);

    // ---------- المسارات الأساسية ----------
    const face = 'M' + f(cx - w) + ' 37C' + f(cx - w) + ' 22 ' + f(cx - w * 0.5) + ' 13.5 ' + cx + ' 13.5C' + f(cx + w * 0.5) + ' 13.5 ' + f(cx + w) + ' 22 ' + f(cx + w) + ' 37' +
      'C' + f(cx + w) + ' 47 ' + f(cx + jaw + 3) + ' 53.5 ' + f(cx + jaw) + ' 57.5C' + f(cx + jaw - 2) + ' ' + f(chin - 2) + ' ' + (cx + 4) + ' ' + f(chin) + ' ' + cx + ' ' + f(chin) +
      'C' + (cx - 4) + ' ' + f(chin) + ' ' + f(cx - jaw + 2) + ' ' + f(chin - 2) + ' ' + f(cx - jaw) + ' 57.5C' + f(cx - jaw - 3) + ' 53.5 ' + f(cx - w) + ' 47 ' + f(cx - w) + ' 37Z';
    const tw = 7 + (w - 20) * 0.5; // نصف عرض الرقبة
    const neck = 'M' + f(cx - tw) + ' 54H' + f(cx + tw) + 'V76Q' + cx + ' 82 ' + f(cx - tw) + ' 76Z';
    const jersey = 'M2 100C3 80 19 71.5 38 68.5C42 74 46 77.5 50 78C54 77.5 58 74 62 68.5C81 71.5 97 80 98 100Z';
    const neckline = collar === 1 ? 'M37 68.6C42 73.6 58 73.6 63 68.6' : collar === 2 ? 'M37.5 68.6L50 73.5L62.5 68.6' : 'M37 68.4C42 74 46 77.6 50 78.2C54 77.6 58 74 63 68.4';
    const skullTop = 'M' + f(cx - w) + ' 37C' + f(cx - w) + ' 22 ' + f(cx - w * 0.5) + ' 13.5 ' + cx + ' 13.5C' + f(cx + w * 0.5) + ' 13.5 ' + f(cx + w) + ' 22 ' + f(cx + w) + ' 37';
    const hairline = (y, side) => 'L' + f(cx + w - 0.6) + ' ' + f(side) + 'C' + f(cx + w - 2.2) + ' ' + f(y + 5) + ' ' + f(cx + w * 0.58) + ' ' + f(y + 0.5) + ' ' + cx + ' ' + f(y) + 'C' + f(cx - w * 0.58) + ' ' + f(y + 0.5) + ' ' + f(cx - w + 2.2) + ' ' + f(y + 5) + ' ' + f(cx - w + 0.6) + ' ' + f(side) + 'Z';

    let defs = '<linearGradient id="' + id + 'f" x1=".08" y1="0" x2=".95" y2="1"><stop offset="0" stop-color="' + hi + '"/><stop offset=".5" stop-color="' + skin + '"/><stop offset="1" stop-color="' + lo + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'j" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c0 + '"/><stop offset="1" stop-color="' + c1d + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + hHi + '"/><stop offset=".45" stop-color="' + hair + '"/><stop offset="1" stop-color="' + hLo + '"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + face + '"/></clipPath><clipPath id="' + id + 'k"><path d="' + jersey + '"/></clipPath>';
    const eyeY = 39.6;
    const eyeShape = (x, sx) => { const o = sx * 4.3 * eyeS, i = -sx * 4.3 * eyeS, oy = eyeY - slant, iy = eyeY + slant * 0.4; return 'M' + f(x + i) + ' ' + f(iy) + 'C' + f(x + i * 0.62) + ' ' + f(eyeY - 2.7 * eyeS) + ' ' + f(x + o * 0.62) + ' ' + f(eyeY - 2.7 * eyeS - slant * 0.5) + ' ' + f(x + o) + ' ' + f(oy) + 'C' + f(x + o * 0.62) + ' ' + f(eyeY + 2.2 * eyeS) + ' ' + f(x + i * 0.62) + ' ' + f(eyeY + 2.2 * eyeS) + ' ' + f(x + i) + ' ' + f(iy) + 'Z'; };
    defs += '<clipPath id="' + id + 'l"><path d="' + eyeShape(cx - eyeX, -1) + '"/></clipPath><clipPath id="' + id + 'r"><path d="' + eyeShape(cx + eyeX, 1) + '"/></clipPath>';

    // ---------- الشعر (خلفي وأمامي) ----------
    let back = '', front = '';
    const H = 'url(#' + id + 'h)';
    const crop = (top, hl, side) => 'M' + f(cx - w - 1.3) + ' 38C' + f(cx - w - 2.8) + ' 20 ' + f(cx - w * 0.55) + ' ' + f(top) + ' ' + cx + ' ' + f(top) + 'C' + f(cx + w * 0.55) + ' ' + f(top) + ' ' + f(cx + w + 2.8) + ' 20 ' + f(cx + w + 1.3) + ' 38' + hairline(hl, side);
    const shine = (d, o) => '<path d="' + d + '" fill="none" stroke="' + hHi + '" stroke-width="2.1" stroke-linecap="round" opacity="' + (o || 0.5) + '"/>';
    const hline = '<path d="M' + f(cx - w + 0.8) + ' 33C' + f(cx - w + 2.4) + ' 27 ' + f(cx - w * 0.58) + ' 23.4 ' + cx + ' 23C' + f(cx + w * 0.58) + ' 23.4 ' + f(cx + w - 2.4) + ' 27 ' + f(cx + w - 0.8) + ' 33" fill="none" stroke="' + hLo + '" stroke-width="1.2" opacity=".35"/>';
    if (st === 0) { // قصير
      front = '<path d="' + crop(quiff, hlY, 33) + '" fill="' + H + '"/>' + shine('M' + f(cx - w * 0.7) + ' 20Q' + f(cx - 3) + ' 11.6 ' + f(cx + w * 0.62) + ' 15.5') + hline;
    } else if (st === 1) { // مجعّد
      let c = '<path d="' + crop(12, 24.5, 33) + '" fill="' + H + '"/>';
      for (let i = 0; i < 11; i++) { const a = Math.PI * (1.04 + i * 0.092), r = 5 + (i % 3) * 0.9; c += '<circle cx="' + f(cx + Math.cos(a) * (w + 1.4)) + '" cy="' + f(31 + Math.sin(a) * 21) + '" r="' + f(r) + '" fill="' + (i % 2 ? hair : hMid) + '"/>'; }
      for (let i = 0; i < 6; i++) { const a = Math.PI * (1.12 + i * 0.15); c += '<circle cx="' + f(cx + Math.cos(a) * (w - 5)) + '" cy="' + f(29 + Math.sin(a) * 15) + '" r="4.6" fill="' + (i % 2 ? hMid : hair) + '"/>'; }
      for (let i = 0; i < 4; i++) { const a = Math.PI * (1.2 + i * 0.2); c += '<circle cx="' + f(cx + Math.cos(a) * (w - 2)) + '" cy="' + f(27 + Math.sin(a) * 15.5) + '" r="1.5" fill="' + hHi + '" opacity=".5"/>'; }
      front = c + hline;
    } else if (st === 2) { // طويل
      back = '<path d="M' + f(cx - w - 3) + ' 34C' + f(cx - w - 7) + ' 52 ' + f(cx - w - 6.5) + ' 72 ' + f(cx - w - 3) + ' 86L' + f(cx + w + 3) + ' 86C' + f(cx + w + 6.5) + ' 72 ' + f(cx + w + 7) + ' 52 ' + f(cx + w + 3) + ' 34Z" fill="' + hLo + '"/>';
      front = '<path d="' + crop(10, 22.5, 36) + '" fill="' + H + '"/>' +
        '<path d="M' + f(cx - w - 1.2) + ' 34C' + f(cx - w - 3.6) + ' 50 ' + f(cx - w - 3.8) + ' 62 ' + f(cx - w - 1.8) + ' 71Q' + f(cx - w + 0.6) + ' 76 ' + f(cx - w + 3) + ' 71C' + f(cx - w + 1.6) + ' 60 ' + f(cx - w + 2) + ' 46 ' + f(cx - w + 3.6) + ' 33Z" fill="' + hair + '"/>' +
        '<path d="M' + f(cx + w + 1.2) + ' 34C' + f(cx + w + 3.6) + ' 50 ' + f(cx + w + 3.8) + ' 62 ' + f(cx + w + 1.8) + ' 71Q' + f(cx + w - 0.6) + ' 76 ' + f(cx + w - 3) + ' 71C' + f(cx + w - 1.6) + ' 60 ' + f(cx + w - 2) + ' 46 ' + f(cx + w - 3.6) + ' 33Z" fill="' + hMid + '"/>' +
        shine('M' + f(cx - w * 0.6) + ' 18Q' + f(cx - 2) + ' 11 ' + f(cx + w * 0.55) + ' 16', 0.45) + hline;
    } else if (st === 3) { // حليق: ظلّ فروة خفيف فقط
      front = '<path d="' + skullTop + hairline(22, 33) + '" fill="' + hair + '" opacity=".2"/>';
    } else if (st === 4) { // ذيل
      back = '<path d="M' + f(cx + w - 3) + ' 26C' + f(cx + w + 8) + ' 21 ' + f(cx + w + 15) + ' 32 ' + f(cx + w + 11) + ' 48C' + f(cx + w + 9) + ' 58 ' + f(cx + w + 2) + ' 56 ' + f(cx + w + 3) + ' 47C' + f(cx + w + 4) + ' 40 ' + f(cx + w + 1.5) + ' 34 ' + f(cx + w - 3) + ' 33Z" fill="' + hMid + '"/><path d="M' + f(cx + w + 2.6) + ' 27C' + f(cx + w + 6) + ' 27.4 ' + f(cx + w + 8.4) + ' 30 ' + f(cx + w + 8) + ' 33" fill="none" stroke="' + (lum(k1) > 0.6 ? '#2a3350' : k1) + '" stroke-width="2.2" stroke-linecap="round"/>';
      front = '<path d="' + crop(quiff + 1, hlY - 1.6, 32) + '" fill="' + H + '"/>' + shine('M' + f(cx - w * 0.65) + ' 18.5Q' + f(cx) + ' 11.5 ' + f(cx + w * 0.6) + ' 16.5') + hline;
    } else if (st === 5) { // مموّه (موهوك)
      front = '<path d="' + skullTop.replace('M' + f(cx - w) + ' 37', 'M' + f(cx - w) + ' 37') + hairline(23.5, 34) + '" fill="' + hair + '" opacity=".24"/>' +
        '<path d="M' + f(cx - 7.2) + ' 26C' + f(cx - 8.6) + ' 12 ' + f(cx - 5) + ' 3 ' + cx + ' 2.4C' + f(cx + 5) + ' 3 ' + f(cx + 8.6) + ' 12 ' + f(cx + 7.2) + ' 26C' + f(cx + 3) + ' 23.2 ' + f(cx - 3) + ' 23.2 ' + f(cx - 7.2) + ' 26Z" fill="' + H + '"/>' +
        '<path d="M' + cx + ' 4.5C' + f(cx - 0.6) + ' 11 ' + f(cx - 0.6) + ' 18 ' + f(cx) + ' 23" fill="none" stroke="' + hHi + '" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>';
    } else if (st === 6) { // أفرو
      back = '<ellipse cx="' + cx + '" cy="27.5" rx="' + f(w + 11.5) + '" ry="22.5" fill="' + hMid + '"/>';
      let c = '';
      for (let i = 0; i < 16; i++) { const a = Math.PI * (0.98 + i * 0.0625); c += '<circle cx="' + f(cx + Math.cos(a) * (w + 10.5)) + '" cy="' + f(28 + Math.sin(a) * 21) + '" r="' + f(3.6 + (i % 3) * 0.5) + '" fill="' + (i % 2 ? hair : hMid) + '"/>'; }
      front = c + '<path d="M' + f(cx - w - 0.5) + ' 38C' + f(cx - w - 2) + ' 26 ' + f(cx - w * 0.5) + ' 14 ' + cx + ' 14C' + f(cx + w * 0.5) + ' 14 ' + f(cx + w + 2) + ' 26 ' + f(cx + w + 0.5) + ' 38' + hairline(22.5, 33).replace(/^L/, 'L') + '" fill="' + H + '"/>' + hline;
    } else if (st === 7) { // جانبي
      front = '<path d="M' + f(cx + w + 1.4) + ' 38C' + f(cx + w + 3.2) + ' 18 ' + f(cx + w * 0.35) + ' 7.6 ' + f(cx - 4) + ' 9.4C' + f(cx - w * 0.75) + ' 11 ' + f(cx - w - 1.8) + ' 22 ' + f(cx - w - 1.3) + ' 38L' + f(cx - w + 0.6) + ' 33C' + f(cx - w + 2.6) + ' 27.5 ' + f(cx - w * 0.5) + ' 22 ' + f(cx + 2.5) + ' 20.5C' + f(cx + w * 0.42) + ' 19.4 ' + f(cx + w - 2.2) + ' 25.5 ' + f(cx + w - 0.6) + ' 33Z" fill="' + H + '"/>' +
        shine('M' + f(cx - w * 0.5) + ' 14.2Q' + f(cx + 4) + ' 9.6 ' + f(cx + w * 0.8) + ' 17', 0.5) + '<path d="M' + f(cx + 3) + ' 20.2C' + f(cx - 2) + ' 17 ' + f(cx - w * 0.5) + ' 17 ' + f(cx - w * 0.8) + ' 24" fill="none" stroke="' + hLo + '" stroke-width="1.1" opacity=".4"/>';
    } else if (st === 8) { // عقدة
      back = '<circle cx="' + cx + '" cy="8.6" r="8.4" fill="' + hMid + '"/><path d="M' + f(cx - 6) + ' 13.4Q' + cx + ' 16 ' + f(cx + 6) + ' 13.4" fill="none" stroke="' + k1 + '" stroke-width="2.6" stroke-linecap="round"/>';
      front = '<circle cx="' + cx + '" cy="8.6" r="8.4" fill="' + H + '"/><path d="' + crop(12, 22, 32) + '" fill="' + H + '"/>' + shine('M' + f(cx - w * 0.6) + ' 19.4Q' + cx + ' 13.5 ' + f(cx + w * 0.6) + ' 18') +
        '<path d="M' + f(cx - 5.4) + ' 12.8Q' + cx + ' 16.3 ' + f(cx + 5.4) + ' 12.8" fill="none" stroke="' + k1 + '" stroke-width="2.6" stroke-linecap="round"/>' + hline;
    }

    if (mir && (st === 0 || st === 4 || st === 7)) { front = '<g transform="matrix(-1 0 0 1 100 0)">' + front + '</g>'; if (back) back = '<g transform="matrix(-1 0 0 1 100 0)">' + back + '</g>'; }
    // ---------- الوجه وتفاصيله ----------
    const ear = (sx) => '<ellipse cx="' + f(cx + sx * (w - 0.4)) + '" cy="41.5" rx="' + f(3.3 * es) + '" ry="' + f(5.3 * es) + '" fill="' + skin + '"/><path d="M' + f(cx + sx * (w + 0.4)) + ' 38.6Q' + f(cx + sx * (w + 2.4)) + ' 42 ' + f(cx + sx * (w + 0.2)) + ' 45.6" fill="none" stroke="' + lo + '" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>';
    let svg = '<defs>' + defs + '</defs>' + back;
    // الجسم: رقبة بظلّ الذقن + قميص بنمط شعار النادي
    svg += '<path d="' + neck + '" fill="' + skin + '"/><path d="M' + f(cx - tw) + ' 54H' + f(cx + tw) + 'V66Q' + cx + ' 71.5 ' + f(cx - tw) + ' 66Z" fill="' + lo2 + '" opacity=".5"/>';
    svg += '<path d="' + jersey + '" fill="url(#' + id + 'j)"/><g clip-path="url(#' + id + 'k)">';
    if (pat === 1) for (let i = -4; i <= 4; i++) svg += '<rect x="' + f(cx + i * 12 - 3) + '" y="66" width="6" height="36" fill="' + k1 + '" opacity=".92"/>';
    else if (pat === 2) { svg += '<rect x="0" y="82" width="100" height="6" fill="' + k1 + '" opacity=".9"/><rect x="0" y="93" width="100" height="6" fill="' + k1 + '" opacity=".9"/>'; }
    else if (pat === 0) svg += '<rect x="50" y="60" width="52" height="42" fill="' + k1 + '" opacity=".9"/>';
    else if (pat === 3) svg += '<polygon points="2,76 2,90 98,100 98,86" fill="' + k1 + '" opacity=".9"/>';
    else if (pat === 6) svg += '<rect x="43" y="66" width="14" height="36" fill="' + k1 + '" opacity=".9"/>';
    svg += '<path d="M0 100C0 85 14 76 30 72L36 100Z" fill="#fff" opacity=".08"/><path d="M100 100C100 85 86 76 70 72L64 100Z" fill="#000" opacity=".18"/></g>';
    svg += '<path d="' + neckline + '" fill="none" stroke="' + (pat === 6 || pat === 7 ? mix(k0, '#ffffff', 0.55) : k1) + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    if (collar === 2) svg += '<path d="M50 73.5V80" stroke="' + k1 + '" stroke-width="1.4" opacity=".8"/><circle cx="50" cy="76.4" r=".9" fill="' + k1 + '"/>';
    svg += ear(-1) + ear(1);
    svg += '<path d="' + face + '" fill="url(#' + id + 'f)"/>';
    // ظلال وإضاءة الوجه (مقصوصة بالوجه)
    svg += '<g clip-path="url(#' + id + 'c)">' +
      '<path d="M' + f(cx + w * 0.38) + ' 18C' + f(cx + w * 0.95) + ' 28 ' + f(cx + w + 2) + ' 44 ' + f(cx + jaw * 0.9) + ' 62L' + f(cx + w + 6) + ' 70L' + f(cx + w + 6) + ' 8Z" fill="' + lo + '" opacity=".28"/>' +
      '<ellipse cx="' + f(cx - 6) + '" cy="26" rx="9" ry="4.4" fill="#fff" opacity=".1"/>' +
      '<ellipse cx="' + f(cx - eyeX) + '" cy="' + f(eyeY - 0.6) + '" rx="7" ry="4.2" fill="' + lo + '" opacity=".16"/><ellipse cx="' + f(cx + eyeX) + '" cy="' + f(eyeY - 0.6) + '" rx="7" ry="4.2" fill="' + lo + '" opacity=".2"/>' +
      '<ellipse cx="' + f(cx - 12) + '" cy="49.4" rx="4.6" ry="2.6" fill="#d8504a" opacity="' + (darkSkin ? 0.08 : 0.16) + '"/><ellipse cx="' + f(cx + 12) + '" cy="49.4" rx="4.6" ry="2.6" fill="#d8504a" opacity="' + (darkSkin ? 0.07 : 0.13) + '"/>' +
      '<path d="M' + f(cx - jaw) + ' 58Q' + cx + ' ' + f(chin + 2.4) + ' ' + f(cx + jaw) + ' 58V70H' + f(cx - jaw) + 'Z" fill="' + lo + '" opacity=".22"/></g>';
    svg += '<path d="M' + f(cx - w + 0.9) + ' 30C' + f(cx - w + 0.1) + ' 40 ' + f(cx - jaw - 2.4) + ' 52 ' + f(cx - jaw + 0.4) + ' 57" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".28"/>';
    if (sk <= 1 && freck < 0.3) { [[-9, 47.6], [-6.4, 45.6], [-12.2, 45], [-4, 47.8], [9, 47.6], [6.4, 45.6], [12.2, 45], [4, 47.8], [-1.4, 45.4], [1.6, 44.6]].forEach((q) => { svg += '<circle cx="' + f(cx + q[0]) + '" cy="' + q[1] + '" r=".62" fill="' + lo2 + '" opacity=".38"/>'; }); }
    // اللحية (قبل الفم)
    const beardFull = 'M' + f(cx - w + 0.9) + ' 43C' + f(cx - w + 1) + ' 52 ' + f(cx - jaw - 1.6) + ' 56 ' + f(cx - jaw + 0.6) + ' 58.6C' + f(cx - jaw + 3) + ' ' + f(chin + 0.6) + ' ' + (cx - 4) + ' ' + f(chin + 1.4) + ' ' + cx + ' ' + f(chin + 1.4) + 'C' + (cx + 4) + ' ' + f(chin + 1.4) + ' ' + f(cx + jaw - 3) + ' ' + f(chin + 0.6) + ' ' + f(cx + jaw - 0.6) + ' 58.6C' + f(cx + jaw + 1.6) + ' 56 ' + f(cx + w - 1) + ' 52 ' + f(cx + w - 0.9) + ' 43' +
      'C' + f(cx + w - 3.4) + ' 48 ' + f(cx + 8.6) + ' 51.4 ' + f(cx + 6) + ' 53.2Q' + cx + ' 51.2 ' + f(cx - 6) + ' 53.2C' + f(cx - 8.6) + ' 51.4 ' + f(cx - w + 3.4) + ' 48 ' + f(cx - w + 0.9) + ' 43Z';
    const mouthY = 56.2;
    if (bd === 1) svg += '<path d="' + beardFull + '" fill="' + hair + '" opacity=".34"/><path d="M' + f(cx - 6) + ' 53.4Q' + cx + ' 51.4 ' + f(cx + 6) + ' 53.4" fill="none" stroke="' + hair + '" stroke-width="1.4" opacity=".4"/>';
    else if (bd === 2) svg += '<path d="' + beardFull + '" fill="' + H + '"/><ellipse cx="' + cx + '" cy="' + f(mouthY + 0.3) + '" rx="5.4" ry="2" fill="' + lip + '" opacity=".9"/><path d="M' + f(cx - w + 2.4) + ' 50C' + f(cx - w + 4) + ' 57 ' + f(cx - jaw + 3) + ' 60 ' + f(cx - 6) + ' 62" fill="none" stroke="' + hHi + '" stroke-width="1.1" opacity=".3"/>';
    else if (bd === 3) svg += '<path d="M' + f(cx - 6.2) + ' 58.4Q' + cx + ' 56.4 ' + f(cx + 6.2) + ' 58.4Q' + f(cx + 7.4) + ' 63 ' + cx + ' ' + f(chin + 1.2) + 'Q' + f(cx - 7.4) + ' 63 ' + f(cx - 6.2) + ' 58.4Z" fill="' + H + '"/><path d="M' + f(cx - 6.4) + ' 52.4Q' + f(cx - 3) + ' 51 ' + cx + ' 52.4Q' + f(cx + 3) + ' 51 ' + f(cx + 6.4) + ' 52.4Q' + f(cx + 4) + ' 54.4 ' + cx + ' 53.4Q' + f(cx - 4) + ' 54.4 ' + f(cx - 6.4) + ' 52.4Z" fill="' + hair + '"/>';
    // الأنف
    svg += '<path d="M' + f(cx + 1) + ' 41Q' + f(cx + 2.4) + ' 46.4 ' + f(cx + 3.4 * noseW) + ' 49.4" fill="none" stroke="' + lo + '" stroke-width="1" stroke-linecap="round" opacity=".5"/>' +
      '<path d="M' + f(cx - 3.7 * noseW) + ' 50.2Q' + cx + ' ' + f(53.2) + ' ' + f(cx + 3.7 * noseW) + ' 50.2" fill="none" stroke="' + lo2 + '" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>' +
      '<ellipse cx="' + f(cx - 0.8) + '" cy="48.4" rx="1.7" ry="1.2" fill="#fff" opacity=".2"/>';
    if (bd === 4) svg += '<path d="M' + f(cx - 6.6) + ' 53.2Q' + f(cx - 3) + ' 51.4 ' + cx + ' 53Q' + f(cx + 3) + ' 51.4 ' + f(cx + 6.6) + ' 53.2Q' + f(cx + 4.2) + ' 55.6 ' + cx + ' 54.4Q' + f(cx - 4.2) + ' 55.6 ' + f(cx - 6.6) + ' 53.2Z" fill="' + H + '"/>';
    // الفم
    const mY = mouthY, mw = mouthW;
    if (mouthT === 0) svg += '<path d="M' + f(cx - mw) + ' ' + mY + 'Q' + cx + ' ' + f(mY + 1.2) + ' ' + f(cx + mw) + ' ' + mY + '" fill="none" stroke="' + lo2 + '" stroke-width="1.3" stroke-linecap="round"/><path d="M' + f(cx - mw * 0.62) + ' ' + f(mY + 2.7) + 'Q' + cx + ' ' + f(mY + 4.3) + ' ' + f(cx + mw * 0.62) + ' ' + f(mY + 2.7) + '" fill="none" stroke="' + lip + '" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>';
    else if (mouthT === 1) svg += '<path d="M' + f(cx - mw) + ' ' + f(mY - 0.5) + 'Q' + cx + ' ' + f(mY + 2.6) + ' ' + f(cx + mw) + ' ' + f(mY - 0.5) + '" fill="none" stroke="' + lo2 + '" stroke-width="1.3" stroke-linecap="round"/><path d="M' + f(cx - mw * 0.55) + ' ' + f(mY + 2.8) + 'Q' + cx + ' ' + f(mY + 4.4) + ' ' + f(cx + mw * 0.55) + ' ' + f(mY + 2.8) + '" fill="none" stroke="' + lip + '" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>';
    else if (mouthT === 2) svg += '<path d="M' + f(cx - mw + 0.4) + ' ' + f(mY + 0.8) + 'Q' + f(cx + 0.6) + ' ' + f(mY + 1.8) + ' ' + f(cx + mw + 0.6) + ' ' + f(mY - 1.2) + '" fill="none" stroke="' + lo2 + '" stroke-width="1.3" stroke-linecap="round"/><path d="M' + f(cx - mw * 0.4) + ' ' + f(mY + 3) + 'Q' + f(cx + 1) + ' ' + f(mY + 4.2) + ' ' + f(cx + mw * 0.6) + ' ' + f(mY + 2.2) + '" fill="none" stroke="' + lip + '" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>';
    else svg += '<path d="M' + f(cx - mw) + ' ' + f(mY - 0.6) + 'Q' + cx + ' ' + f(mY + 4.8) + ' ' + f(cx + mw) + ' ' + f(mY - 0.6) + 'Q' + cx + ' ' + f(mY + 0.8) + ' ' + f(cx - mw) + ' ' + f(mY - 0.6) + 'Z" fill="#f7f3ee" stroke="' + lo2 + '" stroke-width="1.1" stroke-linejoin="round"/>';
    // العينان والحاجبان
    const eye = (sx, cid) => {
      const x = cx + sx * eyeX;
      return '<path d="' + eyeShape(x, sx) + '" fill="#f6f2ee"/><g clip-path="url(#' + id + cid + ')"><circle cx="' + f(x - sx * 0.2) + '" cy="' + f(eyeY - 0.1) + '" r="' + f(2.35 * eyeS) + '" fill="' + iris + '"/><circle cx="' + f(x - sx * 0.2) + '" cy="' + f(eyeY - 0.1) + '" r="' + f(1.05 * eyeS) + '" fill="#0c0a09"/><circle cx="' + f(x - sx * 0.2 + 0.9) + '" cy="' + f(eyeY - 1) + '" r=".65" fill="#fff" opacity=".95"/>' +
        '<path d="M' + f(x - 5) + ' ' + f(eyeY - 1.4) + 'Q' + x + ' ' + f(eyeY - 3.6 * eyeS) + ' ' + f(x + 5) + ' ' + f(eyeY - 1.4) + 'V' + f(eyeY - 6) + 'H' + f(x - 5) + 'Z" fill="' + lo + '" opacity=".35"/></g>' +
        '<path d="M' + f(x - 4.5 * eyeS) + ' ' + f(eyeY + 0.2) + 'C' + f(x - 2.7 * eyeS) + ' ' + f(eyeY - 3.1 * eyeS) + ' ' + f(x + 2.7 * eyeS) + ' ' + f(eyeY - 3.1 * eyeS) + ' ' + f(x + 4.5 * eyeS) + ' ' + f(eyeY + 0.2) + '" fill="none" stroke="' + lo2 + '" stroke-width="1.15" stroke-linecap="round"/>' +
        '<path d="M' + f(x - 3.4 * eyeS) + ' ' + f(eyeY + 2.3) + 'Q' + x + ' ' + f(eyeY + 3.4) + ' ' + f(x + 3.4 * eyeS) + ' ' + f(eyeY + 2.3) + '" fill="none" stroke="' + lo + '" stroke-width=".8" stroke-linecap="round" opacity=".5"/>';
    };
    const brw = (sx) => { const x = cx + sx * eyeX, y = 33.4 + brow.y; return '<path d="M' + f(x - sx * 5.6) + ' ' + f(y + 1.1) + 'Q' + f(x - sx * 1.2) + ' ' + f(y - 1.5) + ' ' + f(x + sx * 5.4) + ' ' + f(y + brow.a) + '" fill="none" stroke="' + browC + '" stroke-width="' + f(brow.t) + '" stroke-linecap="round"/>'; };
    svg += eye(-1, 'l') + eye(1, 'r') + brw(-1) + brw(1);
    svg += front;
    // شريط الرأس
    if (bn) {
      const bc = bn === 2 ? '#f4f6fa' : k0, bs = bn === 2 ? mix(k0, '#000000', 0.2) : (lum(k0) > 0.55 ? '#16202e' : '#ffffff');
      svg += '<path d="M' + f(cx - w + 0.1) + ' 31.6Q' + cx + ' 22.6 ' + f(cx + w - 0.1) + ' 31.6V36.6Q' + cx + ' 27.6 ' + f(cx - w + 0.1) + ' 36.6Z" fill="' + bc + '" stroke="rgba(0,0,0,.28)" stroke-width=".7"/>' +
        '<path d="M' + f(cx - w + 0.6) + ' 34.2Q' + cx + ' 25.2 ' + f(cx + w - 0.6) + ' 34.2" fill="none" stroke="' + bs + '" stroke-width="1.1" opacity=".75"/><path d="M' + f(cx - w + 0.1) + ' 31.6Q' + cx + ' 22.6 ' + f(cx + w - 0.1) + ' 31.6" fill="none" stroke="#fff" stroke-width=".8" opacity=".35"/>';
    }
    return '<svg class="avatar" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" aria-hidden="true">' + svg + '</svg>';
  };
})(window.G = window.G || {});
