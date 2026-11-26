"""زر إيقاف الملعب المرئي (Build 29 — Chromium فقط، ليس جهاز أندرويد حقيقيًا): زر داخل المباراة + مفتاح في الإعدادات،
التفضيل يُحفظ ويسري على المباريات التالية، ومع الإيقاف لا Canvas ولا حلقة رسم، والمباراة تستمر وتُنهى وتُسجَّل نتيجتها بلا أخطاء،
والنتيجة نفسها لا تتغيّر بتشغيل/إيقاف الرسم. الاستخدام: python3 tests/e2e/b29_stage_off.py [مجلد_اللقطات]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''

def open_live(page):
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    btn = page.query_selector('[data-a="playMatch"][data-v2="i"]')
    check(btn is not None, 'زر «شاهد المباراة» موجود')
    btn.click(); page.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    new_game(page, club='ath', pos='CM', age=19, seed=12)

    print('— الافتراضي: الملعب مفعّل')
    check(ev(page, "G.UI.prefs.stage") is None or ev(page, "G.UI.prefs.stage") is True, 'التفضيل الافتراضي غير مُطفأ')
    open_live(page)
    page.wait_for_selector('#mvStage canvas', timeout=8000)
    check(page.query_selector('[data-a="mvStage"]') is not None, 'زر الإيقاف ظاهر في شريط التحكم')
    check('إيقاف الملعب المرئي' in txt(page), 'نص الزر: إيقاف الملعب المرئي')
    shot(page, 'stage_on')

    print('— إيقاف الملعب أثناء المباراة')
    i0 = ev(page, 'G.S.active.m.i'); mid = ev(page, 'G.S.active.m.id')
    page.click('[data-a="mvStage"]'); page.wait_for_timeout(500)
    check(page.query_selector('#mvStage canvas') is None, 'لا Canvas بعد الإيقاف')
    check(page.query_selector('#mvStage.stg-off') is not None, 'بطاقة «وضع خفيف» ظاهرة بدل الملعب')
    check(ev(page, "G.UI.stadium.stats()") is None, 'الملعب مُدمَّر (لا حلقة رسم)')
    check(ev(page, "JSON.parse(localStorage.getItem('fcc_prefs_v1')).stage") is False, 'التفضيل محفوظ في التخزين')
    check(ev(page, 'G.S.active.m.id') == mid, 'المباراة نفسها لم تُعَد')
    page.wait_for_timeout(3000)
    i1 = ev(page, 'G.S.active.m.i')
    check(i1 > i0, 'المباراة تتقدّم بلا ملعب (الدقيقة %s→%s)' % (i0, i1))
    page.wait_for_timeout(2500)
    nev = ev(page, 'G.S.active.m.ev.length'); rows = len(page.query_selector_all('#mvFeed .ev'))
    check((nev > 1 and rows > 0) or (nev <= 1 and page.query_selector('#mvFeed .feed-empty') is not None), 'سجل الأحداث النصي يعكس أحداث المباراة كلها بلا ملعب (%d حدثًا، %d صفًا)' % (nev, rows))
    check('تشغيل الملعب المرئي' in txt(page) or page.query_selector('#mvStage [data-a="mvStage"]') is not None, 'زر إعادة التشغيل متاح')
    overflow(page, 'مباراة بلا ملعب'); nohs(page, 'live-off')
    shot(page, 'stage_off')

    print('— الإنهاء الفوري والمباراة التالية')
    ev(page, "G.UI.acts.mvFinish && 0"); page.click('[data-a="mvFinish"]'); page.wait_for_timeout(300)
    page.click('#sheet [data-a="yes"]'); page.wait_for_timeout(700)
    check(ev(page, "G.UI.mv && G.UI.mv.phase") == 'post' and ev(page, '!!G.S.lastMatch'), 'المباراة اعتُمدت ونتيجتها محفوظة')
    check(ev(page, "G.UI.stadium.stats()") is None, 'لا ملعب بعد الانتهاء')
    ev(page, "G.UI.acts.mvHome()"); ev(page, "G.UI.render()")
    ev(page, "G.Season.playWeekAuto ? 0 : 0")
    # أسبوع آخر ومباراة أخرى
    ev(page, "(()=>{ if (G.S.phase==='season' && !G.Season.pending()) G.Sim.run({mode:'week', autoDP:true, maxWeeks:1}); })()")
    page.wait_for_timeout(300)
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    btn = page.query_selector('[data-a="playMatch"][data-v2="i"]')
    if btn:
        btn.click(); page.wait_for_timeout(600)
        check(page.query_selector('#mvStage canvas') is None and page.query_selector('#mvStage.stg-off') is not None, 'المباراة التالية تبدأ بلا ملعب (التفضيل مستمر)')
        ev(page, "G.UI.acts.mvLeave()"); ev(page, "G.UI.render()")
    else:
        print('  (لا مباراة تفاعلية متاحة هذا الأسبوع — تُتخطّى هذه الفقرة)')

    print('— الإعدادات')
    ev(page, "G.UI.cur='settings'; G.UI.render()"); page.wait_for_timeout(200)
    row = page.query_selector('button.tgl[data-v="stage"]')
    check(row is not None, 'مفتاح «الملعب المرئي» في الإعدادات')
    check(row.get_attribute('aria-checked') == 'false', 'المفتاح مطفأ يعكس التفضيل')
    nohs(page, 'settings'); overflow(page, 'settings'); shot(page, 'settings_stage')
    row.click(); page.wait_for_timeout(250)
    check(ev(page, 'G.UI.prefs.stage') is True and ev(page, "JSON.parse(localStorage.getItem('fcc_prefs_v1')).stage") is True, 'تشغيله من الإعدادات يحفظ التفضيل')

    print('— إعادة التشغيل أثناء المباراة، وبقاء الاختيار بعد إعادة تحميل الصفحة')
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    btn = page.query_selector('[data-a="playMatch"][data-v2="i"]') or page.query_selector('[data-a="resumeMatch"]')
    if btn:
        btn.click(); page.wait_for_selector('#mvStage canvas', timeout=8000)
        check(True, 'الملعب عاد في المباراة')
        page.click('[data-a="mvStage"]'); page.wait_for_timeout(400)
        check(page.query_selector('#mvStage canvas') is None, 'أُوقف مرة ثانية')
        page.click('#mvStage [data-a="mvStage"]'); page.wait_for_selector('#mvStage canvas', timeout=8000)
        check(ev(page, "G.UI.stadium.stats().ents") >= 22, 'إعادة التشغيل أثناء المباراة تبني الملعب من جديد')
        page.wait_for_timeout(1500)
        check(ev(page, "G.UI.stadium.stats().frames") > 5, 'الإطارات تتقدّم بعد إعادة التشغيل')
        ev(page, "G.UI.acts.mvLeave()")
    else:
        print('  (لا مباراة تفاعلية — تُتخطّى)')
    ev(page, "G.UI.prefs.stage=false; G.UI.savePrefs(); G.Save.save(true)"); page.reload(); page.wait_for_timeout(700)
    check(ev(page, "G.UI.prefs.stage") is False, 'التفضيل يبقى بعد إعادة تحميل الصفحة')
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()

# --- تطابق النتيجة: الرسم زينة فقط ---
import json, subprocess
print('— النتيجة لا تتغيّر بالرسم (Node)')
js = r"""
const { load } = require('./tests/engine/loader');
function play(stageOff){ const {G}=load(); G.Season.newGame({name:'x',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:12,diff:'normal'}); G.S.tour=9; G.S.preLeft=0; G.Season.startSeason();
  G.UI = G.UI || {}; G.UI.prefs = { stage: !stageOff };
  G.Sim.run({mode:'event', autoDP:true}); return JSON.stringify([G.S.season, G.S.week, G.S.phase, G.P(G.S.user).ovr]); }
const a = play(false), b = play(true); console.log(a === b ? 'SAME' : 'DIFF ' + a + ' ' + b);
"""
r = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT)
check('SAME' in r.stdout, 'نتائج الموسم متطابقة مع الرسم وبدونه (%s)' % (r.stdout.strip() or r.stderr.strip()[:200]))
finish()
