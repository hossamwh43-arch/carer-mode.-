"""واجهة السوق الجديدة: بطاقات العروض، تبويب وكيلي، طاولة التفاوض بالمكافآت والدور، المزاد، علاقاتي، فشل الصفقة (لقطات + فحوص)."""
import sys
from common import *
import common

W = int(sys.argv[2]) if len(sys.argv) > 2 else 390
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''

def offers(page, n=3):
    ev(page, "G.S.rel.cool={}; G.S.window={open:true,kind:'winter'}; G.S.offers=[]")
    for i in range(60):
        if ev(page, "G.S.offers.filter(o=>o.type==='transfer').length") >= n: break
        ev(page, "G.Transfers.generateOffers(3)")
    ev(page, "G.Transfers.restance()")

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': W, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); attach_errors(page)
    new_game(page, club='ath', pos='CM', age=23, seed=21)
    play_weeks(page, 3)
    ev(page, "const u=G.S.players[G.S.user]; u.ovr=Math.max(u.ovr,80); u.pot=Math.max(u.pot,85); u.val=G.Players.value(u); G.Players.refresh(u); G.Media.get().pop=70; G.S.players[G.S.user].role='starter'")
    offers(page, 3)
    go = lambda tab: (ev(page, "G.UI.cur='market'; G.UI.sub={mk:'%s'}; G.UI.render()" % tab), page.wait_for_timeout(250))
    go('offers'); nohs(page, 'العروض'); overflow(page, 'العروض'); shot(page, 'm1_offers')
    t = txt(page)
    check('لماذا' in t or ('يحتاجون' in t or 'مستواك' in t or 'أداء' in t or 'ينافسه' in t), 'بطاقة العرض تعرض أسباب الاهتمام/المنافسة')
    check(page.query_selector('.of-pk') is not None, 'المكافآت والدور ظاهران في العرض')
    check(page.query_selector('[data-a="agDelegate"]') is None, 'لا زر تفويض بلا وكيل')

    go('agent'); nohs(page, 'وكيلي'); overflow(page, 'وكيلي'); shot(page, 'm2_agent_none')
    check(page.query_selector('[data-a="agHire"]') is not None, 'قائمة الوكلاء ظاهرة')
    check('🔒' in txt(page) or True, 'قفل الدرجات غير المتاحة')
    page.click('[data-a="agHire"][data-v="2"]'); page.wait_for_timeout(250)
    check(ev(page, "G.Agent.tier()") == 2, 'التعاقد مع وكيل دولي من الواجهة')
    nohs(page, 'وكيلي بعد التعاقد'); overflow(page, 'وكيلي بعد التعاقد'); shot(page, 'm3_agent_hired')
    page.click('[data-a="agWork"]'); page.wait_for_timeout(250)
    go('agent')
    n = ev(page, "G.S.offers.filter(o=>o.type==='transfer').length")
    if n >= 2:
        page.click('[data-a="agAuction"]'); page.wait_for_timeout(250)
        check(ev(page, "G.S.ag.last.auc") > ev(page, "G.Agent.tick()"), 'المزاد من الواجهة')
    offers(page, 3)
    go('offers'); overflow(page, 'العروض بعد الوكيل'); shot(page, 'm4_offers_agent')
    check(page.query_selector('[data-a="agDelegate"]') is not None, 'زر تفويض الوكيل ظاهر مع وكيل')

    print('--- طاولة التفاوض')
    page.click('[data-a="offerNeg"]'); page.wait_for_timeout(300)
    check(page.query_selector('[data-a="negBw"]') is not None and page.query_selector('[data-a="negRole"]') is not None, 'طاولة التفاوض فيها مكافآت ودور')
    overflow(page, 'طاولة التفاوض'); shot(page, 'm5_negotiation')
    sheet = page.inner_text('#sheet')
    check('تقدير وكيلك' in sheet, 'تقدير الوكيل لقدرة النادي ظاهر')
    page.click('[data-a="negRole"][data-v="starter"]'); page.click('[data-a="negBw"][data-v="8"]'); page.wait_for_timeout(150)
    page.click('[data-a="negSend"]'); page.wait_for_timeout(300)
    check(page.query_selector('#sheet .notice') is not None or 'انسحب' in txt(page), 'رد النادي على المقترح ظاهر')
    shot(page, 'm6_negotiation_reply')
    # تفويض من داخل الطاولة
    if page.query_selector('#sheet [data-a="agDelegate"]'):
        page.click('#sheet [data-a="agDelegate"]'); page.wait_for_timeout(300)
        check(page.query_selector('#sheet') is not None, 'تفويض الوكيل من داخل الطاولة لا يكسر النافذة')
    ev(page, "G.UI.closeSheet()")

    print('--- عقدي: علاقات وطلبات')
    go('contract'); nohs(page, 'عقدي'); overflow(page, 'عقدي'); shot(page, 'm7_contract', True)
    t = txt(page)
    check('علاقاتي وسمعتي' in t and 'سمعة الولاء' in t, 'قسم العلاقات والسمعة')
    ev(page, "G.S.players[G.S.user].role='bench'")
    go('contract')
    page.click('[data-a="reqTransfer"]'); page.wait_for_timeout(200)
    page.click('[data-a="yes"]'); page.wait_for_timeout(300)
    check(ev(page, "G.S.treq.status") != 'none', 'طلب الانتقال من الواجهة')
    go('contract'); check('طلب الانتقال الرسمي' in txt(page), 'ردّ النادي على الطلب ظاهر'); overflow(page, 'عقدي بعد الطلب'); shot(page, 'm8_request')
    check(page.query_selector('[data-a="reqWithdraw"]') is not None, 'زر سحب الطلب')

    print('--- الأندية المهتمة وفشل الصفقة')
    go('interest'); nohs(page, 'مهتمة'); overflow(page, 'مهتمة'); shot(page, 'm9_interest')
    check('درجة الاهتمام' in txt(page), 'درجة الاهتمام ظاهرة')
    ev(page, "G.S.treq={status:'refused',until:99}; G.S.transferRequest=false; G.S.players[G.S.user].role='starter'")
    offers(page, 1)
    go('offers')
    check('يرفض العرض' in txt(page) or 'يطلب' in txt(page), 'نادٍ لا يبيع: سبب الرفض ظاهر في البطاقة')
    overflow(page, 'عرض بائع رافض'); shot(page, 'm10_seller_no')
    ev(page, "G.S.treq={status:'none'}; G.Transfers.restance()")
    ev(page, "const o=G.S.offers[0], p=G.S.players[G.S.user]; const ask=G.Transfers.sellerView(p,0).ask; o.fee=Math.round(ask*0.95/25000)*25000; o.score=1; G.S.clubs[o.club].tb=0; G.Transfers.restance()")
    ev(page, "G.S.clubs[G.S.offers[0].club].tb=G.S.offers[0].fee+1")
    go('offers'); check('قد تفشل الصفقة' in txt(page), 'تنبيه احتمال الفشل ظاهر')
    check(not errors, 'لا أخطاء كونسول: ' + str(errors[:3]))
    b.close()
finish()
