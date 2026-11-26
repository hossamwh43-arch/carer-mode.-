/* save.js — الحفظ التلقائي في LocalStorage مع نسخة احتياطية واستعادة آمنة */
(function (G) {
  'use strict';
  const Save = (G.Save = {});
  const C = () => G.CONFIG;

  function store() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  // ---------- خانات الحفظ (Build 29): 3 خانات ----------
  // الخانة 1 تستخدم مفاتيح الحفظ الأصلية نفسها (CONFIG.saveKey/backupKey) فيصبح أي حفظ قديم خانتها تلقائيًا بلا نقل ولا ترحيل
  // والخانتان 2 و3 بلاحقة _s2/_s3. الخانة النشطة تُحفظ في fcc_slot (افتراضيًا 1). كل دوال الحفظ تعمل على الخانة النشطة.
  Save.SLOTS = 3; Save.SLOT_KEY = 'fcc_slot'; Save.slot = 1;
  Save.keys = (n) => {
    n = n || Save.slot;
    const k = C().saveKey, b = C().backupKey;
    return n === 1 ? { main: k, bak: b, rescue: k + '_rescue' } : { main: k + '_s' + n, bak: b + '_s' + n, rescue: k + '_s' + n + '_rescue' };
  };
  Save.setSlot = (n) => {
    n = Number(n);
    if (!(n >= 1 && n <= Save.SLOTS)) return false;
    if (Save._pend && Save.valid(G.S)) Save.flush(); // اكتب المعلّق للخانة القديمة قبل التبديل
    const prev = Save.slot;
    Save._pend = false; Save.slot = n; Save.lastJson = null; Save._dirty = false;
    if (prev !== n) Save.cool(prev); // الخانة التي نغادرها تُضغط للتوفير
    const st = store(); try { if (st) st.setItem(Save.SLOT_KEY, String(n)); } catch (e) { /* لا شيء */ }
    return true;
  };
  Save.initSlot = () => {
    const st = store();
    try { const v = st ? Number(st.getItem(Save.SLOT_KEY)) : 1; Save.slot = v >= 1 && v <= Save.SLOTS ? v : 1; } catch (e) { Save.slot = 1; }
  };
  Save.initSlot();
  // أول حفظ صالح في خانة (الرئيسي ثم الاحتياطي) دون تغيير الخانة النشطة
  Save.peekSlot = (n) => {
    const st = store();
    if (!st) return null;
    const K = Save.keys(n);
    for (const key of [K.main, K.bak]) {
      try {
        const raw = st.getItem(key);
        if (!raw) continue;
        const S = Save.parseRaw(raw);
        if (Save.valid(S)) return { S, key, fromBackup: key === K.bak, n: n, size: raw.length };
      } catch (e) { /* التالي */ }
    }
    return null;
  };
  // ---------- ضغط الخانات الباردة ----------
  // حفظ واحد ≈ 1.7 م.حرف و«localStorage» ≈ 5.2 م.حرف فقط، فثلاث خانات (مع النسخ الاحتياطية) لا تتسع غير مضغوطة.
  // لذلك: الخانة النشطة «ساخنة» (JSON عادي + نسخة احتياطية كما كان دائمًا)، وعند الانتقال لخانة أخرى تُضغط الخانة التي نغادرها (LZW بحروف UTF-16 آمنة
  // بلا surrogates) بعد التحقق من أن فكّ الضغط يطابق الأصل حرفًا بحرف، ولا يُستبدل الأصل إلا بعد نجاح التحقق والكتابة. الضغط والفكّ مرة واحدة عند التبديل فقط.
  const LZ_TAG = 'LZW1\n', LZ_MAX = 0xD7FF;
  Save.isPacked = (raw) => typeof raw === 'string' && raw.slice(0, 5) === LZ_TAG;
  Save.pack = (str) => {
    const idx = new Map(), alpha = [];
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); if (!idx.has(c)) { idx.set(c, alpha.length); alpha.push(c); } }
    const A = alpha.length;
    if (A > 20000) return null;
    const dict = new Map(), out = [];
    let next = A, w = -1;
    for (let i = 0; i < str.length; i++) {
      const c = idx.get(str.charCodeAt(i));
      if (w < 0) { w = c; continue; }
      const key = w * A + c, hit = dict.get(key);
      if (hit !== undefined) w = hit;
      else { out.push(w); if (next <= LZ_MAX) dict.set(key, next++); w = c; }
    }
    if (w >= 0) out.push(w);
    const parts = [];
    for (let i = 0; i < out.length; i += 8192) parts.push(String.fromCharCode.apply(null, out.slice(i, i + 8192)));
    return LZ_TAG + JSON.stringify(alpha) + '\n' + parts.join('');
  };
  Save.unpack = (raw) => {
    const nl = raw.indexOf('\n', LZ_TAG.length);
    const alpha = JSON.parse(raw.slice(LZ_TAG.length, nl)), A = alpha.length, dict = new Array(A);
    for (let i = 0; i < A; i++) dict[i] = String.fromCharCode(alpha[i]);
    const res = [];
    let prev = null, next = A;
    for (let i = nl + 1; i < raw.length; i++) {
      const code = raw.charCodeAt(i);
      let entry;
      if (code < next) entry = dict[code];
      else if (code === next && prev !== null) entry = prev + prev.charAt(0);
      else throw new Error('LZW: رمز غير صالح');
      res.push(entry);
      if (prev !== null && next <= LZ_MAX) dict[next++] = prev + entry.charAt(0);
      prev = entry;
    }
    return res.join('');
  };
  Save.parseRaw = (raw) => JSON.parse(Save.isPacked(raw) ? Save.unpack(raw) : raw);
  Save.META_KEY = 'fcc_slotmeta_';
  Save.meta = (S) => { const u = S.players[S.user]; return { name: u.n, ovr: u.ovr, age: u.age, club: S.clubs[u.club] ? S.clubs[u.club].name : '', clubId: u.club, season: S.season, retired: S.phase === 'retired', at: S.savedAt || 0 }; };
  // تبريد خانة (ضغطها): يعيد true إن أصبحت مضغوطة أو كانت كذلك أو فارغة؛ false إن تعذّر وبقيت كما هي
  Save.cool = (n) => {
    const st = store(); if (!st) return false;
    const K = Save.keys(n);
    try {
      const raw = st.getItem(K.main);
      if (!raw || Save.isPacked(raw)) return true;
      if (raw.charAt(0) !== '{' || raw.charAt(raw.length - 1) !== '}') return false;
      const S = JSON.parse(raw);
      if (!Save.valid(S)) return false;
      const pk = Save.pack(raw);
      if (!pk || Save.unpack(pk) !== raw) return false; // تحقق حرفًا بحرف قبل أي تغيير
      st.setItem(K.main, pk);
      try { st.setItem(Save.META_KEY + n, JSON.stringify(Save.meta(S))); } catch (e) { /* اختياري */ }
      st.removeItem(K.bak); // النسخة الاحتياطية الساخنة لا حاجة لها بعد التحقق وهي تستهلك المساحة
      return true;
    } catch (e) { return false; }
  };

  // ملخص كل خانة للعرض: الباردة تُقرأ من بطاقتها الصغيرة بلا فكّ ضغط؛ والساخنة تُقرأ مباشرة
  Save.slots = () => {
    const out = [], st = store();
    for (let n = 1; n <= Save.SLOTS; n++) {
      let info = null, cold = false;
      try {
        const raw = st ? st.getItem(Save.keys(n).main) : null;
        if (raw && Save.isPacked(raw)) {
          cold = true;
          const mt = st.getItem(Save.META_KEY + n);
          if (mt) info = JSON.parse(mt);
        }
      } catch (e) { info = null; }
      if (!info) { const pk = Save.peekSlot(n); if (pk) info = Object.assign(Save.meta(pk.S), { fromBackup: pk.fromBackup }); }
      out.push({ n: n, info: info, cold: cold, active: n === Save.slot });
    }
    return out;
  };
  Save.anyExists = () => { for (let n = 1; n <= Save.SLOTS; n++) { const st = store(), K = Save.keys(n); if (st && (st.getItem(K.main) || st.getItem(K.bak))) return true; } return false; };
  Save.deleteSlot = (n) => {
    const st = store(); if (!st) return false;
    const K = Save.keys(n);
    st.removeItem(K.main); st.removeItem(K.bak); st.removeItem(Save.META_KEY + n);
    if (Number(n) === Save.slot) { Save._pend = false; Save.lastJson = null; }
    return true;
  };

  // ترقية الحفظ القديم: كل وحدة تسجّل دالة idempotent في G.migrations (تُنفَّذ بعد كل تحميل/استيراد)
  G.migrations = G.migrations || [];
  Save.migrate = () => { G.migrations.forEach((fn) => G.safe(fn, 'migrate')); };

  Save.valid = (S) => !!(S && S.v && S.user && S.clubs && S.players && S.players[S.user] && S.phase && typeof S.week === 'number');

  Save.exists = () => { const st = store(); return !!(st && (st.getItem(Save.keys().main) || st.getItem(Save.keys().bak))); };

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
  // force: يتجاوز التجميد والدمج · wantJson: يبني النص حتى لو لم يتوفر تخزين (تستعمله المحاكاة كنقطة استرجاع)
  // الدمج (في المتصفح فقط): الحفظ العادي لا يكتب فورًا بل مرة واحدة في نهاية المهمة الحالية (microtask) —
  // فالنقرة الواحدة التي تستدعي الحفظ عدة مرات (مباراة + أسبوع + إعلام) تكلّف كتابة واحدة بدل ثلاث،
  // دون أي نافذة ضياع: الكتابة تتم قبل أن يعود المتصفح لأي نقرة أو إغلاق. الحفظ القسري يكتب فورًا.
  Save._pend = false;
  Save._defer = () => typeof document !== 'undefined' && typeof queueMicrotask === 'function';
  Save.flush = () => {
    if (!Save._pend) return true;
    Save._pend = false;
    return Save._write(false);
  };
  Save.save = (force, wantJson) => {
    if (!Save.valid(G.S)) return false;
    if (Save._hold > 0 && !force) {
      if (Date.now() - Save._holdAt > 60000) { Save._hold = 0; } // تجميد مهجور
      else { Save._dirty = true; return true; }
    }
    if (!force && !wantJson && Save._defer()) {
      if (!Save._pend) { Save._pend = true; queueMicrotask(Save.flush); }
      return true;
    }
    Save._pend = false;
    return Save._write(wantJson);
  };
  Save._write = (wantJson) => {
    if (!Save.valid(G.S)) return false;
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
      const put = (k, v) => { try { st.setItem(k, v); return true; } catch (e) { return e; } };
      const old = st.getItem(Save.keys().main);
      // ندوّر النسخة الاحتياطية فقط إن كان الحفظ الحالي كاملًا (يبدأ بـ { وينتهي بـ }) كي لا نكتب تالفًا فوق نسخة سليمة
      if (old && old.charAt(0) === '{' && old.charAt(old.length - 1) === '}') {
        if (put(Save.keys().bak, old) !== true) st.removeItem(Save.keys().bak); // لا مساحة للنسخة الاحتياطية
      }
      let r = put(Save.keys().main, json);
      if (r !== true) { st.removeItem(Save.keys().bak); r = put(Save.keys().main, json); } // أخلِ مساحة النسخة الاحتياطية وأعد المحاولة
      if (r !== true) { st.removeItem(Save.keys().rescue); r = put(Save.keys().main, json); } // ثم نسخة الإنقاذ
      if (r !== true) throw r;
      G.lastSaveError = null; Save.failures = 0;
      return true;
    } catch (e) {
      G.lastSaveError = String(e && e.message || e);
      Save.failures = (Save.failures || 0) + 1;
      if (typeof G.onSaveFail === 'function') { try { G.onSaveFail(e, Save.failures); } catch (x) { /* لا شيء */ } }
      return false;
    }
  };

  // أول حفظ صالح بين الرئيسي والاحتياطي (تستعمله شاشة البداية كي لا تُخفي مسيرة سليمة لأن النسخة الرئيسية تالفة)
  Save.peek = () => {
    const st = store();
    if (!st) return null;
    for (const key of [Save.keys().main, Save.keys().bak]) {
      try {
        const raw = st.getItem(key);
        if (!raw) continue;
        const S = Save.parseRaw(raw);
        if (Save.valid(S)) return { S, key, fromBackup: key === Save.keys().bak };
      } catch (e) { /* التالي */ }
    }
    return null;
  };

  Save.load = () => {
    const st = store();
    if (!st) return false;
    Save._pend = false;
    for (const key of [Save.keys().main, Save.keys().bak]) {
      try {
        const raw = st.getItem(key);
        if (!raw) continue;
        const S = Save.parseRaw(raw);
        if (!Save.valid(S)) continue;
        G.S = S;
        if (S.rng) G.rngState = S.rng >>> 0;
        if (G.Media) G.safe(() => G.Media.get(), 'media'); // ترقية الحفظ القديم: إنشاء حالة الإعلام قبل أي لعب
        Save.migrate();
        G.loadedFrom = key;
        return true;
      } catch (e) { /* ننتقل للنسخة الاحتياطية */ }
    }
    // لم نجد حفظًا صالحًا: إن وُجد نص تالف نحتفظ بنسخة منه (نسخة إنقاذ واحدة) كي لا يضيع إن بدأ اللاعب مسيرة جديدة
    try {
      const raw = st.getItem(Save.keys().main) || st.getItem(Save.keys().bak);
      if (raw && raw.length > 1000) {
        G.loadFailed = { size: raw.length, at: Date.now() };
        if (st.getItem(Save.keys().rescue) !== raw) st.setItem(Save.keys().rescue, raw);
      }
    } catch (e) { /* لا شيء */ }
    return false;
  };

  Save.reset = () => {
    const st = store();
    if (!st) return;
    Save._pend = false;
    st.removeItem(Save.keys().main);
    st.removeItem(Save.keys().bak);
    G.S = null;
  };

  Save.exportText = () => JSON.stringify(G.S);
  Save.importText = (txt) => {
    try {
      const S = JSON.parse(txt);
      if (!Save.valid(S)) return false;
      Save._pend = false;
      G.S = S;
      if (S.rng) G.rngState = S.rng >>> 0;
      if (G.Media) G.safe(() => G.Media.get(), 'media');
      Save.migrate();
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
