"""تصنيف الأندية بالنوافذ (Build 28): شريط 6 أزرار (الجاري/1/5/10/50/100)، كل نافذة تعرض منصة وقائمة 50 (+ ناديك) بنقاط تنازلية،
بطاقة مصدر البيانات (حقيقي/تقديري)، بطاقة مكانة ناديك بخمس نوافذ، لا رموز خام ولا تمرير أفقي وأهداف لمس ≥ 44px؛ وبعد موسم كامل
تصير نافذة السنة حقيقية بالكامل وتظهر ألقاب الأبطال الفعلية.
الاستخدام: python3 tests/e2e/worldrank_windows_ui.py [مجلد_اللقطات] [العرض=390]"""
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
    new_game(page)
    S("G.UI.cur='worldrank'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    chips = page.query_selector_all('.wr-win .chip')
    check(len(chips) == 6, '%d: شريط النوافذ 6 أزرار (%d)' % (VW, len(chips)))
    check(chips[0].inner_text().strip() == 'الموسم الجاري' and 'on' in chips[0].get_attribute('class'), 'الافتراضي: الموسم الجاري')
    hs = S("[...document.querySelectorAll('.wr-win .chip')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in hs), 'أهداف لمس الشريط ≥ 44px (%s)' % min(hs))
    for n, lab in [(1, 'آخر سنة'), (5, 'آخر 5 سنوات'), (10, 'آخر 10 سنوات'), (50, 'آخر 50 سنة'), (100, 'آخر 100 سنة')]:
        page.click('.wr-win .chip[data-v="%d"]' % n); page.wait_for_timeout(280)
        check(S('G.UI.sub.wrWin') == n and lab in txt(page), '%s: النافذة تُعرض' % lab)
        check(len(page.query_selector_all('.wr-pod')) == 3, '%s: منصة ثلاثة' % lab)
        rows = page.query_selector_all('.wr-board .wr-row')
        check(50 <= len(rows) <= 51, '%s: 50 صفًا (+ناديك) = %d' % (lab, len(rows)))
        sc = S("[...document.querySelectorAll('.wr-board .wr-score > b')].map(e=>+e.textContent.replace(/,/g,''))")
        top = sc[:50]
        check(all(top[i] >= top[i + 1] for i in range(len(top) - 1)), '%s: النقاط تنازلية' % lab)
        check(len(page.query_selector_all('.wr-mine .wr-ranks > div')) == 5 and len(page.query_selector_all('.wr-mine .wr-ranks > div.on')) == 1, '%s: مكانة ناديك بخمس نوافذ' % lab)
        check('تقديري' in txt(page) and '0 حقيقي' in txt(page), '%s: التقدير مُعلَن قبل أي موسم' % lab)
        check(len(page.query_selector_all('.wr-row.me')) == 1, '%s: صف ناديك مميَّز مرة واحدة' % lab)
        check(not ev(page, EMOJI_JS), '%s: لا رموز خام' % lab)
        nohs(page, lab); overflow(page, lab)
        if n in (1, 100): shot(page, 'wrwin_%d' % n, True)
    # العودة للجاري تحفظ السلوك القديم
    page.click('.wr-win .chip[data-v="now"]'); page.wait_for_timeout(250)
    check('ترتيب الموسم' in txt(page) and len(page.query_selector_all('.wr-pod')) == 3, 'الجاري: السلوك القديم كما هو')
    # بعد موسم كامل: نافذة السنة حقيقية + ألقاب فعلية
    check(S(SEASON_JS), 'موسم كامل + rollover')
    S("G.UI.cur='worldrank'; G.UI.sub={wrWin:1}; G.UI.render()"); page.wait_for_timeout(300)
    check('1 حقيقي' in txt(page) and 'كل هذه المواسم لُعبت فعلًا' in txt(page), 'نافذة السنة: مصدرها حقيقي بالكامل')
    check('ألقاب مواسمك' in txt(page), 'تظهر ألقاب فعلية للأندية البطلة')
    page.click('.wr-win .chip[data-v="5"]'); page.wait_for_timeout(280)
    check('1 حقيقي · 4 تقديري' in txt(page), 'نافذة 5: 1 حقيقي + 4 تقديري')
    nohs(page, 'بعد موسم'); overflow(page, 'بعد موسم'); shot(page, 'wrwin_after', True)
    finish()
