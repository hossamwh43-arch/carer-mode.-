/* stadium_core.js — منطق «الملعب المرئي» الصافي (بلا DOM): إحداثيات الملعب، المنظور، الأطقم، تموضع التشكيلة، وتخطيط الهجمات.
   ⚠ تصوير فقط: لا يلمس حالة اللعبة ولا مولّد العشوائية G.U (له مولّد خاص مبذور بمعرّف المباراة)، فنتيجة المباراة لا تتغيّر بتشغيله أو إطفائه.
   يُختبر في Node بلا متصفح (tests/engine/stadium_core.js). الإحداثيات بالأمتار: X من 0 (يسار الشاشة) إلى 105، Z من 0 (الحد البعيد عن الكاميرا) إلى 68 (القريب).
   صاحب الأرض يدافع عن المرمى الأيمن ويهاجم اليسار (يوافق ترتيب لوحة النتيجة العربية: صاحب الأرض يمينًا). */
(function (G) {
  'use strict';
  const SC = (G.Stadium = {});
  const L = 105, W = 68, GOAL_W = 7.32, CZ = W / 2;
  SC.L = L; SC.W = W; SC.GOAL_W = GOAL_W; SC.CZ = CZ;

  // ---------- مولّد خاص (mulberry32) بمعزل عن G.U ----------
  SC.hash = (str) => { let h = 2166136261 >>> 0; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  SC.rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  SC.clamp = clamp;
  const lerp = (a, b, t) => a + (b - a) * t;
  SC.lerp = lerp;
  SC.ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  SC.dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // ---------- المرمى: الهدف الذي يهاجمه فريق ----------
  // 'h' يدافع عن اليمين (X=L) ويهاجم X=0؛ 'a' العكس
  SC.goalX = (attSide) => (attSide === 'h' ? 0 : L);
  SC.ownGoalX = (side) => (side === 'h' ? L : 0);
  SC.dir = (side) => (side === 'h' ? -1 : 1); // اتجاه الهجوم على محور X

  // ---------- إحداثيات الخانات (x%، y%): المهاجمون في الأعلى (y صغير) والحارس في الأسفل — مثل UI.pitch ----------
  SC.FORM_XY = {
    '4-3-3': [[50, 91], [13, 71], [37, 76], [63, 76], [87, 71], [50, 57], [27, 44], [73, 44], [15, 20], [85, 20], [50, 14]],
    '4-2-3-1': [[50, 91], [13, 71], [37, 76], [63, 76], [87, 71], [36, 57], [64, 57], [50, 37], [16, 35], [84, 35], [50, 13]],
    '4-4-2': [[50, 91], [13, 71], [37, 76], [63, 76], [87, 71], [38, 49], [62, 49], [14, 45], [86, 45], [38, 16], [62, 16]]
  };
  // موضع الأساس في الملعب (بالأمتار) لخانة (x%،y%) لفريق على جهة side
  SC.basePos = (xy, side) => {
    const depth = clamp((91 - xy[1]) / (91 - 13), 0, 1);              // 0 حارس … 1 رأس حربة
    const along = lerp(3.5, 60, Math.pow(depth, 0.92));                 // المسافة من خط مرماه
    const x = side === 'h' ? L - along : along;
    const lat = (xy[0] / 100) * (W - 12) + 6;                           // 6..62
    const z = side === 'h' ? W - lat : lat;                             // الرؤية من الوجه المقابل: يسار المهاجم يعكس الجهة
    return [x, z];
  };
  // يوزّع الأحد عشر على خانات الخطة بحسب رمز الخانة (كما يفعل UI.pitch) ويعيد [{id, slot, base:[x,z]}]
  SC.layout = (xi, form, side, slotsOf) => {
    const xyAll = SC.FORM_XY[form] || SC.FORM_XY['4-3-3'];
    const slots = (slotsOf || (() => []))(form).slice(), used = {};
    return xi.map((x, k) => {
      let i = slots.findIndex((c, j) => c === x.slot && !used[j]);
      if (i < 0) i = slots.findIndex((c, j) => !used[j]);
      if (i >= 0) used[i] = true; else i = Math.min(k, xyAll.length - 1);
      const xy = xyAll[i] || [50, 50];
      return { id: x.id, slot: x.slot, base: SC.basePos(xy, side), xy };
    });
  };

  // ---------- الأطقم: لا يتشابه قميصا الفريقين، ولا الحارس مع أي منهما ----------
  const hex = (c) => { c = String(c || '#888').replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.substr(0, 2), 16) || 0, parseInt(c.substr(2, 2), 16) || 0, parseInt(c.substr(4, 2), 16) || 0]; };
  const toHex = (r) => '#' + r.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  SC.cdist = (a, b) => { const x = hex(a), y = hex(b); const rm = (x[0] + y[0]) / 2; const dr = x[0] - y[0], dg = x[1] - y[1], db = x[2] - y[2]; return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db); }; // مسافة لونية مُدركة (redmean)
  SC.lum = (c) => { const h = hex(c); return (0.299 * h[0] + 0.587 * h[1] + 0.114 * h[2]) / 255; };
  SC.shade = (c, k) => { const h = hex(c); return toHex(h.map((v) => (k >= 0 ? v + (255 - v) * k : v * (1 + k)))); };
  SC.CLASH = 150;
  SC.kits = (hc, ac) => {
    const h1 = (hc && hc[0]) || '#d33', h2 = (hc && hc[1]) || '#fff', a1 = (ac && ac[0]) || '#36c', a2 = (ac && ac[1]) || '#fff';
    const home = { shirt: h1, shorts: SC.lum(h1) > 0.55 ? SC.shade(h1, -0.55) : (SC.lum(h2) > 0.7 ? h2 : SC.shade(h1, -0.4)), socks: h1, trim: h2 };
    let away = { shirt: a1, shorts: SC.lum(a1) > 0.55 ? SC.shade(a1, -0.55) : (SC.lum(a2) > 0.7 ? a2 : SC.shade(a1, -0.4)), socks: a1, trim: a2 };
    if (SC.cdist(home.shirt, away.shirt) < SC.CLASH) { // تعارض: الضيف يرتدي لونه الثانوي، وإن تعارض أيضًا فأبيض/أسود حسب الأفتح
      away = { shirt: a2, shorts: SC.shade(a2, -0.5), socks: a2, trim: a1 };
      if (SC.cdist(home.shirt, away.shirt) < SC.CLASH) { const w = SC.lum(home.shirt) > 0.5; away = { shirt: w ? '#16202f' : '#f4f6fb', shorts: w ? '#0b111b' : '#cfd6e4', socks: w ? '#16202f' : '#f4f6fb', trim: a1 }; }
    }
    const gkPool = ['#f4c20d', '#19b6d2', '#e8742a', '#7dd33a', '#c042d6'];
    const pickGk = (avoid) => gkPool.find((c) => avoid.every((v) => SC.cdist(c, v) > SC.CLASH)) || gkPool[0];
    home.gk = pickGk([home.shirt, away.shirt]);
    away.gk = pickGk([home.shirt, away.shirt, home.gk]);
    return { h: home, a: away };
  };

  // ---------- الكاميرا: إسقاط منظوري للمستوى الأرضي ----------
  // الأنماط: tv (بث تلفزيوني بمنظور) · top (علوية مسطّحة) · follow (قريبة تتبع الكرة). cam = {mode, zoom, cx, cz} الأخيران يُنعَّمان بالتحريك
  SC.CAMS = ['tv', 'follow', 'top'];
  SC.project = (cam, w, h, x, z, up) => {
    up = up || 0;
    const zoom = cam.zoom || 1, mode = cam.mode;
    let sx, sy, s;
    if (mode === 'top') {
      const pw = w * 0.955, k = pw / L, ph = k * W, y0 = (h - ph) / 2;
      s = k * zoom;
      sx = w / 2 + (x - (cam.cx == null ? L / 2 : cam.cx)) * k * zoom;
      sy = y0 + ph / 2 + (z - (cam.cz == null ? CZ : cam.cz)) * k * zoom;
      return [sx, sy - up * k * zoom * 0.9, s];
    }
    // منظور: عمق f(t) = 1 + a(1−t) حيث t=z/W (0 بعيد، 1 قريب)
    const a = 0.62, inv0 = 1 / (1 + a), yFar = h * 0.255, yNear = h * 0.965;
    const base = w * 1.06 / L;                                           // مقياس الأمتار على الخط القريب
    const depth = (zz) => { const t = clamp(zz / W, -0.25, 1.25); return 1 / (1 + a * (1 - t)); };
    const gy = (zz) => lerp(yFar, yNear, (depth(zz) - inv0) / (1 - inv0));
    const inv = depth(z), cx = cam.cx == null ? L / 2 : cam.cx, cz = cam.cz == null ? CZ : cam.cz;
    s = base * inv * zoom;
    sx = w / 2 + (x - cx) * base * inv * zoom;
    const yy = gy(z), k = clamp((zoom - 1) / 0.6, 0, 1);
    sy = lerp(yy, h * 0.6 + (yy - gy(cz)) * zoom, k);
    return [sx, sy - up * s * 0.95, s];
  };

  // ---------- تخطيط الهجمة: سلسلة تمريرات ثم تسديدة ثم نتيجة ----------
  // ents: [{id, x, z, slot}] لاعبو الفريق المهاجم (مواضعهم الحالية) · gk: {x,z} حارس الخصم
  // ret: {chain:[{id,from,to,t}], shot:{id,from,to,h,t}, outcome, endBall:[x,z,h], keeper:{dive:[x,z]}}
  SC.planAttack = (rnd, o) => {
    const side = o.side, gx = SC.goalX(side), toGoal = gx < L / 2 ? -1 : 1; // toGoal: اتجاه المرمى المُهاجَم على محور X
    const outfield = o.ents.filter((e) => e.slot !== 'GK');
    const byId = {}; o.ents.forEach((e) => { byId[e.id] = e; });
    const shooter = byId[o.shooter] || outfield.slice().sort((a, b) => toGoal * (b.x - a.x))[0];
    if (!shooter) return null;
    const assist = o.assist && byId[o.assist] && o.assist !== shooter.id ? byId[o.assist] : null;
    // لاعبو البناء: وسط/دفاع أقرب لمنتصف الملعب، ثم المساعد، ثم المسدِّد
    const pool = outfield.filter((e) => e.id !== shooter.id && (!assist || e.id !== assist.id));
    pool.sort((a, b) => toGoal * (a.x - b.x)); // الأبعد عن المرمى أولًا
    const nBuild = clamp(Math.round(1 + rnd() * 2), 1, 3);
    const builders = [];
    for (let i = 0; i < nBuild && pool.length; i++) { const k = Math.min(pool.length - 1, Math.floor(rnd() * Math.min(pool.length, 6))); builders.push(pool.splice(k, 1)[0]); }
    builders.sort((a, b) => toGoal * (a.x - b.x));
    const seq = builders.concat(assist ? [assist] : []).concat([shooter]);
    // مواضع الاستلام: تتقدم نحو المرمى تدريجيًا
    const pos = [];
    seq.forEach((e, i) => {
      const adv = i / Math.max(1, seq.length - 1);
      let x = i === seq.length - 1 ? clamp(gx - toGoal * (13 + rnd() * 10), 3, L - 3) : clamp(lerp(e.x, gx - toGoal * 30, 0.35 + 0.25 * adv), 3, L - 3);
      let z = i === seq.length - 1 ? clamp(CZ + (rnd() - 0.5) * 26, 8, W - 8) : clamp(e.z + (rnd() - 0.5) * 8, 5, W - 5);
      if (assist && i === seq.length - 2) { x = clamp(gx - toGoal * (18 + rnd() * 12), 3, L - 3); z = clamp(e.z < CZ ? e.z + rnd() * 5 : e.z - rnd() * 5, 5, W - 5); }
      pos.push([x, z]);
    });
    const chain = [];
    let ball = [seq[0].x, seq[0].z];
    for (let i = 0; i < seq.length - 1; i++) {
      const from = ball, to = [pos[i + 1][0], pos[i + 1][1]], d = SC.dist(from, to);
      chain.push({ id: seq[i].id, to: seq[i + 1].id, from, dest: to, t: clamp(0.28 + d / 30, 0.35, 1.0), h: clamp(d / 55, 0.05, 0.9) });
      ball = to;
    }
    const sFrom = ball, gz = CZ;
    const mouth = GOAL_W / 2;
    let target, outcome = o.outcome;
    if (outcome === 'goal') target = [gx + toGoal * 0.6, gz + (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd() * (mouth - 1.6)), 0.25 + rnd() * 1.5];
    else if (outcome === 'save') target = [gx + toGoal * 0.5, gz + (rnd() - 0.5) * (mouth * 1.5), 0.3 + rnd() * 1.3];
    else {
      const wide = rnd() < 0.62;
      target = wide ? [gx + toGoal * 2.5, gz + (rnd() < 0.5 ? -1 : 1) * (mouth + 1.2 + rnd() * 4.5), 0.4 + rnd() * 1.3] : [gx + toGoal * 2.5, gz + (rnd() - 0.5) * 6, 2.9 + rnd() * 1.4];
    }
    const sd = SC.dist(sFrom, target);
    const shot = { id: shooter.id, from: sFrom, to: target, t: clamp(0.22 + sd / 52, 0.3, 0.7), h: clamp(0.8 + sd / 28, 1, 3.2) };
    const keeper = { dive: [gx + toGoal * 1.2, clamp(target[1] + (outcome === 'goal' ? (rnd() < 0.5 ? -1 : 1) * 0.0 : 0), CZ - mouth, CZ + mouth)], late: outcome === 'goal' };
    return { side, chain, shot, outcome, keeper, seq: seq.map((e) => e.id), goalX: gx };
  };

  SC.planDuration = (pl, speedScale) => ((pl.chain.reduce((a, c) => a + c.t, 0) + pl.shot.t + (pl.outcome === 'goal' ? 1.5 : 0.9)) / (speedScale || 1));
})(window.G = window.G || {});
