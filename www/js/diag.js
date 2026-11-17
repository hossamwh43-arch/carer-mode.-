/* diag.js — تشخيص الجهاز والأداء (Build 25)
   لماذا؟ كل اختبارات اللعبة كانت على Chromium في حاوية، فلا يُعرف أداء الملعب المرئي على الهاتف الحقيقي ولا أخطاؤه.
   هنا: (1) تسجيل أداء الملعب الفعلي أثناء مباراتك (زمن المعالجة + فاصل الإطارات الحقيقي → fps) وحفظ آخر 3 مباريات؛
   (2) «اختبار أداء الجهاز» تقريبي بمشهد رسم مشابه للملعب؛ (3) تقرير نصي قابل للنسخ (جهاز/شاشة/ذاكرة/حفظ/إصدار/أخطاء).
   لا يستدعي U.rnd ولا يغيّر أي حالة لعب، وكل القراءات داخل try/catch فلا يُسقط اللعبة. */
(function (G) {
  'use strict';
  const Diag = (G.Diag = {});
  G.BUILD = G.BUILD || 'Build 25';
  const KEY = 'fcc_perf';
  const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
  const r1 = (v) => Math.round(v * 10) / 10;
  const pct = (arr, p) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  // ---------- سجل الأداء الفعلي للمباريات ----------
  Diag.perf = () => { try { const s = store(); const v = s && JSON.parse(s.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  Diag.recordPerf = (rec) => {
    try {
      if (!rec || !(rec.frames >= 90)) return false;
      const list = Diag.perf(); list.push(rec); while (list.length > 3) list.shift();
      const s = store(); if (s) s.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  };
  // يحوّل عيّنات الملعب (ms للمعالجة + فواصل الإطارات) إلى سجل مختصر
  Diag.summarize = (ft, fi, extra) => {
    const gaps = fi.filter((g) => g > 4 && g < 400);
    const ga = avg(gaps);
    return Object.assign({
      at: Date.now(), frames: ft.length + (extra && extra.more ? extra.more : 0),
      avgMs: r1(avg(ft)), p95Ms: r1(pct(ft, 0.95)),
      fps: ga ? Math.round(1000 / ga) : 0, fpsLow: gaps.length ? Math.round(1000 / pct(gaps, 0.95)) : 0
    }, extra || {});
  };
  Diag.grade = (fps, avgMs, qDrop) => {
    if (qDrop) return { k: 'weak', t: 'ضعيف — خفض الملعب جودته تلقائيًا (يعمل بسلاسة أقل لكنه يعمل)' };
    if (fps >= 50 && avgMs < 6) return { k: 'great', t: 'ممتاز' };
    if (fps >= 30 && avgMs < 11) return { k: 'ok', t: 'جيد' };
    return { k: 'weak', t: 'ثقيل — جرّب إيقاف الملعب أو تفعيل «تقليل الحركة»' };
  };

  // ---------- اختبار الجهاز التقريبي ----------
  // مشهد رسم شبيه بالملعب (عشب مخطط + 22 لاعبًا بظل ورقم + جمهور صفوف + توهّج) لثلاث ثوانٍ؛ يقيس زمن الرسم وفاصل الإطارات
  Diag.bench = (done, secs) => {
    let cv, ctx, W = 390, H = 260, dpr = 1;
    try {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none';
      document.body.appendChild(cv); ctx = cv.getContext('2d');
      if (!ctx) throw new Error('no-2d');
    } catch (e) { done({ ok: false, err: String(e && e.message || e) }); return; }
    const crowd = document.createElement('canvas'); crowd.width = Math.round(W * dpr); crowd.height = Math.round(90 * dpr);
    const cc = crowd.getContext('2d'); for (let r = 0; r < 7; r++) for (let i = 0; i < 110; i++) { cc.fillStyle = 'hsl(' + ((i * 37 + r * 19) % 360) + ',40%,' + (28 + (i * 7) % 30) + '%)'; cc.fillRect(i * 3.6 * dpr, (6 + r * 11) * dpr, 2.6 * dpr, 4 * dpr); }
    const total = (secs || 3) * 1000, t0 = performance.now(); let last = t0; const ft = [], fi = []; let n = 0;
    const frame = (now) => {
      const s = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#2f8f40' : '#287c37'; ctx.fillRect(0, 60 + i * 14.3, W, 14.3); }
      for (let r = 0; r < 7; r++) ctx.drawImage(crowd, 0, r * 11 * dpr, crowd.width, 11 * dpr, 0, r * 8 - Math.abs(Math.sin(now / 130 + r)) * 1.5, W, 11);
      const rg = ctx.createRadialGradient(W / 2, H * 0.6, 8, W / 2, H * 0.6, W * 0.7); rg.addColorStop(0, 'rgba(255,255,230,.16)'); rg.addColorStop(1, 'rgba(2,6,14,.5)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 22; i++) {
        const x = 30 + (i % 11) * 32 + Math.sin(now / 400 + i) * 6, y = 110 + Math.floor(i / 11) * 70 + Math.cos(now / 500 + i) * 8;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 9, 3.5, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = i < 11 ? '#d63a3a' : '#2b6fd6'; ctx.fillRect(x - 5, y - 22, 10, 14); ctx.fillStyle = '#222'; ctx.fillRect(x - 5, y - 9, 10, 6);
        ctx.fillStyle = '#e0ac80'; ctx.beginPath(); ctx.arc(x, y - 26, 4, 0, 6.3); ctx.fill();
        ctx.font = '800 6px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), x, y - 13);
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2 + Math.sin(now / 300) * 80, 170, 4, 0, 6.3); ctx.fill();
      ft.push(performance.now() - s); fi.push(now - last); last = now; n++;
      if (now - t0 < total) requestAnimationFrame(frame);
      else {
        try { document.body.removeChild(cv); } catch (e) { /* لا شيء */ }
        const gaps = fi.slice(2).filter((g) => g > 4 && g < 400), a = avg(ft.slice(2)), ga = avg(gaps);
        const res = { ok: true, frames: n, avgMs: r1(a), p95Ms: r1(pct(ft.slice(2), 0.95)), fps: ga ? Math.round(1000 / ga) : 0, fpsLow: gaps.length ? Math.round(1000 / pct(gaps, 0.95)) : 0, dpr };
        res.grade = Diag.grade(res.fps, res.avgMs, false); done(res);
      }
    };
    requestAnimationFrame(frame);
  };

  // ---------- التقرير ----------
  Diag.collect = () => {
    const r = { app: {}, device: {}, save: {}, perf: Diag.perf(), errors: [] };
    try {
      r.app.build = G.BUILD || 'Build 25';
      r.app.sw = (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) ? 'active' : 'none';
      r.app.season = G.S ? (G.Season && G.Season.label ? G.Season.label(G.S.season) : G.S.season) : null; r.app.week = G.S ? G.S.week : null;
      r.app.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { /* لا شيء */ }
    try {
      const n = navigator;
      r.device.ua = String(n.userAgent || '').slice(0, 160); r.device.lang = n.language || '';
      r.device.screen = (screen && screen.width ? screen.width + 'x' + screen.height : '') + ' @' + (window.devicePixelRatio || 1) + 'x';
      r.device.viewport = window.innerWidth + 'x' + window.innerHeight;
      r.device.cores = n.hardwareConcurrency || null; r.device.mem = n.deviceMemory || null; r.device.online = n.onLine !== false;
      r.device.touch = (n.maxTouchPoints || 0) > 0;
      r.device.webview = /; wv\)|Version\/[\d.]+.*Chrome\/[\d.]+ Mobile/.test(n.userAgent || '');
    } catch (e) { /* لا شيء */ }
    try {
      const s = store();
      let tot = 0; if (s) for (let i = 0; i < s.length; i++) { const k = s.key(i); tot += (k || '').length + (s.getItem(k) || '').length; }
      r.save.localStorageKB = Math.round(tot * 2 / 1024); // UTF-16: بايتان للحرف
      r.save.gameKB = G.Save && G.Save.lastJson ? Math.round(G.Save.lastJson.length * 2 / 1024) : null;
      r.save.failures = G.Save ? (G.Save.failures || 0) : 0; r.save.lastError = G.lastSaveError ? String(G.lastSaveError).slice(0, 120) : null;
    } catch (e) { /* لا شيء */ }
    try {
      (G.S && G.S.errors ? G.S.errors.slice(-8) : []).forEach((e) => r.errors.push({ t: e.t, label: e.label, msg: String(e.msg).slice(0, 140) }));
      if (G.lastError) r.errors.push({ t: null, label: G.lastError.label, msg: String(G.lastError.msg).slice(0, 140) });
    } catch (e) { /* لا شيء */ }
    return r;
  };
  Diag.text = (extra) => {
    const r = Diag.collect(), L = [];
    L.push('== تقرير تشخيص — ' + r.app.build + ' ==');
    L.push('الشاشة: ' + r.device.screen + ' · النافذة: ' + r.device.viewport + ' · أنوية: ' + (r.device.cores || '؟') + ' · ذاكرة: ' + (r.device.mem ? r.device.mem + 'GB' : '؟') + ' · WebView: ' + (r.device.webview ? 'نعم' : 'لا/؟'));
    L.push('المتصفح: ' + r.device.ua);
    L.push('الموسم: ' + (r.app.season || '—') + ' الأسبوع ' + (r.app.week == null ? '—' : r.app.week) + ' · SW: ' + r.app.sw + ' · تقليل الحركة: ' + (r.app.reduce ? 'نعم' : 'لا'));
    L.push('التخزين: كل الموقع ' + (r.save.localStorageKB || 0) + 'KB · الحفظ ≈ ' + (r.save.gameKB == null ? '؟' : r.save.gameKB + 'KB') + ' · إخفاقات الحفظ: ' + r.save.failures + (r.save.lastError ? ' (' + r.save.lastError + ')' : ''));
    if (extra && extra.bench) { const b = extra.bench; L.push('اختبار الجهاز: ' + (b.ok ? b.fps + ' إطار/ث (أدنى ' + b.fpsLow + ') · رسم ' + b.avgMs + 'ms (p95 ' + b.p95Ms + ') · ' + b.grade.t : 'فشل: ' + b.err)); }
    if (!r.perf.length) L.push('أداء الملعب الفعلي: لم تُلعب مباراة بالملعب المرئي بعد');
    r.perf.forEach((p, i) => L.push('مباراة ' + (i + 1) + ': ' + p.fps + ' إطار/ث (أدنى ' + p.fpsLow + ') · معالجة ' + p.avgMs + 'ms (p95 ' + p.p95Ms + ') · جودة ' + (p.q ? 'كاملة' : 'مخفّضة') + (p.qDrop ? ' (خُفِّضت تلقائيًا)' : '') + ' · ' + p.w + 'x' + p.h));
    L.push(r.errors.length ? 'الأخطاء: ' + r.errors.map((e) => e.label + ': ' + e.msg).join(' | ') : 'الأخطاء: لا يوجد');
    return L.join('\n');
  };
})(window.G = window.G || {});
