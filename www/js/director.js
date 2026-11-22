/* director.js — «المدير الفني» لكل نادٍ (Build 28).
   المشكلة: الأندية كانت تشتري بحسب «أسوأ مركز» فقط، بلا نظرة للتشكيلة: فتتكدّس النجوم في مركز واحد (٣-٤ مهاجمين بمستوى
   الأساسيين) وتبقى ثغرات في مراكز أخرى، ولا يوجد «عقل» وراء الصفقات.
   الحل: لكل نادٍ مدير فني (اسم + عمر + أسلوب + كفاءة) يقرّر التعاقدات بمنطق «القيمة الحدّية»: كم تُضيف الصفقة فعليًا إلى
   التشكيلة الأساسية للخطة التي يلعب بها النادي؟ (مجموع تقييمات أفضل 11 في خانات الخطة بعد التوقيع − قبله). نجم خامس في مركز
   مكتظّ يضيف صفرًا فيُرفض؛ ثغرة بالظهير الأيسر تضيف كثيرًا فتُسدّ أولًا. يبيع المدير أيضًا الفائض (نجوم الدكة) لناديٍ يحتاجهم
   بدل تكديسهم. يتأثر القرار بأسلوبه: يعشق النجوم · يبني بالشباب · صفقات ذكية (أحرار/رخيص) · دفاعي · هجومي · متوازن.
   في نهاية الموسم يُقال المدير إن كانت النتائج دون سمعة النادي بكثير (أو يتقاعد الكبار) ويُعيَّن غيره.
   حتمي بالكامل بلا U.rnd (دالة FNV) في التعيين/الإقالة/اختيار الأسماء — يعمل في الترحيل بلا مساس بعشوائية اللعبة.
   الأسماء مولَّدة (غير حقيقية). يُخزَّن في club.mgr = {n, age, st, rt, since, log:[{s,t}]، hist:[{n,a,b}]}. */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const D = (G.Director = {});
  D.on = true; // تعطيله يعيد منطق الشراء القديم (للمقارنة في الاختبارات)
  D.stats = { surplus: 0, cap: 0, rep: 0, tb: 0, wage: 0, floor: 0, gain: 0, sell: 0, sold: 0, loan: 0 }; // عدّادات تشخيصية لبيع الفائض

  const hash01 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 2246822519); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  D.hash01 = hash01;
  const pickH = (arr, key) => arr[Math.min(arr.length - 1, Math.floor(hash01(key) * arr.length))];

  D.STYLES = {
    balanced: { ar: 'متوازن', ico: 'target', d: 'يسدّ الثغرات أولًا ويبني تشكيلة متزنة بلا تكديس.', star: 0, youth: 0, value: 0, att: 1, def: 1, mg: 1 },
    stars: { ar: 'يعشق النجوم', ico: 'star', d: 'يطارد أفضل اللاعبين لكن لا يوقّع نجمًا إلا إذا كان سيبدأ فعلًا.', star: 0.1, youth: 0, value: 0, att: 1.1, def: 1, mg: 0.8 },
    youth: { ar: 'يبني بالشباب', ico: 'rocket', d: 'يفضّل المواهب تحت 23 سنة ويمنحها مقعد البديل بدل تكديس الكبار.', star: 0, youth: 1, value: 0, att: 1, def: 1, mg: 1.1 },
    value: { ar: 'صفقات ذكية', ico: 'chart', d: 'يبحث عن أفضل مقابل للمال: اللاعبون الأحرار والصفقات الرخيصة.', star: 0, youth: 0, value: 1, att: 1, def: 1, mg: 1 },
    solid: { ar: 'دفاعي صلب', ico: 'shield', d: 'يعطي الأولوية لخط الدفاع والحراسة.', star: 0, youth: 0, value: 0, att: 0.9, def: 1.3, mg: 1 },
    attack: { ar: 'هجومي', ico: 'flame', d: 'يبني الخط الأمامي أولًا ويطلب الأهداف.', star: 0.05, youth: 0, value: 0, att: 1.3, def: 0.9, mg: 1 }
  };
  D.STYLE_ORDER = ['balanced', 'stars', 'youth', 'value', 'solid', 'attack'];
  const ATT = { LW: 1, RW: 1, ST: 1, CAM: 1 }, DEF = { GK: 1, CB: 1, LB: 1, RB: 1, CDM: 1 };
  const GROUP = { ESP: 'iber', POR: 'port', ENG: 'eng', SCO: 'eng', GER: 'ger', AUT: 'ger', SUI: 'ger', NED: 'ger', DEN: 'ger', NOR: 'ger', ITA: 'ita', FRA: 'fra', BEL: 'fra', GRE: 'slav', CZE: 'slav', UKR: 'slav', TUR: 'slav', AZE: 'slav' };
  const FOREIGN = ['iber', 'ita', 'ger', 'port', 'eng', 'fra', 'latin'];

  const styleFor = (club, key) => {
    const h = hash01(key + ':st');
    // الأندية الكبرى تميل إلى النجوم والهجوم، والصغرى إلى الشباب والصفقات الذكية
    const w = club.rep >= 82 ? [2, 3.2, 1, 0.6, 1.2, 2] : club.rep >= 70 ? [3, 1.2, 1.6, 1.4, 1.5, 1.3] : [2.6, 0.3, 2.2, 2.2, 1.6, 1];
    const sum = w.reduce((a, b) => a + b, 0); let t = h * sum;
    for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return D.STYLE_ORDER[i]; }
    return 'balanced';
  };
  const nameFor = (club, key, taken) => {
    const own = GROUP[club.country] || 'eng';
    for (let k = 0; k < 40; k++) {
      const grp = hash01(key + ':g' + k) < 0.22 ? pickH(FOREIGN, key + ':fg' + k) : own;
      const L = G.NAMES[grp] || G.NAMES.eng;
      const n = pickH(L.f, key + ':f' + k) + ' ' + pickH(L.l, key + ':l' + k);
      if (!taken[n]) return n;
    }
    return 'مدرب ' + club.name;
  };

  D.make = (club, season, salt, taken) => {
    const key = club.id + '|' + season + '|' + salt;
    const age = 40 + Math.floor(hash01(key + ':age') * 27);
    const rt = U.clamp(Math.round(48 + (club.rep - 55) * 0.45 + hash01(key + ':rt') * 24), 46, 94);
    return { n: nameFor(club, key, taken), age, st: styleFor(club, key), rt, since: season, log: [], hist: [] };
  };

  // تعيين المديرين المفقودين (حتمي بلا عشوائية؛ يعمل عند بدء اللعبة وفي ترحيل الحفظات القديمة)
  D.init = () => {
    const S = G.S; if (!S || !S.clubs) return 0;
    const taken = {}; Object.values(S.clubs).forEach((c) => { if (c.mgr) taken[c.mgr.n] = 1; });
    let n = 0;
    Object.keys(S.clubs).sort().forEach((id) => {
      const c = S.clubs[id]; if (c.mgr) return;
      c.mgr = D.make(c, S.season || 1, 0, taken); taken[c.mgr.n] = 1; n++;
      // المدير القديم ظلّ في النادي مدةً: «منذ» موسم سابق بحسب الكفاءة (للعرض فقط)
      c.mgr.since = Math.max(1, (S.season || 1) - Math.floor(hash01(id + ':tenure') * 5));
    });
    return n;
  };

  const note = (club, text) => {
    const m = club.mgr; if (!m) return;
    m.log = m.log || []; m.log.unshift({ s: G.S.season, t: text }); if (m.log.length > 3) m.log.length = 3;
  };
  D.note = note;
  D.minGain = (club) => {
    const m = club.mgr, st = D.STYLES[(m && m.st) || 'balanced'], rt = m ? m.rt : 65;
    return (2.6 - 0.012 * rt) * st.mg * (club.rep >= 85 ? 0.9 : 1);
  };

  // ---------- تقدير التشكيلة (قيمة حدّية) ----------
  const poolOf = (club) => club.squad.map(P).filter((p) => p && !p.user);
  const slotW = (st, slot) => (ATT[slot] ? st.att : DEF[slot] ? st.def : 1);
  // {xi, val, pool}: أفضل 11 للخطة ومجموع تقييماتهم الموزونة بأسلوب المدير
  D.view = (club, pool) => {
    pool = pool || poolOf(club);
    const xi = G.Lineup.best(pool, G.Lineup.slots(club), 0); if (!xi) return null;
    const st = D.STYLES[(club.mgr && club.mgr.st) || 'balanced'];
    let v = 0; xi.forEach((x) => { v += slotW(st, x.slot) * G.Lineup.eff(P(x.id), x.slot); });
    return { xi, val: v, pool };
  };
  // المراكز التي يراها المدير نقطة ضعف (مرتّبة): فجوة التقييم عن مستوى النادي + تقدّم العمر
  D.weakSlots = (club, view) => {
    const q = G.Transfers.clubQ(club), st = D.STYLES[(club.mgr && club.mgr.st) || 'balanced'], out = {};
    view.xi.forEach((x) => {
      const p = P(x.id), e = G.Lineup.eff(p, x.slot);
      const gap = (q + 2 - e + (p.age >= 33 ? 2.5 : p.age >= 31 ? 1 : 0)) * slotW(st, x.slot);
      if (gap > 0.4 && (!out[x.slot] || gap > out[x.slot])) out[x.slot] = gap;
    });
    return Object.keys(out).map((pos) => ({ pos, gap: out[pos] })).sort((a, b) => b.gap - a.gap);
  };
  // مراكز ناقصة العدد عن القالب (تُسدّ دائمًا)
  D.shortPos = (club) => {
    const sq = poolOf(club), out = [];
    Object.keys(G.SQUAD_TEMPLATE).forEach((pos) => { const have = sq.filter((p) => p.pos === pos).length; if (have < G.SQUAD_TEMPLATE[pos]) out.push({ pos, urg: 3 + G.SQUAD_TEMPLATE[pos] - have }); });
    return out.sort((a, b) => b.urg - a.urg);
  };

  // مرشّحو الشراء لنادٍ في جولة النافذة. يعيد null إن تعذّر التقدير (يعود المنطق القديم)
  D.candidates = (club, by, tag) => {
    const T = G.Transfers, q = T.clubQ(club), m = club.mgr; if (!m) return null;
    const view = D.view(club); if (!view) return null;
    const st = D.STYLES[m.st] || D.STYLES.balanced, minGain = D.minGain(club);
    const season = G.S.season;
    const needs = [];
    D.shortPos(club).slice(0, 1).forEach((s) => needs.push({ pos: s.pos, kind: 'fill', gap: 99 }));
    D.weakSlots(club, view).slice(0, 3).forEach((w) => { if (!needs.some((x) => x.pos === w.pos)) needs.push({ pos: w.pos, kind: 'upgrade', gap: w.gap }); });
    const out = [];
    const sqPos = (pos) => view.pool.filter((p) => p.pos === pos).length;
    needs.forEach((nd) => {
      const rawList = (by[nd.pos] || []);
      const cands = [];
      for (let i = 0; i < rawList.length && cands.length < 12; i++) {
        const p = rawList[i];
        if (p.club === club.id || p.user) continue;
        if (p.age > (p.club ? 34 : 36)) continue;
        if (p.ovr < q - (nd.kind === 'fill' ? 8 : 1.5)) continue;
        if (p.ovr > q + (st.star > 0 ? 9 : 7)) continue;
        const fee = p.club ? T.feeFor(p) : 0;
        if (fee > club.tb || !T.canAffordWage(club, G.Players.wageFor(p))) continue;
        cands.push(p);
      }
      cands.forEach((p) => {
        let gain = 0, repl = null;
        if (nd.kind === 'upgrade') {
          const v2 = D.view(club, view.pool.concat([p]));
          if (!v2) return;
          gain = v2.val - view.val;
          const inNew = {}; v2.xi.forEach((x) => { inNew[x.id] = 1; });
          const out1 = view.xi.find((x) => !inNew[x.id]); repl = out1 ? P(out1.id) : null;
          if (!inNew[p.id] || gain < minGain) return; // لن يبدأ، أو لن يضيف ما يكفي: لا تكديس
        }
        const fee = p.club ? T.feeFor(p) : 0;
        const sc = gain * (nd.kind === 'fill' ? 0.2 : 1) + p.ovr * (nd.kind === 'fill' ? 1 : 0.15) + st.star * (p.ovr - q) * 10
          + (p.age <= 23 ? (p.pot - p.ovr) * 0.15 * (1 + st.youth * 1.5) : 0)
          - (p.age >= 31 ? (p.age - 30) * 1.2 : 0)
          - (p.club ? fee / Math.max(club.tb, 1e6) * 2 * (1 + st.value) : -0.5 * st.value)
          + hash01(club.id + '|' + p.id + '|' + season + '|' + (tag || 0)) * 1.5;
        out.push({ p, sc, gain, repl, kind: nd.kind, pos: nd.pos });
      });
    });
    // مسار المواهب: مدير «يبني بالشباب» يضمّ موهبة ≤ 21 سنة للدكة إن كان المركز غير مكتظّ
    if (st.youth > 0 && !out.length) {
      Object.keys(G.SQUAD_TEMPLATE).forEach((pos) => {
        if (sqPos(pos) > G.SQUAD_TEMPLATE[pos] - 1) return;
        (by[pos] || []).forEach((p) => {
          if (p.club === club.id || p.user || p.age > 21 || p.pot < q + 8 || p.ovr < q - 10 || p.ovr > q + 2) return;
          const fee = p.club ? T.feeFor(p) : 0;
          if (fee > club.tb * 0.12 || !T.canAffordWage(club, G.Players.wageFor(p))) return;
          out.push({ p, sc: p.pot + hash01(club.id + '|' + p.id + '|y') * 2, gain: 0, repl: null, kind: 'prospect', pos });
        });
      });
    }
    return out.sort((a, b) => b.sc - a.sc).slice(0, 3);
  };

  const posAr = (pos) => G.POS_AR[pos] || pos;
  D.explain = (club, c, fee) => {
    const p = c.p;
    if (c.kind === 'fill') return 'سدّ نقصًا في ' + posAr(c.pos) + ': ' + p.n + ' (' + p.ovr + ')';
    if (c.kind === 'prospect') return 'موهبة للمستقبل: ' + p.n + ' (' + p.age + ' سنة، إمكانات ' + p.pot + ')';
    return 'ضمّ ' + p.n + ' (' + posAr(c.pos) + '، ' + p.ovr + ')' + (c.repl ? ' ليحلّ محلّ ' + c.repl.n + ' (' + c.repl.ovr + ')' : '') + ' — يضيف ' + c.gain.toFixed(1) + ' للتشكيلة الأساسية';
  };

  // ---------- بيع الفائض بدل التكديس ----------
  // نجوم الدكة (تقييمهم قرب مستوى النادي ولن يلعبوا) فوق بديلٍ واحد لكل مركز يُعرضون لناديٍ سيبدؤون فيه فعلًا
  // الفائض: نجوم دكة (تقييمهم ≥ مستوى النادي − 2) فوق بديلٍ أول واحد لكل مركز، باستثناء المواهب الشابة
  D.surplusList = (club) => {
    const q = G.Transfers.clubQ(club);
    const view = D.view(club); if (!view) return [];
    const inXI = {}; view.xi.forEach((x) => { inXI[x.id] = 1; });
    const bench = view.pool.filter((p) => !inXI[p.id] && !p.parentPays).sort((a, b) => b.ovr - a.ovr);
    const seen = {}, surplus = [];
    bench.forEach((p) => {
      const young = p.age <= 21 && p.pot >= q + 6;
      if (p.ovr < q - 2 || young) return;
      seen[p.pos] = (seen[p.pos] || 0) + 1;
      if (seen[p.pos] > 1) surplus.push(p); // أول نجم دكة في المركز يبقى بديلًا أول
    });
    return surplus;
  };
  // عند انتهاء عقد لاعب: لا يجدّد المدير عقد فائضٍ لن يلعب (يصير حرًّا فيجد ناديًا يحتاجه)
  D.isSurplus = (club, p) => !!club && !p.user && D.surplusList(club).some((x) => x.id === p.id);
  D.offload = (club, ctx) => {
    const surplus = D.surplusList(club);
    if (!surplus.length) return 0;
    const X = D.stats, season = G.S.season; let sold = 0;
    surplus.slice(0, 2).forEach((p) => { if (offloadOne(club, p, ctx, season, X)) sold++; });
    return sold;
  };
  function offloadOne(club, p, ctx, season, X) {
    const T = G.Transfers;
    X.surplus++;
    const order = ctx.ids.filter((id) => id !== club.id).sort((a, b) => hash01(a + p.id + season) - hash01(b + p.id + season));
    const feeOf = Math.ceil(p.val * 0.75 / 25000) * 25000; // خصم على الفائض (يوافق عليه البائع لأنه لن يلعب عنده)
    let tried = 0;
    for (const bid of order) {
      const buyer = C(bid);
      if (!buyer || buyer.light) continue;
      if ((ctx.done[bid] || 0) >= (buyer.rep >= 80 ? 3 : 2)) { X.cap++; continue; }
      if (buyer.rep < club.rep - 22) { X.rep++; continue; }
      if (buyer.tb < feeOf) { X.tb++; continue; }
      if (!T.canAffordWage(buyer, G.Players.wageFor(p) - 0.08 * buyer.wcap)) { X.wage++; continue; } // سقف الأجور مرن 8% لصفقة تُحسّن التشكيلة
      const bv = D.view(buyer); if (!bv) continue;
      // مرشّح سريع: أضعف شاغل لهذا المركز في تشكيلة المشتري أضعف من اللاعب بفارق
      const slotsHere = bv.xi.filter((x) => x.slot === p.pos);
      if (!slotsHere.length) { X.floor++; continue; }
      const floor = Math.min.apply(null, slotsHere.map((x) => G.Lineup.eff(P(x.id), x.slot)));
      if (p.ovr - floor < 1.5) { X.floor++; continue; }
      if (++tried > 40) break;
      const v2 = D.view(buyer, bv.pool.concat([p]));
      if (!v2 || v2.val - bv.val < D.minGain(buyer)) { X.gain++; continue; }
      if (!T.sellerAccepts(club, buyer, p, feeOf, true)) { X.sell++; continue; }
      X.sold++;
      const wage = U.clamp(U.roundTo(G.Players.wageFor(p) * 1.05, 500), 800, 600000);
      T.execute(p, bid, feeOf, wage, 2 + Math.floor(hash01(bid + p.id + season + 'y') * 3));
      ctx.done[bid] = (ctx.done[bid] || 0) + 1;
      note(club, 'باع الفائض ' + p.n + ' (' + p.ovr + ') إلى ' + buyer.name + ' بدل تكديسه في ' + posAr(p.pos));
      note(buyer, 'ضمّ ' + p.n + ' (' + posAr(p.pos) + '، ' + p.ovr + ') ليبدأ — يضيف ' + (v2.val - bv.val).toFixed(1) + ' للتشكيلة الأساسية');
      return 1;
    }
    return loanOut(club, p, ctx, season, order, X);
  }
  // تعذّر البيع (ميزانية/أجور): يُعير النجم الفائض إلى ناديٍ سيبدأ فيه فعلًا (الإعارة بلا رسوم، وتنتهي في نهاية الموسم فيعود وتُراجَع قراراته)
  function loanOut(club, p, ctx, season, order, X) {
    const T = G.Transfers;
    if (p.age > 31) return 0;
    let tried = 0;
    for (const bid of order) {
      const buyer = C(bid);
      if (!buyer || buyer.light || (ctx.done[bid] || 0) >= 2 || buyer.rep < club.rep - 30) continue;
      const bv = D.view(buyer); if (!bv) continue;
      const slotsHere = bv.xi.filter((x) => x.slot === p.pos);
      if (!slotsHere.length) continue;
      if (p.ovr - Math.min.apply(null, slotsHere.map((x) => G.Lineup.eff(P(x.id), x.slot))) < 1.5) continue;
      if (++tried > 40) break;
      const v2 = D.view(buyer, bv.pool.concat([p]));
      if (!v2 || v2.val - bv.val < 0.8 * D.minGain(buyer)) continue;
      X.loan++;
      T.execute(p, bid, 0, 0, 0, { loan: true });
      ctx.done[bid] = (ctx.done[bid] || 0) + 1;
      note(club, 'أعار الفائض ' + p.n + ' (' + p.ovr + ') إلى ' + buyer.name + ' ليلعب بدل جلوسه على الدكة');
      note(buyer, 'استعار ' + p.n + ' (' + posAr(p.pos) + '، ' + p.ovr + ') ليبدأ — يضيف ' + (v2.val - bv.val).toFixed(1) + ' للتشكيلة الأساسية');
      return 1;
    }
    return 0;
  }

  // ---------- مراجعة نهاية الموسم: إقالة/تقاعد وتعيين ----------
  // يُستدعى قبل تصفير الجداول (القراءة من الترتيب النهائي). الحتمية: hash(club, season)
  D.review = (season) => {
    const S = G.S; if (!S || !S.clubs) return [];
    D.init();
    const changes = [], taken = {}; Object.values(S.clubs).forEach((c) => { if (c.mgr) taken[c.mgr.n] = 1; });
    G.World.order().forEach((lg) => {
      const order = G.World.sortedOf(lg); if (!order || order.length < 8) return;
      const byRep = order.slice().sort((a, b) => S.clubs[b].rep - S.clubs[a].rep || (a < b ? -1 : 1));
      const n = order.length;
      order.forEach((id, i) => {
        const c = S.clubs[id], m = c && c.mgr; if (!m) return;
        const exp = byRep.indexOf(id), d = i - exp; // موجب = أسوأ من المتوقع
        const rel = i >= n - 3;
        let pFire = rel ? 0.5 : d >= 6 ? 0.5 : d >= 4 ? 0.25 : d >= 2 ? 0.08 : d <= -3 ? 0 : 0.03;
        if (season - m.since < 1) pFire *= 0.5; // لا إقالة سريعة لمن عُيّن حديثًا
        const tenure = season - m.since;
        const retire = m.age >= 66 && hash01(id + '|' + season + '|ret') < 0.25 + (m.age - 66) * 0.08;
        const fired = !retire && hash01(id + '|' + season + '|fire') < pFire;
        m.age++; m.rt = U.clamp(m.rt + (d <= -3 ? 2 : d >= 4 ? -2 : 0), 40, 96);
        if (!fired && !retire) return;
        const old = m.n; delete taken[old];
        const nm = D.make(c, season + 1, (m.hist ? m.hist.length : 0) + 1, taken); taken[nm.n] = 1;
        nm.hist = [{ n: old, a: m.since, b: season }].concat(m.hist || []).slice(0, 2);
        nm.log = [{ s: season, t: (retire ? 'خلف ' + old + ' الذي اعتزل التدريب' : 'خلف ' + old + ' بعد موسم دون التوقعات (المركز ' + (i + 1) + ')') }];
        c.mgr = nm;
        changes.push({ id, from: old, to: nm.n, why: retire ? 'retire' : 'fired', pos: i + 1 });
        if (S.user && P(S.user) && P(S.user).club === id && G.Inbox) {
          G.Inbox.add('news', 'مدير فني جديد لناديك', (retire ? 'اعتزل ' : 'أُقيل ') + old + ' بعد ' + Math.max(1, tenure) + ' ' + (tenure > 2 ? 'مواسم' : 'موسم') + ' وعُيّن ' + nm.n + ' (' + D.STYLES[nm.st].ar + '). ' + D.STYLES[nm.st].d);
        }
      });
    });
    S.mgrChanges = changes.slice(0, 30);
    return changes;
  };

  G.migrations = G.migrations || [];
  G.migrations.push(() => { if (G.S && G.S.clubs) D.init(); });
})(window.G = window.G || {});
