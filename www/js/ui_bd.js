/* ui_bd.js — صفحة الكرة الذهبية: الترتيب الشهري للمرشحين، تفاصيل عوامل اللاعب، سجل الحفلات، وبطاقة الرئيسية.
 * واجهة فقط: لا U.rnd ولا تعديل للحالة سوى إنشاء S.bd عند أول عرض. */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc;
  const B = () => G.BD;
  const me = () => G.S.players[G.S.user];

  UI.titles.bd = () => 'الكرة الذهبية ' + (G.BD ? G.BD.year() : '');

  const lastSnap = () => { const c = B().get().cur; return c.snaps.length ? c.snaps[c.snaps.length - 1] : null; };
  const trend = (d) => (d == null || d === 0 ? '<span class="mut sm">—</span>' : d > 0 ? '<span class="pos sm">▲' + d + '</span>' : '<span class="neg sm">▼' + (-d) + '</span>');
  const nat = (c) => esc(G.Intl ? G.Intl.name(c) : c);
  const tone = (v) => (v >= 70 ? '' : v >= 40 ? 'gold' : 'red');

  function factorBars(x) {
    return B().FACTORS.map((f) => '<div class="gauge" style="margin:6px 0"><div class="row sb sm"><span>' + f[1] + ' <span class="mut">(' + Math.round(B().W[f[0]] * 100) + '%)</span></span><b>' + x[f[0]] + '</b></div>' + UI.bar(x[f[0]], tone(x[f[0]])) + '</div>').join('');
  }

  function tips(x) {
    const arr = [['perf', 'الأداء: سجّل وصنّع الأهداف وحافظ على تقييم مرتفع في أغلب المباريات.'], ['team', 'نجاح الفريق: ناديك يجب أن يتصدر الدوري ويتقدم بعيدًا في دوري الأبطال — فكّر في نادٍ أقوى.'], ['ev', 'البطولات الكبرى: التتويج بدوري الأبطال أو الدوري أو كأس العالم يضيف أكثر من أي رقم فردي.'], ['fame', 'الشهرة: تتراكم بالتألق والإعلام وتعزّزها الجوائز السابقة.']];
    arr.sort((a, b) => x[a[0]] - x[b[0]]);
    return '<p class="sm mut" style="margin:8px 0 0">💡 ' + arr[0][1] + '</p>';
  }

  function userCard(s) {
    const m = s.me, lead = s.list[0];
    if (!m) return '<div class="card"><div class="notice">لا تظهر في ترتيب الكرة الذهبية بعد (تحتاج مباريات أكثر).</div></div>';
    const gap = lead.id === m.id ? 0 : lead.t - m.t;
    return '<div class="card hl"><div class="row sb"><h3 style="margin:0">ترتيبك</h3><span class="pill ' + (m.rank <= 3 ? 'y' : m.rank <= 10 ? 'g' : 'b') + '">المركز ' + m.rank + '</span></div>' +
      '<div class="grid3" style="margin-top:10px"><div class="stat"><b>' + m.t.toFixed(1) + '</b><small>درجتك</small></div><div class="stat"><b>' + (m.rank === 1 ? 'المتصدر' : gap.toFixed(1)) + '</b><small>' + (m.rank === 1 ? 'الصدارة' : 'الفارق عن الصدارة') + '</small></div><div class="stat"><b>' + (m.pr || 0) + '%</b><small>فرص الفوز</small></div></div>' +
      '<div style="margin-top:10px">' + factorBars(m) + '</div>' + (m.rank > 1 ? tips(m) : '<p class="sm gold" style="margin:8px 0 0">أنت في الصدارة — حافظ على مستواك حتى نهاية الموسم.</p>') + '</div>';
  }

  function listCard(s) {
    const uid = G.S.user;
    return '<div class="card"><h3>أفضل المرشحين</h3><table class="t"><tr><th>#</th><th class="l">اللاعب</th><th></th><th>الدرجة</th><th>فرص</th></tr>' +
      s.list.slice(0, 15).map((x) => '<tr class="' + (x.id === uid ? 'me' : '') + '" data-a="bdPlayer" data-v="' + x.id + '" style="cursor:pointer"><td>' + x.rank + '</td><td class="l"><div>' + esc(x.n) + '</div><div class="sm mut">' + esc(x.club) + ' · ' + nat(x.nat) + ' · ' + G.POS_AR[x.pos] + '</div></td><td>' + trend(x.d) + '</td><td><b>' + x.t.toFixed(1) + '</b></td><td class="sm">' + x.pr + '%</td></tr>').join('') + '</table>' +
      '<p class="sm mut" style="margin:8px 0 0">اضغط على اسم لاعب لرؤية تفاصيل عوامله. الترتيب يُحدَّث كل 4 أسابيع.</p></div>';
  }

  function nowView() {
    const b = B().get(), cur = b.cur, s = lastSnap(), S = G.S;
    let h = '';
    if (cur.done && S.bdLast && S.bdLast.season === S.season) return ceremonyView(S.bdLast, true);
    if (!s) {
      return '<div class="card hl"><h2>🏆 الكرة الذهبية ' + B().year() + '</h2><p class="sm mut">يُصدَر أول ترتيب للمرشحين بعد الأسبوع 4، ثم يتجدد كل شهر (4 أسابيع). تعتمد الدرجة على:</p>' + B().FACTORS.map((f) => '<div class="kv"><span>' + f[1] + '</span><b>' + Math.round(B().W[f[0]] * 100) + '%</b></div>').join('') + '<p class="sm mut">الفوز بدوري الأبطال أو الدوري أو كأس العالم يرفع حظوظك بقوة.</p></div>';
    }
    const k = Math.min(9, Math.round(s.w / 4));
    h += '<div class="card hl"><div class="row sb"><h2 style="margin:0">🏆 الكرة الذهبية ' + B().year() + '</h2>' + (s.final ? '<span class="pill y">النتيجة النهائية</span>' : '<span class="pill b">التحديث ' + k + ' / 9</span>') + '</div>' +
      '<div class="sm mut" style="margin-top:6px">آخر ترتيب بعد الأسبوع ' + s.w + ' · ' + (S.phase === 'end' && S.intl && !S.intl.done ? 'الحفل بعد انتهاء ' + esc(S.intl.name) : 'الحفل في نهاية الموسم') + '</div></div>';
    h += userCard(s) + listCard(s);
    return h;
  }

  function ceremonyView(rec, now) {
    const win = rec.winner, uid = G.S.user;
    return '<div class="card hl"><div class="c" style="margin-bottom:6px"><div class="mut sm">الكرة الذهبية ' + rec.year + '</div><h2 style="margin:6px 0">🏆 ' + esc(win.n) + '</h2><div class="sm mut">' + esc(win.club) + ' · ' + nat(win.nat) + ' · ' + G.POS_AR[win.pos] + '</div></div>' +
      (win.user ? '<div class="notice" style="margin:8px 0">🎉 أنت أفضل لاعب في العالم هذا العام!</div>' : '') +
      '<table class="t"><tr><th>#</th><th class="l">اللاعب</th><th>الدرجة</th></tr>' +
      rec.top.map((x, i) => '<tr class="' + (x.user ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="l"><div>' + esc(x.n) + '</div><div class="sm mut">' + esc(x.club) + ' · ' + nat(x.nat) + '</div></td><td><b>' + x.t.toFixed(1) + '</b></td></tr>').join('') + '</table>' +
      (rec.me ? '<div class="kv" style="margin-top:8px"><span>ترتيبك</span><b>' + rec.me.rank + '</b></div>' : '') + '</div>' +
      (rec.me ? '<div class="card"><h3>عواملك هذا الموسم</h3>' + factorBars(rec.me) + '</div>' : '') +
      (rec.tour ? '<div class="card sm mut">أُقيمت هذا العام بطولة منتخبات (' + esc(G.TOURS[rec.tour.type].ar) + ') وأثّرت في الترتيب.</div>' : '');
  }

  function histView() {
    const b = B().get(), u = me(), h = b.hist.slice().reverse();
    let out = '';
    const car = u.bdCar || [];
    if (car.length) {
      const best = B().userBest(), t10 = car.filter((x) => x.r <= 10).length;
      out += '<div class="card"><h3>مسيرتك مع الجائزة</h3><div class="grid3"><div class="stat"><b>' + ((u.trophies || {}).bd || 0) + '</b><small>كرات ذهبية</small></div><div class="stat"><b>' + best + '</b><small>أفضل مركز</small></div><div class="stat"><b>' + t10 + '</b><small>مرات ضمن أول 10</small></div></div></div>';
    }
    if (!h.length) return out + '<div class="card mut c">لم يُقَم أي حفل بعد. أول حفل في نهاية هذا الموسم.</div>';
    out += '<div class="card"><h3>الفائزون</h3><table class="t"><tr><th>العام</th><th class="l">الفائز</th><th>ترتيبك</th></tr>' +
      h.map((r) => '<tr data-a="bdCer" data-v="' + r.season + '" style="cursor:pointer"><td>' + r.year + '</td><td class="l"><div>' + esc(r.winner.n) + (r.winner.user ? ' ⭐' : '') + '</div><div class="sm mut">' + esc(r.winner.club) + ' · ' + r.winner.t.toFixed(1) + '</div></td><td>' + (r.me ? r.me.rank : '—') + '</td></tr>').join('') + '</table><p class="sm mut" style="margin:8px 0 0">اضغط على سنة لرؤية أفضل 10 في ذلك العام.</p></div>';
    return out;
  }

  UI.screens.bd = () => {
    const T = UI.tabs('bd', [['now', 'الترتيب'], ['hist', 'الحفلات السابقة']], 'now');
    return T + (UI.curTab('bd', 'now') === 'now' ? nowView() : histView());
  };

  // ---------- بطاقة الرئيسية ----------
  UI.bdCard = () => {
    const S = G.S;
    if (!G.BD || !S.bd) { if (G.BD) G.BD.get(); else return ''; }
    const cur = G.BD.get().cur, s = lastSnap();
    if (S.phase === 'end') {
      if (cur.done && S.bdLast && S.bdLast.season === S.season) {
        const r = S.bdLast;
        return '<div class="card hl"><div class="row sb"><b>🏆 الكرة الذهبية ' + r.year + '</b><button class="btn sm" data-a="bdOpen">الحفل</button></div><div class="sm" style="margin-top:6px">الفائز: <b>' + esc(r.winner.n) + '</b> (' + esc(r.winner.club) + ')' + (r.me ? ' · ترتيبك: <b class="' + (r.me.rank <= 3 ? 'gold' : '') + '">' + r.me.rank + '</b>' : '') + '</div></div>';
      }
      if (S.intl && !S.intl.done) return '<div class="card"><div class="row sb"><b>🏆 الكرة الذهبية</b><button class="btn sm" data-a="bdOpen">الترتيب</button></div><div class="sm mut" style="margin-top:6px">يُعلَن الفائز بعد انتهاء ' + esc(S.intl.name) + '.</div></div>';
      return '';
    }
    if (S.phase !== 'season' || !s) return '';
    const m = s.me;
    return '<div class="card"><div class="row sb"><b>🏆 الكرة الذهبية</b><button class="btn sm" data-a="bdOpen">الترتيب</button></div><div class="sm" style="margin-top:6px">' + (m ? 'أنت في المركز <b class="' + (m.rank <= 10 ? 'gold' : '') + '">' + m.rank + '</b> ' + trend(m.d) + ' · المتصدر: ' + esc(s.list[0].n) : 'المتصدر: ' + esc(s.list[0].n)) + '</div></div>';
  };

  // ---------- الإجراءات ----------
  UI.on('bdOpen', () => { UI.sub.bd = 'now'; UI.cur = 'bd'; window.scrollTo(0, 0); });
  UI.on('bdPlayer', (id) => {
    const s = lastSnap();
    if (!s) return false;
    const x = s.list.find((y) => y.id === id) || (s.me && s.me.id === id ? s.me : null);
    if (!x) return false;
    UI.sheet('<h3>' + esc(x.n) + '</h3><div class="sm mut" style="margin-bottom:8px">' + esc(x.club) + ' · ' + nat(x.nat) + ' · ' + G.POS_AR[x.pos] + ' · تقييم ' + x.ovr + '</div><div class="kv"><span>الترتيب</span><b>' + x.rank + '</b></div><div class="kv"><span>الدرجة</span><b>' + x.t.toFixed(1) + '</b></div><div class="kv"><span>فرص الفوز</span><b>' + (x.pr || 0) + '%</b></div>' + factorBars(x) + '<button class="btn" data-a="closeSheet">إغلاق</button>');
    return false;
  });
  UI.on('bdCer', (season) => {
    const r = B().get().hist.find((x) => String(x.season) === String(season));
    if (!r) return false;
    UI.sheet('<div style="max-height:70vh;overflow:auto">' + ceremonyView(r) + '</div><button class="btn" data-a="closeSheet">إغلاق</button>');
    return false;
  });
})(window.G = window.G || {});
