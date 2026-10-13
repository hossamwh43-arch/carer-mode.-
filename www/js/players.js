/* players.js — السمات، Overall، القيمة السوقية، الراتب، توليد الفرق واللاعب */
(function (G) {
  'use strict';
  const U = G.U;
  const Players = (G.Players = {});

  G.P = (id) => G.S.players[id];
  G.C = (id) => G.S.clubs[id];

  Players.ATTRS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'iq', 'gk'];
  Players.ATTR_AR = { pac: 'السرعة والتسارع', sho: 'التسديد والإنهاء', pas: 'التمرير والرؤية', dri: 'المراوغة والتحكم', def: 'الدفاع والافتكاك', phy: 'القوة والتحمل', iq: 'التمركز والوعي', gk: 'مهارات الحراسة' };

  const OVR_W = {
    ST: { sho: .30, pac: .17, dri: .14, phy: .13, iq: .15, pas: .11 },
    LW: { pac: .22, dri: .22, sho: .15, pas: .15, iq: .13, phy: .13 },
    RW: { pac: .22, dri: .22, sho: .15, pas: .15, iq: .13, phy: .13 },
    CAM: { pas: .25, dri: .20, sho: .15, iq: .17, pac: .10, phy: .07, def: .06 },
    CM: { pas: .24, iq: .17, dri: .13, def: .13, phy: .13, sho: .10, pac: .10 },
    CDM: { def: .27, pas: .17, iq: .18, phy: .20, dri: .06, pac: .07, sho: .05 },
    LB: { pac: .18, def: .22, pas: .14, dri: .12, phy: .15, iq: .13, sho: .06 },
    RB: { pac: .18, def: .22, pas: .14, dri: .12, phy: .15, iq: .13, sho: .06 },
    CB: { def: .33, phy: .24, iq: .18, pac: .12, pas: .08, dri: .03, sho: .02 },
    GK: { gk: .86, iq: .06, phy: .05, pac: .03 }
  };
  Players.OVR_W = OVR_W;
  // الإزاحات النسبية لتوليد ملف السمات لكل مركز: pac sho pas dri def phy iq
  const PROFILE = {
    ST: [2, 7, -8, 0, -32, 2, 4], LW: [7, 1, -1, 7, -28, -8, -1], RW: [7, 1, -1, 7, -28, -8, -1],
    CAM: [-2, 2, 8, 6, -22, -10, 5], CM: [-3, -3, 6, 2, -8, 0, 3], CDM: [-4, -12, 4, -6, 10, 6, 3],
    LB: [4, -14, 0, -2, 6, 0, -2], RB: [4, -14, 0, -2, 6, 0, -2], CB: [-6, -28, -8, -14, 10, 9, 2],
    GK: [-20, -30, -12, -20, -30, -6, -4]
  };
  const KEYS7 = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'iq'];

  Players.calcOvr = (a, pos) => {
    const w = OVR_W[pos];
    let s = 0;
    for (const k in w) s += w[k] * (a[k] || 0);
    return Math.round(s);
  };
  Players.ovrAt = (p, pos) => Players.calcOvr(p.a, pos);

  Players.buildAttrs = (pos, target, noise) => {
    noise = noise == null ? 3 : noise;
    const off = PROFILE[pos], a = {};
    KEYS7.forEach((k, i) => { a[k] = target + off[i] + U.gauss() * noise; });
    a.gk = pos === 'GK' ? target + 3 + U.gauss() * 2 : 8 + U.rnd() * 12;
    const keys = pos === 'GK' ? ['gk', 'iq', 'phy', 'pac'] : KEYS7;
    for (let it = 0; it < 5; it++) {
      const d = target - Players.calcOvr(a, pos);
      if (Math.abs(d) < 0.6) break;
      keys.forEach((k) => { a[k] += d; });
    }
    Object.keys(a).forEach((k) => { a[k] = U.clamp(Math.round(a[k]), 10, 99); });
    return a;
  };

  // ---------- القيمة والراتب ----------
  const VAL_TAB = [[40, 0.03], [50, 0.12], [55, 0.35], [60, 0.9], [65, 2.6], [70, 7.5], [75, 20], [80, 50], [85, 105], [88, 160], [91, 230], [95, 300]];
  function baseValue(ovr) {
    if (ovr <= VAL_TAB[0][0]) return VAL_TAB[0][1];
    for (let i = 1; i < VAL_TAB.length; i++) {
      if (ovr <= VAL_TAB[i][0]) {
        const [x0, y0] = VAL_TAB[i - 1], [x1, y1] = VAL_TAB[i];
        const t = (ovr - x0) / (x1 - x0);
        return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
      }
    }
    return VAL_TAB[VAL_TAB.length - 1][1];
  }
  function ageFactor(a) {
    if (a <= 19) return 1.5; if (a === 20) return 1.4; if (a === 21) return 1.3; if (a === 22) return 1.2;
    if (a === 23) return 1.1; if (a <= 27) return 1.0; if (a === 28) return 0.9; if (a === 29) return 0.8;
    if (a === 30) return 0.65; if (a === 31) return 0.5; if (a === 32) return 0.38; if (a === 33) return 0.28;
    return 0.18;
  }
  Players.value = (p) => {
    let v = baseValue(p.ovr) * ageFactor(p.age);
    if (p.age <= 23) v *= 1 + Math.max(0, p.pot - p.ovr) * 0.018;
    const y = p.ct ? p.ct.y : 2;
    v *= y >= 3 ? 1 : y === 2 ? 0.97 : y === 1 ? 0.85 : 0.6;
    if (p.user && p.form && p.form.length >= 3) {
      const f = U.avg(p.form.slice(-8));
      v *= 1 + U.clamp((f - 6.5) * 0.08, -0.2, 0.25);
    }
    return Math.max(25000, U.roundTo(v * 1e6, v > 5 ? 250000 : 25000));
  };
  Players.wageFor = (p) => U.clamp(U.roundTo(1500 + Players.value(p) * 0.0017, 500), 800, 600000);
  Players.refresh = (p) => {
    p.ovr = Players.calcOvr(p.a, p.pos);
    p.val = Players.value(p);
    return p;
  };

  // ---------- المراكز: عقوبة اللعب خارج المركز ----------
  const SIM = {
    'ST-LW': 5, 'ST-RW': 5, 'ST-CAM': 5, 'LW-RW': 4, 'LW-CAM': 4, 'RW-CAM': 4, 'CAM-CM': 3, 'CM-CDM': 3, 'CAM-CDM': 7,
    'LB-RB': 5, 'CB-CDM': 6, 'CB-LB': 8, 'CB-RB': 8, 'CM-LW': 7, 'CM-RW': 7, 'LB-LW': 8, 'RB-RW': 8, 'CDM-LB': 8,
    'CDM-RB': 8, 'CM-ST': 9, 'CM-LB': 9, 'CM-RB': 9, 'LW-LB': 8, 'RW-RB': 8
  };
  Players.posPenalty = (from, slot) => {
    if (from === slot) return 0;
    if (from === 'GK' || slot === 'GK') return 60;
    return SIM[from + '-' + slot] != null ? SIM[from + '-' + slot] : SIM[slot + '-' + from] != null ? SIM[slot + '-' + from] : 15;
  };

  // ---------- الأسماء والأرقام ----------
  Players.genName = (group) => {
    const g = G.NAMES[group] || G.NAMES.iber;
    return U.pick(g.f) + ' ' + U.pick(g.l);
  };
  const NUM_PREF = {
    GK: [1, 13, 25, 31], CB: [2, 3, 4, 5, 15, 23, 24, 22], LB: [3, 12, 18, 19, 23], RB: [2, 12, 16, 20, 22],
    CDM: [6, 5, 14, 16, 21, 8], CM: [8, 10, 14, 16, 17, 20, 21, 4, 6], CAM: [10, 8, 11, 20, 21, 17],
    LW: [11, 7, 17, 19, 21, 10], RW: [7, 11, 17, 19, 21, 10], ST: [9, 19, 10, 18, 21, 17, 22, 99]
  };
  Players.takenNumbers = (clubId) => {
    const c = G.C(clubId), t = {};
    (c ? c.squad : []).forEach((id) => { const p = G.P(id); if (p && p.num) t[p.num] = true; });
    return t;
  };
  Players.freeNumber = (clubId, pos, preferred) => {
    const t = Players.takenNumbers(clubId);
    if (preferred && !t[preferred]) return preferred;
    const list = NUM_PREF[pos] || [];
    for (const n of list) if (!t[n]) return n;
    for (let i = 0; i < 60; i++) { const n = U.int(2, 40); if (!t[n]) return n; }
    for (let n = 2; n <= 99; n++) if (!t[n]) return n;
    return 0;
  };

  // ---------- توليد لاعب ----------
  Players.newId = () => 'P' + (G.S.nextId++);
  Players.gen = (o) => {
    const group = o.group || 'iber';
    const p = {
      id: Players.newId(), n: o.name || Players.genName(group), nat: o.nat || 'ES', age: o.age, pos: o.pos,
      h: o.h || U.int(170, 192), w: o.w || U.int(65, 86), foot: U.chance(0.75) ? 'R' : 'L',
      club: o.club || null, parent: null, num: 0, pot: 0, inj: 0, susp: 0, yel: 0,
      st: { lg: [0, 0, 0, 0, 0], uc: [0, 0, 0, 0, 0] }
    };
    if (p.pos === 'GK') p.h = U.int(184, 200);
    p.a = Players.buildAttrs(p.pos, o.ovr);
    p.ovr = Players.calcOvr(p.a, p.pos);
    const room = p.age < 24 ? Math.max(0, Math.round((24 - p.age) * (1.5 + U.rnd() * 1.8))) : U.int(0, 2);
    p.pot = Math.min(95, p.ovr + room);
    p.val = Players.value({ ovr: p.ovr, pot: p.pot, age: p.age, ct: { y: 3 } });
    p.ct = { y: U.int(1, 5), w: 0 };
    p.val = Players.value(p);
    p.ct.w = U.clamp(U.roundTo(Players.wageFor(p) * (0.85 + U.rnd() * 0.3), 500), 800, 600000);
    return p;
  };

  Players.clubStrength = (club) => {
    const sq = club.squad.map(G.P).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 14);
    return Math.round(U.avg(sq.map((p) => p.ovr)) * 10) / 10;
  };

  const TB_TAB = [[60, 8], [65, 12], [70, 25], [75, 45], [80, 90], [85, 150], [90, 230], [95, 300]];
  Players.budgetFor = (rep) => {
    for (let i = 1; i < TB_TAB.length; i++) {
      if (rep <= TB_TAB[i][0]) {
        const [x0, y0] = TB_TAB[i - 1], [x1, y1] = TB_TAB[i];
        return (y0 + ((rep - x0) / (x1 - x0)) * (y1 - y0)) * 1e6;
      }
    }
    return TB_TAB[TB_TAB.length - 1][1] * 1e6;
  };
  Players.wageBill = (club) => U.sum(club.squad.map((id) => { const p = G.P(id); return p && !p.parentPays ? p.ct.w : 0; }));

  // ---------- توليد نادٍ وتشكيلته ----------
  Players.genSquad = (club) => {
    const q = 0.62 * club.rep + 31;
    const homeGroup = G.COUNTRY_GROUP[club.country] || 'iber';
    club.squad = club.squad || [];
    Object.keys(G.SQUAD_TEMPLATE).forEach((pos) => {
      const n = G.SQUAD_TEMPLATE[pos];
      for (let k = 0; k < n; k++) {
        const drop = k === 0 ? U.rnd() * 2 - 1 : 3 + k * 2 + U.rnd() * 3;
        const ovr = U.clamp(Math.round(q - drop + U.gauss() * 1.6), 52, 94);
        const age = U.clamp(Math.round(25 + U.gauss() * 4.2), 17, 37);
        const foreign = U.chance(club.liga ? 0.35 : 0.3);
        let nat, group;
        if (foreign) { nat = U.pick(G.EXTRA_NATS); group = (G.NATS.find((x) => x[0] === nat) || [0, 0, 'iber'])[2]; }
        else { nat = club.country === 'ESP' ? 'ES' : club.country.slice(0, 2); group = homeGroup; }
        const p = Players.gen({ pos, ovr, age, nat, group, club: club.id });
        G.S.players[p.id] = p;
        club.squad.push(p.id);
        p.num = Players.freeNumber(club.id, pos);
      }
    });
    club.wcap = Math.round(Players.wageBill(club) * 1.1);
  };

  Players.initWorld = () => {
    const S = G.S;
    S.clubs = {}; S.players = {}; S.free = [];
    G.LALIGA.forEach((d) => {
      S.clubs[d[0]] = { id: d[0], name: d[1], country: 'ESP', rep: d[2], c: [d[3], d[4]], form: d[5], liga: true, squad: [], tb: Players.budgetFor(d[2]) * (0.8 + U.rnd() * 0.4) };
    });
    G.FOREIGN.forEach((d) => {
      S.clubs[d[0]] = { id: d[0], name: d[1], country: d[2], rep: d[3], c: [d[4], d[5]], form: d[6], liga: false, squad: [], tb: Players.budgetFor(d[3]) * (0.8 + U.rnd() * 0.4) };
    });
    Object.keys(S.clubs).forEach((id) => Players.genSquad(S.clubs[id]));
  };

  // ---------- اللاعب المستخدم ----------
  Players.initialOvr = (age) => Math.round(52 + (age - 16) * 3 + U.int(-2, 2));
  Players.starsOf = (pot) => U.clamp(Math.round((pot - 60) / 6) / 1, 1, 5); // نجوم الإمكانات (تقدير)

  Players.createUser = (o) => {
    const S = G.S;
    const id = 'U1';
    const ovr0 = U.clamp(Players.initialOvr(o.age), 40, 70);
    const a = Players.buildAttrs(o.pos, ovr0, 2.5);
    // تأثير الطول والوزن
    if (o.pos !== 'GK') {
      a.pac = U.clamp(Math.round(a.pac + (180 - o.h) * 0.15 - (o.w - 75) * 0.1), 10, 99);
      a.phy = U.clamp(Math.round(a.phy + (o.h - 180) * 0.2 + (o.w - 75) * 0.12), 10, 99);
    }
    const pot = Math.round(U.clamp(74 + U.gauss() * 6, 70, 92));
    const p = {
      id, user: true, n: o.name, nat: o.nat, age: o.age, pos: o.pos, h: o.h, w: o.w, foot: o.foot, look: o.look,
      num: o.num, a, club: o.clubId, parent: null, pot: Math.max(pot, ovr0 + 10), inj: 0, susp: 0, yel: 0,
      fit: 90, form: [], trust: 45, role: 'bench', xp: 0, lvl: 0, dp: 0, gain: {}, car: [], hist: [], earn: 0, awards: [],
      st: { lg: [0, 0, 0, 0, 0], uc: [0, 0, 0, 0, 0] }, cards: { y: 0, r: 0 }, startSeason: S.season
    };
    p.ovr = Players.calcOvr(p.a, p.pos);
    p.ct = { y: 3, w: 0 };
    p.val = Players.value(p);
    p.ct.w = Players.wageFor(p);
    p.pot = Math.max(p.pot, p.ovr + 10);
    S.players[id] = p;
    S.user = id;
    const club = G.C(o.clubId);
    club.squad.push(id);
    p.num = Players.freeNumber(o.clubId, p.pos, o.num);
    p.hist.push({ season: S.season, year: G.CONFIG.startYear, club: o.clubId, type: 'join', fee: 0, wage: p.ct.w });
    return p;
  };
})(window.G = window.G || {});
