"""v4: يمنع رجوع أخطاء النصوص الطويلة: اسم نادٍ طويل في الشريط العلوي، أسماء لاعبين طويلة على الملعب، وبطاقات المواسم على العرض الضيق.
الاستخدام: python3 tests/e2e/text_overflow.py [العرض=360]"""
import sys, json
from common import *
from season_helpers import fast_seasons
W = int(sys.argv[1]) if len(sys.argv) > 1 else 360
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': W, 'height': 844}, locale='ar'); pg = ctx.new_page(); pg.set_default_timeout(60000); attach_errors(pg)
    new_game(pg); play_weeks(pg, 6)
    ev(pg, "(()=>{const u=G.S.players[G.S.user]; const c=G.S.clubs[u.club]; c.name='Borussia Mönchengladbach Fußball Verein'; (c.squad||[]).slice(0,11).forEach(id=>{const q=G.S.players[id]; if(q&&id!==G.S.user) q.n='Alexander-Arnoldsson Wolfeschlegelsteinhausenbergerdorff'})})()")
    ev(pg, "G.UI.sub={}; G.UI.cur='club'; G.UI.render()"); pg.wait_for_timeout(200)
    r = pg.evaluate("() => { const t = document.querySelector('#topTitle').getBoundingClientRect(), b = document.querySelector('#topbar').getBoundingClientRect(); return [t.top >= b.top - 1, t.bottom <= b.bottom + 1, t.left >= 0, t.right <= innerWidth] }")
    check(all(r), 'عنوان الشريط العلوي داخل حدوده مع اسم نادٍ طويل %s' % r)
    for route, sub in [('squad', {}), ('matches', {'mc': 'xi'})]:
        ev(pg, "G.UI.sub=%s; G.UI.cur='%s'; G.UI.render()" % (json.dumps(sub), route)); pg.wait_for_timeout(200)
        if not pg.query_selector('.pitch'): continue
        bad = pg.evaluate("""() => { const P = document.querySelector('.pitch').getBoundingClientRect(), o = []; document.querySelectorAll('.pitch .pp').forEach(e => { const r = e.getBoundingClientRect(); if (r.left < P.left - .5 || r.right > P.right + .5 || r.top < P.top - .5 || r.bottom > P.bottom + .5) o.push(1); }); return o.length }""")
        check(bad == 0, '%s: كل لاعبي الملعب داخل حدوده بأسماء طويلة (%d خارج)' % (route, bad))
        bidi = pg.evaluate("() => getComputedStyle(document.querySelector('.pitch .pp span')).unicodeBidi")
        check(bidi == 'plaintext', '%s: نقاط الحذف تظهر في نهاية الاسم اللاتيني (unicode-bidi=%s)' % (route, bidi))
    fast_seasons(pg, 3)
    ev(pg, "G.UI.sub={}; G.UI.cur='career'; G.UI.render()"); pg.wait_for_timeout(200)
    n = pg.evaluate("document.querySelectorAll('.ssn').length"); check(n >= 4, 'بطاقات مواسم (%d)' % n)
    ov = pg.evaluate("() => [document.documentElement.scrollWidth, innerWidth, [...document.querySelectorAll('.ssn')].some(e => e.scrollWidth > e.clientWidth + 1)]")
    check(ov[0] <= ov[1] + 1 and not ov[2], 'سجل المواسم بلا تمرير أفقي بعد 3 مواسم (%s)' % ov)
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
