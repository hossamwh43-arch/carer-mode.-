"""حفظ من الإصدار المنشور السابق (v3.5) يُفتح في v3.6 دون فقد: الأخبار والرسائل والتقدّم سليمة وكل الشاشات تعمل وتكمل اللعب.
يحتاج مسار نسخة v3.5: python3 tests/e2e/v35_migration.py /مسار/إلى/carer-mode.-/www"""
import sys, os, json
from common import *
OLD = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'carer-mode.-', 'www')
OLD_URL = 'file://' + os.path.join(OLD, 'index.html')
ROUTES = ['home', 'profile', 'career', 'trophies', 'market', 'stats', 'settings', 'matches', 'league', 'cup', 'ucl', 'club', 'squad', 'train', 'more', 'press', 'inbox']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    # 1) إنشاء حفظ بالإصدار القديم
    c1 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); old = c1.new_page(); old.set_default_timeout(30000)
    old.goto(OLD_URL); old.wait_for_selector('#app'); ev(old, 'localStorage.clear()'); old.goto(OLD_URL); old.wait_for_selector('#app')
    ev(old, "G.Season.newGame({name:'حسام',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:12,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()")
    import common
    play_weeks(old, 10)
    ev(old, 'G.Save.save(true)')
    snap = {k: v for k, v in ev(old, 'Object.assign({}, localStorage)').items()}
    st = ev(old, '({w:G.S.week,feed:G.Press.get().feed.length,inbox:G.S.inbox.length,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,ver:G.S.ver,sw:G.S.season})')
    print('قديم:', st); check(st['feed'] > 10 and st['inbox'] >= 5, 'الحفظ القديم فيه أخبار ورسائل')
    c1.close()
    # 2) فتحه في v3.6
    c2 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); page = c2.new_page(); page.set_default_timeout(30000); attach_errors(page)
    page.goto(URL); page.wait_for_selector('#app')
    page.evaluate("d => { localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]); }", snap)
    page.goto(URL); page.wait_for_selector('.cine, #app')
    page.wait_for_timeout(400)
    now = ev(page, '({w:G.S.week,feed:G.Press.get().feed.length,inbox:G.S.inbox.length,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,ver:G.S.ver,sw:G.S.season})')
    check(now == st, 'نفس التقدّم بعد التحميل: %s' % now)
    for r in ROUTES:
        ev(page, "G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r); page.wait_for_timeout(150)
        nohs(page, 'v3.5→v3.6 ' + r); overflow(page, r)
    ev(page, "G.UI.cur='press'; G.UI.render()")
    check(page.query_selector('.nws-lead') is not None and len(page.query_selector_all('.nws-rail')) >= 2, 'الأخبار القديمة تُعرض بالصفحة الأولى الجديدة')
    ev(page, "G.UI.cur='inbox'; G.UI.render()")
    check(len(page.query_selector_all('.ibx-m')) >= 5, 'الرسائل القديمة تُعرض في الخط الزمني (%d)' % len(page.query_selector_all('.ibx-m')))
    play_weeks(page, 6)
    check(ev(page, 'G.S.week') > st['w'], 'اللعب يكمل بعد الترقية (أسبوع %s)' % ev(page, 'G.S.week'))
    ev(page, 'G.Save.save(true)'); page.reload(); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(300)
    check(ev(page, 'G.S.week') > st['w'], 'الحفظ بعد الترقية يُعاد تحميله')
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
