/* ui_scenes.js — Build 36 («اللحظات»): نظام مشاهد سينمائية بملء الشاشة للّحظات الكبيرة، فوق أحداث موجودة أصلًا (لا منطق جديد ولا حالة لعبة جديدة):
   توقيع العقد · رفع اللقب · ليلة الكرة الذهبية · المؤتمر الصحفي · الخروج من النفق (المباريات المهمة) · وداع الاعتزال.
   - كل مشهد قابل للتخطّي بنقرة، ويُغلق تلقائيًا إن كان تمهيديًا (مؤتمر/نفق). ملعب النادي والشعار والقميص والأرقام كلها من بيانات اللعبة الحقيقية.
   - الإعدادات: «المشاهد السينمائية» (تشغيل/إيقاف). مع تقليل الحركة أو الجودة المنخفضة تُعرض نسخة هادئة بلا حركة.
   - الاختبارات الآلية (navigator.webdriver) لا تُظهر المشاهد إلا بتفعيل صريح (UI.prefs.scenes === true) كي لا تحجب النقرات.
   - مفاتيح «شوهد» تُحفظ في تفضيلات الجهاز (لا في ملف الحفظ) ولا تعيد المشهد إن أُعيد تحميل الصفحة؛ وحفظ قديم لا يُشغّل مشاهد أحداث قديمة (خط أساس عند أول فحص). */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const pn = (p) => (p && (p.n || p.name)) || '';
  const okHex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  const ink = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0b1020' : '#ffffff'; };

  UI.scenesOn = () => {
    const v = UI.prefs && UI.prefs.scenes;
    if (v === false) return false;
    if (v === true || (UI.prefs && UI.prefs.motionTest)) return true;
    try { return !navigator.webdriver; } catch (e) { return true; }
  };
  const calm = () => !(UI.motionOK && UI.motionOK());

  // قميص النادي برقم اللاعب (SVG بسيط من ألوان النادي الحقيقية)
  const shirt = (clubId, num, name) => {
    const c = G.S.clubs[clubId], c0 = okHex(c && c.c && c.c[0], '#2b6cff'), c1 = okHex(c && c.c && c.c[1], '#ffffff'), t = ink(c0);
    return '<svg class="scn-shirt" viewBox="0 0 120 132" aria-hidden="true"><path d="M38 6 L18 16 L2 44 L22 56 L30 46 L30 124 Q60 132 90 124 L90 46 L98 56 L118 44 L102 16 L82 6 Q60 20 38 6Z" fill="' + c0 + '" stroke="rgb(255 255 255 / .35)" stroke-width="1.2"/>' +
      '<path d="M38 6 Q60 20 82 6 L78 3 Q60 12 42 3Z" fill="' + c1 + '"/><path d="M2 44 L22 56 L18 48 L6 38Z M118 44 L98 56 L102 48 L114 38Z" fill="' + c1 + '"/>' +
      '<text x="60" y="58" text-anchor="middle" font-family="Barlow, sans-serif" font-weight="800" font-size="11" fill="' + t + '" opacity=".85" letter-spacing="1">' + esc(String(name || '').toUpperCase().slice(0, 10)) + '</text>' +
      '<text x="60" y="100" text-anchor="middle" font-family="Barlow, sans-serif" font-weight="800" font-size="46" fill="' + t + '">' + esc(String(num || '')) + '</text></svg>';
  };

  // ---------- محرّك المشاهد ----------
  let cur = null; const queue = [];
  const close = () => {
    if (!cur) return;
    const c = cur; cur = null;
    clearTimeout(c.tm); c.el.classList.add('out');
    const done = () => { c.el.remove(); document.body.classList.remove('scn-open'); try { c.opt.then && c.opt.then(); } catch (e) { G.safe(() => { throw e; }, 'sceneThen'); } if (queue.length) { const q = queue.shift(); show(q[0], q[1], q[2]); } };
    if (calm()) done(); else setTimeout(done, 260);
  };
  UI.closeScene = () => close();
  UI.sceneActive = () => !!cur;

  function show(kind, d, opt) {
    const def = SC[kind](d || {});
    if (!def) { opt.then && opt.then(); return; }
    const el = document.createElement('div');
    el.id = 'scene'; el.className = 'scn scn-' + kind + (calm() ? ' calm' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', def.label || 'مشهد');
    el.innerHTML = '<div class="scn-bg">' + (def.bg || '') + '</div><div class="scn-vg"></div><div class="scn-bar t"></div><div class="scn-bar b"></div><div class="scn-in">' + def.html + '</div>' +
      '<button class="scn-skip" data-scn="skip" type="button">تخطّي</button>' + (def.cta ? '<button class="btn pri scn-go" data-scn="go" type="button" style="--d:' + (def.ms / 1000 - 0.4).toFixed(1) + 's">' + def.cta + '</button>' : '');
    el.addEventListener('click', (e) => { const b = e.target.closest ? e.target.closest('[data-scn]') : null; if (b || def.tapAny) close(); });
    document.body.appendChild(el); document.body.classList.add('scn-open');
    cur = { el: el, opt: opt, tm: null, kind: kind };
    G.safe(() => {
      if (G.Audio && !(UI.prefs && UI.prefs.sound === false)) (def.snd || []).forEach((s) => setTimeout(() => { if (cur && cur.el === el) { G.Audio.play(s[0]); if (s[2]) G.Audio.vibe(s[0]); } }, (s[1] || 0) * 1000));
      if (def.confetti && !calm() && UI.confetti) UI.confetti(def.confetti);
    }, 'sceneFx');
    if (def.auto) cur.tm = setTimeout(close, def.ms + 200);
  }

  // kind: sign|trophy|bd|press|walkout|retire · opt.then: يُنفَّذ بعد الإغلاق (تخطّيًا أو تلقائيًا). يُرجع true إن عُرض/وُضع بالطابور
  UI.scene = (kind, d, opt) => {
    opt = opt || {};
    if (!SC[kind] || !UI.scenesOn()) return false;
    if (cur) { queue.push([kind, d, opt]); return true; }
    show(kind, d, opt); return true;
  };

  // ---------- المشاهد ----------
  const L = (txt, delay, cls) => '<p class="scn-l ' + (cls || '') + '" style="--d:' + delay + 's">' + txt + '</p>';
  const SC = {
    // توقيع العقد/التجديد/الإعارة: d = {club, mode: 'sign'|'renew'|'loan'}
    sign: (d) => {
      const p = me(), club = d.club || p.club, ct = p.ct || {}, yrs = ct.y || '', nm = UI.cname(club);
      const verb = d.mode === 'renew' ? 'يمدّد عقده مع' : d.mode === 'loan' ? 'ينضم إعارةً إلى' : 'ينضم رسميًا إلى';
      return { label: 'توقيع العقد', bg: UI.stadiumArt(club, {}), ms: 4400, cta: 'متابعة', tapAny: false, confetti: 0,
        snd: [['flashes', 0.1, 0], ['stamp', 1.5, 1], ['done', 1.7, 0]],
        html: L('<span class="kick">رسميًا</span>', 0.2) + '<div class="scn-crest" style="--d:.5s">' + UI.badge(club, 72) + '</div>' + L('<b class="big">' + esc(pn(p)) + '</b>', 0.8) + L(verb + ' <b>' + esc(nm) + '</b>', 1.1) +
          '<div class="scn-shirtw" style="--d:1.3s">' + shirt(club, p.num, pn(p)) + '</div>' + L((yrs ? '<span class="chip-s">' + yrs + (yrs === 1 ? ' سنة' : ' سنوات') + '</span>' : '') + (p.num ? '<span class="chip-s">قميص ' + p.num + '</span>' : ''), 1.7) };
    },
    // رفع لقب: d = {key: liga|ucl|uel|cup|super|d2|..., title, sub, club}
    trophy: (d) => {
      const club = d.club || me().club;
      return { label: 'رفع اللقب', bg: UI.stadiumArt(club, { ball: 0 }), ms: 5000, cta: 'رائع', confetti: 70,
        snd: [['trophy', 0.3, 1]],
        html: '<div class="scn-beam"></div>' + L('<span class="kick">بطل</span>', 0.3) + '<div class="scn-trophy" style="--d:.6s">' + (UI.trophyArt ? UI.trophyArt(d.key || 'liga', 'scn-tr') : '') + '</div>' + L('<b class="big gold">' + esc(d.title || 'لقب جديد') + '</b>', 1.5) + L(esc(d.sub || ''), 1.9) + L('<span class="scn-cr">' + UI.badge(club, 40) + '</span>' + esc(UI.cname(club)), 2.3) };
    },
    // الكرة الذهبية: d = سجل الحفل S.bdLast {year, winner, top, me}
    bd: (d) => {
      const win = d.winner || {}, top = (d.top || []).slice(0, 3), mine = d.me;
      const row = (x, i, dl) => '<div class="scn-pod r' + (i + 1) + (x.user ? ' me' : '') + '" style="--d:' + dl + 's"><i>' + (i + 1) + '</i><span><b>' + esc(x.n) + '</b><small>' + esc(x.club || '') + '</small></span></div>';
      const podium = top.length >= 3 ? row(top[2], 2, 1.0) + row(top[1], 1, 1.8) + row(top[0], 0, 3.0) : top.map((x, i) => row(x, i, 1 + i)).join('');
      return { label: 'حفل الكرة الذهبية', bg: UI.stadiumArt(me().club, {}), ms: 6200, cta: 'التفاصيل', confetti: win.user ? 80 : 0,
        snd: [['reveal', 0.4, 1]].concat(win.user ? [['trophy', 3.1, 1]] : []),
        html: L('<span class="kick">حفل الكرة الذهبية ' + esc(d.year) + '</span>', 0.2) + '<div class="scn-podium">' + podium + '</div>' +
          (win.user ? L('<b class="big gold">أنت أفضل لاعب في العالم!</b>', 3.6) : mine ? L('ترتيبك هذا العام: <b>' + esc(mine.rank) + '</b>', 3.6) : L('لم تكن ضمن قائمة المرشحين هذا العام', 3.6)) };
    },
    // المؤتمر الصحفي: تمهيد قصير يتبعه نافذة المؤتمر نفسها
    press: () => {
      const p = me(), wall = Array(12).fill(0).map(() => UI.badge(p.club, 34)).join('');
      return { label: 'المؤتمر الصحفي', bg: '<div class="scn-wall">' + wall + '</div><div class="scn-flashes"></div>', ms: 1900, auto: true, snd: [['flashes', 0.15, 0]],
        html: L('<span class="kick">المؤتمر الصحفي</span>', 0.15) + '<div class="scn-mic" style="--d:.4s">' + UI.ico('mic') + '</div>' + L('<b class="big">' + esc(pn(p)) + '</b>', 0.6) + L('الصحفيون بانتظار إجابتك', 0.9) };
    },
    // الخروج من النفق (المباريات الكبرى): d = {h, a, tag}
    walkout: (d) => ({ label: 'دخول الملعب', bg: '<div class="scn-tunnel"><i></i></div>', ms: 2600, auto: true, snd: [['walkout', 0, 1]],
      html: L('<span class="kick">' + esc(d.tag || 'مباراة كبيرة') + '</span>', 0.3) +
        '<div class="scn-vs" style="--d:.7s"><span>' + UI.badge(d.h, 64) + '<b>' + esc(UI.cname(d.h)) + '</b></span><em>ضد</em><span>' + UI.badge(d.a, 64) + '<b>' + esc(UI.cname(d.a)) + '</b></span></div>' }),
    // وداع الاعتزال: d = {club}
    retire: (d) => {
      const p = me(), t = G.Season.careerTotals(), tr = p.trophies || {}, nT = Object.keys(tr).reduce((s, k) => s + (typeof tr[k] === 'number' ? tr[k] : 0), 0);
      return { label: 'وداع الملاعب', bg: UI.stadiumArt(d.club || p.club, {}), ms: 5600, cta: 'عرض مسيرتي', confetti: 0, snd: [['farewell', 0.3, 1]],
        html: L('<span class="kick">وداعًا للملاعب</span>', 0.3) + '<div class="scn-crest" style="--d:.6s">' + UI.badge(d.club || p.club, 64) + '</div>' + L('<b class="big">شكرًا ' + esc(pn(p)) + '</b>', 1.0) +
          L(t.seasons + ' مواسم · ' + t.apps + ' مباراة · ' + t.g + ' هدفًا · ' + t.a + ' تمريرة حاسمة', 1.6) + (nT ? L('<span class="chip-s">' + nT + ' ألقاب</span>', 2.2) : '') };
    },
  };

  // ---------- مراقب الأحداث التي لا يوجد لها «زر» مباشر (الكرة الذهبية/الاعتزال) ----------
  const seenKeys = () => { const P = UI.prefs; if (!P.sceneSeen || typeof P.sceneSeen !== 'object') P.sceneSeen = {}; return P.sceneSeen; };
  const mark = (k) => { const s = seenKeys(), ks = Object.keys(s); if (ks.length > 60) delete s[ks[0]]; s[k] = 1; UI.savePrefs(); };
  UI.sceneWatch = () => {
    const S = G.S; if (!S || !S.players || !S.user) return;
    const id = 'c' + (S.seed || 0) + '-' + (G.Save && G.Save.slot || 1) + ':';
    const evs = [];
    if (S.bdLast && S.bdLast.year != null && S.bdLast.winner) evs.push([id + 'bd' + S.bdLast.year, 'bd', S.bdLast, { then: () => { UI.go ? UI.go('bd') : (UI.cur = 'bd', UI.render()); } }]);
    if (S.phase === 'retired') evs.push([id + 'retire', 'retire', { club: me().club }, { then: () => { UI.cur = 'career'; UI.sub = {}; UI.render(); } }]);
    if (UI._sceneBase !== id) { // أول فحص لهذه المسيرة بعد التحميل: ما هو موجود يُعدّ «مشاهَدًا» دون تشغيله
      UI._sceneBase = id; evs.forEach((e) => { if (!seenKeys()[e[0]]) mark(e[0]); });
      return;
    }
    evs.forEach((e) => { if (!seenKeys()[e[0]]) { mark(e[0]); UI.scene(e[1], e[2], e[3]); } });
  };

  // ---------- نقاط الربط (تُستدعى من مواضعها الأصلية دون تغيير منطقها) ----------
  UI.sceneTrophy = (key, title, sub) => UI.scene('trophy', { key: key, title: title, sub: sub, club: me().club });
  UI.sceneSign = (mode, club) => UI.scene('sign', { mode: mode, club: club });
  UI.sceneWalkout = (fix, then) => {
    if (!UI.scenesOn()) return false;
    const imp = UI.matchImportance ? UI.matchImportance(fix) : { lvl: 0 };
    if (!imp || imp.lvl < 2) return false;
    return UI.scene('walkout', { h: fix.h, a: fix.a, tag: imp.tag }, { then: then });
  };
  UI.scenePress = (then) => UI.scene('press', {}, { then: then });
})(window.G = window.G || {});
