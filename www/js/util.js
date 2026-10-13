/* util.js — أدوات مساعدة: مولّد أرقام عشوائية قابل للحفظ + دوال عامة */
(function (G) {
  'use strict';
  const U = (G.U = {});

  // مولّد mulberry32؛ الحالة تُحفظ مع التقدم ليستأنف الموسم بنفس التسلسل
  G.rngState = (Date.now() ^ 0x9e3779b9) >>> 0;
  U.seed = (s) => { G.rngState = (s >>> 0) || 1; };
  U.rnd = () => {
    G.rngState = (G.rngState + 0x6d2b79f5) >>> 0;
    let t = G.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  U.int = (a, b) => a + Math.floor(U.rnd() * (b - a + 1));
  U.chance = (p) => U.rnd() < p;
  U.pick = (arr) => arr[Math.floor(U.rnd() * arr.length)];
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.gauss = () => {
    let u = 0, v = 0;
    while (!u) u = U.rnd();
    while (!v) v = U.rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  U.shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(U.rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  // اختيار موزون: items مصفوفة، wf دالة تعيد الوزن
  U.wpick = (items, wf) => {
    let tot = 0;
    const ws = items.map((x) => { const w = Math.max(0, wf(x)); tot += w; return w; });
    if (tot <= 0) return items.length ? items[Math.floor(U.rnd() * items.length)] : null;
    let r = U.rnd() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };
  U.poisson = (l) => {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= U.rnd(); } while (p > L && k < 30);
    return k - 1;
  };
  U.avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  U.sum = (a) => a.reduce((s, x) => s + x, 0);
  U.r1 = (v) => Math.round(v * 10) / 10;

  // تنسيق المال باليورو
  U.money = (v) => {
    v = Math.round(v || 0);
    const neg = v < 0 ? '-' : '';
    v = Math.abs(v);
    if (v >= 1e9) return neg + (v / 1e9).toFixed(2) + ' مليار €';
    if (v >= 1e6) return neg + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace(/\.0$/, '') + ' م€';
    if (v >= 1e3) return neg + Math.round(v / 1e3) + ' ألف €';
    return neg + v + ' €';
  };
  U.roundTo = (v, step) => Math.round(v / step) * step;

  U.clone = (o) => JSON.parse(JSON.stringify(o));
})(window.G = window.G || {});
