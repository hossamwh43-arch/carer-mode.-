/* ui_trophy_art.js — رسومات كؤوس أصلية (SVG داخلي) لغرفة الكؤوس والاحتفالات.
   تصميم أصلي عام (ليس نسخة من كؤوس حقيقية): كأس دوري، كأس بغطاء، درع سوبر، كأس بأذنين كبيرتين، كرة أرضية، إكليل، كرة ذهبية، حذاء، ميدالية.
   UI.trophyArt(اسم, صنف) ← وسم <svg> جاهز. زينة فقط: لا علاقة له بحالة اللعبة ولا بالعشوائية. */
(function (G) {
  'use strict';
  const UI = G.UI;

  const grad = (id, stops, attrs) => '<linearGradient id="tg-' + id + '" ' + (attrs || 'x1="0" y1="0" x2="1" y2="0"') + '>' + stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>').join('') + '</linearGradient>';
  const DEFS = '<defs>' +
    grad('gold', [[0, '#7d4e05'], [0.25, '#f2b630'], [0.48, '#fff1ae'], [0.7, '#dca21d'], [1, '#6f4504']]) +
    grad('silver', [[0, '#4f586d'], [0.25, '#b9c3d8'], [0.48, '#ffffff'], [0.7, '#9aa6be'], [1, '#454e63']]) +
    grad('green', [[0, '#0a5a3f'], [0.35, '#2fd59a'], [0.55, '#9affd8'], [1, '#07412e']]) +
    grad('base', [[0, '#3b4668'], [1, '#141a2d']], 'x1="0" y1="0" x2="0" y2="1"') +
    '<radialGradient id="tg-ball" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff7cf"/><stop offset=".45" stop-color="#ffcf4a"/><stop offset="1" stop-color="#8f5b05"/></radialGradient></defs>';

  const F = (m) => 'url(#tg-' + m + ')';
  const DK = 'rgb(88 54 4 / .55)';
  // قاعدة ملحوظة
  const base = (m, w) => { w = w || 30; const x = 32 - w / 2; return '<rect x="' + x + '" y="58" width="' + w + '" height="10" rx="2.4" fill="url(#tg-base)" stroke="rgb(255 255 255 / .14)" stroke-width=".6"/><rect x="' + (x + 4) + '" y="61.4" width="' + (w - 8) + '" height="2.6" rx="1.1" fill="' + F(m) + '"/>'; };
  const star = (cx, cy, r, fill) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; pts.push((cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2)); } return '<path d="M' + pts.join('L') + 'Z" fill="' + fill + '"/>'; };
  const handles = (m, d1, d2) => '<path d="' + d1 + '" fill="none" stroke="' + F(m) + '" stroke-width="3.2" stroke-linecap="round"/><path d="' + d2 + '" fill="none" stroke="' + F(m) + '" stroke-width="3.2" stroke-linecap="round"/>';

  const cup = (m) => '<path d="M17 8H47C47 25 43 35 32 39C21 35 17 25 17 8Z" fill="' + F(m) + '"/>' +
    handles(m, 'M17.5 11C6 10 6 27 20 30', 'M46.5 11C58 10 58 27 44 30') +
    '<path d="M29 39H35L36 52H28Z" fill="' + F(m) + '"/><path d="M24 52H40L43 58H21Z" fill="' + F(m) + '"/>' +
    '<ellipse cx="32" cy="8" rx="15" ry="2.6" fill="rgb(255 255 255 / .4)"/>' + star(32, 21, 7.5, DK) + base(m);

  const lidCup = (m) => '<path d="M15 23H49C49 40 43 48 32 51C21 48 15 40 15 23Z" fill="' + F(m) + '"/>' +
    '<path d="M13 23H51L48 17H16Z" fill="' + F(m) + '"/><rect x="30" y="13.5" width="4" height="3.6" fill="' + F(m) + '"/><circle cx="32" cy="10.4" r="4.2" fill="' + F(m) + '"/>' +
    handles(m, 'M15.5 26C5 26 6 39 18 40', 'M48.5 26C59 26 58 39 46 40') +
    '<path d="M29 51H35L36 58H28Z" fill="' + F(m) + '"/><rect x="14" y="26" width="36" height="2.2" fill="rgb(255 255 255 / .28)"/>' +
    '<path d="M32 31L34 36.2 39.5 36.5 35.2 40 36.7 45.2 32 42.2 27.3 45.2 28.8 40 24.5 36.5 30 36.2Z" fill="' + DK + '"/>' + base(m);

  const shield = (m) => '<path d="M32 3L52 9V29C52 44 43 52 32 56C21 52 12 44 12 29V9Z" fill="' + F(m) + '"/>' +
    '<path d="M32 8.4L47 12.9V29C47 40.6 40.5 47 32 50.6C23.5 47 17 40.6 17 29V12.9Z" fill="rgb(45 28 0 / .3)"/>' + star(32, 28, 11.5, 'rgb(255 244 190 / .92)') +
    '<rect x="28" y="54" width="8" height="5" fill="' + F(m) + '"/>' + base(m, 26);

  const earCup = (m) => '<path d="M22 6H42C42 22 40 31 32 35C24 31 22 22 22 6Z" fill="' + F(m) + '"/>' +
    '<path d="M23 7C2 3 -1 36 23 38L26 31C14 30 12 17 23 14Z" fill="' + F(m) + '"/><path d="M41 7C62 3 65 36 41 38L38 31C50 30 52 17 41 14Z" fill="' + F(m) + '"/>' +
    '<path d="M29 35H35L36 52H28Z" fill="' + F(m) + '"/><path d="M23 52H41L44 58H20Z" fill="' + F(m) + '"/>' +
    [0, 1, 2, 3, 4].map((i) => '<circle cx="' + (24.6 + i * 3.7).toFixed(1) + '" cy="' + (13 + Math.abs(i - 2) * 2.2).toFixed(1) + '" r="1.5" fill="' + DK + '"/>').join('') +
    '<ellipse cx="32" cy="6" rx="10" ry="2" fill="rgb(255 255 255 / .4)"/>' + base(m);

  const globe = (m) => '<circle cx="32" cy="22" r="17" fill="url(#tg-ball)"/>' +
    '<path d="M15 22H49M32 5C24 12 24 32 32 39M32 5C40 12 40 32 32 39M18 13.6C26 17 38 17 46 13.6M18 30.4C26 27 38 27 46 30.4" fill="none" stroke="rgb(90 55 0 / .4)" stroke-width="1"/>' +
    '<ellipse cx="25" cy="14" rx="5" ry="3" transform="rotate(-35 25 14)" fill="rgb(255 255 255 / .5)"/>' +
    '<path d="M26 38C20 46 23 52 25 58H39C41 52 44 46 38 38Z" fill="' + F(m) + '"/><path d="M24.6 49.6H39.4L40.2 53.6H23.8Z" fill="' + F('green') + '"/>' + base(m);

  const laurel = (m) => {
    let leaves = '';
    for (let i = 0; i < 7; i++) {
      const a = (112 + i * 22) * Math.PI / 180, x = 32 + 19 * Math.cos(a), y = 26 + 19 * Math.sin(a), rot = (112 + i * 22) + 90;
      leaves += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="4.4" ry="1.9" transform="rotate(' + rot + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + F(m) + '"/>' +
        '<ellipse cx="' + (64 - x).toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="4.4" ry="1.9" transform="rotate(' + (-rot) + ' ' + (64 - x).toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + F(m) + '"/>';
    }
    return leaves + '<circle cx="32" cy="26" r="12.5" fill="' + F(m) + '"/><circle cx="32" cy="26" r="8.8" fill="rgb(45 28 0 / .32)"/>' + star(32, 26, 6.8, 'rgb(255 244 190 / .95)') +
      '<path d="M29 40H35L36 58H28Z" fill="' + F(m) + '"/>' + base(m, 26);
  };

  const ball = (m) => '<circle cx="32" cy="27" r="19" fill="url(#tg-ball)"/><path d="M32 18L40 24L37 33.5H27L24 24Z" fill="rgb(100 62 4 / .72)"/>' +
    '<path d="M32 18V9M40 24L49 21M37 33.5L43 41M27 33.5L21 41M24 24L15 21" fill="none" stroke="rgb(100 62 4 / .6)" stroke-width="1.3" stroke-linecap="round"/>' +
    '<ellipse cx="24.5" cy="16" rx="6.2" ry="3.4" transform="rotate(-35 24.5 16)" fill="rgb(255 255 255 / .5)"/>' +
    '<path d="M23 47C28 51 36 51 41 47L38.5 55H25.5Z" fill="' + F(m) + '"/><path d="M28 55H36L37 58H27Z" fill="' + F(m) + '"/>' + base(m, 26);

  const boot = (m) => '<path d="M11 14C11 11 13 10 16 10H24C26 10 27 11.6 27.4 13.6L28.4 20C31 23 37 25 45 28.5C53 32 56 38 53 43C51.6 45.6 49.4 46 47 46H14C11 46 10 43 10 40Z" fill="' + F(m) + '"/>' +
    '<path d="M14 46H47L49 50.4H13Z" fill="rgb(45 28 0 / .45)"/>' +
    '<path d="M18 23L25 21M19 28L27 26M21 33L30 31" stroke="rgb(88 54 4 / .55)" stroke-width="1.6" stroke-linecap="round"/>' +
    '<rect x="16" y="50" width="4.6" height="4.4" rx="1" fill="' + F('silver') + '"/><rect x="26" y="50" width="4.6" height="4.4" rx="1" fill="' + F('silver') + '"/><rect x="38" y="50" width="4.6" height="4.4" rx="1" fill="' + F('silver') + '"/>' +
    '<ellipse cx="20" cy="14" rx="5" ry="2" transform="rotate(-8 20 14)" fill="rgb(255 255 255 / .42)"/>' + base(m, 36);

  const medal = (m) => '<path d="M19 3H28.5L36.5 27H27Z" fill="currentColor"/><path d="M45 3H35.5L27.5 27H37Z" fill="currentColor" opacity=".78"/>' +
    '<circle cx="32" cy="42" r="17" fill="' + F(m) + '"/><circle cx="32" cy="42" r="12.4" fill="rgb(45 28 0 / .3)"/>' + star(32, 42, 9.4, 'rgb(255 244 190 / .96)') +
    '<ellipse cx="25" cy="33" rx="6" ry="2.6" transform="rotate(-38 25 33)" fill="rgb(255 255 255 / .4)"/>';

  const ART = {
    liga: ['cup', 'gold'], d2: ['cup', 'silver'], cup: ['lidCup', 'gold'], sup: ['shield', 'gold'], ucl: ['earCup', 'silver'],
    wc: ['globe', 'gold'], ac: ['laurel', 'gold'], bd: ['ball', 'gold'], scorer: ['boot', 'gold'], player: ['medal', 'gold'],
    assist: ['medal', 'silver'], uclp: ['medal', 'silver'], young: ['medal', 'green']
  };
  const MAKE = { cup, lidCup, shield, earCup, globe, laurel, ball, boot, medal };

  function symbols() {
    return Object.keys(ART).map((k) => '<symbol id="tr-' + k + '" viewBox="0 0 64 70">' + MAKE[ART[k][0]](ART[k][1]) + '</symbol>').join('');
  }
  function build() {
    if (document.getElementById('trSprite')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'trSprite'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
    svg.innerHTML = DEFS + symbols();
    document.body.insertBefore(svg, document.body.firstChild);
  }

  UI.trophyArtKeys = Object.keys(ART);
  UI.trophyArt = (name, cls) => (ART[name] ? '<svg class="tra tra-' + name + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 70" aria-hidden="true"><use href="#tr-' + name + '"/></svg>' : '');
  build();
})(window.G = window.G || {});
