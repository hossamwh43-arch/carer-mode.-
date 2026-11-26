/* live.js — محرك المباراة الكامل دقيقة بدقيقة (لمباريات فريق اللاعب فقط) */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Live = (G.Live = {});
  const GRP = G.POS_GROUP;
  const SHOT_BASE = 0.0878;

  const FRESH = 96; // طاقة بداية لاعبي الذكاء الاصطناعي ومن يدخل بديلًا
  const hashId = (str) => { let h = 5; const t = String(str); for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) >>> 0; return h; };
  const fatOf = (m, id) => (m.fat && m.fat[id] != null ? m.fat[id] : FRESH); // الحفظ القديم (مباراة جارية) لا يحوي طاقة الجميع
  const nm = (id) => (P(id) ? P(id).n : '?');
  const cname = (cid) => G.C(cid).name;
  const mmOf = (lab) => parseInt(String(lab), 10);

  // ---------- إنشاء المباراة ----------
  // fix: {id,h,a,comp}, opts: {comp:'lg'|'uc', neutral, ko:{prevH,prevA,final}}
  Live.create = (fix, opts) => {
    opts = opts || {};
    const S = G.S, u = P(S.user);
    const side = fix.h === (opts.userClub || u.club) ? 'h' : 'a'; // مباريات المنتخب: نادٍ مجسّم يضم اللاعب
    const rotStart = u.role === 'rotation' ? G.Coach.rotStart(u) : false;
    const L = { h: G.Lineup.forClub(fix.h, side === 'h' ? { role: u.role, rotStart } : { noise: 1.2 }), a: G.Lineup.forClub(fix.a, side === 'a' ? { role: u.role, rotStart } : { noise: 1.2 }) };
    const s1 = U.int(1, 3), s2 = U.int(2, 6), labs = [];
    for (let i = 1; i <= 45; i++) labs.push(String(i));
    for (let i = 1; i <= s1; i++) labs.push('45+' + i);
    for (let i = 46; i <= 90; i++) labs.push(String(i));
    for (let i = 1; i <= s2; i++) labs.push('90+' + i);
    const m = {
      id: fix.id, comp: opts.comp || 'lg', h: fix.h, a: fix.a, side, neutral: !!opts.neutral, ko: opts.ko || null,
      labs, t1: 45 + s1, reg: labs.length, total: labs.length, i: 0, et: false, done: false, pending: null, auto: false,
      xi: { h: L.h.xi.slice(), a: L.a.xi.slice() }, bench: { h: L.h.bench.slice(), a: L.a.bench.slice() },
      subs: { h: 5, a: 5 }, score: { h: 0, a: 0 }, ev: [], ps: {}, fat: {}, st: { h: { sh: 0, sot: 0 }, a: { sh: 0, sot: 0 } },
      plan: { h: [], a: [] }, R: null, p: { h: 0, a: 0 }, mom: [], uPlan: { inAt: null, outAt: null }, uState: 'out', result: null, pens: null
    };
    const touch = (id, started) => { if (!m.ps[id]) m.ps[id] = { in: started ? 0 : null, out: null, g: 0, a: 0, sh: 0, sot: 0, yel: 0, red: 0, big: 0, saves: 0, momOk: 0, momBad: 0, pas: 0, pasOk: 0, dr: 0, drOk: 0, tk: 0, tkOk: 0 }; };
    ['h', 'a'].forEach((s) => {
      m.xi[s].forEach((x) => touch(x.id, true));
      m.bench[s].forEach((id) => touch(id, false));
      const n = U.int(3, 5);
      for (let k = 0; k < n; k++) m.plan[s].push({ at: U.int(56, 86), done: false });
      m.plan[s].sort((x, y) => x.at - y.at);
    });
    // حالة اللاعب المستخدم
    const inXI = m.xi[side].some((x) => x.id === u.id), inBench = m.bench[side].indexOf(u.id) >= 0;
    m.uState = inXI ? 'start' : inBench ? 'bench' : 'out';
    // Build 24: طاقة المباراة تبدأ من «الجاهزية» (لا من اللياقة الخام) وتنفد دقيقة بدقيقة؛ لاعبو الخصم والزملاء يُنهَكون أيضًا فيُستبدل المنهَك لا عشوائي
    m.fat[u.id] = G.Stamina.startEnergy(u);
    m.xi.h.concat(m.xi.a).forEach((x) => { if (m.fat[x.id] == null) m.fat[x.id] = FRESH; });
    m.prof = G.Coach.profile(m[side]);                       // شخصية المدرب وتكتيكه (ثابتة للنادي)
    m.cn = (hashId(m.id) % 7) - 3;                           // تفاوت ثابت للمباراة (±3) كي لا يتطابق توقيت التبديل في كل مباراة
    touch(u.id, false); // سجل للاعب حتى لو كان خارج القائمة
    if (inXI) {
      // تبديل «فني» مخطَّط بحسب شخصية المدرب (يُلغى أو يؤجَّل بحسب الأداء)، وفوقه قرار الإرهاق التفاعلي (coachCheck) الذي لا يعتمد على هذا الموعد
      const pf = m.prof.plan;
      m.uPlan.outAt = U.chance(pf[0]) ? U.int(pf[1], pf[2]) : null;
    } else if (inBench) {
      const unused = Math.max(0.05, 0.25 - u.trust / 400);
      m.uPlan.inAt = U.chance(unused) ? null : u.role === 'rotation' ? U.int(50, 75) : U.int(55, 82);
    }
    m.gro = G.Growth ? G.Growth.matchCtx(u, m[side]) : { syn: 0, glow: 0, bonus: 0 }; // زخم اللاعب وأثر زملاء الطراز الرفيع
    Live.recalc(m);
    G.Moments.plan(m);
    m.ev.push({ i: 0, lab: '0', k: 'kick', s: null, txt: 'صافرة البداية: ' + cname(m.h) + ' × ' + cname(m.a) });
    return m;
  };

  // يعيد حساب قوة الفريقين ومعدّل التسديد
  Live.recalc = (m) => {
    m.R = { h: G.Lineup.ratings(m.xi.h, { fat: m.fat }), a: G.Lineup.ratings(m.xi.a, { fat: m.fat }) };
    const lam = { h: G.Lineup.lambda(m.R.h, m.R.a, m.neutral ? null : true), a: G.Lineup.lambda(m.R.a, m.R.h, m.neutral ? null : false) };
    m.lam = lam;
    ['h', 'a'].forEach((s) => { m.p[s] = (lam[s] / 0.105) / 94; });
  };

  Live.onPitch = (m, s) => m.xi[s];
  Live.userOn = (m) => m.xi[m.side].some((x) => x.id === G.S.user);
  Live.userSlot = (m) => { const x = m.xi[m.side].find((y) => y.id === G.S.user); return x ? x.slot : null; };

  const push = (m, k, s, p, p2, txt) => { const e = { i: m.i, lab: m.labs[m.i - 1] || '0', k, s, p: p || null, p2: p2 || null, txt }; m.ev.push(e); return e; };
  Live.push = push;

  Live.addGoal = (m, s, scorerId, assistId, extraTxt) => {
    m.score[s]++;
    m.ps[scorerId].g++;
    if (assistId && m.ps[assistId]) m.ps[assistId].a++;
    let t = '⚽ هدف! ' + nm(scorerId) + ' يسجّل لـ' + cname(m[s]);
    if (assistId) t += ' بتمريرة من ' + nm(assistId);
    if (extraTxt) t += ' ' + extraTxt;
    t += ' (' + m.score.h + '-' + m.score.a + ')';
    push(m, 'goal', s, scorerId, assistId, t);
    Live.recalc(m);
  };

  // تسديدة عادية لفريق s
  Live.shoot = (m, s, forcedShooter, bigForced) => {
    const o = s === 'h' ? 'a' : 'h', list = m.xi[s];
    if (!list.length) return;
    const sh = forcedShooter ? list.find((x) => x.id === forcedShooter) || list[0] : G.Match.pickScorer(list, m.gro && m.gro.bonus);
    const p = P(sh.id), big = bigForced != null ? bigForced : U.rnd() < 0.14;
    // جودة التسديد نسبةً لمتوسط فريقه (قوة الدفاع/الحارس محسوبة أصلًا داخل λ)
    let tw = 0, tf = 0;
    list.forEach((x) => { const q = P(x.id), w = G.Match.scorerWeight(q, x.slot); tw += w; tf += w * (x.slot === 'GK' ? 30 : q.a.sho); });
    const fin = sh.slot === 'GK' ? 30 : p.a.sho + (p.user && m.gro ? m.gro.bonus : 0);
    const pg = U.clamp(SHOT_BASE * (big ? 2.4 : 1) * Math.exp(0.035 * (fin - tf / Math.max(tw, 0.01))), 0.02, 0.45);
    m.st[s].sh++; m.ps[sh.id].sh++;
    // Build 29: دَين لحظات المستخدم (Moments.resolve): يُلغى هدف أصلي لاحق بدل أن يتضاعف مجموع أهداف الفريق
    let scored = U.rnd() < pg;
    if (scored && !m.inMom && m.debt && m.debt[s] >= 1) { m.debt[s] -= 1; scored = false; }
    if (scored) {
      m.st[s].sot++; m.ps[sh.id].sot++;
      const as = U.chance(0.72) ? G.Match.pickAssist(list, sh.id, m.gro && m.gro.bonus) : null;
      Live.addGoal(m, s, sh.id, as ? as.id : null);
      return 'goal';
    }
    const saved = U.rnd() < 0.30 / (1 - pg);
    if (saved) {
      m.st[s].sot++; m.ps[sh.id].sot++;
      const g = m.xi[o].find((x) => x.slot === 'GK');
      if (g) m.ps[g.id].saves++;
      if (big || sh.id === G.S.user) push(m, 'save', s, sh.id, g ? g.id : null, '🧤 ' + (g ? nm(g.id) : 'الحارس') + ' يتصدى لتسديدة ' + nm(sh.id));
      return 'save';
    }
    if (big) { m.ps[sh.id].big++; push(m, 'miss', s, sh.id, null, '😬 ' + nm(sh.id) + ' يهدر فرصة محققة لـ' + cname(m[s])); }
    else if (sh.id === G.S.user) push(m, 'miss', s, sh.id, null, '↗️ تسديدة لك تمرّ بعيدًا عن المرمى');
    return 'miss';
  };

  // ---------- التبديلات ----------
  Live.doSub = (m, s, outId, inId, slot, why) => {
    const xi = m.xi[s], idx = xi.findIndex((x) => x.id === outId);
    if (idx < 0 || m.subs[s] <= 0) return false;
    xi[idx] = { id: inId, slot: slot || xi[idx].slot };
    m.bench[s] = m.bench[s].filter((x) => x !== inId);
    m.ps[outId].out = m.i; m.ps[inId].in = m.i;
    m.subs[s]--;
    if (inId !== G.S.user) m.fat[inId] = FRESH; // البديل يدخل منتعشًا (اللاعب المستخدم يحتفظ بطاقته من بداية المباراة)
    push(m, 'sub', s, inId, outId, '🔄 ' + cname(m[s]) + ': يدخل ' + nm(inId) + ' بدلًا من ' + nm(outId) + (why ? ' (' + why + ')' : ''));
    Live.recalc(m);
    return true;
  };
  const bestBench = (m, s, grp, notGK) => m.bench[s].map(P).filter((b) => b && !m.ps[b.id].out && m.ps[b.id].in == null && (!notGK || b.pos !== 'GK') && (!grp || GRP[b.pos] === grp))
    .sort((a, b) => b.ovr - a.ovr)[0];

  // تقييم أداء اللاعب المستخدم الآن (حتمي: لا يستهلك عشوائية اللعبة؛ نسخة مبسّطة من Match.rating بلا ضجيج)
  Live.perf = (m) => {
    const ps = m.ps[G.S.user]; if (!ps) return null;
    const my = m.score[m.side], op = m.score[m.side === 'h' ? 'a' : 'h'];
    return 6.45 + (G.Match.POS_OFF[GRP[G.S.players[G.S.user].pos]] || 0) + (my > op ? 0.3 : my < op ? -0.3 : 0) + (ps.g || 0) * 0.95 + (ps.a || 0) * 0.6 + (ps.sot || 0) * 0.06 - (ps.big || 0) * 0.22 +
      (ps.momOk || 0) * 0.16 - (ps.momBad || 0) * 0.14 - (ps.yel || 0) * 0.25 - (ps.red || 0) * 1.6;
  };
  const matchImp = (m) => (m.ko && m.ko.final ? 2 : m.ko || m.comp === 'uc' ? 1 : 0);

  // اختيار بديل المدرب للاعب خارج: يفضّل مجموعة المركز نفسها (إن وُجدت) وإلا أفضل بديل متاح
  const pickSub = (m, s, slot) => {
    const same = bestBench(m, s, GRP[slot], slot !== 'GK');
    return { inn: same || bestBench(m, s, null, slot !== 'GK'), same: !!same };
  };

  Live.doSubs = (m, mm) => {
    const uid = G.S.user;
    // ---- فرق الذكاء الاصطناعي: التبديلات في مواعيد مخطَّطة لكن المُستبدَل هو الأكثر إنهاكًا (وبحسب النتيجة)، ويُسرَّع الموعد عند إنهاك حرج ----
    ['h', 'a'].forEach((s) => {
      const o = s === 'h' ? 'a' : 'h', lead = m.score[s] - m.score[o];
      m.plan[s].forEach((pl) => {
        if (pl.done || m.subs[s] <= 0) return;
        const cands = m.xi[s].filter((x) => x.slot !== 'GK' && x.id !== uid);
        if (!cands.length) return;
        const exhausted = mm >= 55 && cands.some((x) => fatOf(m, x.id) <= 32);
        if (mm < pl.at && !exhausted) return;
        pl.done = true;
        // درجة الاستحقاق: الإنهاك أولًا، وبالنتيجة: متأخر ⇒ يُخرج مدافعًا ليُدخل مهاجمًا، متقدم بعد 75 ⇒ يُخرج مهاجمًا ليُدخل مدافعًا
        let best = null, bs = -1e9, want = null;
        cands.forEach((x) => {
          const g = GRP[x.slot];
          let sc = 100 - fatOf(m, x.id);
          if (lead < 0 && mm >= 60) sc += g === 'def' ? 8 : g === 'mid' ? 3 : -4;
          if (lead > 0 && mm >= 75) sc += g === 'att' ? 8 : g === 'mid' ? 2 : -3;
          if (sc > bs) { bs = sc; best = x; }
        });
        if (lead < 0 && mm >= 60 && GRP[best.slot] !== 'att') want = 'att';
        else if (lead > 0 && mm >= 75 && GRP[best.slot] !== 'def') want = GRP[best.slot] === 'att' ? 'def' : null;
        const inn = (want && bestBench(m, s, want, true)) || bestBench(m, s, GRP[best.slot], true) || bestBench(m, s, null, true);
        if (inn) Live.doSub(m, s, best.id, inn.id, best.slot, fatOf(m, best.id) <= 40 ? 'إرهاق' : '');
      });
    });
    // ---- مدرب فريق اللاعب: يراقب طاقتك كل دقيقة وينفّذ التبديل فعلًا (لا موعدًا عشوائيًا مسبقًا) ----
    const s = m.side, u = P(uid), pl = m.uPlan;
    if (Live.userOn(m) && m.subs[s] > 0 && !m.done) {
      const slot = Live.userSlot(m), pk = pickSub(m, s, slot), E = fatOf(m, uid);
      const my = m.score[s], op = m.score[s === 'h' ? 'a' : 'h'], perf = Live.perf(m);
      let go = false, why = '';
      if (pl.req || pl.outAt === 0) { go = true; why = 'بطلب منك'; }
      else {
        const v = G.Coach.subVerdict({ energy: E, mm, diff: my - op, imp: matchImp(m), perf, grp: GRP[slot], sameGrp: pk.same, gap: pk.inn ? u.ovr - pk.inn.ovr : null,
          age: u.age, trust: u.trust, role: u.role, prof: m.prof || G.Coach.profile(m[s]), noise: m.cn || 0, subsLeft: m.subs[s], hasBench: !!pk.inn });
        if (v.sub) { go = true; why = v.why; }
        else if (pl.outAt != null && mm >= pl.outAt) {
          // تبديل فني مخطَّط: يؤجَّله المدرب مرة واحدة (حتى 10 دقائق) إن كان أداؤك ممتازًا والفريق غير متقدم بفارق هدفين، وإلا يُنفَّذ
          if (!pl.held && perf != null && perf >= 7.6 && my - op < 2 && E > 40 && mm < 86) { pl.held = true; pl.outAt = mm + 10; }
          else { go = true; why = my - op >= 2 ? 'حماية لك مع تقدّم الفريق' : 'قرار فني'; }
        }
      }
      if (go) {
        if (pk.inn && Live.doSub(m, s, uid, pk.inn.id, slot, why)) { pl.outAt = null; pl.req = false; m.uSubWhy = why; }
        else if (pl.req || pl.outAt === 0) { pl.req = false; pl.outAt = null; push(m, 'note', s, null, null, 'لا يوجد بديل مناسب على الدكة الآن'); }
        // بلا بديل أو بلا تبديلات: يبقى القرار قائمًا ويُعاد تقييمه في الدقيقة التالية (لا يُمحى كما كان)
      }
    }
    if (pl.inAt != null && mm >= pl.inAt && !Live.userOn(m) && m.ps[uid].in == null && m.subs[s] > 0) {
      pl.inAt = null;
      let bi = -1, bs = 1e9;
      m.xi[s].forEach((x, i) => {
        if (x.id === uid) return;
        const key = G.Players.posPenalty(u.pos, x.slot) * 100 + G.Lineup.eff(P(x.id), x.slot);
        if (key < bs) { bs = key; bi = i; }
      });
      if (bi >= 0) {
        const x = m.xi[s][bi];
        m.bench[s] = m.bench[s].concat([x.id]); // لضمان وجوده في ps
        m.ps[x.id] = m.ps[x.id] || { in: 0 };
        Live.doSub(m, s, x.id, uid, x.slot, 'دخول اللاعب');
      }
    }
  };
  Live.requestSub = (m) => {
    if (!Live.userOn(m) || m.subs[m.side] <= 0 || m.done) return false;
    m.uPlan.req = true; m.uPlan.outAt = 0; // يُنفَّذ في الخطوة التالية
    return true;
  };

  // ---------- البطاقات والإصابات ----------
  const FOUL_W = { CB: 1.4, CDM: 1.8, CM: 1.2, LB: 1.2, RB: 1.2, ST: 0.8, LW: 0.7, RW: 0.7, CAM: 0.7, GK: 0.15 };
  Live.sendOff = (m, s, id, why) => {
    m.xi[s] = m.xi[s].filter((x) => x.id !== id);
    m.ps[id].out = m.i;
    Live.recalc(m);
  };
  Live.cards = (m, s) => {
    if (m.xi[s].length < 8) return;
    if (U.rnd() < 0.0175) {
      const x = U.wpick(m.xi[s], (y) => (FOUL_W[y.slot] || 1) * (y.id === G.S.user ? 1.5 - Math.min(1, P(y.id).a.iq / 100) : 1));
      const ps = m.ps[x.id];
      ps.yel++;
      if (ps.yel >= 2) {
        ps.red++;
        push(m, 'red', s, x.id, null, '🟨🟥 إنذار ثانٍ ثم طرد ' + nm(x.id) + ' (' + cname(m[s]) + ')');
        Live.sendOff(m, s, x.id);
      } else push(m, 'yellow', s, x.id, null, '🟨 إنذار للاعب ' + nm(x.id) + ' (' + cname(m[s]) + ')');
    }
    if (U.rnd() < 0.0005) {
      const x = U.pick(m.xi[s].filter((y) => y.slot !== 'GK').length ? m.xi[s].filter((y) => y.slot !== 'GK') : m.xi[s]);
      m.ps[x.id].red++; m.ps[x.id].direct = true;
      push(m, 'red', s, x.id, null, '🟥 طرد مباشر للاعب ' + nm(x.id) + ' (' + cname(m[s]) + ')');
      Live.sendOff(m, s, x.id);
    }
  };
  Live.injuries = (m, s) => {
    const uid = G.S.user;
    for (const x of m.xi[s].slice()) {
      // Build 29: معدل واقعي (≈2.4٪ بالمباراة، يزيد بالعمر والإرهاق) — انظر injury.js
      const pr = G.Injury.perMin(P(x.id), m.fat[x.id]);
      if (U.rnd() < pr) {
        const wk = G.Match.injWeeks();
        m.ps[x.id].inj = wk;
        push(m, 'inj', s, x.id, null, '🚑 إصابة ' + nm(x.id) + ' (' + cname(m[s]) + ')');
        const slot = x.slot;
        const inn = m.subs[s] > 0 ? (bestBench(m, s, GRP[slot], slot !== 'GK') || bestBench(m, s, null, slot !== 'GK')) : null;
        if (inn) Live.doSub(m, s, x.id, inn.id, slot, 'إصابة'); else Live.sendOff(m, s, x.id);
      }
    }
  };

  // ---------- خطوة دقيقة ----------
  Live.step = (m) => {
    if (m.done || m.pending) return;
    m.i++;
    const lab = m.labs[m.i - 1], mm = mmOf(lab);
    const uid = G.S.user;
    // إرهاق اللاعبين: يستنزف طاقة كل من في الملعب (السمة البدنية + المركز + الأساس البدني للاعبك) ويتعافى بالراحة بعد المباراة لا فيها
    ['h', 'a'].forEach((sd) => m.xi[sd].forEach((x) => {
      const p = P(x.id); if (!p) return;
      const d = x.id === uid ? G.Stamina.drain(p, x.slot, m.et) * (1 + (m.prof ? m.prof.press : 0) * 0.01 * (GRP[x.slot] === 'mid' || GRP[x.slot] === 'att' ? 1 : 0)) : G.Stamina.drainAI(p, x.slot, m.et);
      m.fat[x.id] = Math.max(0, fatOf(m, x.id) - d);
    }));
    if (Live.userOn(m) && m.fat[uid] <= 30) m.uLow = (m.uLow || 0) + 1; // دقائق قضاها منهَكًا (لتخفيف عقوبة الثقة)
    m.uTired = (m.uLow || 0) >= 8;
    Live.doSubs(m, mm);
    // اللحظات التفاعلية
    if (m.mom.length && m.mom[0] <= m.i) {
      m.mom.shift();
      if (Live.userOn(m)) {
        const ctx = G.Moments.make(m);
        if (ctx) { ctx.lab = lab; m.pending = ctx; if (m.auto) G.Moments.resolve(m, ctx, G.Moments.auto(ctx).id); }
      }
    }
    // التسديدات
    ['h', 'a'].forEach((s) => {
      const o = s === 'h' ? 'a' : 'h';
      let pr = m.p[s] * (m.et ? 0.33 * 94 / 30 : 1);
      const deficit = m.score[o] - m.score[s];
      if (mm >= 60) pr *= deficit > 0 ? 1 + 0.07 * Math.min(deficit, 3) : deficit < 0 ? 1 - 0.04 * Math.min(-deficit, 3) : 1;
      if (s === m.side && Live.userOn(m) && m.uState !== 'out') pr *= 0.92;
      if (U.rnd() < pr) Live.shoot(m, s);
      Live.cards(m, s);
      Live.injuries(m, s);
    });
    // نهاية الشوط / المباراة
    if (m.i === m.t1) push(m, 'ht', null, null, null, '⏸️ نهاية الشوط الأول: ' + m.score.h + '-' + m.score.a);
    if (m.i === m.reg && !m.et) {
      const k = m.ko;
      if (k && k.prevH + m.score.h === k.prevA + m.score.a) {
        m.et = true;
        for (let i = 91; i <= 120; i++) m.labs.push(String(i));
        m.total = m.labs.length;
        push(m, 'et', null, null, null, '⏱️ التعادل في المجموع — وقت إضافي (30 دقيقة)');
        return;
      }
      Live.end(m);
    } else if (m.et && m.i === m.total) Live.end(m);
  };

  Live.end = (m) => {
    m.done = true;
    const k = m.ko;
    if (k && k.prevH + m.score.h === k.prevA + m.score.a) {
      m.pens = G.Match.shootout(m.R.h.gk, m.R.a.gk);
      push(m, 'pens', null, null, null, '🎯 ركلات الترجيح: ' + m.pens.h + '-' + m.pens.a);
    }
    push(m, 'ft', null, null, null, '🏁 نهاية المباراة: ' + cname(m.h) + ' ' + m.score.h + '-' + m.score.a + ' ' + cname(m.a));
    Live.finalize(m);
  };

  Live.simulate = (m) => {
    m.auto = true;
    let guard = 0;
    while (!m.done && guard++ < 400) {
      if (m.pending) G.Moments.resolve(m, m.pending, G.Moments.auto(m.pending).id);
      Live.step(m);
    }
    return m;
  };

  // ---------- التقييمات والنتيجة النهائية ----------
  Live.finalize = (m) => {
    const res = { h: m.score.h > m.score.a ? 'w' : m.score.h < m.score.a ? 'l' : 'd' };
    res.a = res.h === 'w' ? 'l' : res.h === 'l' ? 'w' : 'd';
    const out = { ratings: {}, mins: {}, motm: null };
    let best = -1;
    ['h', 'a'].forEach((s) => {
      const conc = m.score[s === 'h' ? 'a' : 'h'];
      Object.keys(m.ps).forEach((id) => {
        const p = P(id), ps = m.ps[id];
        if (!p || ps.in == null && !m.xi[s].some((x) => x.id === id) && !ps.red) return;
        const belongs = (p.club === m[s]) || (p.user && s === m.side); // لاعب المنتخب ناديه الحقيقي مختلف
        if (!belongs) return;
        const start = ps.in || 0, end = ps.out != null ? ps.out : m.total;
        const mins = Math.max(0, end - start);
        if (mins <= 0 && ps.in == null) return;
        const r = G.Match.rating(p.pos, { mins, res: res[s], g: ps.g, a: ps.a, sot: ps.sot, big: ps.big, saves: ps.saves, cs: conc === 0, conc, yel: ps.yel, red: ps.red, momOk: ps.momOk, momBad: ps.momBad, syn: p.user && m.gro ? m.gro.syn : 0 });
        out.ratings[id] = r; out.mins[id] = mins;
        if (r > best) { best = r; out.motm = id; }
      });
    });
    // إحصائيات تفصيلية للاعب المستخدم (تمريرات/مراوغات) تتناسب مع الدقائق والسمات
    const u = P(G.S.user), up = m.ps[u.id], um = out.mins[u.id] || 0;
    if (um > 0) {
      const grp = GRP[u.pos], inv = grp === 'mid' ? 1.0 : grp === 'att' ? 0.7 : grp === 'def' ? 0.8 : 0.45;
      const tries = Math.round((um / 90) * (28 * inv) * (0.8 + U.rnd() * 0.4));
      const ok = Math.round(tries * U.clamp(0.55 + u.a.pas * 0.004 + (up.pasOk / Math.max(1, up.pas) - 0.5) * 0.1, 0.5, 0.93));
      up.pas += tries; up.pasOk += ok;
      const dtries = Math.round((um / 90) * (grp === 'att' ? 7 : grp === 'mid' ? 4 : 2) * (0.7 + U.rnd() * 0.6));
      up.dr += dtries; up.drOk += Math.round(dtries * U.clamp(0.35 + u.a.dri * 0.004, 0.3, 0.8));
    }
    out.res = res; out.score = { h: m.score.h, a: m.score.a }; out.pens = m.pens; out.et = m.et;
    out.userSide = m.side;
    m.result = out;
  };

  // ---------- ملخص الأحداث للواجهة ----------
  Live.timeline = (m) => m.ev;
})(window.G = window.G || {});
