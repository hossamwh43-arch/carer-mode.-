/* ui_sim.js — واجهة محاكي الموسم: بطاقة الرئيسية، نافذة الخيارات، شاشة التقدّم الحيّة، وتقرير المحاكاة */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc, $ = (s) => document.querySelector(s);
  const me = () => G.S.players[G.S.user];
  UI.titles.simreport = 'تقرير المحاكاة';
  const COMP = { LL: ['الدوري', '🏆'], UCL: ['الأبطال', '⭐'] };
  const STOP_CLS = { end: 'ok', limit: 'ok', started: 'ok', cancel: '', error: 'bad', blocked: 'bad' };
  const STOP_ICON = { end: '🏁', limit: '✅', started: '▶️', offers: '🔁', window: '🏟️', injury: '🩹', dp: '💪', role: '📋', press: '🎤', key: '⭐', cancel: '⏹', error: '⚠️', blocked: '⛔' };
  const EV_ICON = { inj: '🩹', red: '🟥', susp: '🟨', goal: '⚽', offer: '🔁', window: '🏟️', lvl: '💪', ucl: '⭐', role: '📋', award: '🏆', summer: '☀️', press: '🎤', media: '📣' };

  // ---------- بطاقة الرئيسية ----------
  UI.simCard = () => {
    const S = G.S, can = G.Sim.canRun();
    if (!can.ok) return '';
    const rep = S.simReport;
    if (S.phase === 'summer') {
      return '<div class="card simcard"><div class="row sb"><b>⚡ محاكاة</b><span class="pill y">الصيف</span></div>' +
        '<div class="sm mut" style="margin:6px 0">تخطَّ فترة الإعداد وابدأ الموسم فورًا، أو حاكِ الموسم كاملًا بضغطة واحدة.</div>' +
        '<button class="btn pri" data-a="simOpen">⚡ خيارات المحاكاة</button>' +
        (rep ? '<button class="btn sm" style="margin-top:8px" data-a="go" data-v="simreport">📋 آخر تقرير محاكاة</button>' : '') + '</div>';
    }
    const left = G.Sim.weeksLeft();
    return '<div class="card simcard"><div class="row sb"><b>⚡ محاكاة الموسم</b><span class="pill b">' + UI.week() + '</span></div>' +
      '<div style="margin:8px 0 4px">' + UI.bar(((S.week - 1) / 39) * 100, 'blue') + '</div>' +
      '<div class="sm mut">تبقّى ' + left + (left === 1 ? ' أسبوع' : left === 2 ? ' أسبوعان' : left <= 10 ? ' أسابيع' : ' أسبوعًا') + ' — مبارياتك والتدريب تُحاكى تلقائيًا ويُعدّ لك تقرير مفصّل.</div>' +
      '<div class="grid2"><button class="btn" data-a="simGo" data-v="weeks" data-v2="1">⏭ الأسبوع القادم</button><button class="btn pri" data-a="simOpen">⚡ خيارات المحاكاة</button></div>' +
      (rep ? '<button class="btn sm" style="margin-top:8px" data-a="go" data-v="simreport">📋 آخر تقرير محاكاة</button>' : '') + '</div>';
  };

  // ---------- نافذة الخيارات ----------
  function chip(on, act, v, label) { return '<button class="chip ' + (on ? 'on' : '') + '" data-a="' + act + '" data-v="' + v + '">' + (on ? '✓ ' : '') + label + '</button>'; }

  function sheetHtml() {
    const S = G.S, P = UI.prefs, R = P.simStop, can = G.Sim.canRun();
    let h = '<h3>⚡ محاكاة الموسم</h3>';
    if (!can.ok) return h + '<div class="notice bad">' + esc(can.msg) + '</div><button class="btn" data-a="closeSheet">إغلاق</button>';
    const summer = S.phase === 'summer', left = G.Sim.weeksLeft();
    h += '<div class="row sb sm"><span>موسم ' + G.Season.label(S.season) + '</span><span>' + (summer ? '☀️ الصيف (' + S.preLeft + ' حصص إعداد متبقية)' : UI.week()) + '</span></div>' + UI.bar(summer ? 0 : ((S.week - 1) / 39) * 100, 'blue');
    if (S.active) h += '<div class="notice" style="margin-top:10px">⏱️ لديك مباراة جارية — ستُكمَل آليًا ضمن المحاكاة.</div>';
    if (summer && (S.offers || []).length) h += '<div class="notice" style="margin-top:10px">🔁 لديك ' + S.offers.length + (S.offers.length === 1 ? ' عرض' : ' عروض') + ' انتقال: تخطي الصيف يُغلق السوق دون الرد عليها.</div>';
    h += '<div style="height:6px"></div>';
    if (summer) {
      h += '<button class="btn pri" data-a="simGo" data-v="summer">☀️ تخطَّ الصيف وابدأ الموسم</button>' +
        '<button class="btn" data-a="simGo" data-v="event">🔔 تخطَّ الصيف ثم حاكِ حتى الحدث التالي</button>' +
        '<button class="btn" data-a="simGo" data-v="season">🏁 تخطَّ الصيف وحاكِ الموسم كاملًا (بلا توقف)</button>';
    } else {
      h += '<div class="grid2"><button class="btn" data-a="simGo" data-v="weeks" data-v2="1">⏭ أسبوع واحد</button>' +
        (left > 4 ? '<button class="btn" data-a="simGo" data-v="weeks" data-v2="4">📅 4 أسابيع</button>' : '<button class="btn dis" disabled>📅 4 أسابيع</button>') + '</div>' +
        '<button class="btn pri" data-a="simGo" data-v="event">🔔 حتى الحدث التالي (يحترم قواعد التوقف)</button>' +
        '<button class="btn" data-a="simGo" data-v="season">🏁 حتى نهاية الموسم (بلا توقف)</button>';
    }
    h += '<h4 style="margin-top:16px">أوقفني عند: <span class="sm mut">(للأسابيع و«الحدث التالي»)</span></h4><div class="chips">' +
      G.Sim.RULES.map((r) => chip(R[r[0]], 'simRule', r[0], r[1] + ' ' + r[2])).join('') + '</div>' +
      '<h4 style="margin-top:14px">خيارات ذكية:</h4><div class="chips">' +
      chip(P.simAutoDP, 'simOpt', 'simAutoDP', '🧠 أصرف نقاط التطوير تلقائيًا') + chip(P.simRest, 'simOpt', 'simRest', '🔋 احمِ لياقتي (تدريب أخف عند الإرهاق)') + '</div>';
    const t = S.training || {}, fo = G.Training.FOCUS.find((x) => x.id === t.focus), it = G.Training.INTENSITY[t.intensity];
    h += '<p class="sm mut" style="margin:14px 0 0">• مبارياتك تُحاكى بنفس محرك المباراة (قراراتك التفاعلية تُحسم آليًا).<br>• التدريب يستمر بإعداداتك: ' + (fo ? fo.ar : '—') + ' · ' + (it ? it.ar : '—') + '. <button class="lnk" data-a="simTrain">تغيير</button><br>• نتيجة المحاكاة مطابقة تمامًا لما كان سيحدث لو حاكيتَ الأسابيع واحدًا واحدًا.</p>' +
      '<button class="btn" data-a="closeSheet" style="margin-top:12px">إغلاق</button>';
    return h;
  }

  UI.on('simOpen', () => { UI.sheetRender(sheetHtml); return false; });
  UI.on('simRule', (k) => { UI.prefs.simStop[k] = !UI.prefs.simStop[k]; UI.savePrefs(); });
  UI.on('simOpt', (k) => { UI.prefs[k] = !UI.prefs[k]; UI.savePrefs(); });
  UI.on('simTrain', () => { UI.closeSheet(); UI.cur = 'train'; window.scrollTo(0, 0); });

  // ---------- التشغيل ----------
  UI.on('simGo', (mode, v2) => {
    if (UI._sim) return false;
    const P = UI.prefs, none = { offers: false, window: false, injury: false, key: false, dp: false, role: false, press: false };
    const opts = { mode, weeks: +v2 || 1, rules: mode === 'season' ? none : Object.assign({}, P.simStop), autoDP: !!P.simAutoDP, rest: P.simRest !== false };
    UI.closeSheet();
    UI.simStart(opts);
    return false;
  });
  UI.on('simStop', () => { if (UI._sim) { G.Sim.cancel(UI._sim); const b = $('#simStopBtn'); if (b) { b.disabled = true; b.textContent = 'جارٍ الإيقاف عند نهاية الأسبوع…'; } } return false; });
  UI.backHooks.push(() => { if (UI._sim) { UI.acts.simStop(); return true; } return false; });

  const rowHtml = (m) => {
    const cls = m.res === 'W' ? 'w' : m.res === 'L' ? 'l' : 'd', cc = COMP[m.c] || ['', ''];
    const sc = m.gf + ' - ' + m.ga + (m.pf != null ? ' (' + m.pf + '-' + m.pa + ' ر.ج)' : '');
    return '<div class="srow ' + cls + '"><span class="sw">أ' + m.w + '</span><span class="sc2">' + cc[1] + '</span><span class="so">' + (m.ha === 'a' ? '✈️ ' : '') + esc(UI.cname(m.o)) + '</span><b class="sco">' + sc + '</b>' +
      (m.min > 0 ? UI.rating(m.r) + (m.g ? '<span class="sg">⚽' + (m.g > 1 ? m.g : '') + '</span>' : '') + (m.a ? '<span class="sg">🅰️' + (m.a > 1 ? m.a : '') + '</span>' : '') : '<span class="mut sm">لم تشارك</span>') + '</div>';
  };

  function overlayHtml(run) {
    return '<div class="simov-in"><div class="simov-ball">⚽</div><h2 id="simTitle">جارٍ المحاكاة…</h2><div class="sm mut" id="simSub"></div>' +
      '<div class="bar blue big"><i id="simBar" style="width:0%"></i></div><div class="sm" id="simCnt"></div><div class="simfeed" id="simFeed"></div>' +
      '<button class="btn red" id="simStopBtn" data-a="simStop">⏹ إيقاف</button></div>';
  }
  function overlayUpdate(run) {
    const S = G.S, ph = S.phase;
    const total = run.mode === 'weeks' ? Math.min(run.maxWeeks, 39 - (run.week0 || 1) + 1) : (run.phase0 === 'summer' ? 39 : 39 - run.week0 + 1);
    const pct = U.clamp(total ? (run.weeks / total) * 100 : 100, 0, 100);
    const bar = $('#simBar'), sub = $('#simSub'), cnt = $('#simCnt'), feed = $('#simFeed');
    if (bar) bar.style.width = pct + '%';
    if (sub) sub.textContent = 'موسم ' + run.label + ' · ' + (ph === 'summer' ? 'الصيف' : ph === 'end' ? 'انتهى الموسم' : 'الأسبوع ' + S.week + ' من 39');
    if (cnt) cnt.textContent = run.mode === 'summer' ? 'فترة الإعداد…' : 'أُنجز ' + run.weeks + (run.mode === 'weeks' ? ' من ' + total : '') + ' أسبوعًا · ' + run.matches.length + ' مباراة لفريقك';
    if (feed) feed.innerHTML = run.matches.slice(-6).reverse().map(rowHtml).join('') || '<div class="mut sm c">…</div>';
  }

  UI.simStart = (opts) => {
    if (UI._sim) return;
    const run = G.Sim.begin(opts);
    if (!run.ok) { UI.toast(run.msg); return; }
    UI._sim = run;
    if (UI.matchStop) UI.matchStop();
    let ov = $('#simOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'simOv'; ov.className = 'simov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-live', 'polite'); document.body.appendChild(ov); }
    ov.innerHTML = overlayHtml(run); ov.classList.remove('hidden');
    overlayUpdate(run);
    const tick = () => {
      if (UI._sim !== run) return;
      G.safe(() => G.Sim.step(run), 'simStep');
      overlayUpdate(run);
      if (run.done) { UI._simT = setTimeout(() => finish(run), 220); return; }
      UI._simT = setTimeout(tick, 70);
    };
    UI._simT = setTimeout(tick, 80);
  };

  function finish(run) {
    const rep = G.safe(() => G.Sim.finish(run), 'simFinish');
    UI._sim = null;
    const ov = $('#simOv'); if (ov) { ov.classList.add('hidden'); ov.innerHTML = ''; }
    if (!rep) { UI.toast('تعذّر إعداد التقرير' + (G.lastError ? ': ' + G.lastError.msg : '')); UI.cur = 'home'; UI.render(); return; }
    UI.cur = 'simreport'; UI.render(); window.scrollTo(0, 0);
    if (rep.stop.reason === 'error') UI.fx('bad');
    else if (!(G.S.phase === 'end' && UI.seasonFx())) UI.fx('done');
  }

  // ---------- تقرير المحاكاة ----------
  // فرق عددي ملوّن؛ low=true عندما يكون الأقل أفضل (ترتيب الدوري)
  const delta = (a, b, fmt, low) => {
    if (a == null || b == null) return '';
    const d = b - a;
    if (d === 0) return '';
    const good = low ? d < 0 : d > 0;
    return '<b class="' + (good ? 'pos' : 'neg') + ' ltr">' + (low ? (d < 0 ? '▲' : '▼') : d > 0 ? '+' : '−') + (fmt ? fmt(Math.abs(d)) : Math.abs(d)) + '</b>';
  };
  let hideSame = false;
  const prow = (lab, a, b, fmtv, fmtd, low) => (hideSame && a === b) ? '' : '<div class="kv"><span>' + lab + '</span><span>' + (a === b ? '<b>' + fmtv(b) + '</b>' : fmtv(a) + ' ← <b>' + fmtv(b) + '</b> ') + (fmtd ? delta(a, b, fmtd === true ? null : fmtd, low) : '') + '</span></div>';

  function formStrip(ms) {
    if (!ms.length) return '';
    return '<div class="wdl">' + ms.slice(-14).map((m) => '<span class="' + (m.res === 'W' ? 'w' : m.res === 'L' ? 'l' : 'd') + '" title="' + esc(UI.cname(m.o)) + ' ' + m.gf + '-' + m.ga + '">' + (m.res === 'W' ? 'ف' : m.res === 'L' ? 'خ' : 'ت') + '</span>').join('') + '</div>';
  }

  UI.screens.simreport = () => {
    const S = G.S, rep = S.simReport;
    if (!rep) return '<div class="card mut c">لا يوجد تقرير محاكاة بعد.</div><button class="btn pri" data-a="go" data-v="home">الرئيسية</button>';
    const u = me(), T = rep.totals, fr = rep.from, to = rep.to, why = rep.stop || {}, can = G.Sim.canRun();
    const cur = S.season === rep.season;
    hideSame = !rep.weeks;
    let h = '<div class="card hl"><div class="row sb"><h2 style="margin:0">⚡ تقرير المحاكاة</h2><span class="pill">#' + rep.id + '</span></div>' +
      '<div class="sm mut" style="margin:4px 0 10px">موسم ' + rep.label + ' · ' + (rep.weeks ? 'الأسابيع ' + rep.w0 + (rep.w1 - 1 > rep.w0 ? '–' + (rep.w1 - 1) : '') + ' (' + rep.weeks + (rep.weeks === 1 ? ' أسبوع' : rep.weeks === 2 ? ' أسبوعان' : rep.weeks <= 10 ? ' أسابيع' : ' أسبوعًا') + ')' : 'فترة الصيف') + '</div>' +
      '<div class="notice ' + (STOP_CLS[why.reason] != null ? STOP_CLS[why.reason] : '') + '" style="margin:0">' + (STOP_ICON[why.reason] || '⏸') + ' <b>' + (why.reason === 'end' || why.reason === 'limit' || why.reason === 'started' || why.reason === 'cancel' ? esc(why.text) : 'توقفت المحاكاة: ' + esc(why.text)) + '</b></div></div>';

    // أبرز النقاط
    if (rep.highlights && rep.highlights.length) h += '<div class="card"><h3>أبرز ما حدث</h3>' + rep.highlights.map((t) => '<div class="hl-line">' + esc(t) + '</div>').join('') + '</div>';

    // أرقام سريعة
    if (T.team) {
      h += '<div class="card"><div class="grid3">' +
        '<div class="stat"><b>' + T.apps + '<span class="mut sm">/' + T.team + '</span></b><small>مشاركات</small></div><div class="stat"><b>' + T.g + '</b><small>أهداف</small></div><div class="stat"><b>' + T.a + '</b><small>صناعة</small></div>' +
        '<div class="stat"><b>' + (T.apps && T.avg ? T.avg.toFixed(2) : '—') + '</b><small>معدل التقييم</small></div><div class="stat"><b>' + T.mins + "\u2032" + '</b><small>دقائق</small></div><div class="stat"><b>' + T.motm + '</b><small>نجم المباراة</small></div></div>' +
        '<div class="sm mut" style="margin:12px 0 6px">نتائج فريقك: ' + T.w + ' فوز · ' + T.d + ' تعادل · ' + T.l + ' خسارة</div>' + formStrip(rep.matches) + '</div>';
    }

    // التطور
    h += '<div class="card"><h3>📈 التطور</h3>' +
      prow('التقييم العام', fr.ovr, to.ovr, (v) => v, true) +
      prow('القيمة السوقية', fr.val, to.val, (v) => UI.money(v), (d) => UI.money(d)) +
      prow('ثقة المدرب', fr.trust, to.trust, (v) => v, true) +
      (fr.pop != null && to.pop != null ? prow('الشعبية 📣', fr.pop, to.pop, (v) => v, true) + prow('المتابعون 👥', fr.fans, to.fans, (v) => G.Media.fmtFans(v), (d) => G.Media.fmtFans(d)) : '') +
      prow('اللياقة', fr.fit, to.fit, (v) => v + '%', true) +
      (fr.role !== to.role ? '<div class="kv"><span>دورك</span><span>' + esc(G.Coach.ROLE_AR[fr.role] || '—') + ' ← <b>' + esc(G.Coach.ROLE_AR[to.role] || '—') + '</b></span></div>' : '<div class="kv"><span>دورك</span><b>' + esc(G.Coach.ROLE_AR[to.role] || '—') + '</b></div>') +
      (to.pos ? prow('مركز ' + esc(UI.cname(rep.club)) + ' في الدوري', fr.pos || to.pos, to.pos, (v) => v, true, true) : '') +
      (to.ucl ? '<div class="kv"><span>دوري الأبطال</span><span class="sm" style="text-align:end">' + esc(to.ucl) + '</span></div>' : '') + '</div>';

    // التدريب
    const tr = rep.train, attrs = Object.keys(tr.attr || {});
    if (tr.sessions || attrs.length || Object.keys(rep.spent || {}).length) {
      h += '<div class="card"><h3>💪 التدريب</h3><div class="kv"><span>الخبرة المكتسبة</span><b class="ltr">+' + tr.xp + ' XP</b></div>' + (tr.ups ? '<div class="kv"><span>مستويات جديدة</span><b class="gold ltr">+' + tr.ups + '</b></div>' : '');
      if (attrs.length) h += '<div class="chips" style="margin-top:8px">' + attrs.map((k) => '<span class="pill g">' + esc(G.Players.ATTR_AR[k] || k) + ' <span class="ltr">+' + tr.attr[k] + '</span></span>').join('') + '</div>';
      const sp = Object.keys(rep.spent || {});
      if (sp.length) h += '<div class="sm mut" style="margin:10px 0 4px">أُنفقت تلقائيًا:</div><div class="chips">' + sp.map((k) => '<span class="pill y">' + esc(G.Players.ATTR_AR[k] || k) + ' <span class="ltr">+' + rep.spent[k] + '</span></span>').join('') + '</div>';
      if (cur && u.dp > 0) h += '<div class="notice" style="margin-top:10px">لديك <b>' + G.Sim.pl(u.dp, 'نقطة تطوير واحدة', 'نقطتا تطوير', 'نقاط تطوير', 'نقطة تطوير') + '</b> متاحة. <button class="lnk" data-a="go" data-v="train">وزّعها الآن</button></div>';
      h += '</div>';
    }

    // الأحداث
    if (rep.events && rep.events.length) {
      h += '<div class="card"><h3>🗓️ أحداث الفترة</h3>' + rep.events.map((e) => '<div class="ev"><span class="m">' + (e.w ? 'أ' + e.w : '☀️') + '</span><span>' + (EV_ICON[e.k] || '•') + ' ' + esc(e.txt) + '</span></div>').join('') + '</div>';
    }

    // المباريات
    if (rep.matches.length) {
      h += '<div class="card"><h3>⚽ مبارياتك</h3><div class="simlist">' + rep.matches.slice().reverse().slice(0, 40).map(rowHtml).join('') + '</div></div>';
    }

    // الأزرار حسب سبب التوقف
    h += '<div class="stack">';
    if (rep.ended && S.phase === 'end') h += '<button class="btn gold" data-a="go" data-v="home">🏁 عرض ملخص الموسم والجوائز</button>';
    else if (cur && can.ok) {
      const r = why.reason;
      if (r === 'offers' || r === 'window') h += '<button class="btn gold" data-a="go" data-v="market">🔁 افتح سوق الانتقالات والعروض</button>';
      if (r === 'dp') h += '<button class="btn gold" data-a="go" data-v="train">💪 صرف نقاط التطوير</button>';
      if (r === 'injury') h += '<button class="btn gold" data-a="go" data-v="train">💪 راجع التدريب (راحة/شدة)</button>';
      if (r === 'key') h += '<button class="btn gold" data-a="go" data-v="home">🎮 اذهب إلى المباراة</button>';
      if (r === 'press') h += '<button class="btn gold" data-a="go" data-v="home">🎤 اذهب إلى المؤتمر الصحفي</button>';
      if (r === 'error') h += '<div class="notice bad">أُعيدت اللعبة إلى آخر نقطة سليمة ولم يضِع تقدّمك. يمكنك متابعة المحاكاة أو اللعب يدويًا.</div>';
      h += '<button class="btn pri" data-a="simOpen">⚡ متابعة المحاكاة</button>';
    } else if (cur && S.phase === 'end') h += '<button class="btn gold" data-a="go" data-v="home">🏁 ملخص الموسم</button>';
    h += '<button class="btn" data-a="go" data-v="home">🏠 الرئيسية</button></div>';
    return h;
  };
})(window.G = window.G || {});
