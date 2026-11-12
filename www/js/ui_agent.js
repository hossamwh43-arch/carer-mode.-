/* ui_agent.js — تبويب «وكيلي» في سوق الانتقالات: اختيار الوكيل، البحث عن عروض، المزاد، وسجل رسائله */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];
  const A = () => G.Agent;
  const tile = (lab, val, unit, cls) => '<div class="of-t' + (cls ? ' ' + cls : '') + '"><small>' + lab + '</small><b>' + val + '</b>' + (unit ? '<i>' + unit + '</i>' : '') + '</div>';
  const winOpen = () => !!(G.S.window && G.S.window.open);

  function mine() {
    const S = G.S, a = S.ag, t = A().info(), tick = A().tick();
    const liveN = (S.offers || []).filter((o) => o.type === 'transfer' && o.status !== 'withdrawn').length;
    const wl = Math.max(0, a.last.work - tick), al = Math.max(0, a.last.auc - tick);
    let h = '<section class="agx"><div class="agx-top"><div class="agx-av">' + esc(a.name.charAt(0)) + '</div><div class="agx-in"><small>وكيل أعمالك</small><h2>' + esc(a.name) + '</h2><span class="pill y">' + t.ar + '</span></div></div>' +
      '<div class="of-tiles">' + tile('العمولة', Math.round(t.rate * 100), '٪ من العقد') + tile('سقف الراتب', '+' + Math.round(t.wage * 100), '٪') + tile('محاولات التفاوض', t.tries, '') + '</div>' +
      '<div class="agx-st"><div class="rl"><div class="row sb sm"><span>ثقة الوكيل بك</span><b>' + A().relLabel(a.rel) + '</b></div>' + UI.bar(Math.round(a.rel), 'blue') + '</div>' +
      '<div class="row sb sm" style="margin-top:8px"><span class="mut">صفقات أنجزها: <b>' + (a.deals || 0) + '</b></span><span class="mut">عمولاته: <b>' + UI.money(a.fees || 0) + '</b></span></div></div>' +
      '<div class="of-act"><button class="btn pri" data-a="agWork"' + (winOpen() && !wl ? '' : ' disabled') + '>🔎 ابحث لي عن عروض' + (wl ? ' (بعد ' + wl + ' أسبوع)' : '') + '</button>' +
      '<div class="of-sec"><button class="btn" data-a="agAuction"' + (winOpen() && liveN >= 2 && !al ? '' : ' disabled') + '>⚖️ مزاد بين العروض' + (al ? ' (بعد ' + al + ')' : '') + '</button>' +
      '<button class="btn red" data-a="agFire">إنهاء التعاقد</button></div>' +
      (!winOpen() ? '<div class="sm mut" style="margin-top:8px">يعمل وكيلك أثناء نافذة الانتقالات فقط.</div>' : liveN < 2 ? '<div class="sm mut" style="margin-top:8px">المزاد يحتاج عرضين على الأقل. اطلب من وكيلك البحث عن عروض أو اطلب عروضًا من تبويب «الأندية المهتمة».</div>' : '<div class="sm mut" style="margin-top:8px">المزاد يرفع أفضل عرض ويُخرج من لا يقدر على المجاراة؛ قد تخسر بعض العروض.</div>') + '</div></section>';
    const msgs = a.msgs || [];
    if (msgs.length) h += '<div class="card"><h4>رسائل وكيلك</h4>' + msgs.slice(0, 6).map((m) => '<div class="msg"><div class="sm mut">' + G.Season.label(m.s) + ' · أسبوع ' + m.w + '</div><div>' + esc(m.t) + '</div></div>').join('') + '</div>';
    return h;
  }

  function tiers() {
    const has = A().has(), cur = A().tier();
    let h = '<div class="card"><h4>' + (has ? 'تغيير الوكيل' : 'اختر وكيل أعمالك') + '</h4>' +
      (has ? '' : '<p class="sm mut" style="margin:0 0 10px">الوكيل يبحث لك عن العروض، ويفاوض الأندية نيابةً عنك، ويدير مزادًا بين الأندية المتنافسة ويرفع سقف الراتب الذي تحصل عليه، مقابل عمولة من كل عقد يبرمه. بدونه تفاوض بنفسك وتبقى لك كل العمولة.</p>') + '</div>';
    for (let t = 1; t <= 3; t++) {
      const x = A().TIERS[t], e = A().eligible(t);
      h += '<div class="card agx-t' + (t === cur ? ' cur' : '') + '"><div class="row sb"><b>' + x.ar + '</b><span class="pill ' + (t === cur ? 'g' : '') + '">' + (t === cur ? 'وكيلك الحالي' : 'عمولة ' + Math.round(x.rate * 100) + '٪') + '</span></div>' +
        '<div class="sm mut" style="margin:4px 0 8px">' + x.desc + '</div>' +
        '<ul class="agx-pk"><li>سقف راتب أعلى +' + Math.round(x.wage * 100) + '٪</li><li>عروض أكثر ×' + x.offers.toFixed(2).replace(/0$/, '') + '</li><li>' + x.tries + ' محاولات تفاوض</li><li>مزاد من ' + x.rounds + (x.rounds === 1 ? ' جولة' : x.rounds === 2 ? ' جولتين' : ' جولات') + '</li></ul>' +
        (t === cur ? '' : e.ok ? '<button class="btn' + (t > cur ? ' gold' : '') + '" data-a="agHire" data-v="' + t + '">' + (has ? (t > cur ? '⬆️ ترقية إلى ' : 'التحويل إلى ') : 'تعاقد مع ') + x.ar + '</button>' : '<div class="notice" style="margin:0">🔒 ' + e.why + '</div>') + '</div>';
    }
    return h;
  }

  UI.agentTab = () => {
    if (me().parentPays) return '<div class="card mut c">لا يمكن لوكيلك التفاوض أثناء الإعارة.</div>';
    return (A().has() ? mine() : '') + tiers();
  };

  UI.on('agHire', (t) => {
    const r = A().hire(+t); G.Save.save();
    UI.toast(r.ok ? 'تعاقدتَ مع ' + G.S.ag.name : r.msg);
  });
  UI.on('agFire', () => {
    UI.confirm('إنهاء التعاقد؟', 'ستفاوض بنفسك وتفقد مزايا الوكيل (سقف الراتب، المزاد، البحث عن العروض). لا عمولة جديدة بعد الآن.', () => { const r = A().fire(); G.Save.save(); UI.toast(r.ok ? 'أنهيتَ التعاقد' : r.msg); UI.render(); }, 'أنهِ التعاقد');
    return false;
  });
  UI.on('agWork', () => { const r = A().work(); G.Save.save(); UI.toast(r.msg); if (r.ok && r.n) UI.sub.mk = 'offers'; });
  UI.on('agAuction', () => { const r = A().auction(); G.Save.save(); UI.toast(r.msg); if (r.ok) UI.sub.mk = 'offers'; });
  UI.on('agDelegate', (id) => {
    const r = A().delegate(id); G.Save.save(); UI.toast(r.msg);
    if (r.collapsed) { if (UI._sheetFn) UI.closeSheet(); UI.banner('opp', 'انسحب النادي', r.msg); return; }
    if (UI.negRefresh && UI.negRefresh(r.msg)) return false;
  });
  UI.on('agPushFee', (id) => {
    const r = A().pushFee(id); G.Save.save(); UI.toast(r.msg);
    if (r.collapsed) UI.banner('opp', 'انهارت الصفقة', r.msg);
  });
})(window.G = window.G || {});
