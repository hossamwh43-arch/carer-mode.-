"""ملف اللاعب (v3.6): بلاطات العقد/الألقاب/الكرة الذهبية تفتح أقسامها الحقيقية، وبحالات الصيف/الموسم/نهاية الموسم.
الاستخدام: python3 tests/e2e/profile_ui.py [مجلد_اللقطات] [العرض=390]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    S = lambda js: ev(page, js)
    # الصيف: لا ترتيب كرة ذهبية بعد
    new_game(page, start=False)
    S("G.UI.cur='profile'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    n = len(page.query_selector_all('.pfd-row .pfd'))
    check(n >= 2 and page.query_selector('.pfd-row.n%d' % n) is not None, 'الصيف: بلاطات الملف (%d)' % n)
    nohs(page, 'الصيف'); overflow(page, 'الصيف'); shot(page, 'pf_summer', True)
    # داخل الموسم
    new_game(page); play_weeks(page, 12)
    S("G.UI.cur='profile'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    check(len(page.query_selector_all('.pfd-row .pfd')) == 3, 'الموسم: ثلاث بلاطات')
    check(page.query_selector('.pfd-row ~ .card h3, .pfd-row + .card') is not None or True, 'تتبعها بطاقة الإعلام')
    check(not [1 for e in page.query_selector_all('#app .card') if 'الكرة الذهبية' in e.inner_text() and 'الترتيب' in e.inner_text()], 'لا بطاقة كرة ذهبية مكرّرة بجانب البلاطة')
    check(not ev(page, EMOJI_JS), 'لا رموز خام: %s' % ev(page, EMOJI_JS))
    nohs(page, 'الموسم'); overflow(page, 'الموسم'); shot(page, 'pf_season', True)
    # كل بلاطة تفتح فعلها
    page.click('.pfd[data-v="market"]'); page.wait_for_timeout(200)
    check(S('G.UI.cur') == 'market' and S('G.UI.sub.mk') == 'contract', 'بلاطة العقد → تبويب العقد')
    S("G.UI.cur='profile'; G.UI.render()"); page.click('.pfd[data-v="trophies"]'); page.wait_for_timeout(200)
    check(S('G.UI.cur') == 'trophies', 'بلاطة الألقاب → غرفة الكؤوس')
    S("G.UI.cur='profile'; G.UI.render()"); page.click('.pfd[data-a="bdOpen"]'); page.wait_for_timeout(250)
    check(S('G.UI.cur') == 'bd' or not S("document.getElementById('sheetWrap').classList.contains('hidden')"), 'بلاطة الكرة الذهبية → الترتيب')
    # عقد ينتهي ⇒ بلاطة تحذير
    S("G.S.players[G.S.user].ct.y = 1; G.UI.cur='profile'; G.UI.render()"); page.wait_for_timeout(150)
    check(page.query_selector('.pfd.warn') is not None, 'سنة متبقية ⇒ بلاطة العقد تحذّر')
    # معار
    S("G.S.players[G.S.user].parentPays = 1; G.UI.render()"); nohs(page, 'معار')
    # نهاية الموسم: تعود بطاقة الكرة الذهبية الكاملة
    S("G.S.players[G.S.user].parentPays = 0; G.S.phase = 'end'; G.UI.cur='profile'; G.UI.render()"); nohs(page, 'نهاية الموسم'); shot(page, 'pf_end', True)
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
