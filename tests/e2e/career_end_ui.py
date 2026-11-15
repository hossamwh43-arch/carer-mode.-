"""المرحلة 4 (واجهة): بطاقة «علاقاتي» الأربع، تنبيهات نهاية المسيرة، الاعتزال الإجباري، وبطاقة الإرث — على 360/390/412.
الاستخدام: python3 tests/e2e/career_end_ui.py [مجلد_اللقطات]"""
import sys
from common import *
import common
from season_helpers import fast_seasons
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''

def go_end(page):
    for _i in range(40):
        r = ev(page, "(()=>{const x=G.Sim.run({mode:'event',autoDP:true}); if(G.S.offers&&G.S.offers.length) G.S.offers.slice().forEach(o=>G.Transfers.rejectOffer(o.id)); return {ph:G.S.phase}})()")
        if r['ph'] == 'end': break
    ev(page, "G.S.tour=9; if(G.S.intl && !G.S.intl.done) G.Intl.autoFinish(); G.UI.cur='home'; G.UI.render()")
    page.wait_for_timeout(200)

def run(vw):
    tag = str(vw)
    print('— العرض %s —' % tag)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': vw, 'height': 844}, locale='ar', device_scale_factor=2)
        page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
        new_game(page)
        # 1) بطاقة العلاقات في الملف الشخصي
        ev(page, "G.UI.go ? G.UI.go('profile') : (G.UI.cur='profile', G.UI.render())"); page.wait_for_timeout(300)
        rl = page.query_selector_all('.rl')
        check(len(rl) == 4, '%s: أربع علاقات (مدرب/زملاء/جماهير/إدارة): %d' % (tag, len(rl)))
        t = txt(page)
        check('الزملاء' in t and 'كيمياء' in t and 'المدرب' in t and 'الجماهير' in t and 'الإدارة' in t, '%s: نص العلاقات وأثرها ظاهر' % tag)
        overflow(page, tag + ' الملف الشخصي'); nohs(page, tag); shot(page, 'rel_%s' % tag)
        # تغيّر العلاقة ينعكس على الواجهة
        ev(page, "G.Locker.get().v = 82; G.UI.render()"); page.wait_for_timeout(200)
        check('قلب الفريق' in txt(page), '%s: وسم «قلب الفريق» عند 82' % tag)
        ev(page, "G.Locker.get().v = 55")
        # 2) تنبيه المرحلة العمرية في نهاية الموسم
        go_end(page)
        ev(page, "G.P(G.S.user).age = 36; G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(200)
        check('تجاوزتَ الخامسة والثلاثين' in txt(page), '%s: تنبيه ما بعد 35' % tag)
        ev(page, "G.P(G.S.user).age = 39; G.UI.render()"); page.wait_for_timeout(200)
        check('عقد سنة' in txt(page) and 'الاعتزال الإجباري' in txt(page), '%s: تنبيه 38+ (عقد سنة + الاعتزال الإجباري)' % tag)
        # 3) الموسم الأخير الإجباري
        ev(page, "G.P(G.S.user).age = G.Season.RETIRE.forced; G.UI.render()"); page.wait_for_timeout(200)
        check('هذا موسمك الأخير' in txt(page), '%s: تنبيه «موسمك الأخير»' % tag)
        btn = page.query_selector('[data-a="rollover"]')
        check(btn is not None and 'إنهاء المسيرة' in btn.inner_text(), '%s: زر الانتقال يصبح «إنهاء المسيرة»' % tag)
        shot(page, 'last_%s' % tag)
        page.eval_on_selector('[data-a="rollover"]', 'e => e.click()'); page.wait_for_timeout(600)
        check(ev(page, "G.S.phase") == 'retired' and ev(page, "G.S.retiredAt.forced") is True, '%s: الاعتزال الإجباري تم' % tag)
        check('نهاية المسيرة' in ev(page, 'document.body.innerText'), '%s: نافذة نهاية المسيرة' % tag)
        ev(page, "G.UI.closeSheet(); G.UI.cur='career'; G.UI.render()"); page.wait_for_timeout(300)
        t = txt(page)
        check('إرثك' in t and 'درجة الإرث' in t and 'اعتزال إجباري' in t, '%s: بطاقة الإرث تظهر على شاشة المسيرة' % tag)
        overflow(page, tag + ' إرث'); nohs(page, tag); shot(page, 'legacy_%s' % tag)
        # تحميل الحفظ بعد الاعتزال يحتفظ بالحالة
        ev(page, "G.Save.save()"); page.reload(); page.wait_for_timeout(1200)
        check(ev(page, "G.S && G.S.phase") == 'retired', '%s: إعادة التحميل بعد الاعتزال تحفظ الحالة' % tag)
        check(not errors, '%s: أخطاء JS: %s' % (tag, errors[:3]))
        b.close()

for w in (360, 390, 412):
    run(w)
finish()
