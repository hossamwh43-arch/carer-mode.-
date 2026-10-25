/* sim.js — محاكي الموسم
   يُشغّل أسابيع الموسم تلقائيًا فوق دوال Season الموجودة (autoWeek / preseason / startSeason) بلا منطق مكرَّر،
   ولا يستهلك أي أرقام عشوائية بنفسه: نتيجة المحاكاة مطابقة لما كان سيحدث لو لعبتَ الأسابيع آليًا واحدًا واحدًا.
   يضيف: قواعد توقّف قابلة للضبط، إنفاقًا تلقائيًا اختياريًا لنقاط التطوير، حماية اللياقة، تجميدًا للحفظ أثناء التشغيل
   (الحفظ كان 70% من زمن المحاكاة)، نقاط استرجاع آمنة عند أي خطأ، وتقريرًا مفصّلًا يُخزَّن في S.simReport.
   لا يعرف شيئًا عن الواجهة: الواجهة تستدعي begin ثم step مرارًا ثم finish، أو run دفعة واحدة (للاختبار). */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const Sim = (G.Sim = {});

  const LAST_WEEK = 39;
  const CK_EVERY = 6;            // نقطة استرجاع (وحفظ فعلي) كل 6 خطوات
  Sim.INJ_MIN = 2;               // أقل مدة إصابة (أسابيع) تستدعي التوقف
  Sim.DP_MIN = 3;                // عتبة نقاط التطوير
  Sim.REST_FIT = 55;             // دون هذه اللياقة تُخفَّض شدة التدريب أسبوعيًا (إن فُعّلت الحماية)

  // قواعد التوقف: [المفتاح، الأيقونة، النص]
  Sim.RULES = [
    ['offers', '🔁', 'عرض انتقال جديد'],
    ['window', '🏟️', 'فتح نافذة الانتقالات'],
    ['injury', '🩹', 'إصابة طويلة (أسبوعان+)'],
    ['key', '⭐', 'قبل مباراة إقصائية'],
    ['dp', '💪', 'تراكم نقاط التطوير'],
    ['role', '📋', 'تغيّر دوري مع الفريق'],
    ['press', '🎤', 'مؤتمر صحفي ينتظرك']
  ];
  Sim.DEFAULT_RULES = { offers: true, window: true, injury: true, key: true, dp: false, role: false, press: false };
  Sim.STOP_AR = {
    end: 'انتهى الموسم', limit: 'اكتملت المدة المطلوبة', started: 'بدأ الموسم', offers: 'وصلك عرض انتقال جديد',
    window: 'فُتحت نافذة الانتقالات', injury: 'أُصبتَ إصابة تُغيّبك عن عدة مباريات', dp: 'تراكمت لديك نقاط تطوير غير مصروفة',
    role: 'تغيّر دورك مع الفريق', press: 'مؤتمر صحفي ينتظرك', key: 'مباراة إقصائية كبيرة قادمة — العبها بنفسك أو حاكِها', cancel: 'أوقفتَ المحاكاة',
    error: 'حدث خطأ أثناء المحاكاة', blocked: 'تعذّرت المتابعة'
  };

  // ---------- أدوات صغيرة ----------
  const pl = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many);
  Sim.pl = pl;
  const ptsAr = (n) => pl(n, 'نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة');
  const matchesAr = (n) => pl(n, 'مباراة واحدة', 'مباراتين', 'مباريات', 'مباراة');
  const goalsAr = (n) => pl(n, 'هدفًا واحدًا', 'هدفين', 'أهداف', 'هدفًا');
  const assistsAr = (n) => pl(n, 'تمريرة حاسمة', 'تمريرتين حاسمتين', 'تمريرات حاسمة', 'تمريرة حاسمة');
  const weeksAr = (n) => pl(n, 'أسبوعًا واحدًا', 'أسبوعين', 'أسابيع', 'أسبوعًا');
  const dpAr = (n) => pl(n, 'نقطة تطوير واحدة', 'نقطتا تطوير', 'نقاط تطوير', 'نقطة تطوير');
  const attrAr = (n) => pl(n, 'سمة واحدة', 'سمتان', 'سمات', 'سمة');
  const lvlAr = (n) => pl(n, 'مستوى واحدًا', 'مستويين', 'مستويات', 'مستوى');
  const ids = (arr) => (arr || []).map((o) => o.id);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const cname = (id) => (G.S.clubs[id] ? G.S.clubs[id].name : '—');
  const ROLE_ADJ = G.Coach ? G.Coach.ROLE_AR : {};
  const isFieldRole = (r) => r === 'starter' || r === 'rotation' || r === 'bench' || r === 'out';

  // حالة دوري الأبطال للاعب (نصًّا) — للتقرير
  function uclStatus() {
    const S = G.S, u = P(S.user), ucl = S.ucl;
    if (!ucl || ucl.teams.indexOf(u.club) < 0) return null;
    const ex = ucl.exit[u.club], ST = G.Ucl.STAGE_AR;
    if (ucl.winner === u.club) return { key: 'win', text: 'بطل أوروبا 🏆' };
    if (ucl.phase === 'done') return { key: 'out:' + ex, text: 'انتهت المشاركة عند: ' + (ex === 'league' ? 'مرحلة الدوري' : ST[ex] || ex) };
    if (ucl.phase === 'league') {
      const o = G.Ucl.sorted(), r = ucl.league.table[u.club];
      if (!r.p) return { key: 'league', text: 'مرحلة الدوري — لم تبدأ مبارياتها بعد' };
      return { key: 'league', text: 'مرحلة الدوري — المركز ' + (o.indexOf(u.club) + 1) + ' من 36 (' + ptsAr(r.pts) + ' بعد ' + matchesAr(r.p) + ')' };
    }
    if (G.Ucl.userAlive(u.club)) return { key: 'alive:' + ucl.phase, text: 'ناديك في ' + ST[ucl.phase] };
    return { key: 'out:' + ex, text: 'ودّع البطولة عند: ' + (ex === 'league' ? 'مرحلة الدوري' : ST[ex] || ex) };
  }

  function snap() {
    const S = G.S, u = P(S.user), inL = !!(S.league && S.league.table[u.club]);
    const uc = uclStatus();
    return {
      ovr: u.ovr, pot: u.pot, val: u.val, trust: Math.round(u.trust), fit: Math.round(u.fit), role: u.role, lvl: u.lvl, dp: u.dp,
      inj: u.inj, susp: u.susp, club: u.club, age: u.age, week: S.week, phase: S.phase,
      pos: inL ? G.League.position(u.club) : null, pts: inL ? S.league.table[u.club].pts : null,
      ucl: uc ? uc.text : null, uclKey: uc ? uc.key : null,
      pop: G.Media ? G.Media.pop() : null, fans: G.Media ? G.Media.fans() : null
    };
  }

  // ---------- فحوص الجاهزية ----------
  Sim.canRun = () => {
    const S = G.S;
    if (!S || !S.players || !S.players[S.user]) return { ok: false, msg: 'لا توجد مسيرة نشطة' };
    if (S.phase === 'retired') return { ok: false, msg: 'اعتزلتَ كرة القدم' };
    if (S.phase === 'end') return { ok: false, msg: 'انتهى الموسم — انتقل إلى الموسم التالي أولًا' };
    if (S.phase === 'summer' && S.userExpired) return { ok: false, msg: 'انتهى عقدك: جدّد أو وقّع مع نادٍ جديد قبل تخطي الصيف' };
    return { ok: true };
  };
  Sim.weeksLeft = () => (G.S.phase === 'season' ? LAST_WEEK - G.S.week + 1 : G.S.phase === 'summer' ? LAST_WEEK : 0);

  // أقرب مباراة إقصائية للاعب في الأسبوع w (دوري الأبطال)
  Sim.keyFixture = (w) => G.Season.userFixtures(w).find((f) => f.comp === 'UCL' && f.stage && f.stage !== 'league' && !f.played) || null;

  // ---------- الإنفاق التلقائي لنقاط التطوير ----------
  // الأفضل قيمةً أولًا: وزن السمة في تقييم المركز ÷ كلفتها، مع احترام السقوف الموسمية وحدّ الإمكانات
  Sim.autoSpend = (u) => {
    const T = G.Training, W = G.Players.OVR_W[u.pos] || {}, spent = {};
    let guard = 0, total = 0;
    while (guard++ < 80) {
      let best = null, bs = 0;
      Object.keys(W).forEach((k) => {
        const c = T.canSpend(u, k);
        if (!c.ok) return;
        const sc = W[k] / c.cost;
        if (sc > bs) { bs = sc; best = k; }
      });
      if (!best) break;
      const r = T.spend(u, best);
      if (!r.ok) break;
      spent[best] = (spent[best] || 0) + 1; total++;
    }
    return { total, spent };
  };

  // ---------- نقاط الاسترجاع ----------
  function checkpoint(run) {
    G.Save.lastJson = null;
    G.Save.save(true, true);
    run.ck = G.Save.lastJson || JSON.stringify(G.S);
    run.ckMeta = { weeks: run.weeks, steps: run.steps, m: run.matches.length, e: run.events.length, train: JSON.stringify(run.train), spent: JSON.stringify(run.spent), rest: run.restWeeks, summer: run.summer };
  }
  function restore(run) {
    if (!run.ck) return false;
    try {
      const S2 = JSON.parse(run.ck);
      if (!G.Save.valid(S2)) return false;
      G.S = S2;
      if (S2.rng) G.rngState = S2.rng >>> 0;
      const k = run.ckMeta;
      run.weeks = k.weeks; run.steps = k.steps; run.matches.length = k.m; run.events.length = k.e;
      run.train = JSON.parse(k.train); run.spent = JSON.parse(k.spent); run.restWeeks = k.rest; run.summer = k.summer;
      return true;
    } catch (e) { return false; }
  }

  // ---------- بدء التشغيل ----------
  // opts: { mode: 'weeks'|'event'|'season'|'summer', weeks, rules, autoDP, rest }
  Sim.begin = (opts) => {
    opts = opts || {};
    const c = Sim.canRun();
    if (!c.ok) return { ok: false, msg: c.msg };
    const S = G.S, mode = opts.mode || 'event';
    const run = {
      ok: true, mode, maxWeeks: mode === 'weeks' ? U.clamp(opts.weeks | 0 || 1, 1, LAST_WEEK) : LAST_WEEK + 1,
      rules: Object.assign({}, Sim.DEFAULT_RULES, opts.rules || {}), autoDP: !!opts.autoDP, rest: opts.rest !== false,
      season: S.season, label: G.Season.label(S.season), phase0: S.phase, week0: S.week,
      weeks: 0, steps: 0, done: false, stop: null, held: false,
      msgId0: S.msgId || 0, matches: [], events: [], train: { xp: 0, ups: 0, sessions: 0, inj: 0, attr: {} }, spent: {}, restWeeks: 0, summer: null,
      from: snap(), ck: null, ckMeta: null, t0: Date.now()
    };
    G.Save.hold(); run.held = true;
    checkpoint(run);
    return run;
  };

  // ---------- جمع بيانات الأسبوع ----------
  function compactMatch(m) {
    const my = m.userSide, gf = my === 'h' ? m.score.h : m.score.a, ga = my === 'h' ? m.score.a : m.score.h;
    const fix = G.Season.findFix(m.fixId);
    let res = gf > ga ? 'W' : gf < ga ? 'L' : 'D', pf = null, pa = null;
    if (m.pens) { pf = my === 'h' ? m.pens.h : m.pens.a; pa = my === 'h' ? m.pens.a : m.pens.h; res = pf > pa ? 'W' : 'L'; }
    return { w: m.week, c: m.comp, o: my === 'h' ? m.a : m.h, ha: fix && fix.stage === 'final' ? 'n' : my === 'h' ? 'h' : 'a', gf, ga, pf, pa, res, et: m.et ? 1 : 0,
      min: m.mins, r: m.rating, g: m.g, a: m.as, mo: m.motm ? 1 : 0, st: m.state, yel: m.yel, red: m.red, inj: m.inj || 0, ban: m.ban5 ? 1 : 0, rnd: fix ? (fix.stage || null) : null };
  }

  function addTrain(run, tr) {
    run.train.xp += tr.xp || 0; run.train.ups += tr.ups || 0; run.train.sessions++;
    if (tr.injured) run.train.inj++;
    (tr.attrUps || []).forEach((k) => { run.train.attr[k] = (run.train.attr[k] || 0) + 1; });
  }
  const ev = (run, w, k, txt) => { run.events.push({ w, k, txt }); };

  // ---------- إنهاء التشغيل ----------
  function stopRun(run, reason, text) {
    if (run.done) return;
    run.done = true;
    run.stop = { reason, text: text || Sim.STOP_AR[reason] || reason, w: G.S ? G.S.week : 0 };
  }

  // ---------- أسبوع واحد من الموسم ----------
  function stepWeek(run) {
    const S = G.S, u = P(S.user);
    if (run.weeks >= run.maxWeeks) return stopRun(run, 'limit');
    const before = {
      head: S.matchLog.length ? S.matchLog[0].fixId : null, offers: ids(S.offers), role: u.role, dp: u.dp, win: !!(S.window && S.window.open),
      lvl: u.lvl, uclKey: (uclStatus() || {}).key || null, w: S.week, susp: u.susp,
      hid: G.Media ? G.Media.headId() : 0, pid: S.media && S.media.press ? S.media.press.id : 0
    };
    // حماية اللياقة: تخفيض مؤقت لشدة تدريب هذا الأسبوع فقط
    const t = S.training || (S.training = { focus: 'balanced', intensity: 'normal' });
    let saved = null;
    if (run.rest && u.fit < Sim.REST_FIT && t.intensity !== 'light') { saved = t.intensity; t.intensity = 'light'; run.restWeeks++; }
    let res;
    try { res = G.Season.autoWeek(); } finally { if (saved) t.intensity = saved; }
    if (!res || !res.ok) return stopRun(run, 'blocked', (res && res.msg) || undefined);
    run.weeks++; run.steps++;
    const tr = res.training || { xp: 0, ups: 0, attrUps: [], injured: false };
    addTrain(run, tr);

    // مباريات هذا الأسبوع (الأحدث في المقدمة)
    const fresh = [];
    for (const m of S.matchLog) { if (m.fixId === before.head) break; fresh.push(m); }
    fresh.reverse();
    let injNow = 0;
    fresh.forEach((m) => {
      const cm = compactMatch(m); run.matches.push(cm);
      if (m.inj) { injNow = Math.max(injNow, m.inj); ev(run, m.week, 'inj', 'أُصبتَ في مباراة ' + cname(cm.o) + ' وستغيب ' + weeksAr(m.inj)); }
      if (m.red) ev(run, m.week, 'red', 'طُردتَ في مباراة ' + cname(cm.o));
      if (m.ban5) ev(run, m.week, 'susp', 'تراكمت عليك 5 إنذارات: إيقاف مباراة');
      if (m.g >= 3) ev(run, m.week, 'goal', 'هاتريك ضد ' + cname(cm.o) + '! ⚽⚽⚽');
    });
    if (tr.injured) { injNow = Math.max(injNow, u.inj + 1); ev(run, before.w, 'inj', 'أُصبتَ أثناء التدريب وتغيب ' + weeksAr(u.inj + 1)); }

    // العروض الجديدة ونافذة الانتقالات
    const newOffers = (S.offers || []).filter((o) => before.offers.indexOf(o.id) < 0);
    newOffers.forEach((o) => ev(run, S.week, 'offer', 'عرض ' + (o.type === 'loan' ? 'إعارة' : o.type === 'free' ? 'عقد حر' : 'انتقال') + ' من ' + cname(o.club)));
    const winNow = !!(S.window && S.window.open);
    if (!before.win && winNow) ev(run, S.week, 'window', 'فُتحت نافذة الانتقالات الشتوية');
    if (before.win && !winNow) ev(run, S.week, 'window', 'أُغلقت نافذة الانتقالات');
    if (tr.ups) ev(run, before.w, 'lvl', 'مستوى جديد: +' + dpAr(tr.ups));
    const uc = uclStatus();
    if (uc && uc.key !== before.uclKey && S.phase !== 'end') ev(run, before.w, 'ucl', 'دوري الأبطال: ' + uc.text);
    if (u.role !== before.role && isFieldRole(u.role) && isFieldRole(before.role)) ev(run, S.week, 'role', 'تغيّر دورك: ' + ROLE_ADJ[before.role] + ' ← ' + ROLE_ADJ[u.role]);

    // أخبار الإعلام الجديدة (العناوين البارزة فقط)
    let newPress = null;
    if (G.Media && S.media) {
      S.media.heads.filter((x) => x.id > before.hid && x.big).reverse().forEach((x) => ev(run, x.w, 'media', x.t));
      const pr = S.media.press;
      if (pr && pr.id !== before.pid && pr.w === before.w) { newPress = pr; ev(run, before.w, 'press', 'مؤتمر صحفي بعد مباراة ' + cname(pr.ctx.opp) + ' (' + G.Media.KINDS[pr.kind].ar + ')'); }
    }

    // إنفاق النقاط تلقائيًا
    if (run.autoDP && u.dp > 0) {
      const r = Sim.autoSpend(u);
      Object.keys(r.spent).forEach((k) => { run.spent[k] = (run.spent[k] || 0) + r.spent[k]; });
    }

    // ---- شروط التوقف ----
    if (S.phase !== 'season') {
      if (S.phase === 'end') {
        const sm = S.summary;
        if (sm && sm.row && sm.row.trophies) {
          if (sm.row.trophies.liga) ev(run, LAST_WEEK, 'award', '🥇 توّجتَ بلقب الدوري الإسباني');
          if (sm.row.trophies.ucl) ev(run, LAST_WEEK, 'award', '🌟 توّجتَ بلقب دوري أبطال أوروبا');
        }
        ((sm && sm.awards) || []).filter((a) => a.user).forEach((a) => ev(run, LAST_WEEK, 'award', '🎖️ جائزة: ' + G.Season.AWARD_AR[a.type]));
      }
      return stopRun(run, S.phase === 'end' ? 'end' : 'blocked');
    }
    const R = run.rules;
    if (R.offers && newOffers.length) return stopRun(run, 'offers', newOffers.length === 1 ? 'وصلك عرض جديد من ' + cname(newOffers[0].club) : 'وصلتك ' + newOffers.length + ' عروض جديدة');
    if (R.window && !before.win && winNow) return stopRun(run, 'window');
    if (R.injury && injNow >= Sim.INJ_MIN) return stopRun(run, 'injury', 'أُصبتَ وستغيب ' + weeksAr(injNow));
    if (R.dp && !run.autoDP && before.dp < Sim.DP_MIN && u.dp >= Sim.DP_MIN) return stopRun(run, 'dp', 'لديك ' + dpAr(u.dp) + ' غير مصروفة');
    if (R.press && newPress && S.phase === 'season') return stopRun(run, 'press', 'مؤتمر صحفي ينتظرك بعد مباراة ' + cname(newPress.ctx.opp));
    if (R.role && u.role !== before.role && isFieldRole(u.role) && isFieldRole(before.role)) return stopRun(run, 'role', 'دورك الآن: ' + ROLE_ADJ[u.role]);
    if (R.key) {
      const k = Sim.keyFixture(S.week);
      if (k) return stopRun(run, 'key', 'قبل مباراتك في ' + G.Ucl.STAGE_AR[k.stage] + (k.leg ? ' (' + (k.leg === 1 ? 'الذهاب' : 'الإياب') + ')' : '') + ' ضد ' + cname(k.h === u.club ? k.a : k.h));
    }
    if (run.weeks >= run.maxWeeks) return stopRun(run, 'limit');
  }

  // ---------- تخطي الصيف ----------
  function stepSummer(run) {
    const S = G.S, u = P(S.user);
    if (S.userExpired) return stopRun(run, 'blocked', 'انتهى عقدك: جدّد أو وقّع مع نادٍ جديد أولًا');
    const offersLeft = (S.offers || []).length;
    let n = 0, r;
    while (S.preLeft > 0 && n < 5 && (r = G.Season.preseason())) { addTrain(run, r); n++; }
    if (run.autoDP && u.dp > 0) {
      const sp = Sim.autoSpend(u);
      Object.keys(sp.spent).forEach((k) => { run.spent[k] = (run.spent[k] || 0) + sp.spent[k]; });
    }
    const st = G.Season.startSeason();
    if (!st.ok) return stopRun(run, 'blocked', st.msg);
    run.steps++;
    run.summer = { sessions: n, offersLeft };
    ev(run, 0, 'summer', n ? 'أكملتَ ' + n + (n === 1 ? ' حصة إعداد' : n === 2 ? ' حصتي إعداد' : ' حصص إعداد') + ' وانطلق الموسم' : 'انطلق الموسم');
    if (offersLeft) ev(run, 0, 'offer', 'أُغلقت نافذة الصيف وفي يدك ' + offersLeft + (offersLeft === 1 ? ' عرض لم تردّ عليه' : ' عروض لم تردّ عليها'));
    if (run.mode === 'summer') stopRun(run, 'started');
  }

  // ---------- خطوة واحدة ----------
  Sim.step = (run) => {
    if (run.done) return run;
    G.Save.touch();
    try {
      const S = G.S;
      if (S.phase === 'summer') stepSummer(run);
      else if (S.phase === 'season') stepWeek(run);
      else stopRun(run, 'blocked', S.phase === 'end' ? 'انتهى الموسم — انتقل إلى الموسم التالي' : undefined);
      if (!run.done && run.steps % CK_EVERY === 0) checkpoint(run);
    } catch (e) {
      G.lastError = { label: 'sim', msg: String(e && e.message || e), stack: e && e.stack };
      if (typeof console !== 'undefined') console.error('[sim]', e);
      const back = restore(run);
      try { (G.S.errors = G.S.errors || []).push({ t: Date.now(), label: 'sim', msg: String(e && e.message || e) }); } catch (x) { /* لا شيء */ }
      stopRun(run, 'error', 'حدث خطأ أثناء المحاكاة' + (back ? ' فأُعيدت اللعبة إلى آخر نقطة سليمة (الأسبوع ' + G.S.week + ')' : '') + ' — ' + (G.lastError.msg || ''));
    }
    return run;
  };

  // إيقاف يدوي (يُنفَّذ عند حدّ أسبوع)
  Sim.cancel = (run) => { if (!run.done) stopRun(run, 'cancel'); };

  // ---------- التقرير ----------
  function buildReport(run) {
    const S = G.S, u = P(S.user), to = snap(), from = run.from, ms = run.matches;
    const played = ms.filter((m) => m.min > 0), rated = played.filter((m) => m.r != null);
    const T = {
      team: ms.length, apps: played.length, starts: played.filter((m) => m.st === 'start').length, mins: sum(played, (m) => m.min),
      g: sum(played, (m) => m.g), a: sum(played, (m) => m.a), avg: rated.length ? sum(rated, (m) => m.r) / rated.length : 0,
      w: ms.filter((m) => m.res === 'W').length, d: ms.filter((m) => m.res === 'D').length, l: ms.filter((m) => m.res === 'L').length,
      gf: sum(ms, (m) => m.gf), ga: sum(ms, (m) => m.ga), motm: sum(played, (m) => m.mo), yel: sum(played, (m) => m.yel || 0), red: sum(played, (m) => m.red || 0)
    };
    let streak = 0, cur = 0;
    ms.forEach((m) => { if (m.res === 'W') { cur++; streak = Math.max(streak, cur); } else cur = 0; });
    T.streak = streak;
    const bestPool = played.filter((m) => m.min >= 30 && m.r != null).sort((a, b) => b.r - a.r || (b.g + b.a) - (a.g + a.a));
    const best = bestPool[0] || null;
    const attrTotal = sum(Object.keys(run.train.attr), (k) => run.train.attr[k]);
    const spentTotal = sum(Object.keys(run.spent), (k) => run.spent[k]);

    // ---- أبرز النقاط ----
    const H = [];
    if (run.summer) H.push('☀️ ' + (run.summer.sessions ? 'أنهيتَ فترة الإعداد (' + run.summer.sessions + ' حصص) و' : '') + 'انطلق موسم ' + run.label + '.');
    if (T.team) {
      if (T.apps) H.push('🎽 شاركتَ في ' + T.apps + ' من ' + T.team + ' ' + (T.team <= 10 ? 'مباريات' : 'مباراة') + ' لفريقك' + (T.starts ? ' (' + T.starts + ' أساسيًا)' : '') + ' — ' + T.mins + ' دقيقة.');
      else H.push('🪑 لم تشارك في أي مباراة من مبارياتك الـ' + T.team + ' (دورك: ' + (ROLE_ADJ[u.role] || '—') + '). ارفع مستواك بالتدريب أو فكّر في إعارة تمنحك دقائق لعب.');
      if (T.apps) {
        if (T.g + T.a > 0) H.push('⚽ ' + (T.g ? 'سجّلتَ ' + goalsAr(T.g) : '') + (T.g && T.a ? ' و' : '') + (T.a ? (T.g ? 'صنعتَ ' : 'صنعتَ ') + assistsAr(T.a) : '') + (T.g && T.a ? ' (ساهمتَ مباشرةً في ' + (T.g + T.a) + ')' : T.g ? '' : ' دون أن تسجّل') + '.');
        else H.push('⚽ لم تسجّل أو تصنع أهدافًا في هذه الفترة.');
        if (rated.length) H.push('⭐ معدل تقييمك ' + T.avg.toFixed(2) + ' — ' + (T.avg >= 7.6 ? 'أداء استثنائي' : T.avg >= 7 ? 'أداء ممتاز' : T.avg >= 6.5 ? 'أداء جيد' : T.avg >= 6 ? 'أداء مقبول' : 'أداء دون المطلوب') + (T.motm ? ' · نجم المباراة ' + (T.motm === 1 ? 'مرة واحدة' : T.motm === 2 ? 'مرتين' : T.motm <= 10 ? T.motm + ' مرات' : T.motm + ' مرة') : '') + '.');
      }
      H.push('🏟️ نتائج فريقك: ' + T.w + ' فوز · ' + T.d + ' تعادل · ' + T.l + ' خسارة (الأهداف ' + T.gf + ':' + T.ga + ')' + (T.streak >= 3 ? ' · أطول سلسلة انتصارات ' + T.streak : '') + '.');
      if (best && best.r >= 7.5) H.push('🔥 أفضل مباراة: ضد ' + cname(best.o) + ' (' + best.gf + '-' + best.ga + ') بتقييم ' + best.r.toFixed(1) + (best.g ? ' و' + goalsAr(best.g) : '') + '.');
    }
    if (from.pos && to.pos) H.push('🏆 ترتيب ' + cname(u.club) + ' في الدوري: ' + (from.pos === to.pos ? 'المركز ' + to.pos : 'من ' + from.pos + ' إلى ' + to.pos) + ' (' + ptsAr(to.pts) + ').');
    if (to.ucl && run.weeks) H.push('⭐ دوري الأبطال: ' + to.ucl + '.');
    if (to.ovr !== from.ovr) H.push('📈 تقييمك العام ' + from.ovr + ' ← ' + to.ovr + '.');
    if (run.train.ups) H.push('💪 ارتقيتَ ' + lvlAr(run.train.ups) + (attrTotal ? ' وتحسّنت ' + attrAr(attrTotal) + ' بالتدريب' : '') + '.');
    else if (attrTotal) H.push('💪 تحسّنت ' + attrAr(attrTotal) + ' بالتدريب.');
    if (spentTotal) H.push('🧠 أُنفقت ' + dpAr(spentTotal) + ' تلقائيًا على أهم سمات مركزك.');
    else if (u.dp > 0) H.push('💡 لديك ' + dpAr(u.dp) + ' غير مصروفة — وزّعها من صفحة التدريب.');
    if (run.restWeeks) H.push('🔋 خُفّضت شدة التدريب تلقائيًا في ' + weeksAr(run.restWeeks) + ' لحماية لياقتك.');
    const nInj = run.events.filter((e) => e.k === 'inj').length;
    if (nInj) H.push('🩹 تعرّضتَ لـ' + (nInj === 1 ? 'إصابة واحدة' : nInj === 2 ? 'إصابتين' : nInj + ' إصابات') + '.');
    if (from.pop != null && to.pop != null && to.pop !== from.pop) H.push('📣 شعبيتك ' + from.pop + ' ← ' + to.pop + ' (' + G.Media.fmtFans(to.fans) + ' متابع).');
    const nPress = run.events.filter((e) => e.k === 'press').length;
    if (nPress) H.push('🎤 جرت ' + (nPress === 1 ? 'مؤتمر صحفي واحد' : nPress === 2 ? 'مؤتمران صحفيان' : nPress + ' مؤتمرات صحفية') + ' بعد مبارياتك؛ ما لم تُجب عنه ينتهي دون أي أثر.');
    if (to.role !== from.role && isFieldRole(to.role) && isFieldRole(from.role)) H.push('📋 دورك مع الفريق: ' + ROLE_ADJ[from.role] + ' ← ' + ROLE_ADJ[to.role] + '.');

    const rep = {
      id: (S.simStats && S.simStats.runs ? S.simStats.runs : 0) + 1, t: Date.now(), season: run.season, label: run.label, mode: run.mode,
      club: u.club, from, to, weeks: run.weeks, w0: run.week0, w1: S.week, phase0: run.phase0, stop: run.stop,
      matches: ms, totals: T, best, train: run.train, spent: run.spent, restWeeks: run.restWeeks, summer: run.summer,
      events: run.events.slice().sort((a, b) => a.w - b.w).slice(0, 40), highlights: H,
      rules: run.rules, autoDP: run.autoDP, rest: run.rest, ms: Date.now() - run.t0, ended: S.phase === 'end'
    };
    return rep;
  }

  // يُنهي التشغيل: يبني التقرير ويخزّنه ثم يفكّ تجميد الحفظ ويحفظ مرة واحدة
  Sim.finish = (run) => {
    if (!run.done) stopRun(run, 'cancel');
    let rep = null;
    try {
      rep = buildReport(run);
      const S = G.S;
      S.simReport = rep;
      S.simStats = S.simStats || { runs: 0, weeks: 0 };
      S.simStats.runs++; S.simStats.weeks += run.weeks;
      rep.id = S.simStats.runs;
    } catch (e) {
      G.lastError = { label: 'simReport', msg: String(e && e.message || e), stack: e && e.stack };
      if (typeof console !== 'undefined') console.error('[simReport]', e);
    } finally {
      if (run.held) { run.held = false; G.Save.release(false); }
      G.Save.save(true);
    }
    return rep;
  };

  // تشغيل دفعة واحدة (للاختبار أو كاحتياط)
  Sim.run = (opts) => {
    const run = Sim.begin(opts);
    if (!run.ok) return run;
    let g = 0;
    while (!run.done && g++ < 200) Sim.step(run);
    if (!run.done) stopRun(run, 'error', 'تجاوزت المحاكاة الحدّ الأقصى للخطوات');
    return { ok: true, run, report: Sim.finish(run) };
  };
})(window.G = window.G || {});
