"""المدير الفني (Build 28): بطاقة المدير في شاشة النادي (الاسم/العمر/الأسلوب/الكفاءة/ما يبحث عنه)، شاشة «مدربو الأندية» (شريط الدوريات،
صفوف بأهداف لمس ≥ 44px، تفاصيل المدير في بطاقة)، سطر المدير في تشكيلة الخصم، وبعد موسم كامل: تغييرات الصيف وسجلّ القرارات؛
لا رموز خام ولا تمرير أفقي. الاستخدام: python3 tests/e2e/director_ui.py [مجلد_اللقطات] [العرض=390]"""
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
    # شاشة النادي
    S("G.UI.cur='club'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    mg = S("G.S.clubs[G.S.players[G.S.user].club].mgr")
    check(len(page.query_selector_all('.card.mg')) == 1 and mg['n'] in txt(page), '%d: بطاقة المدير الفني في شاشة النادي (%s)' % (VW, mg['n']))
    t = txt(page)
    check('كفاءة التعاقدات' in t and 'يبحث الآن عن' in t and 'سنة' in t, 'البطاقة: كفاءة + ما يبحث عنه + العمر')
    check(S("G.Director.STYLES[G.S.clubs[G.S.players[G.S.user].club].mgr.st].ar") in t, 'أسلوب المدير ظاهر')
    check(not ev(page, EMOJI_JS), 'لا رموز خام'); nohs(page, 'النادي'); overflow(page, 'النادي'); shot(page, 'club_mgr', True)
    # الشاشة العامة
    S("G.UI.cur='more'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    check('مدربو الأندية' in txt(page), 'بلاط «مدربو الأندية» في المزيد')
    page.click('.tile[data-v="mgrs"]'); page.wait_for_timeout(300)
    check(S('G.UI.cur') == 'mgrs', 'البلاط يفتح الشاشة')
    chips = page.query_selector_all('.st-flt .chip')
    check(len(chips) == 6, 'شريط الدوريات: 5 + أندية أخرى (%d)' % len(chips))
    hs = S("[...document.querySelectorAll('.st-flt .chip')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in hs), 'أهداف لمس الشريط ≥ 44px (%s)' % min(hs))
    lg = S("G.UI.sub.mgLg || G.World.viewLg()")
    rows = page.query_selector_all('.st-list .st-r')
    want = S("G.World.members('%s').length" % lg)
    check(len(rows) == want, 'صفوف الدوري المعروض = أنديته (%d من %d)' % (len(rows), want))
    rh = S("[...document.querySelectorAll('.st-list .st-r')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in rh), 'صفوف المدربين ≥ 44px (%s)' % min(rh))
    names = S("[...document.querySelectorAll('.st-list .st-nm')].map(e=>e.textContent)")
    check(len(set(names)) == len(names), 'أسماء المديرين فريدة في الدوري')
    check('الأسماء مولَّدة' in txt(page), 'تنبيه أن الأسماء مولَّدة وليست حقيقية')
    check(not ev(page, EMOJI_JS), 'لا رموز خام'); nohs(page, 'المدربون'); overflow(page, 'المدربون'); shot(page, 'mgrs', True)
    # تبديل الدوري + بطاقة مدير
    for l in ['ENG1', 'oth']:
        page.click('.st-flt .chip[data-v="%s"]' % l); page.wait_for_timeout(250)
        check(S('G.UI.sub.mgLg') == l and len(page.query_selector_all('.st-list .st-r')) >= 5, 'تبديل إلى %s' % l)
    page.click('.st-flt .chip[data-v="ESP1"]'); page.wait_for_timeout(250)
    first = page.query_selector('.st-list .st-r'); cid = first.get_attribute('data-v'); first.click(); page.wait_for_timeout(300)
    sh = S("document.getElementById('sheet').innerText")
    check(S("G.S.clubs['%s'].mgr.n" % cid) in sh and 'كفاءة التعاقدات' in sh, 'بطاقة مدير النادي المضغوط تفتح بتفاصيله')
    bh = S("[...document.querySelectorAll('#sheet button')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in bh), 'أزرار البطاقة ≥ 44px'); shot(page, 'mgr_sheet')
    page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(200)
    # تشكيلة الخصم
    S("G.UI.cur='matches'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    btn = page.query_selector('[data-a="predOpen"]')
    if btn:
        btn.click(); page.wait_for_timeout(300); page.click('#sheet [data-a="ppTab"][data-v="o"]'); page.wait_for_timeout(250)
        check('المدير الفني:' in S("document.getElementById('sheet').innerText"), 'سطر المدير الفني في تشكيلة الخصم')
        page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(200)
    else:
        check(False, 'زر تشكيلة الخصم غير موجود في المركز')
    # بعد موسم كامل: تغييرات الصيف وسجل القرارات
    ok = S(SEASON_JS); check(ok is True, 'موسم كامل + rollover')
    S("G.UI.cur='mgrs'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(350)
    nch = S("(G.S.mgrChanges||[]).length")
    check(nch > 0 and 'تغييرات الصيف' in txt(page), 'تغييرات الصيف تظهر (%d تغييرًا)' % nch)
    nlog = S("Object.values(G.S.clubs).filter(c=>c.mgr&&c.mgr.log&&c.mgr.log.length).length")
    check(nlog >= 20, 'سجلّات قرارات المديرين تتراكم (%d نادٍ)' % nlog)
    nohs(page, 'المدربون بعد موسم'); overflow(page, 'المدربون بعد موسم'); shot(page, 'mgrs_after', True)
    S("G.UI.cur='club'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    check(len(page.query_selector_all('.card.mg')) == 1, 'بطاقة المدير بعد الموسم')
    check(not errors, 'لا أخطاء JS: %s' % errors[:3])
    finish()
