"""فحص شامل لكل الشاشات (v3.6): لا أخطاء JS ولا خطأ عرض ولا تمرير أفقي ولا رموز تعبيرية خام، وقياس زمن العرض.
يشغّل لعبة 14 أسبوعًا ثم يزور كل مسار عبر التنقل السفلي والعلوي. الاستخدام: python3 tests/e2e/routes_smoke.py [مجلد_اللقطات] [العرض=390]"""
import sys, os, time
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
ROUTES = ['home', 'profile', 'career', 'trophies', 'market', 'stats', 'settings', 'matches', 'league', 'cup', 'ucl', 'intl', 'club', 'squad', 'train', 'more', 'press', 'inbox', 'bd']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    new_game(page); play_weeks(page, 14)
    slow = []
    for r in ROUTES:
        t = ev(page, "(()=>{G.UI.cur='%s'; G.UI.sub={}; const t=performance.now(); G.UI.render(); return performance.now()-t})()" % r)
        page.wait_for_timeout(200)
        nohs(page, r); overflow(page, r)
        bad = ev(page, EMOJI_JS)
        check(not bad, '%s: لا رموز خام %s' % (r, bad if bad else ''))
        if t > 120: slow.append((r, round(t)))
        shot(page, 'r_' + r, True)
    check(not slow, 'زمن العرض < 120ms لكل شاشة %s' % slow)
    # التنقل السفلي والمبدّل العلوي
    for g in ['home', 'me', 'matches', 'club', 'more']:
        page.click('.bottomnav [data-v="%s"]' % g) if page.query_selector('.bottomnav [data-v="%s"]' % g) else None
        page.wait_for_timeout(120); nohs(page, 'تبويب ' + g)
    ev(page, "G.UI.cur='more'; G.UI.render()")
    for sel in ['[data-v="press"]', '[data-v="inbox"]']:
        el = page.query_selector('.sw ' + sel) or page.query_selector('#app ' + sel)
        check(el is not None, 'مسار متاح من «المزيد»: ' + sel)
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
