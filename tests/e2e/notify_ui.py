"""Build 27 — نظام الإشعارات الجديد: الموضع (حيّز الشريط العلوي) بلا تغطية لغلاف اللاعب أو الشريط السفلي، كل الأنواع، الطابور والأولوية،
الإغلاق بالضغط، الاختفاء التلقائي، التوافق مع UI.toast/UI.banner القديمين، إشعارات الأحداث الحقيقية (أسبوع/مستوى/إصابة/عرض)،
الحركة المخفّضة، وعدم استهلاك عشوائية اللعبة. الاستخدام: python3 tests/e2e/notify_ui.py [مجلد_اللقطات] [العرض]
ملاحظة: القياس على Chromium في الحاوية لا على جهاز أندرويد حقيقي."""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

RECT = "(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] }"
def inter(a, b):
    return a and b and not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(20000); attach_errors(page)
    new_game(page); play_weeks(page, 1)
    ev(page, "G.UI.cur='home'; G.UI.sub={}; G.UI.render(); window.scrollTo(0,0)"); page.wait_for_timeout(300)
    ev(page, "G.UI.fxClear()")

    # 1) الموضع وعدم التغطية (غلاف اللاعب، الشريط السفلي، شريط التبويبات)
    rng0 = ev(page, "JSON.stringify(G.rngState||null)")
    ev(page, "G.UI.notify('level','مستوى جديد','نقطة تطوير جديدة بانتظارك')"); page.wait_for_timeout(450)
    n = page.evaluate(RECT, '#notif .nt'); top = page.evaluate(RECT, '.topbar') or page.evaluate(RECT, 'header'); cine = page.evaluate(RECT, '.cine'); bn = page.evaluate(RECT, '#bottomnav')
    check(n is not None, 'الإشعار يظهر')
    check(n[0] >= 0 and n[2] <= VW + 1, 'الإشعار داخل عرض الشاشة (%s)' % [round(x) for x in n])
    check(n[3] <= 70, 'الإشعار في أعلى الشاشة (قاعه y=%d)' % n[3])
    check(not inter(n, cine), 'لا يغطي غلاف اللاعب (التقييم/الاسم/النادي)')
    check(not inter(n, bn), 'لا يغطي الشريط السفلي')
    check((n[2] - n[0]) <= VW - 100, 'حجمه صغير (عرضه %d من %d)' % (n[2] - n[0], VW))
    check(ev(page, "document.querySelectorAll('#notif .nt').length") == 1, 'إشعار واحد ظاهر')
    shot(page, 'notify_level_%d' % VW)
    check(float(ev(page, "getComputedStyle(document.getElementById('topTitle')).opacity")) < 0.05, 'عنوان الشريط العلوي يختفي أثناء الإشعار فلا يتقاطع معه')
    # RTL/LTR: «+120 XP» داخل نص عربي تبقى بترتيبها الصحيح (الأرقام يسار «XP»)
    ev(page, "G.UI.fxClear(); G.UI.notify('week','انتهى الأسبوع 14','+120 XP · تحسّن: التسديد 3',{ms:6000})"); page.wait_for_timeout(450)
    o = page.evaluate("""() => { const bd = [...document.querySelectorAll('#notif .nt-s bdi')].find(b => /XP/.test(b.textContent)); if (!bd) return null; const t = bd.firstChild; const x = (i) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect().left }; const s = t.textContent; return { txt: s, plus: x(0), d: x(s.indexOf('1')), xp: x(s.indexOf('X')), dir: bd.getAttribute('dir') } }""")
    check(o is not None and o['dir'] == 'ltr' and o['plus'] < o['d'] < o['xp'], 'الأرقام والرمز اللاتيني معزولان بترتيب صحيح «+120 XP» (%s)' % o)
    ev(page, "G.UI.fxClear(); G.UI.notify('level','مستوى جديد','نقطة تطوير جديدة بانتظارك')"); page.wait_for_timeout(300)
    page.wait_for_timeout(0)
    # اختفاء تلقائي
    page.wait_for_timeout(4200)
    check(ev(page, "document.querySelectorAll('#notif .nt').length") == 0, 'يختفي تلقائيًا')
    page.wait_for_timeout(500)
    check(float(ev(page, "getComputedStyle(document.getElementById('topTitle')).opacity")) > 0.95 and not ev(page, "document.body.classList.contains('has-nt')"), 'العنوان يعود بعد خروج الإشعار')

    # 2) كل الأنواع
    kinds = ['info', 'ok', 'warn', 'err', 'week', 'level', 'ach', 'win', 'me', 'team', 'opp', 'promo', 'injury', 'offer']
    for k in kinds:
        ev(page, "G.UI.fxClear(); G.UI.notify(%r,'عنوان قصير','تفصيل قصير')" % k); page.wait_for_timeout(300)
        ok = page.evaluate("(k) => { const e = document.querySelector('#notif .nt'); return !!e && e.classList.contains('nt-k-' + k) && !!e.querySelector('.nt-ic svg, .nt-art svg, .nt-ic') }", k)
        w = page.evaluate(RECT, '#notif .nt')
        check(ok and w[2] <= VW + 1 and w[0] >= -1, 'نوع «%s» يُعرض داخل الشاشة' % k)
    # نص طويل جدًا يلتف ولا يتجاوز الشاشة
    ev(page, "G.UI.fxClear(); G.UI.notify('warn','عنوان طويل جدًا جدًا يتكرر ويتكرر ليختبر الالتفاف داخل الإشعار الصغير','وتفصيل أطول من ذلك بكثير يشرح ما حدث بالتفصيل الممل في سطر ثانٍ وثالث')"); page.wait_for_timeout(300)
    w = page.evaluate(RECT, '#notif .nt'); check(w[0] >= -1 and w[2] <= VW + 1 and w[3] <= 140, 'نص طويل: داخل الشاشة ولا يتضخم (%s)' % [round(x) for x in w])
    overflow(page, 'مع إشعار طويل')
    shot(page, 'notify_long_%d' % VW)

    # 3) الطابور والأولوية
    ev(page, "G.UI.fxClear(); G.UI.notify('week','انتهى الأسبوع 3','+120 XP'); G.UI.notify('level','مستوى جديد','نقطة تطوير')"); page.wait_for_timeout(250)
    first = ev(page, "document.querySelector('#notif .nt .nt-t').textContent")
    check(first.startswith('انتهى الأسبوع'), 'الإشعار الأول يظهر أولًا (%s)' % first)
    page.wait_for_timeout(2600)
    second = ev(page, "(document.querySelector('#notif .nt .nt-t')||{}).textContent||''")
    check(second == 'مستوى جديد', 'التالي في الطابور يظهر بعد الأول (%s)' % second)
    page.wait_for_timeout(4000)
    ev(page, "G.UI.fxClear(); G.UI.notify('info','عادي','x'); G.UI.notify('win','لقب!','أولوية عليا')"); page.wait_for_timeout(350)
    check(ev(page, "document.querySelector('#notif .nt .nt-t').textContent") == 'لقب!' and ev(page, "document.querySelectorAll('#notif .nt').length") == 1, 'الحدث عالي الأولوية يحلّ محل الظاهر فورًا')
    # عدم التكرار
    ev(page, "G.UI.fxClear(); G.UI.notify('info','مكرر','x'); G.UI.notify('info','مكرر','x'); G.UI.notify('info','مكرر','x')"); page.wait_for_timeout(300)
    check(ev(page, "document.querySelectorAll('#notif .nt').length") == 1, 'لا تراكم لإشعار مكرر')

    # 4) الإغلاق بالضغط
    ev(page, "G.UI.fxClear(); G.UI.notify('ok','اضغطني','x',{ms:6000})"); page.wait_for_timeout(300)
    page.click('#notif .nt'); page.wait_for_timeout(450)
    check(ev(page, "document.querySelectorAll('#notif .nt').length") == 0, 'الضغط يغلق الإشعار')
    # إشعار بوجهة (عرض انتقال) يفتح وجهته
    ev(page, "G.UI.fxClear(); G.UI.cur='home'; G.UI.render(); G.UI.notify('offer','عرض انتقال','نادٍ يريدك',{go:['goSub','market','mk:offers']})"); page.wait_for_timeout(300)
    page.click('#notif .nt'); page.wait_for_timeout(500)
    check(ev(page, "G.UI.cur") == 'market', 'إشعار العرض يفتح سوق الانتقالات (%s)' % ev(page, "G.UI.cur"))

    # 5) التوافق مع الواجهات القديمة
    ev(page, "G.UI.fxClear(); G.UI.toast('تم الحفظ')"); page.wait_for_timeout(300)
    check(ev(page, "document.querySelector('#notif .nt-ok')!==null"), 'UI.toast القديمة تعمل وتُصنَّف نجاحًا')
    ev(page, "G.UI.fxClear(); G.UI.toast('تعذّر تنفيذ العملية')"); page.wait_for_timeout(300)
    check(ev(page, "document.querySelector('#notif .nt-warn')!==null"), 'UI.toast لرسالة تحذير تُصنَّف تحذيرًا')
    ev(page, "G.UI.fxClear(); G.UI.banner('win','بطل الدوري','لقب',{art:'liga'})"); page.wait_for_timeout(300)
    check(ev(page, "document.querySelector('#notif .nt-win .nt-art')!==null") or ev(page, "document.querySelector('#notif .nt-k-win')!==null"), 'UI.banner القديمة تعمل (لقب مع شارة)')
    check(not [x for x in errors], 'لا أخطاء JS حتى الآن %s' % errors[:2])

    # 6) أحداث حقيقية: نهاية الأسبوع من الرئيسية
    ev(page, "G.UI.fxClear(); G.UI.cur='home'; G.UI.sub={}; G.UI.render(); window.scrollTo(0,0)"); page.wait_for_timeout(300)
    g = 0
    while ev(page, "!!G.Season.pending()") and g < 3:
        g += 1; ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(120)
        if page.query_selector('.mcta [data-a="playMatch"][data-v2="s"]'):
            page.click('.mcta [data-a="playMatch"][data-v2="s"]'); page.wait_for_timeout(300)
            if page.query_selector('[data-a="mvHome"]'): page.click('[data-a="mvHome"]')
        else: break
    ev(page, "G.UI.fxClear(); G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(200)
    if page.query_selector('[data-a="advanceWeek"]'):
        page.click('[data-a="advanceWeek"]'); page.wait_for_timeout(600)
        seen = ev(page, "[...document.querySelectorAll('#notif .nt')].map(e=>e.className)")
        check(any('nt-k-week' in c or 'nt-k-level' in c for c in seen), 'نهاية الأسبوع تُظهر إشعار أسبوع/مستوى (%s)' % seen)
    else:
        check(False, 'زر نهاية الأسبوع غير متاح للاختبار')
    # رسالة إصابة/عرض جديدة في الصندوق تظهر كإشعار
    ev(page, "G.UI.fxClear(); G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(200)
    ev(page, "(()=>{ const S=G.S; S.msgId=(S.msgId||0)+1; S.inbox.unshift({id:S.msgId, kind:'injury', title:'إصابة عضلية', text:'غبتَ عن 2 أسابيع. التفاصيل في الصندوق.', week:S.week, read:false}); G.UI.render(); })()"); page.wait_for_timeout(500)
    check(ev(page, "document.querySelector('#notif .nt-k-injury')!==null"), 'رسالة إصابة جديدة تظهر كإشعار إصابة')
    # لا يتكرر عند إعادة الرسم
    ev(page, "G.UI.fxClear(); G.UI.render()"); page.wait_for_timeout(300)
    check(ev(page, "document.querySelectorAll('#notif .nt').length") == 0, 'إعادة الرسم لا تكرر إشعار الرسالة القديمة')

    # 7) لا استهلاك لعشوائية اللعبة
    rng1 = ev(page, "JSON.stringify(G.rngState||null)")
    ev(page, "G.UI.fxClear(); G.UI.notify('me','هدف!','',{confetti:30})"); page.wait_for_timeout(300)
    rng2 = ev(page, "JSON.stringify(G.rngState||null)")
    check(rng1 == rng2, 'الإشعار والقصاصات لا تستهلك عشوائية اللعبة المحفوظة')
    check(rng0 is not None, 'حالة العشوائية مقروءة')

    # 8) الحركة المخفّضة
    ctx2 = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', reduced_motion='reduce')
    pg2 = ctx2.new_page(); attach_errors(pg2); new_game(pg2)
    ev(pg2, "G.UI.notify('me','هدف!','',{})"); pg2.wait_for_timeout(300)
    check(ev(pg2, "document.querySelectorAll('.cfw').length") == 0 and ev(pg2, "document.querySelectorAll('#notif .nt').length") == 1, 'الحركة المخفّضة: إشعار بلا قصاصات')
    check(not errors, 'لا أخطاء JS %s' % errors[:3])
    b.close()
finish()
