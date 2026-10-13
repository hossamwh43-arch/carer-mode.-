/* main.js — الإقلاع: تحميل الحفظ أو بدء لعبة جديدة، حفظ تلقائي عند الإغلاق/الإخفاء، التقاط الأخطاء دون فقدان البيانات */
(function (G) {
  'use strict';
  const UI = G.UI;

  function storageOk() {
    try { const k = '__fcc_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  }

  function boot() {
    UI.noStorage = !storageOk();
    G.safe(() => {
      if (G.Save.load()) {
        UI.cur = G.S.phase === 'retired' ? 'career' : 'home';
        if (G.S.active && G.S.active.m && G.S.active.m.done) { // مباراة انتهت ولم تُعتمد قبل الإغلاق
          G.Season.commitUser(G.S.active.m);
        }
      } else G.S = null;
    }, 'boot');
    UI.render();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* اختياري */ });
    }
  }

  const save = () => { if (G.S) { if (UI.matchStop && UI.cur !== 'match') { /* لا شيء */ } G.Save.save(); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  window.addEventListener('pagehide', save);

  // أي خطأ غير متوقع: نسجّله ونُبقي اللعبة تعمل (لا يُفقد التقدّم)
  window.addEventListener('error', (e) => {
    try { if (G.S) { (G.S.errors = G.S.errors || []).push({ t: Date.now(), label: 'window', msg: String(e.message || e) }); if (G.S.errors.length > 30) G.S.errors.shift(); } } catch (x) { /* لا شيء */ }
    G.lastError = { label: 'window', msg: String(e.message || e) };
  });
  window.addEventListener('unhandledrejection', (e) => { G.lastError = { label: 'promise', msg: String(e.reason && e.reason.message || e.reason) }; });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.G = window.G || {});
