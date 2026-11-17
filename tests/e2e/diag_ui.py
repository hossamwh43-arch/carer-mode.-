"""شاشة التشخيص (Build 25): بطاقة في الإعدادات، اختبار أداء الجهاز، نسخ التقرير، تسجيل أداء الملعب الفعلي بعد مباراة، عرض الأخطاء، ولا أخطاء JS.
الاستخدام: python3 tests/e2e/diag_ui.py [مجلد_اللقطات] [العرض]. ملاحظة: القياس هنا على Chromium في الحاوية لا على جهاز أندرويد."""
import sys, json
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

def run(vw):
    tag = str(vw); print('— العرض %s —' % tag)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': vw, 'height': 844}, locale='ar', device_scale_factor=2)
        page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
        new_game(page)
        ev(page, "localStorage.removeItem('fcc_perf')")
        ev(page, "G.UI.cur='settings'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
        card = page.query_selector('.diagc')
        check(card is not None, '%s: بطاقة التشخيص موجودة في الإعدادات' % tag)
        t = card.inner_text() if card else ''
        check('لم تُلعب بعد' in t and 'الشاشة والنافذة' in t and 'أخطاء مسجّلة' in t, '%s: محتوى البطاقة قبل أي مباراة' % tag)
        overflow(page, tag + ' الإعدادات'); nohs(page, tag)
        # اختبار الجهاز
        page.click('[data-a="benchRun"]'); page.wait_for_function("document.getElementById('benchOut') && /إطار\\/ث/.test(document.getElementById('benchOut').textContent)", timeout=12000)
        out = page.inner_text('#benchOut')
        check('اختبار تقريبي' in out, '%s: نتيجة الاختبار تُعرض مع تنبيه أنه تقريبي (%s)' % (tag, out.replace('\n', ' ')[:70]))
        bl = ev(page, "G.UI.benchLast")
        check(bl and bl['ok'] and bl['fps'] > 0 and bl['frames'] > 20 and bl['avgMs'] >= 0, '%s: أرقام الاختبار صالحة (%s)' % (tag, bl and (str(bl['fps']) + 'fps ' + str(bl['avgMs']) + 'ms')))
        check(ev(page, "document.querySelectorAll('canvas[style*=\"-9999px\"]').length") == 0, '%s: لا Canvas متروك بعد الاختبار' % tag)
        # نسخ التقرير
        ev(page, "window.__copied=null; Object.defineProperty(navigator,'clipboard',{value:{writeText:(t)=>{window.__copied=t; return Promise.resolve();}},configurable:true})")
        page.click('[data-a="diagCopy"]'); page.wait_for_timeout(300)
        cp = ev(page, "window.__copied") or ''
        check('تقرير تشخيص' in cp and 'الشاشة' in cp and 'اختبار الجهاز' in cp and 'الأخطاء' in cp, '%s: التقرير المنسوخ كامل (%d حرفًا)' % (tag, len(cp)))
        shot(page, 'diag_%s_settings' % tag)
        # أخطاء مسجّلة تظهر
        ev(page, "G.S.errors.push({t:Date.now(),label:'test',msg:'خطأ تجريبي'}); G.UI.render()"); page.wait_for_timeout(200)
        cnt = ev(page, "[...document.querySelectorAll('.diagc .kv')].find(k=>k.textContent.includes('أخطاء مسجّلة')).querySelector('b').textContent")
        check(cnt == '1', '%s: عدّاد الأخطاء يعرض 1 (%s)' % (tag, cnt))
        rep = ev(page, "G.Diag.text()")
        check('test: خطأ تجريبي' in rep, '%s: الأخطاء المسجّلة تدخل التقرير' % tag)
        # أداء فعلي بعد مباراة بالملعب المرئي
        ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
        page.query_selector('[data-a="playMatch"][data-v2="i"]').click(); page.wait_for_selector('#mvStage canvas', timeout=8000)
        page.wait_for_function("G.UI.stadium.stats() && G.UI.stadium.stats().frames >= 100", timeout=15000)
        ev(page, "G.UI.stadium.destroy()")
        rec = ev(page, "JSON.parse(localStorage.getItem('fcc_perf')||'[]')")
        check(len(rec) == 1 and rec[0]['frames'] >= 90 and rec[0]['fps'] > 0 and rec[0]['w'] > 0, '%s: سُجِّل أداء الملعب الفعلي (%s)' % (tag, rec and (str(rec[0]['fps']) + 'fps ' + str(rec[0]['avgMs']) + 'ms')))
        ev(page, "G.UI.cur='settings'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
        t2 = page.inner_text('.diagc')
        check('إطار/ث' in t2.split('آخر مباراة')[1][:60], '%s: البطاقة تعرض أداء آخر مباراة' % tag)
        overflow(page, tag + ' الإعدادات بعد المباراة'); nohs(page, tag)
        check(not errors, '%s: أخطاء JS: %s' % (tag, errors[:3]))
        b.close()

for w in ([VW] if len(sys.argv) > 2 else [360, 390, 412]):
    run(w)
finish()
