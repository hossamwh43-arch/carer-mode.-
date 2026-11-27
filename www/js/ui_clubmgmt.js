/* ui_clubmgmt.js — Build 34: شاشة «إدارة النادي» (المالية والمنشآت). عرض فقط من بيانات اللعبة الحقيقية: لا حالة جديدة ولا حفظ ولا عشوائية.
   المصادر: club.tb (ميزانية الانتقالات) · club.wcap (سقف الرواتب) · Players.wageBill · club.rep · Training.facility (معامل مرافق التدريب الذي يضرب XP تدريبك فعلًا).
   لا توجد في بيانات اللعبة أسماء ملاعب أو سعات جماهيرية، لذا لا تُعرض أرقام من هذا النوع (لا اختلاق). */
(function (G) {
  'use strict';
  const UI = G.UI, U = G.U, esc = UI.esc;
  const me = () => G.S.players[G.S.user];

  UI.titles.facilities = 'إدارة النادي';

  // معامل المرافق (≈0.8–1.08) → تقييم 0–100 ووصف
  const facRating = (f) => Math.round(U.clamp((f - 0.7) / 0.45, 0, 1) * 100);
  const facTier = (r) => (r >= 85 ? 'عالمية' : r >= 68 ? 'ممتازة' : r >= 50 ? 'جيدة' : r >= 30 ? 'متوسطة' : 'متواضعة');

  UI.screens.facilities = () => {
    const S = G.S, u = me(), cid = u.club, c = S.clubs[cid];
    if (!c) return UI.empty('club', 'لا بيانات للنادي');
    const peers = Object.keys(S.clubs).map((id) => S.clubs[id]).filter((x) => x && x.lg === c.lg), rank = peers.filter((x) => x.rep > c.rep).length + 1;
    const bill = G.Players.wageBill(c), cap = c.wcap || 0, room = cap - bill, used = cap > 0 ? Math.round((bill / cap) * 100) : 0;
    const val = U.sum(c.squad.map((id) => { const p = S.players[id]; return p && p.val ? p.val : 0; }));
    const fac = G.Training.facility(cid), fr = facRating(fac);
    const tr = S.league && S.league.table ? S.league.table[cid] : null, pos = tr && S.phase === 'season' && G.League ? G.League.position(cid) : 0;
    const fm = S.league && S.phase === 'season' && UI.lgForm ? (UI.lgForm(S.league)[cid] || []) : [];
    const chips = [esc(G.leagueName(c.lg)), 'سمعة ' + c.rep, pos ? 'المركز ' + pos : ''];
    let h = UI.cineClub(cid, c.name, 'إدارة النادي', chips);
    h += '<div class="kpi-row">' + UI.kpi('سمعة النادي', c.rep, { tone: 'y' }) + UI.kpi('ترتيبه بين ' + peers.length + ' نادٍ', rank, { sub: 'بالسمعة' }) + UI.kpi('قيمة التشكيلة', UI.money(val)) + '</div>';

    // المالية
    h += UI.secHead('المالية') + '<div class="pnl">' +
      UI.lrow({ ic: 'gem', t: 'ميزانية الانتقالات', s: 'ما يستطيع ناديك دفعه في الصفقات', val: UI.money(c.tb) }) +
      UI.lrow({ ic: 'users', t: 'سقف الرواتب الأسبوعي', val: UI.money(cap) }) +
      UI.lrow({ ic: 'chart', t: 'فاتورة الرواتب الأسبوعية', s: 'مجموع عقود التشكيلة', val: UI.money(bill) }) +
      '<div class="lrow mg-bar"><span class="lr-t"><b>استخدام سقف الرواتب</b><small>' + (room >= 0 ? 'متاح ' + UI.money(room) + ' أسبوعيًا لصفقات جديدة' : 'تجاوز السقف بـ ' + UI.money(-room)) + '</small></span><span class="lr-v">' + used + '٪</span></div>' +
      '<div class="mg-barw">' + UI.bar(used, used > 100 ? 'red' : used > 92 ? 'gold' : 'blue') + '</div></div>';

    // المنشآت
    h += UI.secHead('المنشآت') + '<div class="pnl"><div class="lrow mg-fac"><span class="lr-ic">' + UI.ico('dumbbell') + '</span><span class="lr-t"><b>مرافق التدريب · ' + facTier(fr) + '</b>' +
      '<small>تضرب مكاسب خبرة تدريبك الأسبوعي بمعامل ×' + fac.toFixed(2) + ' وتتبع سمعة النادي</small></span><span class="lr-v">' + fr + '</span></div>' +
      '<div class="mg-barw">' + UI.bar(fr, fr >= 68 ? '' : 'gold') + '</div></div>';

    // الأداء
    if (tr && pos) {
      h += UI.secHead('أداء الموسم') + '<div class="pnl"><div class="lrow"><span class="lr-t"><b>المركز ' + pos + ' · ' + tr.pts + ' نقطة</b><small>' + tr.p + ' مباراة · ' + tr.w + ' فوز · ' + tr.d + ' تعادل · ' + tr.l + ' خسارة · فارق ' + (tr.gf - tr.ga >= 0 ? '+' : '') + (tr.gf - tr.ga) + '</small></span>' + (fm.length ? UI.formStrip(fm) : '') + '</div></div>';
    }

    // الإدارة: اختصارات إلى الأقسام الفعلية
    h += UI.secHead('الإدارة') + '<div class="pnl">' +
      UI.lrow({ ic: 'clipboard', t: 'المدرب والخطة', s: c.mgr ? 'قرارات المدرب وثقته بك' : '', act: 'go', v: 'club' }) +
      UI.lrow({ ic: 'shirt', t: 'التشكيلة', s: c.squad.length + ' لاعبًا', act: 'go', v: 'squad' }) +
      UI.lrow({ ic: 'dumbbell', t: 'التدريب', act: 'go', v: 'train' }) +
      UI.lrow({ ic: 'swap', t: 'الانتقالات والعقود', act: 'go', v: 'market' }) +
      UI.lrow({ ic: 'gem', t: 'أموالي', s: 'رصيدك وإنفاقك واستثماراتك', act: 'go', v: 'money' }) + '</div>';
    return h;
  };
})(window.G = window.G || {});
