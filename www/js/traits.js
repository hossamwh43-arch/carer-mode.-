/* traits.js — «القدرات المميزة» للنجوم (Build 28).
   المشكلة: كل مهاجم بتقييم 94 يشبه أي مهاجم بتقييم 80 في توزيع الأهداف، فلا يُحسّ بمنافسة هالاند ويامال وأمثالهما.
   الحل: يحمل كل نجم (تقييم ≥ 82) حتى 3 قدرات مسمّاة تُشتق تلقائيًا من شكل سماته (قاعدة حتمية بلا عشوائية) مع قائمة مُنتقاة لأيقونات
   اللعبة بالاسم. أثر القدرة: (1) حصة أكبر من أهداف فريقه/تمريراته الحاسمة (وزن الاختيار في Match.scorerWeight/assistWeight) —
   مجموع أهداف الفريق لا يتغير فلا تضخّم في الدوريات، (2) رفع صغير مسقوف لقوة الفريق (هجوم/وسط/دفاع) في Lineup.ratings.
   لا يُطبَّق على لاعب المستخدم أبدًا (حتى لا تتغير موازنة مسيرته). لا يستهلك U.rnd: يُعاد حسابها عند كل نهاية موسم فتظهر قدرات
   النجوم الجدد وتزول من المتراجعين، وتُرحَّل الحفظات القديمة تلقائيًا. تُخزَّن في p.tr (مصفوفة معرّفات). */
(function (G) {
  'use strict';
  const T = (G.Traits = {});
  T.MIN_OVR = 82;     // أدنى تقييم لحمل قدرة بالقاعدة
  T.CURATED_MIN = 80; // الأيقونات المنتقاة تحتفظ بقدراتها طالما بقي تقييمها ≥ هذا
  T.MAX = 3;

  // g: مضاعف حصة التهديف، a: مضاعف حصة الصناعة، tA/tM/tD: رفع قوة الفريق (هجوم/وسط/دفاع) — تُجمع وتُسقَّف في teamLift
  T.DEFS = {
    machine:  { ar: 'آلة أهداف',      ico: 'flame',    g: 1.30, d: 'يستحوذ على حصة هائلة من أهداف فريقه' },
    sniper:   { ar: 'قنّاص',          ico: 'target',   g: 1.20, d: 'إنهاء قاتل: فرصه أكثر تحويلًا إلى أهداف' },
    fox:      { ar: 'ثعلب المنطقة',   ico: 'brain',    g: 1.10, d: 'ذكاء هجومي: يظهر حيث تسقط الكرة' },
    power:    { ar: 'قوة بدنية',      ico: 'dumbbell', g: 1.08, tA: 0.10, d: 'يحسم الصراع البدني ويفتح المساحات' },
    speed:    { ar: 'صاروخ',          ico: 'bolt',     g: 1.08, a: 1.10, tA: 0.10, d: 'سرعة خارقة تُربك الدفاعات' },
    dribbler: { ar: 'ساحر المراوغة',  ico: 'sparkle',  g: 1.08, a: 1.20, tA: 0.10, d: 'مراوغ يصنع الفارق في المواجهات الفردية' },
    maestro:  { ar: 'مايسترو',        ico: 'eye',      a: 1.45, tM: 0.40, d: 'رؤية وتمريرات تصنع أهداف زملائه' },
    engine:   { ar: 'محرك الوسط',     ico: 'battery',  tM: 0.45, tD: 0.15, a: 1.10, d: 'جهد لا ينضب بين الدفاع والهجوم' },
    anchor:   { ar: 'محور الارتكاز',  ico: 'crown2',   tM: 0.25, tD: 0.45, d: 'يقطع الهجمات ويوزّع اللعب' },
    wall:     { ar: 'جدار دفاعي',     ico: 'shield',   tD: 0.50, d: 'قلب دفاع يصعب تجاوزه' },
    keeper:   { ar: 'حارس المعجزات',  ico: 'glove',    tD: 1.00, d: 'تصدّيات تقلب نتائج المباريات' },
    wingback: { ar: 'ظهير هجومي',     ico: 'pass',     g: 1.25, a: 1.45, tA: 0.10, d: 'يصنع ويسجّل من الطرف مثل جناح' },
    prodigy:  { ar: 'موهبة خارقة',    ico: 'rocket',   g: 1.04, a: 1.04, d: 'موهبة شابة تتألق مبكرًا فتنال حصة أكبر قليلًا من أهداف فريقها' }
  };
  T.ORDER = ['machine', 'sniper', 'fox', 'speed', 'dribbler', 'maestro', 'wingback', 'engine', 'anchor', 'wall', 'keeper', 'power', 'prodigy'];
  T.CAP = { g: 1.45, a: 1.6, tA: 0.9, tM: 0.8, tD: 1.2 };

  // أيقونات اللعبة المنتقاة (الأسماء كما في data_players): قدرات مميِّزة معروفة تُضاف فوق القاعدة
  T.CURATED = {
    'Erling Haaland': ['machine', 'power', 'fox'],
    'Lamine Yamal': ['dribbler', 'speed', 'prodigy'],
    'Kylian Mbappé': ['speed', 'sniper'],
    'Harry Kane': ['machine', 'maestro'],
    'Ousmane Dembélé': ['sniper', 'speed', 'dribbler'],
    'Jamal Musiala': ['dribbler', 'maestro'],
    'Jude Bellingham': ['engine', 'sniper'],
    'Rodri': ['anchor', 'maestro'],
    'Vinícius Júnior': ['dribbler', 'speed'],
    'Raphinha': ['speed', 'dribbler'],
    'Michael Olise': ['dribbler', 'maestro'],
    'Florian Wirtz': ['maestro', 'sniper'],
    'Cole Palmer': ['maestro', 'sniper'],
    'Lautaro Martínez': ['sniper', 'fox'],
    'Mohamed Salah': ['sniper', 'speed'],
    'Pedri': ['maestro', 'engine'],
    'Federico Valverde': ['engine', 'maestro'],
    'Nicolò Barella': ['engine', 'maestro'],
    'Thibaut Courtois': ['keeper'],
    'Gianluigi Donnarumma': ['keeper'],
    'Rúben Dias': ['wall'],
    'Virgil van Dijk': ['wall'],
    'Kenan Yıldız': ['dribbler', 'prodigy'],
    'Désiré Doué': ['dribbler', 'prodigy'],
    'João Neves': ['engine', 'prodigy'],
    'Achraf Hakimi': ['wingback', 'speed'],
    'Nuno Mendes': ['wingback']
  };

  // قاعدة الاشتقاق من شكل السمات (حتمية): أول T.MAX قدرات بحسب ترتيب الأولوية
  T.derive = (p) => {
    if (!p || p.user || !p.a) return [];
    const a = p.a, pos = p.pos, grp = G.POS_GROUP[pos], cur = T.CURATED[p.n];
    const out = [], rule = [];
    const add = (id) => { if (rule.indexOf(id) < 0) rule.push(id); };
    if (cur && p.ovr >= T.CURATED_MIN) cur.forEach((id) => out.push(id)); // المنتقاة أولًا وبترتيبها (لا تُقصى بالقاعدة)
    if (p.ovr >= T.MIN_OVR) {
      const att = pos === 'ST' || pos === 'LW' || pos === 'RW' || pos === 'CAM';
      const wing = pos === 'LW' || pos === 'RW' || pos === 'CAM';
      if (pos === 'ST' && a.sho >= 94 && a.phy >= 88 && p.ovr >= 88) add('machine');
      else if (att && a.sho >= 93) add('sniper');
      if (pos === 'ST' && a.iq >= 96 && a.sho >= 90) add('fox');
      if ((att || pos === 'LB' || pos === 'RB') && a.pac >= 95) add('speed');
      if (wing && a.dri >= 94) add('dribbler');
      if ((grp === 'mid' || wing) && a.pas >= 95) add('maestro');
      if ((pos === 'LB' || pos === 'RB') && a.pac >= 88 && a.pas >= 84 && a.dri >= 83 && p.ovr >= 85) add('wingback');
      if (pos === 'CM' && a.phy >= 88 && a.pas >= 90 && a.dri >= 86 && a.def >= 75) add('engine');
      if (pos === 'CDM' && a.def >= 95) add('anchor');
      if (pos === 'CB' && a.def >= 96) add('wall');
      if (pos === 'GK' && a.gk >= 91) add('keeper');
      if ((pos === 'ST' || pos === 'CB') && a.phy >= 95) add('power');
      if (p.age <= 21 && p.ovr >= 84) add('prodigy');
    }
    // قدرات القاعدة بأفضلية الترتيب العام؛ «آلة أهداف» تُغني عن «قنّاص»؛ تُكمل ما بقي من السقف بعد المنتقاة
    rule.sort((x, y) => T.ORDER.indexOf(x) - T.ORDER.indexOf(y));
    const all = out.slice();
    rule.forEach((id) => { if (all.indexOf(id) < 0) all.push(id); });
    const i = all.indexOf('sniper'); if (i >= 0 && all.indexOf('machine') >= 0) all.splice(i, 1);
    return all.slice(0, T.MAX);
  };

  T.get = (p) => (p && p.tr) || [];
  T.has = (p, id) => !!(p && p.tr && p.tr.indexOf(id) >= 0);
  // مضاعف حصة التهديف/الصناعة (k = 'g' | 'a') بسقف
  T.mult = (p, k) => {
    const tr = p && p.tr; if (!tr || !tr.length) return 1;
    let m = 1;
    for (let i = 0; i < tr.length; i++) { const d = T.DEFS[tr[i]]; if (d && d[k]) m *= d[k]; }
    return m > T.CAP[k] ? T.CAP[k] : m;
  };
  // رفع قوة الفريق من قدرات التشكيلة الأساسية (مسقوف)
  T.teamLift = (xi) => {
    let A = 0, M = 0, D = 0;
    for (let i = 0; i < xi.length; i++) {
      const p = G.S.players[xi[i].id], tr = p && p.tr; if (!tr) continue;
      for (let j = 0; j < tr.length; j++) { const d = T.DEFS[tr[j]]; if (d) { A += d.tA || 0; M += d.tM || 0; D += d.tD || 0; } }
    }
    const C = T.CAP;
    return { A: Math.min(A, C.tA), M: Math.min(M, C.tM), D: Math.min(D, C.tD) };
  };

  // يحدّث p.tr؛ يعيد true لو تغيّرت
  T.refresh = (p) => {
    const nu = T.derive(p), old = p.tr || [];
    if (nu.length === old.length && nu.every((x, i) => x === old[i])) return false;
    if (nu.length) p.tr = nu; else delete p.tr;
    return true;
  };
  T.refreshAll = () => {
    const S = G.S; if (!S || !S.players) return 0;
    let n = 0;
    Object.keys(S.players).forEach((id) => { if (T.refresh(S.players[id])) n++; });
    return n;
  };
  // حاملو القدرات (للعرض): مرتّبون بالتقييم
  T.holders = (id) => Object.values(G.S.players).filter((p) => p.tr && p.tr.length && (!id || p.tr.indexOf(id) >= 0)).sort((x, y) => y.ovr - x.ovr);

  G.migrations = G.migrations || [];
  G.migrations.push(() => { if (G.S) T.refreshAll(); });
})(window.G = window.G || {});
