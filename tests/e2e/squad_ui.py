"""التشكيلة (v3.6): الصفوف قابلة للّمس وتفتح بطاقة زميل صحيحة (مقارنة، إحصاءات، عقد، قيمة، حالة) لكل لاعب في القائمة.
الاستخدام: python3 tests/e2e/squad_ui.py [مجلد_اللقطات] [العرض=390]"""
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
    new_game(page); play_weeks(page, 6)
    S("G.UI.cur='squad'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    rows = page.query_selector_all('button.sq-r')
    check(len(rows) == 10 and page.query_selector('.sq-pitch .pitch') is not None, 'الملعب + 10 صفوف قابلة للّمس')
    nohs(page, 'التشكيلة'); overflow(page, 'التشكيلة')
    # كل لاعب في الفريق (الكل) يفتح بطاقة بلا أخطاء
    page.click('[data-a="sqAll"]'); page.wait_for_timeout(200)
    n = len(page.query_selector_all('button.sq-r')); check(n >= 18, 'عرض الكل: %d لاعبًا' % n)
    ids = S("[...document.querySelectorAll('button.sq-r')].map(e=>e.dataset.v)")
    me_id = S('G.S.user')
    for i in ids:
        S("G.UI.closeSheet()"); page.wait_for_timeout(260)
        page.eval_on_selector('button.sq-r[data-v="%s"]' % i, 'e => e.click()'); page.wait_for_selector('#sheet .sqp'); 
        t = page.inner_text('#sheet .sqp')
        ok = ('مباراة دوري' in t) and ('الحالة' in t) and (i == me_id or 'ب' in t)
        if not ok: check(False, 'بطاقة اللاعب %s ناقصة' % i)
    check(True, 'كل البطاقات (%d) فتحت بمحتوى كامل' % len(ids))
    # بطاقة زميل أعلى تقييمًا بنفس المركز تذكر المزاحمة
    S("(()=>{const u=G.S.players[G.S.user]; const q=Object.values(G.S.players).find(x=>x.club===u.club && x.id!==u.id && x.pos===u.pos); if(q){ q.ovr=u.ovr+5; window.__q=q.id } })()")
    qid = S('window.__q')
    if qid:
        S("G.UI.closeSheet(); G.UI.cur='squad'; G.UI.sub={sqAll:true}; G.UI.render()"); page.wait_for_timeout(150)
        page.eval_on_selector('button.sq-r[data-v="%s"]' % qid, 'e => e.click()'); page.wait_for_selector('#sheet .sqp'); page.wait_for_timeout(250)
        t = page.inner_text('#sheet .sqp')
        check('يتفوّق عليك بـ 5' in t and 'يزاحمك' in t and 'منافسك على المركز' in t, 'منافس أعلى: مقارنة + «يزاحمك»')
        shot(page, 'sq_rival')
    page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(200)
    page.eval_on_selector('button.sq-r.me', 'e => e.click()'); page.wait_for_selector('#sheet .sqp'); check('أنت' in page.inner_text('#sheet .sqp') and 'مقارنة' not in page.inner_text('#sheet .sqp'), 'بطاقتك بلا مقارنة')
    check(not ev(page, "(document.querySelector('#sheet').textContent.match(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u26FF]/gu)||[]).length"), 'لا رموز خام في البطاقة')
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
