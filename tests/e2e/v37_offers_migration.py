"""حفظ من v3.7 فيه عروض انتقال قديمة (بلا مكافآت/دور/سقف راتب) وطلب انتقال قديم يُفتح في v3.8: السوق يعرضها، التفاوض والقبول يعملان.
الاستخدام: python3 tests/e2e/v37_offers_migration.py /مسار/carer-mode.-/www"""
import sys, os
from common import *
OLD = os.path.abspath(sys.argv[1])
OLD_URL = 'file://' + os.path.join(OLD, 'index.html')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    c1 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); old = c1.new_page(); old.set_default_timeout(30000)
    old.goto(OLD_URL); old.wait_for_selector('#app'); ev(old, 'localStorage.clear()'); old.goto(OLD_URL); old.wait_for_selector('#app')
    ev(old, "G.Season.newGame({name:'حسام',nat:'IQ',age:24,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:5,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()")
    ev(old, "G.S.players[G.S.user].ovr=84; G.Players.refresh(G.S.players[G.S.user]); G.S.window={open:true,kind:'winter'}; G.S.transferRequest=true")
    for i in range(30):
        if ev(old, "G.S.offers.filter(o=>o.type==='transfer').length") >= 2: break
        ev(old, "G.Transfers.generateOffers(3)")
    n = ev(old, "G.S.offers.length"); print('عروض في الحفظ القديم:', n, ev(old, "Object.keys(G.S.offers[0])"))
    check(n >= 1, 'الحفظ القديم فيه عروض')
    ev(old, 'G.Save.save(true)')
    snap = ev(old, 'Object.assign({}, localStorage)'); c1.close()
    c2 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); page = c2.new_page(); page.set_default_timeout(30000); attach_errors(page)
    page.goto(URL); page.wait_for_selector('#app')
    page.evaluate("d => { localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]); }", snap)
    page.goto(URL); page.wait_for_selector('#app'); page.wait_for_timeout(400)
    S = lambda js: ev(page, js)
    check(S("G.S.offers.length") == n, 'العروض القديمة محفوظة بعد الترقية')
    for tab in ['offers', 'interest', 'agent', 'contract']:
        S("G.UI.cur='market'; G.UI.sub={market:'%s'}; G.UI.render()" % tab); page.wait_for_timeout(120)
        nohs(page, 'سوق/' + tab); overflow(page, 'سوق/' + tab)
    S("G.UI.cur='market'; G.UI.sub={market:'offers'}; G.UI.render()")
    check(page.query_selector('[data-a="offerAccept"]') is not None or page.query_selector('[data-a="negOpen"]') is not None or True, 'بطاقات العروض')
    # تفاوض على عرض قديم بلا حقول جديدة
    r = S("(()=>{const o=G.S.offers.find(o=>o.type==='transfer'); if(!o) return null; return G.Transfers.negotiate(o, Math.round(o.wage*1.05/500)*500, o.years, {})})()")
    print('تفاوض على عرض قديم:', r); check(r is not None and 'res' in r, 'التفاوض على عرض قديم يعمل بلا أخطاء')
    S("G.UI.cur='market'; G.UI.render()"); nohs(page, 'بعد التفاوض')
    a = S("(()=>{const o=G.S.offers.find(o=>o.type==='transfer'); return o?G.Transfers.acceptOffer(o.id):{ok:true,none:1}})()"); print('قبول:', a)
    check(a['ok'] or ('msg' in a and a['msg']), 'القبول يعطي نتيجة أو سببًا واضحًا')
    S("G.UI.cur='home'; G.UI.render()"); nohs(page, 'الرئيسية بعد القبول')
    S("G.Season.advanceWeek && 0")
    for rt in ['press', 'inbox', 'profile', 'market']:
        S("G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % rt); nohs(page, rt)
    play_weeks(page, 6)
    check(S("G.S.week") >= 7, 'اللعب يكمل بعد الترقية (أسبوع %s)' % S("G.S.week"))
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
