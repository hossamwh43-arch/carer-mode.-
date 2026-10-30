/* season.js — منسّق المواسم: لعبة جديدة، التقويم، المباريات، الأسابيع، الجوائز، التجديد والاعتزال */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const Season = (G.Season = {});
  const LAST_WEEK = 39, WINTER_OPEN = 19, WINTER_CLOSE = 22;
  const DIFFS = G.DIFF_ORDER;

  Season.label = (season) => { const y = G.CONFIG.startYear + season - 1; return y + '/' + String(y + 1).slice(2); };
  Season.userClub = () => C(P(G.S.user).club);
  Season.ligaIds = () => G.World.members(G.World.viewLg());
  Season.userInLiga = () => !!(G.S.league && G.S.league.table[P(G.S.user).club]); // هل يلعب نادي المستخدم في دوري محاكى هذا الموسم
  Season.userInUcl = () => !!(G.S.ucl && G.S.ucl.teams.indexOf(P(G.S.user).club) >= 0);

  // ---------- لعبة جديدة ----------
  // opts: name, nat, age, pos, h, w, foot, look, num, clubId, seed?, diff? (easy|normal|hard|legend)
  Season.newGame = (opts) => {
    U.seed(opts.seed || (Date.now() & 0x7fffffff));
    G.S = {
      v: 1, ver: G.CONFIG.saveVer, others: null, lgId: null, diff: DIFFS.indexOf(opts.diff) >= 0 ? opts.diff : 'normal', tour: 0, nextId: 1, season: 1, year: G.CONFIG.startYear, week: 0, phase: 'summer', user: null, clubs: {}, players: {}, free: [],
      league: null, ucl: null, uclTeams: [], uclHistory: [], inbox: [], offers: [], tlog: [], training: { focus: 'balanced', intensity: 'normal' },
      window: { open: true, kind: 'summer' }, matchLog: [], hist: [], errors: [], preLeft: 3, active: null, created: Date.now()
    };
    G.S.seed = G.rngState; // بذرة المسيرة (تُشتق منها «صدفة» الإعلام الثابتة دون استهلاك U.rnd)
    G.Players.initWorld();
    G.Players.createUser(opts);
    G.S.uclTeams = G.Ucl.qualify(null);
    G.Coach.decide();
    if (G.Media) G.Media.get();
    G.Inbox.add('news', 'مرحبًا في مسيرتك!', 'بدأتَ مسيرتك مع ' + G.C(opts.clubId).name + '. اكسب مكانك بالأداء والتدريب ثم ابدأ الموسم.');
    G.Save.save();
    return G.S;
  };

  // ---------- بدء الموسم ----------
  Season.canStart = () => {
    const S = G.S;
    if (S.userExpired) return { ok: false, msg: 'انتهى عقدك: جدّد أو وقّع مع نادٍ جديد أولًا' };
    return { ok: true };
  };
  Season.startSeason = () => {
    const S = G.S, c = Season.canStart();
    if (!c.ok) return c;
    if (S.phase !== 'summer') return { ok: false, msg: 'الموسم قيد التقدم' };
    Object.keys(S.clubs).forEach((id) => { if (!S.clubs[id].light) G.Transfers.fixSquad(S.clubs[id]); });
    G.World.startSeason(S.season); // جداول كل الدوريات (دوري المستخدم كاملًا والبقية مضغوطة)
    S.ucl = G.Ucl.setup(S.season, S.uclTeams);
    S.week = 1; S.phase = 'season'; S.window = { open: false, kind: 'none' };
    S.offers = []; S.transferRequest = false; S.check = null; S.active = null;
    G.Coach.decide();
    G.Inbox.add('news', 'انطلاق موسم ' + Season.label(S.season), 'انطلق الموسم! ' + (Season.userInUcl() ? 'فريقك يشارك في دوري أبطال أوروبا.' : ''));
    G.Save.save();
    return { ok: true };
  };

  // التدريب في فترة الإعداد (3 أسابيع كحد أقصى)
  Season.preseason = () => {
    const S = G.S;
    if (S.phase !== 'summer' || S.preLeft <= 0) return null;
    S.preLeft--;
    const res = G.Training.week();
    const p = P(S.user);
    p.fit = Math.max(p.fit, 90);
    G.Save.save();
    return res;
  };

  // ---------- مباريات اللاعب ----------
  Season.findFix = (id) => {
    const S = G.S;
    for (const rd of (S.league ? S.league.rounds : [])) for (const f of rd) if (f.id === id) return f;
    const uf = S.ucl ? G.Ucl.allFixtures().find((f) => f.id === id) : null;
    return uf || (S.intl && G.Intl ? G.Intl.findFix(id) : null);
  };
  Season.userFixtures = (week) => {
    const S = G.S, club = P(S.user).club, out = [];
    if (S.ucl) G.Ucl.fixturesForWeek(week).forEach((f) => { if (f.h === club || f.a === club) out.push(f); });
    if (S.league) G.League.roundFixtures(week).forEach((f) => { if (f.h === club || f.a === club) out.push(f); });
    return out;
  };
  Season.pending = () => {
    if (G.S.phase !== 'season') return null;
    return Season.userFixtures(G.S.week).find((f) => !f.played) || null;
  };
  Season.nextFixture = () => { // أقرب مباراة غير ملعوبة للاعب (للعرض)
    const S = G.S;
    for (let w = S.week; w <= LAST_WEEK; w++) { const f = Season.userFixtures(w).find((x) => !x.played); if (f) return Object.assign({}, f, { w }); }
    return null;
  };

  const optsFor = (fix) => (fix.comp === 'UCL'
    ? { comp: 'uc', neutral: !!fix.neutral, ko: G.Ucl.koCtx(fix) }
    : { comp: 'lg' });

  Season.startMatch = (fixId) => {
    const S = G.S, fix = Season.findFix(fixId);
    if (!fix || fix.played) return null;
    if (fix.comp === 'NT') G.Intl.prepare(fix); else G.Coach.decide();
    const m = G.Live.create(fix, fix.comp === 'NT' ? G.Intl.matchOpts(fix) : optsFor(fix));
    S.active = { fixId, m };
    G.Save.save();
    return m;
  };

  // يحاكي كل مباريات الأسبوع ما عدا مباريات نادي اللاعب
  Season.simAIWeek = (week) => {
    const S = G.S, club = P(S.user).club;
    if (S.league) {
      G.League.roundFixtures(week).forEach((f) => {
        if (f.played || f.h === club || f.a === club) return;
        const sc = G.World.simMatch(f.h, f.a);
        G.League.record(f, sc[0], sc[1]);
      });
    }
    G.World.simWeek(week); // بقية دوريات العالم
    if (S.ucl) G.Ucl.fixturesForWeek(week).forEach((f) => {
      if (f.played || f.h === club || f.a === club) return;
      G.Ucl.simFixture(f);
    });
  };

  // اعتماد نتيجة مباراة المستخدم بعد انتهائها
  Season.commitUser = (m) => {
    const S = G.S, u = P(S.user), fix = Season.findFix(m.id);
    if (!fix) throw new Error('المباراة غير موجودة');
    if (fix.played) { S.active = null; return null; } // منع التكرار
    if (!m.done) throw new Error('المباراة لم تنتهِ');
    const res = m.result, comp = m.comp;
    const isNT = fix.comp === 'NT';
    if (fix.comp === 'LL') G.League.record(fix, m.score.h, m.score.a);
    else if (!isNT) G.Ucl.record(fix, m.score.h, m.score.a, m.pens); // مباريات المنتخب تُسجَّل في Intl.afterUserMatch
    // إحصائيات الجميع
    Object.keys(res.ratings).forEach((id) => {
      const ps = m.ps[id];
      G.Match.addStat(id, comp, res.mins[id], ps.g, ps.a, res.ratings[id]);
      const p = P(id);
      if (!p) return;
      if (ps.inj && !p.user) p.inj = Math.max(p.inj || 0, ps.inj);
      if (!p.user && ps.red) p.susp = Math.max(p.susp || 0, ps.direct ? 2 : 1);
    });
    // اللاعب المستخدم
    const ps = m.ps[u.id], mins = res.mins[u.id] || 0, rating = res.ratings[u.id];
    const my = m.side, other = my === 'h' ? 'a' : 'h';
    const summary = { fixId: fix.id, comp: fix.comp, season: S.season, week: S.week, h: m.h, a: m.a, score: m.score, pens: m.pens, mins, rating: rating || null, g: ps.g, as: ps.a, sh: ps.sh, sot: ps.sot, pas: ps.pas, pasOk: ps.pasOk, dr: ps.dr, drOk: ps.drOk, tk: ps.tk, tkOk: ps.tkOk, yel: ps.yel, red: ps.red, big: ps.big || 0, saves: ps.saves || 0, motm: res.motm === u.id, state: m.uState, userSide: my, et: !!m.et,
      events: m.ev.filter((e) => ['goal', 'red', 'yellow', 'inj', 'et', 'pens', 'sub'].indexOf(e.k) >= 0).slice(0, 40).map((e) => ({ lab: e.lab, k: e.k, txt: e.txt })) };
    if (mins > 0) {
      u.fit = U.clamp(u.fit - mins * 0.16, 15, 100);
      u.form.push(rating); if (u.form.length > 10) u.form.shift();
      G.Training.addXP(u, G.Training.matchXP(rating, mins));
      u.cards.y += ps.yel; u.cards.r += ps.red;
      u.yel += ps.yel;
      if (ps.g >= 3) u.hattricks = (u.hattricks || 0) + 1;
      if (res.motm === u.id) u.motmN = (u.motmN || 0) + 1;
      u.maxRating = Math.max(u.maxRating || 0, rating || 0);
      u.maxOvr = Math.max(u.maxOvr || 0, u.ovr);
      if (u.yel >= 5) { u.susp = Math.max(u.susp, 1); u.yel = 0; summary.ban5 = true; }
      if (ps.red) u.susp = Math.max(u.susp, ps.direct ? U.int(2, 3) : 1);
    } else if (u.susp > 0) u.susp--; // أنهى مباراة إيقاف
    if (ps.inj) { const iw = Math.max(1, Math.round(ps.inj * G.diff().injLen)); u.inj = Math.max(u.inj, iw); summary.inj = iw; G.Inbox.add('injury', 'إصابة!', 'أصبتَ في المباراة وستغيب ' + iw + ' أسبوعًا تقريبًا.'); }
    if (!isNT) G.Coach.afterMatch(u, rating || 6.4, mins); // ثقة مدرب النادي لا تتأثر بمباريات المنتخب
    u.trainingMinutes = 0;
    S.matchLog.unshift(summary); if (S.matchLog.length > 60) S.matchLog.length = 60;
    S.lastMatch = summary;
    S.active = null;
    G.Players.refresh(u);
    if (G.Media) G.safe(() => G.Media.afterMatch(summary), 'media');
    if (G.Press) G.safe(() => G.Press.afterMatch(summary), 'press');
    if (isNT) G.Intl.afterUserMatch(fix, m);
    else { Season.simAIWeek(S.week); G.Ucl.advanceAll(); Season.validateAll(); }
    G.Save.save();
    return summary;
  };

  Season.simUserMatch = (fixId) => {
    const m = Season.startMatch(fixId);
    if (!m) return null;
    G.Live.simulate(m);
    return Season.commitUser(m);
  };

  Season.validateAll = () => {
    const S = G.S;
    let errs = [];
    if (S.league) errs = errs.concat(G.League.validate());
    if (S.ucl) errs = errs.concat(G.Ucl.validate());
    if (errs.length && S.league) { G.League.rebuild(); errs = G.League.validate().concat(S.ucl ? G.Ucl.validate() : []); }
    S.check = { ok: errs.length === 0, errs, t: Date.now() };
    return S.check;
  };

  // ---------- إنهاء الأسبوع ----------
  Season.advanceWeek = () => {
    const S = G.S;
    if (S.phase !== 'season') return { ok: false, msg: 'لا يوجد أسبوع نشط' };
    if (S.active) return { ok: false, msg: 'لديك مباراة جارية — أنهِها أولًا' };
    const pend = Season.pending();
    if (pend) return { ok: false, msg: 'لم تُلعب مباراة هذا الأسبوع بعد' };
    const u = P(S.user), w = S.week;
    const playedThisWeek = Season.userFixtures(w).length;
    Season.simAIWeek(w);
    G.Ucl.advanceAll();
    Season.validateAll();
    const tr = G.Training.week();
    // الإصابات والإيقافات
    Object.keys(S.players).forEach((id) => { const p = S.players[id]; if (p.inj > 0) p.inj--; });
    if (u.susp > 0 && playedThisWeek === 0) { /* يبقى الإيقاف حتى مباراة قادمة */ }
    Object.keys(S.players).forEach((id) => { const p = S.players[id]; if (!p.user && p.susp > 0) p.susp--; });
    if (tr.attrUps.length) G.Inbox.add('training', 'تطور من التدريب', 'تحسّنت سماتك: ' + tr.attrUps.map((k) => G.Players.ATTR_AR[k]).join('، ') + '.');
    if (tr.ups) G.Inbox.add('training', 'مستوى جديد', 'ارتقيتَ إلى مستوى جديد وحصلتَ على ' + tr.ups + ' نقطة تطوير. أنفقها من صفحة التدريب.');
    if (tr.injured) G.Inbox.add('injury', 'إصابة تدريب', 'أصبتَ أثناء التدريب المكثف — عليك الراحة.');
    // انتقال الأسبوع
    S.week++;
    const msgs = [];
    if (S.week === WINTER_OPEN) {
      S.window = { open: true, kind: 'winter' };
      G.Transfers.aiWindow('winter');
      G.Transfers.generateOffers(1.3); G.Transfers.generateLoanOffers();
      G.Inbox.add('news', 'فتح سوق الانتقالات الشتوي', 'تُفتح النافذة حتى الأسبوع ' + (WINTER_CLOSE - 1) + '. تفقّد عروضك.');
    } else if (S.window && S.window.open && S.window.kind === 'winter') {
      if (S.week >= WINTER_CLOSE) { S.window = { open: false, kind: 'none' }; S.offers = []; G.Inbox.add('news', 'إغلاق السوق', 'أُغلقت نافذة الانتقالات الشتوية.'); }
      else G.Transfers.generateOffers(1);
    }
    if (S.offers.length) S.offers = S.offers.filter((o) => o.expires == null || o.expires >= S.week || o.type === 'free');
    u.trust = U.clamp(u.trust + (50 - u.trust) * 0.04, 0, 100); // ميل بطيء نحو الحياد
    u.val = G.Players.value(u);
    if (G.Media) G.safe(() => G.Media.weekly(), 'media');
    if (G.BD) G.safe(() => G.BD.weekly(S.week - 1), 'bd');
    if (G.Press) G.safe(() => G.Press.weekly(S.week - 1), 'press');
    if (S.week > LAST_WEEK) { Season.endSeason(); }
    else G.Coach.decide();
    G.Save.save();
    return { ok: true, training: tr };
  };

  // وضع التشغيل التلقائي للأسبوع (يحاكي مباريات المستخدم بدلًا منه)
  Season.autoWeek = () => {
    const S = G.S;
    if (S.active) { G.Live.simulate(S.active.m); Season.commitUser(S.active.m); }
    let g = 0, f;
    while ((f = Season.pending()) && g++ < 4) Season.simUserMatch(f.id);
    return Season.advanceWeek();
  };

  // ---------- الإحصائيات والجوائز ----------
  Season.statOf = (p, comp) => { const s = p.st[comp]; return { apps: s[0], g: s[1], a: s[2], avg: s[0] ? s[3] / s[0] : 0, min: s[4] }; };

  Season.awards = () => {
    const S = G.S, everyone = Object.values(S.players).filter((p) => p.club);
    const inL = {}; S.league.clubs.forEach((id) => { inL[id] = true; });
    const all = everyone.filter((p) => inL[p.club]); // جوائز الدوري تخص لاعبي دوري المستخدم؛ أما أفضل لاعب في الأبطال فعالمي
    const pick = (list, score, minApps, comp) => {
      const cand = list.filter((p) => p.st[comp][0] >= minApps);
      cand.sort((a, b) => score(b) - score(a));
      return cand[0] || null;
    };
    const lg = (p) => Season.statOf(p, 'lg');
    const uc = (p) => Season.statOf(p, 'uc');
    const champ = G.League.sorted()[0];
    const pos = (id) => G.League.position(id);
    const best = pick(all, (p) => lg(p).avg + (lg(p).g + lg(p).a) * 0.03 + (21 - pos(p.club)) * 0.02, 22, 'lg');
    const scorer = pick(all, (p) => lg(p).g + lg(p).a * 0.001 - lg(p).min * 1e-6, 1, 'lg');
    const assist = pick(all, (p) => lg(p).a + lg(p).g * 0.001, 1, 'lg');
    const ex = S.ucl ? S.ucl.exit : {};
    const bonus = { winner: 1.0, final: 0.6, sf: 0.4, qf: 0.2 };
    const uclBest = pick(everyone, (p) => uc(p).avg + (uc(p).g + uc(p).a) * 0.05 + (bonus[ex[p.club]] || 0), 4, 'uc');
    const young = pick(all.filter((p) => p.age <= 21), (p) => lg(p).avg + (lg(p).g + lg(p).a) * 0.03, 12, 'lg');
    const mk = (type, p, val) => (p ? { type, pid: p.id, name: p.n, club: p.club, value: val, user: !!p.user } : null);
    const out = [
      mk('player', best, best && lg(best).avg.toFixed(2)), mk('scorer', scorer, scorer && lg(scorer).g),
      mk('assist', assist, assist && lg(assist).a), mk('ucl', uclBest, uclBest && uc(uclBest).avg.toFixed(2)),
      mk('young', young, young && lg(young).avg.toFixed(2))
    ].filter(Boolean);
    return { list: out, champion: champ };
  };
  Season.AWARD_AR = { player: 'أفضل لاعب في الموسم', scorer: 'هداف الدوري', assist: 'أفضل صانع أهداف', ucl: 'أفضل لاعب في دوري الأبطال', young: 'أفضل لاعب شاب' };

  // ---------- نهاية الموسم ----------
  Season.endSeason = () => {
    const S = G.S, u = P(S.user);
    G.Ucl.advanceAll();
    const aw = Season.awards();
    const table = G.League.sorted();
    const ucl = S.ucl;
    const lgS = Season.statOf(u, 'lg'), ucS = Season.statOf(u, 'uc');
    const uClub = u.club;
    const lgId = S.league.lg || 'ESP1', lgTop = (G.LEAGUES[lgId] || G.LEAGUES.ESP1).tier === 1;
    const champ = aw.champion === uClub && lgS.apps >= 10 && !!C(uClub).lg;
    const trophies = { liga: lgTop && champ, d2: !lgTop && champ, ucl: !!(ucl && ucl.winner === uClub && ucS.apps >= 3) };
    const mine = aw.list.filter((a) => a.user).map((a) => a.type);
    const row = {
      season: S.season, label: Season.label(S.season), club: uClub, lgId, age: u.age, ovrStart: S.seasonStartOvr || u.ovr, ovrEnd: u.ovr,
      lg: lgS, uc: ucS, pos: G.League.sorted().indexOf(uClub) + 1, trophies, awards: mine, loan: !!u.parentPays,
      ucExit: ucl && ucl.exit ? ucl.exit[uClub] || null : null, val: u.val, wage: u.ct.w
    };
    u.car.push(row);
    mine.forEach((t) => u.awards.push({ season: S.season, type: t }));
    u.trophies = u.trophies || { liga: 0, ucl: 0 };
    if (trophies.liga) u.trophies.liga++;
    if (trophies.d2) u.trophies.d2 = (u.trophies.d2 || 0) + 1;
    if (trophies.ucl) u.trophies.ucl++;
    S.hist.push({ season: S.season, label: row.label, lgId, champs: G.World.champions(), champion: aw.champion, uclWinner: ucl ? ucl.winner : null, scorer: aw.list.find((a) => a.type === 'scorer') || null, awards: aw.list });
    if (ucl) { S.uclHistory.push({ season: S.season, winner: ucl.winner, exit: ucl.exit }); }
    if (G.Media) G.safe(() => G.Media.seasonEnd(row), 'media');
    S.summary = { row, awards: aw.list, champion: aw.champion, table: table.map((id) => ({ id, ...S.league.table[id] })), uclWinner: ucl ? ucl.winner : null };
    if (G.Press) G.safe(() => G.Press.seasonEnd(row), 'press');
    mine.forEach((t) => G.Inbox.add('award', 'جائزة: ' + Season.AWARD_AR[t], 'فزتَ بجائزة ' + Season.AWARD_AR[t] + ' لموسم ' + row.label + '! 🏆'));
    if (trophies.liga) G.Inbox.add('award', 'بطل الدوري!', 'توّجتَ مع ' + C(uClub).name + ' بلقب ' + G.leagueName(lgId) + '.');
    if (trophies.d2) G.Inbox.add('award', 'بطل الدرجة الثانية!', 'توّجتَ مع ' + C(uClub).name + ' بلقب ' + G.leagueName(lgId) + ' وصعد الفريق إلى الدوري الأعلى.');
    if (trophies.ucl) G.Inbox.add('award', 'بطل أوروبا!', 'توّجتَ مع ' + C(uClub).name + ' بلقب دوري أبطال أوروبا! 🌟');
    S.phase = 'end';
    S.window = { open: false, kind: 'none' };
    if (G.BD) G.safe(() => G.BD.seasonEnd(), 'bd');         // إغلاق موسم الكرة الذهبية (حُسم الدوري والأبطال)
    if (G.Intl) G.safe(() => G.Intl.onSeasonEnd(), 'intl'); // كأس العالم/آسيا في صيف نهاية الموسم عند حلول موعدها
    if (G.BD) G.safe(() => G.BD.tryFinalize(), 'bd');       // الحفل فورًا إن لم تكن هناك بطولة منتخبات معلّقة
    G.Save.save();
  };

  // الألقاب: المفتاح، الرمز، الاسم (liga/d2 يُعرَضان باسم الدوري الفعلي)
  Season.TROPHY_DEFS = [['liga', '🥇', 'بطل الدوري'], ['d2', '🥈', 'بطل الدرجة الثانية'], ['ucl', '🌟', 'دوري أبطال أوروبا'], ['wc', '🌍', 'كأس العالم'], ['ac', '🏅', 'كأس آسيا'], ['bd', '🏆', 'الكرة الذهبية']];
  Season.trophyTotal = (t) => ['liga', 'd2', 'ucl', 'wc', 'ac'].reduce((s, k) => s + ((t || {})[k] || 0), 0);
  Season.canRetire = () => P(G.S.user).age >= 30;

  // ---------- الانتقال للموسم التالي ----------
  Season.rollover = () => {
    const S = G.S;
    if (S.phase !== 'end') return { ok: false, msg: 'الموسم لم ينتهِ بعد' };
    if (S.intl && !S.intl.done) return { ok: false, msg: 'بطولة المنتخبات لم تنتهِ بعد — العبها أو حاكِها أولًا' };
    if (G.BD) G.safe(() => G.BD.tryFinalize(), 'bd'); // أمان: الحفل لا يضيع إن لم يُجرَ بعد
    if (G.Intl) G.Intl.archive();
    const u = P(S.user);
    const info = { apps: Season.statOf(u, 'lg').apps + Season.statOf(u, 'uc').apps };
    const lgAvg = Season.statOf(u, 'lg'), ucAvg = Season.statOf(u, 'uc');
    const tot = lgAvg.apps + ucAvg.apps;
    info.avg = tot ? (lgAvg.avg * lgAvg.apps + ucAvg.avg * ucAvg.apps) / tot : 6.4;
    // 1) النمو
    Object.keys(S.players).forEach((id) => { const p = S.players[id]; if (!p.user) G.Training.growAI(p); });
    const gr = G.Training.growUser(u, info);
    // 2) العمر والاعتزال والعقود
    Object.keys(S.players).forEach((id) => { S.players[id].age++; });
    G.Transfers.retireOld();
    const expired = G.Transfers.rollContracts();
    G.Transfers.seasonFinance();
    // 3) تصفير الإحصاءات
    const orders = G.World.uclOrders(); // ترتيب الدوريات الكبرى لتحديد مقاعد الأبطال
    const moves = G.World.promoRel();   // الصعود والهبوط (بعد حفظ الترتيب)
    S.lastMoves = moves;
    Object.keys(S.players).forEach((id) => {
      const p = S.players[id];
      p.st = { lg: [0, 0, 0, 0, 0], uc: [0, 0, 0, 0, 0], nt: [0, 0, 0, 0, 0] };
      p.yel = 0; p.susp = 0; p.inj = Math.max(0, (p.inj || 0) - 6);
      G.Players.refresh(p);
    });
    u.fit = 95; u.form = []; u.gain = {}; u.prog = {};
    // 4) التأهل لدوري الأبطال للموسم القادم
    S.uclTeams = G.Ucl.qualify(orders);
    moves.forEach((m) => {
      const mine = C(u.club) ? u.club : null;
      if (m.rel.indexOf(mine) >= 0) G.Inbox.add('news', 'هبوط ناديك', C(mine).name + ' هبط إلى ' + G.leagueName(m.low) + '. يمكنك البقاء لقيادة العودة أو البحث عن نادٍ أكبر في نافذة الصيف.');
      if (m.pro.indexOf(mine) >= 0) G.Inbox.add('news', 'صعود ناديك!', C(mine).name + ' صعد إلى ' + G.leagueName(m.top) + '. تحدٍّ جديد أمامك.');
    });
    // 5) نافذة الصيف وانتقالات الذكاء الاصطناعي
    S.season++; S.year++; S.week = 0; S.phase = 'summer'; S.preLeft = 3;
    S.window = { open: true, kind: 'summer' }; S.offers = []; S.transferRequest = false;
    S.league = null; S.others = null; S.ucl = null; S.active = null; S.lastMatch = null;
    G.World.lightenAll(); // أندية الدرجة الثانية خارج دوريك تعود خفيفة (تُباع نجومها) ليبقى الحفظ صغيرًا
    G.Transfers.aiWindow('summer');
    Object.keys(S.clubs).forEach((id) => G.Transfers.fixSquad(S.clubs[id]));
    G.World.pruneFree();
    G.Players.refresh(u);
    S.seasonStartOvr = u.ovr;
    // 6) رسائل المستخدم
    G.Inbox.add('news', 'ملخص تطورك', 'تقييمك ' + gr.from + ' ← ' + gr.to + '. ' + (gr.note ? gr.note + '.' : '') + ' عمرك الآن ' + u.age + '.');
    S.userExpired = !!expired;
    if (expired) {
      G.Transfers.freeAgentOffers();
      G.Inbox.add('contract', 'انتهى عقدك', 'انتهى عقدك مع ' + C(u.club).name + '. اختر بين التجديد أو التوقيع مع نادٍ جديد كلاعب حر.');
    } else {
      G.Transfers.generateOffers(1.5); G.Transfers.generateLoanOffers();
    }
    G.Coach.decide();
    G.Save.save();
    return { ok: true, growth: gr, expired };
  };

  Season.retire = () => {
    const S = G.S, u = P(S.user);
    if (!Season.canRetire()) return { ok: false, msg: 'لا يمكنك الاعتزال قبل سن 30' };
    if (S.phase === 'season') return { ok: false, msg: 'الاعتزال متاح في نهاية الموسم أو في الصيف فقط' };
    S.phase = 'retired';
    S.retiredAt = { season: S.season, age: u.age };
    G.Save.save();
    return { ok: true };
  };

  // مجاميع المسيرة
  Season.careerTotals = () => {
    const u = P(G.S.user), t = { apps: 0, g: 0, a: 0, seasons: u.car.length, liga: 0, ucl: 0, avgSum: 0, avgN: 0 };
    u.car.forEach((r) => {
      t.apps += r.lg.apps + r.uc.apps; t.g += r.lg.g + r.uc.g; t.a += r.lg.a + r.uc.a;
      if (r.lg.apps) { t.avgSum += r.lg.avg * r.lg.apps; t.avgN += r.lg.apps; }
      if (r.uc.apps) { t.avgSum += r.uc.avg * r.uc.apps; t.avgN += r.uc.apps; }
    });
    const cur = Season.statOf(u, 'lg'), cu = Season.statOf(u, 'uc');
    t.apps += cur.apps + cu.apps; t.g += cur.g + cu.g; t.a += cur.a + cu.a;
    t.nt = { apps: 0, g: 0, a: 0 };
    (u.ntCar || []).forEach((e) => { t.nt.apps += e.apps; t.nt.g += e.g; t.nt.a += e.a; if (e.apps) { t.avgSum += e.avg * e.apps; t.avgN += e.apps; } });
    t.apps += t.nt.apps; t.g += t.nt.g; t.a += t.nt.a;
    t.avg = t.avgN ? t.avgSum / t.avgN : 0;
    t.liga = (u.trophies || {}).liga || 0; t.ucl = (u.trophies || {}).ucl || 0; t.titles = Season.trophyTotal(u.trophies);
    return t;
  };
})(window.G = window.G || {});
