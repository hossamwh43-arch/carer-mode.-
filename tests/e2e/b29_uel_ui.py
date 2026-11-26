"""واجهة الدوري الأوروبي (Build 29 — Chromium فقط، ليس جهاز أندرويد حقيقيًا): نادي المستخدم في الدوري الأوروبي، شاشة «ucl» بمبدّل الدوري/الأوروبي،
جدول المرحلة والإقصائيات، سطر الرئيسية، أسابيع المباريات، ثم موسم كامل بلا أخطاء JS. الاستخدام: python3 tests/e2e/b29_uel_ui.py [مجلد_اللقطات]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
NG = "G.Season.newGame({name:'حسام',nat:'IQ',age:21,pos:'ST',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'%s',seed:5,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason(); G.UI.wz=null; G.UI.cur='home'; G.UI.render();"
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    new_game(page, club='gir', pos='ST', age=21, seed=5)
    club = ev(page, "G.S.uelTeams.find(id => G.S.clubs[id].lg === 'ESP1')")
    check(bool(club), 'نادٍ من الدوري الأوروبي للاختبار: %s' % club)
    ev(page, NG % club); page.wait_for_timeout(400)
    check(ev(page, "G.Season.euroOf(G.P(G.S.user).club).k") == 'uel', 'نادي المستخدم في الدوري الأوروبي')
    ev(page, "G.UI.cur='ucl'; G.UI.render()"); page.wait_for_timeout(300)
    chips = page.query_selector_all('[data-a="euSel"]')
    check(len(chips) == 2, 'مبدّل المسابقتين (دوري الأبطال / الدوري الأوروبي) ظاهر')
    nohs(page, 'ucl'); overflow(page, 'ucl'); shot(page, 'ucl_default')
    page.click('[data-a="euSel"][data-v="ucl"]'); page.wait_for_timeout(250)
    check('دوري الأبطال' in txt(page), 'التبديل إلى دوري الأبطال يعمل')
    nohs(page, 'ucl-ucl'); overflow(page, 'ucl-ucl')
    page.click('[data-a="euSel"][data-v="uel"]'); page.wait_for_timeout(250)
    check('الدوري الأوروبي' in txt(page), 'التبديل إلى الدوري الأوروبي يعمل')
    check(ev(page, "document.querySelector('#topTitle').textContent") == 'الدوري الأوروبي', 'عنوان الشاشة يتبع المسابقة المختارة')
    page.click('[data-a="euSel"][data-v="ucl"]'); page.wait_for_timeout(200)
    check(ev(page, "document.querySelector('#topTitle').textContent") == 'دوري أبطال أوروبا', 'العنوان يعود لدوري الأبطال')
    page.click('[data-a="euSel"][data-v="uel"]'); page.wait_for_timeout(200)
    nohs(page, 'ucl-uel'); overflow(page, 'ucl-uel'); shot(page, 'ucl_uel')
    # الرئيسية: سطر البطولة القارية
    ev(page, "G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(250)
    check(ev(page, "G.UI.uclLine().includes('الدوري الأوروبي') && G.UI.uclLine().includes('مرحلة الدوري')"), 'سطر البطولة الأوروبية يذكر الدوري الأوروبي ومرحلة الدوري (يظهر في مركز المباراة)')
    ev(page, "G.S.week = G.S.uel.weeks.league[0]; G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(250)
    check(ev(page, "G.Season.userFixtures(G.S.week).some(f => f.comp === 'UEL')"), 'مباراة الدوري الأوروبي في أسبوعها بقائمة المباريات')
    nohs(page, 'matches-uel'); overflow(page, 'matches-uel'); shot(page, 'matches_uel')
    ev(page, "G.S.week = 1")
    nohs(page, 'home-uel'); overflow(page, 'home-uel')
    # العب موسمًا كاملًا بالواجهة السريعة ثم افتح الشاشات
    ev(page, "(()=>{ for (let i=0;i<90;i++){ G.Sim.run({mode:'event', autoDP:true}); if (G.S.phase==='end') break; } })()"); page.wait_for_timeout(400)
    ev(page, "G.UI.cur='ucl'; G.UI.sub.eu='uel'; G.UI.render()"); page.wait_for_timeout(300)
    check(ev(page, "G.S.uel.phase") == 'done' or ev(page, "G.S.uel && G.S.uel.winner") is not None, 'اكتمل الدوري الأوروبي بعد الموسم')
    nohs(page, 'ucl-uel-end'); overflow(page, 'ucl-uel-end'); shot(page, 'ucl_uel_end')
    for r in ['career', 'trophies', 'stats']:
        ev(page, "G.UI.cur='%s'; G.UI.render()" % r); page.wait_for_timeout(200)
        nohs(page, r + ' بعد الموسم الأوروبي'); overflow(page, r)
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
