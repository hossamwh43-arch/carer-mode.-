"""اللياقة وتبديلات المدرب في الواجهة (Build 24): بطاقة «لياقتك البدنية» بأرقام اللاعب الفعلية، بطاقة الجاهزية في ملفي، شاشة المباراة (طاقة + سطر المدرب بلا فيضان)،
واستبدال المرهَق فعليًا أثناء مباراة تُلعَب عبر الواجهة (حدث في السجل + حالة «تم استبدالك» + اللاعب خارج التشكيلة). الاستخدام: python3 tests/e2e/stamina_ui.py [مجلد_اللقطات] [العرض]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

def run(vw):
    tag = str(vw)
    print('— العرض %s —' % tag)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': vw, 'height': 844}, locale='ar', device_scale_factor=2)
        page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
        new_game(page)
        # 1) صفحة التدريب: البطاقة الجديدة بأرقام فعلية
        ev(page, "G.UI.cur='train'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
        card = page.query_selector('.fitc')
        check(card is not None, '%s: بطاقة «لياقتك البدنية» موجودة في التدريب' % tag)
        if card:
            t = card.inner_text(); info = ev(page, "G.Stamina.info(G.P(G.S.user))")
            check('اللياقة الأساسية' in t and 'الجاهزية الآن' in t and str(info['cond']) in t and (str(info['fit']) + '%') in t, '%s: أرقام البطاقة = أرقام اللاعب (أساس %s · جاهزية %s)' % (tag, info['cond'], info['fit']))
            check('+9%' not in page.inner_text('body') and '+14%' not in page.inner_text('body'), '%s: لا أرقام «استشفاء» قديمة وهمية' % tag)
            shot(page, 'stm_%s_train' % tag)
        overflow(page, tag + ' التدريب'); nohs(page, tag)
        # 2) ملفي: بطاقة الجاهزية
        ev(page, "G.UI.cur='profile'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
        check('الجاهزية' in page.inner_text('.gauges') and 'اللياقة' not in page.inner_text('.gauges'), '%s: مقياس الجاهزية في الملف' % tag)
        # 3) مباراة بلياقة منهَكة: اللاعب أساسي
        ev(page, "(()=>{const u=G.P(G.S.user); u.fit=40; u.cond=78; u.trust=70; G.Coach.decide(); u.role='starter'; u.fit=40; G.UI.cur='matches'; G.UI.render()})()"); page.wait_for_timeout(250)
        btn = page.query_selector('[data-a="playMatch"][data-v2="i"]')
        check(btn is not None, '%s: زر المباراة موجود' % tag)
        btn.click(); page.wait_for_selector('#mvStage canvas', timeout=8000); page.wait_for_timeout(400)
        ev(page, "(()=>{const m=G.S.active.m; if(!m.xi[m.side].some(x=>x.id===G.S.user)){ const k=m.xi[m.side].findIndex(x=>x.slot===G.P(G.S.user).pos||x.slot==='CM'); const old=m.xi[m.side][k>=0?k:5]; m.xi[m.side][k>=0?k:5]={id:G.S.user,slot:old.slot}; m.ps[G.S.user].in=0; m.uState='start'; } G.UI.render()})()")
        page.wait_for_selector('#mvHead .mvh-state'); page.wait_for_timeout(500)
        st = page.inner_text('#mvHead .mvh-state')
        check('طاقة' in st and 'لياقة' not in st, '%s: الهيدر يعرض «طاقة» (%s)' % (tag, st.strip()))
        e0 = ev(page, "Math.round(G.S.active.m.fat[G.S.user])")
        check(e0 < 80, '%s: طاقة البداية تعكس جاهزية 40%% (%s)' % (tag, e0))
        coach = page.query_selector('.mvcoach')
        check(coach is not None and 'مدربك' in coach.inner_text(), '%s: سطر شخصية المدرب ظاهر' % tag)
        box = coach.bounding_box() if coach else None
        check(box and box['x'] >= -0.5 and box['x'] + box['width'] <= vw + 0.5, '%s: سطر المدرب داخل الشاشة' % tag)
        overflow(page, tag + ' شاشة المباراة'); nohs(page, tag)
        shot(page, 'stm_%s_match' % tag)
        # 4) تشغيل بسرعة ×3 مع حسم القرارات آليًا حتى يُستبدل اللاعب
        page.click('[data-a="mvSpeed"]'); page.click('[data-a="mvSpeed"]')
        out = None
        for _ in range(240):
            out = ev(page, "G.S.active ? G.S.active.m.ps[G.S.user].out : -1")
            if out is None or out == -1:
                pass
            if out not in (None,) and out != -1:
                break
            if ev(page, "!G.S.active || G.S.active.m.done"):
                break
            if page.query_selector('#mvMoment .opt'):
                page.click('#mvMoment .opt')
            page.wait_for_timeout(250)
        res = ev(page, """(()=>{const a=G.S.active; if(!a) return null; const m=a.m, u=G.S.user, ps=m.ps[u];
          const ev0=m.ev.find(e=>e.k==='sub'&&e.p2===u); return {out:ps.out, inXI:m.xi[m.side].some(x=>x.id===u), txt:ev0?ev0.txt:'', min:ev0?ev0.lab:null, state:(document.querySelector('#mvHead .mvh-state')||{}).textContent||''}})()""")
        check(res is not None and res['out'] is not None, '%s: المدرب استبدل اللاعب المرهَق فعليًا (خرج بالدقيقة %s)' % (tag, res and res['out']))
        if res and res['out'] is not None:
            check(not res['inXI'], '%s: اللاعب خرج من التشكيلة' % tag)
            check('يدخل' in res['txt'] and 'إرهاق' in res['txt'] or 'حماية' in res['txt'] or 'أداء' in res['txt'], '%s: سبب التبديل ظاهر في الحدث (%s)' % (tag, res['txt']))
            check(res['out'] <= 80, '%s: التبديل قبل الدقيقة 80 (%s)' % (tag, res['out']))
            page.wait_for_timeout(500)
            feed = page.inner_text('#mvFeed') if page.query_selector('#mvFeed') else ''
            check('يدخل' in feed, '%s: السجل يعرض التبديل' % tag)
            check('استبدال' in ev(page, "(document.querySelector('#mvHead .mvh-state')||{}).textContent||''"), '%s: الهيدر يعرض «تم استبدالك»' % tag)
            shot(page, 'stm_%s_sub' % tag)
        # 5) إنهاء ثم ملخص بلا أخطاء
        ev(page, "G.UI.mv.speed=1; G.UI.mv.paused=false")
        if page.query_selector('[data-a="mvFinish"]'):
            page.click('[data-a="mvFinish"]'); page.wait_for_selector('[data-a="yes"]', timeout=5000); page.click('[data-a="yes"]'); page.wait_for_timeout(1500)
        check(ev(page, "G.UI.mv && G.UI.mv.phase") == 'post', '%s: ملخص المباراة يظهر' % tag)
        fit1 = ev(page, "Math.round(G.P(G.S.user).fit)")
        check(25 <= fit1 < 40, '%s: الجاهزية تنخفض بعد المباراة (40 → %s) وفق الدقائق' % (tag, fit1))
        check(not errors, '%s: أخطاء JS: %s' % (tag, errors[:3]))
        b.close()

for w in ([VW] if len(sys.argv) > 2 else [360, 390, 412]):
    run(w)
finish()
