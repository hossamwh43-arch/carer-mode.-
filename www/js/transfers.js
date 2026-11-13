/* transfers.js — سوق الانتقالات والعقود: انتقالات الذكاء الاصطناعي، عروض اللاعب، التفاوض، الإعارات، التجديد */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const T = (G.Transfers = {});
  const Inbox = (G.Inbox = {});

  // ---------- صندوق الرسائل ----------
  Inbox.add = (kind, title, text, data) => {
    const S = G.S;
    S.inbox = S.inbox || [];
    S.inbox.unshift({ id: (S.msgId = (S.msgId || 0) + 1), kind, title, text, data: data || null, season: S.season, week: S.week, read: false });
    if (S.inbox.length > 120) S.inbox.length = 120;
  };
  Inbox.unread = () => (G.S.inbox || []).filter((m) => !m.read).length;

  const logTransfer = (t) => { const S = G.S; S.tlog = S.tlog || []; S.tlog.unshift(t); if (S.tlog.length > 60) S.tlog.length = 60; };

  // ---------- أندية السوق ----------
  T.market = () => {
    const S = G.S, set = {};
    Object.keys(S.clubs).forEach((id) => { const c = S.clubs[id]; if (c.liga && !c.light) set[id] = true; }); // أندية الدرجة الثانية الخفيفة (بلا لاعبين) خارج السوق
    (S.uclTeams || []).forEach((id) => { set[id] = true; });
    return Object.keys(set);
  };
  T.wageBill = (club) => G.Players.wageBill(club);
  T.wageRoom = (club) => club.wcap - T.wageBill(club);
  T.clubQ = (club) => 0.62 * club.rep + 31;

  // ---------- تنفيذ الانتقال ----------
  T.execute = (p, toId, fee, wage, years, opts) => {
    opts = opts || {};
    const S = G.S, from = p.club ? C(p.club) : null, to = C(toId);
    if (from) { from.squad = from.squad.filter((x) => x !== p.id); if (!opts.loan) from.tb += fee; }
    if (!opts.loan) to.tb -= fee;
    S.free = (S.free || []).filter((x) => x !== p.id);
    to.squad.push(p.id); p.fy = 0;
    const oldClub = p.club;
    p.club = toId;
    if (opts.loan) { p.parent = oldClub; p.parentPays = true; }
    else { p.parent = null; p.parentPays = false; p.ct = { y: years, w: wage }; }
    p.num = G.Players.freeNumber(toId, p.pos, p.user ? p.num : 0);
    if (p.user) {
      p.hist.push({ season: S.season, club: toId, from: oldClub, type: opts.loan ? 'loan' : fee > 0 ? 'transfer' : 'free', fee, wage });
      if (G.Media) G.safe(() => G.Media.onTransfer(oldClub, toId, fee, !!opts.loan), 'media');
    }
    G.Players.refresh(p);
    if (p.user && G.World) G.World.syncUser(); // انتقال لدوري آخر أثناء الموسم
    if (p.user && G.Cups) G.Cups.prepareUser(); // تشكيلات خصوم الكأس/السوبر لنادي المستخدم الجديد
    if (!opts.loan && (fee > 0 || p.ovr >= 78 || p.user)) logTransfer({ season: S.season, p: p.id, name: p.n, from: oldClub, to: toId, fee, user: !!p.user, ovr: p.ovr });
  };

  // ---------- احتياجات النادي (للذكاء الاصطناعي) ----------
  T.needs = (club) => {
    const q = T.clubQ(club), out = [];
    const sq = club.squad.map(P).filter((p) => p && !p.user);
    Object.keys(G.SQUAD_TEMPLATE).forEach((pos) => {
      const list = sq.filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr);
      const need = G.SQUAD_TEMPLATE[pos];
      if (list.length < need) out.push({ pos, urg: 3 + (need - list.length) });
      else if (list[0].ovr < q - 3) out.push({ pos, urg: 2 });
      else if (list[0].age >= 33) out.push({ pos, urg: 1.5 });
      else if (list.length > 1 && list[1].ovr < q - 12) out.push({ pos, urg: 1 });
    });
    return out.sort((a, b) => b.urg - a.urg);
  };

  const isKey = (club, p) => {
    const sq = club.squad.map(P).filter((x) => x && !x.user && x.pos === p.pos).sort((a, b) => b.ovr - a.ovr);
    const slots = p.pos === 'CB' ? 2 : p.pos === 'CM' ? 2 : p.pos === 'GK' ? 1 : p.pos === 'ST' ? 1 : 1;
    return sq.indexOf(p) >= 0 && sq.indexOf(p) < slots;
  };
  const feeFor = (p) => Math.round(p.val * (p.ct && p.ct.y <= 1 ? 0.85 : 1) / 25000) * 25000;

  // هل يقبل النادي البائع؟
  T.sellerAccepts = (seller, buyer, p, fee) => {
    if (!seller) return true;
    const left = seller.squad.map(P).filter((x) => x && !x.user && x.pos === p.pos && x.id !== p.id).length;
    if (left < G.SQUAD_TEMPLATE[p.pos] - 1) return false;
    if (isKey(seller, p)) return fee >= p.val * 1.35 && seller.rep <= buyer.rep + 10;
    return fee >= p.val * 0.98;
  };

  const canAffordWage = (club, wage, replacing) => T.wageRoom(club) + (replacing || 0) >= wage;

  // ---------- نافذة انتقالات الذكاء الاصطناعي ----------
  T.aiWindow = (kind) => {
    const S = G.S, ids = T.market();
    const rounds = kind === 'winter' ? 1 : 3;
    const done = {};
    const poolBy = () => {
      const by = {};
      ids.forEach((cid) => C(cid).squad.forEach((pid) => { const p = P(pid); if (p && !p.user) (by[p.pos] = by[p.pos] || []).push(p); }));
      (S.free || []).forEach((pid) => { const p = P(pid); if (p) (by[p.pos] = by[p.pos] || []).push(p); });
      Object.keys(by).forEach((k) => by[k].sort((a, b) => b.ovr - a.ovr));
      return by;
    };
    let moves = 0;
    for (let r = 0; r < rounds; r++) {
      const by = poolBy();
      U.shuffle(ids.slice()).forEach((cid) => {
        const club = C(cid), cap = club.rep >= 80 ? 3 : 2;
        if ((done[cid] || 0) >= cap) return;
        const needs = T.needs(club);
        if (!needs.length) return;
        const nd = needs[0], q = T.clubQ(club);
        const list = (by[nd.pos] || []).filter((p) => {
          if (p.club === cid) return false;
          if (p.age > (p.club ? 34 : 36)) return false;
          if (p.ovr < q - (nd.urg >= 3 ? 8 : 1.5)) return false;
          if (p.ovr > q + 7) return false;
          const fee = p.club ? feeFor(p) : 0;
          return fee <= club.tb && canAffordWage(club, G.Players.wageFor(p) * 1.0);
        });
        const scored = list.map((p) => ({ p, sc: p.ovr + (p.age <= 23 ? (p.pot - p.ovr) * 0.3 : 0) - (p.age >= 31 ? (p.age - 30) * 1.5 : 0) - (p.club ? feeFor(p) / Math.max(club.tb, 1e6) * 2 : 0) + U.rnd() * 2 }))
          .sort((a, b) => b.sc - a.sc).slice(0, 3);
        for (const { p } of scored) {
          const seller = p.club ? C(p.club) : null;
          if (seller && !G.Transfers.market().includes(seller.id)) continue;
          const fee = p.club ? Math.round(feeFor(p) * (1 + U.rnd() * 0.2) / 25000) * 25000 : 0;
          if (fee > club.tb) continue;
          if (!T.sellerAccepts(seller, club, p, fee)) continue;
          const wage = U.clamp(U.roundTo(G.Players.wageFor(p) * (1.0 + U.rnd() * 0.2), 500), 800, 600000);
          if (!canAffordWage(club, wage)) continue;
          const playerWants = !seller || club.rep >= seller.rep - 6 || wage >= p.ct.w * 1.2;
          if (!playerWants) continue;
          T.execute(p, cid, fee, wage, U.int(2, 5));
          done[cid] = (done[cid] || 0) + 1; moves++;
          // نحدّث القوائم الداخلية لتجنّب شراء نفس اللاعب مرتين
          Object.keys(by).forEach((k) => { by[k] = by[k].filter((x) => x.id !== p.id); });
          break;
        }
      });
    }
    ids.forEach((cid) => T.fixSquad(C(cid)));
    return moves;
  };

  // ---------- تنظيم حجم التشكيلة ----------
  // v4: الأكاديميات كانت تُخرج شبّانًا بتقييم يلحق (q-14) وإمكانات حتى 95 لكل نادٍ كبير ⇒ تضخّم نجوم العالم (87 نجمًا ≥85 صاروا ~370 بعد 20 موسمًا)
  // والأكاديمية الكبرى تُنتج أقوى الشباب فتتعمق الهيمنة. الآن: تقييم الشاب يتبع عمره بأثر أكاديمية صغير، والإمكانات بتوزيع ذيله ثقيل
  // (القليلون فقط ينضجون نجومًا) ومعايَرة بالقياس ليبقى عدد النجوم مستقرًا عبر المواسم (tests/engine/world_health.js).
  T.REGEN = { mu: 70.5, sd: 8, acad: 0.12, soft: 86, softK: 0.5, rem: 1.0, maxPot: 94 };
  const growLeft = (age) => { let s = 0; for (let a = age; a < 24; a++) s += Math.max(0, G.Training.ageDelta(a) || 0); return s; };
  // نُولّد «ذروة اللاعب» أولًا من توزيع يشبه توزيع عالم اللعبة نفسه (متوسط ~70، النجوم ≥85 ≈ 3% و≥90 أقل من 1%) ثم تقييمه الحالي =
  // الذروة − النمو المتبقي حتى 24 (فمن سينضج نجمًا يبدأ شابًّا واعدًا فعلًا). بهذا يبقى توزيع العالم مستقرًّا عبر العقود لا يتضخم ولا يتآكل.
  T.youthSpec = (club) => {
    const R = T.REGEN, age = U.int(17, 19), ac = (club.rep - 70) * R.acad;
    let peak = R.mu + ac + U.gauss() * R.sd;
    if (peak > R.soft) peak = R.soft + (peak - R.soft) * R.softK;
    peak = U.clamp(Math.round(peak), 45, R.maxPot);
    const ovr = U.clamp(Math.round(peak - R.rem * growLeft(age) + U.gauss() * 3), 38, 80);
    return { age, ovr, pot: Math.max(ovr + 2, Math.min(R.maxPot, peak + U.int(-1, 3))) };
  };
  T.addYouth = (club, pos) => {
    const S = G.S;
    const sp = T.youthSpec(club);
    const group = G.COUNTRY_GROUP[club.country] || 'iber';
    const p = G.Players.gen({ pos, ovr: sp.ovr, age: sp.age, nat: (G.COUNTRY_NAT || {})[club.country] || club.country.slice(0, 2), group, club: club.id });
    p.pot = sp.pot; G.Players.refresh(p);
    p.ct = { y: U.int(2, 4), w: G.Players.wageFor(p) };
    S.players[p.id] = p;
    club.squad.push(p.id);
    p.num = G.Players.freeNumber(club.id, pos);
    return p;
  };
  T.release = (club, p, retire) => {
    const S = G.S;
    club.squad = club.squad.filter((x) => x !== p.id);
    p.club = null; p.parent = null; p.fy = 0;
    if (retire) { delete S.players[p.id]; return; }
    S.free = S.free || []; S.free.push(p.id);
  };
  T.fixSquad = (club) => {
    const cfg = G.CONFIG, S = G.S;
    if (club.light) return;
    // نقص المراكز: توقيع أحرار أو أكاديمية
    Object.keys(G.SQUAD_TEMPLATE).forEach((pos) => {
      const have = club.squad.map(P).filter((p) => p && p.pos === pos && !p.user).length;
      for (let i = have; i < G.SQUAD_TEMPLATE[pos]; i++) {
        const q = T.clubQ(club);
        const fa = (S.free || []).map(P).filter((p) => p && p.pos === pos && p.age <= 34 && p.ovr >= q - 12 && canAffordWage(club, G.Players.wageFor(p))).sort((a, b) => b.ovr - a.ovr)[0];
        if (fa) T.execute(fa, club.id, 0, U.roundTo(G.Players.wageFor(fa), 500), U.int(1, 3));
        else T.addYouth(club, pos);
      }
    });
    // فائض: نحرر الأضعف
    while (club.squad.filter((id) => !P(id).user || true).length > cfg.maxSquad) {
      const cand = club.squad.map(P).filter((p) => p && !p.user && !p.parentPays)
        .filter((p) => club.squad.map(P).filter((x) => x.pos === p.pos).length > G.SQUAD_TEMPLATE[p.pos])
        .sort((a, b) => a.ovr - b.ovr)[0];
      if (!cand) break;
      T.release(club, cand, cand.age >= 35);
    }
    club.wcap = Math.max(club.wcap, Math.round(T.wageBill(club) * 1.03));
  };

  // ---------- العقود في نهاية الموسم ----------
  // يُستدعى بعد زيادة العمر؛ يعيد true إن انتهى عقد اللاعب المستخدم
  T.rollContracts = () => {
    const S = G.S;
    let userExpired = false;
    Object.keys(S.players).forEach((pid) => {
      const p = S.players[pid];
      if (!p) return;
      if (p.user && p.parentPays && p.loanBuy && T.optionDecision(p)) return; // فُعّل بند الشراء: لاعب دائم في النادي المعير
      if (p.parentPays && p.parent) { // عودة المعار
        const loanClub = C(p.club), home = C(p.parent);
        if (loanClub) loanClub.squad = loanClub.squad.filter((x) => x !== p.id);
        if (home && home.squad.indexOf(p.id) < 0) home.squad.push(p.id);
        p.club = p.parent; p.parent = null; p.parentPays = false;
        if (p.user) Inbox.add('contract', 'انتهت فترة الإعارة', 'عدتَ إلى ' + C(p.club).name + ' بعد انتهاء الإعارة.');
        p.num = G.Players.freeNumber(p.club, p.pos, p.user ? p.num : 0);
      }
      if (!p.club) return;
      p.ct.y -= 1;
      if (p.ct.y > 0) return;
      if (p.user) { userExpired = true; return; }
      const club = C(p.club);
      const keep = p.age <= 34 && U.rnd() < 0.7;
      if (keep) {
        const wage = U.clamp(U.roundTo(G.Players.wageFor(p) * (0.95 + U.rnd() * 0.2), 500), 800, 600000);
        if (canAffordWage(club, wage, p.ct.w)) { p.ct = { y: U.int(2, 4), w: wage }; G.Players.refresh(p); return; }
      }
      const retire = p.age >= 35 && U.rnd() < 0.6;
      T.release(club, p, retire);
    });
    return userExpired;
  };

  T.retireOld = () => {
    const S = G.S;
    Object.keys(S.players).forEach((pid) => {
      const p = S.players[pid];
      if (!p || p.user) return;
      const r = p.age >= 38 ? 0.9 : p.age >= 37 ? 0.7 : p.age >= 36 ? 0.45 : p.age >= 35 ? 0.2 : p.age >= 34 ? 0.07 : 0;
      if (r && U.rnd() < r) {
        const club = p.club ? C(p.club) : null;
        if (club) club.squad = club.squad.filter((x) => x !== pid);
        S.free = (S.free || []).filter((x) => x !== pid);
        delete S.players[pid];
      }
    });
  };

  T.seasonFinance = () => {
    Object.keys(G.S.clubs).forEach((id) => {
      const c = C(id), base = G.Players.budgetFor(c.rep);
      c.tb = Math.min(c.tb + base * 0.35, base * 3);
      c.wcap = Math.round(Math.max(c.wcap * 1.03, T.wageBill(c) * 1.05));
    });
  };

  // ---------- عروض اللاعب المستخدم ----------
  T.userClubOk = (clubId) => G.C(clubId).liga || G.CONFIG.allowForeignDestination;
  const AG = () => G.Agent;
  const clamp = U.clamp;
  const attacker = (pos) => pos === 'ST' || pos === 'LW' || pos === 'RW' || pos === 'CAM';

  T.interest = (p, club) => {
    const inc = club.squad.map(P).filter((x) => x && !x.user && x.pos === p.pos).sort((a, b) => b.ovr - a.ovr);
    const best = inc.length ? inc[0].ovr : 40;
    const gap = p.ovr + (p.age <= 21 ? (p.pot - p.ovr) * 0.3 : 0) - best;
    return gap;
  };

  // أداء آخر موسمين (متوسط التقييم مرجّحًا بالمشاركات) + أداء المباريات الأخيرة
  let perfMemo = null;
  T.perf = (p) => {
    const k = p.id + '|' + G.S.season + '|' + G.S.week + '|' + (p.form ? p.form.length : 0) + '|' + (p.car ? p.car.length : 0);
    if (perfMemo && perfMemo.k === k) return perfMemo.v;
    let w = 0, s = 0;
    (p.car || []).slice(-2).forEach((r) => { [r.lg, r.uc].forEach((x) => { if (x && x.apps > 0 && x.avg) { w += x.apps; s += x.avg * x.apps; } }); });
    if (p.form && p.form.length >= 3) { s += G.Coach.formAvg(p) * 6; w += 6; }
    const v = w >= 6 ? { avg: s / w, apps: w } : null;
    perfMemo = { k, v };
    return v;
  };
  // الإنجازات: ألقاب وجوائز فردية (حد أقصى 12 نقطة)
  T.achv = (p) => {
    const tr = p.trophies || {}, won = (p.tlog || []).filter((t) => !t.r).length || ((tr.liga || 0) + (tr.ucl || 0));
    return clamp(won * 1.5 + (p.awards || []).length * 1.5 + (p.hattricks || 0) * 0.2, 0, 12);
  };

  // لماذا يريد هذا النادي اللاعب؟ (درجة 0–100 وأسباب مقروءة): المستوى، الحاجة في المركز، العمر والإمكانات، الأداء الأخير، السمعة والإنجازات
  T.suitor = (club, p) => {
    const reasons = [], Ag = AG();
    let sc = 38;
    const lvl = p.ovr - T.clubQ(club);
    sc += clamp(lvl * 2.2, -16, 18);
    if (lvl >= 3) reasons.push('مستواك أعلى من مستوى فريقهم');
    const nd = T.needs(club).find((n) => n.pos === p.pos);
    if (nd) { sc += nd.urg >= 3 ? 14 : nd.urg >= 2 ? 9 : nd.urg >= 1.5 ? 5 : 3; reasons.push('يحتاجون مركز ' + G.POS_AR[p.pos]); }
    sc += clamp(T.interest(p, club) * 1.2, -8, 10);
    if (p.age <= 21 && p.pot - p.ovr >= 8) { sc += 8; reasons.push('موهبة شابة بإمكانات عالية'); }
    else if (p.age <= 24 && p.pot - p.ovr >= 5) sc += 4;
    else if (p.age >= 32) sc -= 10;
    else if (p.age >= 30) sc -= 4;
    const pf = T.perf(p);
    if (pf) { sc += clamp((pf.avg - 6.6) * 10, -8, 12); if (pf.avg >= 7.1) reasons.push('أداء مميز في المواسم الأخيرة'); }
    const ach = T.achv(p);
    sc += ach; if (ach >= 6) reasons.push('سمعة وإنجازات كبيرة');
    sc += clamp(((G.Media ? G.Media.pop() : 0) - 35) / 8, -3, 7);
    if (Ag) { sc += clamp(Ag.exOf(club.id) / 10, -8, 6); if (Ag.rel().loyal < 30 && club.rep >= 80) sc -= 4; }
    return { score: clamp(Math.round(sc), 0, 100), reasons: reasons.slice(0, 3), need: nd ? nd.urg : 0, lvl };
  };
  // كل أندية السوق مرتّبة بدرجة اهتمامها (للوكيل وصفحة «الأندية المهتمة»)
  T.suitors = () => {
    const p = P(G.S.user);
    return T.market().filter((cid) => cid !== p.club && T.userClubOk(cid)).map((cid) => {
      const club = C(cid), sc = T.suitor(club, p);
      const afford = Math.round(p.val * 1.05) <= club.tb && canAffordWage(club, G.Players.wageFor(p) * 1.1);
      return { club: cid, score: sc.score, reasons: sc.reasons, need: sc.need, afford, gap: T.interest(p, club), lvl: sc.lvl };
    }).sort((a, b) => b.score - a.score);
  };
  T.interested = () => T.suitors().map((x) => {
    const p = P(G.S.user), club = C(x.club);
    const level = !x.afford || x.gap < -3 || p.ovr < T.clubQ(club) - 9 ? 0 : x.score >= 62 ? 3 : x.score >= 48 ? 2 : x.score >= 38 ? 1 : 0;
    return Object.assign({}, x, { level });
  }).filter((x) => x.level > 0);

  // موقف النادي الحالي من بيع اللاعب: السعر الذي يطلبه (نسبة من القيمة السوقية) حسب دوره وعقده وعلاقته بالنادي ورد النادي على طلب الانتقال
  T.sellerView = (p, fee) => {
    const S = G.S, tr = S.treq || {}, rel = S.rel ? S.rel.club : 50;
    if (p.parentPays) return { ok: false, soft: false, code: 'loan', ask: 0, why: 'اللاعب معار حاليًا — لا يمكن بيعه' };
    let mult = p.role === 'starter' ? 1.25 : (p.role === 'bench' || p.role === 'out') ? 0.95 : 1.0;
    if (p.ct.y <= 1) mult = Math.min(mult, 1.0);
    else if (p.ct.y >= 4) mult += 0.05;
    mult += (rel - 50) / 400;
    if (tr.status === 'accepted') mult = Math.min(mult, 0.9);
    else if (tr.status === 'cond') mult = Math.min(mult, tr.minMult || 1.15);
    else if (tr.status === 'refused') mult = Math.max(mult, 1.5);
    const ask = Math.round(p.val * mult / 25000) * 25000, ok = fee >= ask, soft = !ok && fee >= ask * 0.9;
    return { ok, soft, code: ok ? 'ok' : soft ? 'soft' : 'no', ask, why: ok ? 'النادي الحالي يوافق على العرض' : soft ? 'النادي الحالي يطلب ' + U.money(ask) + ' — قد تفشل الصفقة إن لم يتفق الناديان' : 'النادي الحالي يرفض العرض ويطلب نحو ' + U.money(ask) + (tr.status === 'refused' ? ' (لا يريد بيعك)' : '') };
  };
  T.stance = (p, fee) => { const v = T.sellerView(p, fee); return { ok: v.ok || v.soft, soft: v.soft, ask: v.ask, why: v.why }; };
  T.restance = () => { const p = P(G.S.user); (G.S.offers || []).forEach((o) => { if (o.type === 'transfer') o.stance = T.stance(p, o.fee); }); };

  // حزمة العقد الافتراضية التي يعرضها النادي: مكافأة توقيع ومكافأتا مشاركة وهدف ودور في الفريق
  T.pack = (club, p, wage, years) => {
    const ev = G.Coach.evaluateAt(p, club.id);
    const role = ev.role === 'starter' ? 'starter' : ev.role === 'rotation' ? 'rotation' : 'prospect';
    const bonus = U.roundTo(wage * U.int(0, 6), 5000), ab = U.roundTo(wage * 0.05, 500), gb = U.roundTo(wage * (attacker(p.pos) ? 0.08 : 0.03), 500);
    return { bonus, ab, gb, role, nat: role, base: G.Agent.wEq({ wage, years, bonus, ab, gb }, p.pos), ev };
  };

  T.makeOffer = (club, p, sc) => {
    const S = G.S;
    sc = sc || T.suitor(club, p);
    const mult = 0.95 + U.rnd() * 0.35 + (sc.score - 50) / 500;
    const fee = Math.round(p.val * mult / 25000) * 25000;
    if (fee > club.tb) return null;
    const cur = C(p.club);
    const wage = clamp(U.roundTo(G.Players.wageFor(p) * (1.1 + U.rnd() * 0.4) * Math.pow(club.rep / Math.max(55, cur.rep), 0.8), 500), 800, 600000);
    if (!canAffordWage(club, wage)) return null;
    const years = p.age >= 31 ? U.int(1, 2) : p.age <= 22 ? U.int(4, 5) : U.int(3, 4);
    const pk = T.pack(club, p, wage, years);
    const o = {
      id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'transfer', club: club.id, fee, wage, years, bonus: pk.bonus, ab: pk.ab, gb: pk.gb, role: pk.role, nat: pk.nat,
      maxWage: Math.round(pk.base * (1.2 + U.rnd() * 0.15) / 500) * 500, score: sc.score, why: sc.reasons, rivals: 0,
      tries: 0, week: S.week, season: S.season, expires: S.week + 2, status: 'new', stance: T.stance(p, fee)
    };
    S.offers.push(o);
    return o;
  };

  // عدد الأندية المنافسة لكل عرض (عروض حيّة أخرى من أندية مختلفة)
  T.refreshRivals = () => {
    const live = (G.S.offers || []).filter((o) => o.type === 'transfer' && o.status !== 'withdrawn');
    live.forEach((o) => { o.rivals = live.length - 1; });
  };
  T.clubNeedsOut = (o) => { const club = C(o.club); return club.tb < o.fee || !canAffordWage(club, o.wage); };

  // يولّد عروضًا جديدة من أندية مهتمة (في نافذة الانتقالات فقط)
  T.generateOffers = (boost) => {
    const S = G.S, p = P(S.user), Ag = AG();
    if (!S.window || !S.window.open || p.parentPays) return 0;
    const exist = {};
    S.offers.forEach((o) => { exist[o.club] = true; });
    let made = 0;
    const ab = Ag.boost().offers;
    T.market().forEach((cid) => {
      if (cid === p.club || exist[cid] || !T.userClubOk(cid) || Ag.cooling(cid)) return;
      const club = C(cid), gap = T.interest(p, club);
      if (gap < -3 || p.ovr < T.clubQ(club) - 9) return;
      const sc = T.suitor(club, p);
      let pr = clamp(0.05 + (sc.score - 34) * 0.021, 0, 0.6) * (boost || 1) * ab;
      if (S.transferRequest) pr *= 1.4;
      if (G.Media) pr *= G.Media.offerBoost();
      pr *= G.diff().offers;
      if (U.rnd() < pr && T.makeOffer(club, p, sc)) made++;
    });
    if (made) T.refreshRivals();
    return made;
  };

  // اطلب من نادٍ معيّن تقديم عرض رسمي
  T.ask = (cid) => {
    const S = G.S, p = P(S.user);
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    if (S.offers.some((o) => o.club === cid && o.type === 'transfer')) return { ok: false, msg: 'لديك عرض بالفعل من هذا النادي' };
    if (AG().cooling(cid)) return { ok: false, msg: 'النادي لا يريد التفاوض معك حاليًا بعد ما جرى' };
    const it = T.interested().find((x) => x.club === cid);
    if (!it) return { ok: false, msg: 'هذا النادي غير مهتم بك حاليًا' };
    const o = T.makeOffer(C(cid), p);
    if (!o) return { ok: false, msg: 'النادي لا يستطيع تحمّل صفقتك حاليًا' };
    if (it.level === 1 && U.rnd() < 0.5) { S.offers = S.offers.filter((x) => x !== o); return { ok: false, msg: 'النادي اعتذر: لن يقدّم عرضًا الآن' }; }
    T.refreshRivals();
    Inbox.add('offer', 'عرض رسمي من ' + C(cid).name, 'قدّم النادي عرضًا بعد استفسارك: ' + U.money(o.fee) + ' كرسوم انتقال.', { offer: o.id });
    return { ok: true, offer: o };
  };

  // ---------- طلب الانتقال الرسمي: للنادي ردّ حقيقي ----------
  T.clubReply = (p) => {
    const S = G.S, rel = S.rel ? S.rel.club : 50, club = C(p.club);
    if (p.role === 'bench' || p.role === 'out' || p.ct.y <= 1) return { status: 'accepted', why: 'النادي لا يعوّل عليك كثيرًا ولن يقف في طريق رحيلك' };
    if (S.rel && S.rel.broken === S.season) return { status: 'accepted', why: 'أخلّ النادي بوعده ويقرّ بحقك في الرحيل' };
    if (p.role === 'starter' && rel >= 55 && p.ct.y >= 3 && club.rep >= 70) return { status: 'refused', why: 'النادي يعتبرك ركيزة ولا يفكر ببيعك' };
    return { status: 'cond', why: 'النادي مستعد لبيعك بسعر مرتفع فقط (115٪ من قيمتك السوقية)', minMult: 1.15 };
  };
  T.requestTransfer = () => {
    const S = G.S, p = P(S.user), Ag = AG();
    Ag.state();
    if (p.parentPays) return { ok: false, msg: 'لا يمكنك طلب الانتقال أثناء الإعارة' };
    const cur = S.treq.status;
    if (cur === 'accepted' || cur === 'cond') return { ok: false, msg: 'قدّمتَ طلبًا بالفعل' };
    if (cur === 'refused' && (S.treq.until || 0) > Ag.tick()) return { ok: false, msg: 'رفض النادي طلبك — أعد المحاولة بعد ' + (S.treq.until - Ag.tick()) + ' أسابيع' };
    const rep = T.clubReply(p), broken = S.rel.broken === S.season, quiet = Ag.has() ? 0.7 : 1;
    p.trust = clamp(p.trust - (broken ? 0 : Ag.has() ? 5 : 8), 0, 100);
    S.rel.club = clamp(S.rel.club - (rep.status === 'refused' ? 7 : 10) * (broken ? 0.3 : 1) * quiet, 0, 100);
    S.rel.loyal = clamp(S.rel.loyal - (broken ? 1 : 5), 0, 100);
    S.treq = { status: rep.status, season: S.season, week: S.week, why: rep.why, minMult: rep.minMult || null, until: Ag.tick() + 6 };
    S.transferRequest = rep.status !== 'refused';
    T.restance();
    Inbox.add('coach', 'طلب الانتقال', 'تقدمتَ بطلب انتقال رسمي. ' + rep.why + '.');
    if (Ag.has()) Ag.say(rep.status === 'refused' ? 'النادي رفض الطلب. سأواصل الحديث معهم، ولا تثر الأمر علنًا.' : 'قدّمنا الطلب بهدوء، وأبلغتُ الأندية المهتمة.', false);
    if (G.Press) G.safe(() => G.Press.onUserRequest({ p: p.id, status: rep.status }), 'press');
    return { ok: true, status: rep.status, msg: rep.why };
  };
  T.withdrawRequest = () => {
    const S = G.S, p = P(S.user);
    if (!S.treq || S.treq.status === 'none') return { ok: false, msg: 'لا يوجد طلب' };
    S.treq = { status: 'none' }; S.transferRequest = false;
    p.trust = clamp(p.trust + 2, 0, 100); S.rel.club = clamp(S.rel.club + 4, 0, 100);
    T.restance();
    Inbox.add('coach', 'سحب الطلب', 'سحبتَ طلب الانتقال وقال المدرب إنه يقدّر التزامك.');
    return { ok: true };
  };

  // ---------- التفاوض: الراتب · المدة · مكافأة التوقيع · مكافأتا المشاركة والهدف · الدور ----------
  T.maxTries = () => AG().maxTries();
  // أعلى راتب أسبوعي يقبله النادي مع بقية عناصر الحزمة (سقف الحزمة كلها ثابت: رفع المكافآت يخفض الراتب الممكن)
  T.ceilWage = (o, pkg) => {
    const A = AG(), cap = o.maxWage * (1 + A.boost().wage);
    return Math.max(0, Math.floor((cap - (A.wEq(pkg, P(G.S.user).pos) - pkg.wage)) / 500) * 500);
  };
  T.collapse = (o, reason, msg) => {
    const S = G.S;
    S.offers = S.offers.filter((x) => x !== o);
    AG().hurt(o.club, reason === 'fee' ? -6 : -4); AG().cool(o.club, 8);
    Inbox.add('offer', 'فشلت الصفقة', msg);
    AG().say(msg, false);
    if (G.Press) G.safe(() => G.Press.onUserDeal({ p: S.user, club: o.club, reason }), 'press');
    return { ok: false, collapsed: true, msg };
  };

  T.negotiate = (o, wage, years, terms) => {
    const S = G.S, p = P(S.user), A = AG(), isOffer = !!o.club;
    o.tries = (o.tries || 0) + 1;
    years = clamp(years, 1, p.age >= 31 ? 2 : 5);
    const tm = Object.assign({ bonus: o.bonus || 0, ab: o.ab || 0, gb: o.gb || 0, role: o.role || 'none' }, terms || {});
    const ask = { wage, years, bonus: tm.bonus, ab: tm.ab, gb: tm.gb };
    const cur = A.wEq(o, p.pos), want = A.wEq(ask, p.pos), cap = o.maxWage * (1 + A.boost().wage);
    const nat = A.ROLE_RANK[o.nat || o.role || 'none'] || 0, req = A.ROLE_RANK[tm.role] || 0;
    const gap = isOffer ? Math.max(0, req - Math.max(nat, 1)) : 0, capR = cap * (1 - 0.06 * gap);
    const keep = () => { o.wage = ask.wage; o.years = years; o.bonus = ask.bonus; o.ab = ask.ab; o.gb = ask.gb; if (isOffer) o.role = tm.role; };
    const pkg = () => ({ wage: o.wage, years: o.years, bonus: o.bonus, ab: o.ab, gb: o.gb, role: o.role });
    if (gap >= 2) return { res: 'reject', msg: 'لا يستطيع النادي ضمان مركز أساسي لك الآن — اطلب دور التناوب أو اقبل بلا ضمانات', wage: o.wage };
    if (want <= cur * 1.04) { keep(); return Object.assign({ res: 'accept' }, pkg()); }
    if (want <= capR) {
      if (U.rnd() < 0.55 + A.skill()) { keep(); return Object.assign({ res: 'accept' }, pkg()); }
      const mid = (a, b, st) => Math.round((a + b) / 2 / st) * st;
      return { res: 'counter', wage: mid(wage, o.wage, 500), years, bonus: mid(ask.bonus, o.bonus || 0, 5000), ab: mid(ask.ab, o.ab || 0, 500), gb: mid(ask.gb, o.gb || 0, 500), role: tm.role, msg: 'النادي يقترح حزمة وسطًا' };
    }
    // مطالب مبالغ فيها: قد ينسحب النادي فورًا (اختلاف الطلبات المالية)، وإلا ترتفع كلفة الإصرار
    if (isOffer && want > capR * 1.2 && U.rnd() < 0.5) return Object.assign({ res: 'withdraw' }, T.collapse(o, 'demands', C(o.club).name + ' انسحب من المفاوضات غاضبًا من مطالبك المالية'));
    if (o.tries >= T.maxTries()) {
      if (isOffer) return Object.assign({ res: 'withdraw' }, T.collapse(o, 'demands', C(o.club).name + ' سحب العرض بعد إصرارك على شروط مرتفعة'));
      o.status = 'withdrawn'; return { res: 'withdraw', msg: 'النادي سحب العرض بعد إصرارك على شروط مرتفعة' };
    }
    return { res: 'reject', wage: Math.min(wage, Math.max(T.ceilWage(o, ask), 800)), msg: 'الحزمة أعلى من قدرة النادي — أقصى راتب مع هذه المكافآت ' + U.money(Math.max(T.ceilWage(o, ask), 800)) + ' أسبوعيًا' };
  };

  // بعد التوقيع: المكافآت في العقد، المحاسبة، الوعد بالدور، العلاقات والأخبار
  T.signed = (p, o, info) => {
    const S = G.S, A = AG(), club = C(o.club);
    p.ct.ab = o.ab || 0; p.ct.gb = o.gb || 0;
    const bonus = o.bonus || 0, comm = A.commission(info.wage, bonus);
    A.state(); S.fin.signing += bonus; S.fin.agent += comm;
    if (A.has()) S.ag.fees = (S.ag.fees || 0) + comm;
    const role = o.role && o.role !== 'none' ? o.role : null;
    p.trust = role === 'starter' ? 55 : role === 'rotation' ? 50 : 45; p.role = 'bench';
    A.setPromise(p, o.club, role);
    const extra = (bonus ? ' + مكافأة توقيع ' + U.money(bonus) : '') + (comm ? ' (عمولة الوكيل ' + U.money(comm) + ')' : '');
    if (info.kind === 'renew' || info.from === o.club) {
      S.rel.club = clamp(S.rel.club + 5, 0, 100); S.rel.loyal = clamp(S.rel.loyal + 4, 0, 100);
      Inbox.add('contract', 'تمديد العقد', 'وقّعتَ عقدًا جديدًا مع ' + club.name + ' براتب ' + U.money(info.wage) + ' أسبوعيًا لمدة ' + info.years + ' سنوات' + extra + '.');
      return;
    }
    Inbox.add('news', info.kind === 'free' ? 'توقيع حر' : 'انتقال رسمي!', (info.kind === 'free' ? 'وقّعتَ مع ' + club.name + ' كلاعب حر' : 'انضممتَ إلى ' + club.name + ' مقابل ' + U.money(info.fee)) + ' براتب ' + U.money(info.wage) + ' أسبوعيًا لمدة ' + info.years + ' سنوات' + extra + (role ? '. وعدك النادي بدور «' + A.ROLE_AR[role] + '»' : '') + '.');
    A.onMove({ from: info.from, to: o.club, kind: info.kind, byRequest: info.byReq, fee: info.fee, wage: info.wage, role: role || 'none', score: o.score || 50, tenure: info.tenure });
  };

  const tenureAt = (p, clubId) => { const h = (p.hist || []).filter((x) => x.club === clubId && x.type !== 'loan').pop(); return h ? G.S.season - h.season : 0; };

  T.acceptOffer = (offerId, wage, years) => {
    const S = G.S, p = P(S.user), o = S.offers.find((x) => x.id === offerId), A = AG();
    if (!o) return { ok: false, msg: 'العرض غير موجود' };
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    const club = C(o.club);
    wage = wage || o.wage; years = years || o.years;
    const from = p.club, byReq = !!S.treq && (S.treq.status === 'accepted' || S.treq.status === 'cond'), tenure = tenureAt(p, from);
    if (o.type === 'transfer') {
      if (p.inj >= 4) return { ok: false, msg: 'لن تجتاز الفحص الطبي وأنت مصاب (' + p.inj + ' أسابيع) — تعافَ أولًا' };
      const sv = T.sellerView(p, o.fee);
      if (!sv.ok && !sv.soft) return { ok: false, msg: sv.why };
      let fee = o.fee;
      if (!sv.ok) { // البائع يطلب أكثر مما عُرض: على النادي المشتري أن يقرّر الدفع أو الانسحاب
        if (club.tb >= sv.ask && U.rnd() < 0.5 + (o.score || 50) / 200) { fee = sv.ask; o.fee = fee; }
        else return T.collapse(o, 'fee', 'فشلت الصفقة: طلب ' + C(from).name + ' ' + U.money(sv.ask) + ' ولم يوافق ' + club.name + ' على دفع هذا المبلغ');
      }
      if (club.tb < fee) return { ok: false, msg: 'ميزانية النادي لا تكفي الآن' };
      if (!canAffordWage(club, wage)) return { ok: false, msg: 'النادي لا يستطيع تحمّل هذا الراتب' };
      T.execute(p, o.club, fee, wage, years);
      T.signed(p, o, { kind: 'transfer', from, fee, wage, years, byReq, tenure });
      S.offers = []; S.reoffer = []; S.transferRequest = false;
      return { ok: true, from, to: o.club, fee };
    }
    if (o.type === 'loan') {
      T.execute(p, o.club, 0, 0, 0, { loan: true });
      p.trust = 55; p.loanBuy = o.buy ? { club: o.club, fee: o.buy } : null;
      A.setPromise(p, o.club, o.role === 'starter' ? 'starter' : 'rotation');
      Inbox.add('news', 'إعارة', 'انتقلتَ معارًا إلى ' + club.name + ' حتى نهاية الموسم لتنال دقائق لعب أكثر' + (o.buy ? '. بند شراء: ' + U.money(o.buy) : '') + '.');
      A.onMove({ from, to: o.club, kind: 'loan', fee: 0, wage: p.ct.w, role: o.role, score: o.score || 50 });
      S.offers = []; S.reoffer = []; S.lreq = null; // المعار لا تُعرض عليه صفقات بيع: ملكيته للنادي الأصلي حتى نهاية الموسم
      return { ok: true, from, to: o.club };
    }
    if (o.type === 'free') {
      if (!canAffordWage(club, wage, o.club === p.club ? p.ct.w : 0)) return { ok: false, msg: 'ميزانية رواتب النادي لا تسمح بهذا الراتب' };
      T.execute(p, o.club, 0, wage, years);
      T.signed(p, o, { kind: 'free', from, fee: 0, wage, years, byReq: false, tenure });
      S.offers = []; S.reoffer = []; S.userExpired = false;
      return { ok: true, to: o.club };
    }
    return { ok: false, msg: 'نوع عرض غير معروف' };
  };

  // رفض العرض: قد يعود النادي بعد أسابيع بعرض محسّن (فرصة للتفاوض مجددًا)
  T.rejectOffer = (offerId) => {
    const S = G.S, o = S.offers.find((x) => x.id === offerId), A = AG();
    S.offers = S.offers.filter((x) => x.id !== offerId);
    if (!o || o.type !== 'transfer') return;
    A.cool(o.club, 3);
    if (A.has() && o.agent) S.ag.rel = clamp(S.ag.rel - 1, 30, 100);
    if ((o.score || 50) >= 48 && U.rnd() < 0.5) { S.reoffer = (S.reoffer || []).concat([{ club: o.club, due: A.tick() + U.int(3, 5), s: S.season }]).slice(-6); }
    T.refreshRivals();
  };

  // رفع العرض بالضغط (ينافس نادٍ آخر): يعطي فرصة لرفع الراتب
  T.pressure = (offerId) => {
    const S = G.S, o = S.offers.find((x) => x.id === offerId);
    if (!o || o.pressed) return { ok: false, msg: 'لا يمكن الضغط الآن' };
    o.pressed = true;
    const others = S.offers.filter((x) => x.id !== offerId).length;
    if (U.rnd() < 0.35 + others * 0.15) { o.wage = Math.round(o.wage * 1.1 / 500) * 500; o.maxWage = Math.round(o.maxWage * 1.08 / 500) * 500; return { ok: true, msg: 'النادي رفع عرضه إلى ' + U.money(o.wage) + ' أسبوعيًا بسبب المنافسة' }; }
    return { ok: false, msg: 'النادي لم يغيّر عرضه' };
  };

  // ---------- الإعارات ----------
  // رد النادي الأم على طلب الإعارة
  T.loanView = (p) => {
    const rel = G.S.rel ? G.S.rel.club : 50;
    if (p.parentPays) return { ok: false, why: 'أنت معار بالفعل' };
    if (p.role === 'bench' || p.role === 'out') return { ok: true, why: 'يوافق النادي: لا مكان لك في التشكيلة حاليًا' };
    if (p.age <= 23 && p.pot - p.ovr >= 6) return { ok: true, why: 'يوافق النادي لتطوير موهبة شابة بدقائق لعب أكثر' };
    if (p.role === 'rotation' && rel < 60) return { ok: true, why: 'يوافق النادي بشرط العودة نهاية الموسم' };
    return { ok: false, why: p.role === 'starter' ? 'يعتبرك النادي أساسيًا ويرفض إعارتك' : 'رفض النادي طلب الإعارة' };
  };
  T.generateLoanOffers = (force) => {
    const S = G.S, p = P(S.user);
    if (!S.window || !S.window.open || p.parentPays) return 0;
    if (!force && p.role !== 'bench' && p.role !== 'out') return 0;
    if (p.age > 29 || (p.age > 25 && !(p.role === 'bench' || p.role === 'out' || force))) return 0;
    if (!force && !T.loanView(p).ok) return 0;
    const home = C(p.club);
    let made = 0;
    Object.keys(S.clubs).forEach((cid) => {
      if (cid === p.club || S.offers.some((o) => o.club === cid && o.type === 'loan')) return;
      const club = C(cid);
      if (made >= 4 || !club.liga || club.light || club.squad.length < 14) return; // حدّ أقصى 4 عروض إعارة
      if (club.rep > home.rep + 6) return;
      const ev = G.Coach.evaluateAt(p, cid), gap = ev.diff;
      if (ev.role !== 'starter' && ev.role !== 'rotation') return;
      if (U.rnd() < (force ? 0.6 : 0.35)) {
        const buy = club.rep >= home.rep - 8 && club.tb >= p.val && U.rnd() < 0.5 ? Math.round(p.val * (1.0 + U.rnd() * 0.3) / 25000) * 25000 : 0;
        S.offers.push({ id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'loan', club: cid, fee: 0, wage: p.ct.w, years: 0, tries: 0, week: S.week, expires: S.week + 3, status: 'new', stance: { ok: true, why: '' }, role: ev.role === 'starter' ? 'starter' : 'rotation', buy, note: ev.role === 'starter' ? 'دور أساسي متوقع' : 'منافسة على مكان أساسي' });
        made++;
      }
    });
    if (made) Inbox.add('offer', 'عروض إعارة', 'وصلتك ' + made + ' عروض إعارة لتنال دقائق لعب أكثر.');
    return made;
  };
  T.requestLoan = () => {
    const S = G.S, p = P(S.user);
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    const v = T.loanView(p);
    if (!v.ok) {
      p.trust = clamp(p.trust - 2, 0, 100); AG().state(); S.rel.club = clamp(S.rel.club - 3, 0, 100);
      Inbox.add('coach', 'رفض الإعارة', v.why + '.');
      return { ok: false, msg: v.why };
    }
    const n = T.generateLoanOffers(true);
    S.lreq = { season: S.season, week: S.week, why: v.why };
    return n ? { ok: true, n, msg: v.why } : { ok: false, msg: 'وافق النادي لكن لا توجد أندية مناسبة للإعارة حاليًا' };
  };
  // نهاية الموسم: هل يفعّل النادي المعير بند الشراء؟
  T.optionDecision = (p) => {
    const lb = p.loanBuy, S = G.S, club = C(lb.club), home = C(p.parent), row = (p.car || [])[p.car.length - 1];
    const apps = row && row.loan ? ((row.lg ? row.lg.apps : 0) + (row.uc ? row.uc.apps : 0)) : 0;
    const avg = apps ? (((row.lg ? row.lg.avg * row.lg.apps : 0) + (row.uc ? row.uc.avg * row.uc.apps : 0)) / apps) : 0;
    const good = apps >= 8 && avg >= 6.8;
    if (good && club && home && club.tb >= lb.fee && U.rnd() < 0.75) {
      const wage = clamp(U.roundTo(G.Players.wageFor(p) * 1.1, 500), 800, 600000), years = p.age >= 31 ? 2 : U.int(3, 4);
      home.tb += lb.fee; club.tb -= lb.fee;
      p.hist.push({ season: S.season, club: lb.club, from: p.parent, type: 'transfer', fee: lb.fee, wage });
      p.parent = null; p.parentPays = false; p.ct = { y: years, w: wage, ab: 0, gb: 0 }; p.loanBuy = null;
      logTransfer({ season: S.season, p: p.id, name: p.n, from: home.id, to: club.id, fee: lb.fee, user: true, ovr: p.ovr });
      Inbox.add('news', 'فُعّل بند الشراء!', club.name + ' فعّل بند الشراء (' + U.money(lb.fee) + ') بعد موسمك المميز وأصبحتَ لاعبًا دائمًا فيه براتب ' + U.money(wage) + ' أسبوعيًا.');
      AG().state(); S.rel.club = 62; AG().hurt(home.id, 3);
      return true;
    }
    Inbox.add('news', 'عودة من الإعارة', club ? club.name + ' لم يفعّل بند الشراء (' + U.money(lb.fee) + ') وستعود إلى ' + (home ? home.name : 'ناديك') + '.' : 'عدتَ من الإعارة.');
    p.loanBuy = null;
    return false;
  };

  // ---------- التجديد ----------
  T.renewalTerms = () => {
    const p = P(G.S.user);
    const rl = G.S.rel || { club: 50, loyal: 50 };
    const bonus = 1 + (p.trust - 50) / 300 + (p.role === 'starter' ? 0.15 : p.role === 'out' ? -0.1 : 0) + (G.Coach.formAvg(p) - 6.5) * 0.04 + (rl.club - 50) / 700 + (rl.loyal - 50) / 800;
    const wage = U.clamp(U.roundTo(G.Players.wageFor(p) * bonus, 500), 800, 600000);
    return { wage, years: p.age >= 31 ? 2 : 4, maxWage: Math.round(wage * 1.2 / 500) * 500, tries: 0 };
  };
  T.canRenew = () => { const p = P(G.S.user); return !p.parentPays && p.ct.y <= 2; };
  T.renew = (terms, wage, years) => {
    const p = P(G.S.user), club = C(p.club);
    if (!canAffordWage(club, wage, p.ct.w)) {
      // النادي يتمسك بلاعبه: إن كان الراتب ضمن سعر السوق (≤ 115% مما يستحقه) يوسّع سقف رواتبه بدل أن يرفض بعد أن وافق في التفاوض
      if (wage <= G.Players.wageFor(p) * 1.15) club.wcap = Math.max(club.wcap, T.wageBill(club) - p.ct.w + wage);
      else return { ok: false, msg: 'ميزانية رواتب النادي لا تسمح بهذا الراتب' };
    }
    p.ct = { y: years, w: wage, ab: p.ct.ab || 0, gb: p.ct.gb || 0 };
    p.trust = U.clamp(p.trust + 3, 0, 100);
    G.S.userExpired = false;
    G.Players.refresh(p);
    const A = AG(), comm = A.commission(wage, 0);
    A.state(); G.S.rel.club = clamp(G.S.rel.club + 5, 0, 100); G.S.rel.loyal = clamp(G.S.rel.loyal + 4, 0, 100);
    if (comm) { G.S.fin.agent += comm; G.S.ag.fees = (G.S.ag.fees || 0) + comm; }
    Inbox.add('contract', 'تجديد العقد', 'جدّدتَ عقدك مع ' + club.name + ' براتب ' + U.money(wage) + ' أسبوعيًا لمدة ' + years + ' سنوات' + (comm ? ' (عمولة الوكيل ' + U.money(comm) + ')' : '') + '.');
    return { ok: true };
  };

  // خيار أخير عند انتهاء العقد: سنة واحدة بأجر مخفّض مع النادي الحالي (يضمن ألّا تتوقف اللعبة)
  T.emergencyContract = () => {
    const S = G.S, p = P(S.user);
    if (!S.userExpired) return { ok: false, msg: 'عقدك ساريّ' };
    const club = C(p.club);
    const wage = Math.max(800, U.roundTo(G.Players.wageFor(p) * 0.6, 500));
    club.wcap = Math.max(club.wcap, T.wageBill(club) - p.ct.w + wage);
    p.ct = { y: 1, w: wage };
    S.userExpired = false; S.offers = [];
    G.Players.refresh(p);
    Inbox.add('contract', 'عقد قصير', 'وافق ' + club.name + ' على تمديد عقدك سنة واحدة براتب مخفّض (' + U.money(wage) + ' أسبوعيًا).');
    return { ok: true, wage };
  };

  // ---------- انتهاء عقد اللاعب: عروض اللاعب الحر ----------
  T.freeAgentOffers = () => {
    const S = G.S, p = P(S.user);
    S.offers = [];
    const orig = p.club;
    const old = C(orig);
    // النادي الأصلي يعرض التجديد
    const t = T.renewalTerms();
    const room = T.wageRoom(old) + p.ct.w;
    const rw = Math.min(t.wage, Math.floor(room / 500) * 500);
    if (rw >= G.Players.wageFor(p) * 0.6) {
      S.offers.push({ id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'free', club: orig, fee: 0, wage: rw, years: t.years, maxWage: Math.min(t.maxWage, Math.floor(room / 500) * 500), tries: 0, status: 'new', stance: { ok: true, why: '' }, note: 'النادي الحالي يعرض التجديد' });
    }
    T.market().forEach((cid) => {
      if (cid === orig || !T.userClubOk(cid)) return;
      const club = C(cid), gap = T.interest(p, club);
      if (gap < -2 || p.ovr < T.clubQ(club) - 8) return;
      const wage = U.clamp(U.roundTo(G.Players.wageFor(p) * (1.05 + U.rnd() * 0.45), 500), 800, 600000);
      if (!canAffordWage(club, wage) || U.rnd() > 0.5 + gap * 0.04) return;
      const yrs = p.age >= 31 ? 2 : U.int(3, 5), sc = T.suitor(club, p), pk = T.pack(club, p, wage, yrs);
      S.offers.push({ id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'free', club: cid, fee: 0, wage, years: yrs, bonus: pk.bonus, ab: pk.ab, gb: pk.gb, role: pk.role, nat: pk.nat, score: sc.score, why: sc.reasons, maxWage: Math.round(pk.base * 1.2 / 500) * 500, tries: 0, status: 'new', stance: { ok: true, why: '' }, note: 'عقد حر بلا رسوم' });
    });
    return S.offers.length;
  };
  // ---------- المتابعة الأسبوعية: انسحاب العروض، العودة بعرض محسّن، موعد الحسم، العلاقات ----------
  // يوقّع النادي بديلًا حرًّا في المركز (سبب منطقي لسحب عرضه للاعب)
  T.fillNeed = (club, pos) => {
    const S = G.S, q = T.clubQ(club);
    const fa = (S.free || []).map(P).filter((p) => p && p.pos === pos && p.age <= 34 && p.ovr >= q - 10 && canAffordWage(club, G.Players.wageFor(p))).sort((a, b) => b.ovr - a.ovr)[0];
    if (!fa) return false;
    T.execute(fa, club.id, 0, U.roundTo(G.Players.wageFor(fa), 500), U.int(1, 3));
    return true;
  };
  T.weekly = () => {
    const S = G.S, p = P(S.user), Ag = AG();
    Ag.weekly();
    if (!S.window || !S.window.open || p.parentPays) return;
    const kept = [];
    (S.offers || []).forEach((o) => {
      if (o.type !== 'transfer' || o.status === 'withdrawn') { kept.push(o); return; }
      const club = C(o.club);
      let why = null;
      if (club.tb < o.fee) why = 'لم تعد ميزانيته تكفي رسومك';
      else if (!canAffordWage(club, o.wage)) why = 'ارتفعت فاتورة رواتبه ولم يعد يتحمّل راتبك';
      else if (T.needs(club).some((n) => n.pos === p.pos) && U.rnd() < 0.12 && T.fillNeed(club, p.pos)) why = 'تعاقد مع لاعب في مركزك';
      if (why) { Inbox.add('offer', 'سحب عرض', club.name + ' سحب عرضه: ' + why + '.'); Ag.say(club.name + ' انسحب: ' + why + '.', false); }
      else kept.push(o);
    });
    S.offers = kept;
    // أندية رفضتَ عرضها: قد تعود بعرض أفضل
    const keepRe = [];
    (S.reoffer || []).forEach((r) => {
      if (r.s !== S.season) return;
      if (r.due > Ag.tick() || Ag.cooling(r.club)) { keepRe.push(r); return; }
      const club = C(r.club);
      if (!club || r.club === p.club || S.offers.some((o) => o.club === r.club && o.type === 'transfer')) return;
      const o = T.makeOffer(club, p);
      if (o) {
        o.wage = U.roundTo(o.wage * 1.07, 500); o.bonus = U.roundTo((o.bonus || 0) * 1.1, 5000); o.maxWage = Math.round(o.maxWage * 1.06 / 500) * 500; o.reoffer = true;
        Inbox.add('offer', 'عرض محسّن من ' + club.name, 'عاد ' + club.name + ' بعرض أفضل بعد رفضك السابق.', { offer: o.id });
        Ag.say(club.name + ' عاد بعرض محسّن بعد رفضنا السابق.', false);
      }
    });
    S.reoffer = keepRe;
    T.restance(); T.refreshRivals();
    // موعد الحسم: آخر أسبوع في النافذة
    const last = S.window.kind === 'winter' ? S.week === G.Season.WINTER_CLOSE - 1 : S.window.kind === 'summer' && S.phase === 'summer' && S.preLeft === 0;
    if (last && !S.window.dl) {
      S.window.dl = true;
      S.offers.forEach((o) => { if (o.type !== 'free') o.final = true; });
      G.safe(() => T.aiWindow('winter'), 'dl');
      Inbox.add('news', 'يوم الحسم في السوق', 'آخر فرصة قبل إغلاق النافذة' + (S.offers.length ? ': لديك ' + S.offers.length + ' عرضًا قائمًا — اقبل أو ارفض الآن.' : '.'));
      Ag.say('بقي أسبوع واحد على إغلاق السوق. ما لم نحسم الآن فسيضيع.', false);
    }
  };
})(window.G = window.G || {});
