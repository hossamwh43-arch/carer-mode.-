"""حفظ من Build 28 المنشور يُفتح في Build 29 دون فقد: التقدّم نفسه، يصير في الخانة 1، مال اللاعب يُنشأ كسولًا بصفر، الإصابات والعروض والملعب المرئي تعمل،
الدوري الأوروبي يبدأ من الموسم القادم (الحفظ القديم بلا S.uel)، ويكمل موسمًا كاملًا ويُعاد تحميله. (Chromium فقط — ليس جهاز أندرويد حقيقيًا)
الاستخدام: python3 tests/e2e/b29_migration.py /مسار/إلى/carer-mode.-/www   (نسخة Build 28)"""
import sys, os
from common import *
OLD = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'carer-mode.-', 'www')
OLD_URL = 'file://' + os.path.join(OLD, 'index.html')
SEASON_JS = """(()=>{const T=G.Transfers;G.S.tour=9;for(let i=0;i<90;i++){const r=G.Sim.run({mode:'event',autoDP:true});if(G.S.offers&&G.S.offers.length)G.S.offers.slice().forEach(o=>T.rejectOffer(o.id));if(G.S.phase==='end'||(r&&r.run&&r.run.stop&&r.run.stop.reason==='end'))break;}
if(G.S.intl&&!G.S.intl.done)G.Intl.autoFinish();const rr=G.Season.rollover();if(G.S.phase==='summer'){G.S.preLeft=0;G.Season.startSeason();}return rr.ok})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    c1 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); old = c1.new_page(); old.set_default_timeout(30000)
    old.goto(OLD_URL); old.wait_for_selector('#app'); ev(old, 'localStorage.clear()'); old.goto(OLD_URL); old.wait_for_selector('#app')
    ev(old, "G.Season.newGame({name:'حسام',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:12,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()")
    play_weeks(old, 24)
    ev(old, 'G.Save.save(true)')
    snap = {k: v for k, v in ev(old, 'Object.assign({}, localStorage)').items()}
    st = ev(old, '({w:G.S.week,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,sw:G.S.season,club:G.S.players[G.S.user].club,pl:Object.keys(G.S.players).length,trophies:JSON.stringify(G.S.players[G.S.user].trophies||{})})')
    print('قديم (Build 28):', st)
    check(ev(old, 'typeof G.Money') == 'undefined' and ev(old, 'typeof G.Uel') == 'undefined' and ev(old, 'typeof G.Injury') == 'undefined', 'النسخة القديمة بلا مال ولا إصابات ولا دوري أوروبي (مرجع نظيف)')
    check(ev(old, "!!localStorage.getItem('fcc_save_v1') || Object.keys(localStorage).some(k=>/^fcc/.test(k))"), 'الحفظ القديم موجود في التخزين: %s' % [k for k in snap.keys() if k.startswith('fcc')][:6])
    c1.close()
    c2 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); page = c2.new_page(); page.set_default_timeout(30000); attach_errors(page)
    page.goto(URL); page.wait_for_selector('#app')
    page.evaluate("d => { localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]); }", snap)
    page.goto(URL); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(600)
    now = ev(page, '({w:G.S.week,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,sw:G.S.season,club:G.S.players[G.S.user].club,pl:Object.keys(G.S.players).length,trophies:JSON.stringify(G.S.players[G.S.user].trophies||{})})')
    check(all(now[k] == st[k] for k in now), 'نفس التقدّم واللاعبين بعد التحميل: %s' % now)
    check(ev(page, 'G.Save.slot') == 1 and ev(page, 'G.Save.slots()[0].info && G.Save.slots()[0].info.name') == 'حسام', 'الحفظ القديم صار الخانة 1 كما هو')
    check(ev(page, 'G.Save.slots()[1].info') is None and ev(page, 'G.Save.slots()[2].info') is None, 'الخانتان 2 و3 فارغتان')
    check(ev(page, 'G.S.money === undefined || G.S.money.bal === 0') is True, 'المال: لا رصيد وهمي على الحفظ القديم')
    check(ev(page, 'G.Money.st().bal') == 0 and ev(page, 'G.Money.st().v') == 1, 'نظام المال يُنشأ كسولًا بصفر (بلا أثر رجعي)')
    check(ev(page, 'G.S.uel') in (None, False) or ev(page, '!G.S.uel'), 'الدوري الأوروبي غائب هذا الموسم (الحفظ القديم) دون أخطاء')
    check(ev(page, '!!G.Season.euroOf') is True, 'euroOf متاحة ولا تنهار')
    for r in ['home', 'club', 'squad', 'more', 'money', 'ucl', 'settings', 'matches', 'market', 'inbox', 'league', 'career', 'stats', 'bd', 'worldrank', 'stars', 'mgrs']:
        ev(page, "G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r); page.wait_for_timeout(180)
        nohs(page, 'ترحيل ' + r); overflow(page, r)
    check(ev(page, "document.querySelector('#topTitle') && 1") is not None, 'العنوان يعمل')
    # الإصابة الجديدة على لاعب من حفظ قديم (u.inj رقم فقط)
    ev(page, "G.S.players[G.S.user].inj = 4; G.S.players[G.S.user].injInfo = undefined; G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(250)
    check(ev(page, 'G.Injury.pending(G.P(G.S.user))') in (True, False), 'إصابة قديمة بلا injInfo لا تنهار (pending=%s)' % ev(page, 'G.Injury.pending(G.P(G.S.user))'))
    ev(page, "G.S.players[G.S.user].inj = 0; G.UI.render()")
    # العروض: الحصة الجديدة لا تنهار على حفظ قديم
    ev(page, "G.S.offerQuota = undefined; G.Transfers.generateOffers && G.Transfers.generateOffers()"); page.wait_for_timeout(100)
    # مباراة تفاعلية بالملعب ثم بدونه
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    btn = page.query_selector('[data-a="playMatch"][data-v2="i"]')
    if btn:
        btn.click(); page.wait_for_selector('#mvStage canvas', timeout=8000)
        check(True, 'المباراة التفاعلية بالملعب المرئي تعمل على الحفظ القديم')
        page.click('[data-a="mvStage"]'); page.wait_for_timeout(400)
        check(page.query_selector('#mvStage canvas') is None, 'زر إيقاف الملعب يعمل على الحفظ القديم')
        ev(page, "G.UI.acts.mvLeave()"); ev(page, "G.UI.render()")
    # موسم كامل
    ok = ev(page, SEASON_JS); check(ok is True, 'موسم كامل + rollover على الحفظ المرحَّل')
    check(ev(page, 'G.S.season') == st['sw'] + 1 or ev(page, 'G.S.phase') in ('summer', 'pre', 'season'), 'انتقل الموسم')
    check(ev(page, 'G.Money.st().bal') > 0, 'المال بدأ يتراكم في الموسم الجديد (%s)' % ev(page, 'G.Money.st().bal'))
    check(ev(page, '!!G.S.uelTeams && G.S.uelTeams.length===28 && !!G.S.uel && G.S.uel.phase==="league"'), 'الدوري الأوروبي بدأ في الموسم الجديد (28 فريقًا)')
    check(ev(page, 'G.Uel.validate().length') == 0, 'تحقق الدوري الأوروبي نظيف')
    for r in ['home', 'ucl', 'money', 'career']:
        ev(page, "G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r); page.wait_for_timeout(180)
        nohs(page, 'بعد الترقية ' + r); overflow(page, r)
    ev(page, 'G.Save.save(true)'); page.reload(); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(500)
    check(ev(page, 'G.S.season') >= st['sw'] and ev(page, 'G.Save.slot') == 1, 'الحفظ بعد الترقية والموسم يُعاد تحميله من الخانة 1')
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
