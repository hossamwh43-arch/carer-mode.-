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

  const mk = (id, k, label, extra, hintP, hintGoal) => {
    const o = Object.assign({ id, k, label }, extra);
    const succ = o.pp != null ? o.pp : null;
    const goalish = o.k === 'shot' ? o.pg : o.pp != null && o.pg != null ? o.pg : null;
    o.ev = o.k === 'shot' ? o.pg : (o.k === 'pass' || o.k === 'drib') ? o.pp * o.pg : o.k === 'safe' ? o.pp * 0.03 : o.pp * 0.4 + 0.05;
    o.hint = o.k === 'shot' ? 'فرصة التسجيل: ' + lvl(o.pg, 0.2, 0.12)
      : o.k === 'safe' ? 'مخاطرة: منخفضة جدًا'
      : o.k === 'def' ? 'نسبة النجاح: ' + lvl(succ, 0.7, 0.5)
      : 'نسبة النجاح: ' + lvl(succ, 0.7, 0.48) + ' • قيمة الفرصة: ' + lvl(o.pg, 0.3, 0.2);
    return o;
  };

  Moments.make = (m) => {
    const S = G.S, u = P(S.user), s = m.side, o = s === 'h' ? 'a' : 'h';
    const slot = G.Live.userSlot(m) || u.pos;
    const grp = GRP[slot];
    const a = u.a, sf = 0.85 + 0.15 * (m.fat[u.id] != null ? m.fat[u.id] : 100) / 100;
    const adjA = -(m.R[o].D - 75) * 0.004, adjD = -(m.R[o].A - 75) * 0.004;
    const pp = (v) => clamp(v * sf, 0.12, 0.92);
    let sc;
    const r = U.rnd();
    if (grp === 'gk') sc = r < 0.7 ? 'shotstop' : 'gkcross';
    else if (grp === 'def') sc = r < 0.72 ? 'tackle' : (slot === 'LB' || slot === 'RB') ? 'cross' : 'safebuild';
    else if (grp === 'mid') sc = r < 0.45 ? 'tackle' : r < 0.78 ? 'through' : 'edge';
    else sc = r < 0.12 ? 'tackle' : r < 0.42 ? 'edge' : r < 0.67 ? 'counter' : (slot === 'LW' || slot === 'RW') && r < 0.9 ? 'cross' : 'through';

    let title, text, options;
    if (sc === 'edge') {
      title = 'فرصة عند حافة المنطقة';
      text = 'الكرة تصلك عند حافة منطقة الجزاء والمدافعون يقتربون منك. ماذا تفعل؟';
      options = [
        mk('shoot', 'shot', 'سدّد مباشرة', { pg: clamp((0.09 + (a.sho - 65) * 0.0035 + adjA * 0.6) * sf, 0.03, 0.30) }),
        mk('pass', 'pass', 'مرّر لزميل في موقع أفضل', { pp: pp(0.5 + (a.pas - 60) * 0.007 + adjA), pg: 0.27 }),
        mk('dribble', 'drib', 'راوغ المدافع ثم سدّد', { pp: pp(0.34 + (a.dri - 60) * 0.008 + adjA), pg: clamp(0.30 + (a.sho - 65) * 0.004, 0.18, 0.5) })
      ];
    } else if (sc === 'counter') {
      title = 'هجمة مرتدة سريعة';
      text = 'فريقك استعاد الكرة وأمامك مساحة كبيرة نحو مرمى الخصم.';
      options = [
        mk('run', 'drib', 'انطلق بالكرة بسرعة نحو المرمى', { pp: pp(0.36 + (a.pac - 60) * 0.008 + adjA), pg: 0.34 }),
        mk('long', 'pass', 'مرّر كرة طولية لزميلك المنطلق', { pp: pp(0.5 + (a.pas - 60) * 0.006 + adjA), pg: 0.30 }),
        mk('hold', 'safe', 'تمهّل وحافظ على الكرة', { pp: 0.88 })
      ];
    } else if (sc === 'cross') {
      title = 'فرصة عرضية';
      text = 'الكرة معك على الطرف وزملاؤك يتحركون داخل المنطقة.';
      options = [
        mk('cross', 'pass', 'ارفع عرضية داخل المنطقة', { pp: pp(0.46 + (a.pas - 60) * 0.007 + adjA), pg: 0.20 }),
        mk('cutin', 'drib', 'ادخل للداخل وسدّد', { pp: pp(0.38 + (a.dri - 60) * 0.008 + adjA), pg: clamp(0.2 + (a.sho - 65) * 0.003, 0.1, 0.4) }),
        mk('back', 'safe', 'أعد الكرة للخلف', { pp: 0.9 })
      ];
    } else if (sc === 'through') {
      title = 'مساحة خلف الدفاع';
      text = 'ترى زميلك يتحرك خلف خط دفاع الخصم، لكن الزاوية ضيقة.';
      options = [
        mk('through', 'pass', 'مرّر كرة اختراق', { pp: pp(0.40 + (a.pas - 60) * 0.008 + (a.iq - 60) * 0.003 + adjA), pg: 0.36 }),
        mk('long', 'shot', 'جرّب تسديدة بعيدة', { pg: clamp((0.06 + (a.sho - 65) * 0.003) * sf, 0.02, 0.2) }),
        mk('safe', 'safe', 'مرّر تمريرة آمنة', { pp: 0.9 })
      ];
    } else if (sc === 'tackle') {
      title = 'خطر على مرمى فريقك';
      text = 'مهاجم الخصم ينطلق بالكرة نحو منطقتكم وأنت أقرب لاعب إليه.';
      options = [
        mk('tackle', 'def', 'افتك الكرة بتدخل مباشر', { pp: pp(0.42 + (a.def - 60) * 0.008 + adjD), pc: 0.30, foul: 0.16 }),
        mk('intercept', 'def', 'اعترض التمريرة بالتمركز الجيد', { pp: pp(0.44 + (a.iq - 60) * 0.008 + adjD), pc: 0.28, foul: 0 }),
        mk('cover', 'def', 'تراجع وغطِّ المساحة', { pp: pp(0.66 + (a.def - 60) * 0.003 + adjD * 0.5), pc: 0.15, foul: 0 })
      ];
    } else if (sc === 'safebuild') {
      title = 'بناء الهجمة من الخلف';
      text = 'الكرة معك في الخلف والخصم يضغط عليك.';
      options = [
        mk('long', 'pass', 'كرة طويلة للأمام', { pp: pp(0.45 + (a.pas - 60) * 0.006), pg: 0.18 }),
        mk('short', 'safe', 'تمريرة قصيرة آمنة', { pp: 0.92 }),
        mk('carry', 'drib', 'تقدّم بالكرة', { pp: pp(0.4 + (a.dri - 60) * 0.006), pg: 0.16 })
      ];
    } else if (sc === 'shotstop') {
      title = 'تسديدة على مرماك';
      text = 'مهاجم الخصم يسدد من مسافة قريبة. كيف تتصرف؟';
      options = [
        mk('dive', 'def', 'اندفع للزاوية وتصدَّ بالقفز', { pp: pp(0.60 + (a.gk - 70) * 0.006 + adjD), pc: 1, foul: 0 }),
        mk('hold', 'def', 'ثبّت مكانك وقلّص الزاوية', { pp: pp(0.55 + (a.gk - 70) * 0.006 + adjD), pc: 1, foul: 0 }),
        mk('rush', 'def', 'اخرج للقاء المهاجم', { pp: pp(0.52 + (a.gk - 70) * 0.005 + (a.iq - 60) * 0.003 + adjD), pc: 1, foul: 0 })
      ];
    } else {
      title = 'عرضية داخل منطقتك';
      text = 'كرة عالية تدخل منطقة الجزاء ومهاجمو الخصم يتقدمون.';
      options = [
        mk('claim', 'def', 'اخرج واحسم الكرة', { pp: pp(0.62 + (a.gk - 70) * 0.005 + adjD), pc: 0.22, foul: 0 }),
        mk('punch', 'def', 'أبعد الكرة بقبضتيك', { pp: pp(0.8 + (a.gk - 70) * 0.003), pc: 0.12, foul: 0 }),
        mk('stay', 'def', 'ابقَ على خط المرمى', { pp: pp(0.70 + (a.gk - 70) * 0.003), pc: 0.16, foul: 0 })
      ];
    }
    return { id: m.id + '#' + m.i, i: m.i, sc, title, text, options, userSlot: slot };
  };

  Moments.auto = (ctx) => U.wpick(ctx.options, (o) => Math.pow(o.ev + 0.02, 1.5)) || ctx.options[0];

  // ---------- تنفيذ القرار ----------
  Moments.resolve = (m, ctx, optId) => {
    const L = G.Live, S = G.S, u = P(S.user), uid = u.id;
    const opt = ctx.options.find((x) => x.id === optId) || ctx.options[0];
    const s = m.side, o = s === 'h' ? 'a' : 'h', ps = m.ps[uid];
    L.push(m, 'mom', s, uid, null, '🎯 قرارك: ' + opt.label);
    const missEv = (shooter, big) => {
      if (U.chance(0.55)) { const g = m.xi[o].find((x) => x.slot === 'GK'); if (g) m.ps[g.id].saves++; m.st[s].sot++; L.push(m, 'save', s, shooter, null, '🧤 الحارس يتصدى للمحاولة'); }
      else L.push(m, 'miss', s, shooter, null, '↗️ المحاولة تمرّ بعيدًا عن المرمى');
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
        if (U.rnd() < opt.pg) { ps.sot++; m.st[s].sot++; L.addGoal(m, s, uid, null); ok(); ok(); }
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
      case 'safe': {
        if (U.rnd() < opt.pp) { L.push(m, 'mom', s, uid, null, '✔️ حافظتَ على الكرة وهدّأت اللعب'); }
        else { bad(); L.push(m, 'lost', s, uid, null, '❌ ضاعت الكرة منك رغم التمريرة الآمنة'); }
        break;
      }
      case 'def': {
        ps.tk++;
        if (U.rnd() < opt.pp) { ps.tkOk++; ok(); L.push(m, 'mom', s, uid, null, '✅ تدخّل ناجح! أنهيتَ الخطر على مرماك'); }
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
              L.addGoal(m, o, sh.id, as ? as.id : null, '— بعد خطأ في التعامل مع الموقف');
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
