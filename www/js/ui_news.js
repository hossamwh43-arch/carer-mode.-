/* ui_news.js — «غرفة الأخبار» و«صندوقي»: تجربتان مختلفتان بدل قائمتين متطابقتين.
   • الصحافة (UI.screens.press) = الصفحة الأولى: قصة رئيسية + شريط عاجل + سكك أفقية حسب الموضوع + قارئ قصة؛ وعند الترشيح تتحول إلى قائمة نتائج مضغوطة.
   • الرسائل (UI.screens.inbox) = مركز القرارات: بطاقات «يحتاج قرارك» تُشتق مباشرة من حالة اللعبة (مؤتمر صحفي، عروض، عقد، نقاط تطوير، مباراة، إغلاق السوق)
     وكل زر فيها يستدعي الفعل الحقيقي الموجود أصلًا؛ ثم لوحة «ما تتأثر به قراراتك» (ثقة المدرب، الشعبية، علاقة الصحافة وآخر مؤتمر) وخط زمني مضغوط للرسائل.
   • الرئيسية: UI.newsDock = رقائق القرارات + شريط عاجل بدل بطاقتي الأخبار والرسائل.
   عرض فقط: لا U.rnd ولا تعديل للحالة إلا علامة «مقروء» للرسائل والأخبار. الأفعال القديمة (pressT/pressO/pressMore/pressOpen/go/goSub) تعمل كما هي. */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const S_ = () => G.S, me = () => G.S.players[G.S.user];
  UI.titles.press = 'غرفة الأخبار';
  UI.titles.inbox = 'صندوقي';

  // ---------- فن القصة: أيقونة وتدرّج حسب النوع والنبرة (بلا صور خارجية) ----------
  const KIND_IC = { hat: 'ball', brace: 'ball', assist: 'assist', star: 'star', stinker: 'arrowdown', drought: 'hourglass', streak: 'flame', injury: 'plus', upset: 'bolt', fest: 'party', leader: 'crown', crisis: 'warn',
    ucl: 'ucl', uclwin: 'trophy2', rumor: 'swap', young: 'sprout', veteran: 'old', bdm: 'gem', bdc: 'crown', tourwin: 'globe', tourup: 'globe',
    uPraise: 'star', uCrit: 'arrowdown', uRed: 'cardred', uHat: 'ball', uTitle: 'trophy', uRel: 'handshake', uSeason: 'calendar' };
  const TONE_CLS = { p: 'nt-p', c: 'nt-c', n: 'nt-n' };
  const TONE_PILL = { p: 'g', c: 'r', n: 'b' };
  const art = (a) => UI.ico(KIND_IC[a.k] || 'news');
  const feed = () => (G.Press ? G.Press.get().feed : []);
  const byId = (id) => feed().find((x) => x.id === Number(id));
  const wk = (a) => (a.s === S_().season ? 'الأسبوع ' + a.w : G.Season.label(a.s) + ' · أ' + a.w);

  // ---------- السكك: كل خبر يذهب إلى أول سكة تناسبه ----------
  const RAILS = [
    ['u', 'عنك', 'user', (a) => !!a.u],
    ['lg', 'الدوريات والقارة', 'ucl', (a) => ['upset', 'fest', 'leader', 'crisis', 'ucl', 'uclwin'].indexOf(a.k) >= 0],
    ['mk', 'ميركاتو وشائعات', 'swap', (a) => a.k === 'rumor'],
    ['st', 'نجوم ومواهب', 'star', (a) => ['hat', 'brace', 'assist', 'star', 'stinker', 'drought', 'streak', 'injury', 'young', 'veteran'].indexOf(a.k) >= 0],
    ['gl', 'الكرة الذهبية والبطولات', 'gem', (a) => ['bdm', 'bdc', 'tourwin', 'tourup'].indexOf(a.k) >= 0]
  ];

  function leadOf(list) {
    return list.find((a) => a.u && a.big) || list.find((a) => a.big) || list.find((a) => a.u) || list[0];
  }

  function story(a, isNew) {
    const o = G.Press.OUTLETS[a.o];
    return '<button class="nws ' + TONE_CLS[a.t] + '" data-a="newsOpen" data-v="' + a.id + '"><span class="nws-art">' + art(a) + '</span>' +
      '<span class="nws-top"><i class="nws-lt">' + esc(o.n.charAt(0)) + '</i><span>' + esc(o.n) + '</span>' + (isNew ? '<em class="nws-new">جديد</em>' : '') + '</span>' +
      '<b class="nws-h">' + esc(a.h) + '</b><span class="nws-f"><span>' + G.Press.TONE_AR[a.t] + '</span><span>' + wk(a) + '</span></span></button>';
  }

  function leadCard(a, isNew) {
    const o = G.Press.OUTLETS[a.o], P = a.pid ? G.S.players[a.pid] : null;
    return '<button class="nws-lead ' + TONE_CLS[a.t] + '" data-a="newsOpen" data-v="' + a.id + '"><span class="nws-lart">' + art(a) + '</span>' +
      '<span class="nws-ltop"><span class="pill ' + TONE_PILL[a.t] + '">' + G.Press.TONE_AR[a.t] + '</span>' + (a.u ? '<span class="pill y">عنك</span>' : '') + (isNew ? '<span class="pill y">جديد</span>' : '') + '<span class="nws-lo">' + esc(o.n) + ' · ' + wk(a) + '</span></span>' +
      '<span class="nws-lh">' + esc(a.h) + '</span><span class="nws-lb">' + esc(a.b) + '</span>' +
      '<span class="nws-lf">' + (P && !a.u ? '<span>' + esc(P.n) + ' · ' + esc(UI.cname(P.club)) + '</span>' : '<span></span>') + '<span class="nws-more">اقرأ القصة ' + UI.ico('arrowl') + '</span></span></button>';
  }

  // شريط عاجل: عناوين متتابعة بحركة CSS خفيفة (تتوقف مع تقليل الحركة)
  function ticker(list) {
    const items = list.slice(0, 7).map((a) => '<button data-a="newsOpen" data-v="' + a.id + '" class="' + TONE_CLS[a.t] + '"><i></i>' + esc(a.h) + '</button>').join('');
    if (!items) return '';
    return '<div class="nws-tick" aria-label="عناوين عاجلة"><span class="nws-tk-l">' + UI.ico('bolt') + ' عاجل</span><div class="nws-tk-w"><div class="nws-tk-in">' + items + '<span class="nws-tk-dup" aria-hidden="true">' + items.replace(/data-a="newsOpen"/g, 'tabindex="-1" data-a="newsOpen"') + '</span></div></div></div>';
  }

  function toolbar(ty, ou) {
    const T = [['all', 'الكل'], ['p', 'مديح'], ['c', 'نقد'], ['n', 'أخبار']];
    return '<div class="nws-bar"><div class="seg4">' + T.map((t) => '<button class="' + (ty === t[0] ? 'on' : '') + '" data-a="pressT" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      '<button class="nws-src' + (ou !== 'all' ? ' on' : '') + '" data-a="pressSrc">' + UI.ico('news') + '<span>' + (ou === 'all' ? 'الصحف' : esc(G.Press.OUTLETS[Number(ou)].n)) + '</span></button></div>';
  }

  const disclaimer = () => '<p class="sm mut nws-disc">عشر صحف ومواقع تكتب عنك وعن نجوم العالم: مديح وانتقاد وأخبار. الصحف خيالية والنصوص مُحاكاة بأسماء لاعبين حقيقيين.</p>';

  UI.screens.press = () => {
    const pr = G.Press.get();
    if (UI._pressBase == null) UI._pressBase = pr.seen;
    const base = UI._pressBase, S = S_();
    const ty = UI.sub.pressT || 'all', ou = UI.sub.pressO == null ? 'all' : UI.sub.pressO, rail = UI.sub.pressR || '', lim = UI.sub.pressN || 20;
    G.Press.markSeen();
    let h = '<section class="nws-mast"><div><h2>الصفحة الأولى</h2><div class="sm mut">' + G.Season.label(S.season) + (S.phase === 'season' ? ' · ' + UI.week() : '') + ' · ' + pr.feed.length + ' خبرًا</div></div></section>';
    if (!pr.feed.length) return h + UI.empty('news', 'لم تصدر أخبار بعد', 'ستبدأ الصحف العشر الكتابة عنك وعن نجوم العالم مع انطلاق الموسم.');
    h += toolbar(ty, ou);
    const f = {};
    if (ty !== 'all') f.tone = ty;
    if (ou !== 'all') f.outlet = Number(ou);
    const list = G.Press.list(f);
    const R = RAILS.find((r) => r[0] === rail);
    const filtered = ty !== 'all' || ou !== 'all' || !!R;
    if (filtered) {
      const rows = R ? list.filter(R[3]) : list;
      h += '<div class="nws-res"><b>' + (R ? esc(R[1]) : 'نتائج الترشيح') + '</b><span class="mut sm">' + rows.length + ' خبرًا</span><button class="chip" data-a="pressClear">' + UI.ico('x') + ' عرض الصفحة الأولى</button></div>';
      if (!rows.length) return h + UI.empty('news', 'لا أخبار بهذا الترشيح', 'جرّب نبرة أو صحيفة أخرى.');
      h += '<div class="nws-list">' + rows.slice(0, lim).map((a) => {
        const o = G.Press.OUTLETS[a.o];
        return '<button class="nws-row ' + TONE_CLS[a.t] + '" data-a="newsOpen" data-v="' + a.id + '"><span class="nws-ri">' + art(a) + '</span><span class="nws-rt"><b>' + esc(a.h) + '</b><small>' + esc(o.n) + ' · ' + wk(a) + (a.id > base ? ' · <em>جديد</em>' : '') + '</small></span></button>';
      }).join('') + '</div>';
      if (rows.length > lim) h += '<button class="btn" data-a="pressMore">عرض المزيد (' + (rows.length - lim) + ')</button>';
      return h + disclaimer();
    }
    // الصفحة الأولى
    const lead = leadOf(list);
    h += leadCard(lead, lead.id > base) + ticker(list.filter((a) => a !== lead));
    const used = { [lead.id]: 1 };
    RAILS.forEach((r) => {
      const items = list.filter((a) => !used[a.id] && r[3](a));
      if (!items.length) return;
      const shown = items.slice(0, 9); shown.forEach((a) => { used[a.id] = 1; });
      h += '<section class="nws-rail"><header><span class="nws-rt-i">' + UI.ico(r[2]) + '</span><b>' + r[1] + '</b><span class="mut sm">' + items.length + '</span><button class="nws-all" data-a="pressRail" data-v="' + r[0] + '">عرض الكل ' + UI.ico('arrowl') + '</button></header>' +
        '<div class="nws-track">' + shown.map((a) => story(a, a.id > base)).join('') + '</div></section>';
    });
    return h + disclaimer();
  };

  // قارئ القصة
  UI.on('newsOpen', (id) => {
    const a = byId(id);
    if (!a) return false;
    const o = G.Press.OUTLETS[a.o], P = a.pid ? G.S.players[a.pid] : null;
    UI.sheet('<div class="nws-sh ' + TONE_CLS[a.t] + '"><div class="nws-sh-art">' + art(a) + '</div><div class="nws-sh-meta"><span class="pill ' + TONE_PILL[a.t] + '">' + G.Press.TONE_AR[a.t] + '</span>' + (a.u ? '<span class="pill y">عنك</span>' : '') +
      '<span class="mut sm">' + esc(o.n) + ' · ' + wk(a) + '</span></div><h3 class="nws-sh-h">' + esc(a.h) + '</h3><p class="nws-sh-b">' + esc(a.b) + '</p>' +
      (P ? '<div class="nws-sh-p">' + UI.badge(P.club, 28) + '<div><b>' + esc(P.n) + '</b><small>' + esc(UI.cname(P.club)) + ' · ' + G.POS_AR[P.pos] + ' · ' + P.age + ' سنة</small></div><span class="ovr-mini">' + P.ovr + '</span></div>' : '') +
      '<p class="sm mut">النص مُحاكاة والصحيفة خيالية.</p><button class="btn pri" data-a="closeSheet">إغلاق</button></div>');
    return false;
  });
  UI.on('pressClear', () => { UI.sub.pressT = 'all'; UI.sub.pressO = 'all'; UI.sub.pressR = ''; UI.sub.pressN = 20; });
  UI.on('pressRail', (v) => { UI.sub.pressR = v; UI.sub.pressN = 20; window.scrollTo(0, 0); });
  UI.on('pressSrc', () => {
    const cur = UI.sub.pressO == null ? 'all' : UI.sub.pressO;
    UI.sheet('<h3>الصحف</h3><div class="nws-src-g"><button class="chip ' + (cur === 'all' ? 'on' : '') + '" data-a="pressO" data-v="all">كل الصحف</button>' +
      G.Press.OUTLETS.map((o, i) => '<button class="chip ' + (String(cur) === String(i) ? 'on' : '') + '" data-a="pressO" data-v="' + i + '"><i class="nws-lt">' + esc(o.n.charAt(0)) + '</i> ' + esc(o.n) + '</button>').join('') + '</div><button class="btn" data-a="closeSheet">إغلاق</button>');
    return false;
  });
  UI.on('pressT', (v) => { UI.sub.pressT = v; UI.sub.pressR = ''; UI.sub.pressN = 20; });
  UI.on('pressO', (v) => { UI.sub.pressO = v; UI.sub.pressR = ''; UI.sub.pressN = 20; UI.closeSheet(); });
  UI.on('pressMore', () => { UI.sub.pressN = (UI.sub.pressN || 20) + 20; });

  // ======================= مركز القرارات =======================
  // كل بطاقة مشتقة من حالة حقيقية، وزرها يستدعي فعلًا موجودًا (لا أزرار وهمية). tone: hot عاجل · warn مهم · ok عادي
  UI.decisions = () => {
    const S = S_();
    if (!S || !S.players || S.phase === 'retired') return [];
    const u = me(), out = [], money = UI.money;
    // 1) مؤتمر صحفي: إجابتك تغيّر الشعبية وعلاقة الصحافة وثقة المدرب
    const pr = G.Media && G.Media.pending();
    if (pr) out.push({ id: 'press', ic: 'mic', tone: 'warn', t: 'مؤتمر صحفي ينتظرك', s: '«' + G.Media.question(pr) + '»', fx: 'يؤثر على: الشعبية · علاقة الصحافة · ثقة المدرب', cta: 'أجب عن السؤال', a: 'pressOpen' });
    // 2) عروض الانتقال
    const offs = (S.offers || []).filter((o) => o.status !== 'withdrawn');
    if (offs.length) {
      const best = offs.slice().sort((a, b) => (b.wage * (b.years || 1)) - (a.wage * (a.years || 1)))[0];
      const soon = Math.min.apply(null, offs.filter((o) => o.expires != null && o.type !== 'free').map((o) => o.expires - S.week).concat([99]));
      out.push({ id: 'offers', ic: 'swap', tone: soon <= 1 ? 'hot' : 'warn', t: offs.length === 1 ? 'عرض من ' + UI.cname(best.club) : offs.length + ' عروض بانتظارك',
        s: (best.type === 'loan' ? 'إعارة' : best.type === 'free' ? 'توقيع حر' : 'رسوم ' + money(best.fee)) + ' · راتب ' + money(best.wage) + ' أسبوعيًا' + (soon < 99 ? ' · ' + (soon <= 0 ? 'ينتهي هذا الأسبوع' : 'ينتهي بعد ' + soon + ' أسبوع') : ''),
        fx: 'يغيّر: ناديك · راتبك · دورك وثقة المدرب', cta: 'افتح العروض', a: 'goSub', v: 'market', v2: 'mk:offers' });
    }
    // 3) العقد
    if (S.userExpired) out.push({ id: 'ct', ic: 'clipboard', tone: 'hot', t: 'انتهى عقدك', s: 'لا يمكنك بدء الموسم قبل التجديد أو التوقيع مع نادٍ.', fx: 'يحدد: مستقبلك ونادي الموسم القادم', cta: 'العقود', a: 'goSub', v: 'market', v2: 'mk:contract' });
    else if (u.ct && u.ct.y <= 1 && !u.parentPays) out.push({ id: 'ct', ic: 'clipboard', tone: 'warn', t: 'عقدك يقترب من نهايته', s: 'تبقّت سنة · ' + money(u.ct.w) + ' أسبوعيًا مع ' + UI.cname(u.club), fx: 'التجديد يرفع ثقة المدرب ويحمي مركزك', cta: 'جدّد عقدك', a: 'goSub', v: 'market', v2: 'mk:contract' });
    // 4) نقاط التطوير
    if (u.dp > 0) out.push({ id: 'dp', ic: 'bolt', tone: 'ok', t: 'نقاط تطوير غير مستثمرة', s: u.dp + ' نقطة جاهزة لرفع سماتك', fx: 'ترفع تقييمك العام فورًا', cta: 'استثمرها', a: 'go', v: 'train' });
    // 5) مباراة بانتظارك
    const fx = G.Season.pending && G.Season.pending();
    if (fx) { const opp = fx.h === u.club ? fx.a : fx.h; out.push({ id: 'match', ic: 'pitch', tone: 'ok', t: 'مباراتك بانتظارك', s: 'ضد ' + UI.cname(opp) + ' · ' + UI.fixLabel(fx), fx: 'العبها بنفسك لتتحكم بلحظات القرار، أو حاكِها', cta: 'مركز المباريات', a: 'go', v: 'matches' }); }
    // 6) إغلاق السوق الشتوي
    if (S.window && S.window.open && S.window.kind === 'winter') {
      const left = G.Season.WINTER_CLOSE - S.week;
      if (left <= 2) out.push({ id: 'win', ic: 'hourglass', tone: left <= 0 ? 'hot' : 'warn', t: 'السوق الشتوي يُغلق قريبًا', s: left <= 0 ? 'آخر أسبوع لاتخاذ قرارك' : 'بعد ' + left + ' أسبوع تُسحب كل العروض', fx: 'تُلغى العروض عند الإغلاق', cta: 'الانتقالات', a: 'go', v: 'market' });
    }
    return out;
  };
  const TONE_ORD = { hot: 0, warn: 1, ok: 2 };
  const dAttr = (d) => ' data-a="' + d.a + '"' + (d.v ? ' data-v="' + d.v + '"' : '') + (d.v2 ? ' data-v2="' + d.v2 + '"' : '');

  function decCard(d) {
    return '<div class="dcs ' + d.tone + '"><span class="dcs-ic">' + UI.ico(d.ic) + '</span><div class="dcs-t"><b>' + esc(d.t) + '</b><span>' + esc(d.s) + '</span></div>' +
      '<small class="dcs-fx">' + esc(d.fx) + '</small><button class="btn ' + (d.tone === 'ok' ? '' : 'pri') + '"' + dAttr(d) + '>' + esc(d.cta) + '</button></div>';
  }

  function relations() {
    const u = me(), M = G.Media, m = M ? M.get() : null;
    const tr = Math.round(u.trust == null ? 45 : u.trust), pop = m ? Math.round(m.pop) : 0, mood = m ? m.mood : 0;
    const cell = (ring, lab, sub) => '<div class="rel">' + ring + '<b>' + lab + '</b><small>' + sub + '</small></div>';
    let h = '<div class="card rel-card"><h4>ما تتأثر به قراراتك</h4><div class="rel-g">' +
      cell(UI.ring(tr / 100, tr, '', 74, tr < 30 ? 'red' : tr < 55 ? 'gold' : ''), 'ثقة المدرب', G.Coach.trustLabel(tr)) +
      cell(UI.ring(pop / 100, pop, '', 74, 'gold'), 'الشعبية', M ? M.fmtFans(M.fans()) + ' متابع' : '') +
      cell(UI.ring(U.clamp((mood + 40) / 80, 0, 1), (mood > 0 ? '+' : '') + Math.round(mood), '', 74, mood < -6 ? 'red' : ''), 'علاقة الصحافة', M ? M.moodLabel(mood) : '') + '</div>';
    const l = m && m.last;
    if (l) {
      const chip = (lab, v, d) => (v ? '<span class="pill ' + (v > 0 ? 'g' : 'r') + '">' + lab + ' <b class="ltr">' + (v > 0 ? '+' : '−') + String(Math.abs(v).toFixed(d == null ? 1 : d)).replace(/\.0$/, '') + '</b></span>' : '');
      h += '<div class="rel-last"><div class="sm mut">آخر قرار إعلامي · ' + (l.s === G.S.season ? 'الأسبوع ' + l.w : G.Season.label(l.s)) + '</div><div class="rel-tx">' + (l.back ? 'ارتدّ عليك: ' : '') + esc(l.txt) + '</div><div class="chips">' +
        chip('الشعبية', l.fx[0]) + chip('الصحافة', l.fx[1], 0) + chip('ثقة المدرب', l.fx[2]) + '</div></div>';
    } else h += '<p class="sm mut" style="margin:10px 0 0">ستظهر هنا نتيجة آخر قرار إعلامي اتخذتَه، وكل قرار (مؤتمر، عرض، عقد) يترك أثره على هذه المؤشرات.</p>';
    return h + '</div>';
  }

  // ---------- الخط الزمني للرسائل ----------
  const GROUPS = { all: null, offers: ['offer', 'contract', 'agent'], awards: ['award'], other: ['news', 'training', 'injury', 'coach', 'media'] };
  const KIND = { news: ['news', 'b'], offer: ['swap', 'y'], contract: ['clipboard', 'y'], training: ['dumbbell', 'g'], injury: ['plus', 'r'], coach: ['whistle', 'b'], award: ['trophy', 'y'], media: ['megaphone', 'b'], agent: ['swap', 'y'] };
  const ACT = { offer: ['العروض', 'goSub', 'market', 'mk:offers'], contract: ['العقد', 'goSub', 'market', 'mk:contract'], award: ['غرفة الكؤوس', 'go', 'trophies'], training: ['التدريب', 'go', 'train'], injury: ['النادي', 'go', 'club'], coach: ['قرار المدرب', 'goSub', 'train', 'tr:coach'], media: ['مسيرتي', 'go', 'profile'] };

  function msgRow(m, fresh, open) {
    const k = KIND[m.kind] || KIND.news, ac = ACT[m.kind];
    return '<div class="ibx-m ' + k[1] + (fresh ? ' fresh' : '') + (open ? ' open' : '') + '"><button class="ibx-b" data-a="ibToggle" data-v="' + m.id + '" aria-expanded="' + (open ? 'true' : 'false') + '"><span class="ibx-ic">' + UI.ico(k[0]) + '</span><span class="ibx-t"><b>' + esc(m.title) + '</b><span>' + esc(m.text) + '</span></span>' + (fresh ? '<i class="ibx-dot" aria-label="جديد"></i>' : '') + '</button>' +
      (open && ac ? '<button class="ibx-go" data-a="' + ac[1] + '" data-v="' + ac[2] + '"' + (ac[3] ? ' data-v2="' + ac[3] + '"' : '') + '>' + esc(ac[0]) + ' ' + UI.ico('arrowl') + '</button>' : '') + '</div>';
  }

  UI.screens.inbox = () => {
    const S = S_(), tab = UI.curTab('ib', 'all'), kinds = GROUPS[tab] || null;
    if (UI._ibBase == null) UI._ibBase = (S.inbox || []).filter((m) => !m.read).map((m) => m.id);
    const fresh = UI._ibBase;
    const dec = UI.decisions().sort((a, b) => TONE_ORD[a.tone] - TONE_ORD[b.tone]);
    let h = '<section class="nws-mast"><div><h2>مركز القرارات</h2><div class="sm mut">' + (dec.length ? dec.length + (dec.length === 1 ? ' قرار ينتظرك' : ' قرارات تنتظرك') : 'لا شيء ينتظر قرارك الآن') + '</div></div></section>';
    h += dec.length ? '<div class="dcs-track">' + dec.map(decCard).join('') + '</div>' : '<div class="dcs-calm">' + UI.ico('check2') + '<div><b>أسبوع هادئ</b><span>لا عروض ولا مؤتمرات ولا عقود تحتاج انتباهك. تابع مبارياتك وتدريبك.</span></div></div>';
    h += relations();
    const list = (S.inbox || []).filter((m) => !kinds || kinds.indexOf(m.kind) >= 0);
    h += '<h4 class="ibx-h">الخط الزمني</h4>' + UI.tabs('ib', [['all', 'الكل'], ['offers', 'العروض والعقود'], ['awards', 'الجوائز'], ['other', 'أخرى']], 'all');
    if (!list.length) h += UI.empty('mail', 'لا رسائل', 'ستصلك هنا العروض والجوائز وأخبار تدريبك.');
    else {
      const openId = UI.sub.ibOpen;
      let last = '';
      h += '<div class="ibx">';
      list.slice(0, 50).forEach((m) => {
        const g = m.week ? G.Season.label(m.season) + ' · الأسبوع ' + m.week : G.Season.label(m.season) + ' · قبل الموسم';
        if (g !== last) { h += '<div class="ibx-g">' + g + '</div>'; last = g; }
        h += msgRow(m, fresh.indexOf(m.id) >= 0, openId === m.id);
      });
      h += '</div>';
    }
    (S.inbox || []).forEach((m) => { m.read = true; });
    UI.after = () => { const b = document.getElementById('inboxBadge'); if (b) b.classList.add('hidden'); G.Save.save(); };
    return h;
  };
  UI.on('ibToggle', (id) => { UI.sub.ibOpen = String(UI.sub.ibOpen) === String(id) ? null : Number(id); });

  // ======================= الرئيسية: شريط القرارات + الشريط العاجل =======================
  // شريط القرارات يأتي مباشرة بعد المباراة القادمة (الأهم أولًا)؛ المؤتمر والمباراة لهما بطاقتاهما في الرئيسية فلا يتكرران هنا
  UI.decisionStrip = () => {
    const dec = UI.decisions().filter((d) => d.id !== 'press' && d.id !== 'match');
    if (!dec.length) return '';
    return '<div class="dock-dec">' + dec.slice(0, 4).map((d) => '<button class="dk ' + d.tone + '"' + dAttr(d) + '><span>' + UI.ico(d.ic) + '</span><b>' + esc(d.t) + '</b><small>' + esc(d.cta) + '</small></button>').join('') + '</div>';
  };
  UI.newsDock = () => {
    const pr = G.Press ? G.Press.get() : null;
    const unI = G.Inbox.unread(), inb = '<button class="chip" data-a="go" data-v="inbox">' + UI.ico('mail') + ' صندوقي' + (unI ? '<i class="dk-n">' + unI + '</i>' : '') + '</button>';
    if (pr && pr.feed.length) {
      const un = G.Press.unread();
      return '<div class="dock-news">' + ticker(pr.feed) + '<div class="dock-links"><button class="chip" data-a="go" data-v="press">' + UI.ico('news') + ' غرفة الأخبار' + (un ? '<i class="dk-n">' + (un > 99 ? '99+' : un) + '</i>' : '') + '</button>' + inb + '</div></div>';
    }
    return (G.S.inbox || []).length ? '<div class="dock-links">' + inb + '</div>' : '';
  };

  // خط الأساس لعلامة «جديد» يُصفَّر عند مغادرة الشاشة كي لا يبقى قديمًا
  const baseRender = UI.render;
  UI.render = function () { const r = baseRender.apply(this, arguments); if (UI.cur !== 'inbox') UI._ibBase = null; if (UI.cur !== 'press') UI._pressBase = null; return r; };
})(window.G = window.G || {});
