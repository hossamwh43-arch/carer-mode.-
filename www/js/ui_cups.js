/* ui_cups.js — شاشة «الكأس والسوبر» وشاشة «سجل البطولات» وبطاقة الألقاب في ملفي.
   عرض فقط: لا يغيّر حالة اللعبة ولا يستهلك U.rnd. الكؤوس والسجل يأتيان من G.Cups وG.Trophies. */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const RA = () => G.Cups.ROUND_AR;
  const weeksTxt = (n) => (n <= 0 ? 'هذا الأسبوع' : n === 1 ? 'بعد أسبوع' : n === 2 ? 'بعد أسبوعين' : n <= 10 ? 'بعد ' + n + ' أسابيع' : 'بعد ' + n + ' أسبوعًا');

  // ---------- أدوات ----------
  const score = (f) => (f.played ? '<b class="cb-sc ltr">' + f.hg + ' - ' + f.ag + '</b>' + (f.pens ? '<small class="ltr">(' + f.pens.h + '-' + f.pens.a + ')</small>' : '') : '<span class="cb-vs">ضد</span>');
  function tieRow(f) {
    const uc = me().club, w = f.played ? G.Cups.tieWinner(f) : null, mine = f.h === uc || f.a === uc;
    const side = (id) => '<span class="cb-t' + (w === id ? ' win' : w ? ' lose' : '') + (id === uc ? ' me' : '') + '">' + UI.badge(id, 22) + '<span>' + esc(UI.cname(id)) + '</span></span>';
    return '<div class="cb-row' + (mine ? ' mine' : '') + '">' + side(f.h) + '<span class="cb-mid">' + score(f) + '</span>' + side(f.a) + '</div>';
  }
  const stat = (cup) => G.Cups.status(cup, me().club);

  // وصف حالة نادي المستخدم في الكأس (جملة + لون)
  function statusLine(cup) {
    const S = G.S, st = stat(cup);
    if (st.state === 'none') return { t: 'ناديك لا يشارك في هذه الكأس', c: 'mut' };
    if (st.state === 'winner') return { t: 'ناديك بطل الكأس 🏆', c: 'g' };
    if (st.state === 'out') return { t: 'ودّع ناديك عند ' + RA()[st.round], c: 'r' };
    const last = cup.rounds[cup.rounds.length - 1];
    if (st.bye) return { t: 'معفى من الدور التمهيدي — يدخل في دور الـ32', c: 'y' };
    if (st.tie && !st.tie.played) return { t: 'ناديك في ' + RA()[st.round] + ' · ' + weeksTxt(st.tie.w - S.week), c: 'y' };
    return { t: 'تأهل ناديك من ' + RA()[st.round] + ' — القرعة التالية بعد اكتمال الدور', c: 'y' };
  }

  // ---------- بطاقة الغلاف ----------
  function hero(cup) {
    const S = G.S, cn = cup.cn, last = cup.rounds[cup.rounds.length - 1], sl = statusLine(cup);
    const cur = cup.winner ? 'انتهت البطولة' : RA()[last.key] + ' · الأسبوع ' + last.w;
    const prog = cup.winner ? 1 : (cup.rounds.length - 1 + last.ties.filter((t) => t.played).length / Math.max(1, last.ties.length)) / 6;
    return '<section class="cup-hero"><div class="ch-ic">' + UI.ico('trophy') + '</div><div class="ch-in"><div class="ch-k">' + esc(G.Season.label(cup.season)) + ' · ' + cup.clubs.length + ' نادٍ من الدرجتين</div>' +
      '<h2>' + esc(G.cupName(cn)) + '</h2><div class="ch-st ' + sl.c + '">' + esc(sl.t) + '</div></div>' +
      '<div class="ch-bar"><div class="row sb sm"><span>' + cur + '</span>' + (cup.winner ? '<span>' + UI.badge(cup.winner, 18) + ' ' + esc(UI.cname(cup.winner)) + '</span>' : '<span class="mut">' + last.ties.filter((t) => t.played).length + '/' + last.ties.length + ' مباريات</span>') + '</div>' + UI.bar(U.clamp(prog, 0, 1) * 100, 'gold') + '</div></section>';
  }

  // ---------- تبويب القرعة والأدوار ----------
  const openMap = () => (UI.sub.cupOpen = UI.sub.cupOpen || {}); // UI.sub يُعاد إنشاؤه عند اللعبة الجديدة
  UI.on('cupRd', (k) => { const o = openMap(), cur = o[k] != null ? o[k] : null; o[k] = cur == null ? !isLastRound(k) : !cur; });
  const isLastRound = (k) => { const cup = G.Cups.userCup(); return !!cup && k === cup.season + cup.rounds[cup.rounds.length - 1].key; };

  function pathCard(cup) {
    const st = stat(cup), id = me().club;
    if (st.state === 'none') return '';
    const rows = [];
    cup.rounds.forEach((r) => {
      const t = r.ties.find((x) => x.h === id || x.a === id);
      if (t) {
        const opp = t.h === id ? t.a : t.h;
        if (t.played) {
          const gf = t.h === id ? t.hg : t.ag, ga = t.h === id ? t.ag : t.hg, win = G.Cups.tieWinner(t) === id;
          rows.push('<div class="rs"><span class="rs-w ' + (win ? 'w' : 'l') + '">' + (win ? 'ف' : 'خ') + '</span><span class="rs-m">' + UI.clubTag(opp, 22) + '<small class="mut">' + RA()[r.key] + ' · ' + (t.h === id ? 'على أرضك' : t.neutral ? 'ملعب محايد' : 'خارج أرضك') + '</small></span><b class="sco">' + gf + ' - ' + ga + (t.pens ? ' <small class="ltr">(' + (t.h === id ? t.pens.h + '-' + t.pens.a : t.pens.a + '-' + t.pens.h) + ')</small>' : '') + '</b></div>');
        } else {
          rows.push('<div class="rs"><span class="rs-w x">' + t.w + '</span><span class="rs-m">' + UI.clubTag(opp, 22) + '<small class="mut">' + RA()[r.key] + ' · ' + (t.neutral ? 'ملعب محايد' : t.h === id ? 'على أرضك' : 'خارج أرضك') + ' · ' + weeksTxt(t.w - G.S.week) + '</small></span><span class="pill y">القادمة</span></div>');
        }
      } else if ((r.byes || []).indexOf(id) >= 0) {
        rows.push('<div class="rs"><span class="rs-w x">—</span><span class="rs-m"><b>معفى من ' + RA()[r.key] + '</b><small class="mut">أحد أقوى الأندية سمعةً</small></span></div>');
      }
    });
    return '<div class="card"><h4>مسار ناديك</h4>' + (rows.length ? rows.join('') : '<div class="mut sm c">القرعة لم تُسحب بعد.</div>') + '</div>';
  }

  function roundBlock(cup, r, i, isLast) {
    const om = openMap(), open = om[cup.season + r.key] != null ? om[cup.season + r.key] : isLast, done = r.ties.every((t) => t.played), n = r.ties.filter((t) => t.played).length;
    let h = '<div class="card rd' + (open ? ' open' : '') + '"><button class="rd-h" data-a="cupRd" data-v="' + cup.season + r.key + '" aria-expanded="' + open + '"><span class="rd-t">' + RA()[r.key] + '</span><span class="rd-s">' + (done ? 'اكتمل' : n + '/' + r.ties.length) + ' · الأسبوع ' + r.w + '</span><i class="rd-c">' + UI.ico('chevl') + '</i></button>';
    if (open) {
      h += '<div class="rd-b">' + r.ties.map(tieRow).join('');
      if (r.byes && r.byes.length) {
        const top = r.byes.slice().sort((a, b) => G.S.clubs[b].rep - G.S.clubs[a].rep).slice(0, 6);
        h += '<div class="rd-by"><div class="sm mut">معفون مباشرة إلى دور الـ32 (' + r.byes.length + ' نادٍ) — أبرزهم:</div><div class="rd-chips">' + top.map((id) => UI.clubTag(id, 18)).join('') + '</div></div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  function bracketTab(cup) {
    let h = pathCard(cup);
    h += cup.rounds.slice().reverse().map((r, i) => roundBlock(cup, r, i, i === 0)).join('');
    return h;
  }

  function scorersTab(cup) {
    const set = {}; cup.clubs.forEach((id) => { set[id] = true; });
    const list = UI.statTop('cp', 'g', 12, (id) => !!set[id]);
    if (!list.length) return UI.empty('ball', 'لا أهداف بعد', 'ستظهر قائمة الهدافين مع تقدّم مباريات الكأس.');
    return UI.statTable(list, 'cp', 'g') + '<p class="sm mut" style="margin:0 2px">تشمل أهداف الأندية ذات التشكيلة الكاملة فقط؛ أندية الدرجة الثانية الخفيفة تُحاكى بالنتيجة.</p>';
  }

  // ---------- السوبر ----------
  function superCard(sp, mineOnly) {
    const S = G.S, f = sp.fix, uc = me().club, mine = f.h === uc || f.a === uc;
    let st = '';
    if (f.played) st = '<div class="c"><span class="pill ' + (sp.winner && (sp.winner === uc) ? 'g' : 'b') + '">بطل السوبر: ' + esc(UI.cname(sp.winner)) + '</span></div>';
    else st = '<div class="c sm mut">' + UI.ico('hourglass') + ' ' + (S.phase === 'season' ? weeksTxt(f.w - S.week) + ' · الأسبوع ' + f.w : 'يُلعب في الأسبوع ' + f.w + ' من الموسم') + '</div>';
    const side = (id) => '<div class="sp-t' + (id === uc ? ' me' : '') + '">' + UI.badge(id, 54) + '<b>' + esc(UI.cname(id)) + '</b><small class="mut">' + (id === sp.champ ? (sp.champ === sp.cupW ? 'بطل الدوري والكأس' : 'بطل الدوري') : id === sp.cupW ? 'بطل الكأس' : 'وصيف الدوري') + '</small></div>';
    return '<section class="card sup-card' + (mine ? ' mine' : '') + '"><div class="row sb"><h3>' + esc(G.supName(sp.cn)) + '</h3><span class="pill y">' + G.Season.label(sp.season) + '</span></div>' +
      '<div class="sp-teams">' + side(f.h) + '<div class="sp-mid">' + (f.played ? score(f) : '<span class="cb-vs">ضد</span>') + '</div>' + side(f.a) + '</div>' + st +
      '<p class="sm mut" style="margin:10px 0 0">مباراة واحدة على ملعب محايد بين بطل الدوري وبطل الكأس للموسم السابق' + (sp.champ === sp.cupW ? ' (حقق الثنائية، فيواجه وصيف الدوري)' : '') + '.' + (sp.seeded ? ' الموسم الأول يعتمد على أبطال 2024/25 الحقيقيين.' : '') + '</p>' +
      (mine && !f.played && S.phase === 'season' && S.week <= f.w ? '<p class="sm" style="margin:8px 0 0">' + UI.ico('bolt') + ' ناديك طرف في المباراة — تجدها في مركز المباريات.</p>' : '') + '</section>';
  }
  function superTab(cn) {
    const S = G.S, sp = S.cups.sup[cn];
    let h = superCard(sp);
    const past = (S.cupHist || []).filter((e) => e.sup && e.sup[cn]).slice(-6).reverse();
    if (past.length) h += '<div class="card"><h4>نسخ سابقة</h4>' + past.map((e) => '<div class="kv"><span>' + esc(e.label) + '</span><span>' + UI.clubTag(e.sup[cn], 18) + (e.supRun && e.supRun[cn] ? ' <span class="mut sm">على ' + esc(UI.cname(e.supRun[cn])) + '</span>' : '') + '</span></div>').join('') + '</div>';
    return h;
  }

  // ---------- أبطال الكؤوس (تاريخ) ----------
  function histTab(cn) {
    const S = G.S, past = (S.cupHist || []).filter((e) => e.cup && e.cup[cn]).slice().reverse();
    if (!past.length) return UI.empty('book', 'لا نسخ مكتملة بعد', 'يظهر هنا أبطال ' + esc(G.cupName(cn)) + ' بعد اكتمال الموسم الأول.');
    return '<div class="card"><h4>أبطال ' + esc(G.cupName(cn, true)) + '</h4>' + past.map((e) => '<div class="kv"><span>' + esc(e.label) + '</span><span>' + UI.clubTag(e.cup[cn], 20) + (e.cupRun && e.cupRun[cn] ? ' <span class="mut sm">على ' + esc(UI.cname(e.cupRun[cn])) + '</span>' : '') + '</span></div>').join('') + '</div>';
  }

  // ---------- كل الدوريات ----------
  function allTab() {
    const S = G.S;
    return G.Cups.COUNTRIES.map((cn) => {
      const cup = S.cups.cn[cn], sp = S.cups.sup[cn], last = cup.rounds[cup.rounds.length - 1];
      const cs = cup.winner ? '<span class="pill g">البطل: ' + esc(UI.cname(cup.winner)) + '</span>' : '<span class="pill b">' + RA()[last.key] + '</span>';
      const ss = sp.winner ? '<span class="pill g">' + esc(UI.cname(sp.winner)) + '</span>' : '<span class="pill">الأسبوع ' + sp.fix.w + '</span>';
      return '<div class="card"><div class="row sb"><h4>' + esc(G.leagueName(G.LG_TOP_OF[cn])) + '</h4>' + (cn === G.Cups.userCountry() ? '<span class="pill y">دوريك</span>' : '') + '</div>' +
        '<div class="kv"><span>' + UI.ico('trophy') + ' ' + esc(G.cupName(cn, true)) + '</span>' + cs + '</div>' +
        '<div class="kv"><span>' + UI.ico('shield') + ' ' + esc(G.supName(cn, true)) + '</span>' + ss + '</div>' +
        '<div class="sm mut" style="margin-top:6px">' + UI.clubTag(sp.fix.h, 18) + ' ضد ' + UI.clubTag(sp.fix.a, 18) + (sp.fix.played ? ' · ' + sp.fix.hg + '-' + sp.fix.ag + (sp.fix.pens ? ' (ر.ج)' : '') : '') + '</div></div>';
    }).join('');
  }

  UI.screens.cup = () => {
    const S = G.S;
    if (!S.cups) {
      return UI.empty('trophy', S.phase === 'summer' ? 'القرعة عند بدء الموسم' : 'لا كأس في هذا الموسم',
        S.phase === 'summer' ? 'تُسحب قرعة الكأس المحلية ويُحدَّد السوبر عند انطلاق الموسم.' : 'الكؤوس المحلية والسوبر تبدأ مع الموسم القادم (هذا الحفظ بدأ قبل إضافتها).');
    }
    const cn = G.Cups.userCountry(), cup = cn ? G.Cups.cupOf(cn) : null;
    if (!cup) {
      return '<div class="card"><div class="row"><span class="es-ic" style="font-size:28px">' + UI.ico('shield') + '</span><div><b>ناديك خارج الدوريات الكبرى</b><div class="sm mut">لا يشارك في كأس محلية، وهذه نظرة على كؤوس الدوريات الخمسة.</div></div></div></div>' + allTab();
    }
    const tabs = UI.tabs('cup', [['br', 'القرعة'], ['sc', 'الهدافون'], ['sp', 'السوبر'], ['hs', 'الأبطال'], ['all', 'الدوريات']], 'br'), t = UI.curTab('cup', 'br');
    return hero(cup) + tabs + (t === 'br' ? bracketTab(cup) : t === 'sc' ? scorersTab(cup) : t === 'sp' ? superTab(cn) : t === 'hs' ? histTab(cn) : allTab());
  };

  // سطر في «معاينة المباراة» لمباراة كأس/سوبر
  UI.cupLine = (fix) => {
    const S = G.S;
    if (fix.comp === 'SUP') return '<div class="card"><h4>' + esc(G.supName(fix.cn)) + '</h4><p class="sm mut" style="margin:0">مباراة واحدة حاسمة على ملعب محايد؛ عند التعادل: وقت إضافي ثم ركلات ترجيح.</p></div>';
    const cup = S.cups && S.cups.cn[fix.cn];
    if (!cup) return '';
    const rounds = cup.rounds.map((r) => RA()[r.key]), i = cup.rounds.findIndex((r) => r.key === fix.stage), left = fix.stage === 'final' ? 'النهائي: الفائز يحمل الكأس' : 'الفائز يتأهل إلى ' + (i >= 0 && i + 1 < cup.rounds.length ? RA()[cup.rounds[i + 1].key] : 'الدور التالي');
    return '<div class="card"><h4>' + esc(G.cupName(fix.cn, true)) + ' · ' + RA()[fix.stage] + '</h4><p class="sm mut" style="margin:0">إقصاء مباشر في مباراة واحدة؛ عند التعادل وقت إضافي ثم ركلات ترجيح. ' + left + '.</p></div>';
  };

  // ملاحظة بعد المباراة: ماذا حدث لنادي المستخدم في الكأس
  UI.cupNote = (fix, sm) => {
    if (!fix || (fix.comp !== 'CUP' && fix.comp !== 'SUP') || !fix.played) return '';
    const club = sm.userSide === 'h' ? fix.h : fix.a, win = G.Cups.tieWinner(fix) === club;
    if (fix.comp === 'SUP') return '<div class="notice ' + (win ? 'ok' : 'bad') + '">' + (win ? '🛡️ فاز ناديك بـ' + esc(G.supName(fix.cn)) + (sm.mins > 0 ? ' — اللقب في خزانتك!' : ' (لم تشارك فلا يُحتسب لك)') : 'خسر ناديك ' + esc(G.supName(fix.cn)) + '.') + '</div>';
    if (fix.stage === 'final') return '<div class="notice ' + (win ? 'ok' : 'bad') + '">' + (win ? '🏆 فاز ناديك بـ' + esc(G.cupName(fix.cn)) + (sm.mins > 0 ? ' — اللقب في خزانتك!' : ' (لم تشارك فلا يُحتسب لك)') : 'خسر ناديك نهائي ' + esc(G.cupName(fix.cn)) + '.') + '</div>';
    if (!win) return '<div class="notice bad">ودّع ناديك ' + esc(G.cupName(fix.cn, true)) + ' من ' + RA()[fix.stage] + '.</div>';
    const cup = G.S.cups && G.S.cups.cn[fix.cn], nx = cup && cup.rounds[cup.rounds.length - 1], t = nx && nx.key !== fix.stage ? nx.ties.find((x) => x.h === club || x.a === club) : null;
    return '<div class="notice ok">تأهل ناديك من ' + RA()[fix.stage] + (t ? ' — القادم: ' + RA()[nx.key] + ' ضد ' + esc(UI.cname(t.h === club ? t.a : t.h)) + ' (الأسبوع ' + t.w + ').' : ' — القرعة التالية بعد اكتمال الدور.') + '</div>';
  };

  // ======================= سجل البطولات =======================
  const T = () => G.Trophies;
  const chip = (e) => '<span class="tl-chip' + (e.r === 'f' ? ' f' : '') + '"><i>' + T().icon(e) + '</i><b>' + esc(T().name(e)) + '</b>' + (e.r === 'f' ? '<em>وصيف</em>' : '') + '</span>';

  // ---------- غرفة الكؤوس: أرفف بكؤوس مرسومة، تضيء ما فزتَ به وتعتّم ما لم تفز به بعد ----------
  const AW = [['scorer', 'الحذاء الذهبي', 'هداف الدوري'], ['player', 'أفضل لاعب', 'لاعب الموسم'], ['assist', 'أفضل صانع', 'صانع الأهداف'], ['uclp', 'نجم الأبطال', 'أفضل لاعب في دوري الأبطال'], ['young', 'أفضل شاب', 'أفضل لاعب شاب']];
  const AWT = { scorer: 'scorer', player: 'player', assist: 'assist', ucl: 'uclp', young: 'young' };
  const awardList = (p, k) => (p.awards || []).filter((a) => (AWT[a.type] || a.type) === k).map((a) => ({ s: a.season }));
  const fresh = (list) => list.some((e) => e.s === G.S.season && G.S.phase !== 'summer') ? ' fresh' : '';

  function tile(k, name, n, f, isFresh, sub) {
    return '<button class="vt-c tr-tile' + (n ? ' on' : '') + isFresh + '" data-a="trophyOpen" data-v="' + k + '" aria-label="' + esc(name) + '"><span class="vt-a">' + UI.trophyArt(k) + '</span><b>' + n + '</b><small>' + esc(name) + '</small>' + (f ? '<em>+' + f + ' وصيف</em>' : sub ? '<em>' + esc(sub) + '</em>' : '') + '</button>';
  }
  function vault(p) {
    const t = T(), tiers = G.LEAGUES[(G.S.lgId || 'ESP1')] ? G.LEAGUES[G.S.lgId].tier : 1;
    const main = ['liga', 'cup', 'sup', 'ucl', 'wc', 'bd'];
    if (tiers === 2) main[0] = 'd2';
    const keys = t.ORDER.filter((k) => main.indexOf(k) >= 0 || t.count(p, k) > 0 || t.count(p, k, 'f') > 0);
    const total = t.total(p), runner = t.list(p, 'f').length;
    return '<section class="vault room"><div class="vt-top"><div class="vt-n"><b>' + total + '</b><small>' + (total === 1 ? 'لقب' : 'ألقاب') + '</small></div><div class="vt-in"><h2>غرفة الكؤوس</h2><div class="sm mut">' + (runner ? runner + (runner === 1 ? ' وصافة' : ' وصافات') + ' في النهائيات · ' : '') + 'اضغط أي كأس لتفاصيله</div></div></div>' +
      '<div class="vt-grid shelf">' + keys.map((k) => {
        const n = t.count(p, k), f = t.count(p, k, 'f');
        return tile(k, t.KEYS[k][1], n, f, fresh(t.list(p, 'w').filter((e) => e.k === k)));
      }).join('') + '</div></section>';
  }
  function awardsCard(p) {
    const tot = AW.reduce((s, a) => s + awardList(p, a[0]).length, 0);
    return '<section class="vault room aw"><div class="vt-top"><div class="vt-n sm2"><b>' + tot + '</b><small>جوائز</small></div><div class="vt-in"><h2>الجوائز الفردية</h2><div class="sm mut">الحذاء الذهبي ولاعب العام وغيرها</div></div></div>' +
      '<div class="vt-grid shelf">' + AW.map((a) => { const l = awardList(p, a[0]); return tile(a[0], a[1], l.length, 0, fresh(l)); }).join('') + '</div></section>';
  }
  function milestones() {
    let A = [];
    try { A = UI.achievements ? UI.achievements(me()) : []; } catch (e) { A = []; }
    if (!A.length) return '';
    const done = A.filter((x) => x[2]);
    return '<div class="card ms"><div class="row sb"><h4 style="margin:0">محطات المسيرة</h4><span class="pill ' + (done.length ? 'y' : '') + '">' + done.length + ' / ' + A.length + '</span></div>' +
      (done.length ? '<div class="ms-l">' + done.map((x) => '<span class="ms-c"><i>' + x[0] + '</i>' + esc(x[1]) + '</span>').join('') + '</div>' : '<p class="sm mut" style="margin:8px 0 0">لا محطات بعد — أول هدف أو أول مباراة تفتح أولها.</p>') +
      '<button class="btn sm" data-a="goSub" data-v="stats" data-v2="st:ach" style="width:100%;margin-top:10px">كل الإنجازات</button></div>';
  }

  UI.on('trophyOpen', (k) => {
    const p = me(), t = T(), aw = AW.filter((a) => a[0] === k)[0];
    const name = aw ? aw[1] : t.KEYS[k][1];
    const w = aw ? awardList(p, k) : t.list(p, 'w').filter((e) => e.k === k), f = aw ? [] : t.list(p, 'f').filter((e) => e.k === k);
    const row = (e, win) => '<div class="kv"><span>' + (win ? '🏆' : '🥈') + ' ' + esc(aw ? aw[2] : t.name(e)) + (win ? '' : ' <em class="mut">(وصيف)</em>') + '</span><span class="sm" style="text-align:end">' + esc(t.when(e)) + (e.c && G.S.clubs[e.c] ? ' · ' + esc(UI.cname(e.c)) : '') + '</span></div>';
    UI.sheet('<div class="tr-sheet' + (w.length ? ' on' : '') + '"><div class="tr-hero">' + UI.trophyArt(k, 'big') + '</div><h3>' + esc(name) + '</h3><div class="tr-n"><b>' + w.length + '</b> ' + (w.length === 1 ? 'لقب' : 'مرات') + (f.length ? ' · ' + f.length + ' وصيف' : '') + '</div>' +
      (w.length || f.length ? T().sorted ? '<div class="card">' + (aw ? w.map((e) => row(e, true)).join('') : t.sorted(p).filter((e) => e.k === k).map((e) => row(e, e.r === 'w')).join('')) + '</div>' : '' : '<p class="sm mut" style="text-align:center">لم تفز به بعد — هو بانتظارك.</p>') +
      '<button class="btn pri" data-a="closeSheet">إغلاق</button></div>');
    return false;
  });

  // المنافسات الجارية: ما الذي يمكن الفوز به هذا الموسم
  function ongoing() {
    const S = G.S, u = me();
    if (S.phase !== 'season' && S.phase !== 'end') return '';
    const rows = [];
    try {
      if (S.league && S.league.table[u.club] && S.phase === 'season') rows.push(['🥇', G.leagueName(S.league.lg), S.league.table[u.club].p ? 'المركز ' + G.League.position(u.club) + ' · ' + S.league.table[u.club].pts + ' نقطة' : 'الجولة الأولى قريبًا']);
      const cs = G.Sim.cupStatus(), us = G.Sim.uclStatus();
      if (cs) rows.push(['🏆', cs.name, cs.text]);
      if (us && !/^out/.test(us.key) && us.key !== 'win') rows.push(['⭐', 'دوري أبطال أوروبا', us.text]);
      const sp = G.Cups.userSuper();
      if (sp && !sp.fix.played && (sp.fix.h === u.club || sp.fix.a === u.club)) rows.push(['🛡️', G.supName(sp.cn), 'الأسبوع ' + sp.fix.w]);
    } catch (e) { /* عرض فقط */ }
    if (!rows.length) return '';
    return '<div class="card"><h4>المنافسات الجارية</h4>' + rows.map((r) => '<div class="kv"><span>' + r[0] + ' ' + esc(r[1]) + '</span><span class="sm" style="text-align:end">' + esc(r[2]) + '</span></div>').join('') + '</div>';
  }

  function timeline(p) {
    const list = T().sorted(p);
    const groups = [], idx = {};
    list.forEach((e) => { const k = e.y ? 'y' + e.y : 's' + e.s; if (idx[k] == null) { idx[k] = groups.length; groups.push({ k, when: T().when(e), s: e.s, club: e.c, items: [] }); } groups[idx[k]].items.push(e); });
    return groups.map((g) => '<div class="tl-g"><div class="tl-d"></div><div class="tl-h"><b>' + esc(g.when) + '</b>' + (g.club && G.S.clubs[g.club] ? '<span class="mut sm">' + UI.clubTag(g.club, 18) + '</span>' : '') + '</div><div class="tl-l">' + g.items.map(chip).join('') + '</div></div>').join('');
  }

  function byComp(p) {
    const list = T().sorted(p), map = {};
    list.forEach((e) => { const nm = T().name(e); const k = e.k + '|' + nm; (map[k] = map[k] || { e, nm, w: [], f: [] })[e.r === 'w' ? 'w' : 'f'].push(e); });
    const arr = Object.keys(map).map((k) => map[k]).sort((a, b) => (b.w.length - a.w.length) || (b.f.length - a.f.length) || (T().ORDER.indexOf(a.e.k) - T().ORDER.indexOf(b.e.k)));
    return arr.map((o) => '<div class="card tl-c"><div class="row sb"><b>' + T().KEYS[o.e.k][0] + ' ' + esc(o.nm) + '</b><span class="pill ' + (o.w.length ? 'y' : '') + '">' + o.w.length + (o.w.length === 1 ? ' لقب' : ' ألقاب') + '</span></div>' +
      (o.w.length ? '<div class="tl-yrs">' + o.w.map((e) => '<span class="yr">' + esc(T().when(e)) + '</span>').join('') + '</div>' : '') +
      (o.f.length ? '<div class="sm mut" style="margin-top:6px">🥈 وصيف: ' + o.f.map((e) => esc(T().when(e))).join(' · ') + '</div>' : '') + '</div>').join('');
  }

  UI.screens.trophies = () => {
    const p = me(), t = T();
    const hasAny = t.list(p).length > 0;
    let h = vault(p) + awardsCard(p) + ongoing();
    if (!hasAny) {
      return h + milestones() + UI.empty('trophy', 'لا ألقاب بعد', 'الدوري والكأس والسوبر ودوري الأبطال بانتظارك. كل لقب يُسجَّل هنا مع موسمه ونادٍ تحقق معه.');
    }
    const tabs = UI.tabs('tl', [['tl', 'حسب الموسم'], ['by', 'حسب البطولة']], 'tl'), tab = UI.curTab('tl', 'tl');
    return h + milestones() + tabs + (tab === 'tl' ? '<div class="tl">' + timeline(p) + '</div>' : byComp(p)) +
      '<p class="sm mut" style="margin:6px 2px 0">يُحتسب اللقب إذا شاركتَ فعلًا (دقائق لعب) مع ناديك في البطولة؛ ويُسجَّل «وصيف» عند خسارة النهائي بالشرط نفسه.</p>';
  };

  // بطاقة مختصرة في «ملفي»: عدد الألقاب وزر السجل
  UI.trophyCard = () => {
    const p = me(), t = T(), total = t.total(p), last = t.sorted(p, 'w')[0];
    return '<div class="card"><div class="row sb"><div class="row"><span class="tc-i">' + UI.ico('trophy') + '</span><div><b>الألقاب</b><div class="sm mut">' + (total ? total + (total === 1 ? ' لقب' : ' ألقاب') + (last ? ' · آخرها ' + esc(t.name(last)) + ' (' + esc(t.when(last)) + ')' : '') : 'لم تفز بلقب بعد') + '</div></div></div>' +
      '<button class="btn sm" data-a="go" data-v="trophies">السجل</button></div></div>';
  };
})(window.G = window.G || {});
