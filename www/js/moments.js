/* moments.js — اللحظات التفاعلية: قرارات اللاعب أثناء المباراة (تمرير، تسديد، مراوغة، افتكاك...) */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const GRP = G.POS_GROUP;
  const Moments = (G.Moments = {});

  const lvl = (v, hi, mid) => (v >= hi ? 'عالية' : v >= mid ? 'متوسطة' : 'منخفضة');
  const clamp = U.clamp;

  // تخطيط خطوات اللحظات مسبقًا بحسب مركز اللاعب ودقائق مشاركته
  Moments.plan = (m) => {
    const u = P(G.S.user), grp = GRP[u.pos];
    const base = { att: 5, mid: 4.5, def: 4, gk: 3 }[grp];
    let from = 0, to = 0;
    if (m.uState === 'start') { from = 2; to = m.uPlan.outAt != null ? m.uPlan.outAt : 90; }
    else if (m.uState === 'bench' && m.uPlan.inAt != null) { from = m.uPlan.inAt + 1; to = 90; }
    m.mom = [];
    if (to - from < 8) return;
    const n = Math.max(1, Math.round(base * (to - from) / 90 + U.rnd() - 0.5));
    const toStep = (mm) => (mm <= 45 ? mm : mm + (m.t1 - 45));
    const cand = [];
    for (let mmv = from; mmv <= Math.min(90, to); mmv++) cand.push(toStep(mmv));
    U.shuffle(cand);
    const chosen = [];
    cand.forEach((c) => { if (chosen.length < n && chosen.every((x) => Math.abs(x - c) >= 5)) chosen.push(c); });
    m.mom = chosen.sort((a, b) => a - b);
  };

  // أسماء السمات القصيرة للتلميح (يرى اللاعب أي قدرة تؤثر في نسبة النجاح)
  const AT = { pac: 'السرعة', sho: 'التسديد', pas: 'التمرير', dri: 'المراوغة', def: 'الدفاع', phy: 'القوة', iq: 'الوعي', gk: 'الحراسة' };
  const pct = (v) => Math.round(v * 100) + '٪';
  const lvl3 = (v, hi, mid) => (v >= hi ? 'عالية' : v >= mid ? 'متوسطة' : 'ضعيفة');

  // أوزان اختيار الموقف بحسب المجموعة والمركز (الموقف الذي ظهر للتوّ يقلّ وزنه حتى لا يتكرر)
  const wings = (s) => s === 'LW' || s === 'RW', fb = (s) => s === 'LB' || s === 'RB';
  const WT = {
    att: (s) => ({ edge: 1, counter: 0.9, cross: wings(s) ? 1.1 : 0, header: s === 'ST' ? 1 : 0.5, through: 0.8, oneonone: 0.5, freekick: 0.3, penalty: 0.14, duel: wings(s) ? 1.2 : 0.5, pressing: 0.5, volley: 0.5, tackle: 0.12, onetwo: 0.5, corner: wings(s) ? 0.4 : 0 }),
    mid: (s) => ({ tackle: s === 'CDM' ? 1.2 : s === 'CM' ? 0.7 : 0.3, through: s === 'CAM' ? 1.2 : 0.8, edge: 0.8, freekick: 0.4, penalty: 0.1, corner: 0.5, onetwo: 0.9, pressing: 0.9, longpass: 0.8, volley: 0.4, counter: 0.5, header: 0.15, duel: 0.4, block: s === 'CDM' ? 0.4 : 0.1 }),
    def: (s) => ({ tackle: 0.9, aerial: 0.9, defcorner: 0.6, block: 0.6, safebuild: 0.8, cross: fb(s) ? 1.1 : 0, longpass: 0.5, pressing: 0.3, header: s === 'CB' ? 0.25 : 0.05, duel: fb(s) ? 0.5 : 0, corner: fb(s) ? 0.3 : 0 }),
    gk: () => ({ shotstop: 1, gkcross: 0.8, penaltysave: 0.2, gk1v1: 0.6, distribution: 0.7, sweeper: 0.4 })
  };

  Moments.make = (m) => {
    const S = G.S, u = P(S.user), s = m.side, o = s === 'h' ? 'a' : 'h';
    const slot = G.Live.userSlot(m) || u.pos;
    const grp = GRP[slot];
    const gro = m.gro || { syn: 0, glow: 0, bonus: 0 };
    // زخم التألق وزملاء الطراز الرفيع يرفعان قدراتك الفعلية في هذه اللحظات (يظهر ذلك في النسب والتلميحات)
    const a = gro.bonus > 0 ? (() => { const b = {}; Object.keys(u.a).forEach((k) => { b[k] = Math.min(99, u.a[k] + gro.bonus); }); return b; })() : u.a;
    const fatPct = m.fat[u.id] != null ? m.fat[u.id] : 100;
    const penPos = slot !== u.pos ? Math.min(15, G.Players.posPenalty(u.pos, slot)) : 0; // اللعب خارج مركزك الأصلي يقلّل النجاح
    const sf = (0.85 + 0.15 * fatPct / 100) * (1 - penPos * 0.006);
    const adjA = -(m.R[o].D - 75) * 0.004, adjD = -(m.R[o].A - 75) * 0.004;
    const pp = (v) => clamp(v * sf, 0.10, 0.93);                 // احتمال النجاح
    const pg = (v, lo, hi) => clamp(v * sf, lo == null ? 0.02 : lo, hi == null ? 0.9 : hi); // احتمال الهدف
    const W = (w) => { let t = 0, n = 0; Object.keys(w).forEach((k) => { t += (a[k] != null ? a[k] : 50) * w[k]; n += w[k]; }); return t / n; }; // مزيج سمات موزون
    const hgt = (u.h - 180) * 0.5;

    // بناء خيار: يحسب القيمة المتوقعة (للّعب الآلي) والتلميح بنسب مئوية وسمات اللاعب المؤثرة
    const mk = (id, k, label, extra) => {
      const o2 = Object.assign({ id, k, label }, extra);
      const succ = o2.pp != null ? o2.pp : null;
      o2.ev = o2.k === 'shot' ? o2.pg : (o2.k === 'pass' || o2.k === 'drib' || o2.k === 'press') ? o2.pp * o2.pg : o2.k === 'safe' ? o2.pp * 0.03 : o2.pp * 0.4 + 0.05;
      let h = o2.k === 'shot' ? 'فرصة التسجيل: ' + pct(o2.pg)
        : o2.k === 'safe' ? 'النجاح: ' + pct(succ) + ' • مخاطرة منخفضة جدًا'
        : o2.k === 'def' ? 'النجاح: ' + pct(succ) + (o2.foul ? ' • خطر الإنذار: ' + pct(o2.foul) : '') + (o2.pc ? ' • إن فشلتَ: خطر هدف ' + pct(o2.pc) : '')
        : 'النجاح: ' + pct(succ) + ' • فرصة هدف عند النجاح: ' + pct(o2.pg);
      if (o2.at) {
        const ks = Object.keys(o2.at).sort((x, y) => o2.at[y] - o2.at[x]).slice(0, 2);
        h += ' — تعتمد على: ' + ks.map((x) => AT[x] + ' ' + Math.round(a[x] != null ? a[x] : 50)).join(' · ');
      }
      o2.hint = h;
      // حقول عرض منظّمة للواجهة (تزيين فقط؛ لا تدخل في أي حساب): النسبة الرئيسية، سطر ثانوي، السمات المؤثرة
      o2.main = o2.k === 'shot' ? o2.pg : o2.pp;
      o2.sub = o2.k === 'shot' ? '' : o2.k === 'safe' ? 'مخاطرة منخفضة جدًا'
        : o2.k === 'def' ? [o2.foul ? 'خطر الإنذار ' + pct(o2.foul) : '', o2.pc ? 'إن فشلتَ: خطر هدف ' + pct(o2.pc) : ''].filter(Boolean).join(' • ')
        : 'عند النجاح: فرصة هدف ' + pct(o2.pg);
      o2.atl = o2.at ? Object.keys(o2.at).sort((x, y) => o2.at[y] - o2.at[x]).slice(0, 2).map((x) => AT[x] + ' ' + Math.round(a[x] != null ? a[x] : 50)) : [];
      return o2;
    };

    // اختيار الموقف بوزن يناسب مركزك دون تكرار الموقف السابق
    const wt = WT[grp](slot), keys = Object.keys(wt);
    const sc = U.wpick(keys, (k) => wt[k] * (k === m.lastSc ? 0.12 : 1)) || keys[0];
    m.lastSc = sc;
    const fk = W({ sho: 0.55, pas: 0.3, iq: 0.15 });
    const hs = W({ phy: 0.5, sho: 0.25, iq: 0.25 }) + hgt;   // مهارة الرأسيات: القوة + الطول
    const aer = W({ phy: 0.5, def: 0.3, iq: 0.2 }) + hgt;

    let title, text, options, atk = true;
    switch (sc) {
      case 'edge':
        title = 'فرصة عند حافة المنطقة';
        text = 'الكرة تصلك عند حافة منطقة الجزاء والمدافعون يقتربون منك. ماذا تفعل؟';
        options = [
          mk('shoot', 'shot', 'سدّد مباشرة', { pg: pg(0.09 + (a.sho - 65) * 0.0035 + adjA * 0.6, 0.03, 0.30), at: { sho: 1 } }),
          mk('pass', 'pass', 'مرّر لزميل في موقع أفضل', { pp: pp(0.5 + (a.pas - 60) * 0.007 + adjA), pg: 0.27, at: { pas: 1 } }),
          mk('dribble', 'drib', 'راوغ المدافع ثم سدّد', { pp: pp(0.34 + (a.dri - 60) * 0.008 + adjA), pg: pg(0.30 + (a.sho - 65) * 0.004, 0.18, 0.5), at: { dri: 0.7, sho: 0.3 } }),
          mk('skill', 'drib', 'نفّذ حركة مهارية ثم سدّد', { pp: pp(0.30 + (W({ dri: 0.7, iq: 0.3 }) - 60) * 0.010 + adjA), pg: pg(0.32 + (a.sho - 65) * 0.004, 0.18, 0.5), at: { dri: 0.7, iq: 0.3 } })
        ];
        break;
      case 'counter':
        title = 'هجمة مرتدة سريعة';
        text = 'فريقك استعاد الكرة وأمامك مساحة كبيرة نحو مرمى الخصم.';
        options = [
          mk('run', 'drib', 'انطلق بالكرة بسرعة نحو المرمى', { pp: pp(0.36 + (a.pac - 60) * 0.008 + adjA), pg: 0.34, at: { pac: 1 } }),
          mk('long', 'pass', 'مرّر كرة طولية لزميلك المنطلق', { pp: pp(0.5 + (a.pas - 60) * 0.006 + adjA), pg: 0.30, at: { pas: 1 } }),
          mk('side', 'pass', 'مرّر لزميلك بجانبك ثم اندفع', { pp: pp(0.56 + (W({ pas: 0.6, iq: 0.4 }) - 60) * 0.006 + adjA), pg: 0.26, at: { pas: 0.6, iq: 0.4 } }),
          mk('hold', 'safe', 'تمهّل وحافظ على الكرة', { pp: 0.88 })
        ];
        break;
      case 'cross':
        title = 'فرصة عرضية';
        text = 'الكرة معك على الطرف وزملاؤك يتحركون داخل المنطقة.';
        options = [
          mk('cross', 'pass', 'ارفع عرضية داخل المنطقة', { pp: pp(0.46 + (a.pas - 60) * 0.007 + adjA), pg: 0.20, at: { pas: 1 } }),
          mk('cutin', 'drib', 'ادخل للداخل وسدّد', { pp: pp(0.38 + (a.dri - 60) * 0.008 + adjA), pg: pg(0.2 + (a.sho - 65) * 0.003, 0.1, 0.4), at: { dri: 0.7, sho: 0.3 } }),
          mk('cutback', 'pass', 'مرّر كرة أرضية للخلف (كتباك)', { pp: pp(0.48 + (W({ pas: 0.6, iq: 0.4 }) - 60) * 0.007 + adjA), pg: 0.27, at: { pas: 0.6, iq: 0.4 } }),
          mk('back', 'safe', 'أعد الكرة للخلف', { pp: 0.9 })
        ];
        break;
      case 'through':
        title = 'مساحة خلف الدفاع';
        text = 'ترى زميلك يتحرك خلف خط دفاع الخصم، لكن الزاوية ضيقة.';
        options = [
          mk('through', 'pass', 'مرّر كرة اختراق', { pp: pp(0.40 + (a.pas - 60) * 0.008 + (a.iq - 60) * 0.003 + adjA), pg: 0.36, at: { pas: 0.7, iq: 0.3 } }),
          mk('long', 'shot', 'جرّب تسديدة بعيدة', { pg: pg(0.06 + (a.sho - 65) * 0.003, 0.02, 0.2), at: { sho: 1 } }),
          mk('dribpass', 'pass', 'راوغ مدافعًا ثم مرّر', { pp: pp(0.42 + (W({ dri: 0.5, pas: 0.5 }) - 60) * 0.007 + adjA), pg: 0.32, at: { dri: 0.5, pas: 0.5 } }),
          mk('safe', 'safe', 'مرّر تمريرة آمنة', { pp: 0.9 })
        ];
        break;
      case 'oneonone':
        title = 'انفراد بالحارس!';
        text = 'تمريرة اختراق تضعك وجهًا لوجه أمام الحارس. القرار لك.';
        options = [
          mk('place', 'shot', 'سدّد في الزاوية البعيدة', { pg: pg(0.40 + (W({ sho: 0.8, iq: 0.2 }) - 65) * 0.005 + adjA * 0.6, 0.12, 0.72), at: { sho: 0.8, iq: 0.2 }, sv: '🧤 الحارس يغلق الزاوية ويتصدى' }),
          mk('chip', 'shot', 'لُعبها فوق الحارس', { pg: pg(0.30 + (W({ sho: 0.6, dri: 0.4 }) - 62) * 0.006 + adjA * 0.5, 0.08, 0.65), at: { sho: 0.6, dri: 0.4 }, ms: '↗️ الكرة ترتفع أكثر من اللازم وتمرّ فوق العارضة' }),
          mk('power', 'shot', 'سدّد بقوة في وسط المرمى', { pg: pg(0.34 + (W({ sho: 0.6, phy: 0.4 }) - 63) * 0.004 + adjA * 0.6, 0.10, 0.55), at: { sho: 0.6, phy: 0.4 } }),
          mk('round', 'drib', 'راوغ الحارس ثم سدّد', { pp: pp(0.42 + (a.dri - 60) * 0.008 + adjA), pg: 0.66, at: { dri: 1 } })
        ];
        break;
      case 'header':
        title = 'كرة عالية داخل المنطقة';
        text = 'عرضية تُرفع نحو المنطقة وأنت بين مدافعين. طولك وقوتك سيحسمان الموقف.';
        options = [
          mk('power', 'shot', 'ارتقِ واضرب الكرة برأسك بقوة', { pg: pg(0.12 + (hs - 60) * 0.004 + adjA * 0.5, 0.04, 0.34), at: { phy: 0.5, sho: 0.25, iq: 0.25 }, ms: '↗️ الرأسية تعلو العارضة' }),
          mk('place', 'shot', 'وجّه الرأسية نحو الزاوية', { pg: pg(0.10 + (W({ sho: 0.5, iq: 0.3, phy: 0.2 }) + hgt * 0.4 - 60) * 0.005 + adjA * 0.5, 0.03, 0.32), at: { sho: 0.5, iq: 0.3 } }),
          mk('flick', 'pass', 'حوّل الكرة برأسك لزميلك', { pp: pp(0.55 + (W({ iq: 0.6, pas: 0.4 }) - 60) * 0.005 + adjA), pg: 0.30, at: { iq: 0.6, pas: 0.4 } }),
          mk('chest', 'drib', 'اخمد الكرة بصدرك ثم سدّد', { pp: pp(0.40 + (W({ dri: 0.6, phy: 0.4 }) - 60) * 0.007 + adjA), pg: 0.30, at: { dri: 0.6, phy: 0.4 } })
        ];
        break;
      case 'freekick':
        title = 'ركلة حرة مباشرة';
        text = 'ركلة حرة على بعد نحو 22 مترًا من المرمى وأنت المكلَّف بتنفيذها.';
        options = [
          mk('curl', 'shot', 'لُفّ الكرة فوق الحائط', { pg: pg(0.07 + (fk - 65) * 0.0035 + adjA * 0.3, 0.02, 0.24), at: { sho: 0.55, pas: 0.3 }, tag: '— من ركلة حرة مباشرة', ms: '↗️ الكرة تلتف لكن تمرّ بجوار القائم' }),
          mk('power', 'shot', 'سدّد بقوة أسفل الحائط', { pg: pg(0.06 + (W({ sho: 0.7, phy: 0.3 }) - 65) * 0.003, 0.02, 0.2), at: { sho: 0.7, phy: 0.3 }, tag: '— من ركلة حرة مباشرة' }),
          mk('cross', 'pass', 'ارفعها إلى منطقة الجزاء', { pp: pp(0.55 + (a.pas - 60) * 0.007 + adjA), pg: 0.20, at: { pas: 1 } }),
          mk('short', 'pass', 'مرّر قصيرة لزميل', { pp: pp(0.82 + (a.pas - 60) * 0.002), pg: 0.12, at: { pas: 1 } })
        ];
        break;
      case 'penalty':
        title = 'ركلة جزاء!';
        text = 'حصل فريقك على ركلة جزاء وتقدّمتَ لتنفيذها. الجميع ينظر إليك.';
        options = [
          mk('power', 'shot', 'سدّد بقوة في المنتصف', { pg: pg(0.70 + (a.sho - 65) * 0.003, 0.45, 0.90), at: { sho: 1 }, tag: '— من ركلة جزاء', sv: '🧤 الحارس يتصدى لركلة الجزاء!' }),
          mk('corner', 'shot', 'وجّهها لزاوية المرمى', { pg: pg(0.66 + (W({ sho: 0.7, iq: 0.3 }) - 65) * 0.005, 0.35, 0.92), at: { sho: 0.7, iq: 0.3 }, tag: '— من ركلة جزاء', sv: '🧤 الحارس يتوقع الزاوية ويتصدى!', ms: '↗️ ركلة الجزاء تخرج بجوار القائم' }),
          mk('panenka', 'shot', 'نفّذها بطريقة بانينكا', { pg: pg(0.58 + (W({ dri: 0.5, sho: 0.5 }) - 65) * 0.004, 0.30, 0.85), at: { dri: 0.5, sho: 0.5 }, tag: '— من ركلة جزاء بطريقة بانينكا', sv: '🧤 الحارس لم يتحرك والكرة بين يديه!' }),
          mk('stutter', 'shot', 'تباطأ في الجري ثم سدّد', { pg: pg(0.62 + (W({ iq: 0.6, sho: 0.4 }) - 62) * 0.005, 0.35, 0.88), at: { iq: 0.6, sho: 0.4 }, tag: '— من ركلة جزاء', sv: '🧤 الحارس يقرأ الحركة ويتصدى!' })
        ];
        break;
      case 'duel':
        title = 'مواجهة فردية على الطرف';
        text = 'الكرة معك أمام مدافع وحيد وأمامك مساحة للعبور.';
        options = [
          mk('speed', 'drib', 'انطلق بسرعتك متجاوزًا المدافع', { pp: pp(0.38 + (a.pac - 60) * 0.009 + adjA), pg: 0.28, at: { pac: 1 } }),
          mk('skill', 'drib', 'استخدم حركة مهارية ثم انطلق', { pp: pp(0.34 + (a.dri - 60) * 0.010 + adjA), pg: 0.28, at: { dri: 1 } }),
          mk('shield', 'pass', 'احمِ الكرة بجسدك ثم مرّر', { pp: pp(0.58 + (W({ phy: 0.6, pas: 0.4 }) - 60) * 0.006), pg: 0.22, at: { phy: 0.6, pas: 0.4 } }),
          mk('cutshot', 'shot', 'اقطع للداخل وسدّد', { pg: pg(0.10 + (W({ sho: 0.7, dri: 0.3 }) - 65) * 0.0035 + adjA * 0.5, 0.03, 0.28), at: { sho: 0.7, dri: 0.3 } })
        ];
        break;
      case 'pressing':
        title = 'فرصة ضغط عالٍ';
        text = 'الخصم يبني الهجمة من الخلف وتمريرة ضعيفة قد تمنحك الكرة في مكان متقدّم.';
        options = [
          mk('sprint', 'press', 'اندفع لتضغط على حامل الكرة', { pp: pp(0.40 + (W({ pac: 0.5, phy: 0.3, def: 0.2 }) - 60) * 0.008 + adjD), pg: 0.30, at: { pac: 0.5, phy: 0.3 } }),
          mk('lane', 'press', 'اقطع خط التمرير بذكاء', { pp: pp(0.46 + (W({ iq: 0.6, def: 0.4 }) - 60) * 0.007 + adjD), pg: 0.26, at: { iq: 0.6, def: 0.4 } }),
          mk('jockey', 'press', 'ضايق الخصم دون تهوّر', { pp: pp(0.58 + (W({ def: 0.5, iq: 0.3, pac: 0.2 }) - 60) * 0.004 + adjD), pg: 0.14, at: { def: 0.5, iq: 0.3 } }),
          mk('hold', 'safe', 'حافظ على مركزك في التشكيلة', { pp: 0.9 })
        ];
        atk = false;
        break;
      case 'volley':
        title = 'كرة مرتدة عند حافة المنطقة';
        text = 'الكرة تسقط أمامك بعد ارتدادها والدفاع غير منظّم.';
        options = [
          mk('volley', 'shot', 'سدّد مباشرة من الهواء', { pg: pg(0.07 + (a.sho - 65) * 0.004 + adjA * 0.4, 0.02, 0.24), at: { sho: 1 }, ms: '↗️ التسديدة الطائرة تعلو العارضة' }),
          mk('control', 'drib', 'اخمد الكرة ثم سدّد', { pp: pp(0.60 + (a.dri - 60) * 0.006 + adjA), pg: 0.20, at: { dri: 1 } }),
          mk('lay', 'pass', 'ابعث الكرة لزميل أفضل مركزًا', { pp: pp(0.64 + (a.pas - 60) * 0.006 + adjA), pg: 0.26, at: { pas: 1 } }),
          mk('clear', 'safe', 'أبعد الكرة وحافظ على التنظيم', { pp: 0.88 })
        ];
        break;
      case 'onetwo':
        title = 'فرصة تمريرة ثنائية';
        text = 'زميلك قريب منك ومساحة مفتوحة أمامكما.';
        options = [
          mk('wall', 'pass', 'مرّر ثنائية سريعة واندفع', { pp: pp(0.42 + (W({ pas: 0.45, iq: 0.4, pac: 0.15 }) - 60) * 0.008 + adjA), pg: 0.34, at: { pas: 0.45, iq: 0.4 } }),
          mk('step', 'pass', 'تقدّم بالكرة ثم مرّر', { pp: pp(0.55 + (a.pas - 60) * 0.006 + adjA), pg: 0.24, at: { pas: 1 } }),
          mk('switch', 'pass', 'غيّر اللعب للجهة الأخرى', { pp: pp(0.46 + (a.pas - 60) * 0.009 + adjA), pg: 0.20, at: { pas: 1 } }),
          mk('safe', 'safe', 'احتفظ بالكرة', { pp: 0.9 })
        ];
        break;
      case 'corner':
        title = 'ركنية لفريقك';
        text = 'كُلّفتَ بتنفيذ الركنية والمنطقة مزدحمة.';
        options = [
          mk('near', 'pass', 'عند القائم القريب', { pp: pp(0.50 + (a.pas - 60) * 0.007 + adjA), pg: 0.28, at: { pas: 1 } }),
          mk('far', 'pass', 'عند القائم البعيد', { pp: pp(0.44 + (a.pas - 60) * 0.008 + adjA), pg: 0.34, at: { pas: 1 } }),
          mk('short', 'pass', 'ركنية قصيرة لزميل', { pp: pp(0.80 + (a.pas - 60) * 0.003), pg: 0.14, at: { pas: 1 } }),
          mk('edge', 'pass', 'كرة ساقطة عند حافة المنطقة', { pp: pp(0.46 + (W({ pas: 0.7, sho: 0.3 }) - 60) * 0.006 + adjA), pg: 0.30, at: { pas: 0.7, sho: 0.3 } })
        ];
        break;
      case 'longpass':
        title = 'تغيير اللعب';
        text = 'الجهة المقابلة شبه خالية وأمامك وقت قصير للتصرف.';
        options = [
          mk('switch', 'pass', 'كرة طويلة للجهة الأخرى', { pp: pp(0.50 + (a.pas - 60) * 0.008 + adjA), pg: 0.22, at: { pas: 1 } }),
          mk('line', 'pass', 'تمريرة أرضية تكسر الخطوط', { pp: pp(0.44 + (W({ pas: 0.55, iq: 0.45 }) - 60) * 0.007 + adjA), pg: 0.30, at: { pas: 0.55, iq: 0.45 } }),
          mk('carry', 'drib', 'تقدّم بالكرة بنفسك', { pp: pp(0.50 + (W({ dri: 0.6, pac: 0.4 }) - 60) * 0.005 + adjA), pg: 0.16, at: { dri: 0.6, pac: 0.4 } }),
          mk('safe', 'safe', 'مرّر تمريرة آمنة', { pp: 0.92 })
        ];
        break;
      case 'tackle':
        title = 'خطر على مرمى فريقك';
        text = 'مهاجم الخصم ينطلق بالكرة نحو منطقتكم وأنت أقرب لاعب إليه.';
        options = [
          mk('tackle', 'def', 'افتك الكرة بتدخل مباشر', { pp: pp(0.42 + (a.def - 60) * 0.008 + adjD), pc: 0.30, foul: 0.16, at: { def: 1 } }),
          mk('intercept', 'def', 'اعترض التمريرة بالتمركز الجيد', { pp: pp(0.44 + (a.iq - 60) * 0.008 + adjD), pc: 0.28, foul: 0, at: { iq: 1 } }),
          mk('cover', 'def', 'تراجع وغطِّ المساحة', { pp: pp(0.66 + (a.def - 60) * 0.003 + adjD * 0.5), pc: 0.15, foul: 0, at: { def: 1 } }),
          mk('force', 'def', 'أجبر المهاجم على الطرف', { pp: pp(0.52 + (W({ def: 0.5, iq: 0.3, pac: 0.2 }) - 60) * 0.005 + adjD), pc: 0.22, foul: 0.04, at: { def: 0.5, iq: 0.3 } })
        ];
        atk = false;
        break;
      case 'safebuild':
        title = 'بناء الهجمة من الخلف';
        text = 'الكرة معك في الخلف والخصم يضغط عليك.';
        options = [
          mk('long', 'pass', 'كرة طويلة للأمام', { pp: pp(0.45 + (a.pas - 60) * 0.006), pg: 0.18, at: { pas: 1 } }),
          mk('short', 'safe', 'تمريرة قصيرة آمنة', { pp: 0.92 }),
          mk('carry', 'drib', 'تقدّم بالكرة', { pp: pp(0.4 + (a.dri - 60) * 0.006), pg: 0.16, at: { dri: 1 } }),
          mk('break', 'pass', 'مرّر بين الخطوط لوسط الملعب', { pp: pp(0.46 + (W({ pas: 0.6, iq: 0.4 }) - 60) * 0.006), pg: 0.22, at: { pas: 0.6, iq: 0.4 } })
        ];
        break;
      case 'aerial':
        title = 'كرة عالية في منطقتكم';
        text = 'مهاجم طويل ينافسك على كرة عالية داخل منطقة فريقك.';
        atk = false;
        options = [
          mk('header', 'def', 'ارتقِ واضرب الكرة برأسك', { pp: pp(0.52 + (aer - 60) * 0.007 + adjD), pc: 0.22, foul: 0.05, at: { phy: 0.5, def: 0.3 } }),
          mk('stand', 'def', 'احتلّ المركز واترك الكرة لزميلك', { pp: pp(0.58 + (W({ iq: 0.6, def: 0.4 }) - 60) * 0.006 + adjD), pc: 0.20, foul: 0, at: { iq: 0.6, def: 0.4 } }),
          mk('body', 'def', 'ادفع المهاجم بجسدك', { pp: pp(0.50 + (a.phy - 60) * 0.008 + adjD), pc: 0.25, foul: 0.18, at: { phy: 1 } }),
          mk('step', 'def', 'تقدّم لاعتراض الكرة', { pp: pp(0.46 + (W({ iq: 0.6, pac: 0.4 }) - 60) * 0.007 + adjD), pc: 0.28, foul: 0, at: { iq: 0.6, pac: 0.4 } })
        ];
        break;
      case 'defcorner':
        title = 'ركنية ضد فريقك';
        text = 'الخصم يستعدّ لتنفيذ ركنية ومهاجموه يتزاحمون في المنطقة.';
        atk = false;
        options = [
          mk('zone', 'def', 'ابقَ في مركزك (دفاع منطقة)', { pp: pp(0.62 + (W({ iq: 0.6, def: 0.4 }) - 60) * 0.005 + adjD), pc: 0.16, foul: 0, at: { iq: 0.6, def: 0.4 } }),
          mk('man', 'def', 'راقب مهاجمًا بعينه', { pp: pp(0.56 + (a.def - 60) * 0.007 + adjD), pc: 0.20, foul: 0.06, at: { def: 1 } }),
          mk('post', 'def', 'احرس القائم', { pp: pp(0.66 + (a.def - 60) * 0.004 + adjD), pc: 0.14, foul: 0, at: { def: 1 } }),
          mk('attack', 'def', 'اقفز لقطع الكرة مبكرًا', { pp: pp(0.48 + (aer - 60) * 0.006 + adjD), pc: 0.24, foul: 0.10, at: { phy: 0.5, def: 0.3 } })
        ];
        break;
      case 'block':
        title = 'مهاجم على وشك التسديد';
        text = 'مهاجم الخصم يجهّز تسديدة قريبة من منطقتكم وأنت في طريقها.';
        atk = false;
        options = [
          mk('block', 'def', 'تقدّم لسدّ زاوية التسديد', { pp: pp(0.52 + (a.def - 60) * 0.007 + adjD), pc: 0.30, foul: 0.08, at: { def: 1 } }),
          mk('slide', 'def', 'اندفع بانزلاق', { pp: pp(0.46 + (W({ def: 0.6, pac: 0.4 }) - 60) * 0.007 + adjD), pc: 0.32, foul: 0.20, at: { def: 0.6, pac: 0.4 } }),
          mk('offside', 'def', 'ارفع الخط لتوقعه في التسلل', { pp: pp(0.50 + (a.iq - 60) * 0.010 + adjD), pc: 0.40, foul: 0, at: { iq: 1 } }),
          mk('drop', 'def', 'تراجع وغطِّ المرمى', { pp: pp(0.64 + (a.def - 60) * 0.003 + adjD * 0.5), pc: 0.15, foul: 0, at: { def: 1 } })
        ];
        break;
      case 'shotstop':
        title = 'تسديدة على مرماك';
        text = 'مهاجم الخصم يسدد من مسافة قريبة. كيف تتصرف؟';
        atk = false;
        options = [
          mk('dive', 'def', 'اندفع للزاوية وتصدَّ بالقفز', { pp: pp(0.60 + (a.gk - 70) * 0.006 + adjD), pc: 1, foul: 0, gk: 1, at: { gk: 1 } }),
          mk('hold', 'def', 'ثبّت مكانك وقلّص الزاوية', { pp: pp(0.55 + (a.gk - 70) * 0.006 + adjD), pc: 1, foul: 0, gk: 1, at: { gk: 1 } }),
          mk('rush', 'def', 'اخرج للقاء المهاجم', { pp: pp(0.52 + (a.gk - 70) * 0.005 + (a.iq - 60) * 0.003 + adjD), pc: 1, foul: 0, gk: 1, at: { gk: 0.7, iq: 0.3 } })
        ];
        break;
      case 'gkcross':
        title = 'عرضية داخل منطقتك';
        text = 'كرة عالية تدخل منطقة الجزاء ومهاجمو الخصم يتقدمون.';
        atk = false;
        options = [
          mk('claim', 'def', 'اخرج واحسم الكرة', { pp: pp(0.62 + (a.gk - 70) * 0.005 + adjD), pc: 0.22, foul: 0, gk: 1, at: { gk: 1 } }),
          mk('punch', 'def', 'أبعد الكرة بقبضتيك', { pp: pp(0.8 + (a.gk - 70) * 0.003), pc: 0.12, foul: 0, gk: 1, at: { gk: 1 } }),
          mk('stay', 'def', 'ابقَ على خط المرمى', { pp: pp(0.70 + (a.gk - 70) * 0.003), pc: 0.16, foul: 0, gk: 1, at: { gk: 1 } })
        ];
        break;
      case 'penaltysave':
        title = 'ركلة جزاء ضد فريقك';
        text = 'حكم المباراة يحتسب ركلة جزاء ضدك. الكل يترقّب قرارك.';
        atk = false;
        options = [
          mk('dive', 'def', 'اقفز مبكرًا لإحدى الزوايا', { pp: pp(0.20 + (a.gk - 70) * 0.004), pc: 1, foul: 0, gk: 1, at: { gk: 1 }, okTxt: '🧤 تصدّيتَ لركلة الجزاء ببراعة!', concTxt: '— من ركلة جزاء' }),
          mk('wait', 'def', 'انتظر قرار المنفّذ حتى اللحظة الأخيرة', { pp: pp(0.18 + (W({ iq: 0.6, gk: 0.4 }) - 62) * 0.005), pc: 1, foul: 0, gk: 1, at: { iq: 0.6, gk: 0.4 }, okTxt: '🧤 قرأتَ نيّة المنفّذ وصددتَ الركلة!', concTxt: '— من ركلة جزاء' }),
          mk('center', 'def', 'ثبّت في منتصف المرمى', { pp: pp(0.14 + (a.gk - 70) * 0.002), pc: 1, foul: 0, gk: 1, at: { gk: 1 }, okTxt: '🧤 الكرة تصيب جسدك وتبتعد!', concTxt: '— من ركلة جزاء' }),
          mk('shift', 'def', 'تحرّك على الخط لتشويش المنفّذ', { pp: pp(0.17 + (W({ iq: 0.5, gk: 0.3, pac: 0.2 }) - 62) * 0.006), pc: 1, foul: 0, gk: 1, at: { iq: 0.5, gk: 0.3 }, okTxt: '🧤 تشويشك ينجح والمنفّذ يضيّع الركلة!', concTxt: '— من ركلة جزاء' })
        ];
        break;
      case 'gk1v1':
        title = 'مهاجم منفرد بك';
        text = 'مهاجم الخصم تجاوز الدفاع وأصبح وجهًا لوجه أمامك.';
        atk = false;
        options = [
          mk('rush', 'def', 'اخرج وضيّق الزاوية بسرعة', { pp: pp(0.40 + (W({ gk: 0.7, pac: 0.3 }) - 65) * 0.005 + adjD), pc: 1, foul: 0, gk: 1, at: { gk: 0.7, pac: 0.3 } }),
          mk('stay', 'def', 'ابقَ في مكانك وانتظر التسديدة', { pp: pp(0.34 + (a.gk - 70) * 0.006 + adjD), pc: 1, foul: 0, gk: 1, at: { gk: 1 } }),
          mk('spread', 'def', 'افرد جسدك وكبّر المساحة', { pp: pp(0.38 + (W({ gk: 0.7, phy: 0.3 }) - 68) * 0.005 + adjD), pc: 1, foul: 0, gk: 1, at: { gk: 0.7, phy: 0.3 } }),
          mk('slide', 'def', 'انزل على قدمي المهاجم', { pp: pp(0.44 + (W({ gk: 0.5, iq: 0.5 }) - 65) * 0.004 + adjD), pc: 1, foul: 0.18, gk: 1, at: { iq: 0.5, gk: 0.5 } })
        ];
        break;
      case 'distribution':
        title = 'الكرة بين يديك';
        text = 'أمسكتَ الكرة وفريقك يتحرّك للأمام. كيف تبدأ الهجمة؟';
        options = [
          mk('throw', 'pass', 'ارمِ الكرة لظهيرك', { pp: pp(0.80 + (a.pas - 60) * 0.003), pg: 0.08, at: { pas: 1 } }),
          mk('long', 'pass', 'ركلة طويلة للمهاجم', { pp: pp(0.40 + (W({ pas: 0.6, gk: 0.4 }) - 62) * 0.006), pg: 0.20, at: { pas: 0.6, gk: 0.4 } }),
          mk('quick', 'pass', 'ابدأ هجمة مرتدة سريعة', { pp: pp(0.46 + (W({ pas: 0.6, iq: 0.4 }) - 60) * 0.006), pg: 0.30, at: { pas: 0.6, iq: 0.4 } }),
          mk('short', 'safe', 'تمريرة قصيرة لقلب الدفاع', { pp: 0.9 })
        ];
        break;
      default: // sweeper
        title = 'كرة خلف الدفاع';
        text = 'تمريرة طويلة خلف خط دفاعكم ومهاجم الخصم يتسابق معك إليها.';
        atk = false;
        options = [
          mk('sweep', 'def', 'اخرج خارج المنطقة وأبعد الكرة', { pp: pp(0.55 + (W({ gk: 0.5, pac: 0.5 }) - 65) * 0.005 + adjD), pc: 0.5, foul: 0.1, gk: 1, at: { gk: 0.5, pac: 0.5 } }),
          mk('stay', 'def', 'ابقَ داخل المنطقة', { pp: pp(0.60 + (a.gk - 70) * 0.004 + adjD), pc: 0.3, foul: 0, gk: 1, at: { gk: 1 } }),
          mk('call', 'def', 'نادِ مدافعك ليتعامل معها', { pp: pp(0.64 + (a.iq - 60) * 0.004 + adjD), pc: 0.2, foul: 0, gk: 1, at: { iq: 1 } })
        ];
    }
    const defOpp = atk ? 'دفاع الخصم' : 'هجوم الخصم', lv = atk ? m.R[o].D : m.R[o].A;
    const note = 'لياقتك ' + Math.round(fatPct) + '٪ • قوة ' + defOpp + ' ' + lvl3(lv, 80, 70) + (penPos > 0 ? ' • تلعب خارج مركزك' : '') + (gro.glow > 0 ? ' • زخم التألق +' + gro.glow : '') + (gro.syn >= 0.25 ? ' • زملاء من الطراز الرفيع +' + Math.round(gro.syn * G.Growth.SYN_ATTR) : '');
    return { id: m.id + '#' + m.i, i: m.i, sc, title, text, note, options, userSlot: slot };
  };

  Moments.auto = (ctx) => U.wpick(ctx.options, (o) => Math.pow(o.ev + 0.02, 1.5)) || ctx.options[0];

  // ---------- تنفيذ القرار ----------
  Moments.resolve = (m, ctx, optId) => {
    const L = G.Live, S = G.S, u = P(S.user), uid = u.id;
    const opt = ctx.options.find((x) => x.id === optId) || ctx.options[0];
    const s = m.side, o = s === 'h' ? 'a' : 'h', ps = m.ps[uid];
    L.push(m, 'mom', s, uid, null, '🎯 قرارك: ' + opt.label);
    const missEv = (shooter) => {
      if (U.chance(0.55)) { const g = m.xi[o].find((x) => x.slot === 'GK'); if (g) m.ps[g.id].saves++; m.st[s].sot++; L.push(m, 'save', s, shooter, null, opt.sv || '🧤 الحارس يتصدى للمحاولة'); }
      else L.push(m, 'miss', s, shooter, null, opt.ms || '↗️ المحاولة تمرّ بعيدًا عن المرمى');
    };
    const teammate = () => {
      const list = m.xi[s].filter((x) => x.id !== uid && x.slot !== 'GK');
      return list.length ? G.Match.pickScorer(list) : null;
    };
    const ok = () => { ps.momOk++; };
    const bad = () => { ps.momBad++; };
    switch (opt.k) {
      case 'shot': {
        ps.sh++; m.st[s].sh++;
        if (U.rnd() < opt.pg) { ps.sot++; m.st[s].sot++; L.addGoal(m, s, uid, null, opt.tag); ok(); ok(); }
        else { missEv(uid); }
        break;
      }
      case 'pass': {
        ps.pas++;
        if (U.rnd() < opt.pp) {
          ps.pasOk++;
          const tm = teammate();
          if (tm && U.rnd() < opt.pg) { m.ps[tm.id].sh++; m.ps[tm.id].sot++; m.st[s].sh++; m.st[s].sot++; L.addGoal(m, s, tm.id, uid); ok(); ok(); }
          else { ok(); L.push(m, 'miss', s, uid, null, '👌 تمريرتك ممتازة لكن الفرصة لا تُستغل'); }
        } else { bad(); L.push(m, 'lost', s, uid, null, '❌ تمريرتك لم تصل وضاعت الكرة'); }
        break;
      }
      case 'drib': {
        ps.dr++;
        if (U.rnd() < opt.pp) {
          ps.drOk++; ps.sh++; m.st[s].sh++;
          if (U.rnd() < opt.pg) { ps.sot++; m.st[s].sot++; L.addGoal(m, s, uid, null); ok(); ok(); }
          else { ok(); missEv(uid); }
        } else { bad(); L.push(m, 'lost', s, uid, null, '❌ خسرتَ الكرة في المراوغة'); }
        break;
      }
      case 'press': {
        ps.tk++;
        if (U.rnd() < opt.pp) {
          ps.tkOk++; ok();
          L.push(m, 'mom', s, uid, null, '✅ ضغط ناجح! افتككتَ الكرة في مكان متقدّم');
          if (U.rnd() < opt.pg) L.shoot(m, s, null, true);
          else L.push(m, 'miss', s, uid, null, '👌 استعدتَ الكرة لكن الفرصة لا تكتمل');
        } else { bad(); L.push(m, 'lost', s, uid, null, '❌ أفلت الخصم من الضغط وتجاوزك'); }
        break;
      }
      case 'safe': {
        if (U.rnd() < opt.pp) { L.push(m, 'mom', s, uid, null, '✔️ حافظتَ على الكرة وهدّأت اللعب'); }
        else { bad(); L.push(m, 'lost', s, uid, null, '❌ ضاعت الكرة منك رغم التمريرة الآمنة'); }
        break;
      }
      case 'def': {
        ps.tk++;
        if (U.rnd() < opt.pp) {
          ps.tkOk++; ok();
          if (opt.gk) { ps.saves++; m.st[o].sh++; m.st[o].sot++; }
          L.push(m, 'mom', s, uid, null, opt.okTxt || '✅ تدخّل ناجح! أنهيتَ الخطر على مرماك');
        }
        else {
          bad();
          if (opt.foul && U.rnd() < opt.foul && ps.yel < 2) {
            ps.yel++;
            if (ps.yel >= 2) { ps.red++; L.push(m, 'red', s, uid, null, '🟨🟥 إنذار ثانٍ وطرد لك بعد التدخل!'); L.sendOff(m, s, uid); return void (m.pending = null); }
            L.push(m, 'yellow', s, uid, null, '🟨 إنذار لك بعد التدخل');
          }
          if (U.rnd() < opt.pc) {
            const sh = G.Match.pickScorer(m.xi[o]);
            if (sh) {
              m.ps[sh.id].sh++; m.ps[sh.id].sot++; m.st[o].sh++; m.st[o].sot++;
              const as = U.chance(0.6) ? G.Match.pickAssist(m.xi[o], sh.id) : null;
              L.addGoal(m, o, sh.id, as ? as.id : null, opt.concTxt || '— بعد خطأ في التعامل مع الموقف');
              bad();
            }
          } else { L.push(m, 'save', o, null, null, '😮 نجوتَ هذه المرة — الخصم يهدر الفرصة'); }
        }
        break;
      }
    }
    m.pending = null;
  };
})(window.G = window.G || {});
