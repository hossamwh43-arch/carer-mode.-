/* ui_fx.js — مؤثرات بصرية خفيفة: لافتة الأحداث (هدف، مستوى جديد، انتقال، لقب…) وقصاصات الاحتفال.
   - كل العناصر غير تفاعلية (pointer-events:none) وتُضاف إلى body فلا يمسحها UI.render، وتزول وحدها.
   - للزينة فقط: تستخدم Math.random ولا تلمس U.rnd أبدًا، كي لا يتغيّر تسلسل العشوائية المحفوظ مع المسيرة.
   - تحترم إعداد «تقليل الحركة» في النظام: لافتة ثابتة بلا قصاصات. */
(function (G) {
  'use strict';
  const UI = G.UI;
  const COLORS = ['#ffc53d', '#35e6a0', '#5b9bff', '#ff7aa8', '#f8fafc', '#ff9a4d', '#a78bfa'];
  let timer = null;

  const reduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };

  // ---------- الإشعارات (Build 27) ----------
  // إشعار صغير يظهر في حيّز الشريط العلوي (بين زرّي الرجوع والرسائل) فلا يغطي غلاف اللاعب ولا البطاقات ولا التنقل السفلي.
  // طابور: الأحداث الحيّة (هدف/لقب) تحلّ محل الظاهر فورًا، والبقية تنتظر دورها. كل الإشعارات القديمة (UI.toast / UI.banner) تمرّ من هنا.
  // kind → [أيقونة، لون، أولوية]
  const NT = {
    info: ['info', 'info', 1], ok: ['check', 'ok', 1], warn: ['warn', 'warn', 2], err: ['ban', 'err', 2],
    week: ['calendar', 'info', 1], level: ['bolt', 'gold', 2], ach: ['medal', 'gold', 3], win: ['trophy', 'gold', 3],
    me: ['ball', 'gold', 3], team: ['ball', 'ok', 3], opp: ['ball', 'err', 3],
    promo: ['trendup', 'ok', 2], injury: ['warn', 'err', 2], offer: ['handshake', 'info', 2]
  };
  const BASE_MS = { info: 2400, ok: 2200, week: 2300, level: 2600, offer: 3000, injury: 3200, promo: 3000, ach: 3200, win: 3400 };
  let cur = null, q = [], tmr = null;
  const host = () => document.getElementById('notif');
  const tidy = (t) => String(t == null ? '' : t).replace(/[\u2190-\u21FF\u2600-\u27BF\u{1F000}-\u{1FAFF}\uFE0F]+/gu, '').replace(/^[\s·:\-—]+|[\s·:\-—]+$/g, '');
  const reducedNt = () => reduced();
  // عزل الأرقام والمقاطع اللاتينية داخل نص عربي (مثل «+120 XP» أو أسماء الأندية) بـ<bdi dir=ltr> كي لا يعكس اتجاهُ الفقرة ترتيبَها
  const ISO = /[+\-\u2212]?\d[\d.,:\/]*(?:\s[A-Za-z]{1,8})?|[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F0-9 .'\u2019\-\u00D7]*[A-Za-z\u00C0-\u024F0-9.]|[A-Za-z\u00C0-\u024F]/g;
  function isoFill(node, text) {
    let at = 0, m; ISO.lastIndex = 0; text = String(text);
    while ((m = ISO.exec(text))) {
      if (m.index > at) node.appendChild(document.createTextNode(text.slice(at, m.index)));
      const bd = document.createElement('bdi'); bd.setAttribute('dir', 'ltr'); bd.textContent = m[0]; node.appendChild(bd);
      at = m.index + m[0].length;
    }
    if (at < text.length) node.appendChild(document.createTextNode(text.slice(at)));
  }

  // العنوان يختفي أثناء وجود إشعار (لا يتقاطع النصان) ويعود بعد خروجه
  const idle = () => { if (!cur && !q.length) document.body.classList.remove('has-nt'); };
  function drop(el, cb) {
    if (!el) { if (cb) cb(); idle(); return; }
    el.classList.add('out');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); if (cur && cur.el === el) cur = null; if (cb) cb(); idle(); }, reducedNt() ? 120 : 220);
  }
  function next() { if (cur || !q.length) return; show(q.shift()); }
  function show(it) {
    const h = host(); if (!h) return;
    const m = NT[it.kind] || NT.info;
    const el = document.createElement('div');
    el.className = 'nt nt-' + m[1] + ' nt-k-' + it.kind;
    const ic = document.createElement('span'); ic.className = it.art ? 'nt-art' : 'nt-ic';
    ic.innerHTML = it.art && UI.trophyArt ? UI.trophyArt(it.art) : UI.ico(m[0]);
    const tx = document.createElement('span'); tx.className = 'nt-tx';
    const b = document.createElement('b'); b.className = 'nt-t'; isoFill(b, it.title); tx.appendChild(b);
    if (it.sub) { const sm = document.createElement('small'); sm.className = 'nt-s'; isoFill(sm, it.sub); tx.appendChild(sm); }
    el.appendChild(ic); el.appendChild(tx);
    // الضغط يُغلق الإشعار؛ وإن كان له وجهة (عرض انتقال مثلًا) يفتحها عبر نظام الأفعال المعتاد
    if (it.go) { el.setAttribute('data-a', it.go[0]); el.setAttribute('data-v', it.go[1]); if (it.go[2]) el.setAttribute('data-v2', it.go[2]); }
    else el.setAttribute('data-a', 'ntClose');
    el.addEventListener('click', () => { if (cur && cur.el === el) { clearTimeout(tmr); drop(el, next); } });
    h.appendChild(el);
    document.body.classList.add('has-nt');
    const now = Date.now();
    cur = { el: el, prio: m[2], t0: now, end: now + it.ms, key: it.kind + '|' + it.title + '|' + (it.sub || '') };
    tmr = setTimeout(() => drop(el, next), it.ms);
  }
  UI.fxClear = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    clearTimeout(tmr); tmr = null; q = []; cur = null;
    const h = host(); if (h) h.innerHTML = '';
    document.body.classList.remove('has-nt');
    document.querySelectorAll('.cfw').forEach((el) => el.remove());
  };
  // kind: info|ok|warn|err|week|level|ach|win|me|team|opp|promo|injury|offer · opt: {ms, art, go:[فعل, v, v2], confetti, now}
  UI.notify = (kind, title, sub, opt) => {
    G.safe(() => {
      opt = opt || {};
      const m = NT[kind] || NT.info;
      title = tidy(title); sub = tidy(sub);
      if (!title && !sub) return;
      const len = title.length + sub.length;
      const ms = Math.min(7000, Math.max(opt.ms || BASE_MS[kind] || 2400, 1500 + len * 38));
      const it = { kind: NT[kind] ? kind : 'info', title: title || sub, sub: title ? sub : '', ms: ms, art: opt.art, go: opt.go };
      const key = it.kind + '|' + it.title + '|' + (it.sub || '');
      if ((cur && cur.key === key) || q.some((x) => x.kind + '|' + x.title + '|' + (x.sub || '') === key)) return;
      const n = opt.confetti == null ? (kind === 'me' || kind === 'win' ? 34 : 0) : opt.confetti;
      if (n > 0 && !reduced()) confetti(n);
      if (!cur) { show(it); return; }
      if (m[2] >= 3 || opt.now) { clearTimeout(tmr); const old = cur.el; cur = null; q = []; if (old.parentNode) old.parentNode.removeChild(old); show(it); return; }
      q.push(it);
      if (q.length > 3) { const lo = q.reduce((bi, x, i) => ((NT[x.kind] || NT.info)[2] < (NT[q[bi].kind] || NT.info)[2] ? i : bi), 0); q.splice(lo, 1); }
      // الظاهر الآن يُختصر ليأخذ التالي دوره بعد لحظة
      const now = Date.now(), cap = Math.max(900, 1600 - (now - cur.t0));
      if (cur.end - now > cap) { clearTimeout(tmr); const el = cur.el; cur.end = now + cap; tmr = setTimeout(() => drop(el, next), cap); }
    }, 'notify');
  };
  UI.on('ntClose', () => false);

  function confetti(n) {
    const w = document.createElement('div');
    w.className = 'cfw';
    w.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'), s = 6 + Math.random() * 7;
      c.style.left = (Math.random() * 100).toFixed(1) + '%';
      c.style.width = s.toFixed(1) + 'px';
      c.style.height = (s * (1.2 + Math.random())).toFixed(1) + 'px';
      c.style.background = COLORS[(Math.random() * COLORS.length) | 0];
      c.style.animationDelay = (Math.random() * 0.45).toFixed(2) + 's';
      c.style.animationDuration = (1.7 + Math.random() * 1.2).toFixed(2) + 's';
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 140).toFixed(0) + 'px');
      w.appendChild(c);
    }
    document.body.appendChild(w);
    timer = setTimeout(() => { timer = null; w.remove(); }, 3600);
  }

  // واجهات قديمة: banner(kind, title, sub, opt) و toast(msg, ms) تعمل كما كانت لكن بالتصميم الجديد
  UI.banner = (kind, title, sub, opt) => UI.notify(kind, title, sub, opt);
  const inferKind = (m) => (/تعذّر|^(لا يمكن|لا يوجد|لا حصص|استُنفدت|النص غير|أنت لست|هذه المباراة)/.test(m) ? 'warn' : /^(تم|نُسخ|انطلق|انتهت)|✔|✅/.test(m) ? 'ok' : 'info');
  UI.toast = (msg, ms) => UI.notify(inferKind(String(msg)), msg, '', { ms: ms });

  // رسائل الصندوق الجديدة المهمة (إصابة · عرض انتقال · صعود ناديك) تظهر كإشعار بعد الرسم. مراقبة قراءة فقط لمعرّف آخر رسالة
  UI.inboxNotify = () => {
    const S = G.S; if (!S || !S.inbox) return;
    const last = S.msgId || 0;
    if (UI._msgSeen == null || last < UI._msgSeen) { UI._msgSeen = last; return; }
    if (last === UI._msgSeen) return;
    const fresh = S.inbox.filter((m) => m.id > UI._msgSeen).reverse();
    UI._msgSeen = last;
    if (S.phase === 'retired') return;
    let n = 0;
    fresh.forEach((m) => {
      if (n >= 2) return;
      const short = String(m.text || '').split(/[.!؟]/)[0].slice(0, 70);
      if (m.kind === 'injury') { UI.notify('injury', m.title, short); n++; }
      else if (m.kind === 'offer') { UI.notify('offer', m.title, short, { go: ['goSub', 'market', 'mk:offers'] }); n++; }
      else if (m.kind === 'news' && /^صعود ناديك/.test(m.title)) { UI.notify('promo', m.title, short); n++; }
    });
  };

  // احتفال نهاية الموسم (ألقاب/جوائز): بعد الوصول إلى طور 'end' من الأسبوع اليدوي أو من المحاكاة. تُرجع true إن احتُفل بإنجاز.
  UI.seasonFx = () => {
    const r = G.safe(() => {
      const S = G.S, sm = S && S.summary;
      if (!sm || S.phase !== 'end' || !sm.row) return false;
      const tr = sm.row.trophies || {}, mine = (sm.awards || []).filter((a) => a.user);
      if (tr.ucl) { UI.fx('fanfare'); UI.banner('win', '🌟 بطل أوروبا!', 'توّجتَ بدوري أبطال أوروبا', { art: 'ucl', ms: 3400 }); return true; }
      if (tr.liga || tr.d2) { UI.fx('fanfare'); UI.banner('win', tr.d2 ? '🥈 بطل الدرجة الثانية!' : '🥇 بطل الدوري!', 'لقب ' + G.leagueName(sm.row.lgId) + ' لك', { art: tr.d2 ? 'd2' : 'liga', ms: 3400 }); return true; }
      if (mine.length) { UI.fx('fanfare'); UI.banner('win', '🎖️ ' + G.Season.AWARD_AR[mine[0].type], mine.length > 1 ? 'و' + (mine.length - 1) + ' جوائز أخرى' : 'جائزة الموسم', { art: ({ scorer: 'scorer', player: 'player', assist: 'assist', ucl: 'uclp', young: 'young' })[mine[0].type] || 'player', ms: 3200 }); return true; }
      UI.fx('done');
      return false;
    }, 'seasonFx');
    return r === true;
  };

  // مستوى جديد/تحسّن سمة بعد حصة تدريب أو أسبوع: t = ناتج Training.week()
  UI.levelFx = (t) => {
    G.safe(() => {
      if (!t) return;
      if (t.ups > 0) { UI.fx('level'); UI.notify('level', 'مستوى جديد', t.ups > 1 ? 'ارتفعتَ ' + t.ups + ' مستويات · نقاط تطوير بانتظارك' : 'نقطة تطوير جديدة بانتظارك'); }
      else if (t.attrUps && t.attrUps.length) UI.snd('ping');
    }, 'levelFx');
  };
})(window.G = window.G || {});
