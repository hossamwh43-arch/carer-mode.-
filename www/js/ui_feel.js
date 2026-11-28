/* ui_feel.js — Build 35 («الإحساس»): جودة الرسوميات · عدّادات أرقام · حركة ارتفاع التقييم · اتجاه انتقال التبويبات · أصوات واجهة.
   طبقة عرض فقط: لا حالة لعبة ولا حفظ ولا عشوائية لعب (الأرقام النهائية في HTML كما هي دائمًا؛ العدّاد يحرّك النص نحوها وينتهي عندها).
   الاختبارات الآلية (navigator.webdriver) تتجاوز الحركات الزمنية كي لا تقرأ أرقامًا وسطية، إلا إذا فُعّلت صراحةً (UI.prefs.motionTest). */
(function (G) {
  'use strict';
  const UI = G.UI;
  const root = document.documentElement;

  // ---------- الجودة: auto | high | low ----------
  const weak = () => { try { return (navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4); } catch (e) { return false; } };
  UI.qualityPref = () => (UI.prefs && (UI.prefs.quality === 'high' || UI.prefs.quality === 'low') ? UI.prefs.quality : 'auto');
  UI.quality = () => { const q = UI.qualityPref(); return q === 'auto' ? (weak() ? 'low' : 'high') : q; };
  UI.applyQuality = () => { const q = UI.quality(); if (root.getAttribute('data-q') !== q) root.setAttribute('data-q', q); };
  const reduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const auto = () => { try { return !!navigator.webdriver && !(UI.prefs && UI.prefs.motionTest); } catch (e) { return false; } };
  // هل تُشغَّل الحركات الزمنية (عدّادات/مشاهد)؟ لا مع تقليل الحركة أو الجودة المنخفضة أو الأتمتة
  UI.motionOK = () => !reduced() && UI.quality() !== 'low' && !auto();

  // ---------- عدّاد الأرقام ----------
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  UI.countTo = (el, from, to, ms) => {
    if (!el) return;
    const dec = String(to).indexOf('.') >= 0 ? String(to).split('.')[1].length : 0, t0 = performance.now(), d = ms || 650;
    const fmt = (v) => (dec ? v.toFixed(dec) : String(Math.round(v)));
    const step = (t) => {
      if (!el.isConnected) return;
      const k = Math.min(1, (t - t0) / d);
      el.textContent = k >= 1 ? fmt(to) : fmt(from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const seen = {}; // آخر قيمة معروضة لكل مفتاح (للذاكرة العابرة فقط، لا تُحفظ)

  // ---------- اتجاه الانتقال بين مجموعات التنقل السفلي ----------
  const gIndex = (r) => { try { const g = UI.groupOf ? UI.groupOf(r) : null; const keys = Object.keys(UI.GROUPS || {}); return g ? keys.indexOf(g) : -1; } catch (e) { return -1; } };

  UI.feelAfter = (entering) => {
    UI.applyQuality();
    const app = document.getElementById('app');
    if (entering && app && UI.cur !== 'match') {
      const gi = gIndex(UI.cur), pv = UI._gi;
      UI._gi = gi;
      if (gi >= 0 && pv != null && pv >= 0 && gi !== pv && UI.motionOK()) app.classList.add(gi > pv ? 'dir-l' : 'dir-r'); // RTL: التبويب التالي على اليسار فتدخل الشاشة منه
    }
    const els = document.querySelectorAll('[data-cu]');
    els.forEach((el) => {
      const key = UI.cur + ':' + el.getAttribute('data-cu'), to = parseFloat(el.getAttribute('data-v')), from = seen[key];
      seen[key] = to;
      if (!isFinite(to) || !UI.motionOK()) return;
      const start = from == null ? (entering ? 0 : to) : from;
      if (start === to) return;
      UI.countTo(el, start, to, from == null ? 700 : 900);
      if (from != null && to > from) { // ارتفاع (مثل تقييمك): وهج + شارة +N
        el.classList.add('cu-up');
        const chip = document.createElement('i'); chip.className = 'cu-d'; chip.textContent = '+' + (String(to).indexOf('.') >= 0 ? (to - from).toFixed(1) : (to - from));
        el.parentNode && el.parentNode.appendChild(chip);
        setTimeout(() => { el.classList.remove('cu-up'); chip.remove(); }, 1800);
      }
    });
  };

  const fa = UI.feelAfter;
  UI.feelAfter = (entering) => { fa(entering); if (UI.sceneWatch) UI.sceneWatch(); };

  // ---------- أصوات الواجهة (تتبع مفتاح الصوت، ولها مفتاح خاص) ----------
  const uiSnd = () => !(UI.prefs && UI.prefs.uiSound === false);
  document.addEventListener('click', (ev) => {
    if (!uiSnd() || !G.Audio) return;
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-a]') : null;
    if (!el) return;
    const nav = el.closest('#bottomnav') || el.classList.contains('tab') || el.classList.contains('tabx');
    G.safe(() => { if (nav) { G.Audio.play('nav'); G.Audio.vibe('nav'); } else if (!el.classList.contains('tgl')) { G.Audio.play('tap'); if (el.classList.contains('pri')) G.Audio.vibe('tap'); } }, 'uiSnd');
  }, true);
  const sw = document.getElementById('sheetWrap');
  if (sw && window.MutationObserver) {
    new MutationObserver(() => { if (!sw.classList.contains('hidden') && uiSnd() && G.Audio) G.safe(() => { G.Audio.play('sheet'); G.Audio.vibe('sheet'); }, 'sheetSnd'); }).observe(sw, { attributes: true, attributeFilter: ['class'] });
  }
  UI.applyQuality();
})(window.G = window.G || {});
