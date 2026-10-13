/* ui_start.js — شاشة البداية، المتابعة، استيراد حفظ، ومعالج إنشاء اللاعب (5 خطوات) مع توقّع دور اللاعب في كل نادٍ */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;

  const natName = (code) => { const n = G.NATS.find((x) => x[0] === code); return n ? n[1] : code; };
  UI.natName = natName;

  function peek() {
    try {
      const raw = localStorage.getItem(G.CONFIG.saveKey) || localStorage.getItem(G.CONFIG.backupKey);
      if (!raw) return null;
      const S = JSON.parse(raw);
      if (!G.Save.valid(S)) return null;
      const u = S.players[S.user];
      return { name: u.n, ovr: u.ovr, age: u.age, club: S.clubs[u.club] ? S.clubs[u.club].name : '', season: G.Season.label(S.season), retired: S.phase === 'retired' };
    } catch (e) { return null; }
  }

  const fresh = () => ({
    step: 1, name: '', nat: 'IQ', age: 18, pos: 'ST', h: 180, w: 74, foot: 'R',
    look: { skin: 2, hair: 0, style: 0 }, num: 9, clubId: null, seed: (Date.now() & 0x7fffffff) || 7, world: null
  });

  // ---------- عالم المعاينة (نفس البذرة التي ستستخدمها newGame ⇒ نفس الفرق) ----------
  function ensureWorld(wz) {
    if (wz.world) return wz.world;
    const keepS = G.S, keepR = G.rngState;
    try {
      U.seed(wz.seed);
      G.S = { v: 1, nextId: 1, season: 1, year: G.CONFIG.startYear, clubs: {}, players: {}, free: [], uclHistory: [] };
      G.Players.initWorld();
      wz.world = G.S;
    } finally { G.S = keepS; G.rngState = keepR; }
    return wz.world;
  }
  function expectedOvr(age) { return U.clamp(52 + (age - 16) * 3, 40, 70); }

  function previews(wz) {
    const world = ensureWorld(wz), keepS = G.S, keepR = G.rngState, out = [];
    try {
      G.S = world;
      const ovr = expectedOvr(wz.age);
      const fake = { pos: wz.pos, age: wz.age, ovr, pot: Math.max(76, ovr + 10), trust: 45, form: [], fit: 90 };
      const ids = Object.keys(world.clubs).filter((id) => world.clubs[id].liga);
      const byRep = ids.slice().sort((a, b) => world.clubs[b].rep - world.clubs[a].rep);
      ids.forEach((id) => {
        const c = world.clubs[id], ev = G.Coach.evaluateAt(fake, id), rival = ev.rival ? world.players[ev.rival] : null;
        out.push({ id, name: c.name, rep: c.rep, strength: G.Players.clubStrength(c), role: ev.role, diff: ev.diff, rival: rival ? { n: rival.n, ovr: rival.ovr } : null, ucl: byRep.indexOf(id) < G.CONFIG.uclSpainSlots, c: c.c });
      });
    } finally { G.S = keepS; G.rngState = keepR; }
    return out.sort((a, b) => b.rep - a.rep);
  }

  // ---------- الشاشات ----------
  UI.screens.start = () => {
    if (UI.wz) return wizard();
    const sv = peek();
    let h = '<div class="hero"><div class="big">⚽</div><h1>مسيرة لاعب</h1><p class="mut">ابدأ كلاعب ناشئ في الدوري الإسباني وادفع بنفسك نحو دوري أبطال أوروبا</p></div>';
    if (sv) {
      h += '<div class="card hl"><h3>مسيرة محفوظة</h3><div class="kv"><span>اللاعب</span><b>' + esc(sv.name) + '</b></div><div class="kv"><span>النادي</span><span>' + esc(sv.club) + '</span></div><div class="kv"><span>الموسم</span><span>' + sv.season + '</span></div><div class="kv"><span>التقييم / العمر</span><span>' + sv.ovr + ' / ' + sv.age + '</span></div><button class="btn pri" data-a="continueGame">▶ متابعة المسيرة</button></div>';
    }
    h += '<button class="btn ' + (sv ? '' : 'pri') + '" data-a="wzNew">✨ مسيرة جديدة</button>';
    h += '<button class="btn" data-a="importSheet">📥 استيراد حفظ من نص</button>';
    h += '<div class="notice" style="margin-top:14px">ℹ️ أسماء الأندية حقيقية (موسم 2025/26 كمرجع)، أما اللاعبون فخياليون بالكامل لعدم وجود تراخيص رسمية. كل البيانات الأولية قابلة للتعديل من ملف <span class="ltr">js/data.js</span>.</div>';
    return h;
  };

  const steps = ['الهوية', 'الجسم والمركز', 'المظهر', 'النادي', 'تأكيد'];
  function progress(wz) {
    return '<div class="row" style="gap:5px;margin:4px 0 14px">' + steps.map((s, i) => '<div class="grow"><div class="bar ' + (i + 1 <= wz.step ? '' : 'blue') + '" style="height:6px;opacity:' + (i + 1 <= wz.step ? 1 : .25) + '"><i style="width:100%"></i></div><div class="sm c ' + (i + 1 === wz.step ? '' : 'mut') + '" style="margin-top:3px">' + s + '</div></div>').join('') + '</div>';
  }

  function wizard() {
    const wz = UI.wz;
    let h = '<h2>إنشاء لاعبك</h2>' + progress(wz);
    if (wz.step === 1) {
      h += '<div class="card"><label class="f">اسم اللاعب</label><input type="text" id="wzName" data-in="wzName" maxlength="24" placeholder="مثال: حسام الموصلي" value="' + esc(wz.name) + '" autocomplete="off">' +
        '<label class="f">الجنسية</label><select data-in="wzNat">' + G.NATS.map((n) => '<option value="' + n[0] + '"' + (n[0] === wz.nat ? ' selected' : '') + '>' + n[1] + '</option>').join('') + '</select>' +
        '<label class="f">العمر عند البداية (16–21)</label><div class="chips">' + [16, 17, 18, 19, 20, 21].map((a) => '<button class="chip ' + (wz.age === a ? 'on' : '') + '" data-a="wzAge" data-v="' + a + '">' + a + '</button>').join('') + '</div>' +
        '<p class="sm mut" style="margin-top:10px">تقييمك الابتدائي يقارب <b>' + expectedOvr(wz.age) + '</b> (الأصغر سنًا يبدأ أضعف لكن بمجال تطور أوسع). لن تصبح نجمًا في موسم واحد.</p></div>';
    } else if (wz.step === 2) {
      h += '<div class="card"><label class="f">المركز</label><div class="grid3">' + G.POS.map((p) => '<button class="chip ' + (wz.pos === p ? 'on' : '') + '" data-a="wzPos" data-v="' + p + '" style="border-radius:14px;text-align:center"><b>' + p + '</b><br><span class="sm">' + G.POS_AR[p] + '</span></button>').join('') + '</div>' +
        '<label class="f">الطول: <b id="wzHv">' + wz.h + '</b> سم</label><input type="range" min="165" max="200" value="' + wz.h + '" data-in="wzH">' +
        '<label class="f">الوزن: <b id="wzWv">' + wz.w + '</b> كغ</label><input type="range" min="58" max="95" value="' + wz.w + '" data-in="wzW">' +
        '<label class="f">القدم المفضلة</label><div class="chips">' + [['R', 'اليمنى'], ['L', 'اليسرى']].map((f) => '<button class="chip ' + (wz.foot === f[0] ? 'on' : '') + '" data-a="wzFoot" data-v="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
        '<p class="sm mut" style="margin-top:10px">الطول الأكبر يزيد القوة البدنية ويخفض السرعة قليلًا، والعكس صحيح. ' + (wz.pos === 'GK' ? 'الحراس يبدؤون بسمات حراسة بدل التسديد.' : '') + '</p></div>';
    } else if (wz.step === 3) {
      const L = G.LOOK;
      h += '<div class="card"><div class="c">' + UI.avatar(wz.look, null, 110) + '</div>' +
        '<label class="f">لون البشرة</label><div class="chips">' + L.skin.map((c, i) => '<button class="chip ' + (wz.look.skin === i ? 'on' : '') + '" data-a="wzLook" data-v="skin" data-v2="' + i + '" style="background:' + c + ';width:46px;height:46px;padding:0" aria-label="بشرة ' + (i + 1) + '"></button>').join('') + '</div>' +
        '<label class="f">لون الشعر</label><div class="chips">' + L.hair.map((c, i) => '<button class="chip ' + (wz.look.hair === i ? 'on' : '') + '" data-a="wzLook" data-v="hair" data-v2="' + i + '" style="background:' + c + ';width:46px;height:46px;padding:0" aria-label="شعر ' + (i + 1) + '"></button>').join('') + '</div>' +
        '<label class="f">قصّة الشعر</label><div class="chips">' + L.styles.map((c, i) => '<button class="chip ' + (wz.look.style === i ? 'on' : '') + '" data-a="wzLook" data-v="style" data-v2="' + i + '">' + c + '</button>').join('') + '</div>' +
        '<label class="f">رقم القميص المفضل (إن كان محجوزًا يُعطى رقمًا قريبًا)</label><input type="number" min="1" max="99" value="' + wz.num + '" data-in="wzNum" inputmode="numeric"></div>';
    } else if (wz.step === 4) {
      const list = previews(wz);
      h += '<div class="notice">اختر ناديك. التوقّع أدناه تقديري لدورك مع تقييم لاعب بعمر ' + wz.age + ' (≈' + expectedOvr(wz.age) + ') — الأندية الكبرى توفّر مستوى أعلى لكن فرص اللعب أقل بكثير للناشئين. 🏆 = يشارك في دوري الأبطال هذا الموسم.</div>';
      list.forEach((c) => {
        const sel = wz.clubId === c.id;
        h += '<button class="card" data-a="wzClub" data-v="' + c.id + '" style="width:100%;text-align:start;margin-bottom:8px;' + (sel ? 'border-color:var(--acc);background:#16301f' : '') + '"><div class="row"><span>' + clubBadge(c) + '</span><div class="grow"><b>' + esc(c.name) + '</b> ' + (c.ucl ? '🏆' : '') + '<div class="sm mut">القوة ' + c.strength + (c.rival ? ' · المنافس: ' + esc(c.rival.n) + ' (' + c.rival.ovr + ')' : '') + '</div></div>' + UI.rolePill(c.role) + '</div></button>';
      });
    } else {
      const c = G.S && G.S.clubs[wz.clubId] ? G.S.clubs : ensureWorld(wz).clubs;
      const cl = c[wz.clubId];
      h += '<div class="card hl"><div class="row"><div>' + UI.avatar(wz.look, null, 84) + '</div><div class="grow"><h3 style="margin:0">' + esc(wz.name.trim()) + '</h3><div class="mut">' + natName(wz.nat) + ' · ' + wz.age + ' سنة</div><div class="mut">' + G.POS_AR[wz.pos] + ' (' + wz.pos + ') · ' + wz.h + ' سم · ' + wz.w + ' كغ · ' + (wz.foot === 'R' ? 'يمنى' : 'يسرى') + '</div></div></div>' +
        '<div class="kv"><span>النادي</span><b>' + esc(cl ? cl.name : '') + '</b></div><div class="kv"><span>التقييم الابتدائي</span><span>≈ ' + expectedOvr(wz.age) + '</span></div><div class="kv"><span>رقم القميص</span><span>' + wz.num + '</span></div></div>' +
        '<div class="notice ok">سيتم حفظ مسيرتك تلقائيًا. يمكنك إغلاق المتصفح والعودة في أي وقت.</div>';
    }
    const back = wz.step > 1 ? '<button class="btn" data-a="wzStep" data-v="-1">→ السابق</button>' : '<button class="btn" data-a="wzCancel">إلغاء</button>';
    const next = wz.step < 5 ? '<button class="btn pri" data-a="wzStep" data-v="1">التالي ←</button>' : '<button class="btn gold" data-a="wzStart">🚀 ابدأ المسيرة</button>';
    return h + '<div class="grid2" style="margin-top:6px">' + next + back + '</div>';
  }
  const clubBadge = (c) => {
    // الشارة تحتاج G.S.clubs؛ نبني نسخة مبسطة هنا لأن العالم المعاين ليس G.S
    const keep = G.S; G.S = G.UI.wz.world;
    try { return UI.badge(c.id, 36); } finally { G.S = keep; }
  };

  // ---------- الإجراءات ----------
  UI.on('wzNew', () => { UI.wz = fresh(); });
  UI.on('wzCancel', () => { UI.wz = null; });
  UI.on('wzAge', (v) => { UI.wz.age = +v; UI.wz.clubId = null; });
  UI.on('wzPos', (v) => { UI.wz.pos = v; UI.wz.clubId = null; });
  UI.on('wzFoot', (v) => { UI.wz.foot = v; });
  UI.on('wzLook', (k, i) => { UI.wz.look[k] = +i; });
  UI.on('wzClub', (v) => { UI.wz.clubId = v; });
  UI.ins.wzName = (v) => { UI.wz.name = v; };
  UI.ins.wzNat = (v) => { UI.wz.nat = v; };
  UI.ins.wzNum = (v) => { UI.wz.num = U.clamp(parseInt(v, 10) || 9, 1, 99); };
  UI.ins.wzH = (v) => { UI.wz.h = +v; const e = document.getElementById('wzHv'); if (e) e.textContent = v; };
  UI.ins.wzW = (v) => { UI.wz.w = +v; const e = document.getElementById('wzWv'); if (e) e.textContent = v; };

  UI.on('wzStep', (v) => {
    const wz = UI.wz, d = +v;
    if (d > 0) {
      if (wz.step === 1 && wz.name.trim().length < 2) { UI.toast('اكتب اسم اللاعب (حرفان على الأقل)'); return false; }
      if (wz.step === 4 && !wz.clubId) { UI.toast('اختر النادي أولًا'); return false; }
    }
    wz.step = U.clamp(wz.step + d, 1, 5);
    window.scrollTo(0, 0);
  });

  UI.on('wzStart', () => {
    const wz = UI.wz;
    if (!wz.clubId || wz.name.trim().length < 2) { UI.toast('أكمل بيانات اللاعب'); return false; }
    const doStart = () => {
      // لا نمسح الحفظ القديم: newGame تحفظ فوقه والقديم يبقى نسخة احتياطية
      const S = G.Season.newGame({ name: wz.name.trim(), nat: wz.nat, age: wz.age, pos: wz.pos, h: wz.h, w: wz.w, foot: wz.foot, look: wz.look, num: wz.num, clubId: wz.clubId, seed: wz.seed });
      UI.wz = null; UI.cur = 'home'; UI.sub = {};
      UI.toast('بدأت مسيرتك! ابدأ بفترة الإعداد ثم انطلق في الموسم');
      return S;
    };
    const r = G.safe(doStart, 'newGame');
    if (!r) { UI.toast('تعذّر إنشاء اللعبة: ' + (G.lastError ? G.lastError.msg : '')); return false; }
  });

  UI.on('continueGame', () => {
    if (!G.Save.load()) { UI.toast('تعذّر تحميل الحفظ'); return false; }
    UI.cur = G.S.phase === 'retired' ? 'career' : 'home';
  });

  UI.on('importSheet', () => {
    UI.sheet('<h3>استيراد حفظ</h3><p class="mut sm">الصق نص الحفظ الذي صدّرتَه سابقًا من صفحة الإعدادات.</p><textarea id="impTxt" rows="7" style="width:100%;background:var(--card2);color:var(--txt);border:1px solid var(--line);border-radius:12px;padding:8px;direction:ltr"></textarea><button class="btn pri" data-a="importDo">استيراد</button><button class="btn" data-a="closeSheet">إلغاء</button>');
    return false;
  });
  UI.on('importDo', () => {
    const t = document.getElementById('impTxt');
    if (!t || !t.value.trim()) { UI.toast('لا يوجد نص'); return false; }
    if (G.Save.importText(t.value)) { UI.closeSheet(); UI.wz = null; UI.cur = 'home'; UI.toast('تم الاستيراد'); }
    else { UI.toast('النص غير صالح — لم يتغير شيء'); return false; }
  });
})(window.G = window.G || {});
