/* ui_fx.js — مؤثرات بصرية خفيفة: لافتة الأحداث (هدف، مستوى جديد، انتقال، لقب…) وقصاصات الاحتفال.
   - كل العناصر غير تفاعلية (pointer-events:none) وتُضاف إلى body فلا يمسحها UI.render، وتزول وحدها.
   - للزينة فقط: تستخدم Math.random ولا تلمس U.rnd أبدًا، كي لا يتغيّر تسلسل العشوائية المحفوظ مع المسيرة.
   - تحترم إعداد «تقليل الحركة» في النظام: لافتة ثابتة بلا قصاصات. */
(function (G) {
  'use strict';
  const UI = G.UI;
  const COLORS = ['#22c55e', '#fbbf24', '#38bdf8', '#f472b6', '#f8fafc', '#fb923c', '#a78bfa'];
  let timer = null;

  const reduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };

  UI.fxClear = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    document.querySelectorAll('.gfx,.cfw').forEach((el) => el.remove());
  };

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
  }

  // kind: me (هدفك/إنجاز: ذهبية + قصاصات) | team (خضراء) | opp (حمراء) | info (زرقاء) | win (ذهبية + قصاصات)
  UI.banner = (kind, title, sub, opt) => {
    G.safe(() => {
      opt = opt || {};
      UI.fxClear();
      const w = document.createElement('div');
      w.className = 'gfx gfx-' + kind;
      w.setAttribute('role', 'status');
      const b = document.createElement('div');
      b.className = 'gfx-box';
      const t = document.createElement('div'); t.className = 'gfx-t'; t.textContent = title;
      b.appendChild(t);
      if (sub) { const s = document.createElement('div'); s.className = 'gfx-s'; s.textContent = sub; b.appendChild(s); }
      w.appendChild(b);
      document.body.appendChild(w);
      const n = opt.confetti == null ? (kind === 'me' || kind === 'win' ? 34 : 0) : opt.confetti;
      if (n > 0 && !reduced()) confetti(n);
      timer = setTimeout(UI.fxClear, opt.ms || 2700);
    }, 'banner');
  };

  // احتفال نهاية الموسم (ألقاب/جوائز): بعد الوصول إلى طور 'end' من الأسبوع اليدوي أو من المحاكاة. تُرجع true إن احتُفل بإنجاز.
  UI.seasonFx = () => {
    const r = G.safe(() => {
      const S = G.S, sm = S && S.summary;
      if (!sm || S.phase !== 'end' || !sm.row) return false;
      const tr = sm.row.trophies || {}, mine = (sm.awards || []).filter((a) => a.user);
      if (tr.ucl) { UI.fx('fanfare'); UI.banner('win', '🌟 بطل أوروبا!', 'توّجتَ بدوري أبطال أوروبا'); return true; }
      if (tr.liga) { UI.fx('fanfare'); UI.banner('win', '🥇 بطل الدوري!', 'لقب الدوري الإسباني لك'); return true; }
      if (mine.length) { UI.fx('fanfare'); UI.banner('win', '🎖️ ' + G.Season.AWARD_AR[mine[0].type], mine.length > 1 ? 'و' + (mine.length - 1) + ' جوائز أخرى' : 'جائزة الموسم'); return true; }
      UI.fx('done');
      return false;
    }, 'seasonFx');
    return r === true;
  };

  // مستوى جديد/تحسّن سمة بعد حصة تدريب أو أسبوع: t = ناتج Training.week()
  UI.levelFx = (t) => {
    G.safe(() => {
      if (!t) return;
      if (t.ups > 0) { UI.fx('level'); UI.banner('info', '⬆️ مستوى جديد!', t.ups > 1 ? 'ارتفعتَ ' + t.ups + ' مستويات — نقاط تطوير بانتظارك' : 'نقطة تطوير جديدة بانتظارك', { ms: 2300 }); }
      else if (t.attrUps && t.attrUps.length) UI.snd('ping');
    }, 'levelFx');
  };
})(window.G = window.G || {});
