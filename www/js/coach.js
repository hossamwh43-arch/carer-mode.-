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
    if (p.promise && p.promise.left > 0 && p.promise.club === clubId) mine += p.promise.role === 'starter' ? 1.5 : p.promise.role === 'rotation' ? 0.7 : 0; // المدرب يفي بوعد الدور في بداية العقد
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
  // tired: أبقاه المدرب في الملعب وهو منهَك (طاقة ≤30 لعدة دقائق) — فيتحمّل المدرب جزءًا من تراجع الأداء ولا يُعاقَب اللاعب كاملًا
  Coach.afterMatch = (p, rating, mins, tired) => {
    let d;
    if (mins > 0) {
      d = (rating - 6.5) * 2.0;
      if (mins < 25) d *= 0.5;
      if (rating < 5.5 && p.role === 'starter' && !tired) d -= 1;
      if (tired && d < 0) d *= 0.6;
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

  // ---------- شخصية المدرب وقراراته في التبديل (Build 24) ----------
  // لا يوجد في اللعبة اسم مدرب لكل نادٍ، فتُشتق الشخصية حتميًا من معرّف النادي (ثابتة عبر المواسم) وتتشكّل بتشكيلته (التكتيك).
  //  adj: يُضاف إلى «عتبة الطاقة» التي يستبدل عندها (موجب = يستبدل أبكر)  ·  lead/trail: ميله بحسب النتيجة
  Coach.STYLES = {
    rotator:  { ar: 'مدرب تدوير', adj: 7, lead: 3, trail: 0, plan: [0.85, 60, 78], desc: 'يحمي لاعبيه ويبدّل أبكر' },
    loyal:    { ar: 'مدرب وفيّ للأساسيين', adj: -7, lead: 2, trail: -2, plan: [0.45, 76, 90], desc: 'يتمسّك بأساسييه حتى يُنهَكوا' },
    tactical: { ar: 'مدرب تكتيكي', adj: 0, lead: 8, trail: -5, plan: [0.7, 62, 84], desc: 'يبدّل بحسب النتيجة والمجريات' },
    balanced: { ar: 'مدرب متوازن', adj: 0, lead: 4, trail: -2, plan: [0.78, 66, 88], desc: 'قرارات معتدلة' }
  };
  const hashStr = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  Coach.profile = (clubId) => {
    const c = G.C(clubId) || {}, h = hashStr(String(clubId)) % 8;
    let id = h < 2 ? 'rotator' : h < 4 ? 'loyal' : h < 6 ? 'tactical' : 'balanced';
    if ((c.rep || 0) >= 88 && id === 'loyal') id = 'rotator'; // قوائم الكبار العريضة تفرض التدوير
    const st = Coach.STYLES[id];
    const form = c.form || '4-3-3';
    return { id: id, ar: st.ar, adj: st.adj, lead: st.lead, trail: st.trail, plan: st.plan, desc: st.desc, form: form,
      press: form === '4-3-3' ? 4 : form === '4-2-3-1' ? 2 : 0 }; // التشكيلات الضاغطة تُنهك الأطراف والوسط أسرع
  };

  // قرار التبديل (دالة نقية بلا عشوائية). ctx:
  //  energy (0–100) · mm الدقيقة · diff = أهدافنا − أهداف الخصم · imp أهمية المباراة (0 عادية، 1 كبيرة، 2 حاسمة/إقصائية)
  //  perf تقييم أدائه الحالي (null إن لم يُحسب) · grp مجموعة مركزه (gk/def/mid/att) · sameGrp هل يوجد بديل بالمجموعة نفسها · gap = ovr اللاعب − ovr أفضل بديل
  //  age · trust · role · prof (من Coach.profile) · noise (±3 ثابت للمباراة) · subsLeft · hasBench
  // يعيد { sub: bool, why, urgency: 0–3, limit } — urgency 3 = إرهاق حرج لا يؤجَّله شيء
  Coach.subVerdict = (c) => {
    const E = c.energy, mm = c.mm;
    const out = (sub, why, urg, limit) => ({ sub: !!sub, why: why || '', urgency: urg || 0, limit: Math.round(limit || 0) });
    if (!c.hasBench || c.subsLeft <= 0) return out(false, '', 0, 0);
    // حرِج: لا يؤجَّله أداء ولا نتيجة (لا ينتظر الدقيقة 80)
    if (mm >= 25 && E <= 25) return out(true, 'إرهاق شديد (طاقتك ' + Math.round(E) + '٪)', 3, 25);
    if (mm < 40 || mm >= 89) return out(false, '', 0, 0);
    // عتبة الطاقة الأساسية للتبديل ثم التعديلات (كلها تُحسب من حالة المباراة)
    let lim = 50 + c.prof.adj + (c.noise || 0);
    if (c.prof.press && (c.grp === 'mid' || c.grp === 'att')) lim += c.prof.press;
    if (c.diff >= 2) lim += c.prof.lead + 3; else if (c.diff === 1 && mm >= 70) lim += Math.round(c.prof.lead / 2); else if (c.diff < 0) lim += c.prof.trail;
    lim += c.imp >= 2 ? -6 : c.imp === 1 ? -2 : 0;
    if (c.perf != null) lim += c.perf >= 7.8 ? -8 : c.perf >= 7.2 ? -4 : c.perf <= 5.8 ? 6 : c.perf <= 6.2 ? 3 : 0; // أداء ممتاز ⇒ يتحمّل إرهاقه أكثر، ضعيف ⇒ يستبدله أبكر
    lim += c.age <= 19 ? 4 : c.age >= 33 ? 3 : 0;                    // يحمي الصغار ويرفق بالكبار
    lim += c.role === 'rotation' ? 4 : 0;
    lim += c.trust >= 75 ? -3 : c.trust <= 30 ? 3 : 0;
    if (!c.sameGrp && E > 32) lim -= 6;                                // لا بديل بمركزه: يؤخّر إلا إن اشتدّ الإرهاق
    if (c.gap != null && c.gap >= 14 && E > 32) lim -= 5;               // البديل أضعف بكثير
    // الوقت: في الدقائق 40–54 لا يبدّل إلا عند الإنهاك، وبعد 71 يتساهل، وفي الدقائق الأخيرة لا قيمة للتبديل
    if (mm < 55) lim = Math.min(lim, 34);
    else if (mm >= 71 && mm < 80) lim += 4;
    else if (mm >= 80) lim -= 4;
    lim = Math.min(lim, 62);  // طاقة ≥ 62 ليست إرهاقًا: لا استبدال لمجرد انخفاض بسيط
    if (E > lim) return out(false, '', 0, lim);
    const why = E <= 36 ? 'إرهاق (طاقتك ' + Math.round(E) + '٪)' : c.diff >= 2 ? 'حماية لك مع تقدّم الفريق' : c.perf != null && c.perf <= 6.2 ? 'تراجع الأداء مع الإرهاق' : c.role === 'rotation' || c.prof.id === 'rotator' ? 'تدوير وحماية من الإرهاق' : 'إرهاق (طاقتك ' + Math.round(E) + '٪)';
    return out(true, why, E <= 36 ? 2 : 1, lim);
  };

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
