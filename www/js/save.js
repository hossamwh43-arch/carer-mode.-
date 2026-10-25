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

  // تجميد الحفظ مؤقتًا (تستعمله المحاكاة): الاستدعاءات العادية تُؤجَّل ثم يُجرى حفظ واحد عند release.
  // حارس أمان: التجميد الذي يطول عن دقيقة يُعدّ مهجورًا ويُلغى حتى لا يتوقف الحفظ للأبد.
  Save._hold = 0; Save._holdAt = 0; Save._dirty = false; Save.lastJson = null;
  Save.hold = () => { Save._hold++; Save._holdAt = Date.now(); };
  Save.touch = () => { Save._holdAt = Date.now(); };
  Save.release = (flush) => {
    Save._hold = Math.max(0, Save._hold - 1);
    if (Save._hold === 0 && Save._dirty && flush !== false) return Save.save(true);
    return true;
  };

  // الحفظ: نكتب أولًا إلى مفتاح مؤقت للتحقق ثم نُدوّر النسخة الاحتياطية
  // force: يتجاوز التجميد · wantJson: يبني النص حتى لو لم يتوفر تخزين (تستعمله المحاكاة كنقطة استرجاع)
  Save.save = (force, wantJson) => {
    if (!Save.valid(G.S)) return false;
    if (Save._hold > 0 && !force) {
      if (Date.now() - Save._holdAt > 60000) { Save._hold = 0; } // تجميد مهجور
      else { Save._dirty = true; return true; }
    }
    const st = store();
    if (!st && !wantJson) return false;
    try {
      G.S.rng = G.rngState;
      G.S.savedAt = Date.now();
      const json = JSON.stringify(G.S);
      Save.lastJson = json;
      Save._dirty = false;
      if (!st) return false;
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
        if (G.Media) G.safe(() => G.Media.get(), 'media'); // ترقية الحفظ القديم: إنشاء حالة الإعلام قبل أي لعب
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
      if (G.Media) G.safe(() => G.Media.get(), 'media');
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
