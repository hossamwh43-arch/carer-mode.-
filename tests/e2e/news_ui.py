"""غرفة الأخبار وصندوقي (v3.6): الصفحة الأولى، القارئ، الترشيح، السكك، مركز القرارات المشتق من الحالة، الخط الزمني، لوحة الرئيسية.
يفحص أن كل زر يستدعي فعلًا حقيقيًا وأن العرض لا يستهلك العشوائية ولا يغيّر الحفظ.
الاستخدام: python3 tests/e2e/news_ui.py [مجلد_اللقطات] [العرض=390]"""
import sys, os
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    new_game(page)
    play_weeks(page, 12)
    S = lambda js: ev(page, js)
    go = lambda r: (S("G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % r), page.wait_for_timeout(250))
    print('أسبوع', S('G.S.week'), '· أخبار', S('G.Press.get().feed.length'), '· رسائل', S('(G.S.inbox||[]).length'))
    check(S('G.Press.get().feed.length') > 20, 'توجد أخبار كافية للاختبار')

    # ---- الصفحة الأولى ----
    S('UI = G.UI')
    go('press')
    for sel, lab in [('.nws-mast', 'ترويسة'), ('.nws-lead', 'قصة رئيسية'), ('.nws-tick', 'شريط عاجل'), ('.nws-rail', 'سكة'), ('.nws-track .nws', 'بطاقة خبر'), ('.nws-bar .seg4', 'ترشيح النبرة'), ('.nws-src', 'زر الصحف')]:
        check(page.query_selector('#app ' + sel) is not None, 'الصفحة الأولى: ' + lab)
    check(len(page.query_selector_all('#app .nws-rail')) >= 2, 'سكتان أفقيتان على الأقل')
    check(len(page.query_selector_all('#app .card')) == 0, 'لا بطاقات متكررة (.card) في الصفحة الأولى')
    check(S('G.Press.unread()') == 0, 'فتح الغرفة يعلّم الأخبار مقروءة')
    check(page.query_selector('.nws-tk-dup') is not None and S("getComputedStyle(document.querySelector('.nws-tk-in')).animationName") == 'nwsTick', 'الشريط العاجل متحرك بحلقة سلسة')
    check(not ev(page, EMOJI_JS), 'لا رموز خام في الأخبار: %s' % ev(page, EMOJI_JS))
    nohs(page, 'الأخبار'); overflow(page, 'الأخبار'); shot(page, 'news_1_front', True)
    # الحجم: أقل بكثير من 26 بطاقة × ارتفاع
    check(S('document.documentElement.scrollHeight / innerHeight') < 3.2, 'ارتفاع الصفحة معقول (%.1f شاشة)' % S('document.documentElement.scrollHeight / innerHeight'))

    # ---- قارئ القصة ----
    page.click('.nws-lead'); page.wait_for_selector('#sheet .nws-sh-h'); page.wait_for_timeout(250)
    check(len(S("document.querySelector('#sheet .nws-sh-h').textContent")) > 8 and len(S("document.querySelector('#sheet .nws-sh-b').textContent")) > 20, 'القارئ: عنوان ونص')
    shot(page, 'news_2_story')
    page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(200)
    check(S("document.getElementById('sheetWrap').classList.contains('hidden')"), 'إغلاق القارئ')
    page.click('.nws-track .nws'); page.wait_for_selector('#sheet .nws-sh-h'); page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(150)

    # ---- السكك وعرض الكل + التصفح ----
    page.click('.nws-all'); page.wait_for_selector('.nws-res'); page.wait_for_timeout(200)
    n1 = len(page.query_selector_all('.nws-list .nws-row'))
    check(n1 >= 1 and page.query_selector('.nws-res [data-a="pressClear"]') is not None, 'عرض الكل: قائمة نتائج + زر العودة (%d)' % n1)
    if page.query_selector('[data-a="pressMore"]'):
        page.click('[data-a="pressMore"]'); page.wait_for_timeout(200)
        check(len(page.query_selector_all('.nws-list .nws-row')) > n1, 'عرض المزيد يزيد الصفوف')
    shot(page, 'news_3_list', True)
    page.click('[data-a="pressClear"]'); page.wait_for_selector('.nws-lead'); page.wait_for_timeout(150)
    check(page.query_selector('.nws-lead') is not None, 'العودة إلى الصفحة الأولى')

    # ---- ترشيح النبرة والصحف ----
    for t, cls in [('p', 'nt-p'), ('c', 'nt-c'), ('n', 'nt-n')]:
        page.click('[data-a="pressT"][data-v="%s"]' % t); page.wait_for_timeout(180)
        rows = page.query_selector_all('.nws-list .nws-row')
        check(len(rows) == 0 and page.query_selector('.empty-st') is not None or all(cls in (r.get_attribute('class') or '').split() for r in rows), 'ترشيح النبرة %s: كل الصفوف %s' % (t, cls))
    page.click('[data-a="pressT"][data-v="all"]'); page.wait_for_timeout(150)
    page.click('[data-a="pressSrc"]'); page.wait_for_selector('#sheet .nws-src-g'); page.wait_for_timeout(200)
    check(len(page.query_selector_all('#sheet .nws-src-g .chip')) == 11, 'قائمة الصحف: 10 + «الكل»')
    shot(page, 'news_4_outlets')
    oi = S('G.Press.get().feed[0].o')
    page.click('#sheet [data-a="pressO"][data-v="%d"]' % oi); page.wait_for_timeout(250)
    check(S("document.getElementById('sheetWrap').classList.contains('hidden')"), 'اختيار صحيفة يغلق النافذة')
    nm = S('G.Press.OUTLETS[%d].n' % oi)
    check(nm in S("document.querySelector('.nws-src').textContent"), 'زر الصحف يعرض الصحيفة المختارة')
    check(all(nm in r.inner_text() for r in page.query_selector_all('.nws-list .nws-row')), 'كل الصفوف من الصحيفة المختارة')
    page.click('[data-a="pressClear"]'); page.wait_for_timeout(150)
    check(S("UI.sub.pressO") == 'all' and S("UI.sub.pressT") == 'all', 'مسح الترشيح يعيد كل الأحوال')

    # ---- علامة «جديد» ----
    go('home'); S("G.Press.get().seen = G.Press.get().id - 3; G.UI._pressBase = null"); go('press')
    check(len(page.query_selector_all('.nws-new, .nws-ltop .pill.y')) >= 1, 'علامة «جديد» للأخبار غير المقروءة')

    # ---- صندوقي: مركز القرارات ----
    # تهيئة حالات حقيقية: نقاط تطوير + عرض انتقال + مؤتمر صحفي
    S("(()=>{const u=G.S.players[G.S.user]; u.dp=3; G.Media.get().press = G.Media.get().press || {id:99,w:G.S.week,s:G.S.season,kind:'big',fixId:null,v:0,o:0,ctx:{opp:'rma',oppName:'ريال مدريد',g:1,as:0,r:7.4,sc:'2-1',stage:'',comp:'LL'}};})()")
    S("(()=>{const S=G.S; if(!S.offers.length) S.offers.push({id:'OT1',type:'transfer',club:Object.keys(S.clubs).find(c=>c!==S.players[S.user].club),fee:5000000,wage:20000,years:3,maxWage:25000,tries:0,week:S.week,season:S.season,expires:S.week+1,status:'new',stance:{ok:true,why:''}});})()")
    S('G.S.inbox.unshift({id:(G.S.msgId=(G.S.msgId||0)+1),kind:"offer",title:"عرض اختبار",text:"نص طويل لعرض اختبار",data:null,season:G.S.season,week:G.S.week,read:false})')
    nb = S('G.Inbox.unread()')
    r0 = S('G.rngState')
    go('inbox')
    check(S('G.rngState') == r0, 'العرض لا يستهلك العشوائية (rngState ثابت)')
    check(page.query_selector('.nws-mast') is not None and 'قرارات' in S("document.querySelector('.nws-mast').innerText"), 'مركز القرارات: ترويسة تحصي القرارات')
    cards = page.query_selector_all('.dcs-track .dcs')
    ids = S("G.UI.decisions().map(d=>d.id).join(',')")
    check(len(cards) == len(S('G.UI.decisions()')) and len(cards) >= 3, 'بطاقات القرارات من الحالة (%s)' % ids)
    check(all(x in ids for x in ['press', 'offers', 'dp']), 'تظهر قرارات المؤتمر والعروض ونقاط التطوير')
    check(page.query_selector('.dcs.hot') is not None, 'عرض ينتهي قريبًا ⇒ بطاقة عاجلة')
    check(len(page.query_selector_all('.rel-g .rel')) == 3 and page.query_selector('.rel-card .ring') is not None, 'لوحة التأثير: ثقة المدرب/الشعبية/الصحافة')
    check(page.query_selector('.ibx .ibx-m') is not None and page.query_selector('.ibx .ibx-g') is not None, 'خط زمني مجمّع بالأسابيع')
    check(len(page.query_selector_all('.ibx-m.fresh')) == nb and nb >= 1, 'نقاط «جديد» للرسائل غير المقروءة (%d)' % nb)
    check(S('G.Inbox.unread()') == 0 and 'hidden' in S("document.getElementById('inboxBadge').className"), 'فتح الصندوق يعلّم الرسائل مقروءة ويخفي الشارة')
    check(not ev(page, EMOJI_JS), 'لا رموز خام في صندوقي: %s' % ev(page, EMOJI_JS))
    nohs(page, 'صندوقي'); overflow(page, 'صندوقي'); shot(page, 'news_5_inbox', True)

    # كل زر قرار ينفّذ فعله الحقيقي
    page.click('.dcs [data-a="goSub"][data-v2="mk:offers"]'); page.wait_for_timeout(250)
    check(S('G.UI.cur') == 'market' and S('G.UI.sub.mk') == 'offers', 'زر العروض يفتح تبويب العروض في السوق')
    go('inbox')
    page.click('.dcs [data-a="go"][data-v="train"]'); page.wait_for_timeout(200)
    check(S('G.UI.cur') == 'train', 'زر نقاط التطوير يفتح التدريب')
    go('inbox')
    page.click('.dcs [data-a="pressOpen"]'); page.wait_for_selector('#sheet .opt, #sheet [data-a="pressPick"], #sheet button[data-a]'); page.wait_for_timeout(300)
    check(not S("document.getElementById('sheetWrap').classList.contains('hidden')"), 'زر المؤتمر يفتح نافذة الأسئلة')
    shot(page, 'news_6_conf')
    # أجب فعلًا ⇒ تتغير المؤشرات وتختفي البطاقة
    before = S('({p:G.Media.get().pop,m:G.Media.get().mood,t:G.S.players[G.S.user].trust})')
    opt = page.query_selector('#sheet [data-a="pressAns"], #sheet [data-a="pressPick"], #sheet .opt[data-a]')
    if opt:
        opt.click(); page.wait_for_timeout(400)
        after = S('({p:G.Media.get().pop,m:G.Media.get().mood,t:G.S.players[G.S.user].trust})')
        check(before != after, 'الإجابة غيّرت الشعبية/الصحافة/الثقة: %s ← %s' % (before, after))
        page.keyboard.press('Escape'); S('G.UI.closeSheet()'); go('inbox')
        check('press' not in S("G.UI.decisions().map(d=>d.id).join(',')") and page.query_selector('.rel-last') is not None, 'بعد الإجابة: اختفت بطاقة المؤتمر وظهر «آخر قرار إعلامي»')
        shot(page, 'news_7_after_answer', True)
    else:
        check(False, 'لم أجد خيار إجابة في نافذة المؤتمر')
    # خط زمني: توسيع صف وزر الإجراء
    page.click('.ibx-b'); page.wait_for_timeout(200)
    check(page.query_selector('.ibx-m.open .ibx-go') is not None, 'توسيع رسالة عرض يظهر زر «العروض»')
    page.click('.ibx-m.open .ibx-go'); page.wait_for_timeout(250)
    check(S('G.UI.cur') == 'market', 'زر الرسالة ينقل إلى السوق')
    go('inbox')
    for t in ['offers', 'awards', 'other', 'all']:
        page.click('[data-a="tab"][data-v="ib"][data-v2="%s"]' % t); page.wait_for_timeout(150)
        nohs(page, 'تبويب ' + t)
    # لا قرارات ⇒ حالة هادئة
    S("G.S.players[G.S.user].dp=0; G.S.offers=[]; G.Media.get().press=null; G.S.phase==='season' && G.Season.pending() && 0; G.UI.render()")
    S("G.UI.decisions = (f => () => f().filter(d => d.id === 'match'))(G.UI.decisions); G.UI.render()")

    # ---- الرئيسية ----
    page.reload(); page.wait_for_selector('.cine'); S('G.UI = G.UI')
    S("G.S.players[G.S.user].dp=2; G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(250)
    check(page.query_selector('.dock-dec .dk') is not None, 'الرئيسية: رقائق القرارات')
    check(page.query_selector('.dock-news .nws-tick') is not None and page.query_selector('.dock-links [data-v="press"]') and page.query_selector('.dock-links [data-v="inbox"]'), 'الرئيسية: شريط عاجل + رابطا الأخبار وصندوقي')
    check('آخر الأخبار' not in txt(page), 'البطاقتان القديمتان اختفتا من الرئيسية')
    nohs(page, 'الرئيسية'); overflow(page, 'الرئيسية'); shot(page, 'news_8_home', True)
    page.click('.dock-dec .dk'); page.wait_for_timeout(200)
    check(S('G.UI.cur') in ('train', 'market'), 'رقاقة القرار في الرئيسية تنقل إلى الشاشة الصحيحة (%s)' % S('G.UI.cur'))
    S("G.UI.cur='home'; G.UI.render()"); page.click('.dock-links [data-v="press"]'); page.wait_for_selector('.nws-lead'); check(True, 'رابط غرفة الأخبار من الرئيسية')
    S("G.UI.cur='home'; G.UI.render()"); page.click('.dock-links [data-v="inbox"]'); page.wait_for_selector('.nws-mast'); check(True, 'رابط صندوقي من الرئيسية')

    # ---- لا شيء ينتظر + رسائل فارغة + أخبار فارغة ----
    S("G.S.press.feed = []; G.UI.cur='press'; G.UI.render()")
    check('لم تصدر أخبار بعد' in txt(page), 'حالة فارغة للأخبار')
    S("G.S.inbox = []; G.S.offers = []; G.UI.cur='inbox'; G.UI.render()")
    check('لا رسائل' in txt(page), 'حالة فارغة للرسائل')
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
