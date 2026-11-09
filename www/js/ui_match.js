/* ui_match.js — شاشة المباراة: بث مباشر دقيقة بدقيقة، لحظات القرار التفاعلية، التبديل، الاستئناف، وملخص ما بعد المباراة */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc, $ = (s) => document.querySelector(s);
  const SPEED = { 1: 260, 2: 110, 3: 35 };
  const P = (id) => G.S.players[id];
  const activeM = () => (G.S && G.S.active ? G.S.active.m : null);

  // ---------- المؤثرات: صوت + اهتزاز + لافتة الأهداف (كلها زينة: لا تلمس العشوائية ولا حالة اللعبة) ----------
  const FX_WHISTLE = { kick: 'whistle', ht: 'whistle2', et: 'whistle2', pens: 'whistle2', ft: 'whistle3' };
  const pname = (id) => { const q = id && G.S.players[id]; return q ? q.n : ''; };
  const crowdOn = () => { if (G.Audio && UI.prefs.sound !== false) G.Audio.crowd(true); };
  const crowdOff = () => { if (G.Audio) G.Audio.crowd(false); };
  // يعالج الأحداث الجديدة منذ آخر رسم. quick: صافرة النهاية فقط (إنهاء فوري أو أحداث كثيرة دفعة واحدة)
  function fxEvents(m, quick) {
    const mv = UI.mv;
    if (!mv || !UI.fx || !m.ev) return;
    const n = m.ev.length;
    if (mv.seen == null || mv.seen > n) { mv.seen = n; return; }
    if (n - mv.seen > 8) quick = true;
    const uid = G.S.user, me = m.side;
    for (let i = mv.seen; i < n; i++) {
      const e = m.ev[i];
      if (quick && e.k !== 'ft') continue;
      const mine = e.s === me, byMe = e.p === uid;
      if (FX_WHISTLE[e.k]) UI.snd(FX_WHISTLE[e.k]);
      else if (e.k === 'goal') {
        const info = pname(e.p) + ' · \u2066' + e.lab + "'\u2069"; // الدقيقة داخل عزل LTR كي لا ينقلب الفاصل العلوي في سطر عربي
        if (mine && byMe) { UI.fx('goalMe'); UI.banner('me', '⚽ هدف! هدفك أنت', info); }
        else if (mine) { UI.fx('goal'); UI.banner('team', '⚽ هدف لفريقك', info + (e.p2 === uid ? ' · 🅰️ صنعتَه أنت' : '')); }
        else { UI.fx('oppGoal'); UI.banner('opp', 'هدف للخصم', info); }
      } else if (e.k === 'red') { (mine || byMe ? UI.fx : UI.snd)('red'); }
      else if (e.k === 'yellow') { (byMe ? UI.fx : UI.snd)('card'); }
      else if (e.k === 'inj') { if (byMe) UI.fx('bad'); }
      else if (e.k === 'save') UI.snd('save');
      else if (e.k === 'miss') UI.snd('chance');
    }
    mv.seen = n;
  }
  // صوت/لافتة نتيجتك بعد اعتماد المباراة
  function resultFx() {
    G.safe(() => {
      const sm = G.S.lastMatch;
      if (!sm || !UI.fx) return;
      const mine = sm.userSide, gf = mine === 'h' ? sm.score.h : sm.score.a, ga = mine === 'h' ? sm.score.a : sm.score.h;
      let w = gf > ga ? 1 : gf < ga ? -1 : 0;
      if (w === 0 && sm.pens) w = (mine === 'h' ? sm.pens.h - sm.pens.a : sm.pens.a - sm.pens.h) > 0 ? 1 : -1;
      const fo = G.Cups ? G.Cups.finalOutcome(sm) : null; // نهائي كأس/سوبر
      if (fo && fo.won) { UI.fx('fanfare'); UI.banner('win', fo.key === 'cup' ? '🏆 بطل ' + G.cupName(fo.cn, true) + '!' : '🛡️ بطل ' + G.supName(fo.cn, true) + '!', 'لقب جديد في خزانتك', { art: fo.key === 'cup' ? 'cup' : 'sup', ms: 3400 }); return; }
      const sk = sm.gro && sm.gro.ev.find((e) => e.k === 'streak');
      if (sk && sm.mins > 0) { UI.fx('fanfare'); UI.banner('win', '🔥 ارتقى مستواك!', sm.gro.s + ' مباريات متتالية متألقة'); }
      else if (sm.motm && sm.mins > 0) { UI.fx('fanfare'); UI.banner('win', '⭐ نجم المباراة', 'تقييمك ' + Number(sm.rating).toFixed(1)); }
      else if (w > 0) UI.fx('done');
    }, 'resultFx');
  }

  // ---------- المؤقّت ----------
  const stop = () => { if (UI._mt) { clearInterval(UI._mt); UI._mt = null; } };
  const start = () => { stop(); UI._mt = setInterval(tick, SPEED[(UI.mv && UI.mv.speed) || 1]); };

  function tick() {
    if (UI.cur !== 'match' || !UI.mv || UI.mv.phase !== 'live' || !activeM()) { stop(); return; }
    const m = activeM();
    if (UI.mv.paused || m.pending) return;
    try { G.Live.step(m); UI.mv.fails = 0; }
    catch (e) {
      UI.mv.fails = (UI.mv.fails || 0) + 1;
      G.lastError = { label: 'liveStep', msg: String(e && e.message || e) };
      if (UI.mv.fails >= 3) {
        stop();
        try { G.Live.simulate(m); finish(); }
        catch (e2) { // نتخلى عن المباراة دون تسجيل أي شيء: يمكن إعادة لعبها
          G.S.active = null; G.Save.save(); UI.mv = null; UI.cur = 'home';
          UI.toast('تعذّر إكمال المباراة بسبب خطأ — لم تُسجَّل نتيجتها ويمكنك إعادة لعبها'); UI.render();
        }
      }
      return;
    }
    if (m.done) { finish(); return; }
    paint(m);
  }

  function finish() {
    stop(); crowdOff();
    const m = activeM();
    if (!m) { UI.mv = { phase: 'post' }; UI.render(); return; }
    const wasDone = !!m.done;
    if (!m.done) G.Live.simulate(m);
    G.safe(() => fxEvents(m, !wasDone), 'fxEvents'); // صافرة النهاية وأحداث آخر دقيقة (أو الصافرة فقط عند الإنهاء الفوري)
    const sum = G.safe(() => G.Season.commitUser(m), 'commitUser');
    UI.lastM = m;
    UI.mv = { phase: 'post' };
    if (sum === undefined) UI.toast('تعذّر اعتماد النتيجة: ' + (G.lastError ? G.lastError.msg : ''));
    UI.render();
    if (sum !== undefined) resultFx();
  }

  // ---------- مكوّنات الواجهة ----------
  const minTxt = (m) => (m.done ? 'نهاية المباراة' : m.i === 0 ? 'قبل صافرة البداية' : '<span class="ltr">' + m.labs[m.i - 1] + "'</span>" + (m.et ? ' · وقت إضافي' : ''));

  function liveRating(m) {
    const uid = G.S.user, ps = m.ps[uid];
    if (!ps || (ps.in == null && m.uState !== 'start')) return null;
    const start = ps.in || 0, end = ps.out != null ? ps.out : m.i, mins = end - start;
    if (mins < 8) return null;
    const diff = m.score[m.side] - m.score[m.side === 'h' ? 'a' : 'h'];
    let r = 6.4 + (diff > 0 ? 0.25 : diff < 0 ? -0.25 : 0) + ps.g * 0.95 + ps.a * 0.6 + ps.sot * 0.06 - ps.big * 0.22 + ps.momOk * 0.16 - ps.momBad * 0.14 - ps.yel * 0.25 - ps.red * 1.6;
    return U.clamp(Math.round(r * 10) / 10, 3, 10);
  }

  // ---------- هيدر البث: ملعب خلفية + شعارات كبيرة + نتيجة + ساعة وشريط تقدّم + شريط إحصاءات ----------
  const phaseTxt = (m) => (m.done ? 'صافرة النهاية' : m.i === 0 ? 'قبل البداية' : m.i > m.reg ? 'وقت إضافي' : m.i <= m.t1 ? 'الشوط الأول' : 'الشوط الثاني');
  // شريط مقارنة (تسديدات/على المرمى): طول كل جانب نسبةً إلى المجموع، فريقك بلون النادي
  function statBar(lab, a, b, mine) {
    const t = (a + b) || 1, pa = Math.round(a / t * 100);
    return '<div class="sb-row"><b class="ltr' + (mine === 'h' ? ' me' : '') + '">' + a + '</b><div class="sb-mid"><span>' + lab + '</span><div class="sb-bar"><i class="' + (mine === 'h' ? 'me' : '') + '" style="width:' + (a + b ? pa : 50) + '%"></i><i class="' + (mine === 'a' ? 'me' : '') + '" style="width:' + (a + b ? 100 - pa : 50) + '%"></i></div></div><b class="ltr' + (mine === 'a' ? ' me' : '') + '">' + b + '</b></div>';
  }
  function headHtml(m) {
    const uid = G.S.user, ps = m.ps[uid], fix = G.Season.findFix(m.id);
    const on = G.Live.userOn(m);
    const st = on ? UI.ico('dotg') + ' في الملعب · لياقة ' + Math.round(m.fat[uid]) + '%' : ps.out != null ? UI.ico('swap') + ' تم استبدالك' : m.uState === 'bench' ? UI.ico('bench') + ' على مقاعد البدلاء' : UI.ico('ban') + ' خارج قائمة المباراة';
    const lr = liveRating(m);
    const pct = U.clamp(Math.round(m.i / (m.total || 1) * 100), 0, 100), htp = Math.round(m.t1 / (m.total || 1) * 100);
    return '<div class="card mv-hero"><div class="mvh-top"><span class="mvh-comp">' + (fix ? esc(UI.fixLabel(fix)) : '') + '</span>' + (m.neutral ? '<span class="mvh-ven">' + UI.ico('stadium') + ' ملعب محايد</span>' : '') + '</div>' +
      '<div class="score"><div class="tm">' + UI.badge(m.h, 58) + '<div>' + esc(UI.cname(m.h)) + '</div></div><div class="sc">' + m.score.h + ' - ' + m.score.a + '</div><div class="tm">' + UI.badge(m.a, 58) + '<div>' + esc(UI.cname(m.a)) + '</div></div></div>' +
      '<div class="minute">' + (!m.done && m.i > 0 ? '<span class="livebadge"><i></i>مباشر</span>' : '') + '<span class="mvh-min">' + minTxt(m) + '</span><small>' + phaseTxt(m) + '</small></div>' +
      '<div class="mvh-prog" aria-hidden="true"><i style="width:' + pct + '%"></i>' + (m.i > 0 ? '<b style="inset-inline-start:' + htp + '%"></b>' : '') + '</div>' +
      '<div class="mvh-st">' + statBar('تسديدات', m.st.h.sh, m.st.a.sh, m.side) + statBar('على المرمى', m.st.h.sot, m.st.a.sot, m.side) + '</div>' +
      '<div class="mvh-me"><span class="mvh-state">' + st + '</span><span class="mvh-chips"><span>' + UI.ico('ball') + ' ' + ps.g + '</span><span>' + UI.ico('assist') + ' ' + ps.a + '</span>' + (lr ? UI.rating(lr) : '') + '</span></div>' +
      (on ? UI.bar(m.fat[uid], m.fat[uid] < 40 ? 'red' : m.fat[uid] < 65 ? 'gold' : '') : '') + '</div>';
  }

  // ---------- لحظة القرار: أيقونة لكل نوع، نسبة كبيرة، مقياس، وشارة مخاطرة (زينة فقط: كلها تُشتقّ من أرقام الخيار نفسها) ----------
  const MOM_IC = { shot: 'target', pass: 'pass', drib: 'zig', press: 'flame', safe: 'shield', def: 'shield' };
  const momVal = (o) => (o.main != null ? o.main : o.k === 'shot' ? o.pg : o.pp) || 0;
  const momRisk = (o) => {
    const v = momVal(o);
    if (o.k === 'shot') return v >= 0.3 ? ['g', 'فرصة عالية'] : v >= 0.12 ? ['y', 'فرصة متوسطة'] : ['r', 'تسديدة بعيدة'];
    if (o.k === 'safe') return ['g', 'آمن'];
    return v >= 0.7 ? ['g', 'آمن'] : v >= 0.45 ? ['y', 'متوسط'] : ['r', 'مجازفة'];
  };
  function optHtml(o) {
    const v = Math.round(U.clamp(momVal(o), 0, 1) * 100), r = momRisk(o);
    const sub = o.sub != null ? [o.sub, o.atl && o.atl.length ? 'تعتمد على: ' + o.atl.join(' · ') : ''].filter(Boolean).join(' — ') : o.hint; // الحفظ القديم بلا الحقول المنظّمة
    return '<button class="opt r-' + r[0] + '" data-a="momPick" data-v="' + o.id + '"><span class="oi">' + UI.ico(MOM_IC[o.k] || 'ball') + '</span>' +
      '<span class="ob"><b>' + esc(o.label) + '</b><span class="om"><i style="width:' + v + '%"></i></span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
      '<span class="op"><em>' + v + '%</em><span class="rk">' + r[1] + '</span></span></button>';
  }
  function momentHtml(m) {
    const c = m.pending;
    if (!c) return '';
    return '<div class="card mom-card"><div class="row sb"><h3 style="margin:0">' + UI.ico('target') + ' ' + esc(c.title) + '</h3><span class="pill b">' + esc(c.lab || '') + "'</span></div><p>" + esc(c.text) + '</p>' +
      (c.note ? '<div class="sm mut" style="margin:-4px 0 8px">' + UI.ico('chart') + ' ' + esc(c.note) + '</div>' : '') +
      '<div class="opt-hd"><span>اختر قرارك</span><span class="mut sm">النسبة الكبيرة = فرصة النجاح (أو الهدف في التسديد)</span></div>' +
      c.options.map(optHtml).join('') + '</div>';
  }
  // بطاقة نتيجة قصيرة بعد القرار (≈ثانيتان) تُستنتج من أحداث المباراة الجديدة وعدّادات القرار
  function momResHtml(r) {
    return '<div class="card mom-res ' + r.cls + '"><span class="mr-ic">' + UI.ico(r.ico) + '</span><div><b>' + esc(r.title) + '</b><div class="sm">' + esc(r.txt) + '</div></div></div>';
  }
  function momOutcome(m, before) {
    const ps = m.ps[G.S.user] || {}, fresh = m.ev.slice(before.n), me = m.side;
    const goal = fresh.find((e) => e.k === 'goal' && e.s === me), conc = fresh.find((e) => e.k === 'goal' && e.s !== me);
    const last = fresh.length ? fresh[fresh.length - 1] : null, txt = last ? last.txt : '';
    if (goal) return { cls: 'ok gl', ico: 'ball', title: goal.p === G.S.user ? 'هدف! قرارك أثمر' : 'هدف بقرارك!', txt: goal.txt };
    if (conc) return { cls: 'bad', ico: 'warn', title: 'قرار مكلف', txt: conc.txt };
    if ((ps.red || 0) > before.red || (ps.yel || 0) > before.yel) return { cls: 'bad', ico: 'warn', title: 'إنذار', txt };
    if ((ps.momBad || 0) > before.bad) return { cls: 'bad', ico: 'x', title: 'لم ينجح القرار', txt };
    if ((ps.momOk || 0) > before.ok) return { cls: 'ok', ico: 'check2', title: 'قرار ناجح', txt };
    return { cls: 'mid', ico: 'check2', title: 'تم القرار', txt };
  }

  // صفّ حدث واحد (يُستعمل في البث وفي أبرز الأحداث بعد المباراة): دقيقة · أيقونة بنوع الحدث · نص بلا رموز بادئة
  const EV_IC = { goal: 'ball', save: 'shield', miss: 'target', sub: 'swap', inj: 'plus', et: 'timer', pens: 'target', kick: 'whistle', mom: 'target' };
  const evTxt = (t) => String(t == null ? '' : t).replace(/^[^\p{L}\p{N}]+/u, '');
  function evRow(e, side, extra) {
    const k = e.k;
    if (k === 'ht' || k === 'ft' || k === 'et' || k === 'kick') {
      return '<div class="ev brk ' + k + '"><span class="ev-line"></span><span class="ev-lab">' + UI.ico(k === 'ft' ? 'flag' : k === 'kick' ? 'whistle' : 'timer') + ' ' + esc(evTxt(e.txt)) + '</span><span class="ev-line"></span></div>';
    }
    const ic = k === 'yellow' ? '<i class="cdk y"></i>' : k === 'red' ? '<i class="cdk r"></i>' : UI.ico(EV_IC[k] || 'dotg');
    const who = e.s === 1 || (side != null && e.s === side) ? ' mine' : e.s === 2 || (side != null && e.s && e.s !== side) ? ' opp' : '';
    return '<div class="ev ' + (k || '') + who + (extra || '') + '"><span class="m">' + esc(e.lab) + "'</span><span class=\"ei\">" + ic + '</span><span class="grow">' + esc(evTxt(e.txt)) + '</span></div>';
  }
  function feedHtml(m) {
    if (m.ev.length <= 1) return '<div class="feed-empty">' + UI.ico('whistle') + '<div>المباراة على وشك البدء… ستظهر هنا الأهداف والفرص والبطاقات لحظة بلحظة.</div></div>';
    return m.ev.slice(-45).reverse().map((e) => evRow(e, m.side)).join('');
  }

  // شريط تحكّم مضغوط: أربع بلاطات أيقونية + زرّان ثانويان (كل data-a كما كانت)
  function ctlHtml(m) {
    const mv = UI.mv, on = G.Live.userOn(m), canSub = on && m.subs[m.side] > 0;
    return '<div class="mvc"><button class="mvb' + (mv.paused ? ' on' : '') + '" data-a="mvPause">' + UI.ico(mv.paused ? 'play' : 'pause') + '<span>' + (mv.paused ? 'استئناف' : 'إيقاف') + '</span></button>' +
      '<button class="mvb" data-a="mvSpeed">' + UI.ico('ffwd') + '<span>سرعة ×<b class="ltr">' + (mv.speed || 1) + '</b></span></button>' +
      '<button class="mvb ' + (canSub ? '' : 'dis') + '" data-a="reqSub">' + UI.ico('swap') + '<span>استبدال</span></button>' +
      '<button class="mvb" data-a="mvLineup">' + UI.ico('users') + '<span>التشكيلة</span></button></div>' +
      '<div class="mvc2"><button class="mvb2 red" data-a="mvFinish">' + UI.ico('skip') + ' إنهاء المباراة فورًا</button><button class="mvb2" data-a="mvLeave">' + UI.ico('door') + ' خروج وحفظ</button></div>';
  }

  // تحديث الأجزاء المتغيّرة فقط حتى لا تضيع النقرات
  let lastMomKey = null, lastCtlKey = null;
  function paint(m) {
    const a = $('#mvHead'), b = $('#mvMoment'), c = $('#mvCtl'), d = $('#mvFeed');
    if (!a) return;
    fxEvents(m);
    a.innerHTML = headHtml(m);
    d.innerHTML = feedHtml(m);
    const mr = !m.pending && UI._momRes ? UI._momRes : null;
    const mk = m.pending ? m.pending.id : mr ? 'res' + mr.n : '';
    if (mk !== lastMomKey) { b.innerHTML = m.pending ? momentHtml(m) : mr ? momResHtml(mr) : ''; lastMomKey = mk; if (m.pending) { window.scrollTo(0, 0); UI.fx('ping'); } }
    const ck = [UI.mv.paused, UI.mv.speed, G.Live.userOn(m), m.subs[m.side] > 0].join();
    if (ck !== lastCtlKey) { c.innerHTML = ctlHtml(m); lastCtlKey = ck; }
  }

  function liveScreen() {
    const m = activeM();
    if (!m) { UI.mv = null; UI.cur = 'home'; return UI.screens.home(); }
    if (m.done) { setTimeout(finish, 0); return '<div class="card c">جارٍ اعتماد النتيجة…</div>'; }
    lastMomKey = null; lastCtlKey = null; UI._momRes = null;
    UI.after = () => {
      const mv = UI.mv;
      if (mv && mv.seen == null) { mv.seen = m.ev.length; if (m.i === 0) UI.snd('whistle'); } // صافرة البداية للمباراة الجديدة فقط
      crowdOn(); paint(m); start();
    };
    return '<div id="mvHead"></div><div id="mvMoment"></div><div id="mvCtl"></div><div class="card"><h4>مجريات المباراة</h4><div class="feed" id="mvFeed"></div></div>';
  }

  function postScreen() {
    const S = G.S, sm = S.lastMatch, u = P(S.user);
    if (!sm) return '<div class="card mut c">لا توجد مباراة لعرضها.</div><button class="btn" data-a="mvHome">الرئيسية</button>';
    const mine = sm.userSide, gf = mine === 'h' ? sm.score.h : sm.score.a, ga = mine === 'h' ? sm.score.a : sm.score.h;
    let res = gf > ga ? 'فوز' : gf < ga ? 'خسارة' : 'تعادل';
    if (sm.pens) { const pf = mine === 'h' ? sm.pens.h : sm.pens.a, pa = mine === 'h' ? sm.pens.a : sm.pens.h; res = pf > pa ? 'فوز بركلات الترجيح' : 'خسارة بركلات الترجيح'; }
    const fix = G.Season.findFix(sm.fixId);
    const rcls = gf > ga || (sm.pens && res.indexOf('فوز') === 0) ? 'w' : gf < ga || sm.pens ? 'l' : 'd';
    let h = '<div class="card mv-hero ft ' + rcls + '"><div class="mvh-top"><span class="mvh-comp">' + (fix ? esc(UI.fixLabel(fix)) : '') + '</span><span class="mvh-ven">' + UI.ico('flag') + ' صافرة النهاية</span></div>' +
      '<div class="score"><div class="tm">' + UI.badge(sm.h, 58) + '<div>' + esc(UI.cname(sm.h)) + '</div></div><div class="sc">' + sm.score.h + ' - ' + sm.score.a + '</div><div class="tm">' + UI.badge(sm.a, 58) + '<div>' + esc(UI.cname(sm.a)) + '</div></div></div>' +
      '<div class="ft-res"><span class="ft-pill ' + rcls + '">' + res + '</span>' + (sm.et ? '<span class="pill">وقت إضافي</span>' : '') + (sm.pens ? '<span class="pill">ترجيح <span class="ltr">' + sm.pens.h + '-' + sm.pens.a + '</span></span>' : '') + '</div></div>';
    if (UI.cupNote) h += UI.cupNote(fix, sm);
    if (sm.mins > 0) {
      // التقييم رقم كبير داخل حلقة تتلوّن بمستوى الأداء، ثم إحصاءات مختصرة
      const R = sm.rating == null ? 0 : sm.rating, rc = UI.ratingCls(R) || 'hi';
      const verdict = R >= 8.5 ? 'أداء استثنائي' : R >= 7.5 ? 'أداء ممتاز' : R >= 6.8 ? 'أداء جيد' : R >= 6.2 ? 'أداء متوسط' : 'أداء ضعيف';
      h += '<div class="card perf"><div class="perf-hero"><div class="pr-ring ' + rc + '" style="--p:' + Math.round(U.clamp(R, 0, 10) * 10) + '"><b>' + (sm.rating == null ? '—' : R.toFixed(1)) + '</b><small>التقييم</small></div>' +
        '<div class="pr-side"><div class="pr-verdict">' + verdict + '</div>' + (sm.motm ? '<div><span class="pill y">' + UI.ico('star') + ' نجم المباراة</span></div>' : '') +
        '<div class="pr-chips"><span><b>' + sm.g + '</b> ' + UI.ico('ball') + ' أهداف</span><span><b>' + sm.as + '</b> صناعة</span><span><b class="ltr">' + sm.mins + "'</b> دقيقة</span></div></div></div>" +
        '<div class="grid3" style="margin-top:12px"><div class="stat"><b class="ltr">' + sm.sh + ' (' + sm.sot + ')</b><small>تسديدات (على المرمى)</small></div><div class="stat"><b>' + sm.pasOk + '/' + sm.pas + '</b><small>تمريرات ناجحة</small></div><div class="stat"><b>' + sm.drOk + '/' + sm.dr + '</b><small>مراوغات</small></div>' +
        '<div class="stat"><b>' + sm.tkOk + '/' + sm.tk + '</b><small>تدخلات</small></div><div class="stat"><b>' + (sm.big || 0) + '</b><small>فرص محققة ضائعة</small></div><div class="stat"><b>' + (sm.yel ? '🟨' + sm.yel : '') + (sm.red ? '🟥' + sm.red : '') + (!sm.yel && !sm.red ? '—' : '') + '</b><small>بطاقات</small></div></div>' +
        ((sm.gro && sm.gro.ev || []).map((e) => '<div class="notice ok" style="margin-top:10px">' + esc(e.t) + '</div>').join('')) +
        (sm.inj ? '<div class="notice bad" style="margin-top:10px">🩹 أُصبتَ وستغيب ' + sm.inj + ' أسبوعًا تقريبًا.</div>' : '') +
        (sm.ban5 ? '<div class="notice bad" style="margin-top:10px">🟨 تراكمت عليك 5 إنذارات: أنت موقوف عن المباراة القادمة.</div>' : '') + '</div>';
    } else {
      h += '<div class="card"><div class="notice">لم تشارك في هذه المباراة' + (sm.state === 'bench' ? ' (بقيتَ على الدكة)' : sm.state === 'out' ? ' (خارج القائمة)' : '') + '. المشاركة تأتي بالأداء والتدريب وثقة المدرب.</div></div>';
    }
    h += '<div class="card"><div class="kv"><span>ثقة المدرب</span><span>' + Math.round(u.trust) + ' — ' + G.Coach.trustLabel(u.trust) + '</span></div><div class="kv"><span>اللياقة</span><span>' + Math.round(u.fit) + '%</span></div></div>';
    const evs = (sm.events || []).filter((e) => e.k === 'goal' || e.k === 'red' || e.k === 'yellow' || e.k === 'inj' || e.k === 'pens');
    if (evs.length) h += '<div class="card"><h4>أبرز الأحداث</h4><div class="feed post">' + evs.map((e) => evRow(e, null, e.me ? ' me' : '').replace(/<\/div>$/, (e.me ? '<span class="pill y ev-me">أنت</span>' : '') + '</div>')).join('') + '</div></div>';
    const pend = G.Season.pending();
    h += '<button class="btn pri" data-a="mvHome">' + (fix && fix.comp === 'NT' ? 'العودة إلى البطولة' : pend ? 'المباراة التالية هذا الأسبوع ←' : S.phase === 'season' ? 'متابعة (إنهاء الأسبوع)' : 'العودة للرئيسية') + '</button>';
    return h;
  }

  UI.screens.match = () => {
    const mv = UI.mv;
    if (!mv) { UI.cur = 'home'; return UI.screens.home(); }
    return mv.phase === 'post' ? postScreen() : liveScreen();
  };

  // ---------- الإجراءات ----------
  UI.on('playMatch', (fixId, mode) => {
    const S = G.S;
    if (S.active) { UI.cur = 'match'; UI.mv = { phase: 'live', speed: 1, paused: false }; return; }
    const fix = G.Season.findFix(fixId);
    if (!fix || fix.played) { UI.toast('هذه المباراة لُعبت بالفعل'); return; }
    const m = G.Season.startMatch(fixId);
    if (!m) { UI.toast('تعذّر بدء المباراة'); return; }
    UI.cur = 'match'; window.scrollTo(0, 0);
    if (mode === 's') {
      G.Live.simulate(m);
      G.Season.commitUser(m);
      UI.lastM = m; UI.mv = { phase: 'post' };
      resultFx();
    } else UI.mv = { phase: 'live', speed: 1, paused: false };
  });
  UI.on('resumeMatch', () => { UI.cur = 'match'; UI.mv = { phase: 'live', speed: 1, paused: false }; });

  UI.on('momPick', (v) => {
    const m = activeM();
    if (!m || !m.pending) return false;
    const ps0 = m.ps[G.S.user] || {}, before = { n: m.ev.length, ok: ps0.momOk || 0, bad: ps0.momBad || 0, yel: ps0.yel || 0, red: ps0.red || 0 };
    G.safe(() => G.Moments.resolve(m, m.pending, v), 'moment');
    m.pending = null;
    G.Save.save();
    // بطاقة النتيجة: زينة فقط، تختفي بعد ثانيتين أو عند أول لحظة قرار جديدة
    G.safe(() => {
      const r = momOutcome(m, before); r.n = (UI._momN = (UI._momN || 0) + 1); UI._momRes = r;
      clearTimeout(UI._momT);
      UI._momT = setTimeout(() => { if (UI._momRes === r) { UI._momRes = null; const mm = activeM(); if (mm && UI.cur === 'match' && $('#mvMoment')) paint(mm); } }, 2200);
    }, 'momRes');
    lastMomKey = null;
    paint(m);
    return false;
  });
  UI.on('mvPause', () => { UI.mv.paused = !UI.mv.paused; const m = activeM(); if (m) paint(m); return false; });
  UI.on('mvSpeed', () => { UI.mv.speed = ((UI.mv.speed || 1) % 3) + 1; start(); const m = activeM(); if (m) paint(m); return false; });
  UI.on('reqSub', () => {
    const m = activeM();
    if (!m) return false;
    if (!G.Live.userOn(m)) { UI.toast('أنت لست في الملعب'); return false; }
    if (m.subs[m.side] <= 0) { UI.toast('استُنفدت التبديلات'); return false; }
    G.Live.requestSub(m);
    UI.toast('طلبتَ الاستبدال — سيُنفَّذ في الدقيقة التالية');
    return false;
  });
  UI.on('mvFinish', () => {
    UI.confirm('إنهاء المباراة فورًا؟', 'ستُحاكى بقية المباراة تلقائيًا (القرارات المتبقية تُحسم آليًا).', () => { UI.mv.paused = false; finish(); }, 'إنهاء');
    return false;
  });
  const homeTab = () => (G.S.phase === 'end' && G.S.intl ? 'intl' : 'home');
  UI.on('mvLeave', () => { stop(); crowdOff(); if (UI.fxClear) UI.fxClear(); G.Save.save(); UI.mv = null; UI.cur = homeTab(); });
  UI.on('mvHome', () => { UI.mv = null; UI.cur = homeTab(); window.scrollTo(0, 0); });
  UI.on('lastMatchView', () => { UI.mv = { phase: 'post' }; UI.cur = 'match'; });

  UI.on('mvLineup', () => {
    const m = activeM();
    if (!m) return false;
    UI.mv.paused = true; paint(m);
    const uid = G.S.user;
    UI.mv.pt = m.side;
    const xi = (s) => m.xi[s].map((x) => { const p = P(x.id); return '<div class="kv"><span>' + (x.id === uid ? '⭐ ' : '') + esc(p.n) + ' <span class="mut sm">' + x.slot + '</span></span><b>' + p.ovr + '</b></div>'; }).join('');
    UI.sheetRender(() => {
      const mm = activeM(), s = (UI.mv && UI.mv.pt) || mm.side;
      return '<h3 class="mv-sh">إحصاءات المباراة</h3><div class="mvh-st in-sh"><div class="sb-teams"><span>' + UI.badge(mm.h, 22) + ' ' + esc(UI.cname(mm.h)) + '</span><span>' + esc(UI.cname(mm.a)) + ' ' + UI.badge(mm.a, 22) + '</span></div>' +
        statBar('تسديدات', mm.st.h.sh, mm.st.a.sh, mm.side) + statBar('على المرمى', mm.st.h.sot, mm.st.a.sot, mm.side) + statBar('تبديلات متبقية', mm.subs.h, mm.subs.a, mm.side) + '</div>' +
        '<div class="chips" style="margin-top:12px"><button class="chip ' + (s === mm.side ? 'on' : '') + '" data-a="mvPitch" data-v="' + mm.side + '">فريقك</button><button class="chip ' + (s === mm.side ? '' : 'on') + '" data-a="mvPitch" data-v="' + (mm.side === 'h' ? 'a' : 'h') + '">الخصم</button></div>' +
        '<div class="sm mut c" style="margin-top:6px">' + esc(UI.cname(mm[s])) + ' · الآن في الملعب (' + mm.xi[s].length + ')</div>' + UI.pitch(mm.xi[s], mm[s], { hi: uid }) +
        '<details style="margin-top:6px"><summary class="sm mut">القوائم النصية</summary><h4 style="margin-top:10px">' + esc(UI.cname(mm.h)) + '</h4>' + xi('h') + '<h4 style="margin-top:14px">' + esc(UI.cname(mm.a)) + '</h4>' + xi('a') + '</details>' +
        '<button class="btn pri" data-a="mvResume">' + UI.ico('play') + ' إغلاق ومتابعة</button>';
    });
    return false;
  });
  UI.on('mvPitch', (v) => { UI.mv.pt = v; UI.sheetRender(UI._sheetFn); return false; });
  UI.on('mvResume', () => { UI.closeSheet(); UI.mv.paused = false; const m = activeM(); if (m) paint(m); return false; });

  UI.matchStop = () => { stop(); crowdOff(); if (UI.fxClear) UI.fxClear(); };
  UI.mvRepaint = () => { const m = activeM(); if (m && UI.cur === 'match' && UI.mv && UI.mv.phase === 'live') paint(m); };
})(window.G = window.G || {});
