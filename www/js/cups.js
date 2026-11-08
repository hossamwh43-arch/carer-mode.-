/* cups.js — الكؤوس المحلية والسوبر لكل دوري كبير.
   الكأس: إقصاء مباشر (مباراة واحدة، وقت إضافي ثم ركلات ترجيح) بين أندية الدرجتين في كل بلد (ESP/ENG/ITA/GER/FRA).
     لأن عدد الأندية 36 أو 40 يبدأ بدور تمهيدي لأضعف الأندية سمعةً، والباقون معفون إلى دور الـ32؛ كل دور يُسحب عند اكتمال سابقه.
   السوبر: مباراة واحدة على ملعب محايد في الأسبوع 1 بين بطل الدوري وبطل الكأس للموسم السابق (إن تطابقا فمع وصيف الدوري).
   التمثيل: S.cups = { season, cn:{ESP:cup,…}, sup:{ESP:{…,fix}}, ua:{CUP:{نادٍ:مشاركات اللاعب},SUP:{…}} } بكائنات مباريات كاملة (حجمها بالكيلوبايت).
   مباريات المستخدم تُلعب بالمحرك الكامل (comp 'cp')، والبقية بمحاكاة سريعة؛ لا يستدعي أي كود واجهة هنا U.rnd (السحب داخل المحرك فقط). */
(function (G) {
  'use strict';
  const U = G.U, C = (id) => G.S.clubs[id], P = (id) => G.S.players[id];
  const Cups = (G.Cups = {});
  const COUNTRIES = ['ESP', 'ENG', 'ITA', 'GER', 'FRA'];
  Cups.COUNTRIES = COUNTRIES;
  // أسابيع الأدوار: خارج أسابيع دوري الأبطال حتى لا تتراكم ثلاث مباريات في أسبوع
  Cups.WEEKS = { pre: 6, r32: 10, r16: 15, qf: 21, sf: 28, final: 38 };
  Cups.SUPER_WEEK = 1;
  Cups.ROUND_AR = { pre: 'الدور التمهيدي', r32: 'دور الـ32', r16: 'دور الـ16', qf: 'ربع النهائي', sf: 'نصف النهائي', final: 'النهائي' };
  const KEY_BY_SIZE = { 32: 'r32', 16: 'r16', 8: 'qf', 4: 'sf', 2: 'final' };

  const userClub = () => { const S = G.S, u = S && S.user ? P(S.user) : null; return u ? u.club : null; };
  const cnOfClub = (id) => { const c = G.S.clubs[id], lg = c && c.lg; return lg && G.LEAGUES[lg] ? G.LEAGUES[lg].country : null; };
  Cups.userCountry = () => { const id = userClub(); return id ? cnOfClub(id) : null; };

  Cups.tieWinner = (f) => (f.hg > f.ag ? f.h : f.hg < f.ag ? f.a : (f.pens && f.pens.h > f.pens.a ? f.h : f.a));
  const loser = (f) => (Cups.tieWinner(f) === f.h ? f.a : f.h);

  // ---------- البناء ----------
  Cups.members = (cn) => { const top = G.LG_TOP_OF[cn], low = G.LEAGUES[top].other; return G.World.members(top).concat(G.World.members(low)); };

  const mkRound = (key, cup, order, byes) => {
    const ties = [];
    for (let i = 0; i + 1 < order.length; i += 2) {
      ties.push({ id: 'CUP' + cup.season + '-' + cup.cn + '-' + key + '-' + (i / 2 + 1), comp: 'CUP', cn: cup.cn, stage: key, h: order[i], a: order[i + 1], played: false, hg: null, ag: null, pens: null, w: Cups.WEEKS[key], neutral: key === 'final' });
    }
    return { key, w: Cups.WEEKS[key], ties, byes: (byes || []).slice() };
  };

  const makeCup = (cn, season) => {
    const ids = Cups.members(cn), N = ids.length;
    let P2 = 1; while (P2 < N) P2 *= 2;
    const cup = { cn, season, lg: G.LG_TOP_OF[cn], clubs: ids.slice(), rounds: [], winner: null, runner: null };
    const x = N - P2 / 2; // عدد مباريات الدور التمهيدي (0 إن كان العدد قوة اثنين)
    if (x > 0) {
      const weak = ids.slice().sort((a, b) => (C(a).rep - C(b).rep) || (a < b ? -1 : 1));
      cup.rounds.push(mkRound('pre', cup, U.shuffle(weak.slice(0, 2 * x)), weak.slice(2 * x)));
    } else cup.rounds.push(mkRound(KEY_BY_SIZE[N] || 'r32', cup, U.shuffle(ids.slice()), []));
    return cup;
  };

  // أبطال الموسم السابق للسوبر: من سجل الكؤوس، ثم من سجل المواسم القديم، ثم من بيانات 2024/25 (الموسم الأول)
  const bestRep = (list, skip) => list.filter((id) => id !== skip && C(id)).sort((a, b) => (C(b).rep - C(a).rep) || (a < b ? -1 : 1))[0] || null;
  Cups.previous = (cn) => {
    const S = G.S, top = G.LG_TOP_OF[cn], mem = G.World.members(top), last = (S.cupHist || [])[(S.cupHist || []).length - 1];
    let champ = null, cup = null, runner = null, seeded = false;
    if (last && last.champ && last.champ[cn]) { champ = last.champ[cn]; cup = last.cup ? last.cup[cn] : null; runner = last.run ? last.run[cn] : null; }
    else if ((S.hist || []).length && S.hist[S.hist.length - 1].champs && S.hist[S.hist.length - 1].champs[top]) champ = S.hist[S.hist.length - 1].champs[top];
    else { const pw = G.PREV_WINNERS[cn] || {}; champ = pw.champ; cup = pw.cup; runner = pw.runner; seeded = true; }
    if (!champ || !C(champ)) champ = bestRep(mem, null);
    if (!cup || !C(cup)) cup = bestRep(mem, champ);
    let opp = cup;
    if (cup === champ) opp = runner && runner !== champ && C(runner) ? runner : bestRep(mem, champ);
    return { champ, cup, opp, seeded };
  };

  const makeSuper = (cn, season) => {
    const pv = Cups.previous(cn);
    return {
      cn, season, lg: G.LG_TOP_OF[cn], champ: pv.champ, cupW: pv.cup, seeded: pv.seeded, winner: null, runner: null,
      fix: { id: 'SUP' + season + '-' + cn, comp: 'SUP', cn, stage: 'final', h: pv.champ, a: pv.opp, played: false, hg: null, ag: null, pens: null, w: Cups.SUPER_WEEK, neutral: true }
    };
  };

  Cups.setup = (season) => {
    const out = { season, cn: {}, sup: {}, ua: { CUP: {}, SUP: {} } };
    COUNTRIES.forEach((cn) => { out.cn[cn] = makeCup(cn, season); out.sup[cn] = makeSuper(cn, season); });
    return out;
  };
  // يُستدعى من Season.startSeason بعد جداول الدوريات
  Cups.startSeason = (season) => {
    const S = G.S;
    S.cups = Cups.setup(season);
    COUNTRIES.forEach((cn) => { const cup = S.cups.cn[cn]; announce(cup, cup.rounds[0]); });
    Cups.prepareUser();
    return S.cups;
  };

  // ---------- أدوات الوصول ----------
  Cups.cupOf = (cn) => (G.S.cups ? G.S.cups.cn[cn] || null : null);
  Cups.userCup = () => { const cn = Cups.userCountry(); return cn ? Cups.cupOf(cn) : null; };
  Cups.userSuper = () => { const cn = Cups.userCountry(); return cn && G.S.cups ? G.S.cups.sup[cn] || null : null; };
  Cups.fixtures = () => {
    const S = G.S, out = [];
    if (!S.cups) return out;
    COUNTRIES.forEach((cn) => {
      const sp = S.cups.sup[cn]; if (sp) out.push(sp.fix);
      const cup = S.cups.cn[cn]; if (cup) cup.rounds.forEach((r) => r.ties.forEach((t) => out.push(t)));
    });
    return out;
  };
  Cups.fixturesForWeek = (w) => Cups.fixtures().filter((f) => f.w === w);
  Cups.findFix = (id) => Cups.fixtures().find((f) => f.id === id) || null;
  Cups.userFixtures = (w) => { const uc = userClub(); return Cups.fixturesForWeek(w).filter((f) => f.h === uc || f.a === uc); };
  Cups.label = (f) => (f.comp === 'SUP' ? G.supName(f.cn) + ' (ملعب محايد)' : G.cupName(f.cn, true) + ' · ' + Cups.ROUND_AR[f.stage] + (f.neutral ? ' (ملعب محايد)' : ''));
  Cups.stageAr = (f) => (f.comp === 'SUP' ? 'نهائي السوبر' : Cups.ROUND_AR[f.stage]);

  // حالة نادٍ في كأس: none | alive | out | winner (+ الدور الأخير الذي ظهر فيه ومباراته)
  Cups.status = (cup, id) => {
    if (!cup || !id || cup.clubs.indexOf(id) < 0) return { state: 'none' };
    let st = { state: 'alive', round: null, tie: null, bye: false };
    for (const r of cup.rounds) {
      const t = r.ties.find((x) => x.h === id || x.a === id);
      if (t) {
        st.round = r.key; st.tie = t; st.bye = false;
        if (t.played && Cups.tieWinner(t) !== id) return { state: 'out', round: r.key, tie: t };
      } else if ((r.byes || []).indexOf(id) >= 0) { st.round = r.key; st.tie = null; st.bye = true; }
    }
    if (cup.winner === id) st.state = 'winner';
    return st;
  };

  // تأكيد وجود تشكيلات الأندية الخفيفة في مباريات المستخدم غير الملعوبة (بذرة ثابتة؛ لا تستهلك U.rnd)
  Cups.prepareUser = () => {
    const uc = userClub();
    if (!G.S.cups || !uc) return;
    Cups.fixtures().forEach((f) => { if (!f.played && (f.h === uc || f.a === uc)) { G.World.ensureSquad(f.h); G.World.ensureSquad(f.a); } });
  };

  // ---------- النتائج والمحاكاة ----------
  Cups.record = (fix, hg, ag, pens) => {
    if (fix.played) throw new Error('مباراة مكررة: ' + fix.id);
    fix.played = true; fix.hg = hg; fix.ag = ag; fix.pens = pens || null;
  };
  Cups.simFix = (f) => {
    const ch = C(f.h), ca = C(f.a), neutral = !!f.neutral;
    if (!ch.light && !ca.light && ch.squad.length >= 11 && ca.squad.length >= 11) {
      const r = G.Match.quick(f.h, f.a, { comp: 'cp', neutral, ko: { prevH: 0, prevA: 0 } }); // إحصاءات اللاعبين تُسجَّل في 'cp' لا في الدوري
      Cups.record(f, r.hg, r.ag, r.pens);
      return;
    }
    const eh = G.World.eff(ch) + U.gauss() * 1.2, ea = G.World.eff(ca) + U.gauss() * 1.2;
    const Rh = { A: eh, D: eh, M: eh }, Ra = { A: ea, D: ea, M: ea };
    const lh = G.Lineup.lambda(Rh, Ra, neutral ? null : true), la = G.Lineup.lambda(Ra, Rh, neutral ? null : false);
    let hg = U.poisson(lh), ag = U.poisson(la), pens = null;
    if (hg === ag) { hg += U.poisson(lh * 0.33); ag += U.poisson(la * 0.33); if (hg === ag) pens = G.Match.shootout(70, 70); }
    Cups.record(f, hg, ag, pens);
  };
  // محاكاة مباريات الأسبوع w ما عدا مباريات نادي المستخدم
  Cups.simWeek = (w, uc) => {
    let n = 0;
    Cups.fixturesForWeek(w).forEach((f) => { if (f.played || f.h === uc || f.a === uc) return; Cups.simFix(f); n++; });
    return n;
  };
  // بعد مباراة المستخدم: تُحتسب مشاركته (دقائق > 0) للنادي الذي لعب له، فهي شرط احتساب اللقب
  Cups.afterUser = (fix, sum) => {
    const S = G.S;
    if (!S.cups || !sum || !(sum.mins > 0)) return;
    const club = sum.userSide === 'h' ? fix.h : fix.a, m = (S.cups.ua[fix.comp] = S.cups.ua[fix.comp] || {});
    m[club] = (m[club] || 0) + 1;
  };
  const uPlayed = (comp, club) => !!(G.S.cups && G.S.cups.ua && G.S.cups.ua[comp] && G.S.cups.ua[comp][club] > 0);

  // ---------- التقدّم (القرعة والتتويج) ----------
  function announce(cup, round) {
    const uc = userClub();
    if (!uc || cup.clubs.indexOf(uc) < 0 || !G.Inbox) return;
    const t = round.ties.find((x) => x.h === uc || x.a === uc), nm = G.cupName(cup.cn, true);
    if (t) {
      G.World.ensureSquad(t.h); G.World.ensureSquad(t.a);
      const opp = t.h === uc ? t.a : t.h;
      G.Inbox.add('news', 'قرعة ' + nm, 'ناديك يواجه ' + C(opp).name + ' ' + (round.key === 'final' ? 'في النهائي على ملعب محايد' : t.h === uc ? 'على أرضه' : 'خارج أرضه') + ' في ' + Cups.ROUND_AR[round.key] + ' (الأسبوع ' + round.w + ').');
    } else if (round.key === 'pre' && round.byes.indexOf(uc) >= 0) {
      G.Inbox.add('news', 'قرعة ' + nm, 'ناديك معفى من الدور التمهيدي ويدخل المنافسة في دور الـ32.');
    }
  }

  const advanceCup = (cup) => {
    const last = cup.rounds[cup.rounds.length - 1], uc = userClub();
    if (!last.ties.length || !last.ties.every((t) => t.played)) return false;
    const winners = last.ties.map(Cups.tieWinner);
    const mine = last.ties.find((t) => t.h === uc || t.a === uc);
    if (last.key === 'final') {
      const f = last.ties[0];
      cup.winner = winners[0]; cup.runner = loser(f);
      finishCup(cup);
      return true;
    }
    if (mine && Cups.tieWinner(mine) !== uc && G.Inbox) G.Inbox.add('news', 'خروج من ' + G.cupName(cup.cn, true), 'خرج ناديك من ' + Cups.ROUND_AR[last.key] + ' بعد مواجهة ' + C(Cups.tieWinner(mine)).name + '.');
    const surv = winners.concat(last.byes || []), key = KEY_BY_SIZE[surv.length];
    if (!key) throw new Error('حجم دور غير متوقع في الكأس: ' + surv.length);
    const r = mkRound(key, cup, U.shuffle(surv.slice()), []);
    cup.rounds.push(r);
    announce(cup, r);
    return true;
  };

  function finishCup(cup) {
    const S = G.S, u = P(S.user), nm = G.cupName(cup.cn), T = G.Trophies;
    const credit = (club, res) => {
      if (!u || !uPlayed('CUP', club)) return false;
      if (T) T.add(u, 'cup', { r: res, c: club, x: cup.cn });
      if (res === 'w') { u.trophies = u.trophies || {}; u.trophies.cup = (u.trophies.cup || 0) + 1; }
      return true;
    };
    const won = credit(cup.winner, 'w');
    const lost = !won && credit(cup.runner, 'f');
    if (G.Inbox) {
      if (won) G.Inbox.add('award', 'بطل ' + G.cupName(cup.cn, true) + '!', 'توّجتَ مع ' + C(cup.winner).name + ' بلقب ' + nm + ' 🏆');
      else if (lost) G.Inbox.add('award', 'وصيف ' + G.cupName(cup.cn, true), 'خسرتَ نهائي ' + nm + ' مع ' + C(cup.runner).name + ' أمام ' + C(cup.winner).name + '.');
      else if (u && (cup.winner === u.club)) G.Inbox.add('news', 'ناديك بطل ' + G.cupName(cup.cn, true), 'فاز ' + C(cup.winner).name + ' بالكأس لكنك لم تشارك في مبارياته فلا يُحتسب اللقب لك.');
    }
    if (won && G.Media && G.Media.cupWin) G.safe(() => G.Media.cupWin(cup.cn, false), 'media');
  }

  function finishSuper(sp) {
    const S = G.S, u = P(S.user), f = sp.fix, T = G.Trophies;
    sp.winner = Cups.tieWinner(f); sp.runner = loser(f);
    const credit = (club, res) => {
      if (!u || !uPlayed('SUP', club)) return false;
      if (T) T.add(u, 'sup', { r: res, c: club, x: sp.cn });
      if (res === 'w') { u.trophies = u.trophies || {}; u.trophies.sup = (u.trophies.sup || 0) + 1; }
      return true;
    };
    const won = credit(sp.winner, 'w'), lost = !won && credit(sp.runner, 'f');
    if (G.Inbox) {
      if (won) G.Inbox.add('award', 'بطل ' + G.supName(sp.cn, true) + '!', 'توّجتَ مع ' + C(sp.winner).name + ' بـ' + G.supName(sp.cn) + ' 🏅');
      else if (lost) G.Inbox.add('award', 'وصيف ' + G.supName(sp.cn, true), 'خسرتَ ' + G.supName(sp.cn) + ' مع ' + C(sp.runner).name + ' أمام ' + C(sp.winner).name + '.');
    }
    if (won && G.Media && G.Media.cupWin) G.safe(() => G.Media.cupWin(sp.cn, true), 'media');
  }

  Cups.advance = () => {
    const S = G.S;
    if (!S.cups) return false;
    let changed = false;
    COUNTRIES.forEach((cn) => {
      const cup = S.cups.cn[cn];
      let g = 0;
      while (cup && !cup.winner && g++ < 8 && advanceCup(cup)) changed = true;
      const sp = S.cups.sup[cn];
      if (sp && !sp.winner && sp.fix.played) { finishSuper(sp); changed = true; }
    });
    if (changed) Cups.prepareUser();
    return changed;
  };
  Cups.advanceAll = Cups.advance;

  // أمان: إكمال أي كأس/سوبر لم يكتمل (حالة غير متوقعة) بمحاكاة سريعة قبل إغلاق الموسم
  Cups.finishAll = () => {
    const S = G.S;
    if (!S.cups) return;
    let guard = 0;
    while (guard++ < 12) {
      let open = false;
      Cups.fixtures().forEach((f) => { if (!f.played) { Cups.simFix(f); open = true; } });
      Cups.advance();
      if (!open) break;
    }
  };

  // أرشيف الموسم (للسوبر القادم وصفحة الأبطال): بطل ووصيف الدوري والكأس والسوبر لكل بلد
  Cups.onSeasonEnd = () => {
    const S = G.S;
    if (!S.cups) return null;
    Cups.finishAll();
    const e = { season: S.season, label: G.Season.label(S.season), champ: {}, run: {}, cup: {}, cupRun: {}, sup: {}, supRun: {} };
    COUNTRIES.forEach((cn) => {
      const o = G.World.sortedOf(G.LG_TOP_OF[cn]);
      if (o.length) { e.champ[cn] = o[0]; e.run[cn] = o[1] || null; }
      const cup = S.cups.cn[cn], sp = S.cups.sup[cn];
      if (cup && cup.winner) { e.cup[cn] = cup.winner; e.cupRun[cn] = cup.runner; }
      if (sp && sp.winner) { e.sup[cn] = sp.winner; e.supRun[cn] = sp.runner; }
    });
    S.cupHist = S.cupHist || [];
    S.cupHist.push(e);
    if (S.cupHist.length > 30) S.cupHist.shift();
    return e;
  };

  // نتيجة مباراة المستخدم الأخيرة لواجهة الاحتفال: { key, won } إن كانت نهائيًا حاسمًا (سوبر أو نهائي كأس)
  Cups.finalOutcome = (sum) => {
    if (!sum || (sum.comp !== 'CUP' && sum.comp !== 'SUP')) return null;
    const f = Cups.findFix(sum.fixId);
    if (!f || !f.played || (f.comp === 'CUP' && f.stage !== 'final')) return null;
    const club = sum.userSide === 'h' ? f.h : f.a;
    return { key: f.comp === 'SUP' ? 'sup' : 'cup', cn: f.cn, won: Cups.tieWinner(f) === club && sum.mins > 0, played: sum.mins > 0 };
  };

  // ---------- التحقق ----------
  Cups.validate = () => {
    const S = G.S, err = [];
    if (!S.cups) return err;
    COUNTRIES.forEach((cn) => {
      const cup = S.cups.cn[cn];
      if (!cup) { err.push('الكأس ' + cn + ' غير موجودة'); return; }
      cup.rounds.forEach((r, i) => {
        const seen = {};
        r.ties.forEach((t) => {
          if (seen[t.h] || seen[t.a] || t.h === t.a) err.push('الكأس ' + cn + ': نادٍ مكرر في ' + r.key);
          seen[t.h] = seen[t.a] = true;
          if (t.played && t.hg === t.ag && !(t.pens && t.pens.h !== t.pens.a)) err.push('الكأس ' + cn + ': تعادل بلا حسم في ' + r.key);
        });
        if (i < cup.rounds.length - 1 && !r.ties.every((t) => t.played)) err.push('الكأس ' + cn + ': دور ' + r.key + ' غير مكتمل وقد سُحب ما بعده');
      });
      if (cup.winner && cup.rounds[cup.rounds.length - 1].key !== 'final') err.push('الكأس ' + cn + ': بطل بلا نهائي');
    });
    return err;
  };

  G.migrations = G.migrations || [];
  G.migrations.push(() => { const S = G.S; if (S) S.cupHist = S.cupHist || []; });
})(window.G = window.G || {});
