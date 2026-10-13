/* ui_match.js — شاشة المباراة: بث مباشر دقيقة بدقيقة، لحظات القرار التفاعلية، التبديل، الاستئناف، وملخص ما بعد المباراة */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc, $ = (s) => document.querySelector(s);
  const SPEED = { 1: 260, 2: 110, 3: 35 };
  const P = (id) => G.S.players[id];
  const activeM = () => (G.S && G.S.active ? G.S.active.m : null);

  // ---------- المؤقّت ----------
  const stop = () => { if (UI._mt) { clearInterval(UI._mt); UI._mt = null; } };
  const start = () => { stop(); UI._mt = setInterval(tick, SPEED[(UI.mv && UI.mv.speed) || 1]); };

  function tick() {
    if (UI.cur !== 'match' || !UI.mv || UI.mv.phase !== 'live' || !activeM()) { stop(); return; }
    const m = activeM();
    if (UI.mv.paused || m.pending) return;
    try { G.Live.step(m); UI.mv.fails = 0; }
    catch (e) {
      UI.mv.fails = (UI.mv.fails || 0) + 1;
      G.lastError = { label: 'liveStep', msg: String(e && e.message || e) };
      if (UI.mv.fails >= 3) {
        stop();
        try { G.Live.simulate(m); finish(); }
        catch (e2) { // نتخلى عن المباراة دون تسجيل أي شيء: يمكن إعادة لعبها
          G.S.active = null; G.Save.save(); UI.mv = null; UI.cur = 'home';
          UI.toast('تعذّر إكمال المباراة بسبب خطأ — لم تُسجَّل نتيجتها ويمكنك إعادة لعبها'); UI.render();
        }
      }
      return;
    }
    if (m.done) { finish(); return; }
    paint(m);
  }

  function finish() {
    stop();
    const m = activeM();
    if (!m) { UI.mv = { phase: 'post' }; UI.render(); return; }
    if (!m.done) G.Live.simulate(m);
    const sum = G.safe(() => G.Season.commitUser(m), 'commitUser');
    UI.lastM = m;
    UI.mv = { phase: 'post' };
    if (sum === undefined) UI.toast('تعذّر اعتماد النتيجة: ' + (G.lastError ? G.lastError.msg : ''));
    UI.render();
  }

  // ---------- مكوّنات الواجهة ----------
  const minTxt = (m) => (m.done ? 'نهاية المباراة' : m.i === 0 ? 'قبل صافرة البداية' : m.labs[m.i - 1] + "'" + (m.et ? ' · وقت إضافي' : ''));

  function liveRating(m) {
    const uid = G.S.user, ps = m.ps[uid];
    if (!ps || (ps.in == null && m.uState !== 'start')) return null;
    const start = ps.in || 0, end = ps.out != null ? ps.out : m.i, mins = end - start;
    if (mins < 8) return null;
    const diff = m.score[m.side] - m.score[m.side === 'h' ? 'a' : 'h'];
    let r = 6.4 + (diff > 0 ? 0.25 : diff < 0 ? -0.25 : 0) + ps.g * 0.95 + ps.a * 0.6 + ps.sot * 0.06 - ps.big * 0.22 + ps.momOk * 0.16 - ps.momBad * 0.14 - ps.yel * 0.25 - ps.red * 1.6;
    return U.clamp(Math.round(r * 10) / 10, 3, 10);
  }

  function headHtml(m) {
    const uid = G.S.user, ps = m.ps[uid], fix = G.Season.findFix(m.id);
    const on = G.Live.userOn(m);
    const st = on ? '🟢 في الملعب · لياقة ' + Math.round(m.fat[uid]) + '%' : ps.out != null ? '🔁 تم استبدالك' : m.uState === 'bench' ? '🪑 على مقاعد البدلاء' : '🚫 خارج قائمة المباراة';
    const lr = liveRating(m);
    return '<div class="card"><div class="sm mut c">' + (fix ? esc(UI.fixLabel(fix)) : '') + (m.neutral ? ' · ملعب محايد' : '') + '</div>' +
      '<div class="score" style="margin-top:6px"><div class="tm">' + UI.badge(m.h, 42) + '<div>' + esc(UI.cname(m.h)) + '</div></div><div class="sc">' + m.score.h + ' - ' + m.score.a + '</div><div class="tm">' + UI.badge(m.a, 42) + '<div>' + esc(UI.cname(m.a)) + '</div></div></div>' +
      '<div class="minute">' + minTxt(m) + '</div>' +
      '<div class="row sb sm" style="margin-top:8px"><span>' + st + '</span><span>⚽ ' + ps.g + ' · 🅰️ ' + ps.a + (lr ? ' · ' + UI.rating(lr) : '') + '</span></div>' +
      (on ? UI.bar(m.fat[uid], m.fat[uid] < 40 ? 'red' : m.fat[uid] < 65 ? 'gold' : '') : '') + '</div>';
  }

  function momentHtml(m) {
    const c = m.pending;
    if (!c) return '';
    return '<div class="card mom-card"><div class="row sb"><h3 style="margin:0">🎯 ' + esc(c.title) + '</h3><span class="pill b">' + esc(c.lab || '') + "'</span></div><p>" + esc(c.text) + '</p>' +
      c.options.map((o) => '<button class="opt" data-a="momPick" data-v="' + o.id + '"><b>' + esc(o.label) + '</b><small>' + esc(o.hint) + '</small></button>').join('') + '</div>';
  }

  function feedHtml(m) {
    const cls = { goal: 'goal', mom: 'mom', red: 'red', yellow: 'yellow', inj: 'inj' };
    return m.ev.slice(-45).reverse().map((e) => '<div class="ev ' + (cls[e.k] || '') + '"><span class="m">' + esc(e.lab) + "'</span><span>" + esc(e.txt) + '</span></div>').join('');
  }

  function ctlHtml(m) {
    const mv = UI.mv, on = G.Live.userOn(m), canSub = on && m.subs[m.side] > 0;
    return '<div class="grid2"><button class="btn" data-a="mvPause">' + (mv.paused ? '▶ استئناف' : '⏸ إيقاف مؤقت') + '</button><button class="btn" data-a="mvSpeed">⏩ السرعة ×' + (mv.speed || 1) + '</button>' +
      '<button class="btn ' + (canSub ? '' : 'dis') + '" data-a="reqSub">🔄 اطلب استبدالك</button><button class="btn" data-a="mvLineup">👥 التشكيلة والإحصاءات</button></div>' +
      '<div class="grid2"><button class="btn red" data-a="mvFinish">⏭ إنهاء المباراة فورًا</button><button class="btn" data-a="mvLeave">🏠 خروج (تُحفظ المباراة)</button></div>';
  }

  // تحديث الأجزاء المتغيّرة فقط حتى لا تضيع النقرات
  let lastMomKey = null, lastCtlKey = null;
  function paint(m) {
    const a = $('#mvHead'), b = $('#mvMoment'), c = $('#mvCtl'), d = $('#mvFeed');
    if (!a) return;
    a.innerHTML = headHtml(m);
    d.innerHTML = feedHtml(m);
    const mk = m.pending ? m.pending.id : '';
    if (mk !== lastMomKey) { b.innerHTML = momentHtml(m); lastMomKey = mk; if (mk) window.scrollTo(0, 0); }
    const ck = [UI.mv.paused, UI.mv.speed, G.Live.userOn(m), m.subs[m.side] > 0].join();
    if (ck !== lastCtlKey) { c.innerHTML = ctlHtml(m); lastCtlKey = ck; }
  }

  function liveScreen() {
    const m = activeM();
    if (!m) { UI.mv = null; UI.cur = 'home'; return UI.screens.home(); }
    if (m.done) { setTimeout(finish, 0); return '<div class="card c">جارٍ اعتماد النتيجة…</div>'; }
    lastMomKey = null; lastCtlKey = null;
    UI.after = () => { paint(m); start(); };
    return '<div id="mvHead"></div><div id="mvMoment"></div><div id="mvCtl"></div><div class="card"><h4>مجريات المباراة</h4><div class="feed" id="mvFeed"></div></div>';
  }

  function postScreen() {
    const S = G.S, sm = S.lastMatch, u = P(S.user);
    if (!sm) return '<div class="card mut c">لا توجد مباراة لعرضها.</div><button class="btn" data-a="mvHome">الرئيسية</button>';
    const mine = sm.userSide, gf = mine === 'h' ? sm.score.h : sm.score.a, ga = mine === 'h' ? sm.score.a : sm.score.h;
    let res = gf > ga ? 'فوز' : gf < ga ? 'خسارة' : 'تعادل';
    if (sm.pens) { const pf = mine === 'h' ? sm.pens.h : sm.pens.a, pa = mine === 'h' ? sm.pens.a : sm.pens.h; res = pf > pa ? 'فوز بركلات الترجيح' : 'خسارة بركلات الترجيح'; }
    const fix = G.Season.findFix(sm.fixId);
    let h = '<div class="card hl"><div class="sm mut c">' + (fix ? esc(UI.fixLabel(fix)) : '') + '</div><div class="score" style="margin:8px 0"><div class="tm">' + UI.badge(sm.h, 42) + '<div>' + esc(UI.cname(sm.h)) + '</div></div><div class="sc">' + sm.score.h + ' - ' + sm.score.a + '</div><div class="tm">' + UI.badge(sm.a, 42) + '<div>' + esc(UI.cname(sm.a)) + '</div></div></div>' +
      '<div class="c"><span class="pill ' + (gf > ga || (sm.pens && res.indexOf('فوز') === 0) ? 'g' : gf < ga || sm.pens ? 'r' : 'y') + '">' + res + '</span>' + (sm.et ? ' <span class="pill">وقت إضافي</span>' : '') + (sm.pens ? ' <span class="pill">ترجيح ' + sm.pens.h + '-' + sm.pens.a + '</span>' : '') + '</div></div>';
    if (sm.mins > 0) {
      h += '<div class="card"><div class="row sb"><h3 style="margin:0">أداؤك</h3><div>' + UI.rating(sm.rating) + (sm.motm ? ' <span class="pill y">⭐ نجم المباراة</span>' : '') + '</div></div>' +
        '<div class="grid3" style="margin-top:10px"><div class="stat"><b>' + sm.mins + "'</b><small>الدقائق</small></div><div class=\"stat\"><b>" + sm.g + '</b><small>أهداف</small></div><div class="stat"><b>' + sm.as + '</b><small>صناعة</small></div>' +
        '<div class="stat"><b>' + sm.sh + ' (' + sm.sot + ')</b><small>تسديدات (على المرمى)</small></div><div class="stat"><b>' + sm.pasOk + '/' + sm.pas + '</b><small>تمريرات ناجحة</small></div><div class="stat"><b>' + sm.drOk + '/' + sm.dr + '</b><small>مراوغات</small></div>' +
        '<div class="stat"><b>' + sm.tkOk + '/' + sm.tk + '</b><small>تدخلات</small></div><div class="stat"><b>' + (sm.big || 0) + '</b><small>فرص محققة ضائعة</small></div><div class="stat"><b>' + (sm.yel ? '🟨' + sm.yel : '') + (sm.red ? '🟥' + sm.red : '') + (!sm.yel && !sm.red ? '—' : '') + '</b><small>بطاقات</small></div></div>' +
        (sm.inj ? '<div class="notice bad" style="margin-top:10px">🩹 أُصبتَ وستغيب ' + sm.inj + ' أسبوعًا تقريبًا.</div>' : '') +
        (sm.ban5 ? '<div class="notice bad" style="margin-top:10px">🟨 تراكمت عليك 5 إنذارات: أنت موقوف عن المباراة القادمة.</div>' : '') + '</div>';
    } else {
      h += '<div class="card"><div class="notice">لم تشارك في هذه المباراة' + (sm.state === 'bench' ? ' (بقيتَ على الدكة)' : sm.state === 'out' ? ' (خارج القائمة)' : '') + '. المشاركة تأتي بالأداء والتدريب وثقة المدرب.</div></div>';
    }
    h += '<div class="card"><div class="kv"><span>ثقة المدرب</span><span>' + Math.round(u.trust) + ' — ' + G.Coach.trustLabel(u.trust) + '</span></div><div class="kv"><span>اللياقة</span><span>' + Math.round(u.fit) + '%</span></div></div>';
    const evs = (sm.events || []).filter((e) => e.k === 'goal' || e.k === 'red' || e.k === 'yellow' || e.k === 'inj' || e.k === 'pens');
    if (evs.length) h += '<div class="card"><h4>أبرز الأحداث</h4>' + evs.map((e) => '<div class="ev ' + (e.k === 'goal' ? 'goal' : e.k === 'red' ? 'red' : e.k === 'yellow' ? 'yellow' : e.k === 'inj' ? 'inj' : '') + '"><span class="m">' + esc(e.lab) + "'</span><span>" + esc(e.txt) + '</span></div>').join('') + '</div>';
    const pend = G.Season.pending();
    h += '<button class="btn pri" data-a="mvHome">' + (pend ? 'المباراة التالية هذا الأسبوع ←' : S.phase === 'season' ? 'متابعة (إنهاء الأسبوع)' : 'العودة للرئيسية') + '</button>';
    return h;
  }

  UI.screens.match = () => {
    const mv = UI.mv;
    if (!mv) { UI.cur = 'home'; return UI.screens.home(); }
    return mv.phase === 'post' ? postScreen() : liveScreen();
  };

  // ---------- الإجراءات ----------
  UI.on('playMatch', (fixId, mode) => {
    const S = G.S;
    if (S.active) { UI.cur = 'match'; UI.mv = { phase: 'live', speed: 1, paused: false }; return; }
    const fix = G.Season.findFix(fixId);
    if (!fix || fix.played) { UI.toast('هذه المباراة لُعبت بالفعل'); return; }
    const m = G.Season.startMatch(fixId);
    if (!m) { UI.toast('تعذّر بدء المباراة'); return; }
    UI.cur = 'match'; window.scrollTo(0, 0);
    if (mode === 's') {
      G.Live.simulate(m);
      G.Season.commitUser(m);
      UI.lastM = m; UI.mv = { phase: 'post' };
    } else UI.mv = { phase: 'live', speed: 1, paused: false };
  });
  UI.on('resumeMatch', () => { UI.cur = 'match'; UI.mv = { phase: 'live', speed: 1, paused: false }; });

  UI.on('momPick', (v) => {
    const m = activeM();
    if (!m || !m.pending) return false;
    G.safe(() => G.Moments.resolve(m, m.pending, v), 'moment');
    m.pending = null;
    G.Save.save();
    lastMomKey = null;
    paint(m);
    return false;
  });
  UI.on('mvPause', () => { UI.mv.paused = !UI.mv.paused; const m = activeM(); if (m) paint(m); return false; });
  UI.on('mvSpeed', () => { UI.mv.speed = ((UI.mv.speed || 1) % 3) + 1; start(); const m = activeM(); if (m) paint(m); return false; });
  UI.on('reqSub', () => {
    const m = activeM();
    if (!m) return false;
    if (!G.Live.userOn(m)) { UI.toast('أنت لست في الملعب'); return false; }
    if (m.subs[m.side] <= 0) { UI.toast('استُنفدت التبديلات'); return false; }
    G.Live.requestSub(m);
    UI.toast('طلبتَ الاستبدال — سيُنفَّذ في الدقيقة التالية');
    return false;
  });
  UI.on('mvFinish', () => {
    UI.confirm('إنهاء المباراة فورًا؟', 'ستُحاكى بقية المباراة تلقائيًا (القرارات المتبقية تُحسم آليًا).', () => { UI.mv.paused = false; finish(); }, 'إنهاء');
    return false;
  });
  UI.on('mvLeave', () => { stop(); G.Save.save(); UI.mv = null; UI.cur = 'home'; });
  UI.on('mvHome', () => { UI.mv = null; UI.cur = 'home'; window.scrollTo(0, 0); });
  UI.on('lastMatchView', () => { UI.mv = { phase: 'post' }; UI.cur = 'match'; });

  UI.on('mvLineup', () => {
    const m = activeM();
    if (!m) return false;
    UI.mv.paused = true; paint(m);
    const uid = G.S.user;
    const xi = (s) => m.xi[s].map((x) => { const p = P(x.id); return '<div class="kv"><span>' + (x.id === uid ? '⭐ ' : '') + esc(p.n) + ' <span class="mut sm">' + x.slot + '</span></span><b>' + p.ovr + '</b></div>'; }).join('');
    const stat = (lab, a, b) => '<div class="kv"><b class="ltr">' + a + '</b><span class="mut">' + lab + '</span><b class="ltr">' + b + '</b></div>';
    UI.sheet('<h3>إحصاءات المباراة</h3>' + stat('تسديدات', m.st.h.sh, m.st.a.sh) + stat('على المرمى', m.st.h.sot, m.st.a.sot) + stat('تبديلات متبقية', m.subs.h, m.subs.a) +
      '<h4 style="margin-top:14px">' + esc(UI.cname(m.h)) + '</h4>' + xi('h') + '<h4 style="margin-top:14px">' + esc(UI.cname(m.a)) + '</h4>' + xi('a') +
      '<button class="btn pri" data-a="mvResume">▶ إغلاق ومتابعة</button>');
    return false;
  });
  UI.on('mvResume', () => { UI.closeSheet(); UI.mv.paused = false; const m = activeM(); if (m) paint(m); return false; });

  UI.matchStop = stop;
})(window.G = window.G || {});
