/* ui_stadium.js — «الملعب المرئي»: بث تلفزيوني متحرك (Canvas) لمباراتك فوق المحرك الفعلي.
   ما يراه اللاعب: ملعب بمنظور بث، عشب بخطوط قص وإضاءة ملاعب، مدرجات، شباك، لاعبون بأطقم ألوان الأندية يجرون ويتمركزون حسب الكرة،
   وكل حدث حقيقي من المحرك يُصوَّر: هجمة بتمريرات ثم تسديدة ثم هدف/تصدٍّ/إهدار، احتفال وإعادة بطيئة للأهداف، بطاقات، تبديلات.
   ⚠ تصوير فقط لا تحكّم: لا يمسّ حالة اللعبة ولا G.U (عشوائيته من SC.rng المبذور بمعرّف المباراة). تعطيله لا يغيّر أي نتيجة.
   الإبطاء: أثناء أهم الأحداث تنتظر دقّات المباراة انتهاء مشهدها (UI.stadium.busy) عند السرعة ×1 و×2؛ وعند ×3 أو «إنهاء فوري» يُتخطّى المشهد. نقرة على الملعب تتخطى المشهد الحالي. */
(function (G) {
  'use strict';
  const UI = G.UI, SC = G.Stadium, clamp = SC.clamp, lerp = SC.lerp, L = SC.L, W = SC.W;
  const S = (UI.stadium = {});
  let st = null, rev = 0;

  const SKIN = ['#f1c9a5', '#e0ac80', '#b9805a', '#7a4b32'];
  const HAIR = ['#14100c', '#2a1a10', '#4a3322', '#a8742f'];   // ألوان الشعر
  const BOOT = ['#10131c', '#e8edf7', '#ff7a1a', '#37d6a1'];   // ألوان الأحذية
  const CELEBS = ['corner', 'slide', 'fans', 'hug', 'sky'];     // أنواع الاحتفال (تُختار حتميًا من اللاعب والمباراة)
  const SPEED_MUL = { 1: 1, 2: 1.8, 3: 3 };
  const CAM_AR = { tv: 'كاميرا البث', follow: 'كاميرا قريبة', top: 'منظر علوي' };
  const prefersReduce = () => { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* لا شيء */ } }
  };
  const code = (id) => { const c = G.S.clubs[id]; return c ? (c.code || UI.abbr(c.name).slice(0, 3)) : '—'; };
  const surname = (n) => String(n || '').split(/\s+/).slice(-1)[0];

  // ---------- الإنشاء ----------
  S.mount = (host, m) => {
    if (!host || !m) return;
    if (st && st.host === host && st.canvas.isConnected && st.mid === m.id) { S.update(m); return; }
    S.destroy();
    const seed = SC.hash(String(m.id) + ':' + (G.S ? G.S.season : 0) + ':' + (G.S ? G.S.week : 0));
    st = {
      host, mid: m.id, rnd: SC.rng(seed), t: 0, ents: [], byId: {}, ball: { x: L / 2, z: SC.CZ, h: 0, carrier: null }, queue: [], cur: null,
      particles: [], flashes: [], cards: [], net: { h: 0, a: 0 }, seen: { ev: m.ev ? m.ev.length : 0, sh: { h: m.st.h.sh, a: m.st.a.sh }, sot: { h: m.st.h.sot, a: m.st.a.sot } },
      cam: { mode: store.get('fcc_cam') || 'tv', zoom: 1, cx: L / 2, cz: SC.CZ, dy: 0 }, camT: { zoom: 1, cx: L / 2, cz: SC.CZ },
      poss: { side: 'h', next: 0.6 }, pBias: 0.5, side: m.side, uid: G.S.user, form: {}, keyXI: '', replayOK: true,
      excite: 0.12, shake: 0, dust: [], trail: [], bspin: 0, celebUntil: 0, celebId: null, celebKind: '', celebN: 0, flareCol: null, subT: 0,
      tod: [0, 0, 0, 1, 2][SC.hash('tod' + m.id) % 5], rain: SC.hash('rn' + m.id) % 6 === 0, drops: [],
      reduce: prefersReduce(), q: 1, ft: [], fi: [], qDrop: false, frames: 0, skip: false, lastTxt: '', pend: false, label: '', labelT: 0, prog: performance.now(), errs: 0
    };
    if (!SC.CAMS.includes(st.cam.mode)) st.cam.mode = 'tv';
    const h = document.createElement('div');
    h.className = 'stg-in';
    h.innerHTML = '<canvas class="stg-cv" role="img" aria-label="ملعب المباراة"></canvas>' +
      '<div class="stg-sb"><span class="t h"></span><b class="sc"></b><span class="t a"></span><em class="mn"></em></div>' +
      '<div class="stg-tag" hidden></div><div class="stg-cap" aria-live="off"></div><div class="stg-sub" hidden></div>' +
      '<button class="stg-cam" data-a="mvCam" aria-label="تبديل الكاميرا"><span></span></button>';
    host.innerHTML = ''; host.appendChild(h);
    st.canvas = h.querySelector('canvas'); st.ctx = st.canvas.getContext('2d');
    st.sb = { h: h.querySelector('.stg-sb .h'), a: h.querySelector('.stg-sb .a'), sc: h.querySelector('.stg-sb .sc'), mn: h.querySelector('.stg-sb .mn'), box: h.querySelector('.stg-sb') };
    st.tag = h.querySelector('.stg-tag'); st.cap = h.querySelector('.stg-cap'); st.subEl = h.querySelector('.stg-sub'); st.camBtn = h.querySelector('.stg-cam span');
    st.canvas.addEventListener('click', () => { if (st) st.skip = true; });
    syncCamBtn();
    resize();
    if (typeof ResizeObserver === 'function') { st.ro = new ResizeObserver(() => resize()); st.ro.observe(host); }
    buildTeams(m, true);
    st.crowd = makeCrowd();
    st.grass = makeGrass();
    st.last = performance.now();
    st.raf = requestAnimationFrame(loop);
  };

  // يحفظ أداء الملعب الفعلي على هذا الجهاز (لشاشة التشخيص)؛ لا يؤثر في اللعب
  const savePerf = () => { try { if (st && G.Diag && st.frames >= 90) G.Diag.recordPerf(G.Diag.summarize(st.ft, st.fi, { frames: st.frames, q: st.q, qDrop: !!st.qDrop, w: st.W, h: st.H, dpr: window.devicePixelRatio || 1 })); } catch (e) { /* لا شيء */ } };
  S.destroy = () => {
    if (!st) return;
    savePerf();
    if (st.raf) cancelAnimationFrame(st.raf);
    if (st.ro) st.ro.disconnect();
    st = null;
  };
  const blockingLeft = () => !!(st && ((st.cur && st.cur.blocking) || st.queue.some((a) => a.blocking)));
  // تعمل شاشة المباراة بدقّات المحرك: ما دام مشهدٌ مهمٌّ يُعرَض تنتظر الدقّات (وتُخفى نتيجته عن الهيدر والسجل حتى لحظته)
  S.busy = () => {
    if (!st || st.reduce || !st.canvas || !st.canvas.isConnected || !blockingLeft()) return false;
    if (!document.hidden && performance.now() - st.prog > 30000) { S.flush(); return false; } // حارس أمان: لا يُجمَّد الدوري أبدًا بسبب الرسم
    return true;
  };
  S.revNo = () => rev;
  S.flush = () => { if (!st) return; st.queue = st.queue.filter((a) => !a.blocking); if (st.cur) st.skip = true; rev++; };
  // أقلّ فهرس حدثٍ لم يُكشَف بعد (غير نهائي = لا شيء محجوب)
  S.held = () => {
    if (!st) return Infinity;
    let h = Infinity;
    const f = (a) => { if (a && a.blocking && a.idx != null && !a.revealed && a.idx < h) h = a.idx; };
    f(st.cur); st.queue.forEach(f);
    return h;
  };
  S.shown = (m) => {
    const sc = { h: m.score.h, a: m.score.a }, cap = S.held();
    for (let i = cap; i < m.ev.length; i++) if (m.ev[i].k === 'goal' && sc[m.ev[i].s] > 0) sc[m.ev[i].s]--;
    return sc;
  };
  // خطّاف للاختبارات والمعاينة (لا يمسّ المحرك): يفرض الإضاءة/المطر أو احتفالًا بعينه
  S.debug = (o) => {
    if (!st || !o) return false;
    if (o.mute != null) st.mute = !!o.mute;
    if (o.tod != null) st.tod = o.tod | 0;
    if (o.rain != null) { st.rain = !!o.rain; if (!st.rain) st.drops = []; }
    if (o.celeb) { const e = st.ents.find((x) => x.side === (o.side || st.side) && !x.gk && !x.leaving); if (e) { st.cam.mode = o.cam || st.cam.mode; celebrate({ side: e.side, shot: { id: e.id }, force: o.celeb }, false); return e.id; } }
    return true;
  };
  S.stats = () => (st ? { frames: st.frames, avgMs: st.ft.length ? st.ft.reduce((a, b) => a + b, 0) / st.ft.length : 0, w: st.W, h: st.H, cam: st.cam.mode, ents: st.ents.length, busy: S.busy(), q: st.q, queue: st.queue.length, cur: st.cur ? st.cur.k : null, ball: [st.ball.x, st.ball.z, st.ball.h], tod: st.tod, rain: st.rain, celeb: st.celebKind, excite: Math.round(st.excite * 100) / 100, shake: Math.round(st.shake * 100) / 100, dust: st.dust.length, trail: st.trail.length, poses: st.ents.reduce((o, e) => { if (e.pose) o[e.pose] = (o[e.pose] || 0) + 1; return o; }, {}) } : null);
  S.cycleCam = () => {
    if (!st) return;
    const i = SC.CAMS.indexOf(st.cam.mode); st.cam.mode = SC.CAMS[(i + 1) % SC.CAMS.length];
    store.set('fcc_cam', st.cam.mode); syncCamBtn();
    if (st.cam.mode === 'top') { st.cam.zoom = 1; st.cam.cx = L / 2; st.cam.cz = SC.CZ; }
  };
  UI.on('mvCam', () => { S.cycleCam(); return false; });
  function syncCamBtn() { if (st && st.camBtn) st.camBtn.textContent = CAM_AR[st.cam.mode]; }

  function resize() {
    if (!st) return;
    const w = Math.max(240, Math.round(st.host.clientWidth || 340)), mini = st.pend;
    const h = Math.round(w * (mini ? 0.44 : 0.64));
    const dpr = st.q > 0 ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    st.W = w; st.H = h; st.dpr = dpr;
    st.canvas.width = Math.round(w * dpr); st.canvas.height = Math.round(h * dpr);
    st.canvas.style.height = h + 'px';
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st.crowd = null; st.grass = null;
  }

  // ---------- الفريقان والتشكيلة ----------
  function clubOf(id) { return G.S.clubs[id]; }
  function buildTeams(m, first) {
    const key = ['h', 'a'].map((s) => m.xi[s].map((x) => x.id).join(',')).join('|');
    if (!first && key === st.keyXI) return;
    st.keyXI = key;
    const kits = SC.kits(clubOf(m.h) && clubOf(m.h).c, clubOf(m.a) && clubOf(m.a).c);
    st.kits = kits;
    const keep = {}, list = [];
    ['h', 'a'].forEach((s) => {
      const club = clubOf(m[s]); const form = (club && club.form) || '4-3-3'; st.form[s] = form;
      const lay = SC.layout(m.xi[s], form, s, (f) => G.FORMATIONS[f] || G.FORMATIONS['4-3-3']);
      lay.forEach((e) => {
        let ent = st.byId[e.id];
        const p = G.S.players[e.id];
        if (!ent) {
          ent = { id: e.id, side: s, x: 0, z: 0, vx: 0, vz: 0, ph: st.rnd() * 6.28, skin: SKIN[SC.hash(e.id) % 4], name: p ? surname(p.n) : '', num: p ? p.num : 0,
            hair: SC.hash(e.id + 'h') % 5, hairCol: HAIR[(SC.hash(e.id + 'c') >> 2) % 4], boot: BOOT[(SC.hash(e.id + 'b') >> 3) % 4], ax: 0 };
          if (p && p.user && p.look && p.look.skin != null) ent.skin = SKIN[p.look.skin % 4];
          const fresh = !first;
          ent.x = fresh ? L / 2 + (s === 'h' ? 6 : -6) : e.base[0]; ent.z = fresh ? W + 3 : e.base[1];
          if (fresh) ent.enter = true;
        }
        ent.side = s; ent.slot = e.slot; ent.base = e.base; ent.gk = e.slot === 'GK'; ent.leaving = false; ent.kit = kits[s];
        ent.user = e.id === st.uid;
        keep[e.id] = ent; list.push(ent);
      });
    });
    // المغادرون (استُبدلوا أو طُردوا): يخرجون من الحد القريب
    st.ents.forEach((e) => { if (!keep[e.id]) { e.leaving = true; e.base = [e.x, W + 4]; list.push(e); } });
    st.ents = list; st.byId = {}; list.forEach((e) => { st.byId[e.id] = e; });
    if (!st.ref) st.ref = { id: 'ref', side: 'r', x: L / 2 + 6, z: SC.CZ + 8, vx: 0, vz: 0, ph: 1, skin: SKIN[1], kit: { shirt: '#161a22', shorts: '#0b0d12', socks: '#161a22', trim: '#f4d03f' } };
    if (!st.ball.carrier || !st.byId[st.ball.carrier]) giveBall(kickoffPlayer('h'));
  }
  function kickoffPlayer(side) {
    const c = st.ents.filter((e) => e.side === side && !e.gk && !e.leaving).sort((a, b) => Math.abs(a.base[0] - L / 2) - Math.abs(b.base[0] - L / 2));
    return c[0] || null;
  }
  function giveBall(e) { if (!e) return; st.ball.carrier = e.id; st.poss.side = e.side; st.ball.x = e.x; st.ball.z = e.z; st.ball.h = 0; st.ball.anim = null; }

  // ---------- تحديث من المحرك (يُستدعى كل دقّة) ----------
  S.update = (m) => {
    if (!st || !m) return;
    buildTeams(m, false);
    const sp = SPEED_MUL[(UI.mv && UI.mv.speed) || 1] || 1;
    st.spd = sp;
    const p = (m.p && (m.p.h + m.p.a) > 0) ? m.p.h / (m.p.h + m.p.a) : 0.5;
    st.pBias = clamp(p, 0.3, 0.7);
    // قرار تفاعلي معلّق: نقرّب على لاعبك ونوقف التحرك العام
    const pend = !!m.pending;
    if (pend !== st.pend) { st.pend = pend; resize(); }
    // أحداث جديدة
    const n = m.ev ? m.ev.length : 0;
    if (st.seen.ev > n) st.seen.ev = n;
    const evShot = { h: 0, a: 0 };
    for (let i = st.seen.ev; i < n; i++) {
      const e = m.ev[i];
      if (e.k === 'goal' || e.k === 'save' || e.k === 'miss') evShot[e.s] = (evShot[e.s] || 0) + 1;
      onEvent(m, e, i);
    }
    st.seen.ev = n;
    // تسديدات بلا حدث مكتوب (تعتمد عدّادات المحرك نفسها: على المرمى = تصدٍّ، وإلا إهدار)
    ['h', 'a'].forEach((s) => {
      const dsh = m.st[s].sh - st.seen.sh[s], dsot = m.st[s].sot - st.seen.sot[s];
      st.seen.sh[s] = m.st[s].sh; st.seen.sot[s] = m.st[s].sot;
      if (dsh > 0 && !evShot[s] && !st.reduce && sp < 3 && !st.cur && st.queue.length < 2) queueAttack(m, s, { outcome: dsot > 0 ? 'save' : 'miss', blocking: false });
    });
    // السطر السفلي (آخر حدث ظاهر فقط: لا كشف لهدف قبل لحظته) واللوحة
    const cap = S.held(), vis = Math.min(cap, n), last = vis > 0 ? m.ev[vis - 1] : null;
    if (last && last.txt !== st.lastTxt) { st.lastTxt = last.txt; if (st.cap) { st.cap.textContent = String(last.txt).replace(/^[^\p{L}\p{N}]+/u, ''); st.cap.classList.remove('on'); void st.cap.offsetWidth; if (last.k !== 'sub') st.cap.classList.add('on'); /* التبديل له شريطه الخاص */ } if (st.canvas) st.canvas.setAttribute('aria-label', 'ملعب المباراة: ' + st.cap.textContent); }
    const sc = S.shown(m);
    st.sb.h.textContent = code(m.h); st.sb.a.textContent = code(m.a); st.sb.sc.textContent = sc.h + ' - ' + sc.a;
    st.sb.mn.textContent = m.done ? 'نهاية' : m.i === 0 ? '' : m.labs[m.i - 1] + "'";
    st.sb.box.style.setProperty('--hc', st.kits.h.shirt); st.sb.box.style.setProperty('--ac', st.kits.a.shirt);
    if (pend) focusUser(m);
  };

  function setTag(txt) { if (!st || !st.tag) return; if (txt) { st.tag.textContent = txt; st.tag.hidden = false; } else st.tag.hidden = true; }

  function onEvent(m, e, idx) {
    const k = e.k, s = e.s;
    if (k === 'kick') { resetShape(true); return; }
    if (k === 'ht' || k === 'ft' || k === 'et') { resetShape(false); return; }
    if (k === 'goal') { queueAttack(m, s, { outcome: 'goal', shooter: e.p, assist: e.p2, blocking: true, replay: true, idx }); return; }
    if (k === 'save') { queueAttack(m, s, { outcome: 'save', shooter: e.p, keeperId: e.p2, blocking: true, idx }); return; }
    if (k === 'miss') { queueAttack(m, s, { outcome: 'miss', shooter: e.p, blocking: true, idx }); return; }
    if (k === 'yellow' || k === 'red') { st.cards.push({ id: e.p, t: 0, red: k === 'red' }); return; }
    if (k === 'inj') { st.cards.push({ id: e.p, t: 0, inj: true }); return; }
    if (k === 'sub') { st.flashes.push({ x: 0, kind: 'sub', t: 0 }); showSub(e); }
  }
  // شريط تبديل بأسلوب البث: الداخل ▲ والخارج ▼ وسببه (للاعبك بلون مميّز)
  function showSub(e) {
    if (!st || !st.subEl) return;
    const pl = G.S.players, inn = pl[e.p], out = pl[e.p2], why = /\((.+)\)\s*$/.exec(e.txt || '');
    if (!inn || !out) return;
    const mine = e.p === st.uid || e.p2 === st.uid;
    st.subEl.className = 'stg-sub' + (mine ? ' me' : '');
    st.subEl.innerHTML = '<b class="in">▲ ' + UI.esc(surname(inn.n)) + '</b><b class="out">▼ ' + UI.esc(surname(out.n)) + '</b>' + (why ? '<small>' + UI.esc(why[1]) + '</small>' : '');
    st.subEl.hidden = true; void st.subEl.offsetWidth; st.subEl.hidden = false; st.subT = 3.4;
  }
  function resetShape(kick) {
    st.queue = []; st.cur = null; st.ball.anim = null; setTag('');
    st.ents.forEach((e) => { e.script = null; e.dive = null; });
    if (kick) { st.ents.forEach((e) => { if (!e.enter) { e.x = e.base[0]; e.z = e.base[1]; } }); giveBall(kickoffPlayer('h')); }
  }

  // ---------- الهجمات المصوّرة ----------
  function attackers(s) { return st.ents.filter((e) => e.side === s && !e.leaving); }
  function queueAttack(m, s, o) {
    if (st.mute || !attackers(s).length) return;   // st.mute: لا يُفعَّل إلا من S.debug في الاختبارات
    const quick = st.reduce || (st.spd || 1) >= 3 || (UI.mv && UI.mv.fast);
    const ents = attackers(s).map((e) => ({ id: e.id, x: e.x, z: e.z, slot: e.slot }));
    let shooter = o.shooter && st.byId[o.shooter] ? o.shooter : null;
    if (!shooter) { // تسديدة بلا مسدِّد معروف: نختار مهاجمًا بوزن الموضع (مولّدنا الخاص)
      const out = ents.filter((e) => e.slot !== 'GK');
      const w = out.map((e) => (e.slot === 'ST' ? 5 : e.slot === 'LW' || e.slot === 'RW' ? 3.5 : e.slot === 'CAM' ? 3 : 1));
      let r = st.rnd() * w.reduce((a, b) => a + b, 0), i = 0; while (i < out.length - 1 && (r -= w[i]) > 0) i++;
      shooter = out[i] ? out[i].id : null;
    }
    const plan = SC.planAttack(st.rnd, { side: s, ents, shooter, assist: o.assist, outcome: o.outcome });
    if (!plan) return;
    const snap = st.ents.map((e) => ({ id: e.id, x: e.x, z: e.z }));
    const gk = st.ents.find((e) => e.side !== s && e.gk && !e.leaving);
    if (quick) { // سرعة ×3 أو إنهاء: لمحة سريعة فقط (الكرة في الشباك/عند الحارس + وميض) دون هجمة كاملة
      st.queue.push({ k: 'quick', dur: o.outcome === 'goal' ? 0.9 : 0.4, t: 0, blocking: false, start: () => { if (o.outcome === 'goal') celebrate(plan, true); } });
      return;
    }
    const act = makeAttack(m, plan, o, snap, gk, 1);
    act.idx = o.idx; st.queue.push(act);
    if (o.blocking && st.cur && !st.cur.blocking) st.skip = true; // هجمة تجميلية جارية: تُقطَع لتبدأ اللحظة الحقيقية فورًا
    if (o.replay && o.outcome === 'goal' && st.replayOK && (st.spd || 1) < 2) st.queue.push(makeReplay(m, plan, o, snap, gk));
  }

  const legTimes = (plan, k) => { const t = []; let a = 0; plan.chain.forEach((c) => { t.push([a, a + c.t * k]); a += c.t * k; }); const shotT = [a, a + plan.shot.t * k]; return { legs: t, shot: shotT, end: shotT[1] }; };
  function makeAttack(m, plan, o, snap, gk, slow) {
    const T = legTimes(plan, slow), after = slow > 1 ? 1.5 : o.outcome === 'goal' ? 1.7 : o.outcome === 'save' ? 0.9 : 0.7;
    const dur = T.end + after;
    const first = st.byId[plan.chain[0] ? plan.chain[0].id : plan.shot.id];
    const act = {
      k: 'attack', blocking: !!o.blocking, dur, t: 0, plan, outcome: o.outcome, slow, replay: slow > 1, revealed: !o.blocking,
      start() {
        st.ball.anim = null; st.poss.side = plan.side; st.ball.carrier = null;
        if (first) { st.ball.x = first.x; st.ball.z = first.z; st.ball.h = 0; }
        if (slow === 1) setTag('');
        plan.chain.forEach((c) => { const to = st.byId[c.to]; if (to) to.script = { tx: c.dest[0], tz: c.dest[1], sp: 7.5, until: 0 }; });
        const sh = st.byId[plan.shot.id]; if (sh) sh.script = { tx: plan.shot.from[0], tz: plan.shot.from[1], sp: 8, until: 0 };
        if (gk) gk.script = { tx: gk.x, tz: gk.z, sp: 3, until: 0 };
        act.keeperId = gk ? gk.id : null;
      },
      update(p, dtt) {
        const tt = act.t;
        // الكرة
        let seg = null;
        for (let i = 0; i < T.legs.length; i++) if (tt >= T.legs[i][0] && tt < T.legs[i][1]) seg = { i, p: (tt - T.legs[i][0]) / (T.legs[i][1] - T.legs[i][0]) };
        if (seg) {
          const c = plan.chain[seg.i], e = SC.ease(seg.p);
          st.ball.x = lerp(c.from[0], c.dest[0], e); st.ball.z = lerp(c.from[1], c.dest[1], e); st.ball.h = 4 * c.h * seg.p * (1 - seg.p);
          const nxt = st.byId[c.to]; if (nxt && seg.p > 0.9) giveCarrier(nxt);
        } else if (tt >= T.shot[0] && tt < T.shot[1]) {
          const q = (tt - T.shot[0]) / (T.shot[1] - T.shot[0]), sh = plan.shot;
          st.ball.x = lerp(sh.from[0], sh.to[0], q); st.ball.z = lerp(sh.from[1], sh.to[1], q);
          st.ball.h = lerp(0.2, sh.to[2], q) + 4 * Math.min(sh.h, 3) * 0.18 * q * (1 - q);
          st.ball.carrier = null;
          // الحارس يغطس نحو نقطة الكرة
          if (gk && q > 0.18) {
            const kd = plan.keeper.dive, dq = clamp((q - 0.18) / 0.8, 0, 1), tg = SC.goalX(plan.side) < L / 2 ? 1 : -1;
            gk.dive = { q: dq, from: gk.__df || (gk.__df = [gk.x, gk.z]), to: [SC.goalX(plan.side) + tg * 1.1, o.outcome === 'goal' ? clamp(kd[1] + (kd[1] < SC.CZ ? 1 : -1) * 1.9, SC.CZ - 4.2, SC.CZ + 4.2) : kd[1]] };
          }
        } else if (tt >= T.shot[1]) {
          if (!act.revealed) { act.revealed = true; rev++; }
          const q = clamp((tt - T.shot[1]) / Math.max(0.4, after * 0.5), 0, 1);
          if (o.outcome === 'goal') { // الكرة تهدأ داخل الشباك وتتموّج
            const gx = SC.goalX(plan.side), tg = plan.shot.to, back = gx < L / 2 ? -1 : 1;
            st.ball.x = tg[0] + back * 0.9 * SC.ease(q); st.ball.z = tg[1]; st.ball.h = Math.max(0, tg[2] * (1 - SC.ease(q))); if (!act.scored) { act.scored = true; celebrate(plan, false); st.net[plan.side] = 1; }
          } else if (o.outcome === 'save') {
            if (gk) { st.ball.x = lerp(plan.shot.to[0], gk.x, 0.6 * SC.ease(q)); st.ball.z = lerp(plan.shot.to[1], gk.z, 0.6 * SC.ease(q)); st.ball.h = Math.max(0.3, plan.shot.to[2] * (1 - q)); }
            if (!act.done2 && q > 0.9 && gk) { act.done2 = true; giveCarrier(gk); }
          } else {
            const tg = plan.shot.to, back = SC.goalX(plan.side) < L / 2 ? -1 : 1;
            st.ball.x = tg[0] + back * 5 * SC.ease(q); st.ball.z = tg[1] + (tg[1] < SC.CZ ? -2 : 2) * q; st.ball.h = Math.max(0, tg[2] * (1 - q));
            if (!act.done2 && q > 0.92 && gk) { act.done2 = true; giveCarrier(gk); }
          }
        }
        if (act.scored && st.ball) { /* الاحتفال يُدار في celebrate */ }
      },
      end() {
        if (!act.revealed) { act.revealed = true; rev++; }
        st.ents.forEach((e) => { e.script = null; e.dive = null; e.__df = null; e.celeb = null; });
        if (o.outcome === 'goal') { const c = st.ents.filter((e) => e.side !== plan.side && !e.gk && !e.leaving).sort((a, b) => Math.abs(a.base[0] - L / 2) - Math.abs(b.base[0] - L / 2))[0]; st.ball.x = L / 2; st.ball.z = SC.CZ; st.ball.h = 0; if (c) giveBall(c); }
        else if (!st.ball.carrier) { giveBall(gk || kickoffPlayer(plan.side === 'h' ? 'a' : 'h')); }
        st.ball.anim = null;
      }
    };
    return act;
  }
  function giveCarrier(e) { st.ball.carrier = e.id; st.poss.side = e.side; }
  // احتفال متنوع: 5 أنواع تُختار حتميًا من اللاعب والمباراة وعدد أهداف المباراة (لا تستهلك عشوائية اللعبة)
  function celebrate(plan, quick) {
    const sh = st.byId[plan.shot.id]; if (!sh) return;
    const gx = SC.goalX(plan.side), toGoal = gx < L / 2 ? -1 : 1, kit = st.kits[plan.side];
    st.excite = 1; st.shake = 1; st.flareCol = kit.shirt; st.celebN++;
    if (!quick) {
      const kind = plan.force || CELEBS[SC.hash(String(plan.shot.id) + ':' + st.mid + ':' + st.celebN) % CELEBS.length];
      st.celebKind = kind; st.celebUntil = st.t + 3.6; st.celebId = sh.id; sh.celeb = true;
      const cornerZ = sh.z < SC.CZ ? 5 : W - 5, tx = clamp(gx - toGoal * 8, 4, L - 4);
      const mates = st.ents.filter((e) => e.side === plan.side && e.id !== sh.id && !e.gk && !e.leaving && SC.dist([e.x, e.z], [sh.x, sh.z]) < 44);
      const go = (e, t) => { e.script = Object.assign({ until: 0 }, t); };
      if (kind === 'corner') {            // يجري نحو راية الركنية ويفتح ذراعيه والزملاء يلحقون به
        go(sh, { tx, tz: cornerZ, sp: 7.5, run: 'arms', pose: 'arms' });
        mates.forEach((e) => go(e, { tx: tx - toGoal * 3 + (st.rnd() - 0.5) * 5, tz: cornerZ + (cornerZ < SC.CZ ? 1 : -1) * (2 + st.rnd() * 5), sp: 6, pose: 'jump' }));
      } else if (kind === 'slide') {      // انزلاق على الركبتين على العشب مع غبار
        const ex = clamp(sh.x + toGoal * 3, 6, L - 6);
        go(sh, { tx: ex, tz: clamp(sh.z + (sh.z < SC.CZ ? -9 : 9), 5, W - 5), sp: 8.2, run: 'arms', pose: 'slide' });
        mates.forEach((e) => go(e, { tx: ex - toGoal * (4 + st.rnd() * 3), tz: sh.z + (st.rnd() - 0.5) * 12, sp: 6.4, pose: 'jump' }));
      } else if (kind === 'fans') {       // يجري على خط التماس نحو الجماهير ذراعاه مفتوحتان
        go(sh, { tx: clamp(sh.x - toGoal * 14, 8, L - 8), tz: W - 3.5, sp: 7.8, run: 'arms', pose: 'arms' });
        mates.forEach((e, i) => go(e, { tx: clamp(sh.x - toGoal * (10 + i * 2.4), 8, L - 8), tz: W - 7 - (i % 3) * 2, sp: 6.2, pose: 'arms' }));
      } else if (kind === 'hug') {        // عناق جماعي مكدّس عند نقطة التسجيل
        go(sh, { tx: sh.x, tz: sh.z, sp: 1, pose: 'jump' });
        mates.forEach((e, i) => { const ang = (i / Math.max(1, mates.length)) * 6.28; go(e, { tx: sh.x + Math.cos(ang) * 2.2, tz: sh.z + Math.sin(ang) * 2.2, sp: 7, pose: 'jump' }); });
      } else {                            // يركع ويشير للسماء والزملاء يحيطون به
        const kx = clamp(sh.x - toGoal * 12, 8, L - 8);
        go(sh, { tx: kx, tz: SC.CZ + (sh.z - SC.CZ) * 0.5, sp: 7, run: 'arms', pose: 'kneel' });
        mates.forEach((e, i) => { const ang = (i / Math.max(1, mates.length)) * 6.28; go(e, { tx: kx + Math.cos(ang) * 3.2, tz: SC.CZ + (sh.z - SC.CZ) * 0.5 + Math.sin(ang) * 3.2, sp: 6.6, pose: 'hug' }); });
      }
    }
    for (let i = 0; i < (st.q ? 46 : 18); i++) st.particles.push({ x: st.rnd(), y: -0.1 - st.rnd() * 0.2, vx: (st.rnd() - 0.5) * 0.15, vy: 0.22 + st.rnd() * 0.3, r: st.rnd() * 6, vr: (st.rnd() - 0.5) * 9, c: i % 3 === 0 ? kit.shirt : i % 3 === 1 ? kit.trim : '#fff', t: 0, life: 1.8 + st.rnd() });
    st.flashes.push({ kind: 'goal', t: 0 });
  }
  function makeReplay(m, plan, o, snap, gk) {
    const act = makeAttack(m, plan, Object.assign({}, o, { blocking: true, idx: null }), snap, gk, 1.7);
    const baseStart = act.start, baseEnd = act.end;
    act.k = 'replay'; act.skippable = true; act.revealed = true;
    act.start = function () {
      act.saved = st.ents.map((e) => ({ e, x: e.x, z: e.z })); act.savedBall = Object.assign({}, st.ball); act.savedCam = st.cam.mode;
      snap.forEach((s) => { const e = st.byId[s.id]; if (e) { e.x = s.x; e.z = s.z; e.vx = e.vz = 0; e.script = null; } });
      st.cam.mode = st.cam.mode === 'top' ? 'top' : 'follow'; st.replayCam = true; setTag('إعادة ▶ بطيئة'); st.particles.length = 0;
      baseStart();
    };
    act.end = function () {
      st.net.h = st.net.a = 0; baseEnd(); setTag(''); st.replayCam = false; st.cam.mode = act.savedCam || 'tv';
      act.saved.forEach((s) => { s.e.x = s.x; s.e.z = s.z; }); st.net.h = st.net.a = 0;
      st.ball.x = L / 2; st.ball.z = SC.CZ; st.ball.h = 0; st.ball.anim = null; st.particles.length = 0;
    };
    return act;
  }

  // قرار تفاعلي: لاعبك يمسك الكرة والكاميرا قريبة منه
  function focusUser(m) {
    const u = st.byId[st.uid]; if (!u || m.side !== u.side) return;
    if (!st.cur) { st.ball.carrier = u.id; st.poss.side = u.side; }
  }

  // ---------- الحلقة ----------
  function loop(now) {
    if (!st) return;
    if (!st.canvas.isConnected) { S.destroy(); return; }
    st.raf = requestAnimationFrame(loop);
    if (document.hidden) { st.last = now; return; }
    const minDt = st.q <= 0 ? 33 : 0;
    if (now - st.last < minDt) return;
    let dt = (now - st.last) / 1000; const gap = now - st.last; st.last = now; dt = clamp(dt, 0, 0.05);
    const paused = !!(UI.mv && UI.mv.paused);
    if (!paused && gap < 400) { st.fi.push(gap); if (st.fi.length > 300) st.fi.shift(); }   // الفاصل الحقيقي بين الإطارات → fps
    const t0 = performance.now();
    if (paused) st.prog = t0;
    try { if (!paused) step(dt); draw(); st.errs = 0; }
    catch (e) {
      G.lastError = { label: 'stadium', msg: String(e && e.message || e) };
      if (++st.errs >= 3) { const h = st.host; S.destroy(); if (h) { h.innerHTML = ''; h.hidden = true; } rev++; return; } // الملعب المرئي زينة: نسقطه ولا نوقف المباراة
    }
    const ms = performance.now() - t0;
    st.ft.push(ms); if (st.ft.length > 60) st.ft.shift(); st.frames++;
    if (st.frames % 60 === 0 && st.q > 0 && st.ft.length >= 60) { const avg = st.ft.reduce((a, b) => a + b, 0) / 60; if (avg > 11) { st.q = 0; st.qDrop = true; resize(); } }
  }

  function step(dt) {
    st.t += dt;
    const spdMul = clamp(st.spd || 1, 1, 1.8);
    // الأكشن الحالي
    if (st.skip) { st.skip = false; if (st.cur) st.cur.t = st.cur.dur; else st.queue = []; }
    if (!st.cur && st.queue.length) { st.cur = st.queue.shift(); st.cur.t = 0; st.prog = performance.now(); if (st.cur.start) st.cur.start(); }
    if (st.cur) {
      st.cur.t += dt * (st.cur.replay ? 1 : spdMul);
      st.cur.update && st.cur.update(clamp(st.cur.t / st.cur.dur, 0, 1), dt);
      if (st.cur.t >= st.cur.dur) { st.cur.end && st.cur.end(); st.cur = null; st.prog = performance.now(); rev++; }
    }
    // اللاعبون
    const ball = st.ball, dirB = ball.x;
    const carrier = ball.carrier ? st.byId[ball.carrier] : null;
    for (const e of st.ents) moveEnt(e, dt, carrier);
    moveRef(dt);
    // الكرة العامة (تمريرات هادئة) حين لا يوجد مشهد
    if (!st.cur) ambientBall(dt, carrier);
    else if (carrier && ball.carrier && !ball.anim) { ball.x = carrier.x; ball.z = carrier.z; ball.h = 0; }
    // أخرى
    ['h', 'a'].forEach((s) => { st.net[s] = Math.max(0, st.net[s] - dt * 0.8); });
    st.excite = Math.max(0.12, st.excite - dt * 0.28); st.shake = Math.max(0, st.shake - dt * 1.7);
    if (st.subT > 0 && (st.subT -= dt) <= 0 && st.subEl) st.subEl.hidden = true;
    st.dust = st.dust.filter((d) => (d.t += dt) < d.life); st.dust.forEach((d) => { d.x += d.vx * dt; d.z += d.vz * dt; });
    // أثر الكرة وزاوية دورانها (للتسديدات السريعة)
    const bsp = st.pb ? Math.hypot(ball.x - st.pb[0], ball.z - st.pb[1]) / Math.max(dt, 1e-3) : 0; st.pb = [ball.x, ball.z];
    st.bsp = lerp(st.bsp || 0, bsp, 0.35); st.bspin += st.bsp * dt * 0.9;
    if (st.bsp > 13 && st.q > 0) { st.trail.push([ball.x, ball.z, ball.h]); if (st.trail.length > 8) st.trail.shift(); } else if (st.trail.length) st.trail.shift();
    if (st.rain && st.q > 0) { if (!st.drops.length) for (let i = 0; i < 110; i++) st.drops.push({ x: st.rnd(), y: st.rnd(), v: 1.1 + st.rnd() * 0.7, l: 0.02 + st.rnd() * 0.03 }); st.drops.forEach((d) => { d.y += d.v * dt; d.x -= d.v * dt * 0.12; if (d.y > 1.02) { d.y = -0.05; d.x = st.rnd() * 1.1; } }); }
    st.particles = st.particles.filter((p) => (p.t += dt) < p.life);
    st.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; });
    st.flashes = st.flashes.filter((f) => (f.t += dt) < 1.2);
    st.cards = st.cards.filter((c) => (c.t += dt) < 2.2);
    cameraStep(dt);
  }

  function moveEnt(e, dt, carrier) {
    if (e.dive) { const k = SC.ease(clamp(e.dive.q, 0, 1)); e.x = lerp(e.dive.from[0], e.dive.to[0], k * 0.6); e.z = lerp(e.dive.from[1], e.dive.to[1], k); e.vx = e.vz = 0; return; }
    // وضعيات الاحتفال: «جارٍ» أثناء الجري، و«عند الوصول» حين يبلغ هدفه
    const np = e.script ? (e.script.pose && Math.hypot(e.script.tx - e.x, e.script.tz - e.z) < 1.6 ? e.script.pose : (e.script.run || null)) : null;
    if (np !== e.pose) { e.pose = np; e.poseT = 0; }   // الزمن يُعاد عند تغيّر الوضعية (غبار الانزلاق يبدأ لحظة الانزلاق)
    if (np) e.poseT += dt;
    if (e.pose === 'slide' && st.q > 0 && e.poseT < 0.9 && st.dust.length < 70 && Math.floor(e.poseT * 30) !== Math.floor((e.poseT - dt) * 30)) st.dust.push({ x: e.x, z: e.z, vx: (st.rnd() - 0.5) * 3, vz: (st.rnd() - 0.5) * 2, t: 0, life: 0.7 + st.rnd() * 0.3 });
    const amb = !e.script && !e.leaving && !e.enter;
    let tx, tz, sp;
    if (e.script) { tx = e.script.tx; tz = e.script.tz; sp = e.script.sp; }
    else if (e.leaving) { tx = e.base[0]; tz = e.base[1]; sp = 3; if (Math.abs(e.z - e.base[1]) < 0.6) e.gone = true; }
    else if (e.enter) { tx = e.base[0]; tz = e.base[1]; sp = 3.2; if (Math.hypot(e.x - tx, e.z - tz) < 1.2) e.enter = false; }
    else if (st.pend && !st.cur) { tx = e.x; tz = e.z; sp = 0; }
    else {
      const posses = st.poss.side === e.side, d = SC.dir(e.side);
      const lf = e.gk ? 0.04 : e.slot === 'CB' || e.slot === 'LB' || e.slot === 'RB' ? 0.62 : e.slot === 'ST' || e.slot === 'LW' || e.slot === 'RW' ? 1.05 : 0.9;
      const shift = ((posses ? 10 : -4) * d + (st.ball.x - L / 2) * 0.26) * lf;
      tx = e.base[0] + shift + Math.sin(st.t * 0.6 + e.ph) * 1.6;
      tz = e.base[1] + (st.ball.z - SC.CZ) * 0.14 * (e.gk ? 0.2 : 1) + Math.cos(st.t * 0.5 + e.ph * 1.3) * 1.4;
      if (carrier && carrier.id === e.id) { tx += d * 5; tz += Math.sin(st.t * 2.3 + e.ph) * 1.9; } // حامل الكرة يتلوّى (مراوغة بصرية) بدل خط مستقيم
      if (!e.gk && !posses) { // الأقرب للكرة يضغط عليها
        const dd = Math.hypot(e.x - st.ball.x, e.z - st.ball.z);
        if (dd < 17) { tx = lerp(tx, st.ball.x, 0.5); tz = lerp(tz, st.ball.z, 0.5); }
      }
      tx = clamp(tx, e.gk ? Math.min(SC.ownGoalX(e.side), L / 2) + 0 : 2, L - 2); tz = clamp(tz, 3, W - 3);
      if (e.gk) { const gx = SC.ownGoalX(e.side), back = gx < L / 2 ? 1 : -1; tx = gx + back * clamp(2.5 + Math.abs(st.ball.x - gx) * 0.06, 2.5, 9); }
      sp = e.gk ? 3 : 5.4;
    }
    const dx = tx - e.x, dz = tz - e.z, dist = Math.hypot(dx, dz), pvx = e.vx, pvz = e.vz;
    if (amb && dt > 0) {
      // حركة حرّة: تسارع/تباطؤ محدودان وتقترب بنعومة (arrive) بدل سرعة ثابتة ثم توقّف حادّ — فتظهر الانعطافات والتوقفات طبيعية
      const want = Math.min(sp, dist * 2.4), wvx = dist > 0.01 ? dx / dist * want : 0, wvz = dist > 0.01 ? dz / dist * want : 0, acc = (e.gk ? 6 : 9.5) * dt;
      e.vx += clamp(wvx - e.vx, -acc, acc); e.vz += clamp(wvz - e.vz, -acc, acc);
      e.x += e.vx * dt; e.z += e.vz * dt;
    } else {
      // حركة مُسيَّرة (هجمات واحتفالات): تضمن الوصول في توقيتها
      const step = Math.min(dist, sp * dt * 1.0);
      let vx = 0, vz = 0;
      if (dist > 0.01 && sp > 0) { vx = dx / dist * step / Math.max(dt, 1e-3); vz = dz / dist * step / Math.max(dt, 1e-3); e.x += dx / dist * step; e.z += dz / dist * step; }
      e.vx = lerp(e.vx, vx, 0.25); e.vz = lerp(e.vz, vz, 0.25);
    }
    if (dt > 0) e.ax = lerp(e.ax || 0, ((e.vx - pvx) * (e.vx >= 0 ? 1 : -1)) / dt, 0.18); // تسارع على محور الحركة (يميل الجسم به)
    e.ph += dt * (3 + Math.hypot(e.vx, e.vz) * 1.4);
    if (e.script && dist < 0.6) { e.script.until = (e.script.until || 0) + dt; }
    if (e.gone) { st.ents = st.ents.filter((x) => x !== e); delete st.byId[e.id]; }
  }
  function moveRef(dt) {
    const r = st.ref; if (!r) return;
    const tx = clamp(lerp(L / 2, st.ball.x, 0.8) + 5, 8, L - 8), tz = clamp(st.ball.z + 9, 8, W - 3);
    const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz), s = Math.min(d, 4.6 * dt);
    if (d > 0.01) { r.x += dx / d * s; r.z += dz / d * s; r.vx = dx / d * 4; r.vz = dz / d * 4; } else { r.vx *= 0.8; r.vz *= 0.8; }
    r.ph += dt * (3 + Math.hypot(r.vx, r.vz));
  }
  function ambientBall(dt, carrier) {
    const b = st.ball;
    if (st.pend) { if (carrier) { b.x = carrier.x; b.z = carrier.z; b.h = 0; } return; }
    if (b.anim) {
      const a = b.anim; a.t += dt; const q = clamp(a.t / a.dur, 0, 1), e = SC.ease(q);
      b.x = lerp(a.fx, a.tx, e); b.z = lerp(a.fz, a.tz, e); b.h = 4 * a.h * q * (1 - q);
      if (q >= 1) { b.anim = null; if (a.to && st.byId[a.to]) giveCarrier(st.byId[a.to]); }
      return;
    }
    if (!carrier) return;
    b.x = carrier.x + Math.sign(carrier.vx || 0) * 0.5; b.z = carrier.z; b.h = Math.abs(Math.sin(st.t * 9 + carrier.ph)) * 0.12;
    st.poss.next -= dt * clamp(st.spd || 1, 1, 1.8);
    if (st.poss.next > 0) return;
    st.poss.next = 0.8 + st.rnd() * 1.1;
    // نقرّر الاستحواذ مع ميل المحرك (pBias): احتمال بقاء/انتقال الكرة
    let side = carrier.side;
    if (st.rnd() < 0.16) side = st.rnd() < (st.pBias) ? 'h' : 'a';
    const mates = st.ents.filter((e) => e.side === side && e.id !== carrier.id && !e.gk && !e.leaving);
    if (!mates.length) return;
    const d = SC.dir(side);
    const wts = mates.map((e) => { const dd = Math.hypot(e.x - carrier.x, e.z - carrier.z); return (dd > 6 && dd < 30 ? 1 : 0.15) * (1 + 0.6 * clamp(((e.x - carrier.x) * d) / 20, -1, 1)); });
    let r = st.rnd() * wts.reduce((a, c) => a + c, 0), i = 0; while (i < mates.length - 1 && (r -= wts[i]) > 0) i++;
    const to = mates[i];
    const dist = Math.hypot(to.x - carrier.x, to.z - carrier.z);
    b.anim = { fx: b.x, fz: b.z, tx: to.x + d * 1.5, tz: to.z, dur: clamp(0.22 + dist / 26, 0.3, 1.1) / clamp(st.spd || 1, 1, 1.8), a: 0, t: 0, h: clamp(dist / 50, 0.05, 0.8), to: to.id };
    to.script = null;
    carrier.passed = st.t;
    if (side !== carrier.side) st.poss.side = side;
  }

  function cameraStep(dt) {
    const c = st.cam, T = st.camT, b = st.ball;
    let mode = c.mode;
    if (st.pend && mode === 'tv') mode = 'follow';
    const u = st.pend ? st.byId[st.uid] : null;
    if (mode === 'follow') {
      const fx = u ? u.x : b.x, fz = u ? u.z : b.z;
      T.zoom = 1.75; T.cx = clamp(fx, L / 2 - 38, L / 2 + 38); T.cz = clamp(fz, SC.CZ - 14, SC.CZ + 14);
    } else if (mode === 'top') { T.zoom = 1; T.cx = L / 2; T.cz = SC.CZ; }
    else { T.zoom = 1; T.cx = L / 2 + (b.x - L / 2) * 0.06; T.cz = SC.CZ; }
    // تصوير الاحتفال: تقريب وتتبّع للمسجّل (كاميرا البث فقط)
    const cel = mode === 'tv' && st.celebUntil > st.t && st.celebId ? st.byId[st.celebId] : null;
    if (cel) { T.zoom = 1.42; T.cx = clamp(cel.x, L / 2 - 40, L / 2 + 40); T.cz = clamp(cel.z, SC.CZ - 15, SC.CZ + 15); }
    const k = 1 - Math.pow(cel ? 0.02 : 0.0015, dt);
    c.zoom = lerp(c.zoom, T.zoom, k); c.cx = lerp(c.cx, T.cx, k); c.cz = lerp(c.cz, T.cz, k);
    c.eff = mode;
  }

  // ---------- الرسم ----------
  function P(x, z, up) { const c = st.cam; return SC.project({ mode: c.mode === 'top' ? 'top' : 'tv', zoom: c.zoom, cx: c.cx, cz: c.cz }, st.W, st.H, x, z, up); }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  function line(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); }
  function arcPts(cx, cz, r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return o; }

  function makeCrowd() {
    const w = Math.round(st.W * 1.5), h = Math.round(st.H * 0.34), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#050913'); gr.addColorStop(1, '#101a33'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = SC.rng(SC.hash('crowd' + st.mid)); const cols = [st.kits.h.shirt, st.kits.a.shirt, '#d9dfef', '#8d99b8', '#2d3b63', '#e8c76a'];
    for (let row = 0; row < 7; row++) {
      const y = h * (0.08 + row * 0.13), dim = 0.55 + row * 0.06;
      for (let x = 0; x < w; x += 3.2) { if (r() < 0.82) { g.globalAlpha = dim * (0.45 + r() * 0.5); g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x + r() * 2, y + r() * 3, 2.2, 2.6); } }
    }
    g.globalAlpha = 1;
    const rail = g.createLinearGradient(0, h * 0.8, 0, h); rail.addColorStop(0, 'rgba(5,9,19,0)'); rail.addColorStop(1, 'rgba(5,9,19,.85)'); g.fillStyle = rail; g.fillRect(0, h * 0.8, w, h * 0.2);
    return cv;
  }
  function makeGrass() {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; const g = cv.getContext('2d'); const r = SC.rng(11);
    for (let i = 0; i < 520; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.fillRect(r() * 96, r() * 96, 1 + r() * 1.4, 1 + r() * 3); }
    return st.ctx.createPattern(cv, 'repeat');
  }

  function draw() {
    const ctx = st.ctx, w = st.W, h = st.H, cam = st.cam, top = cam.mode === 'top';
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const night = st.tod === 0 ? 1 : st.tod === 1 ? 0.65 : 0.12; // 0 ليل، 1 غروب، 2 نهار (تلوين بصري فقط)
    // اهتزاز خفيف عند الأهداف
    if (st.shake > 0.02 && !st.reduce) ctx.translate(Math.sin(st.t * 71) * st.shake * 3.2, Math.cos(st.t * 83) * st.shake * 2.4);
    // 1) المدرجات والإضاءة الخلفية
    if (!top) {
      if (!st.crowd) st.crowd = makeCrowd();
      const far = P(L / 2, 0)[1], ch = Math.max(24, far + 6);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, ch); ctx.clip();
      ctx.fillStyle = st.tod === 2 ? '#26334f' : st.tod === 1 ? '#1d1f3a' : '#060a16'; ctx.fillRect(0, 0, w, ch);
      const ox = -((cam.cx - L / 2) * 0.35 * cam.zoom) - (st.crowd.width - w) / 2, cw = st.crowd.width, chh = st.crowd.height, y0 = ch - chh * 0.98;
      // الجمهور يتحرك: كل صفّ يقفز بتأخّر موجي ويشتدّ عند الأهداف (st.excite)
      for (let r = 0; r < 7; r++) {
        const sy0 = r === 0 ? 0 : chh * (0.05 + r * 0.13), sy1 = r === 6 ? chh : chh * (0.05 + (r + 1) * 0.13);
        const jump = st.q > 0 && !st.reduce ? st.excite * (1.2 + r * 0.45) * Math.abs(Math.sin(st.t * 7.5 + r * 0.9 + (r % 2) * 0.6)) : 0;
        ctx.drawImage(st.crowd, 0, sy0, cw, sy1 - sy0, ox, y0 + sy0 - jump, cw, sy1 - sy0);
      }
      if (st.tod === 2) { ctx.fillStyle = 'rgba(190,210,245,.18)'; ctx.fillRect(0, 0, w, ch); }
      if (st.q > 0 && !st.reduce) {
        // موجة جماهيرية تعبر المدرج + وميض هواتف/كاميرات
        const wx = (((st.t * 0.13) % 1.5) - 0.25) * w, wg = ctx.createLinearGradient(wx - w * 0.14, 0, wx + w * 0.14, 0);
        wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(0.5, 'rgba(255,255,255,' + (0.06 + st.excite * 0.07).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = wg; ctx.fillRect(0, 0, w, ch);
        const rr = SC.rng(Math.floor(st.t * 5) + 7); ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (let i = 0; i < 14; i++) { const fx = rr() * w, fy = rr() * ch * 0.8; if (rr() < 0.5) ctx.fillRect(fx, fy, 1.6, 1.6); }
        // مشاعل بلون الفريق المسجِّل
        if (st.flareCol && st.excite > 0.35) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const fx = w * (0.12 + i * 0.19), g2 = ctx.createRadialGradient(fx, ch * 0.7, 0, fx, ch * 0.7, ch * 0.55); g2.addColorStop(0, st.flareCol); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = (st.excite - 0.3) * 0.22; ctx.fillStyle = g2; ctx.fillRect(fx - ch, 0, ch * 2, ch); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(5,9,19,' + (0.28 * night).toFixed(3) + ')'; ctx.fillRect(0, 0, w, ch * 0.55);
      if (st.tod === 1) { const sg = ctx.createLinearGradient(0, 0, 0, ch); sg.addColorStop(0, 'rgba(255,128,72,.26)'); sg.addColorStop(1, 'rgba(255,128,72,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, w, ch); }
      // أبراج الإضاءة: توهّج وأقماع ضوء تهبط على الملعب
      if (night > 0.3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        [0.07, 0.93].forEach((fx) => {
          const x = w * fx, gl = ctx.createRadialGradient(x, ch * 0.16, 0, x, ch * 0.16, ch * 0.7); gl.addColorStop(0, 'rgba(255,250,225,' + (0.55 * night).toFixed(3) + ')'); gl.addColorStop(0.25, 'rgba(255,244,210,' + (0.18 * night).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,244,210,0)');
          ctx.fillStyle = gl; ctx.fillRect(x - ch, 0, ch * 2, ch * 1.6);
        });
        ctx.restore();
      }
    } else { ctx.fillStyle = '#0a1226'; ctx.fillRect(0, 0, w, h); }
    // 2) أرض خارج الملعب
    const g0 = ctx.createLinearGradient(0, top ? 0 : P(L / 2, 0)[1] - 4, 0, h);
    g0.addColorStop(0, '#16341f'); g0.addColorStop(1, '#0d2415'); ctx.fillStyle = g0; ctx.fillRect(0, top ? 0 : P(L / 2, 0)[1] - 4, w, h);
    // لوحات الإعلانات (ألوان الناديين بلا نصوص)
    if (!top) {
      const N = 10; for (let i = 0; i < N; i++) {
        const x0 = (L / N) * i, x1 = (L / N) * (i + 1), a = P(x0 - 4, -1.6, 0), b = P(x1 - 4, -1.6, 0), a2 = P(x0 - 4, -1.6, 1.15), b2 = P(x1 - 4, -1.6, 1.15);
        ctx.fillStyle = i % 3 === 0 ? st.kits.h.shirt : i % 3 === 1 ? '#1b2748' : st.kits.a.shirt; ctx.globalAlpha = 0.9;
        poly(ctx, [a, b, b2, a2]); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    // 3) الملعب: خطوط قصّ
    const stripes = 14, c1 = st.tod === 2 ? '#3aa04b' : st.tod === 1 ? '#2c8a3d' : '#2f8f40', c2 = st.tod === 2 ? '#2f8c3f' : st.tod === 1 ? '#25783a' : '#287c37';
    for (let i = 0; i < stripes; i++) {
      const x0 = (L / stripes) * i, x1 = (L / stripes) * (i + 1);
      const q = [P(x0, 0), P(x1, 0), P(x1, W), P(x0, W)];
      ctx.fillStyle = i % 2 ? c1 : c2; poly(ctx, q); ctx.fill(); ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = 0.7; ctx.stroke();
    }
    // 4) خطوط الملعب
    const s0 = P(L / 2, W)[2], lw = clamp(s0 * 0.16, 0.8, 2.4);
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    const seg = (a, b) => { line(ctx, [P(a[0], a[1]), P(b[0], b[1])]); ctx.stroke(); };
    line(ctx, [P(0, 0), P(L, 0), P(L, W), P(0, W), P(0, 0)]); ctx.stroke();
    seg([L / 2, 0], [L / 2, W]);
    line(ctx, arcPts(L / 2, SC.CZ, 9.15, 0, Math.PI * 2, 40).map((p) => P(p[0], p[1]))); ctx.stroke();
    [0, 1].forEach((i) => {
      const sgn = i ? -1 : 1, x0 = i ? L : 0, pa = 16.5 * sgn, ga = 5.5 * sgn, z0 = SC.CZ - 20.16, z1 = SC.CZ + 20.16, gz0 = SC.CZ - 9.16, gz1 = SC.CZ + 9.16;
      line(ctx, [P(x0, z0), P(x0 + pa, z0), P(x0 + pa, z1), P(x0, z1)]); ctx.stroke();
      line(ctx, [P(x0, gz0), P(x0 + ga, gz0), P(x0 + ga, gz1), P(x0, gz1)]); ctx.stroke();
      const sp = P(x0 + 11 * sgn, SC.CZ); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(sp[0], sp[1], Math.max(1, lw * 0.9), 0, 6.3); ctx.fill();
      const a0 = i ? Math.PI - 0.93 : -0.93, a1 = i ? Math.PI + 0.93 : 0.93;
      line(ctx, arcPts(x0 + 11 * sgn, SC.CZ, 9.15, a0, a1, 18).map((p) => P(p[0], p[1]))); ctx.stroke();
    });
    // 5) إضاءة ملاعب وتظليل (فوق العشب وتحت اللاعبين)
    const cx0 = w / 2, cy0 = h * 0.62, rg = ctx.createRadialGradient(cx0, cy0, h * 0.1, cx0, cy0, w * 0.78);
    rg.addColorStop(0, 'rgba(255,255,230,' + (0.16 * (0.5 + night * 0.5)).toFixed(3) + ')'); rg.addColorStop(0.55, 'rgba(255,255,230,0)'); rg.addColorStop(1, 'rgba(2,6,14,' + (0.12 + 0.38 * night).toFixed(3) + ')');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    if (!top && night > 0.3 && st.q > 0) { // بقعة ضوء دافئة تتبع الكرة على العشب
      const bp = P(st.ball.x, st.ball.z); const pg = ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], bp[2] * 15); pg.addColorStop(0, 'rgba(255,250,214,' + (0.11 * night).toFixed(3) + ')'); pg.addColorStop(1, 'rgba(255,250,214,0)');
      ctx.fillStyle = pg; ctx.fillRect(bp[0] - bp[2] * 15, bp[1] - bp[2] * 8, bp[2] * 30, bp[2] * 16);
    }
    if (!top) { const hz = ctx.createLinearGradient(0, P(L / 2, 0)[1], 0, P(L / 2, 0)[1] + h * 0.2); hz.addColorStop(0, 'rgba(8,16,32,.5)'); hz.addColorStop(1, 'rgba(8,16,32,0)'); ctx.fillStyle = hz; ctx.fillRect(0, P(L / 2, 0)[1], w, h * 0.2); }
    if (st.q > 0) { if (!st.grass) st.grass = makeGrass(); ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = st.grass; ctx.fillRect(0, top ? 0 : P(L / 2, 0)[1], w, h); ctx.restore(); }
    // 6) المرميان (الشباك خلف الخط + العارضة)
    drawGoal(ctx, 0, 'a'); drawGoal(ctx, 1, 'h');
    // 7) اللاعبون والكرة مرتبون بالعمق
    const draws = [];
    st.ents.forEach((e) => draws.push({ z: e.z, f: () => drawPlayer(ctx, e) }));
    if (st.ref) draws.push({ z: st.ref.z, f: () => drawPlayer(ctx, st.ref, true) });
    draws.push({ z: st.ball.z + 0.01, f: () => drawBall(ctx) });
    draws.sort((a, b) => a.z - b.z);
    // ظلال أولًا
    st.ents.forEach((e) => { if (e.pose !== 'slide') shadow(ctx, e.x, e.z, 0.7, e.pose === 'jump' ? Math.abs(Math.sin((e.poseT || 0) * 7)) : 0); else shadow(ctx, e.x, e.z, 1.3, 0); });
    if (st.ref) shadow(ctx, st.ref.x, st.ref.z, 0.7, 0);
    // غبار الانزلاق
    st.dust.forEach((d) => { const q = d.t / d.life, p = P(d.x, d.z), r = p[2] * (0.45 + q * 1.1); ctx.fillStyle = 'rgba(196,178,140,' + (0.42 * (1 - q)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1] - r * 0.4 - q * 8, r, 0, 6.3); ctx.fill(); });
    draws.forEach((d) => d.f());
    // 8) بطاقات وتأثيرات
    drawCards(ctx);
    drawFx(ctx);
  }

  // ظل اتجاهي: يميل مع اتجاه الإضاءة (ليلًا من أبراج الزوايا: ظلّ قصير ثنائي، نهارًا ظلّ أطول مائل) ويصغر مع ارتفاع القافز
  function shadow(ctx, x, z, r, lift) {
    const p = P(x, z), k = 1 - (lift || 0) * 0.35, off = st.tod === 2 ? p[2] * 0.75 : p[2] * 0.3;
    ctx.fillStyle = 'rgba(0,0,0,' + ((st.tod === 2 ? 0.36 : 0.3) * k).toFixed(3) + ')'; ctx.beginPath();
    ctx.ellipse(p[0] + off, p[1] + p[2] * 0.05, p[2] * r * (st.tod === 2 ? 1.6 : 1.35) * k, p[2] * r * 0.5 * k, st.tod === 2 ? -0.06 : 0, 0, 6.3); ctx.fill();
  }

  function drawGoal(ctx, i, defSide) {
    const x0 = i ? L : 0, back = i ? 1 : -1, mouth = SC.GOAL_W / 2, z0 = SC.CZ - mouth, z1 = SC.CZ + mouth, depth = 2.1, hh = 2.44;
    const rip = st.net[i ? 'h' : 'a'] || 0;
    // الشباك: شبكة خطوط خلف الخط
    ctx.save(); ctx.strokeStyle = 'rgba(235,242,255,.34)'; ctx.lineWidth = 0.6;
    const sway = Math.sin(st.t * 18) * rip * 0.6;
    for (let k = 0; k <= 8; k++) { const zz = lerp(z0, z1, k / 8); line(ctx, [P(x0, zz, hh), P(x0 + back * (depth + sway), zz, hh * 0.6)]); ctx.stroke(); line(ctx, [P(x0 + back * (depth + sway), zz, hh * 0.6), P(x0 + back * (depth + sway), zz, 0)]); ctx.stroke(); }
    for (let k = 0; k <= 5; k++) { const hz = (hh * k) / 5; line(ctx, [P(x0 + back * (depth + sway), z0, hz * 0.7), P(x0 + back * (depth + sway), z1, hz * 0.7)]); ctx.stroke(); }
    line(ctx, [P(x0, z0, hh), P(x0 + back * (depth + sway), z0, hh * 0.6), P(x0 + back * (depth + sway), z0, 0)]); ctx.stroke();
    line(ctx, [P(x0, z1, hh), P(x0 + back * (depth + sway), z1, hh * 0.6), P(x0 + back * (depth + sway), z1, 0)]); ctx.stroke();
    ctx.restore();
    // القائمان والعارضة
    ctx.strokeStyle = '#f5f8ff'; ctx.lineWidth = clamp(P(x0, SC.CZ)[2] * 0.12, 1, 2.6); ctx.lineCap = 'round';
    line(ctx, [P(x0, z0, 0), P(x0, z0, hh), P(x0, z1, hh), P(x0, z1, 0)]); ctx.stroke(); ctx.lineCap = 'butt';
  }

  const lumCache = {};
  function ink(hex) { // لون رقم القميص: أسود/أبيض حسب سطوع القميص
    if (lumCache[hex]) return lumCache[hex];
    let c = '#fff'; const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (m) { const v = parseInt(m[1], 16), l = 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255); c = l > 150 ? '#0d1220' : '#ffffff'; }
    return (lumCache[hex] = c);
  }
  function limb(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  // نموذج لاعب v2: وضعيات (جري/انزلاق/ركبة/قفز/ذراعان/عناق) + ميلان بالتسارع + شعر/حذاء/رقم قميص
  function drawPlayer(ctx, e, isRef) {
    const p = P(e.x, e.z), H = clamp(p[2] * 5.7, 10, 38), kit = e.kit || {};
    const moving = Math.hypot(e.vx, e.vz); const face = e.vx > 0.25 ? 1 : e.vx < -0.25 ? -1 : (e.side === 'h' ? -1 : 1);
    const x = p[0], y = p[1], pose = isRef ? null : e.pose, pt = e.poseT || 0, big = H >= 16 && st.q > 0, shirtC = e.gk ? kit.gk : kit.shirt;
    let jy = 0, rot = 0, kneel = 0, armUp = 0, armOut = 0;
    if (pose === 'jump') { jy = -Math.abs(Math.sin(pt * 7 + (e.ph || 0))) * H * 0.34; armUp = 1; }
    else if (pose === 'arms') armUp = 1;
    else if (pose === 'kneel') { kneel = 1; armUp = 0.9; rot = -face * 0.14; }
    else if (pose === 'slide') { kneel = 1; armOut = 1; rot = -face * 0.5; }
    else if (pose === 'hug') { armOut = 1; rot = face * 0.12; }
    ctx.save(); ctx.translate(x, y + jy);
    let lean = 0;
    if (e.dive && st.cam.mode !== 'top') { const dz = e.dive.to[1] - e.dive.from[1]; lean = clamp(dz / 4, -1, 1) * 1.2 * Math.min(1, e.dive.q * 1.6); ctx.rotate(lean * (e.side === 'h' ? 1 : -1)); }
    // ميلان الجسم: للأمام عند التسارع وللخلف عند الكبح (حدّ أقصى صغير)
    if (!pose && !isRef) rot += face * clamp((e.ax || 0) / 26, -0.16, 0.2);
    const sw = Math.sin(e.ph) * clamp(moving / 5, 0, 1) * 0.55, run = clamp(moving / 5, 0, 1);
    const legW = H * 0.13, hipY = -H * (kneel ? 0.27 : 0.42);
    // الساقان
    ctx.lineCap = 'round'; ctx.lineWidth = legW; ctx.strokeStyle = kit.socks || '#fff';
    if (kneel) { // ركبتان على الأرض والساقان خلف الجسم
      limb(ctx, -H * 0.06, hipY, face * H * 0.05, -H * 0.1); limb(ctx, face * H * 0.05, -H * 0.1, -face * H * 0.24, -H * 0.03);
      limb(ctx, H * 0.06, hipY, face * H * 0.12, -H * 0.08); limb(ctx, face * H * 0.12, -H * 0.08, -face * H * 0.16, -H * 0.02);
    } else {
      const k = Math.sin(sw) * H * (0.16 + 0.1 * run) * face;
      limb(ctx, -H * 0.07, hipY, -H * 0.07 + k, -H * 0.04 - Math.max(0, -Math.cos(e.ph)) * run * H * 0.05); limb(ctx, H * 0.07, hipY, H * 0.07 - k, -H * 0.04 - Math.max(0, Math.cos(e.ph)) * run * H * 0.05);
      if (big) { ctx.fillStyle = e.boot || '#10131c'; ctx.beginPath(); ctx.ellipse(-H * 0.07 + k + face * H * 0.03, -H * 0.02, H * 0.075, H * 0.04, 0, 0, 6.3); ctx.ellipse(H * 0.07 - k + face * H * 0.03, -H * 0.02, H * 0.075, H * 0.04, 0, 0, 6.3); ctx.fill(); }
    }
    ctx.save(); ctx.translate(0, hipY); ctx.rotate(rot); ctx.translate(0, -hipY);
    // السروال
    ctx.fillStyle = kit.shorts || '#222'; ctx.fillRect(-H * 0.17, hipY - H * 0.05, H * 0.34, H * 0.19);
    // الجذع (قميص) + ظل جانبي + ياقة + خط الشعار
    const ty = hipY - H * 0.05;
    ctx.fillStyle = shirtC; ctx.beginPath(); roundRect(ctx, -H * 0.19, ty - H * 0.36, H * 0.38, H * 0.4, H * 0.1); ctx.fill();
    if (big) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(face > 0 ? -H * 0.19 : H * 0.07, ty - H * 0.33, H * 0.12, H * 0.34); }
    if (!e.gk && kit.trim && !isRef) { ctx.fillStyle = kit.trim; ctx.globalAlpha = 0.75; ctx.fillRect(-H * 0.19, ty - H * 0.2, H * 0.38, H * 0.06); ctx.globalAlpha = 1; }
    if (big && !isRef) { ctx.fillStyle = kit.trim || 'rgba(255,255,255,.7)'; ctx.globalAlpha = 0.8; ctx.fillRect(-H * 0.06, ty - H * 0.375, H * 0.12, H * 0.04); ctx.globalAlpha = 1; }
    if (H >= 24 && st.q > 0 && !isRef && e.num) { ctx.font = '800 ' + (H * 0.2).toFixed(1) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ink(shirtC); ctx.fillText(String(e.num), 0, ty - H * 0.1); }
    // الذراعان
    ctx.strokeStyle = shirtC; ctx.lineWidth = H * 0.1;
    const w10 = Math.sin(pt * 11) * H * 0.04;
    let lx, ly, rx, ry; const sy = ty - H * 0.3;
    if (armUp) { lx = -H * 0.26 + w10; ly = ty - H * (0.58 + (armUp < 1 ? -0.1 : 0)); rx = H * 0.26 - w10; ry = ly; }
    else if (armOut) { lx = -H * 0.36; ly = ty - H * 0.2; rx = H * 0.36; ry = ty - H * 0.2; }
    else { lx = -H * 0.25 - Math.sin(sw) * H * 0.1 * face; ly = ty - H * 0.08; rx = H * 0.25 + Math.sin(sw) * H * 0.1 * face; ry = ty - H * 0.08; }
    limb(ctx, -H * 0.19, sy, lx, ly); limb(ctx, H * 0.19, sy, rx, ry);
    if (big) { ctx.fillStyle = e.gk ? '#ffd23a' : (e.skin || '#e0ac80'); ctx.beginPath(); ctx.arc(lx, ly, H * 0.055, 0, 6.3); ctx.arc(rx, ry, H * 0.055, 0, 6.3); ctx.fill(); }
    // الرأس + الشعر (5 أنماط)
    const hy = ty - H * 0.47, hr = H * 0.13;
    ctx.fillStyle = e.skin || '#e0ac80'; ctx.beginPath(); ctx.arc(0, hy, hr, 0, 6.3); ctx.fill();
    const hc = isRef ? '#1a1a1a' : (e.hairCol || '#14100c'), hs = isRef ? 1 : (e.hair || 0);
    ctx.fillStyle = hc;
    if (hs === 0) { ctx.beginPath(); ctx.arc(0, hy - H * 0.03, hr, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }            // قصير
    else if (hs === 1) { ctx.beginPath(); ctx.arc(0, hy - H * 0.015, hr, Math.PI * 1.15, Math.PI * 1.85); ctx.fill(); }      // حلاقة خفيفة
    else if (hs === 2) { ctx.beginPath(); ctx.arc(0, hy - H * 0.03, hr * 1.22, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); } // مجعّد كثيف
    else if (hs === 3) { ctx.beginPath(); ctx.arc(0, hy - H * 0.03, hr, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.fillRect(-hr * 1.02, hy - H * 0.02, hr * 0.3, hr * 1.3); ctx.fillRect(hr * 0.72, hy - H * 0.02, hr * 0.3, hr * 1.3); } // طويل
    // hs === 4: أصلع
    ctx.restore();
    ctx.restore();
    // علامة لاعبك وحامل الكرة
    if (e.user && !isRef) {
      ctx.save(); ctx.translate(x, y - H * 1.12 + jy); ctx.fillStyle = '#ffcf5a'; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4.2, -4); ctx.lineTo(4.2, -4); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(255,207,90,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y, H * 0.38, H * 0.16, 0, 0, 6.3); ctx.stroke(); ctx.restore();
    }
    if (!isRef && ((e.user) || st.ball.carrier === e.id && st.cam.eff === 'follow')) {
      ctx.save(); ctx.font = '700 ' + clamp(H * 0.36, 8, 12) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2.4;
      const txt = e.name || ''; ctx.strokeText(txt, x, y + H * 0.34); ctx.fillText(txt, x, y + H * 0.34); ctx.restore();
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); }

  function drawBall(ctx) {
    const b = st.ball, g = P(b.x, b.z), a = P(b.x, b.z, b.h), r = clamp(g[2] * 0.62, 2.4, 7.5);
    // أثر الكرة السريعة
    if (st.trail.length > 1 && st.q > 0) {
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 1; i < st.trail.length; i++) { const p0 = P(st.trail[i - 1][0], st.trail[i - 1][1], st.trail[i - 1][2]), p1 = P(st.trail[i][0], st.trail[i][1], st.trail[i][2]); ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.3 * i / st.trail.length).toFixed(3) + ')'; ctx.lineWidth = r * (0.5 + 0.9 * i / st.trail.length); ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - r * 0.6); ctx.lineTo(p1[0], p1[1] - r * 0.6); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(g[0], g[1], r * (1.1 - Math.min(0.4, b.h * 0.1)), r * 0.45, 0, 0, 6.3); ctx.fill();
    const cx = a[0], cy = a[1] - r * 0.6;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(10,14,26,.8)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill(); ctx.stroke();
    // رقعتا الكرة تدوران مع سرعتها (st.bspin) فيظهر الدوران
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.clip(); ctx.fillStyle = 'rgba(15,20,36,.85)';
    for (let i = 0; i < 3; i++) { const an = st.bspin + i * 2.094, d = r * 0.58; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.8, r * (0.3 + 0.08 * Math.cos(an + 1)), 0, 6.3); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.arc(cx + r * 0.3, cy + r * 0.3, r, 0, 6.3); ctx.fill();   // ظل أسفل-يمين
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.38, r * 0.22, 0, 6.3); ctx.fill();  // لمعة
    ctx.restore();
  }

  function drawCards(ctx) {
    st.cards.forEach((c) => {
      const e = st.byId[c.id]; if (!e) return;
      const p = P(e.x, e.z), H = clamp(p[2] * 5.7, 10, 38), q = clamp(c.t / 2.2, 0, 1), y = p[1] - H * 1.3 - q * 10;
      ctx.save(); ctx.globalAlpha = q < 0.8 ? 1 : (1 - q) * 5;
      if (c.inj) { ctx.fillStyle = '#ff4d5e'; ctx.fillRect(p[0] - 1.4, y - 7, 2.8, 14); ctx.fillRect(p[0] - 7, y - 1.4, 14, 2.8); }
      else { ctx.fillStyle = c.red ? '#ff3a4f' : '#ffd23a'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; roundRect(ctx, p[0] - 4.5, y - 7, 9, 13, 1.5); ctx.beginPath(); roundRect(ctx, p[0] - 4.5, y - 7, 9, 13, 1.5); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    });
  }

  function drawFx(ctx) {
    const w = st.W, h = st.H;
    st.flashes.forEach((f) => {
      if (f.kind === 'goal') { const a = Math.max(0, 0.5 - f.t * 0.9); if (a > 0) { ctx.fillStyle = 'rgba(255,248,214,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, w, h); } }
    });
    // مطر: خطوط مائلة خفيفة + عتمة ورطوبة (بصريّ فقط)
    if (st.rain && st.q > 0 && st.drops.length) {
      ctx.fillStyle = 'rgba(14,24,44,.16)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(205,225,255,.5)'; ctx.lineWidth = 1.1; ctx.beginPath();
      st.drops.forEach((d) => { const x = d.x * w, y = d.y * h; ctx.moveTo(x, y); ctx.lineTo(x - d.l * w * 0.12, y + d.l * h); });
      ctx.stroke();
    }
    // وميض كاميرات الجمهور
    if (st.q > 0 && st.flashes.some((f) => f.kind === 'goal')) { const r = SC.rng(Math.floor(st.t * 14)); ctx.fillStyle = 'rgba(255,255,255,.95)'; for (let i = 0; i < 9; i++) ctx.fillRect(r() * w, r() * h * 0.2, 2, 2); }
    st.particles.forEach((p) => {
      const a = 1 - p.t / p.life; ctx.save(); ctx.translate(p.x * w, p.y * h); ctx.rotate(p.r); ctx.globalAlpha = clamp(a * 1.4, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(-2.5, -1.5, 5, 3); ctx.restore();
    });
  }
})(window.G = window.G || {});
