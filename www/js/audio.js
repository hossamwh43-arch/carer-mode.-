/* audio.js — مؤثرات صوتية تُولَّد بالكامل بـ WebAudio (بلا أي ملف صوتي) + اهتزاز + الدالة الموحّدة UI.fx
   كل شيء اختياري ومحميّ بـ try/catch: إن لم يتوفر الصوت أو الاهتزاز تعمل اللعبة كما هي.
   السياسة: لا يبدأ الصوت قبل أول لمسة من المستخدم (قيد المتصفحات)، والمستوى العام منخفض كي لا يزعج. */
(function (G) {
  'use strict';
  const UI = G.UI;
  const A = (G.Audio = { ctx: null, master: null, crowdG: null, crowdSrc: null, noiseBuf: null, last: {} });

  const on = () => !(UI.prefs && UI.prefs.sound === false);
  const hapOn = () => !(UI.prefs && UI.prefs.haptics === false);

  function ctx() {
    if (A.ctx) return A.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      A.ctx = new AC();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.85;
      const comp = A.ctx.createDynamicsCompressor ? A.ctx.createDynamicsCompressor() : null; // يمنع التشويه عند تراكب الأصوات
      if (comp) { A.master.connect(comp); comp.connect(A.ctx.destination); } else A.master.connect(A.ctx.destination);
    } catch (e) { A.ctx = null; }
    return A.ctx;
  }
  A.unlock = () => { const c = ctx(); if (c && c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) { /* لا شيء */ } } };
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => document.addEventListener(ev, A.unlock, { passive: true }));

  // ---------- لبنات التوليد ----------
  function noiseBuffer(c) {
    if (A.noiseBuf) return A.noiseBuf;
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf; return buf;
  }
  // نغمة: type, f0→f1, بداية t, مدة dur, شدة vol (+ هجوم/خفوت)
  function tone(c, type, f0, f1, t, dur, vol, atk) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = atk || 0.012;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }
  // ضجيج مرشَّح: bandpass من fa إلى fb خلال المدة
  function noise(c, t, dur, vol, fa, fb, q, atk, kind) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuffer(c); s.loop = true;
    f.type = kind || 'bandpass'; f.Q.value = q || 0.8; f.frequency.setValueAtTime(fa, t); if (fb && fb !== fa) f.frequency.exponentialRampToValueAtTime(fb, t + dur);
    const a = atk || 0.05;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function whistle(c, t, dur) {
    // صفّارة: ترددان متقاربان مع ارتعاش سريع في الشدة
    [2850, 3120].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f + 60, t + dur);
      lfo.frequency.value = 26 + i * 3; lg.gain.value = 0.045;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.02); g.gain.setValueAtTime(0.11, t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(A.master);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    });
    noise(c, t, dur, 0.012, 3200, 3200, 6, 0.02);
  }

  const SND = {
    whistle: (c, t) => whistle(c, t, 0.42),
    whistle2: (c, t) => { whistle(c, t, 0.22); whistle(c, t + 0.3, 0.45); },
    whistle3: (c, t) => { whistle(c, t, 0.2); whistle(c, t + 0.27, 0.2); whistle(c, t + 0.55, 0.6); },
    goal: (c, t) => {
      noise(c, t, 2.2, 0.34, 500, 1500, 0.7, 0.35);
      noise(c, t + 0.1, 1.6, 0.16, 1800, 2600, 1, 0.3);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, 'triangle', f, f, t + i * 0.075, 0.7, 0.16));
      A.swell(1);
    },
    goalMe: (c, t) => {
      SND.goal(c, t);
      [1046.5, 1318.5, 1568].forEach((f, i) => tone(c, 'sine', f, f, t + 0.35 + i * 0.09, 0.8, 0.1));
    },
    oppGoal: (c, t) => { noise(c, t, 1.1, 0.14, 700, 250, 0.7, 0.15); tone(c, 'triangle', 220, 138, t, 0.7, 0.12); },
    chance: (c, t) => noise(c, t, 0.7, 0.12, 700, 1300, 0.9, 0.22),
    save: (c, t) => { tone(c, 'sine', 150, 70, t, 0.18, 0.2); noise(c, t, 0.4, 0.1, 900, 500, 0.8, 0.04); },
    card: (c, t) => { tone(c, 'square', 1500, 1500, t, 0.05, 0.05); tone(c, 'square', 1500, 1500, t + 0.09, 0.06, 0.05); },
    red: (c, t) => { tone(c, 'sawtooth', 170, 120, t, 0.5, 0.1); noise(c, t, 0.7, 0.1, 600, 300, 0.7, 0.08); },
    ping: (c, t) => { tone(c, 'sine', 880, 1320, t, 0.2, 0.14); tone(c, 'sine', 1320, 1320, t + 0.12, 0.25, 0.1); },
    level: (c, t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, 'triangle', f, f, t + i * 0.07, 0.35, 0.14)),
    coin: (c, t) => { tone(c, 'square', 1318.5, 1318.5, t, 0.09, 0.07); tone(c, 'square', 1760, 1760, t + 0.08, 0.32, 0.07); },
    done: (c, t) => [784, 988, 1175].forEach((f, i) => tone(c, 'sine', f, f, t + i * 0.12, 0.6, 0.12)),
    bad: (c, t) => { tone(c, 'sawtooth', 120, 70, t, 0.4, 0.1); },
    tap: (c, t) => tone(c, 'sine', 640, 520, t, 0.04, 0.05),
    fanfare: (c, t) => {
      [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.5]].forEach(([f, d]) => {
        const x = tone(c, 'sawtooth', f, f, t + d, d === 0.5 ? 1.3 : 0.22, 0.09, 0.02);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; x.g.disconnect(); x.g.connect(lp); lp.connect(A.master);
      });
      noise(c, t + 0.45, 1.8, 0.18, 600, 1600, 0.7, 0.4);
    }
  };

  // ---------- أجواء الملعب (ضجيج جمهور منخفض مستمر) ----------
  A.crowd = (onOff) => {
    if (!onOff && !A.crowdSrc) return; // لا ننشئ سياق صوت لمجرد الإيقاف
    const c = ctx();
    if (!c) return;
    try {
      if (onOff && on()) {
        if (c.state === 'suspended' && c.resume) c.resume();
        if (A.crowdSrc) return;
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        s.buffer = noiseBuffer(c); s.loop = true; f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.5;
        g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.028, c.currentTime + 1.2);
        s.connect(f); f.connect(g); g.connect(A.master); s.start();
        A.crowdSrc = s; A.crowdG = g;
      } else if (A.crowdSrc) {
        const s = A.crowdSrc, g = A.crowdG; A.crowdSrc = null; A.crowdG = null;
        g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
        setTimeout(() => { try { s.stop(); } catch (e) { /* لا شيء */ } }, 650);
      }
    } catch (e) { /* لا شيء */ }
  };
  A.swell = (k) => {
    const c = A.ctx, g = A.crowdG;
    if (!c || !g) return;
    try {
      const t = c.currentTime, base = 0.028;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.exponentialRampToValueAtTime(base * (1 + 2.2 * k), t + 0.25); g.gain.exponentialRampToValueAtTime(base, t + 3.2);
    } catch (e) { /* لا شيء */ }
  };

  A.play = (name) => {
    if (!on() || !SND[name]) return false;
    const c = ctx();
    if (!c) return false;
    try {
      if (c.state === 'suspended' && c.resume) { c.resume(); }
      const now = Date.now();
      if (A.last[name] && now - A.last[name] < 90) return false; // لا تكرار فوريًا
      A.last[name] = now;
      SND[name](c, c.currentTime + 0.01);
      return true;
    } catch (e) { A.lastErr = name + ': ' + String(e && e.message || e); return false; } // لا نُسقط اللعبة بسبب الصوت؛ الاختبارات تفحص lastErr
  };

  // ---------- الاهتزاز ----------
  const PAT = { goalMe: [0, 70, 45, 70, 45, 160], goal: [0, 60, 40, 110], oppGoal: [0, 60], ping: [25], red: [0, 120, 60, 120], card: [35], bad: [0, 90, 60, 90], level: [20, 35, 20], coin: [22], done: [35], tap: [10], fanfare: [0, 60, 40, 60, 40, 200], save: [30], whistle: [30], whistle3: [0, 40, 40, 40, 40, 90] };
  A.vibe = (name) => {
    if (!hapOn()) return false;
    const p = PAT[name];
    if (!p) return false;
    try { if (navigator.vibrate) return navigator.vibrate(p); } catch (e) { /* لا شيء */ }
    return false;
  };

  // الدالة الموحّدة: صوت + اهتزاز معًا. UI.snd: صوت فقط (لأحداث لا تخصّ اللاعب مباشرة)
  UI.fx = (name) => { G.safe(() => { A.play(name); A.vibe(name); }, 'fx:' + name); };
  UI.snd = (name) => { G.safe(() => { A.play(name); }, 'snd:' + name); };

  // عند إخفاء التطبيق (الشاشة مقفلة أو الانتقال لتطبيق آخر) نوقف السياق كي لا يستمر ضجيج الملعب في الخلفية
  document.addEventListener('visibilitychange', () => {
    const c = A.ctx;
    if (!c) return;
    try {
      if (document.hidden) { if (c.suspend) c.suspend(); }
      else if (on() && c.resume) c.resume();
    } catch (e) { /* لا شيء */ }
  });
})(window.G = window.G || {});
