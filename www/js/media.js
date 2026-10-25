/* media.js — الإعلام والشعبية: شعبية اللاعب، عدد المتابعين، علاقته بالصحافة، عقود الرعاية والدخل، العناوين، والمؤتمرات الصحفية بعد المباريات.
   قاعدة ذهبية: هذا الملف لا يستدعي U.rnd أبدًا. كل "الصدفة" هنا اشتقاقٌ ثابت (تجزئة) من بذرة المسيرة ورقم المباراة والخيار،
   فلا يتغيّر تسلسل أرقام المباراة العشوائي ولا تختلف نتيجة المحاكاة عن اللعب الآلي، ولا يمكن إعادة سحب النتيجة بإعادة تحميل الحفظ.
   الحالة تُخزَّن في S.media وتُنشأ عند أول طلب (فالحفظ القديم يُحمَّل كما هو). الواجهة في ui_media.js. */
(function (G) {
  'use strict';
  const U = G.U;
  const Media = (G.Media = {});
  const P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const clamp = U.clamp, r2 = (v) => Math.round(v * 100) / 100;
  const sur = (p) => String(p.n).split(/\s+/).slice(-1)[0];

  // ---------- "صدفة" ثابتة (بلا U.rnd) ----------
  function h01(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  const seedOf = () => String(G.S.seed != null ? G.S.seed : (G.S.created || 0)) + '|' + G.S.season;
  const pickH = (arr, key) => arr[Math.floor(h01(seedOf() + '|' + key) * arr.length) % arr.length];

  // ---------- ثوابت ----------
  Media.TIERS = [
    { id: 'none', ar: 'بلا رعاة', min: 0 },
    { id: 'local', ar: 'رعاية محلية', min: 24 },
    { id: 'national', ar: 'رعاية وطنية', min: 44 },
    { id: 'global', ar: 'رعاية عالمية', min: 64 },
    { id: 'elite', ar: 'رعاية النخبة', min: 82 }
  ];
  const BRANDS = {
    local: ['مشروبات «واحة»', 'أحذية «خطوة»', 'مطاعم «السفرة»'],
    national: ['ملابس «ميدان»', 'اتصالات «نبض»', 'مشروبات «برق»'],
    global: ['«أبيكس» للأحذية الرياضية', 'ساعات «كرونو»', 'طيران «سما»'],
    elite: ['«زينيث» للرياضة', 'سيارات «أوريون»', 'عطور «ماجد»']
  };
  const MILESTONES = [100e3, 500e3, 1e6, 5e6, 10e6, 25e6, 50e6, 100e6];
  const OUTLETS = ['صحيفة «الملعب»', 'قناة «الأبطال»', 'إذاعة «الكرة الإسبانية»', 'موقع «هدف»', 'مجلة «النجوم»'];

  // ---------- الحالة ----------
  const tierOf = (pop) => { let t = Media.TIERS[0]; Media.TIERS.forEach((x) => { if (pop >= x.min) t = x; }); return t; };
  Media.fansOf = (pop) => Math.round(5000 * Math.exp(0.1 * pop) / 100) * 100;
  Media.sponsorWeek = (pop) => (pop < 24 ? 0 : Math.round(Math.pow(pop - 22, 1.85) * 85 / 1000) * 1000);
  Media.fmtFans = (n) => {
    n = Math.round(n || 0);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + ' مليون';
    if (n >= 1e3) return Math.round(n / 1e3) + ' ألف';
    return String(n);
  };

  // الشعبية التي تميل إليها بحسب مستواك ونادٍيك ومستواك الحالي وإنجازاتك وعلاقتك بالصحافة
  Media.target = () => {
    const S = G.S, u = P(S.user), club = C(u.club) || { rep: 70 }, m = S.media;
    const form = G.Coach.formAvg(u);
    const tr = u.trophies || { liga: 0, ucl: 0 };
    const legacy = Math.min(14, (tr.liga || 0) * 3 + (tr.ucl || 0) * 5 + (u.awards || []).length * 1.5 + ((u.maxOvr || u.ovr) >= 85 ? 2 : 0));
    const hype = u.age <= 21 ? Math.max(0, (u.pot - u.ovr)) * 0.15 : 0;
    const t = 14 + (u.ovr - 50) * 0.95 + (club.rep - 70) * 0.5 + (form - 6.5) * 5 + legacy + hype + (m ? m.mood * 0.12 : 0);
    return clamp(t, 2, 98);
  };

  Media.get = () => {
    const S = G.S;
    if (!S.media) {
      const m = (S.media = { pop: 0, mood: 0, heat: 0, press: null, heads: [], hist: [], hid: 0, pid: 0, wages: 0, spons: 0, sW: 0, sS: 0, ms: 0, sp: null, stat: { ask: 0, ok: 0, bad: 0, skip: 0 }, last: null });
      m.pop = r2(Media.target());
      const f = Media.fansOf(m.pop);
      m.ms = MILESTONES.filter((x) => f >= x).length;
      m.sp = { tier: tierOf(m.pop).id, brand: null };
      if (m.sp.tier !== 'none') m.sp.brand = pickH(BRANDS[m.sp.tier], 'brand0');
      m.top = Media.TIERS.findIndex((x) => x.id === m.sp.tier);
    }
    return S.media;
  };
  Media.pop = () => Math.round(Media.get().pop);
  Media.fans = () => Media.fansOf(Media.get().pop);
  Media.tier = () => tierOf(Media.get().pop);
  Media.pending = () => { const m = Media.get(); return m.press || null; };
  Media.offerBoost = () => { const m = G.S.media; if (!m) return 1; return clamp(1 + (m.pop - 40) / 250 + (m.heat || 0) * 0.08, 0.92, 1.3); };
  Media.moodLabel = (v) => (v >= 18 ? 'علاقة ممتازة' : v >= 6 ? 'علاقة جيدة' : v > -6 ? 'علاقة عادية' : v > -18 ? 'علاقة متوترة' : 'علاقة سيئة');
  // دخل سنوي تقريبي (الراتب + الرعاية) للعرض: 52 أسبوعًا
  Media.income = () => {
    const m = Media.get(), u = P(G.S.user);
    const w = (u.ct && u.ct.w) || 0;
    return { wage: Math.round(w * 52), spons: Math.round(Media.sponsorWeek(m.pop) * 52) };
  };

  function head(text, kind, big) {
    const S = G.S, m = Media.get();
    m.heads.unshift({ id: (m.hid = (m.hid || 0) + 1), s: S.season, w: S.week, t: text, k: kind || 0, big: big ? 1 : 0 });
    if (m.heads.length > 16) m.heads.length = 16;
  }
  Media.headId = () => (G.S.media ? G.S.media.hid || 0 : 0);

  // ---------- المؤتمرات الصحفية: الأنواع والخيارات ----------
  // خيار: [المعرّف, الوسم, النص, الخطر, نجاح[شعبية,علاقة,ثقة,سخونة], فشل[...], ردّ النجاح, ردّ الفشل]
  const O = (id, tag, ar, risk, ok, bad, okT, badT) => ({ id, tag, ar, risk, ok, bad, okT, badT });
  const K = {
    hat: {
      icon: '🎩', ar: 'هاتريك',
      q: ['{g} أهداف في مرمى {opp}! أخبرنا، هل هذه أفضل ليلة في مسيرتك؟', 'ثلاثية رائعة أمام {opp}… هل كنتَ تتوقع هذا الأداء؟', 'الجماهير تردّد اسمك بعد ما فعلتَه أمام {opp}. ماذا تقول لها؟'],
      o: [
        O('team', 'safe', 'الفضل لزملائي والمدرب… أنا أنفّذ ما يطلبه الفريق', 0, [0.8, 2, 1.0, 0], null, 'أشاد الإعلام بتواضعك: «نجم لا يغيّره المجد».', ''),
        O('best', 'bold', 'أعمل كل يوم لأكون الأفضل في الدوري، وهذه البداية فقط', 0.25, [1.8, 1, 0, 0], [-1.4, -3, -1.2, 0], 'عناوين الصحف: «الواثق الذي يصنع المجد».', 'اعتبرت صحف كثيرة كلامك غرورًا: «ما زال أمامه الكثير».'),
        O('mock', 'fiery', 'لكل من شكّك فيّ: هذه هي الإجابة على أرض الملعب!', 0.42, [3.0, 0, -0.3, 0], [-2.6, -5, -2.2, 0], 'تصريحك اشتعل على مواقع التواصل وتصدّرت الترند!', 'هاجمك الصحفيون واتهموك بالتعالي على الخصوم وزملائك.')
      ]
    },
    star: {
      icon: '⭐', ar: 'نجم المباراة',
      q: ['اختيرتَ نجمًا للمباراة ضد {opp}. كيف تصف أداءك؟', 'أداء لافت أمام {opp}. هل أنت راضٍ عن مستواك؟', 'المدرب أثنى على أدائك أمام {opp}. ما رسالتك للجماهير؟'],
      o: [
        O('team', 'safe', 'الأهم هو الفريق، وأسعى لمواصلة العمل بجدّ', 0, [0.6, 2, 0.8, 0], null, 'ردّ هادئ نال إعجاب الجميع.', ''),
        O('form', 'bold', 'أشعر أنني في أفضل حالاتي وأريد أن أكون نجم هذا الفريق', 0.25, [1.7, 1, 0.2, 0], [-1.2, -3, -1, 0], 'الصحافة: «نجمٌ يعرف قيمته».', 'انتقد البعض كلامك بأنه سابق لأوانه.'),
        O('top', 'fiery', 'أستحق أن أكون ضمن أفضل لاعبي أوروبا — وسأثبت ذلك', 0.42, [2.8, 0, -0.3, 0], [-2.4, -5, -2, 0], 'تصريحك الجريء صار حديث البرامج الرياضية.', 'سخر منك المحللون: «الأرقام لا تكفي لهذا الكلام».')
      ]
    },
    red: {
      icon: '🟥', ar: 'بطاقة حمراء',
      q: ['طُردتَ أمام {opp} وترك فريقك بعشرة. ما تعليقك؟', 'البطاقة الحمراء كلّفت فريقك كثيرًا. ماذا حدث؟', 'الصحافة تتساءل عن انضباطك بعد الطرد. بماذا تردّ؟'],
      o: [
        O('sorry', 'safe', 'أعتذر لزملائي وللجماهير، كان خطأي وسأتعلّم منه', 0, [0.3, 3, 1.5, 0], null, 'قدّر المدرب والصحافة اعتذارك السريع.', ''),
        O('defend', 'bold', 'كان تدخّلًا قويًا لكنني لم أقصد الإيذاء', 0.3, [0.6, 0, 0.3, 0], [-1.5, -3, -1.5, 0], 'قبلت الصحافة تفسيرك.', 'لم يقتنع أحد بتبريرك وانتُقد تهوّرك.'),
        O('ref', 'fiery', 'القرار ظالم والحَكَم يتحمّل المسؤولية!', 0.55, [1.2, -1, -1, 0], [-3.0, -6, -3, 0], 'الجماهير وقفت معك وانتشر تصريحك.', 'اتُّهمتَ بالتهرّب من المسؤولية وانقلب الرأي عليك.')
      ]
    },
    flop: {
      icon: '📉', ar: 'أداء ضعيف',
      q: ['أداؤك أمام {opp} لم يكن مقنعًا. هل تعاني من ضغط؟', 'النقّاد انتقدوا مستواك أمام {opp}. ماذا تقول لهم؟', 'هل تعتقد أنك قدّمتَ ما يكفي أمام {opp}؟'],
      o: [
        O('accept', 'safe', 'لم أكن في أفضل مستوياتي، وسأعمل أكثر في التدريب', 0, [0.4, 2, 1.2, 0], null, 'نال ردّك احترام المحللين والمدرب.', ''),
        O('ignore', 'bold', 'أنا مطمئن لقدراتي والنقد جزء من اللعبة', 0.25, [1.0, 1, 0.2, 0], [-1.2, -3, -1, 0], 'الصحافة: «يتعامل مع الضغط بثبات».', 'رأى كثيرون أنك لا تعترف بأخطائك.'),
        O('blame', 'fiery', 'الخطة لم تساعدني على إظهار مهاراتي', 0.5, [0.8, -1, -1.5, 0], [-2.4, -5, -3.5, 0], 'رأى بعض المحللين أن لك حقًّا فيما قلت.', 'اعتُبر كلامك تجريحًا للمدرب وزملائك وانتشر الخلاف.')
      ]
    },
    bench: {
      icon: '🪑', ar: 'قلّة الدقائق',
      q: ['لم تشارك في آخر مباريات الفريق. هل أنت راضٍ عن وضعك؟', 'هل تفكر في الرحيل بعد قلّة الدقائق التي تلعبها؟', 'ما رسالتك للمدرب بعد غيابك عن التشكيلة؟'],
      o: [
        O('patient', 'safe', 'سأواصل العمل بصبر وأنتظر فرصتي', 0, [0.3, 2, 1.5, 0], null, 'أعجب المدرب بصبرك وانضباطك.', ''),
        O('demand', 'bold', 'أستحق دقائق أكثر وسأقنع المدرب في التدريبات', 0.3, [1.0, 1, 0.5, 0], [-0.8, -2, -2.5, 0], 'اعتبرت الصحافة كلامك دليل طموح.', 'لم يُعجب المدرب بتصريحك العلني.'),
        O('leave', 'fiery', 'إن لم تأتِ الفرصة هنا فلكلّ حادثٍ حديث… قد أرحل', 0.5, [2.4, -2, -1.5, 1.5], [-1.6, -6, -4, 0], 'أثار تصريحك اهتمام الأندية وبدأت أنباء رحيلك تنتشر.', 'غضب المدرب والإدارة من تصريحك وتوتّرت علاقتك بالجميع.')
      ]
    },
    big: {
      icon: '🌍', ar: 'مباراة أوروبية كبيرة',
      q: ['بعد مباراة {stage} أمام {opp} ({score}): كيف تقيّم ما حدث؟', 'الأنظار على {club} في دوري الأبطال. ماذا تقول للجماهير؟', 'بعد {stage}، هل ما زال حلم أوروبا حيًّا؟'],
      o: [
        O('focus', 'safe', 'نركّز على مباراة واحدة كل مرة ونحترم كل الخصوم', 0, [0.6, 2, 0.8, 0], null, 'ردّ ناضج يليق بلاعب كبير.', ''),
        O('cup', 'bold', 'هدفنا الكأس ولا نريد أقل منه', 0.25, [1.8, 1, 0.3, 0], [-1.3, -3, -1, 0], 'الجماهير أحبّت الطموح في كلامك.', 'اعتبر البعض كلامك ضغطًا إضافيًا على الفريق.'),
        O('name', 'fiery', 'أوروبا ستعرف اسمي قريبًا', 0.45, [2.8, 0, 0, 0], [-2.5, -5, -2, 0], 'جملتك صارت عنوانًا في الصحف الأوروبية.', 'قيل إنك تتحدث أكثر مما تقدّم.')
      ]
    },
    rumor: {
      icon: '🔁', ar: 'شائعات الانتقال',
      q: ['تقارير تتحدث عن اهتمام أندية كبرى بك. هل ستبقى في {club}؟', 'الصحافة تربط اسمك بالانتقال. ما ردّك؟', 'هل وصلتك عروض من أندية أخرى؟'],
      o: [
        O('stay', 'safe', 'أنا سعيد في {club} ومركّز على مباراتي', 0, [0.3, 2, 1.5, 0], null, 'ارتاحت الإدارة والجماهير لتصريحك.', ''),
        O('open', 'bold', 'أفتخر بالاهتمام، لكن مستقبلي سأقرره بهدوء', 0.2, [1.4, 0, 0.2, 0.6], [-0.8, -2, -1, 0], 'ردّ ذكي أبقى الباب مفتوحًا.', 'فسّر البعض كلامك بأنك تتأهب للرحيل.'),
        O('tease', 'fiery', 'الأحلام الكبيرة لا تُقيَّد… ولا أستبعد أي خيار', 0.45, [2.2, -1, -1, 1.6], [-1.8, -5, -3, 0], 'ارتفع الاهتمام بك فجأة والكل يتحدث عن مستقبلك.', 'انزعجت الجماهير والإدارة من تلميحك.')
      ]
    },
    routine: {
      icon: '🎤', ar: 'مؤتمر عادي',
      q: ['كيف ترى مستوى الفريق هذه الفترة؟', 'ما هدفك الشخصي لهذا الموسم؟', 'ما المباراة التي تنتظرها بحماس؟'],
      o: [
        O('focus', 'safe', 'نعمل أسبوعًا بعد أسبوع ونحترم الجميع', 0, [0.3, 1, 0.5, 0], null, 'ردّ مهني وهادئ.', ''),
        O('goal', 'bold', 'أريد أن أنهي الموسم بأفضل أرقام في مسيرتي', 0.2, [0.9, 0, 0, 0], [-0.7, -2, -0.5, 0], 'أعجب الإعلام بطموحك.', 'علّق البعض بأن الأرقام ستحكم لا الأقوال.'),
        O('trophy', 'fiery', 'الألقاب فقط تهمّني وسنعرف كيف نحصل عليها', 0.35, [1.6, 0, -0.2, 0], [-1.4, -4, -1.2, 0], 'تصريحك حمّس الجماهير.', 'اتُّهمتَ بالتقليل من خصومك.')
      ]
    }
  };
  Media.KINDS = K;
  Media.TAG_AR = { safe: 'آمن', bold: 'جريء', fiery: 'مثير' };

  const fill = (s, ctx) => String(s).replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? ctx[k] : ''));
  const ctxOf = (pr) => {
    const S = G.S, u = P(S.user), c = pr.ctx || {};
    return { opp: c.opp ? C(c.opp).name : '', club: C(u.club) ? C(u.club).name : '', g: c.g || 0, stage: c.stage ? (G.Ucl.STAGE_AR[c.stage] || '') : '', score: c.sc || '', name: sur(u) };
  };
  Media.question = (pr) => fill(K[pr.kind].q[pr.v % K[pr.kind].q.length], ctxOf(pr));
  Media.outlet = (pr) => OUTLETS[pr.o % OUTLETS.length];
  // خيارات المؤتمر مع الخطر الفعلي (يتأثر بعلاقتك بالصحافة)
  Media.options = (pr) => {
    const m = Media.get(), ctx = ctxOf(pr);
    const adj = m.mood < -15 ? 0.08 : m.mood > 15 ? -0.06 : 0;
    return K[pr.kind].o.map((o) => ({ id: o.id, tag: o.tag, ar: fill(o.ar, ctx), risk: o.risk ? clamp(o.risk + adj, 0.03, 0.7) : 0, ok: o.ok, bad: o.bad, okT: o.okT, badT: o.badT }));
  };

  // ---------- بعد كل مباراة للمستخدم ----------
  // يُستدعى من Season.commitUser بعد حفظ ملخص المباراة
  Media.afterMatch = (sum) => {
    const S = G.S, u = P(S.user), m = Media.get();
    const my = sum.userSide, gf = my === 'h' ? sum.score.h : sum.score.a, ga = my === 'h' ? sum.score.a : sum.score.h;
    const opp = my === 'h' ? sum.a : sum.h;
    const fix = G.Season.findFix(sum.fixId) || {};
    const stage = sum.comp === 'UCL' ? fix.stage || null : null, knock = !!(stage && stage !== 'league');
    const played = sum.mins > 0, r = sum.rating || 6.4;
    // 1) أثر الأداء المباشر على الشعبية
    let d = 0;
    if (played) {
      if (sum.mins >= 30) d += (r - 6.6) * 0.35;
      d += 0.5 * sum.g + (sum.g >= 3 ? 1.0 : 0) + 0.25 * sum.as + (sum.motm ? 0.8 : 0) - (sum.red ? 1.8 : 0);
      if (d > 0) { d *= (1.15 - m.pop / 100); if (knock) d *= 1.5; }
    }
    m.pop = r2(clamp(m.pop + d, 0, 100));

    // 2) العناوين التلقائية
    const nm = sur(u), oc = C(opp) ? C(opp).name : '', mc = C(u.club) ? C(u.club).name : '';
    if (played && sum.g >= 3) head(sum.g >= 4 ? nm + ' يسجّل ' + sum.g + ' أهداف في مرمى ' + oc + '!' : 'هاتريك ' + nm + ' يُسقط ' + oc, 1, true);
    else if (played && sum.red) head('طرد ' + nm + ' يُربك ' + mc + ' أمام ' + oc, -1, true);
    else if (played && sum.motm && knock) head(nm + ' نجم مباراة ' + mc + ' و' + oc + ' في ' + (G.Ucl.STAGE_AR[stage] || 'أوروبا'), 1, false);

    // 3) المؤتمر الصحفي
    const key = sum.fixId + '|' + S.season;
    let kind = null;
    const stageWin = gf > ga;
    if (played && sum.red) kind = 'red';
    else if (played && sum.g >= 3) kind = 'hat';
    else if (played && knock && (stage === 'final' || stage === 'sf' || stageWin || h01(seedOf() + '|big|' + key) < 0.5)) kind = 'big';
    else if (played && (sum.motm || r >= 8.3 || sum.g + sum.as >= 2)) kind = 'star';
    else if (played && sum.mins >= 45 && r < 5.7) kind = 'flop';
    else if (!played && (u.role === 'bench' || u.role === 'out') && !u.inj && !u.susp && benchStreak() >= 3 && h01(seedOf() + '|bench|' + key) < 0.6) kind = 'bench';
    else if ((S.offers || []).length && S.window && S.window.open && h01(seedOf() + '|rumor|' + key) < 0.7) kind = 'rumor';
    else if (played && sum.mins >= 45 && h01(seedOf() + '|routine|' + key) < 0.18) kind = 'routine';
    // فاصل بين المؤتمرات: الأنواع الكبيرة (طرد/هاتريك/مباراة أوروبية كبرى) بلا فاصل، وغيرها تباعد 3 أسابيع (قلّة الدقائق 5)
    const idx = S.season * 40 + S.week;
    if (kind && kind !== 'red' && kind !== 'hat' && kind !== 'big' && idx - (m.lastIdx == null ? -99 : m.lastIdx) < (kind === 'bench' ? 5 : 3)) kind = null;
    if (kind) {
      m.lastIdx = idx;
      if (m.press) m.stat.skip++; // مؤتمر سابق لم يُجَب
      m.press = { id: (m.pid = (m.pid || 0) + 1), w: S.week, s: S.season, kind, fixId: sum.fixId, v: Math.floor(h01(seedOf() + '|v|' + key) * 30), o: Math.floor(h01(seedOf() + '|o|' + key) * 30),
        ctx: { opp, g: sum.g, as: sum.as, r: sum.rating, sc: gf + '-' + ga, stage, comp: sum.comp } };
    }
    return kind;
  };

  function benchStreak() {
    const S = G.S; let n = 0;
    for (const x of (S.matchLog || [])) { if (x.mins > 0) break; n++; if (n >= 3) break; }
    return n;
  }

  // ---------- الإجابة عن المؤتمر ----------
  Media.answer = (optId) => {
    const S = G.S, u = P(S.user), m = Media.get(), pr = m.press;
    if (!pr) return { ok: false, msg: 'لا يوجد مؤتمر صحفي' };
    const o = Media.options(pr).find((x) => x.id === optId);
    if (!o) return { ok: false, msg: 'خيار غير صالح' };
    const back = o.risk > 0 && h01(seedOf() + '|' + pr.id + '|' + pr.fixId + '|' + o.id) < o.risk;
    const fx = back ? o.bad : o.ok;
    m.pop = r2(clamp(m.pop + fx[0], 0, 100));
    m.mood = r2(clamp(m.mood + fx[1], -40, 40));
    u.trust = clamp(Math.round((u.trust + fx[2]) * 10) / 10, 0, 100);
    m.heat = r2(clamp((m.heat || 0) + (fx[3] || 0), 0, 4));
    const txt = back ? o.badT : o.okT;
    m.stat.ask++; if (back) m.stat.bad++; else m.stat.ok++;
    head(txt, back ? -1 : (fx[0] >= 1.5 ? 1 : 0), fx[0] >= 2.5 || fx[0] <= -2.4);
    m.last = { kind: pr.kind, opt: o.id, back, fx: fx.slice(0, 4), txt, s: S.season, w: S.week };
    m.press = null;
    G.Save.save();
    return { ok: true, back, fx, txt, tag: o.tag };
  };
  Media.skip = () => {
    const m = Media.get();
    if (!m.press) return false;
    m.press = null; m.stat.skip++;
    G.Save.save();
    return true;
  };

  // ---------- أسبوعيًا (بعد انتقال الأسبوع) ----------
  Media.weekly = () => {
    const S = G.S, u = P(S.user), m = Media.get();
    if (m.press && S.week - m.press.w >= 2) { m.press = null; m.stat.skip++; }
    m.mood = r2(m.mood * 0.97);
    m.heat = r2(Math.max(0, (m.heat || 0) - 0.25));
    m.pop = r2(clamp(m.pop + (Media.target() - m.pop) * 0.10, 0, 100));
    // الدخل (52 أسبوعًا في السنة موزّعة على 39 أسبوعًا من الموسم)
    const wage = ((u.ct && u.ct.w) || 0) * 52 / 39, sp = Media.sponsorWeek(m.pop) * 52 / 39;
    m.wages = Math.round(m.wages + wage); m.spons = Math.round(m.spons + sp);
    m.sW = Math.round((m.sW || 0) + wage); m.sS = Math.round((m.sS || 0) + sp);
    // الرعاة
    const idx = (id) => Media.TIERS.findIndex((x) => x.id === id);
    const ci = idx(m.sp ? m.sp.tier : 'none');
    let ti = idx(tierOf(m.pop).id);
    if (ti < ci && m.pop >= Media.TIERS[ci].min - 3) ti = ci; // هامش 3 نقاط كي لا يتذبذب العقد قرب الحدّ
    if (ti !== ci) {
      const t = Media.TIERS[ti];
      m.sp = { tier: t.id, brand: t.id === 'none' ? null : pickH(BRANDS[t.id], 'brand|' + t.id + '|' + S.season) };
      if (ti > (m.top == null ? ci : m.top)) { // نعلن فقط عند بلوغ فئة لم تبلغها من قبل
        m.top = ti;
        G.Inbox.add('media', 'عقد رعاية جديد', 'وقّعتَ عقد ' + t.ar + ' مع ' + m.sp.brand + ' بقيمة نحو ' + G.U.money(Media.sponsorWeek(m.pop) * 52) + ' سنويًا.');
        head('عقد رعاية جديد: ' + m.sp.brand, 1, true);
      }
    }
    // محطات المتابعين
    const f = Media.fansOf(m.pop);
    while (m.ms < MILESTONES.length && f >= MILESTONES[m.ms]) {
      const v = MILESTONES[m.ms++];
      G.Inbox.add('media', 'محطة جديدة على مواقع التواصل', 'تجاوز عدد متابعيك ' + Media.fmtFans(v) + '! 🎉');
      head('عدد متابعي ' + sur(u) + ' يتجاوز ' + Media.fmtFans(v), 1, true);
    }
  };

  // ---------- انتقال المستخدم لنادٍ آخر ----------
  Media.onTransfer = (fromId, toId, fee, loan) => {
    const S = G.S, u = P(S.user), m = Media.get();
    const a = C(fromId), b = C(toId);
    if (!b) return;
    const gap = a ? (b.rep - a.rep) : 0;
    const d = clamp(gap * 0.15 + (loan ? 0 : (fee || 0) / 25e6), -2, 6);
    m.pop = r2(clamp(m.pop + d, 0, 100));
    m.heat = 0;
    m.press = null;
    if (!loan) head(sur(u) + ' ينتقل إلى ' + b.name + (fee > 0 ? ' مقابل ' + U.money(fee) : ' حرًّا'), d >= 0 ? 1 : 0, true);
    else head(sur(u) + ' يُعار إلى ' + b.name, 0, false);
  };

  // ---------- نهاية الموسم ----------
  Media.seasonEnd = (row) => {
    const S = G.S, u = P(S.user), m = Media.get();
    let bump = 0;
    if (row.trophies.liga) { bump += 4; head(sur(u) + ' يتوّج بلقب الدوري الإسباني', 1, true); }
    if (row.trophies.ucl) { bump += 7; head(sur(u) + ' بطل أوروبا!', 1, true); }
    (row.awards || []).forEach((t) => { bump += 2; head('جائزة ' + (G.Season.AWARD_AR[t] || t) + ' من نصيب ' + sur(u), 1, true); });
    m.pop = r2(clamp(m.pop + bump, 0, 100));
    const row2 = { season: S.season, label: row.label, club: row.club, pop: Math.round(m.pop), fans: Media.fansOf(m.pop), wages: m.sW || 0, spons: m.sS || 0, tier: tierOf(m.pop).id };
    m.hist.push(row2);
    row.pop = row2.pop; row.fans = row2.fans;
    m.sW = 0; m.sS = 0; m.press = null; m.heat = 0;
    return row2;
  };
})(window.G = window.G || {});
