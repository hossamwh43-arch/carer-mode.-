"""الكرة الذهبية الشهرية (Build 28): شريط أشهر بعدد اللقطات المحفوظة، الضغط على شهر يعرض ترتيبه هو (لا الأحدث)، سباق المتصدّرين برسم 5 خطوط،
أهداف لمس ≥ 44px، لا تمرير أفقي ولا رموز خام، وبعد موسم كامل يظهر شريط 10 لقطات ورحلة السباق في أرشيف الحفل.
الاستخدام: python3 tests/e2e/bd_months_ui.py [مجلد_اللقطات] [العرض=390]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
SEASON_JS = """(()=>{const T=G.Transfers;G.S.tour=9;for(let i=0;i<80;i++){const r=G.Sim.run({mode:'event',autoDP:true});if(G.S.offers&&G.S.offers.length)G.S.offers.slice().forEach(o=>T.rejectOffer(o.id));if(G.S.phase==='end'||(r&&r.run&&r.run.stop&&r.run.stop.reason==='end'))break;}
if(G.S.intl&&!G.S.intl.done)G.Intl.autoFinish();return true})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    S = lambda js: ev(page, js)
    new_game(page); play_weeks(page, 14)
    nm = S("G.BD.months().length")
    check(nm >= 3, '%d: بعد 14 أسبوعًا توجد %d لقطات شهرية (≥ 3)' % (VW, nm))
    S("G.UI.cur='bd'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    chips = page.query_selector_all('.bd-months .chip')
    check(len(chips) == nm, 'شريط الأشهر بعدد اللقطات (%d/%d)' % (len(chips), nm))
    check(len(page.query_selector_all('.bd-months .chip.on')) == 1, 'شهر واحد نشط')
    check(page.query_selector('.bd-race') is not None, 'رسم سباق المتصدّرين ظاهر')
    check(len(page.query_selector_all('.bd-race .bd-ln')) >= 3, 'خطوط السباق مرسومة (%d)' % len(page.query_selector_all('.bd-race .bd-ln')))
    leg = page.query_selector_all('.bd-lg')
    check(len(leg) == 5, 'مفتاح الرسم 5 لاعبين')
    hs = S("[...document.querySelectorAll('.bd-lg,.bd-months .chip')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in hs), 'أهداف اللمس ≥ 44px (%s)' % min(hs))
    first_leader = S("document.querySelector('tr[data-a=\"bdPlayer\"] td:nth-child(2), tr[data-a=\"bdPlayer\"]').textContent.trim().slice(0,40)")
    # شهر قديم يعرض ترتيبه هو
    page.click('.bd-months .chip:first-child'); page.wait_for_timeout(300)
    check(S('G.UI.sub.bdK') == 1, 'الضغط على الشهر الأول يحفظ الاختيار')
    check('ترتيب شهر سابق' in txt(page), 'العنوان يوضّح أنه شهر سابق')
    rows_old = S("[...document.querySelectorAll('tr[data-a=\"bdPlayer\"]')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,30))")
    S("G.UI.sub.bdK=null; G.UI.render()"); page.wait_for_timeout(250)
    rows_new = S("[...document.querySelectorAll('tr[data-a=\"bdPlayer\"]')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,30))")
    check(rows_old != rows_new, 'ترتيب الشهر الأول يختلف عن الأحدث فعلًا')
    check(len(rows_old) >= 10, 'الشهر القديم يعرض قائمة (%d)' % len(rows_old))
    # فتح لاعب من مفتاح الرسم
    page.click('.bd-lg:first-child'); page.wait_for_timeout(300)
    check(len(S("document.getElementById('sheet').innerText")) > 20 and not S("document.getElementById('sheetWrap').classList.contains('hidden')"), 'نافذة اللاعب تُفتح بمحتوى')
    S("G.UI.closeSheet()"); page.wait_for_timeout(250)
    check(not ev(page, EMOJI_JS), 'لا رموز خام: %s' % ev(page, EMOJI_JS))
    nohs(page, 'bd'); overflow(page, 'bd'); shot(page, 'bd_months', True)

    # موسم كامل: 10 لقطات محفوظة؛ بعد الحفل تعرض الصفحة النتيجة + رحلة السباق شهرًا بشهر + رسم السباق الكامل
    S(SEASON_JS)
    check(S("G.BD.months().length") == 10 and S("G.BD.months()[9].final"), 'موسم كامل: 10 لقطات آخرها النهائية')
    S("G.UI.cur='bd'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    check(S("G.S.bd.cur.done") and 'رحلة السباق شهرًا بشهر' in txt(page), 'بعد الحفل: الصفحة تعرض «رحلة السباق شهرًا بشهر»')
    check(page.query_selector('.bd-race') is not None, 'بعد الحفل: رسم سباق الموسم كاملًا')
    nrow = S("[...document.querySelectorAll('.card')].find(c=>c.textContent.includes('رحلة السباق شهرًا بشهر')).querySelectorAll('tr').length")
    check(nrow == 11, 'جدول الرحلة: ترويسة + 10 أشهر (%s)' % nrow)
    check(not ev(page, EMOJI_JS), 'لا رموز خام بعد الحفل: %s' % ev(page, EMOJI_JS))
    nohs(page, 'bd full'); overflow(page, 'bd full'); shot(page, 'bd_full', True)
    check(S("G.Season.rollover().ok"), 'rollover')
    S("G.UI.cur='bd'; G.UI.sub={bd:'hist'}; G.UI.render()"); page.wait_for_timeout(300)
    row = page.query_selector('[data-a="bdCer"]')
    check(row is not None, 'أرشيف الحفلات فيه صف')
    if row:
        row.click(); page.wait_for_timeout(350)
        check('رحلة السباق شهرًا بشهر' in S("document.getElementById('sheet').innerText") or 'رحلة السباق شهرًا بشهر' in txt(page), 'ورقة الحفل السابق تعرض الرحلة')
        nohs(page, 'ceremony'); overflow(page, 'ceremony'); shot(page, 'bd_ceremony', True)
    finish()
