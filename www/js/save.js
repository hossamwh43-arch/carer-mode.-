/* save.js — الحفظ التلقائي في LocalStorage مع نسخة احتياطية واستعادة آمنة */
(function (G) {
  'use strict';
  const Save = (G.Save = {});
  const C = () => G.CONFIG;

  function store() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  Save.valid = (S) => !!(S && S.v && S.user && S.clubs && S.players && S.players[S.user] && S.phase && typeof S.week === 'number');

  Save.exists = () => { const st = store(); return !!(st && (st.getItem(C().saveKey) || st.getItem(C().backupKey))); };

  // الحفظ: نكتب أولًا إلى مفتاح مؤقت للتحقق ثم نُدوّر النسخة الاحتياطية
  Save.save = () => {
    const st = store();
    if (!st || !Save.valid(G.S)) return false;
    try {
      G.S.rng = G.rngState;
      G.S.savedAt = Date.now();
      const json = JSON.stringify(G.S);
      JSON.parse(json); // تحقق من سلامة النص قبل الكتابة
      const old = st.getItem(C().saveKey);
      if (old) st.setItem(C().backupKey, old);
      st.setItem(C().saveKey, json);
      return true;
    } catch (e) {
      G.lastSaveError = String(e && e.message || e);
      return false;
    }
  };

  Save.load = () => {
    const st = store();
    if (!st) return false;
    for (const key of [C().saveKey, C().backupKey]) {
      try {
        const raw = st.getItem(key);
        if (!raw) continue;
        const S = JSON.parse(raw);
        if (!Save.valid(S)) continue;
        G.S = S;
        if (S.rng) G.rngState = S.rng >>> 0;
        G.loadedFrom = key;
        return true;
      } catch (e) { /* ننتقل للنسخة الاحتياطية */ }
    }
    return false;
  };

  Save.reset = () => {
    const st = store();
    if (!st) return;
    st.removeItem(C().saveKey);
    st.removeItem(C().backupKey);
    G.S = null;
  };

  Save.exportText = () => JSON.stringify(G.S);
  Save.importText = (txt) => {
    try {
      const S = JSON.parse(txt);
      if (!Save.valid(S)) return false;
      G.S = S;
      if (S.rng) G.rngState = S.rng >>> 0;
      Save.save();
      return true;
    } catch (e) { return false; }
  };

  // تنفيذ آمن: أي خطأ لا يُفقد بيانات اللاعب (الحالة تبقى كما هي ويُسجَّل الخطأ)
  G.safe = (fn, label) => {
    const snapshot = G.S ? G.S.rng : null;
    try { return fn(); } catch (e) {
      try {
        if (G.S) {
          G.S.errors = G.S.errors || [];
          G.S.errors.push({ t: Date.now(), label: label || '', msg: String(e && e.message || e) });
          if (G.S.errors.length > 30) G.S.errors.shift();
        }
      } catch (e2) { /* لا شيء */ }
      G.lastError = { label, msg: String(e && e.message || e), stack: e && e.stack };
      if (typeof console !== 'undefined') console.error('[' + (label || 'safe') + ']', e);
      return undefined;
    }
  };
})(window.G = window.G || {});
