/* ui_train.js — التدريب (تركيز/شدة)، إنفاق نقاط التطوير على السمات، قرارات المدرب والمنافسة، وتغيير المركز */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const T = () => G.Training;

  function levelCard(p) {
    const need = T().need(p.lvl);
    return '<div class="card"><div class="row sb"><div><h3 style="margin:0">المستوى ' + p.lvl + '</h3><div class="sm mut">الخبرة ' + Math.round(p.xp) + ' / ' + need + '</div></div>' +
      '<div class="stat" style="min-width:90px"><b class="' + (p.dp ? 'gold' : '') + '">' + p.dp + '</b><small>نقاط تطوير</small></div></div>' + UI.bar(p.xp / need * 100, 'blue') +
      '<p class="sm mut" style="margin:8px 0 0">تأتي الخبرة من التدريب الأسبوعي ومن المباريات (الأداء الجيد والدقائق الأكثر = خبرة أكثر).</p></div>';
  }

  function trainTab(p) {
    const S = G.S, t = S.training, I = T().INTENSITY;
    const keys = T().relevant(p);
    const focusList = T().FOCUS.filter((f) => f.id === 'balanced' || keys.indexOf(f.id) >= 0 || (p.pos !== 'GK' && f.id !== 'gk'));
    let h = levelCard(p) + '<div class="card"><h3>🎯 تركيز التدريب</h3><div class="chips">' +
      focusList.map((f) => '<button class="chip ' + (t.focus === f.id ? 'on' : '') + '" data-a="setFocus" data-v="' + f.id + '">' + f.ar + '</button>').join('') + '</div>';
    if (t.focus !== 'balanced') {
      const pr = p.prog && p.prog[t.focus] ? p.prog[t.focus] : 0;
      h += '<div class="row sb sm" style="margin-top:10px"><span>تقدّم ' + G.Players.ATTR_AR[t.focus] + '</span><span>' + Math.round(pr) + '%</span></div>' + UI.bar(pr, 'gold') + '<p class="sm mut" style="margin:6px 0 0">عند 100% ترتفع السمة تلقائيًا نقطة واحدة (ضمن سقف الموسم وإمكاناتك).</p>';
    } else h += '<p class="sm mut" style="margin:8px 0 0">التدريب المتوازن يوزّع التقدّم على أهم 3 سمات لمركزك.</p>';
    h += '</div><div class="card"><h3>💪 شدة التدريب</h3><div class="chips">' +
      Object.keys(I).map((k) => '<button class="chip ' + (t.intensity === k ? 'on' : '') + '" data-a="setIntensity" data-v="' + k + '">' + I[k].ar + '</button>').join('') + '</div>' +
      '<div class="kv" style="margin-top:8px"><span>الخبرة الأسبوعية</span><span>×' + I[t.intensity].xp + '</span></div><div class="kv"><span>استشفاء اللياقة</span><span>+' + I[t.intensity].rec + '% أسبوعيًا</span></div><div class="kv"><span>خطر الإصابة</span><span>' + (t.intensity === 'heavy' ? 'مرتفع' : t.intensity === 'normal' ? 'متوسط' : 'منخفض') + '</span></div>' +
      '<div class="kv"><span>مرافق ' + esc(UI.cname(p.club)) + '</span><span>×' + T().facility(p.club).toFixed(2) + '</span></div></div>';
    h += '<div class="notice">⚠️ التطور تدريجي بالتصميم: حدّ أقصى ' + T().seasonCap(p.age) + ' نقاط لكل سمة في الموسم بعمر ' + p.age + '، ولا تتجاوز السمة حدّ إمكاناتك.</div>';
    return h;
  }

  function attrRow(p, k) {
    const c = T().canSpend(p, k), g = p.gain[k] || 0, cap = T().seasonCap(p.age), v = p.a[k];
    const rel = (G.Players.OVR_W[p.pos][k] || 0);
    return '<div class="attr"><div class="nm"><div>' + G.Players.ATTR_AR[k] + (rel >= 0.2 ? ' <span class="pill g">أساسية</span>' : '') + '</div><div class="sm mut">هذا الموسم +' + g + ' / ' + cap + (c.ok ? ' · التكلفة ' + c.cost : c.reason ? ' · ' + c.reason : '') + '</div>' + UI.bar(v, v >= 80 ? 'gold' : '') + '</div>' +
      '<div class="v">' + v + '</div><button class="plus" data-a="spendAttr" data-v="' + k + '"' + (c.ok ? '' : ' disabled') + '>+</button></div>';
  }
  function attrsTab(p) {
    const keys = G.Players.ATTRS.filter((k) => (k === 'gk' ? p.pos === 'GK' : p.pos === 'GK' ? !!G.Players.OVR_W.GK[k] : true));
    const rel = T().relevant(p).filter((k) => keys.indexOf(k) >= 0).sort((a, b) => G.Players.OVR_W[p.pos][b] - G.Players.OVR_W[p.pos][a]);
    const oth = keys.filter((k) => rel.indexOf(k) < 0);
    return '<div class="card"><div class="row sb"><div><div class="sm mut">التقييم العام</div><div class="ovr ' + UI.tierCls(p) + '">' + p.ovr + '</div></div><div class="stat" style="min-width:110px"><b class="' + (p.dp ? 'gold' : '') + '">' + p.dp + '</b><small>نقاط تطوير متاحة</small></div></div></div>' +
      '<div class="card">' + UI.radar(p) + '</div>' +
      '<div class="card"><h4>السمات المؤثرة في مركزك (' + G.POS_AR[p.pos] + ')</h4>' + rel.map((k) => attrRow(p, k)).join('') + '</div>' +
      (oth.length ? '<div class="card"><h4>سمات أخرى</h4>' + oth.map((k) => attrRow(p, k)).join('') + '</div>' : '') +
      '<p class="sm mut">تكلفة النقطة: 1 للسمة تحت 65، 2 حتى 80، 3 فوق 80.</p>';
  }

  function coachTab(p) {
    const comp = G.Coach.competitors(p), info = p.roleInfo || {};
    let h = '<div class="card"><div class="row sb"><h3 style="margin:0">قرار المدرب</h3>' + UI.rolePill(p.role) + '</div><p class="mut">' + esc(info.text || '') + '</p>' +
      '<div class="kv"><span>ثقة المدرب</span><span>' + Math.round(p.trust) + ' — ' + G.Coach.trustLabel(p.trust) + '</span></div>' + UI.bar(p.trust, p.trust < 30 ? 'red' : '') +
      '<div class="kv" style="margin-top:6px"><span>تقييم المدرب لأدائك</span><span>' + G.Coach.evaluation(p) + '</span></div>' +
      '<div class="kv"><span>اللياقة</span><span>' + Math.round(p.fit) + '%</span></div>' +
      (info.diff != null && info.diff > -90 ? '<div class="kv"><span>فارقك عن أضعف أساسي في مركزك</span><b class="' + (info.diff >= 0 ? 'pos' : 'neg') + ' ltr">' + (info.diff > 0 ? '+' : '') + info.diff + '</b></div>' : '') +
      '<div style="margin-top:8px"><div class="sm mut" style="margin-bottom:4px">آخر التقييمات</div>' + UI.formDots(p.form) + '</div></div>';
    h += '<div class="card"><h4>المنافسون على مركزك</h4>' + (comp.length ? '<table class="t"><tr><th class="l">اللاعب</th><th>المركز</th><th>العمر</th><th>التقييم</th><th>فارق</th></tr>' +
      comp.map((q) => { const d = p.ovr - q.ovr; return '<tr><td class="l">' + esc(q.n) + '</td><td>' + q.pos + '</td><td>' + q.age + '</td><td><b>' + q.ovr + '</b></td><td class="ltr ' + (d >= 0 ? 'pos' : 'neg') + '">' + (d > 0 ? '+' : '') + d + '</td></tr>'; }).join('') + '</table>' : '<div class="mut">لا منافسين مباشرين.</div>') + '</div>';
    h += '<div class="notice">لتكسب مكانك: ارفع تقييمك، اجتهد في الدقائق القليلة (تقييم فوق 6.5 يرفع ثقة المدرب)، حافظ على اللياقة، وفكّر في الإعارة إن طالت فترة الجلوس.</div>';
    return h;
  }

  function posTab(p) {
    const opts = G.Coach.positionOptions(p);
    return '<div class="card"><div class="kv"><span>مركزك الحالي</span><b>' + G.POS_AR[p.pos] + ' (' + p.pos + ')</b></div><div class="kv"><span>تقييمك فيه</span><b>' + p.ovr + '</b></div></div>' +
      '<div class="card"><h4>المراكز البديلة (بحسب سماتك الحالية)</h4>' + opts.map((o) => '<div class="row sb" style="padding:7px 0;border-bottom:1px solid rgba(36,50,79,.5)"><span class="grow"><b>' + G.POS_AR[o.pos] + '</b> <span class="mut sm">' + o.pos + '</span></span><span class="ovr sm">' + o.ovr + '</span>' +
        (o.ok ? '<button class="btn sm" data-a="posAsk" data-v="' + o.pos + '">تغيير</button>' : '<span class="pill r">غير مناسب</span>') + '</div>').join('') + '</div>' +
      '<p class="sm mut">يُسمح بالتغيير إذا كان انخفاض التقييم ≤ 4. التغيير يكلّفك قليلًا من ثقة المدرب، وقد يمنحك فرص لعب أكثر إن كان المركز الجديد أقل ازدحامًا في ناديك.</p>';
  }

  UI.screens.train = () => {
    const p = me();
    const tabs = UI.tabs('tr', [['train', 'التدريب'], ['attrs', 'السمات'], ['coach', 'المدرب'], ['pos', 'المركز']], 'train');
    const t = UI.curTab('tr', 'train');
    return tabs + (t === 'train' ? trainTab(p) : t === 'attrs' ? attrsTab(p) : t === 'coach' ? coachTab(p) : posTab(p));
  };

  UI.on('setFocus', (v) => { G.S.training.focus = v; G.Save.save(); });
  UI.on('setIntensity', (v) => { G.S.training.intensity = v; G.Save.save(); });
  UI.on('spendAttr', (k) => {
    const p = me(), r = T().spend(p, k);
    if (!r.ok) { UI.toast(r.reason); return; }
    G.Coach.decide();
    G.Save.save();
    UI.toast(G.Players.ATTR_AR[k] + ' ← ' + p.a[k] + ' · التقييم ' + p.ovr + (r.delta ? ' (+' + r.delta + ')' : ''));
    UI.fx('coin');
  });
  UI.on('posAsk', (pos) => {
    UI.confirm('تغيير المركز إلى ' + G.POS_AR[pos] + '؟', 'سيتغير تقييمك وتُعاد قراءة موقعك في التشكيلة. تنخفض ثقة المدرب قليلًا.', () => {
      const r = G.Coach.changePosition(me(), pos);
      if (r.ok) { G.Coach.decide(); G.Save.save(); }
      UI.toast(r.msg); UI.render();
    }, 'تغيير');
    return false;
  });
})(window.G = window.G || {});
