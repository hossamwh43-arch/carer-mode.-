"""حفظ من Build 29 المنشور يُفتح في Build 34 (التجديد البصري) دون فقد: التقدّم نفسه، كل الشاشات (بما فيها «إدارة النادي» الجديدة) تُرسم دون خطأ أو تجاوز أفقي،
والواجهة الجديدة (ملعب النادي/لوحة الغلاف/بطاقة المباراة) تظهر، وموسم كامل ينتهي ويُعاد تحميله. (Chromium فقط — ليس جهاز أندرويد حقيقيًا.)
الاستخدام: python3 tests/e2e/b34_migration.py /مسار/إلى/نسخة_Build_29/www"""
import sys, os
from common import *
OLD = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else '/tmp/rg/b29/www'
OLD_URL = 'file://' + os.path.join(OLD, 'index.html')
SEASON_JS = """(()=>{const T=G.Transfers;G.S.tour=9;for(let i=0;i<90;i++){const r=G.Sim.run({mode:'event',autoDP:true});if(G.S.offers&&G.S.offers.length)G.S.offers.slice().forEach(o=>T.rejectOffer(o.id));if(G.S.phase==='end'||G.S.phase==='retired')break;if(r&&r.stop==='match'&&G.S.active)G.Season.finishActive&&G.Season.finishActive();}
if(G.S.intl&&!G.S.intl.done)G.Intl.autoFinish();const rr=G.Season.rollover();if(G.S.phase==='summer'){G.S.preLeft=0;G.Season.startSeason();}return rr.ok})()"""
STATE = '({w:G.S.week,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,sw:G.S.season,club:G.S.players[G.S.user].club,pl:Object.keys(G.S.players).length,bal:G.Money?G.Money.st().bal:0})'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    c1 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); old = c1.new_page(); old.set_default_timeout(30000)
    old.goto(OLD_URL); old.wait_for_selector('#app'); ev(old, 'localStorage.clear()'); old.goto(OLD_URL); old.wait_for_selector('#app')
    ev(old, "G.Season.newGame({name:'حسام',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:12,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason()")
    play_weeks(old, 24)
    ev(old, 'G.Save.save(true)')
    snap = {k: v for k, v in ev(old, 'Object.assign({}, localStorage)').items()}
    st = ev(old, STATE)
    print('قديم (Build 29):', st)
    check(ev(old, 'typeof G.UI.stadiumArt') == 'undefined' and ev(old, "typeof G.UI.screens.facilities") == 'undefined', 'النسخة القديمة بلا مكوّنات Build 34')
    c1.close()
    c2 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); page = c2.new_page(); page.set_default_timeout(30000); attach_errors(page)
    page.goto(URL); page.wait_for_selector('#app')
    page.evaluate("d => { localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]); }", snap)
    page.goto(URL); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(700)
    now = ev(page, STATE)
    check(all(now[k] == st[k] for k in now), 'نفس التقدّم واللاعبين والرصيد بعد التحميل: %s' % now)
    check(ev(page, 'G.Save.slot') == 1, 'الحفظ القديم في الخانة 1')
    check(ev(page, "document.querySelectorAll('.cine .sta-art').length") == 1, 'غلاف الرئيسية يعرض ملعب النادي')
    check(ev(page, "!!document.querySelector('.cp-kpis .fstrip, .cp-kpis .cp-k')"), 'لوحة الغلاف الجديدة (مؤشرات الموسم/الترتيب) تظهر')
    for r in ['home', 'club', 'squad', 'facilities', 'more', 'money', 'ucl', 'settings', 'matches', 'market', 'inbox', 'league', 'career', 'stats', 'bd', 'worldrank', 'stars', 'mgrs', 'train', 'press', 'profile']:
        ev(page, "G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r); page.wait_for_timeout(180)
        nohs(page, 'ترحيل ' + r); overflow(page, r)
    ev(page, "G.UI.cur='facilities'; G.UI.render()"); page.wait_for_timeout(200)
    check(ev(page, "document.querySelectorAll('.pnl .lrow').length") >= 8 and ev(page, "!!document.querySelector('.kpi-row')"), 'شاشة إدارة النادي تعرض المالية والمنشآت من بيانات الحفظ القديم')
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    check(ev(page, "!!document.querySelector('.mcta .mc-sta .sta-art')"), 'تذكرة المباراة تعرض ملعب المضيف')
    ev(page, "G.UI.cur='squad'; G.UI.render()"); page.wait_for_timeout(200)
    check(ev(page, "document.querySelectorAll('.sq-pos.k-gk, .sq-pos.k-d, .sq-pos.k-m, .sq-pos.k-a').length") >= 8, 'شارات المراكز الملوّنة في قائمة التشكيلة')
    ok = ev(page, SEASON_JS); check(ok is True, 'موسم كامل + rollover على الحفظ المرحَّل')
    for r in ['home', 'facilities', 'league', 'career']:
        ev(page, "G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r); page.wait_for_timeout(180)
        nohs(page, 'بعد الموسم ' + r)
    ev(page, 'G.Save.save(true)'); before = ev(page, '({s:G.S.season,ph:G.S.phase,pl:Object.keys(G.S.players).length})')
    page.reload(); page.wait_for_selector('#app'); page.wait_for_timeout(700)
    after = ev(page, '({s:G.S.season,ph:G.S.phase,pl:Object.keys(G.S.players).length})')
    check(after == before and before['s'] == st['sw'] + 1, 'إعادة التحميل بعد الموسم تُرجع الحالة نفسها (%s) وانتقل الموسم' % after)
    check(not errors, 'لا أخطاء JS: %s' % errors[:3])
    b.close()
finish()
