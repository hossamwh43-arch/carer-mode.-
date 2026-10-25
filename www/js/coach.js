/* coach.js — قرار المدرب: دور اللاعب، الثقة، المنافسة، تغيير المركز */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Coach = (G.Coach = {});

  Coach.ROLE_AR = { starter: 'أساسي', rotation: 'تناوب', bench: 'احتياطي', out: 'خارج التشكيلة', injured: 'مصاب', suspended: 'موقوف' };

  Coach.formAvg = (p) => (p.form && p.form.length ? U.avg(p.form.slice(-5)) : 6.5);

  // يتنبأ بدور لاعب في نادٍ معيّن (يُستخدم للقرار الأسبوعي وللإعارات ولاختيار النادي)
  Coach.evaluateAt = (p, clubId) => {
    const club = G.C(clubId);
    const pool = club.squad.map(P).filter((q) => q && !q.user && G.Lineup.avail(q));
    const slots = G.Lineup.slots(club);
    const xi = G.Lineup.best(pool, slots, 0) || [];
    let bi = -1, bs = 1e9;
    xi.forEach((x, i) => {
      const key = G.Players.posPenalty(p.pos, x.slot) * 100 + G.Lineup.eff(P(x.id), x.slot);
      if (key < bs) { bs = key; bi = i; }
    });
    if (bi < 0) return { role: 'starter', diff: 10, rival: null, slot: p.pos };
    const inc = P(xi[bi].id), slot = xi[bi].slot;
    const incScore = G.Lineup.eff(inc, slot);
    const trust = p.trust == null ? 45 : p.trust, form = p.form && p.form.length ? U.avg(p.form.slice(-5)) : 6.5, fit = p.fit == null ? 90 : p.fit;
    let mine = p.ovr - G.Players.posPenalty(p.pos, slot);
    mine += (trust - 50) * 0.08 + (form - 6.5) * 1.2;
    if (fit < 60) mine -= (60 - fit) * 0.06;
    if (p.age <= 21) mine += Math.min(3, Math.max(0, (p.pot - p.ovr) * 0.1)); // ثقة المدرب بالموهبة الصاعدة
    const diff = mine - incScore;
    let role = diff >= 0.5 ? 'starter' : diff >= -2.5 ? 'rotation' : diff >= -10 ? 'bench' : 'out';
    if (pool.length < 17 && role === 'out') role = 'bench';
    return { role, diff: U.r1(diff), rival: inc.id, slot };
  };

  // يحسب دور اللاعب لهذا الأسبوع ويخزّنه في p.role و p.roleInfo
  Coach.decide = () => {
    const S = G.S, p = P(S.user);
    if (p.inj > 0) { p.role = 'injured'; p.roleInfo = { text: 'مصاب — يغيب ' + p.inj + ' أسبوع/أسابيع', diff: -99 }; return p.role; }
    if (p.susp > 0) { p.role = 'suspended'; p.roleInfo = { text: 'موقوف لمباراة/مباريات', diff: -99 }; return p.role; }
    const ev = Coach.evaluateAt(p, p.club), inc = ev.rival ? P(ev.rival) : null;
    p.role = ev.role;
    const nm = inc ? inc.n : '';
    p.roleInfo = { diff: ev.diff, rival: ev.rival, slot: ev.slot, text: ev.role === 'starter' ? 'المدرب يعتمد عليك أساسيًا' : ev.role === 'rotation' ? 'تنافس ' + nm + ' على المركز وتشارك أحيانًا'
      : ev.role === 'bench' ? 'أنت ضمن قائمة المباراة كبديل خلف ' + nm : 'لست ضمن قائمة المباراة حاليًا — طوّر مستواك' };
    return p.role;
  };

  Coach.rotStart = (p) => U.rnd() < U.clamp(0.35 + (p.trust - 50) / 150, 0.2, 0.7);

  // منافسو اللاعب في المركز نفسه (للعرض)
  Coach.competitors = (p) => {
    const club = G.C(p.club);
    return club.squad.map(P).filter((q) => q && !q.user && G.POS_GROUP[q.pos] === G.POS_GROUP[p.pos] &&
      (q.pos === p.pos || G.Players.posPenalty(q.pos, p.pos) <= 6))
      .sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  };

  // تحديث الثقة بعد المباراة
  Coach.afterMatch = (p, rating, mins) => {
    let d;
    if (mins > 0) {
      d = (rating - 6.5) * 2.0;
      if (mins < 25) d *= 0.5;
      if (rating < 5.5 && p.role === 'starter') d -= 1;
    } else d = p.role === 'bench' ? -0.4 : 0;
    d *= d > 0 ? G.diff().trustUp : G.diff().trustDown;
    p.trust = U.clamp(Math.round((p.trust + d) * 10) / 10, 0, 100);
  };

  Coach.evaluation = (p) => {
    const f = Coach.formAvg(p), n = (p.form || []).length;
    if (!n) return 'لم يُقيَّم بعد';
    return f >= 7.5 ? 'ممتاز' : f >= 6.9 ? 'جيد جدًا' : f >= 6.4 ? 'جيد' : f >= 5.9 ? 'متوسط' : 'ضعيف';
  };

  Coach.trustLabel = (t) => (t >= 80 ? 'ثقة كبيرة' : t >= 60 ? 'ثقة جيدة' : t >= 40 ? 'ثقة متوسطة' : t >= 20 ? 'ثقة ضعيفة' : 'ثقة شبه معدومة');

  // تغيير المركز: مسموح فقط إذا تحمّلت سمات اللاعب (انخفاض ≤ 4 في Overall)
  Coach.positionOptions = (p) => G.POS.filter((x) => x !== p.pos).map((x) => {
    const o = G.Players.ovrAt(p, x);
    return { pos: x, ovr: o, ok: o >= p.ovr - 4 && (x === 'GK') === (p.pos === 'GK') };
  });
  Coach.changePosition = (p, pos) => {
    const opt = Coach.positionOptions(p).find((x) => x.pos === pos);
    if (!opt) return { ok: false, msg: 'مركز غير صالح' };
    if (!opt.ok) return { ok: false, msg: 'قدراتك الحالية لا تسمح باللعب في هذا المركز (التقييم المتوقع ' + opt.ovr + ')' };
    p.pos = pos; G.Players.refresh(p);
    p.trust = U.clamp(p.trust - 2, 0, 100);
    return { ok: true, msg: 'تم تغيير مركزك إلى ' + G.POS_AR[pos] + ' — تقييمك الجديد ' + p.ovr };
  };
})(window.G = window.G || {});
