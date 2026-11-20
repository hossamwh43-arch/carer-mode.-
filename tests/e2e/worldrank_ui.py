"""تصنيفات العالم (Build 26): البلاطة تفتح الشاشة، الأقسام الثلاثة تتبدّل فعلًا، القائمة محدودة بأفضل 50 مع صف ناديك/منتخبك،
الأرشيف يمتلئ بعد موسم كامل ويسلم من إعادة التحميل، وقائمة الكرة الذهبية تعرض 20. بلا رموز خام ولا تمرير أفقي ولا أخطاء.
الاستخدام: python3 tests/e2e/worldrank_ui.py [مجلد_اللقطات] [العرض=390]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
SEASON_JS = """(()=>{const T=G.Transfers;G.S.tour=9;for(let i=0;i<80;i++){const r=G.Sim.run({mode:'event',autoDP:true});if(G.S.offers&&G.S.offers.length)G.S.offers.slice().forEach(o=>T.rejectOffer(o.id));if(G.S.phase==='end'||(r&&r.run&&r.run.stop&&r.run.stop.reason==='end'))break;}
if(G.S.intl&&!G.S.intl.done)G.Intl.autoFinish();const rr=G.Season.rollover();return rr.ok})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    S = lambda js: ev(page, js)
    new_game(page); play_weeks(page, 14)

    # الكرة الذهبية: 20 مرشحًا بدل 15
    S("G.UI.cur='bd'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    nb = len(page.query_selector_all('tr[data-a="bdPlayer"]'))
    check(nb == 20, 'الكرة الذهبية تعرض %d مرشحًا (المطلوب 20 بدل 15)' % nb)

    # البلاطة في «المزيد» تفتح الشاشة
    S("G.UI.cur='more'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(200)
    check(page.query_selector('.tile[data-v="worldrank"]') is not None, '%s: بلاطة «تصنيفات العالم» في المزيد' % VW)
    page.click('.tile[data-v="worldrank"]'); page.wait_for_timeout(250)
    check(S('G.UI.cur') == 'worldrank', 'البلاطة تفتح شاشة التصنيفات')
    check(len(page.query_selector_all('.sw .tabs .tab')) == 3 and len(page.query_selector_all('.tabs:not(.inline)')) == 1, 'شريط التبويبات الموحّد معروض فعلًا (3 تبويبات في شريط واحد)')
    # Build 27: أقسام المجموعة صارت في قائمة العنوان (الشريط الواحد لتبويبات الصفحة فقط)
    page.click('#topTitle'); page.wait_for_timeout(300)
    check('التصنيفات' in S("document.querySelector('.sec-row.on')?.textContent||''"), 'قائمة العنوان تُظهر «التصنيفات» نشطًا ضمن مجموعة «المزيد»')
    S("G.UI.closeSheet()"); page.wait_for_timeout(250)

    # الأندية
    check(len(page.query_selector_all('.wr-pod')) == 3 and page.query_selector('.wr-pod.p1') is not None, 'منصة أول ثلاثة أندية')
    rows = page.query_selector_all('.wr-board .wr-row')
    me = page.query_selector_all('.wr-row.me')
    check(50 <= len(rows) <= 51, 'الأندية: أفضل 50 فقط (+ صف ناديك إن كان خارجها) — %d صفًا' % len(rows))
    check(len(me) == 1, 'صف ناديك مميَّز مرة واحدة (%d)' % len(me))
    pos = [int(e.inner_text()) for e in page.query_selector_all('.wr-board .wr-pos')]
    check(pos[:50] == list(range(1, 51)), 'الترتيب 1..50 متصل')
    scores = S("[...document.querySelectorAll('.wr-board .wr-score > b')].map(e=>+e.textContent.replace(/,/g,''))")
    check(all(scores[i] >= scores[i + 1] for i in range(49)), 'النقاط تنازلية')
    check(not page.query_selector('.wr-mv'), 'قبل أول أرشيف لا أسهم صعود/هبوط مضلِّلة')
    check(not ev(page, EMOJI_JS), 'لا رموز خام: %s' % ev(page, EMOJI_JS))
    nohs(page, 'الأندية'); overflow(page, 'الأندية'); shot(page, 'wr_clubs', True)

    # المنتخبات
    page.click('.tabs .tab[data-v2="nations"]'); page.wait_for_timeout(250)
    check(S('G.UI.sub.wr') == 'nations' and 'أقوى منتخبات' in S("document.querySelector('.wr-hero h2').textContent"), 'تبويب المنتخبات يعمل')
    rows = page.query_selector_all('.wr-board .wr-row')
    check(50 <= len(rows) <= 51 and len(page.query_selector_all('.wr-row.me')) == 1, 'المنتخبات: أفضل 50 + صف منتخبك (%d)' % len(rows))
    check(not ev(page, EMOJI_JS), 'المنتخبات: لا رموز خام')
    nohs(page, 'المنتخبات'); overflow(page, 'المنتخبات'); shot(page, 'wr_nations', True)

    # الأرشيف فارغ قبل أول موسم
    page.click('.tabs .tab[data-v2="history"]'); page.wait_for_timeout(250)
    check('لا يمكن توليد تاريخ' in txt(page), 'الأرشيف قبل أول موسم: رسالة صريحة بلا بيانات مختلقة')
    nohs(page, 'أرشيف فارغ')

    # موسم كامل ⇒ أرشيف واحد
    ok = S(SEASON_JS)
    check(ok is True, 'موسم كامل + rollover نجح')
    n1 = S("(G.S.worldRankHistory||[]).length")
    check(n1 == 1, 'سجل أرشيف واحد بعد موسم (%s)' % n1)
    S("G.UI.cur='worldrank'; G.UI.sub={wr:'history'}; G.UI.render()"); page.wait_for_timeout(250)
    check(len(page.query_selector_all('table.t tr[data-a="wrYear"]')) == 1, 'جدول الأرشيف فيه سنة واحدة')
    check(len(page.query_selector_all('.wr-board')) == 2 and all(len(e.query_selector_all('.wr-row')) == 10 for e in page.query_selector_all('.wr-board')), 'قائمتا أفضل 10 أندية ومنتخبات للسنة')
    page.click('table.t tr[data-a="wrYear"]'); page.wait_for_timeout(200)
    check('أفضل 10 أندية' in txt(page), 'الضغط على السنة يعرض تفاصيلها')
    nohs(page, 'أرشيف'); overflow(page, 'أرشيف'); shot(page, 'wr_history', True)

    # بعد الأرشيف: أسهم الحركة تظهر في التصنيف الحي
    S("G.UI.cur='worldrank'; G.UI.sub={wr:'clubs'}; G.UI.render()"); page.wait_for_timeout(250)
    check(page.query_selector('.wr-mv') is not None, 'بعد أول أرشيف تظهر مقارنة المراكز')
    check(not ev(page, EMOJI_JS), 'بعد الأرشيف: لا رموز خام')

    # الحفظ والتحميل
    S("G.Save.save(true)"); page.goto(common.URL); page.wait_for_selector('#app'); page.wait_for_timeout(400)
    n2 = S("(G.S && G.S.worldRankHistory || []).length")
    check(n2 == 1, 'الأرشيف يسلم من حفظ وإعادة تحميل الصفحة (%s)' % n2)

    check(not errors, 'لا أخطاء JS: %s' % errors[:2])
    b.close()
finish()
