/* training.js — XP ونقاط التطوير والتدريب الأسبوعي والنمو حسب العمر */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Training = (G.Training = {});

  Training.FOCUS = [
    { id: 'balanced', ar: 'متوازن' }, { id: 'pac', ar: 'السرعة والتسارع' }, { id: 'sho', ar: 'التسديد والإنهاء' },
    { id: 'pas', ar: 'التمرير والرؤية' }, { id: 'dri', ar: 'المراوغة والتحكم' }, { id: 'phy', ar: 'القوة والتحمل' },
    { id: 'def', ar: 'الدفاع والافتكاك' }, { id: 'iq', ar: 'التمركز والوعي التكتيكي' }, { id: 'gk', ar: 'مهارات الحراسة' }
  ];
  Training.INTENSITY = { light: { ar: 'خفيف', xp: 0.6, rec: 14, inj: 0.001, prog: 0.6 }, normal: { ar: 'متوسط', xp: 1.0, rec: 9, inj: 0.003, prog: 1.0 }, heavy: { ar: 'مكثف', xp: 1.4, rec: 4, inj: 0.008, prog: 1.4 } };

  const ageMult = (a) => (a <= 18 ? 1.2 : a <= 21 ? 1.1 : a <= 24 ? 1 : a <= 27 ? 0.8 : a <= 30 ? 0.55 : 0.3);
  Training.seasonCap = (a) => (a <= 18 ? 9 : a <= 21 ? 8 : a <= 24 ? 6 : a <= 27 ? 4 : a <= 30 ? 2 : 1);
  Training.need = (lvl) => 110 + 14 * lvl;
  Training.cost = (p, k) => (p.a[k] < 65 ? 1 : p.a[k] < 80 ? 2 : 3);
  Training.relevant = (p) => Object.keys(G.Players.OVR_W[p.pos]);
  Training.facility = (clubId) => 0.9 + (G.C(clubId).rep - 60) / 200;

  // أعلى قيمة ممكنة للسمة بحسب الإمكانات
  Training.maxAttr = (p, k) => {
    const w = G.Players.OVR_W[p.pos][k] || 0;
    const base = p.pot + (w >= 0.2 ? 6 : w >= 0.12 ? 3 : 0);
    return U.clamp(base, 45, 99);
  };

  Training.canSpend = (p, k) => {
    if (k === 'gk' && p.pos !== 'GK') return { ok: false, reason: 'للحراس فقط' };
    if (k !== 'gk' && p.pos === 'GK' && !(G.Players.OVR_W.GK[k])) return { ok: false, reason: 'غير مؤثرة للحارس' };
    const c = Training.cost(p, k);
    if (p.dp < c) return { ok: false, reason: 'تحتاج ' + c + ' نقطة تطوير', cost: c };
    if ((p.gain[k] || 0) >= Training.seasonCap(p.age)) return { ok: false, reason: 'بلغتَ سقف التطور الموسمي لهذه السمة', cost: c };
    if (p.a[k] >= Training.maxAttr(p, k)) return { ok: false, reason: 'وصلتَ إلى حدّ إمكاناتك في هذه السمة', cost: c };
    return { ok: true, cost: c };
  };
  Training.spend = (p, k) => {
    const c = Training.canSpend(p, k);
    if (!c.ok) return c;
    p.dp -= c.cost; p.a[k]++; p.gain[k] = (p.gain[k] || 0) + 1;
    const old = p.ovr; G.Players.refresh(p);
    return { ok: true, cost: c.cost, ovr: p.ovr, delta: p.ovr - old };
  };

  Training.addXP = (p, xp) => {
    p.xp += xp;
    let ups = 0;
    while (p.xp >= Training.need(p.lvl)) { p.xp -= Training.need(p.lvl); p.lvl++; p.dp++; ups++; }
    return ups;
  };
  Training.matchXP = (rating, mins) => Math.max(0, (mins / 90) * (8 + (rating - 6) * 7)) * G.diff().xp;

  // يضبط Overall مستهدفًا بتحريك السمات المؤثرة
  Training.setOvr = (p, target) => {
    const keys = Training.relevant(p);
    for (let it = 0; it < 6; it++) {
      const d = target - G.Players.calcOvr(p.a, p.pos);
      if (Math.abs(d) < 0.55) break;
      keys.forEach((k) => { p.a[k] = U.clamp(Math.round(p.a[k] + d + U.gauss() * 0.4), 10, 99); });
    }
    G.Players.refresh(p);
  };

  // ---------- التدريب الأسبوعي للاعب المستخدم ----------
  Training.week = () => {
    const S = G.S, p = P(S.user), t = S.training || (S.training = { focus: 'balanced', intensity: 'normal' });
    const I = Training.INTENSITY[t.intensity] || Training.INTENSITY.normal;
    const res = { xp: 0, ups: 0, attrUps: [], fitGain: 0, injured: false };
    const hurt = p.inj > 0;
    const fac = Training.facility(p.club);
    const am = ageMult(p.age);
    let xp = 22 * I.xp * fac * G.diff().xp * (hurt ? 0.4 : 1) * (0.9 + U.rnd() * 0.2);
    if (p.pos === 'GK' && t.focus === 'gk') xp *= 1.1;
    res.xp = Math.round(xp);
    res.ups = Training.addXP(p, xp);
    // عدّاد التقدم التلقائي للسمة المختارة
    p.prog = p.prog || {};
    if (!hurt) {
      const keys = t.focus === 'balanced' ? Training.relevant(p).slice().sort((a, b) => G.Players.OVR_W[p.pos][b] - G.Players.OVR_W[p.pos][a]).slice(0, 3) : [t.focus];
      const share = t.focus === 'balanced' ? 4 : 10;
      keys.forEach((k) => {
        if (k === 'gk' && p.pos !== 'GK') return;
        p.prog[k] = (p.prog[k] || 0) + share * I.prog * fac * am;
        if (p.prog[k] >= 100) {
          p.prog[k] -= 100;
          if ((p.gain[k] || 0) < Training.seasonCap(p.age) && p.a[k] < Training.maxAttr(p, k)) {
            p.a[k]++; p.gain[k] = (p.gain[k] || 0) + 1; res.attrUps.push(k);
          }
        }
      });
      if (res.attrUps.length) G.Players.refresh(p);
    }
    // اللياقة والإصابة
    const rec = hurt ? 6 : I.rec;
    p.fit = U.clamp(p.fit + rec, 0, 100);
    res.fitGain = rec;
    p.training = { heavy: t.intensity === 'heavy' };
    if (!hurt) {
      const risk = I.inj * G.diff().inj * (p.fit < 55 ? 2.5 : 1);
      if (U.rnd() < risk) { p.inj = U.int(1, 4); res.injured = true; }
    }
    return res;
  };

  // ---------- النمو الموسمي حسب العمر ----------
  const AGE_DELTA = { 16: 4.8, 17: 4.5, 18: 4.2, 19: 3.7, 20: 3.1, 21: 2.6, 22: 2.0, 23: 1.5, 24: 1.0, 25: 0.5, 26: 0, 27: -0.3, 28: -0.6, 29: -1, 30: -1.5, 31: -2, 32: -2.5, 33: -3.0 };
  Training.ageDelta = (age) => (age <= 16 ? 4.8 : age >= 33 ? -3.2 : AGE_DELTA[age]);

  Training.growAI = (p) => {
    let d = Training.ageDelta(p.age);
    if (d > 0) d *= U.clamp((p.pot - p.ovr + 2) / 6, 0.15, 1.5);
    d += U.gauss() * 1.0;
    let target = Math.round(p.ovr + d);
    if (p.ovr >= p.pot + 1 && target > p.ovr) target = p.ovr;
    target = U.clamp(target, 38, 95);
    if (target !== p.ovr) Training.setOvr(p, target);
    if (p.age >= 24) p.pot = Math.max(p.ovr, Math.min(p.pot, p.ovr + U.int(0, 2)));
    else if (p.ovr > p.pot) p.pot = p.ovr;
    G.Players.refresh(p);
  };

  // نمو اللاعب المستخدم: نصف المعدل الطبيعي + أثر الأداء (التدريب الأسبوعي ونقاط التطوير تُضاف أثناء الموسم)
  Training.growUser = (p, seasonInfo) => {
    let d = Training.ageDelta(p.age) * 0.7;
    const apps = seasonInfo.apps, avg = seasonInfo.avg;
    let note = '';
    if (apps >= 12 && avg >= 7.2) { d += 1; note = 'مكافأة الأداء المتميز'; }
    else if (apps >= 20 && avg >= 6.8) d += 0.4;
    if (apps < 5 && p.age <= 22) { d -= 0.6; note = 'قلة المشاركة أبطأت تطورك'; }
    if (d > 0) d *= U.clamp((p.pot - p.ovr + 2) / 6, 0.15, 1.25);
    d *= d > 0 ? G.diff().grow : G.diff().decl;
    d += U.gauss() * 0.5;
    const old = p.ovr;
    const target = U.clamp(Math.round(old + d), old - 4, p.age < 24 ? Math.max(old, p.pot + 1) : old + 1);
    if (target !== old) Training.setOvr(p, target);
    // الإمكانات تتحرك قليلًا مع الأداء
    if (apps >= 12 && avg >= 7.5 && p.age <= 22 && p.ovr >= p.pot - 2) p.pot = Math.min(97, p.pot + 1);
    if (p.age >= 25) p.pot = Math.max(p.ovr, p.pot - 1);
    if (p.ovr > p.pot) p.pot = p.ovr;
    p.gain = {}; p.prog = {};
    G.Players.refresh(p);
    return { from: old, to: p.ovr, note };
  };
})(window.G = window.G || {});
