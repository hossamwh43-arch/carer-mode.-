/* ui_money.js — شاشة «أموالي» (Build 29): الرصيد والدخل والمصروف، الإنفاق ذو الأثر الحقيقي، الاستثمار، وسجل المواسم.
   عرض + أفعال شراء/استثمار فقط؛ كل الأرقام من G.Money (لا U.rnd هنا). */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc, M = () => G.Money;
  UI.titles.money = 'أموالي';
  const money = (v) => UI.money(Math.round(v));
  const line = (lab, v, cls) => '<div class="kv"><span>' + lab + '</span><b class="' + (cls || '') + '">' + (v < 0 ? '−' : '') + money(Math.abs(v)) + '</b></div>';

  function overview() {
    const m = M().st(), pv = M().preview(), c = m.cur, S = G.S;
    const cur = c.s === S.season ? c : { wage: 0, spons: 0, bonus: 0, signing: 0, inv: 0, tax: 0, upkeep: 0, agent: 0, buy: 0 };
    const inc = cur.wage + cur.spons + cur.bonus + cur.signing + Math.max(0, cur.inv), exp = cur.tax + cur.upkeep + cur.agent + cur.buy + Math.max(0, -cur.inv);
    let h = '<div class="card"><h4>' + UI.ico('gem') + ' هذا الأسبوع (تقدير)</h4>' +
      line('الراتب (إجمالي)', pv.wage) + line('الرعاة', pv.spons) +
      line('الضريبة', -pv.tax, 'neg') + line('المعيشة وصيانة الممتلكات', -pv.up, 'neg') +
      '<div class="kv"><span><b>الصافي أسبوعيًا</b></span><b class="' + (pv.net >= 0 ? 'pos' : 'neg') + '">' + (pv.net >= 0 ? '' : '−') + money(Math.abs(pv.net)) + '</b></div>' +
      '<p class="sm mut" style="margin-top:6px">مكافآت المباريات والتوقيع وعمولة الوكيل تُضاف عند حدوثها.' + (S.userExpired ? ' <span class="neg">عقدك منتهٍ: لا راتب حاليًا.</span>' : '') + '</p></div>';
    h += '<div class="card"><h4>' + UI.ico('chart') + ' موسم ' + esc(G.Season.label(S.season)) + ' حتى الآن</h4>' +
      line('الراتب', cur.wage) + line('الرعاة', cur.spons) + (cur.bonus ? line('مكافآت المباريات', cur.bonus) : '') + (cur.signing ? line('مكافآت التوقيع', cur.signing) : '') + (cur.inv > 0 ? line('عائد الاستثمار', cur.inv) : '') +
      line('الضرائب', -cur.tax, 'neg') + line('المعيشة والصيانة', -cur.upkeep, 'neg') + (cur.agent ? line('عمولة الوكيل', -cur.agent, 'neg') : '') + (cur.buy ? line('مشتريات', -cur.buy, 'neg') : '') + (cur.inv < 0 ? line('خسارة الاستثمار', cur.inv, 'neg') : '') +
      '<div class="kv"><span><b>الصافي</b></span><b class="' + (inc - exp >= 0 ? 'pos' : 'neg') + '">' + (inc - exp >= 0 ? '' : '−') + money(Math.abs(inc - exp)) + '</b></div></div>';
    if (m.hist.length) {
      h += '<div class="card"><h4>' + UI.ico('book') + ' المواسم السابقة</h4>' + m.hist.slice().reverse().slice(0, 12).map((x) =>
        '<div class="kv"><span>' + esc(G.Season.label(x.s)) + '</span><span class="sm ltr">دخل ' + money(x.inc) + ' · مصروف ' + money(x.exp) + ' · <b class="' + (x.net >= 0 ? 'pos' : 'neg') + '">' + (x.net >= 0 ? '' : '−') + money(Math.abs(x.net)) + '</b></span></div>').join('') + '</div>';
    }
    return h;
  }

  function spend() {
    const m = M().st();
    let h = '<div class="notice">اشترِ ما يفيد مسيرتك فعلًا — كل مستوى له أثر داخل اللعبة وكلفة صيانة أسبوعية تُخصم من دخلك. عند الترقية تسترد نصف سعر المستوى الحالي.</div>';
    M().KINDS.forEach((k) => {
      const A = M().ASSETS[k], lv = M().level(k), cur = A.lv[lv], nx = M().next(k), cost = M().upgradeCost(k), can = nx && m.bal >= cost;
      h += '<div class="card"><div class="row sb"><h4>' + UI.ico(A.ic) + ' ' + A.ar + '</h4><span class="pill ' + (lv ? 'g' : '') + '">المستوى ' + lv + '/' + (A.lv.length - 1) + '</span></div>' +
        '<div class="sm mut">' + A.desc + '</div>' +
        '<div class="kv"><span>الحالي</span><b>' + esc(cur.ar) + '</b></div><div class="kv"><span>الأثر</span><b>' + esc(cur.txt) + '</b></div>' +
        (nx ? '<div class="kv"><span>التالي</span><b>' + esc(nx.ar) + '</b></div><div class="kv"><span>أثره</span><b>' + esc(nx.txt) + '</b></div>' +
          '<div class="kv"><span>السعر · الصيانة الأسبوعية</span><b class="ltr">' + money(cost) + ' · ' + money(nx.up) + '</b></div>' +
          '<button class="btn ' + (can ? 'pri' : '') + '" data-a="moneyBuy" data-v="' + k + '"' + (can ? '' : ' disabled') + '>' + (can ? 'اشترِ ' + esc(nx.ar) : 'رصيدك لا يكفي') + '</button>' : '<p class="sm pos" style="margin-top:6px">أعلى مستوى متاح.</p>') + '</div>';
    });
    return h;
  }

  function invest() {
    const m = M().st(), I = M().INV;
    let h = '<div class="card"><h4>' + UI.ico('trendup') + ' استثماراتي</h4>' +
      '<div class="grid2"><div class="stat"><b class="mny-n ltr">' + money(m.inv) + '</b><small>المستثمر الآن</small></div><div class="stat"><b class="mny-n ltr">' + money(m.bal) + '</b><small>رصيدك المتاح</small></div></div>' +
      '<p class="sm mut" style="margin-top:8px">يُحسب العائد مرة في نهاية كل موسم بين <b class="ltr">' + Math.round(I.lo * 100) + '٪</b> و<b class="ltr">+' + Math.round((I.lo + I.span) * 100) + '٪</b> (المتوسط +5٪). قد تخسر بعض رأس المال — لا ضمان. أقل مبلغ ' + money(I.min) + '.</p></div>';
    const amts = [50000, 250000, 1000000, 5000000];
    h += '<div class="card"><h4>استثمر</h4><div class="grid2">' + amts.map((a) => '<button class="btn" data-a="moneyInv" data-v="' + a + '"' + (m.bal >= a ? '' : ' disabled') + '>' + money(a) + '</button>').join('') + '</div></div>';
    h += '<div class="card"><h4>اسحب</h4><div class="grid2"><button class="btn" data-a="moneyDiv" data-v="half"' + (m.inv >= 2000 ? '' : ' disabled') + '>نصف المستثمر</button><button class="btn" data-a="moneyDiv" data-v="all"' + (m.inv >= 1000 ? '' : ' disabled') + '>الكل</button></div></div>';
    return h;
  }

  UI.screens.money = () => {
    const m = M().st(), S = G.S, tabs = UI.tabs('mny', [['ov', 'نظرة عامة'], ['sp', 'الإنفاق'], ['iv', 'الاستثمار']], 'ov'), t = UI.curTab('mny', 'ov');
    const hero = '<div class="card"><div class="grid3"><div class="stat"><b class="mny-n ltr">' + money(m.bal) + '</b><small>رصيدك</small></div><div class="stat"><b class="mny-n ltr">' + money(M().netWorth()) + '</b><small>صافي الثروة</small></div><div class="stat"><b class="mny-n ltr">' + money(m.inv) + '</b><small>استثمارات</small></div></div>' +
      '<p class="sm mut" style="margin-top:6px">الحساب يبدأ من ' + esc(G.Season.label(m.since)) + '. صافي الثروة = الرصيد + الاستثمارات + نصف قيمة ممتلكاتك.</p></div>';
    return hero + tabs + (S.phase === 'retired' || t === 'ov' ? overview() : t === 'sp' ? spend() : invest());
  };

  const done = (r, okMsg) => { if (!r.ok) { UI.toast(r.msg); return false; } UI.fx && UI.fx('ping'); UI.toast(okMsg(r)); };
  UI.on('moneyBuy', (k) => done(M().buy(k), (r) => 'تمّ: ' + r.lv.ar));
  UI.on('moneyInv', (v) => done(M().invest(Number(v)), (r) => 'استثمرتَ ' + money(r.amt)));
  UI.on('moneyDiv', (v) => { const m = M().st(); return done(M().divest(v === 'all' ? m.inv : Math.floor(m.inv / 2)), (r) => 'سحبتَ ' + money(r.amt)); });
})(window.G = window.G || {});
