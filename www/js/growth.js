/* growth.js — التألق والزخم: سلسلة 5 مباريات متألقة، جوائز الموسم الفردية، لحظات التألق، وأثر زملاء الطراز الرفيع
   كل الدوال حتمية ولا تستهلك U.rnd أبدًا (فيبقى تسلسل العشوائية كما هو سواء لُعبت المباراة مباشرة أو حوكيت). */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id];
  const Growth = (G.Growth = {});
  const GRP = G.POS_GROUP;

  Growth.on = true;            // مفتاح عام (تستعمله الاختبارات للمقارنة)
  Growth.STREAK_N = 5;         // عدد المباريات المتتالية المتألقة لنيل المكافأة
  Growth.SHINE = { att: 6.9, mid: 6.9, def: 6.7, gk: 6.7 }; // أدنى تقييم يُعدّ «تألقًا» بحسب مجموعة المركز (المتوسط العام ≈ 6.6)
  Growth.MIN_MINS = 30;        // أقل دقائق لتُحتسب المباراة (الأقل منها لا تكسر السلسلة ولا تزيدها)
  Growth.HOT_XP = 1.25;        // مضاعف الخبرة ما دام التألق مستمرًا بعد المكافأة
  Growth.MAX_REW = 3;          // أقصى عدد لمكافآت السلسلة في الموسم الواحد (يمنع تضخم نمو النجوم)
  Growth.MAX_BOOST = 3;        // أقصى عدد للحظات التألق التي تُقدّم عدّاد السمات في الموسم
  Growth.XP_CAP = 1.6;         // سقف مضاعف الخبرة الكلي
  Growth.MENTOR_XP = 0.35;     // أقصى زيادة في الخبرة من الاحتكاك بنجوم كبار
  Growth.SYN_RATING = 0.35;    // أقصى زيادة في تقييم المباراة من زملاء الطراز الرفيع
  Growth.SYN_ATTR = 4;         // أقصى زيادة (بنقاط السمات) في نسب اللحظات والتسديد من زملاء الطراز الرفيع
  Growth.AWARD_W = { player: 1.0, scorer: 0.8, assist: 0.6, ucl: 0.9, young: 0.5 };

  const AR = () => G.Players.ATTR_AR;

  // حالة اللاعب (تُنشأ عند الحاجة فتعمل مع الحفظ القديم)
  Growth.st = (u) => {
    if (!u.gro) u.gro = { streak: 0, best: 0, hot: false, rewards: 0, glow: 0, left: 0, pend: 0, brill: 0, rewS: 0, boostS: 0 };
    return u.gro;
  };
  Growth.glowOf = (p) => (Growth.on && p && p.gro && p.gro.left > 0 ? p.gro.glow || 0 : 0);

  // ---------- أثر الزملاء من الطراز الرفيع ----------
  // أفضل 8 زملاء (غير اللاعب) في النادي: متوسطهم 72 ⇒ 0، و84 فأكثر ⇒ 1
  Growth.synergy = (u, clubId) => {
    const none = { syn: 0, T: 0, stars: [], n80: 0 };
    const c = G.C(clubId || u.club);
    if (!c || !c.squad) return none;
    const mates = c.squad.map(P).filter((p) => p && !p.user).sort((a, b) => b.ovr - a.ovr);
    if (mates.length < 6) return none;
    const top = mates.slice(0, 8), T = U.avg(top.map((p) => p.ovr));
    return { syn: U.clamp((T - 72) / 12, 0, 1), T, stars: mates.slice(0, 3).map((p) => p.n), n80: mates.filter((p) => p.ovr >= 80).length };
  };
  // الخبرة تزيد أكثر كلما كان الزملاء أفضل منك فعلًا (تتعلّم منهم)؛ إن كنتَ أفضل منهم يبقى ثلث الأثر على الأقل
  Growth.mentor = (u) => {
    const s = Growth.synergy(u);
    return s.syn * U.clamp((s.T + 6 - u.ovr) / 12, 0.3, 1);
  };
  // مضاعف الخبرة الكلي (المباريات والتدريب الأسبوعي)
  Growth.xpMult = (u) => {
    if (!Growth.on || !u) return 1;
    const g = Growth.st(u);
    let m = 1 + Growth.MENTOR_XP * Growth.mentor(u);
    if (g.hot) m *= Growth.HOT_XP;
    return Math.min(m, Growth.XP_CAP);
  };
  // سياق مباراة: يُحسب مرة عند إنشائها ويُحفظ داخلها
  Growth.matchCtx = (u, clubId) => {
    if (!Growth.on) return { syn: 0, glow: 0, bonus: 0 };
    const s = Growth.synergy(u, clubId), glow = Growth.glowOf(u);
    return { syn: s.syn, glow, bonus: glow + Growth.SYN_ATTR * s.syn };
  };

  // ---------- السمات والتقدم ----------
  const okAttr = (u, k) => !(k === 'gk' && u.pos !== 'GK') && (u.gain[k] || 0) < G.Training.seasonCap(u.age) && u.a[k] < G.Training.maxAttr(u, k);
  const topAttrs = (u) => G.Training.relevant(u).filter((k) => !(k === 'gk' && u.pos !== 'GK'))
    .sort((a, b) => G.Players.OVR_W[u.pos][b] - G.Players.OVR_W[u.pos][a] || u.a[a] - u.a[b]);
  // ترقية فورية لسمات (ضمن سقف الموسم والإمكانات نفسهما)
  Growth.bump = (u, n) => {
    const done = [];
    topAttrs(u).forEach((k) => {
      if (done.length >= n || !okAttr(u, k)) return;
      u.a[k]++; u.gain[k] = (u.gain[k] || 0) + 1; done.push(k);
    });
    if (done.length) G.Players.refresh(u);
    return done;
  };
  // زيادة عدّاد تقدّم السمات الأهم (يتحوّل إلى +1 عند 100 كما في التدريب)
  Growth.addProg = (u, v) => {
    u.prog = u.prog || {};
    const ups = [];
    topAttrs(u).slice(0, 3).forEach((k) => {
      u.prog[k] = (u.prog[k] || 0) + v;
      if (u.prog[k] >= 100) {
        u.prog[k] -= 100;
        if (okAttr(u, k)) { u.a[k]++; u.gain[k] = (u.gain[k] || 0) + 1; ups.push(k); }
      }
    });
    if (ups.length) G.Players.refresh(u);
    return ups;
  };

  // ---------- بعد كل مباراة للاعب ----------
  Growth.shining = (u, sum) => !!sum && sum.mins >= Growth.MIN_MINS && sum.rating != null && sum.rating >= Growth.SHINE[GRP[u.pos] || 'mid'];
  Growth.brilliant = (sum, ps) => {
    if (!sum || sum.mins < Growth.MIN_MINS) return 0;
    const r = sum.rating || 0, ga = (sum.g || 0) + (sum.as || 0), mo = ps ? ps.momOk || 0 : 0;
    if (r >= 9.0 || sum.g >= 3 || ga >= 4) return 2;
    if ((sum.motm && r >= 8.3) || ga >= 3 || (mo >= 3 && r >= 7.8)) return 1;
    return 0;
  };
  // يُستدعى من Season.commitUser بعد احتساب خبرة المباراة؛ يرجع {s, ev:[{k,t}]} لعرضه، ولا يستهلك العشوائية
  Growth.afterMatch = (u, sum, ps) => {
    if (!Growth.on || !sum || sum.mins < Growth.MIN_MINS) return null;
    const g = Growth.st(u), ev = [];
    // تلاشي الزخم المؤقت (مباراة واحدة تُستهلك من الزخم الذي دخل به المباراة)
    if (g.left > 0) { g.left--; if (g.left <= 0) { g.glow = 0; g.left = 0; } }
    if (Growth.shining(u, sum)) {
      g.streak++; g.best = Math.max(g.best, g.streak);
      if (g.streak % Growth.STREAK_N === 0 && (g.rewS || 0) >= Growth.MAX_REW) {
        g.hot = true;
        ev.push({ k: 'run', t: '🔥 ' + g.streak + ' مباريات متتالية متألقة! بلغتَ الحد الأقصى لمكافآت الارتقاء هذا الموسم (' + Growth.MAX_REW + ')، وتبقى خبرتك مضاعفة ×' + Growth.HOT_XP + ' ما دام تألقك مستمرًا.' });
      } else if (g.streak % Growth.STREAK_N === 0) {
        g.hot = true; g.rewards++; g.rewS = (g.rewS || 0) + 1;
        const ups = G.Training.addXP(u, G.Training.need(u.lvl));
        const at = Growth.bump(u, 2);
        const t = '🔥 ' + g.streak + ' مباريات متتالية متألقة! ارتقى مستواك: ' + (ups ? '+' + ups + ' مستوى خبرة (والآن المستوى ' + u.lvl + ') ونقطة تطوير' : 'خبرة إضافية') +
          (at.length ? ' وتحسّنت ' + at.map((k) => AR()[k]).join(' و') : '') + '. وتتضاعف خبرتك ×' + Growth.HOT_XP + ' ما دام تألقك مستمرًا.';
        ev.push({ k: 'streak', t });
        G.Inbox.add('training', 'سلسلة تألق: ' + g.streak + ' مباريات', t.replace(/^🔥 /, ''));
      } else if (g.streak >= 2) {
        const left = Growth.STREAK_N - (g.streak % Growth.STREAK_N);
        ev.push({ k: 'run', t: '🔥 تألّقتَ في ' + g.streak + ' مباريات متتالية — ' + left + ' لتنال مكافأة الارتقاء.' });
      }
    } else {
      if (g.hot) ev.push({ k: 'end', t: 'انتهت سلسلة تألقك عند ' + g.streak + ' مباريات وعادت الخبرة لمعدلها الطبيعي. ابدأ سلسلة جديدة!' });
      g.streak = 0; g.hot = false;
    }
    // لحظة تألق: يرتفع مستواك مؤقتًا (ثلاث مباريات) ويتقدّم عدّاد سماتك الأهم
    const b = Growth.brilliant(sum, ps);
    if (b) {
      g.brill++;
      g.glow = Math.min(3, (g.left > 0 ? g.glow : 0) + b); g.left = 3;
      let ups = [];
      if ((g.boostS || 0) < Growth.MAX_BOOST) { g.boostS = (g.boostS || 0) + 1; ups = Growth.addProg(u, b === 2 ? 30 : 18); }
      ev.push({ k: 'glow', t: '🌟 لحظة تألق! ارتفع تقييمك +' + g.glow + ' لثلاث مباريات قادمة' + (ups.length ? ' وتحسّنت ' + ups.map((k) => AR()[k]).join(' و') : '') + '.' });
    }
    return { s: g.streak, hot: g.hot, ev };
  };

  // ---------- جوائز الموسم الفردية ----------
  // عند نهاية الموسم: خبرة فورية (حتى مستويين) ونمو إضافي يُصرف عند الانتقال للموسم التالي
  Growth.onAwards = (u, types) => {
    if (!Growth.on || !types || !types.length) return null;
    const g = Growth.st(u), w = types.reduce((s, t) => s + (Growth.AWARD_W[t] || 0.5), 0);
    const ups = G.Training.addXP(u, U.clamp(0.5 + 0.7 * w, 1, 2) * G.Training.need(u.lvl)); // كل جائزة ترقّي مستوى خبرة كاملًا على الأقل (وحتى مستويين)
    const ovr = Math.min(1.5, 0.9 * w);
    g.pend = (g.pend || 0) + ovr;
    const t = 'تألقك بجائزة فردية رفع مستواك: ' + (ups ? '+' + ups + ' مستوى خبرة ونقاط تطوير' : 'خبرة إضافية') + '، وستنعكس على تقييمك مع بداية الموسم الجديد.';
    G.Inbox.add('training', 'جوائزك تُرقّي مستواك', t);
    return { ups, ovr };
  };
  Growth.onBD = (u) => {
    if (!Growth.on) return null;
    const g = Growth.st(u), ups = G.Training.addXP(u, 2 * G.Training.need(u.lvl));
    g.pend = (g.pend || 0) + 1.2;
    G.Inbox.add('training', 'الكرة الذهبية تُرقّي مستواك', 'مجد الكرة الذهبية منحك ' + (ups ? '+' + ups + ' مستوى خبرة' : 'خبرة كبيرة') + ' وثقة أكبر؛ يظهر أثره في تقييمك الموسم القادم.');
    return { ups };
  };
  // يُستهلك عند النمو الموسمي (Training.growUser)
  Growth.takePend = (u) => { const g = Growth.st(u), v = g.pend || 0; g.pend = 0; return Growth.on ? v : 0; };
  // موسم جديد: صفحة جديدة للسلسلة والزخم
  Growth.newSeason = (u) => { const g = Growth.st(u); g.streak = 0; g.hot = false; g.glow = 0; g.left = 0; g.rewS = 0; g.boostS = 0; };

  // ---------- للعرض ----------
  Growth.info = (u) => {
    const g = Growth.st(u), s = Growth.synergy(u), men = Growth.mentor(u);
    return {
      streak: g.streak, need: Growth.STREAK_N, hot: !!g.hot, rewards: g.rewards || 0, best: g.best || 0, glow: Growth.glowOf(u), left: g.left || 0,
      syn: s.syn, T: s.T, stars: s.stars, n80: s.n80, xpPct: Math.round((Growth.xpMult(u) - 1) * 100), mentorPct: Math.round(Growth.MENTOR_XP * men * 100),
      perfPct: Math.round(s.syn * 100), perfRating: Math.round(s.syn * Growth.SYN_RATING * 100) / 100, perfAttr: Math.round(s.syn * Growth.SYN_ATTR * 10) / 10, thr: Growth.SHINE[GRP[u.pos] || 'mid']
    };
  };
})(window.G = window.G || {});
