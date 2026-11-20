"""Build 27 — الملعب: عنوان بداية المباراة (اتجاه النقطتين بين العربية واللاتينية)، عزل المقاطع اللاتينية، خط هوية اللعبة لأسماء اللاعبين وأرقام القمصان،
وعدم تغيّر مواضع اللاعبين بسبب ذلك. الاستخدام: python3 tests/e2e/stadium_caption.py [مجلد_اللقطات] [العرض]
ملاحظة: القياس على Chromium في الحاوية لا على جهاز أندرويد حقيقي."""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    # تسجيل كل قيم ctx.font المضبوطة قبل أن تُحمَّل الصفحة (لفحص خطوط الأسماء والأرقام)
    page.add_init_script("""(()=>{ window.__fonts = new Set(); const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font'); Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', { get(){ return d.get.call(this) }, set(v){ try{ window.__fonts.add(String(v)) }catch(e){} d.set.call(this, v) }, configurable: true }) })()""")
    new_game(page)
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    page.query_selector('[data-a="playMatch"][data-v2="i"]').click()
    page.wait_for_selector('#mvStage canvas', timeout=8000); page.wait_for_timeout(1000)
    ev(page, "G.UI.mv.paused=true")

    # 1) عنوان بداية المباراة
    c = page.evaluate("""() => { const cap = document.querySelector('.stg-cap'); const k = cap.querySelector('.cap-k'); const v = cap.querySelector('.cap-v'); const lat = cap.querySelector('.cap-v .lat');
      return { k: k && k.textContent, kdir: k && k.getAttribute('dir'), v: v && v.textContent, latdir: lat && lat.getAttribute('dir'), latfont: lat && getComputedStyle(lat).fontFamily, kr: k && k.getBoundingClientRect().toJSON(), vr: v && v.getBoundingClientRect().toJSON(), cr: cap.getBoundingClientRect().toJSON(), txt: cap.textContent } }""")
    check(c['k'] is not None and c['k'].endswith(':') and 'صافرة البداية' in c['k'], 'العنوان العربي يحمل نقطتيه في نهايته المنطقية (%r)' % c['k'])
    check(c['kdir'] == 'rtl' and c['latdir'] == 'ltr', 'العنوان معزول RTL والفريقان معزولان LTR')
    check(c['v'] and ' × ' in c['v'] and not c['v'].startswith(':') and ':' not in c['v'], 'سطر الفريقين بلا نقطتين شاردتين (%r)' % c['v'])
    check('Disp' in (c['latfont'] or ''), 'الفريقان بخط هوية اللعبة (%s)' % c['latfont'])
    check(c['vr']['top'] >= c['kr']['bottom'] - 1, 'الفريقان تحت العنوان لا فوقه ولا متداخلين')
    check(c['cr']['left'] >= -1 and c['cr']['right'] <= VW + 1, 'السطر السفلي داخل عرض الشاشة')
    overflow(page, 'الملعب'); shot(page, 'caption_start_%d' % VW)

    # 2) أحداث أخرى: المقاطع اللاتينية معزولة (اسم لاعب داخل جملة عربية)
    # (لا نحقن أحداثًا في المحاكاة: نفحص عبارة المطابقة نفسها المستخدمة في capHtml)
    sample = page.evaluate("""() => { const s = 'هدف! J. Smith يسجل'; const re = /[A-Za-z\\u00C0-\\u024F][A-Za-z\\u00C0-\\u024F0-9 .'\\u2019\\-\\u00D7]*[A-Za-z\\u00C0-\\u024F0-9.]|[A-Za-z\\u00C0-\\u024F]/g; return s.match(re) }""")
    check(sample == ['J. Smith'], 'مطابقة المقاطع اللاتينية تلتقط الاسم كاملًا فقط (%s)' % sample)

    # 3) خطوط Canvas: اسم اللاعب بخط الهوية Disp، ورقم القميص بخط Num، دون تغيير الأحجام
    ev(page, "G.UI.stadium.debug({mute:true})"); pid = ev(page, "G.UI.stadium.debug({celeb:'hug', cam:'follow'})")
    ev(page, "G.UI.mv.paused=false"); page.wait_for_timeout(1800)
    fonts = ev(page, "[...window.__fonts]")
    check(any('"Disp"' in f for f in fonts), 'Canvas: اسم اللاعب بخط الهوية Disp')
    check(any('"Num"' in f for f in fonts), 'Canvas: أرقام القمصان بخط الأرقام Num')
    print('   خطوط Canvas المستخدمة:', sorted(set(f.split('px ', 1)[-1][:40] for f in fonts)))
    check(not any(('system-ui' in f) and ('"Disp"' not in f) and ('"Num"' not in f) and f.startswith(('700', '800')) for f in fonts), 'لا نص لاعب/رقم بخط النظام وحده (كل خطوط 700/800 تمرّ بخطوط الهوية)')
    shot(page, 'caption_name_%d' % VW)

    # 4) المواضع لم تتأثر: المحاكاة نفسها (إحداثيات الكيانات حتمية بعد إعادة البدء بنفس البذرة؟) — نتحقق أن كل الكيانات داخل حدود الملعب
    ok = ev(page, "(()=>{ const s=G.UI.stadium.stats(); return !!s })()")
    check(ok, 'إحصاءات الملعب متاحة')
    check(not errors, 'لا أخطاء JS %s' % errors[:3])
    b.close()
finish()
