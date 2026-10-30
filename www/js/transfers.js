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
    to.squad.push(p.id);
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
  T.addYouth = (club, pos) => {
    const S = G.S;
    const q = T.clubQ(club);
    const group = G.COUNTRY_GROUP[club.country] || 'iber';
    const p = G.Players.gen({ pos, ovr: U.clamp(Math.round(q - 14 + U.gauss() * 3), 45, 70), age: U.int(17, 19), nat: (G.COUNTRY_NAT || {})[club.country] || club.country.slice(0, 2), group, club: club.id });
    p.pot = Math.min(95, Math.max(p.pot, p.ovr + U.int(4, 14)));
    p.ct = { y: U.int(2, 4), w: G.Players.wageFor(p) };
    S.players[p.id] = p;
    club.squad.push(p.id);
    p.num = G.Players.freeNumber(club.id, pos);
    return p;
  };
  T.release = (club, p, retire) => {
    const S = G.S;
    club.squad = club.squad.filter((x) => x !== p.id);
    p.club = null; p.parent = null;
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

  T.interest = (p, club) => {
    const inc = club.squad.map(P).filter((x) => x && !x.user && x.pos === p.pos).sort((a, b) => b.ovr - a.ovr);
    const best = inc.length ? inc[0].ovr : 40;
    const gap = p.ovr + (p.age <= 21 ? (p.pot - p.ovr) * 0.3 : 0) - best;
    return gap;
  };

  T.stance = (p, fee) => {
    // موقف النادي الحالي من بيع اللاعب
    const S = G.S;
    if (p.parentPays) return { ok: false, why: 'اللاعب معار حاليًا — لا يمكن بيعه' };
    const role = p.role;
    const willing = fee >= p.val * 1.25 || (fee >= p.val && (role === 'bench' || role === 'out' || p.ct.y <= 1)) || (S.transferRequest && fee >= p.val * 0.9);
    return { ok: willing, why: willing ? 'النادي الحالي يوافق على العرض' : 'النادي الحالي يرفض العرض ويعتبرك لاعبًا مهمًا' };
  };

  T.makeOffer = (club, p, force) => {
    const S = G.S;
    const mult = 0.95 + U.rnd() * 0.35;
    const fee = Math.round(p.val * mult / 25000) * 25000;
    if (fee > club.tb) return null;
    const cur = C(p.club);
    const wage = U.clamp(U.roundTo(G.Players.wageFor(p) * (1.1 + U.rnd() * 0.4) * Math.pow(club.rep / Math.max(55, cur.rep), 0.8), 500), 800, 600000);
    if (!canAffordWage(club, wage)) return null;
    const years = p.age >= 31 ? U.int(1, 2) : p.age <= 22 ? U.int(4, 5) : U.int(3, 4);
    const o = {
      id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'transfer', club: club.id, fee, wage, years, maxWage: Math.round(wage * (1.2 + U.rnd() * 0.15) / 500) * 500,
      tries: 0, week: S.week, season: S.season, expires: S.week + 2, status: 'new', stance: T.stance(p, fee)
    };
    S.offers.push(o);
    return o;
  };

  // يولّد عروضًا جديدة من أندية مهتمة (في نافذة الانتقالات فقط)
  T.generateOffers = (boost) => {
    const S = G.S, p = P(S.user);
    if (!S.window || !S.window.open || p.parentPays) return 0;
    const exist = {};
    S.offers.forEach((o) => { exist[o.club] = true; });
    let made = 0;
    const form = G.Coach.formAvg(p);
    T.market().forEach((cid) => {
      if (cid === p.club || exist[cid] || !T.userClubOk(cid)) return;
      const club = C(cid), gap = T.interest(p, club);
      if (gap < -3 || p.ovr < T.clubQ(club) - 9) return;
      let pr = U.clamp(0.10 + gap * 0.04 + (form - 6.5) * 0.08 + (p.age <= 22 ? 0.04 : 0), 0, 0.55) * (boost || 1);
      if (S.transferRequest) pr *= 1.4;
      if (G.Media) pr *= G.Media.offerBoost();
      pr *= G.diff().offers;
      if (U.rnd() < pr && T.makeOffer(club, p)) made++;
    });
    return made;
  };

  // الأندية المهتمة (للعرض في صفحة السوق)
  T.interested = () => {
    const p = P(G.S.user);
    return T.market().filter((cid) => cid !== p.club && T.userClubOk(cid)).map((cid) => {
      const club = C(cid), gap = T.interest(p, club);
      const aff = Math.round(p.val * 1.05) <= club.tb && canAffordWage(club, G.Players.wageFor(p) * 1.1);
      const lvl = !aff ? 0 : gap >= 4 ? 3 : gap >= 0 ? 2 : gap >= -3 ? 1 : 0;
      return { club: cid, gap, level: lvl };
    }).filter((x) => x.level > 0).sort((a, b) => b.level - a.level || C(b.club).rep - C(a.club).rep);
  };

  // اطلب من نادٍ معيّن تقديم عرض رسمي
  T.ask = (cid) => {
    const S = G.S, p = P(S.user);
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    if (S.offers.some((o) => o.club === cid && o.type === 'transfer')) return { ok: false, msg: 'لديك عرض بالفعل من هذا النادي' };
    const it = T.interested().find((x) => x.club === cid);
    if (!it) return { ok: false, msg: 'هذا النادي غير مهتم بك حاليًا' };
    const o = T.makeOffer(C(cid), p);
    if (!o) return { ok: false, msg: 'النادي لا يستطيع تحمّل صفقتك حاليًا' };
    if (it.level === 1 && U.rnd() < 0.5) { S.offers = S.offers.filter((x) => x !== o); return { ok: false, msg: 'النادي اعتذر: لن يقدّم عرضًا الآن' }; }
    Inbox.add('offer', 'عرض رسمي من ' + C(cid).name, 'قدّم النادي عرضًا بعد استفسارك: ' + U.money(o.fee) + ' كرسوم انتقال.', { offer: o.id });
    return { ok: true, offer: o };
  };

  // طلب الانتقال: يفتح باب العروض لكنه يضعف ثقة المدرب
  T.requestTransfer = () => {
    const S = G.S, p = P(S.user);
    if (S.transferRequest) return { ok: false, msg: 'قدّمتَ طلبًا بالفعل' };
    S.transferRequest = true;
    p.trust = U.clamp(p.trust - 8, 0, 100);
    Inbox.add('coach', 'طلب الانتقال', 'تقدمتَ بطلب انتقال. المدرب غير راضٍ لكنه لن يعرقل رحيلك إذا جاء عرض مناسب.');
    return { ok: true };
  };

  // ---------- التفاوض على الراتب والمدة ----------
  T.negotiate = (offerOrTerms, wage, years) => {
    const o = offerOrTerms;
    o.tries = (o.tries || 0) + 1;
    const maxYears = P(G.S.user).age >= 31 ? 2 : 5;
    years = U.clamp(years, 1, maxYears);
    if (wage <= o.wage * 1.04) { o.wage = Math.max(wage, o.wage); o.years = years; return { res: 'accept', wage: o.wage, years }; }
    if (wage <= o.maxWage) {
      if (U.rnd() < 0.55) { o.wage = wage; o.years = years; return { res: 'accept', wage, years }; }
      const mid = Math.round((wage + o.wage) / 2 / 500) * 500;
      return { res: 'counter', wage: mid, years, msg: 'النادي يقترح راتبًا وسطًا' };
    }
    if (o.tries >= 3) { o.status = 'withdrawn'; return { res: 'withdraw', msg: 'النادي سحب العرض بعد إصرارك على شروط مرتفعة' }; }
    return { res: 'reject', wage: o.maxWage, msg: 'الراتب أعلى من قدرة النادي — الحد الأقصى ' + U.money(o.maxWage) + ' أسبوعيًا' };
  };

  T.acceptOffer = (offerId, wage, years) => {
    const S = G.S, p = P(S.user), o = S.offers.find((x) => x.id === offerId);
    if (!o) return { ok: false, msg: 'العرض غير موجود' };
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    const club = C(o.club);
    if (o.type === 'transfer' && !o.stance.ok) return { ok: false, msg: o.stance.why };
    wage = wage || o.wage; years = years || o.years;
    if (o.type === 'transfer') {
      if (club.tb < o.fee) return { ok: false, msg: 'ميزانية النادي لا تكفي الآن' };
      if (!canAffordWage(club, wage)) return { ok: false, msg: 'النادي لا يستطيع تحمّل هذا الراتب' };
      const from = p.club;
      T.execute(p, o.club, o.fee, wage, years);
      p.trust = 45; p.role = 'bench';
      Inbox.add('news', 'انتقال رسمي!', 'انضممتَ إلى ' + club.name + ' مقابل ' + U.money(o.fee) + ' براتب ' + U.money(wage) + ' أسبوعيًا لمدة ' + years + ' سنوات.');
      S.offers = []; S.transferRequest = false;
      return { ok: true, from, to: o.club };
    }
    if (o.type === 'loan') {
      const from = p.club;
      T.execute(p, o.club, 0, 0, 0, { loan: true });
      p.trust = 55;
      Inbox.add('news', 'إعارة', 'انتقلتَ معارًا إلى ' + club.name + ' حتى نهاية الموسم لتنال دقائق لعب أكثر.');
      S.offers = S.offers.filter((x) => x.type !== 'loan');
      return { ok: true, from, to: o.club };
    }
    if (o.type === 'free') {
      if (!canAffordWage(club, wage, o.club === p.club ? p.ct.w : 0)) return { ok: false, msg: 'ميزانية رواتب النادي لا تسمح بهذا الراتب' };
      T.execute(p, o.club, 0, wage, years);
      p.trust = 45; p.role = 'bench';
      Inbox.add('news', 'توقيع حر', 'وقّعتَ مع ' + club.name + ' كلاعب حر براتب ' + U.money(wage) + ' أسبوعيًا.');
      S.offers = []; S.userExpired = false;
      return { ok: true, to: o.club };
    }
    return { ok: false, msg: 'نوع عرض غير معروف' };
  };

  T.rejectOffer = (offerId) => { const S = G.S; S.offers = S.offers.filter((o) => o.id !== offerId); };

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
  T.generateLoanOffers = (force) => {
    const S = G.S, p = P(S.user);
    if (!S.window || !S.window.open || p.parentPays) return 0;
    if (!force && p.role !== 'bench' && p.role !== 'out') return 0;
    if (p.age > 25) return 0;
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
        S.offers.push({ id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'loan', club: cid, fee: 0, wage: p.ct.w, years: 0, tries: 0, week: S.week, expires: S.week + 3, status: 'new', stance: { ok: true, why: '' }, note: ev.role === 'starter' ? 'دور أساسي متوقع' : 'منافسة على مكان أساسي' });
        made++;
      }
    });
    if (made) Inbox.add('offer', 'عروض إعارة', 'وصلتك ' + made + ' عروض إعارة لتنال دقائق لعب أكثر.');
    return made;
  };
  T.requestLoan = () => {
    const S = G.S;
    if (!S.window || !S.window.open) return { ok: false, msg: 'نافذة الانتقالات مغلقة' };
    const n = T.generateLoanOffers(true);
    return n ? { ok: true, n } : { ok: false, msg: 'لا توجد أندية مناسبة للإعارة حاليًا' };
  };

  // ---------- التجديد ----------
  T.renewalTerms = () => {
    const p = P(G.S.user);
    const bonus = 1 + (p.trust - 50) / 300 + (p.role === 'starter' ? 0.15 : p.role === 'out' ? -0.1 : 0) + (G.Coach.formAvg(p) - 6.5) * 0.04;
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
    p.ct = { y: years, w: wage };
    p.trust = U.clamp(p.trust + 3, 0, 100);
    G.S.userExpired = false;
    G.Players.refresh(p);
    Inbox.add('contract', 'تجديد العقد', 'جدّدتَ عقدك مع ' + club.name + ' براتب ' + U.money(wage) + ' أسبوعيًا لمدة ' + years + ' سنوات.');
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
      S.offers.push({ id: 'O' + (S.offerId = (S.offerId || 0) + 1), type: 'free', club: cid, fee: 0, wage, years: p.age >= 31 ? 2 : U.int(3, 5), maxWage: Math.round(wage * 1.2 / 500) * 500, tries: 0, status: 'new', stance: { ok: true, why: '' }, note: 'عقد حر بلا رسوم' });
    });
    return S.offers.length;
  };
})(window.G = window.G || {});
