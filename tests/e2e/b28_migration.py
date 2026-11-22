"""حفظ من Build 27 المنشور يُفتح في Build 28 دون فقد، وتظهر الميزات الجديدة عليه (قدرات النجوم، مديرو الأندية، لقطات الكرة الذهبية الشهرية،
نوافذ التصنيف التقديرية) وكل الشاشات الجديدة تعمل، ويكمل اللعب موسمًا كاملًا بعد الترحيل.
الاستخدام: python3 tests/e2e/b28_migration.py /مسار/إلى/carer-mode.-/www   (نسخة Build 27)"""
import sys, os
from common import *
OLD = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'carer-mode.-', 'www')
OLD_URL = 'file://' + os.path.join(OLD, 'index.html')
SEASON_JS = """(()=>{const T=G.Transfers;G.S.tour=9;for(let i=0;i<80;i++){const r=G.Sim.run({mode:'event',autoDP:true});if(G.S.offers&&G.S.offers.length)G.S.offers.slice().forEach(o=>T.rejectOffer(o.id));if(G.S.phase==='end'||(r&&r.run&&r.run.stop&&r.run.stop.reason==='end'))break;}
if(G.S.intl&&!G.S.intl.done)G.Intl.autoFinish();const rr=G.Season.rollover();return rr.ok})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    c1 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); old = c1.new_page(); old.set_default_timeout(30000)
    old.goto(OLD_URL); old.wait_for_selector('#app'); ev(old, 'localStorage.clear()'); old.goto(OLD_URL); old.wait_for_selector('#app')
    ev(old, "G.Season.newGame({name:'حسام',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:12,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()")
    play_weeks(old, 24)
    ev(old, 'G.Save.save(true)')
    snap = {k: v for k, v in ev(old, 'Object.assign({}, localStorage)').items()}
    st = ev(old, '({w:G.S.week,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,sw:G.S.season,club:G.S.players[G.S.user].club,pl:Object.keys(G.S.players).length,snaps:((G.BD.get().cur||{}).snaps||[]).length})')
    print('قديم (Build 27):', st)
    check(ev(old, 'typeof G.Traits') == 'undefined' and ev(old, 'typeof G.Director') == 'undefined', 'النسخة القديمة بلا قدرات ولا مديرين (مرجع نظيف)')
    check(st['snaps'] >= 1, 'الحفظ القديم فيه لقطات كرة ذهبية بالصيغة القديمة (snaps)')
    c1.close()
    c2 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); page = c2.new_page(); page.set_default_timeout(30000); attach_errors(page)
    page.goto(URL); page.wait_for_selector('#app')
    page.evaluate("d => { localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]); }", snap)
    page.goto(URL); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(500)
    now = ev(page, '({w:G.S.week,ovr:G.S.players[G.S.user].ovr,apps:G.S.matchLog.length,sw:G.S.season,club:G.S.players[G.S.user].club,pl:Object.keys(G.S.players).length})')
    check(all(now[k] == st[k] for k in now), 'نفس التقدّم واللاعبين بعد التحميل: %s' % now)
    # الميزات الجديدة ظهرت على الحفظ القديم
    check(ev(page, 'Object.values(G.S.clubs).every(c=>c.mgr&&c.mgr.n)'), 'كل الأندية (%d) حصلت على مدير فني بعد الترحيل' % ev(page, 'Object.keys(G.S.clubs).length'))
    nh = ev(page, 'G.Traits.holders().length'); check(nh >= 30, 'قدرات النجوم اشتُقّت للحفظ القديم (%d نجمًا)' % nh)
    check(ev(page, '!G.S.players[G.S.user].tr'), 'لاعبك بلا قدرات (ميزانه لم يتغيّر)')
    check(ev(page, '!!G.S.crk && Object.keys(G.S.crk.base).length>=200'), 'سجل التصنيف الجديد (crk) أُنشئ')
    check(ev(page, '(G.BD.get().cur.months||[]).length>=1 && !G.BD.get().cur.snaps'), 'لقطات الكرة الذهبية القديمة رُحّلت إلى الأشهر (%d)' % ev(page, '(G.BD.get().cur.months||[]).length'))
    for r in ['home', 'club', 'squad', 'more', 'stars', 'mgrs', 'bd', 'worldrank', 'league', 'market', 'inbox', 'press', 'stats']:
        ev(page, "G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r); page.wait_for_timeout(180)
        nohs(page, 'ترحيل ' + r); overflow(page, r)
    ev(page, "G.UI.cur='worldrank'; G.UI.sub={wrWin:100}; G.UI.render()"); page.wait_for_timeout(300)
    check('تقدير' in txt(page), 'نافذة 100 سنة تعرض بيانات تقديرية موسومة على الحفظ القديم')
    ev(page, "G.UI.cur='bd'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    check(len(page.query_selector_all('.bd-months .chip')) >= 1, 'شريط أشهر الكرة الذهبية يعمل على الحفظ القديم')
    # يكمل موسمًا كاملًا
    ok = ev(page, SEASON_JS); check(ok is True, 'موسم كامل + rollover على الحفظ المرحَّل')
    check(ev(page, 'G.S.season') == st['sw'] + 1 or ev(page, 'G.S.phase') in ('summer', 'pre'), 'انتقل الموسم')
    check(ev(page, 'G.WorldRank.crkSeasons().length') >= 1, 'الموسم الجديد سُجّل في سجل التصنيف')
    check(ev(page, 'Object.values(G.S.clubs).every(c=>c.mgr)'), 'المديرون سليمون بعد الموسم')
    ev(page, 'G.Save.save(true)'); page.reload(); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(400)
    check(ev(page, 'G.S.season') >= st['sw'], 'الحفظ بعد الترقية والموسم يُعاد تحميله')
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
