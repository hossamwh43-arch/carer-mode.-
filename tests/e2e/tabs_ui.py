"""Build 27 — شريط التبويبات الموحّد: شريط واحد لكل صفحة، تمرير أفقي بمؤشرات، جزء من التبويب التالي ظاهر، تبديل صحيح، قائمة الأقسام في العنوان،
ولون الحالة النشطة هادئ (الأحمر للأفعال الرئيسية فقط). الاستخدام: python3 tests/e2e/tabs_ui.py [مجلد_اللقطات] [العرض]
ملاحظة: القياس على Chromium في الحاوية لا على جهاز أندرويد حقيقي."""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(20000); attach_errors(page)
    new_game(page); play_weeks(page, 2)
    routes = ev(page, "Object.keys(G.UI.screens)")
    multi, nobar, bad_sel, nopeek, clipped = [], [], [], [], []
    with_tabs = []
    for r in routes:
        ev(page, "G.UI.fxClear(); G.UI.sub={}; G.UI.cur=%r; G.UI.render(); window.scrollTo(0,0)" % r); page.wait_for_timeout(60)
        info = page.evaluate("""() => ({ bars: document.querySelectorAll('#app .sw').length, tabsets: document.querySelectorAll('#app .tabs').length, inline: document.querySelectorAll('#app .tabs.inline').length,
          tabs: document.querySelectorAll('#app .sw .tab').length, on: document.querySelectorAll('#app .sw .tab[aria-selected="true"]').length, onCls: document.querySelectorAll('#app .sw .tab.on').length })""")
        if info['tabs']:
            with_tabs.append(r)
            if info['bars'] != 1 or info['on'] != 1 or info['onCls'] != 1: bad_sel.append((r, info))
        if info['tabs']:
            pk = page.evaluate("""() => { const t = document.querySelector('.sw .tabs'); const bx = t.getBoundingClientRect(); if ([...t.querySelectorAll('.tab')].every(b => { const q = b.getBoundingClientRect(); return q.left >= bx.left - 1 && q.right <= bx.right + 1 })) return 'fit'; const W = innerWidth; const part = [...t.querySelectorAll('.tab')].some(b => { const r = b.getBoundingClientRect(); return (r.left < W - 6 && r.right > W + 6) || (r.right > 6 && r.left < -6) });
              const cl = [...t.querySelectorAll('.tab')].filter(b => { const g = document.createRange(); g.selectNodeContents(b); return g.getBoundingClientRect().width > b.clientWidth + 1 }).length; return part ? 'peek' + (cl ? '+clip' : '') : 'nopeek' }""")
            if pk == 'nopeek': nopeek.append(r)
            if pk.endswith('clip'): clipped.append(r)
        if info['bars'] > 1 or (info['tabsets'] - info['inline']) > 1: multi.append((r, info))
    check(len(routes) >= 20, '%s: عدد الشاشات المفحوصة %d' % (VW, len(routes)))
    check(len(with_tabs) >= 8, 'شاشات بتبويبات صفحة: %d (%s)' % (len(with_tabs), ' '.join(with_tabs)))
    check(not multi, 'لا شريطا تبويب فوق بعضهما في أي شاشة %s' % multi)
    check(not nopeek, 'كل شريط تبويبات يتجاوز العرض يُظهر جزءًا من التبويب التالي (%s) %s' % (VW, nopeek))
    check(not clipped, 'لا نص مقصوص في أي تبويب بأي شاشة %s' % clipped)
    check(not bad_sel, 'كل شريط فيه تبويب نشط واحد بالضبط (aria-selected + .on) %s' % bad_sel)
    ev(page, "G.UI.cur='home'; G.UI.render()")
    check(ev(page, "document.querySelectorAll('#app .sw').length") == 0, 'الرئيسية بلا شريط تبويبات')

    # ---- شاشة بتبويبات كثيرة: الدوري ----
    ev(page, "G.UI.cur='league'; G.UI.sub={}; G.UI.render(); window.scrollTo(0,0)"); page.wait_for_timeout(300)
    st = page.evaluate("""() => { const t = document.querySelector('.sw .tabs'); const sw = document.querySelector('.sw'); return { sw: t.scrollWidth, cw: t.clientWidth, ds: sw.dataset.s || '', n: t.querySelectorAll('.tab').length, mask: getComputedStyle(t).maskImage || getComputedStyle(t).webkitMaskImage } }""")
    print('   league tabs:', st)
    check(st['n'] >= 4, 'الدوري: %d تبويبات' % st['n'])
    check(st['sw'] > st['cw'], 'الدوري: التبويبات تتجاوز العرض فتصير قابلة للتمرير (%d > %d)' % (st['sw'], st['cw']))
    check(st['ds'] != '', 'مؤشر التمرير data-s موجود (%r)' % st['ds'])
    arrow = page.evaluate("() => { const g = document.querySelector('.sw-go.e'); const cs = getComputedStyle(g); return [cs.display, cs.backgroundImage.indexOf('gradient') >= 0] }")
    check(arrow[0] != 'none' and arrow[1], 'سهم التالي ظاهر بتدرّج على الحافة (%s)' % arrow)
    part = page.evaluate("""() => { const W = innerWidth; return [...document.querySelectorAll('.sw .tab')].some(b => { const r = b.getBoundingClientRect(); return (r.left < W - 6 && r.right > W + 6) || (r.right > 6 && r.left < -6) }) }""")
    check(part, 'جزء مقصود من تبويب مجاور ظاهر لتلميح التمرير')
    # لا قصّ للنصوص داخل التبويب نفسه
    clip = page.evaluate("""() => [...document.querySelectorAll('.sw .tab')].filter(b => { const r = document.createRange(); r.selectNodeContents(b); return r.getBoundingClientRect().width > b.clientWidth + 1 || getComputedStyle(b).overflow !== 'visible' }).map(b => b.textContent.trim())""")
    check(not clip, 'لا نص مقصوص داخل أي تبويب %s' % clip)
    # الضغط على سهم التالي يحرّك الشريط
    before = ev(page, "document.querySelector('.sw .tabs').scrollLeft")
    go = page.query_selector('.sw .sw-go.e')
    if go and go.is_visible():
        go.click(); page.wait_for_timeout(500)
        after = ev(page, "document.querySelector('.sw .tabs').scrollLeft")
        check(after != before, 'سهم التالي يمرّر الشريط (%s → %s)' % (before, after))
    else:
        check(False, 'سهم التالي ظاهر في الدوري')
    # أمر التبديل: ضغط تبويب بعيد يجعله نشطًا ومرئيًا
    last = page.query_selector_all('.sw .tab')[-1]
    key = last.get_attribute('data-v2'); last.click(); page.wait_for_timeout(600)
    ok = page.evaluate("""(k) => { const b = document.querySelector('.sw .tab[data-v2="' + k + '"]'); const r = b.getBoundingClientRect(); return [b.getAttribute('aria-selected'), r.left >= -1 && r.right <= innerWidth + 1] }""", key)
    check(ok[0] == 'true', 'التبويب الأخير يصير نشطًا بعد الضغط (%s)' % key)
    check(ok[1], 'التبويب النشط كاملًا داخل الشاشة بعد التمرير التلقائي')
    overflow(page, 'الدوري بعد التبديل'); nohs(page, 'الدوري')
    shot(page, 'tabs_league_%d' % VW)

    # ---- اللون: التبويب النشط ليس أحمر مصمتًا ----
    col = page.evaluate("""() => { const b = document.querySelector('.sw .tab.on'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, fg: cs.color } }""")
    def rgb(s): return [int(float(x)) for x in s[s.index('(') + 1:s.index(')')].replace('/', ' ').replace(',', ' ').split()[:3]]
    bg = rgb(col['bg']); redsolid = bg[0] > 190 and bg[1] < 90 and bg[2] < 90
    check(not redsolid, 'خلفية التبويب النشط ليست أحمر مصمتًا %s' % col['bg'])

    # ---- قائمة الأقسام في العنوان ----
    for r, want in [('league', 'الدوري'), ('market', 'الانتقالات'), ('worldrank', 'التصنيفات')]:
        ev(page, "G.UI.sub={}; G.UI.cur=%r; G.UI.render()" % r); page.wait_for_timeout(120)
        has = page.evaluate("() => { const t = document.getElementById('topTitle'); return !!t && t.classList.contains('menu') }")
        if not has: print('   (لا قائمة أقسام على %s)' % r); continue
        page.click('#topTitle'); page.wait_for_timeout(300)
        rows = page.evaluate("() => [...document.querySelectorAll('.sec-row')].map(b => [b.dataset.v, b.classList.contains('on')])")
        check(len(rows) >= 2 and sum(1 for x in rows if x[1]) == 1, '%s: قائمة الأقسام فيها %d صفًا ونشط واحد' % (r, len(rows)))
        tgt = [x[0] for x in rows if not x[1]][0]
        page.click('.sec-row[data-v="%s"]' % tgt); page.wait_for_timeout(350)
        check(ev(page, "G.UI.cur") == tgt, '%s: اختيار قسم من القائمة يفتحه (%s)' % (r, tgt))
        check(ev(page, "document.querySelectorAll('.sheet .sec-row, .sec-list').length") == 0, 'القائمة تُغلق بعد الاختيار')
    check(not errors, 'لا أخطاء JS %s' % errors[:3])
    b.close()
finish()
