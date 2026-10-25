/* ui_career.js — الرسائل، مسيرتي (جدول المواسم والأندية)، الإحصائيات والإنجازات والجوائز، والإعدادات (تصدير/استيراد/إعادة ضبط) */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];

  // ---------- الرسائل ----------
  const GROUPS = { all: null, offers: ['offer', 'contract'], awards: ['award'], other: ['news', 'training', 'injury', 'coach', 'media'] };
  const ICON = { news: '📰', offer: '📨', contract: '📝', training: '💪', injury: '🩹', coach: '🧑‍🏫', award: '🏆', media: '📣' };
  UI.screens.inbox = () => {
    const S = G.S, tab = UI.curTab('ib', 'all'), kinds = GROUPS[tab];
    const list = (S.inbox || []).filter((m) => !kinds || kinds.indexOf(m.kind) >= 0);
    const h = UI.tabs('ib', [['all', 'الكل'], ['offers', 'العروض والعقود'], ['awards', 'الجوائز'], ['other', 'أخرى']], 'all') +
      (list.length ? '<div class="card">' + list.slice(0, 60).map((m) => '<div class="msg ' + (m.read ? '' : 'unread') + '"><div class="row sb"><b>' + (ICON[m.kind] || '•') + ' ' + esc(m.title) + '</b><span class="sm mut">م' + m.season + ' · أ' + m.week + '</span></div><div class="sm mut">' + esc(m.text) + '</div></div>').join('') + '</div>' : '<div class="card mut c">لا رسائل.</div>');
    (S.inbox || []).forEach((m) => { m.read = true; });
    UI.after = () => { const b = document.getElementById('inboxBadge'); if (b) b.classList.add('hidden'); G.Save.save(); };
    return h;
  };

  // ---------- مسيرتي ----------
  const trophyIcons = (t) => (t.liga ? '🥇' : '') + (t.ucl ? '🌟' : '');
  function profileCard(p) {
    const tot = G.Season.careerTotals();
    return '<div class="card hl"><div class="row">' + UI.avatar(p.look, p.club, 78) + '<div class="grow"><h3 style="margin:0">' + esc(p.n) + '</h3><div class="mut sm">' + UI.natName(p.nat) + ' · ' + G.POS_AR[p.pos] + ' · ' + p.age + ' سنة</div><div class="mut sm">' + p.h + ' سم · ' + p.w + ' كغ · القدم ' + (p.foot === 'R' ? 'اليمنى' : 'اليسرى') + '</div><div>' + UI.clubTag(p.club, 20) + ' <span class="mut sm">#' + p.num + '</span></div></div><div class="ovr ' + UI.tierCls(p) + '">' + p.ovr + '</div></div>' +
      '<div class="grid3" style="margin-top:12px"><div class="stat"><b>' + tot.apps + '</b><small>مباراة</small></div><div class="stat"><b>' + tot.g + '</b><small>هدف</small></div><div class="stat"><b>' + tot.a + '</b><small>صناعة</small></div>' +
      '<div class="stat"><b>' + (tot.avg ? tot.avg.toFixed(2) : '—') + '</b><small>متوسط التقييم</small></div><div class="stat"><b>' + tot.seasons + '</b><small>مواسم كاملة</small></div><div class="stat"><b>' + (tot.liga + tot.ucl) + '</b><small>ألقاب</small></div></div></div>';
  }

  function seasonsTable(p) {
    const rows = p.car.slice();
    const cur = { label: G.Season.label(G.S.season) + ' ⏳', club: p.club, age: p.age, ovrStart: G.S.seasonStartOvr || p.ovr, ovrEnd: p.ovr, lg: G.Season.statOf(p, 'lg'), uc: G.Season.statOf(p, 'uc'), pos: G.S.league ? G.League.position(p.club) : 0, trophies: {} };
    if (G.S.phase !== 'retired' && G.S.phase !== 'end') rows.push(cur);
    if (!rows.length) return '<div class="card mut c">ستظهر مواسمك هنا.</div>';
    return '<div class="card" style="overflow-x:auto"><table class="t"><tr><th class="l">الموسم</th><th class="l">النادي</th><th>عمر</th><th>تقييم</th><th>الدوري<br><span class="sm">م/ه/ص</span></th><th>الأبطال<br><span class="sm">م/ه/ص</span></th><th></th></tr>' +
      rows.map((r) => '<tr><td class="l">' + r.label + '</td><td class="l sm">' + esc(UI.cname(r.club)) + (r.loan ? ' (إعارة)' : '') + '</td><td>' + r.age + '</td><td>' + r.ovrStart + '→' + r.ovrEnd + '</td><td>' + r.lg.apps + '/' + r.lg.g + '/' + r.lg.a + '</td><td>' + r.uc.apps + '/' + r.uc.g + '/' + r.uc.a + '</td><td>' + trophyIcons(r.trophies || {}) + ((r.awards || []).length ? '🎖️' : '') + '</td></tr>').join('') + '</table></div>';
  }

  UI.screens.career = () => {
    const S = G.S, p = me();
    let h = '';
    if (S.phase === 'retired') {
      const tot = G.Season.careerTotals();
      h += '<div class="card hl c"><div style="font-size:44px">🏁</div><h2>اعتزلتَ كرة القدم</h2><p class="mut">في الموسم ' + G.Season.label(S.retiredAt.season) + ' بعمر ' + S.retiredAt.age + ' سنة بعد ' + tot.seasons + ' مواسم، ' + tot.apps + ' مباراة و' + tot.g + ' هدفًا.</p><button class="btn pri" data-a="newCareer">✨ ابدأ مسيرة جديدة</button></div>';
    }
    h += UI.fifaCard(p) + profileCard(p) + '<div class="card"><h4>🕸️ مخطط سماتك</h4>' + UI.radar(p) + '</div>' + (UI.mediaCard ? UI.mediaCard() : '') + UI.careerCharts(p) + '<h4 style="margin:6px 2px">مسيرتي موسمًا بموسم</h4>' + seasonsTable(p);
    return h;
  };

  // ---------- الإحصائيات والإنجازات ----------
  function achievements(p) {
    const tot = G.Season.careerTotals(), car = p.car || [];
    const uclG = car.reduce((s, r) => s + r.uc.g, 0) + G.Season.statOf(p, 'uc').g;
    const maxOvr = Math.max(p.ovr, p.maxOvr || 0, ...car.map((r) => r.ovrEnd));
    const A = [
      ['⚽', 'أول هدف', tot.g >= 1], ['🔟', '10 أهداف في مسيرتك', tot.g >= 10], ['🎯', '25 هدفًا', tot.g >= 25], ['🔥', '50 هدفًا', tot.g >= 50], ['💯', '100 هدف', tot.g >= 100],
      ['🅰️', '10 صناعات', tot.a >= 10], ['🤝', '50 صناعة', tot.a >= 50],
      ['👕', '25 مباراة', tot.apps >= 25], ['🏟️', '100 مباراة', tot.apps >= 100], ['🧓', '250 مباراة', tot.apps >= 250],
      ['🎩', 'هاتريك', (p.hattricks || 0) >= 1], ['⭐', 'نجم المباراة', (p.motmN || 0) >= 1], ['🌟', 'تقييم مباراة 9.0+', (p.maxRating || 0) >= 9],
      ['🌍', 'أول هدف في دوري الأبطال', uclG >= 1], ['🥇', 'بطل الدوري الإسباني', (p.trophies || {}).liga > 0], ['🏆', 'بطل أوروبا', (p.trophies || {}).ucl > 0],
      ['🎖️', 'جائزة موسمية', (p.awards || []).length > 0],
      ['📈', 'تقييم 70', maxOvr >= 70], ['🚀', 'تقييم 75', maxOvr >= 75], ['👑', 'تقييم 80', maxOvr >= 80], ['💎', 'تقييم 85', maxOvr >= 85], ['🐐', 'تقييم 90', maxOvr >= 90]
    ];
    return A;
  }

  function currentTab(p) {
    const S = G.S, lg = G.Season.statOf(p, 'lg'), uc = G.Season.statOf(p, 'uc');
    const row = (n, s) => '<div class="card"><h4>' + n + '</h4><div class="grid3"><div class="stat"><b>' + s.apps + '</b><small>مباريات</small></div><div class="stat"><b>' + s.g + '</b><small>أهداف</small></div><div class="stat"><b>' + s.a + '</b><small>صناعة</small></div><div class="stat"><b>' + (s.apps ? s.avg.toFixed(2) : '—') + '</b><small>متوسط التقييم</small></div><div class="stat"><b>' + s.min + '</b><small>دقائق</small></div><div class="stat"><b>' + (s.apps ? (s.g / s.apps).toFixed(2) : '—') + '</b><small>أهداف/مباراة</small></div></div></div>';
    let h = row('الدوري الإسباني — ' + G.Season.label(S.season), lg) + row('دوري أبطال أوروبا — ' + G.Season.label(S.season), uc) +
      '<div class="card"><h4>الانضباط</h4><div class="kv"><span>إنذارات (المسيرة)</span><b>🟨 ' + p.cards.y + '</b></div><div class="kv"><span>طرد (المسيرة)</span><b>🟥 ' + p.cards.r + '</b></div><div class="kv"><span>إنذارات حالية نحو الإيقاف</span><span>' + p.yel + ' / 5</span></div></div>';
    const log = (S.matchLog || []).slice(0, 12);
    if (log.length) h += '<div class="card"><h4>آخر مبارياتك</h4><table class="t"><tr><th class="l">المباراة</th><th>النتيجة</th><th>دق</th><th>⚽🅰️</th><th>تقييم</th></tr>' + log.map((m) => {
      const opp = m.userSide === 'h' ? m.a : m.h, gf = m.userSide === 'h' ? m.score.h : m.score.a, ga = m.userSide === 'h' ? m.score.a : m.score.h;
      return '<tr><td class="l sm">' + (m.comp === 'LL' ? 'د' : 'أ') + ' · ' + esc(UI.cname(opp)) + '</td><td class="ltr ' + (gf > ga ? 'pos' : gf < ga ? 'neg' : '') + '">' + gf + '-' + ga + '</td><td>' + m.mins + '</td><td>' + m.g + '/' + m.as + '</td><td>' + (m.rating ? m.rating.toFixed(1) : '—') + '</td></tr>';
    }).join('') + '</table></div>';
    return h;
  }

  function achTab(p) {
    const A = achievements(p), done = A.filter((x) => x[2]).length;
    const t = p.trophies || { liga: 0, ucl: 0 };
    let h = '<div class="card"><div class="row sb"><b>الألقاب</b><span class="pill y">' + (t.liga + t.ucl) + '</span></div><div class="kv"><span>🥇 الدوري الإسباني</span><b>' + (t.liga || 0) + '</b></div><div class="kv"><span>🌟 دوري أبطال أوروبا</span><b>' + (t.ucl || 0) + '</b></div></div>';
    h += '<div class="card"><div class="row sb"><b>الإنجازات</b><span class="pill g">' + done + ' / ' + A.length + '</span></div>' + UI.bar(done / A.length * 100, 'gold') + '<div class="grid2" style="margin-top:10px">' +
      A.map((x) => '<div class="stat" style="' + (x[2] ? 'border:1px solid var(--gold)' : 'opacity:.4') + ';text-align:center"><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('') + '</div></div>';
    if ((p.awards || []).length) h += '<div class="card"><h4>جوائزي الفردية</h4>' + p.awards.slice().reverse().map((a) => '<div class="kv"><span>' + G.Season.label(a.season) + '</span><span>🎖️ ' + G.Season.AWARD_AR[a.type] + '</span></div>').join('') + '</div>';
    return h;
  }

  function histTab() {
    const hist = G.S.hist || [];
    if (!hist.length) return '<div class="card mut c">ستظهر نتائج المواسم المكتملة هنا.</div>';
    return hist.slice().reverse().map((h) => '<div class="card"><h4>موسم ' + h.label + '</h4><div class="kv"><span>🥇 بطل الدوري</span><b>' + esc(UI.cname(h.champion)) + '</b></div>' + (h.uclWinner ? '<div class="kv"><span>🌟 بطل أوروبا</span><b>' + esc(UI.cname(h.uclWinner)) + '</b></div>' : '') +
      (h.awards || []).map((a) => '<div class="kv"><span>' + G.Season.AWARD_AR[a.type] + '</span><span' + (a.user ? ' class="gold b"' : '') + '>' + esc(a.name) + ' <span class="mut sm">(' + esc(UI.cname(a.club)) + ' · ' + a.value + ')</span></span></div>').join('') + '</div>').join('');
  }

  UI.screens.stats = () => {
    const p = me();
    const tabs = UI.tabs('st', [['cur', 'هذا الموسم'], ['ach', 'الإنجازات'], ['hist', 'سجل المواسم']], 'cur');
    const t = UI.curTab('st', 'cur');
    return tabs + (t === 'cur' ? currentTab(p) : t === 'ach' ? achTab(p) : histTab());
  };

  // ---------- الإعدادات ----------
  UI.screens.settings = () => {
    const S = G.S;
    let h = '<div class="card"><h3>💾 الحفظ</h3><p class="sm mut">اللعبة تحفظ تلقائيًا بعد كل مباراة وأسبوع وقرار، وعند إغلاق الصفحة. آخر حفظ: ' + (S.savedAt ? new Date(S.savedAt).toLocaleString('ar') : '—') + '</p>' +
      '<button class="btn pri" data-a="saveNow">💾 احفظ الآن</button><button class="btn" data-a="exportSave">📤 تصدير الحفظ (نسخ النص)</button><button class="btn" data-a="importSheet">📥 استيراد حفظ</button></div>';
    if (UI.diffCard) h += UI.diffCard();
    h += '<div class="card"><h3>📘 دليل اللعبة</h3><p class="sm mut">شرح مختصر لأهم أجزاء اللعبة.</p><button class="btn" data-a="tourOpen">افتح الدليل</button></div>';
    const P = UI.prefs;
    const tgl = (k, on, title, sub) => '<div class="setrow"><div>' + title + '<small>' + sub + '</small></div><button class="tgl ' + (on ? 'on' : '') + '" data-a="prefToggle" data-v="' + k + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + title + '"></button></div>';
    h += '<div class="card"><h3>🔊 الصوت والاهتزاز</h3>' +
      tgl('sound', P.sound !== false, 'المؤثرات الصوتية', 'صافرات وجمهور وأهداف — تُولَّد داخل اللعبة بلا ملفات') +
      tgl('haptics', P.haptics !== false, 'الاهتزاز', 'عند الأهداف والبطاقات ولحظات القرار (الهواتف التي تدعمه)') +
      '<button class="btn sm" data-a="fxTest">🎧 جرّب المؤثرات</button></div>';
    h += '<div class="card"><h3>🧪 سلامة البيانات</h3><button class="btn" data-a="validateNow">فحص الجداول والنتائج</button>' + (S.check ? '<p class="sm ' + (S.check.ok ? 'pos' : 'neg') + '">آخر فحص: ' + (S.check.ok ? 'سليم ✔️' : S.check.errs.length + ' ملاحظات (أُصلحت تلقائيًا)') + '</p>' : '') + '</div>';
    h += '<div class="card"><h3>🔄 المسيرة</h3><button class="btn" data-a="newCareer">✨ بدء مسيرة جديدة (يبقى الحفظ الحالي كنسخة احتياطية)</button><button class="btn red" data-a="wipeAsk">🗑️ حذف كل البيانات</button></div>';
    h += '<div class="card"><h3>ℹ️ عن البيانات</h3><p class="sm mut">أسماء الأندية حقيقية (موسم 2025/26 كمرجع) والتقييمات والقيم تقريبية وقابلة للتعديل من <span class="ltr">js/data.js</span>. اللاعبون خياليون بالكامل لعدم وجود تراخيص. المسابقتان: الدوري الإسباني ودوري أبطال أوروبا فقط.</p></div>';
    if (S.errors && S.errors.length) h += '<div class="card"><h4>سجل الأخطاء (للدعم)</h4>' + S.errors.slice(-6).reverse().map((e) => '<div class="sm mut ltr">' + esc(e.label) + ': ' + esc(e.msg) + '</div>').join('') + '</div>';
    return h;
  };

  UI.on('prefToggle', (k) => {
    if (k !== 'sound' && k !== 'haptics') return false;
    UI.prefs[k] = UI.prefs[k] === false; // الافتراضي مفعّل: غير المعرَّف أو true يصبح false، وfalse يصبح true
    UI.savePrefs();
    if (k === 'sound' && UI.prefs.sound === false && G.Audio) G.Audio.crowd(false);
    if (UI.prefs[k]) UI.fx(k === 'sound' ? 'ping' : 'done');
  });
  UI.on('fxTest', () => { UI.fx('goalMe'); UI.banner('me', '⚽ هدف!', 'هكذا تبدو المؤثرات'); return false; });
  UI.on('saveNow', () => { UI.toast(G.Save.save() ? 'تم الحفظ ✔️' : 'تعذّر الحفظ (قد يكون التخزين ممتلئًا أو معطّلًا)'); });
  UI.on('exportSave', () => {
    const txt = G.Save.exportText();
    const ok = (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText(txt).then(() => UI.toast('نُسخ نص الحفظ'), () => showText(txt)) : (showText(txt), null);
    return false;
  });
  function showText(txt) {
    UI.sheet('<h3>نص الحفظ</h3><p class="sm mut">انسخه كاملًا واحتفظ به.</p><textarea id="expTxt" rows="8" readonly style="width:100%;background:var(--card2);color:var(--txt);border:1px solid var(--line);border-radius:12px;padding:8px;direction:ltr">' + esc(txt) + '</textarea><button class="btn" data-a="closeSheet">إغلاق</button>');
    const t = document.getElementById('expTxt'); if (t) { t.focus(); t.select(); }
  }
  UI.on('validateNow', () => { const c = G.Season.validateAll(); G.Save.save(); UI.toast(c.ok ? 'كل شيء سليم ✔️' : 'وُجدت ' + c.errs.length + ' ملاحظات وأُصلحت'); });
  UI.on('newCareer', () => {
    UI.confirm('بدء مسيرة جديدة؟', 'ستُفتح شاشة إنشاء لاعب جديد. حفظك الحالي لا يُحذف فورًا — يبقى كنسخة احتياطية حتى تبدأ المسيرة الجديدة.', () => {
      G.Save.save(); G.S = null; UI.wz = null; UI.cur = 'home'; UI.sub = {}; UI.acts.wzNew(); UI.render();
    }, 'متابعة');
    return false;
  });
  UI.on('wipeAsk', () => {
    UI.confirm('حذف كل البيانات؟', 'سيُحذف الحفظ والنسخة الاحتياطية نهائيًا. لا يمكن التراجع.', () => { G.Save.reset(); UI.wz = null; UI.cur = 'home'; UI.render(); }, 'احذف');
    return false;
  });
})(window.G = window.G || {});
