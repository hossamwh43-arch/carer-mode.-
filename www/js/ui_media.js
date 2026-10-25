/* ui_media.js — واجهة الإعلام والشعبية: سطر الشعبية في بطاقة اللاعب، بطاقة المؤتمر الصحفي في الرئيسية، نافذة الأسئلة والخيارات،
   ونتيجة الإجابة، وبطاقة «الإعلام والرعاة» في صفحة المسيرة. عرض فقط + استدعاء G.Media.answer/skip (لا عشوائية). */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const M = () => G.Media;
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 1 : d).replace(/\.0$/, '');
  const shortLabel = (l) => String(l).replace(/^\d{2}(\d{2})\/(\d{2})$/, '$1/$2');

  // ---------- سطر مصغّر في بطاقة اللاعب ----------
  UI.mediaMini = () => {
    if (!M()) return '';
    const m = M().get(), t = M().tier();
    return '<div class="mm"><div class="row sb sm"><span>📣 الشعبية <b>' + Math.round(m.pop) + '</b>' + (t.id !== 'none' ? ' <span class="mut">· ' + t.ar + '</span>' : '') + '</span><span>👥 <b>' + M().fmtFans(M().fans()) + '</b> متابع</span></div>' + UI.bar(m.pop, 'gold') + '</div>';
  };

  // ---------- بطاقة المؤتمر في الرئيسية ----------
  UI.pressCard = () => {
    if (!M()) return '';
    const pr = M().pending();
    if (!pr) return '';
    const K = M().KINDS[pr.kind];
    return '<div class="card pressc"><div class="row sb"><b>' + K.icon + ' مؤتمر صحفي</b><span class="pill y">' + esc(K.ar) + '</span></div>' +
      '<div class="sm mut" style="margin:4px 0 6px">' + esc(M().outlet(pr)) + '</div><div class="pq">«' + esc(M().question(pr)) + '»</div>' +
      '<div class="grid2"><button class="btn pri" data-a="pressOpen">🎙️ أجب عن السؤال</button><button class="btn" data-a="pressSkip">تجاهل</button></div>' +
      '<div class="sm mut" style="margin-top:6px">إن لم تُجب خلال أسبوعين ينتهي المؤتمر دون أي أثر.</div></div>';
  };

  function tagPill(tag) { return '<span class="pill ' + (tag === 'safe' ? 'g' : tag === 'bold' ? 'y' : 'r') + '">' + M().TAG_AR[tag] + '</span>'; }

  function pressSheet() {
    const pr = M() && M().pending();
    if (!pr) return '<h3>🎤 مؤتمر صحفي</h3><div class="mut">لا يوجد مؤتمر صحفي الآن.</div><button class="btn" data-a="closeSheet">إغلاق</button>';
    const K = M().KINDS[pr.kind], ctx = pr.ctx || {};
    const opp = ctx.opp && G.S.clubs[ctx.opp] ? G.S.clubs[ctx.opp].name : '';
    let h = '<h3>' + K.icon + ' مؤتمر صحفي</h3><div class="sm mut">' + esc(M().outlet(pr)) + (opp ? ' · بعد مباراة ' + esc(opp) + ' (' + esc(ctx.sc || '') + ')' : '') + '</div>' +
      '<div class="pq" style="margin:10px 0 12px">«' + esc(M().question(pr)) + '»</div>';
    M().options(pr).forEach((o) => {
      const risky = o.risk > 0;
      h += '<button class="popt ' + o.tag + '" data-a="pressAns" data-v="' + o.id + '"><span class="pt">' + esc(o.ar) + '</span>' +
        '<span class="pm"><span class="po">' + tagPill(o.tag) + '</span>' +
        '<span class="pl">✅ النجاح: شعبية <b class="ltr">' + sgn(o.ok[0]) + '</b>' + (o.ok[2] ? ' · ثقة المدرب <b class="ltr">' + sgn(o.ok[2]) + '</b>' : '') + '</span>' +
        (risky ? '<span class="pl neg">⚠️ الارتداد (<b class="ltr">' + Math.round(o.risk * 100) + '%</b>): شعبية <b class="ltr">' + sgn(o.bad[0]) + '</b> · ثقة المدرب <b class="ltr">' + sgn(o.bad[2]) + '</b></span>' : '<span class="pl mut">بلا أي مخاطرة</span>') + '</span></button>';
    });
    h += '<p class="sm mut" style="margin-top:8px">كلما حسُنت علاقتك بالصحافة قلّت مخاطرة الإجابات الجريئة. النتيجة تُحسم مرة واحدة ولا تتغيّر بإعادة التحميل.</p>' +
      '<div class="grid2"><button class="btn" data-a="pressSkip">تجاهل المؤتمر</button><button class="btn" data-a="closeSheet">لاحقًا</button></div>';
    return h;
  }

  function resultSheet(r) {
    const chip = (lab, v, d) => (v ? '<span class="pill ' + (v > 0 ? 'g' : 'r') + '">' + lab + ' <b class="ltr">' + sgn(v, d) + '</b></span>' : '');
    return '<h3>' + (r.back ? '😬 ردّ فعل سلبي' : '🎙️ ردّ فعل الإعلام') + '</h3>' +
      '<div class="notice ' + (r.back ? 'bad' : 'ok') + '" style="margin-top:6px">' + esc(r.txt) + '</div>' +
      '<div class="chips" style="margin:6px 0 10px">' + chip('الشعبية', r.fx[0]) + chip('علاقتك بالصحافة', r.fx[1], 0) + chip('ثقة المدرب', r.fx[2]) + (r.fx[3] ? '<span class="pill y">🔁 اهتمام الأندية يزداد</span>' : '') + '</div>' +
      '<div class="row sb sm"><span>شعبيتك الآن</span><b>' + M().pop() + '</b></div>' + UI.bar(M().get().pop, 'gold') +
      '<button class="btn pri" data-a="closeSheet">حسنًا</button>';
  }

  UI.on('pressOpen', () => { if (!M() || !M().pending()) { UI.toast('لا يوجد مؤتمر صحفي'); return; } UI.sheetRender(pressSheet); return false; });
  UI.on('pressAns', (id) => {
    const r = M().answer(id);
    if (!r.ok) { UI.toast(r.msg); return false; }
    UI.fx(r.back ? 'bad' : 'ping');
    UI.render();
    UI.sheetRender(() => resultSheet(r));
    return false;
  });
  UI.on('pressSkip', () => { M().skip(); UI.closeSheet(); UI.toast('تجاهلتَ المؤتمر الصحفي'); });

  // ---------- بطاقة «الإعلام والرعاة» في صفحة المسيرة ----------
  UI.mediaCard = () => {
    if (!M()) return '';
    const S = G.S, m = M().get(), t = M().tier(), inc = M().income(), playing = S.phase === 'season' || S.phase === 'summer';
    let h = '<div class="card"><h4>📣 الإعلام والشعبية</h4><div class="grid3">' +
      '<div class="stat"><b>' + Math.round(m.pop) + '</b><small>الشعبية</small></div>' +
      '<div class="stat"><b>' + M().fmtFans(M().fans()) + '</b><small>متابع</small></div>' +
      '<div class="stat"><b>' + (m.mood > 0 ? '+' : '') + Math.round(m.mood) + '</b><small>' + M().moodLabel(m.mood) + '</small></div></div>' +
      '<div style="margin-top:10px">' + UI.bar(m.pop, 'gold') + '</div>';
    h += '<div class="kv" style="margin-top:8px"><span>عقد الرعاية</span><span>' + (m.sp && m.sp.brand ? esc(m.sp.brand) + ' <span class="mut sm">· ' + t.ar + '</span>' : '<span class="mut">لا يوجد بعد (يبدأ عند شعبية 24)</span>') + '</span></div>' +
      '<div class="kv"><span>دخلك السنوي التقريبي</span><b>' + UI.money(inc.wage + inc.spons) + '</b></div>' +
      '<div class="kv"><span class="sm mut">منه الراتب · الرعاية</span><span class="sm mut">' + UI.money(inc.wage) + ' · ' + UI.money(inc.spons) + '</span></div>' +
      '<div class="kv"><span>إجمالي أرباح المسيرة</span><b class="gold">' + UI.money(m.wages + m.spons) + '</b></div>';
    // تطوّر الشعبية
    const pts = (m.hist || []).map((r) => ({ l: shortLabel(r.label), v: r.pop }));
    if (playing) pts.push({ l: 'الآن', v: Math.round(m.pop) });
    h += '<h4 style="margin:14px 0 4px">📈 تطوّر شعبيتك</h4>' + UI.lineChart(pts, { min: 0, max: 100, h: 140 });
    // المؤتمرات
    const st = m.stat || {};
    if (st.ask || st.skip) h += '<div class="sm mut" style="margin-top:8px">🎤 المؤتمرات: أجبتَ عن ' + st.ask + ' (نجحت ' + st.ok + ' · ارتدّت ' + st.bad + ') · فات أو تجاهلتَ ' + st.skip + '</div>';
    h += '</div>';
    // العناوين
    if ((m.heads || []).length) {
      h += '<div class="card"><h4>📰 عناوين الصحف</h4>' + m.heads.slice(0, 8).map((x) => '<div class="hd ' + (x.k > 0 ? 'up' : x.k < 0 ? 'dn' : '') + '"><span class="sm mut">م' + x.s + ' · أ' + x.w + '</span><span>' + (x.k > 0 ? '▲ ' : x.k < 0 ? '▼ ' : '') + esc(x.t) + '</span></div>').join('') + '</div>';
    }
    return h;
  };
})(window.G = window.G || {});
