"""الملعب المرئي (v4.0 المرحلة 3): Canvas موجود وغير فارغ ويتحرّك، الكاميرا تتبدّل وتُحفظ، مشهد الهدف يحجب النتيجة حتى لحظته ثم يكشفها،
السرعة ×3 تتخطى المشاهد، حركة مخفّضة لا تحجب شيئًا، سقوط الرسم لا يجمّد المباراة، الإنهاء الفوري يُنظّف. الاستخدام: python3 tests/e2e/stadium_ui.py [مجلد_اللقطات] [العرض=390]"""
import sys, os
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

def open_live(page):
    new_game(page)
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    btn = page.query_selector('[data-a="playMatch"][data-v2="i"]')
    check(btn is not None, 'زر «العب/شاهد المباراة» موجود')
    btn.click(); page.wait_for_selector('#mvStage canvas', timeout=8000); page.wait_for_timeout(400)

def force_goal(page, side_of_user=True):
    return ev(page, """(()=>{const m=G.S.active.m, s=%s?m.side:(m.side==='h'?'a':'h'); const xi=m.xi[s].filter(x=>x.slot!=='GK'); const a=xi[0].id, b=xi[1].id;
      G.Live.addGoal(m,s,a,b); G.UI.mvRepaint(); return [m.score.h,m.score.a]})()""" % ('true' if side_of_user else 'false'))

def hero_score(page):
    return ev(page, "(document.querySelector('#mvHead .score .sc')||{}).textContent")
def sb_score(page):
    return ev(page, "(document.querySelector('.stg-sb .sc')||{}).textContent")

def run(vw, reduce=False):
    tag = '%d%s' % (vw, 'r' if reduce else '')
    print('— العرض %s —' % tag)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': vw, 'height': 844}, locale='ar', device_scale_factor=2, reduced_motion='reduce' if reduce else 'no-preference')
        page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
        open_live(page)
        ev(page, "(()=>{const m=G.S.active.m; const k=m.xi[m.side].findIndex(x=>x.slot==='CM'||x.slot==='CAM'||x.slot==='CDM'); if(k>=0 && !m.xi[m.side].some(x=>x.id===G.S.user)){ const old=m.xi[m.side][k]; m.xi[m.side][k]={id:G.S.user,slot:old.slot}; } G.UI.render()})()")
        page.wait_for_selector('#mvStage canvas'); page.wait_for_timeout(500)
        st = ev(page, "G.UI.stadium.stats()")
        check(st is not None and st['ents'] >= 22, '%s: الملعب مُركَّب (%s لاعبًا)' % (tag, st and st['ents']))
        box = ev(page, "(()=>{const r=document.querySelector('#mvStage .stg-in').getBoundingClientRect(); return [r.left,r.right,r.width,r.height]})()")
        check(box[0] >= -0.5 and box[1] <= vw + 0.5, '%s: الملعب داخل الشاشة (%s)' % (tag, [round(x) for x in box]))
        check(120 <= box[3] <= 330, '%s: ارتفاع الملعب معقول (%d)' % (tag, box[3]))
        overflow(page, tag + ' شاشة المباراة'); nohs(page, tag)
        # بكسلات حقيقية: ألوان متنوعة + أخضر سائد في النصف السفلي
        px = ev(page, """(()=>{const c=document.querySelector('#mvStage canvas'), g=c.getContext('2d'); const d=g.getImageData(0,Math.floor(c.height*0.45),c.width,Math.floor(c.height*0.5)).data; let gr=0,n=0; const seen=new Set(); for(let i=0;i<d.length;i+=16){n++; if(d[i+1]>d[i]+10&&d[i+1]>d[i+2]+10)gr++; seen.add((d[i]>>4)+'-'+(d[i+1]>>4)+'-'+(d[i+2]>>4));} return [gr/n, seen.size]})()""")
        check(px[0] > 0.35 and px[1] > 12, '%s: Canvas غير فارغ (أخضر %.0f%% · %d لونًا)' % (tag, px[0] * 100, px[1]))
        f1 = ev(page, "G.UI.stadium.stats().frames"); page.wait_for_timeout(600); f2 = ev(page, "G.UI.stadium.stats().frames")
        check(f2 - f1 >= 6, '%s: الإطارات تتقدّم (%d→%d)' % (tag, f1, f2))
        ms = ev(page, "G.UI.stadium.stats().avgMs")
        check(ms < 8, '%s: متوسط زمن الإطار %.2fms (<8)' % (tag, ms))
        shot(page, 'stg_%s_tv' % tag)
        # الكاميرا
        m0 = ev(page, "G.UI.stadium.stats().cam"); page.click('.stg-cam'); page.wait_for_timeout(500)
        m1 = ev(page, "G.UI.stadium.stats().cam"); sv = ev(page, "localStorage.getItem('fcc_cam')")
        check(m1 != m0 and sv == m1, '%s: الكاميرا تتبدّل وتُحفظ (%s→%s)' % (tag, m0, m1)); shot(page, 'stg_%s_cam1' % tag)
        page.click('.stg-cam'); page.wait_for_timeout(500); shot(page, 'stg_%s_cam2' % tag); page.click('.stg-cam'); page.wait_for_timeout(300)
        check(ev(page, "G.UI.stadium.stats().cam") == m0, '%s: دورة الكاميرا تعود للبث' % tag)
        # هدف: النتيجة محجوبة حتى لحظته
        before = hero_score(page)
        sc = force_goal(page, True); page.wait_for_timeout(250)
        busy = ev(page, "G.UI.stadium.busy()")
        if reduce:
            check(not busy, '%s: الحركة المخفّضة لا تحجب الدقّات' % tag)
            check(hero_score(page).replace(' ', '') in ('1-0', '0-1'), '%s: النتيجة تظهر فورًا (%s)' % (tag, hero_score(page)))
        else:
            check(busy, '%s: مشهد الهدف قيد العرض' % tag)
            check(hero_score(page) == before, '%s: الهيدر لا يكشف الهدف مبكرًا (%s)' % (tag, hero_score(page)))
            check('يسجّل' not in ev(page, "document.querySelector('#mvFeed').innerText"), '%s: السجل لا يكشف الهدف مبكرًا' % tag)
            page.wait_for_timeout(2600); shot(page, 'stg_%s_goal' % tag)
            for _ in range(60):
                if not ev(page, "G.UI.stadium.busy()"): break
                page.wait_for_timeout(500)
            check(not ev(page, "G.UI.stadium.busy()"), '%s: المشهد ينتهي (لا تجميد)' % tag)
            page.wait_for_timeout(700)
            hs = hero_score(page).replace(' ', '')
            check(hs == '%d-%d' % (sc[0], sc[1]), '%s: النتيجة تُكشف بعد المشهد (%s)' % (tag, hs))
            check(sb_score(page).replace(' ', '') == hs, '%s: لوحة الملعب = لوحة الهيدر' % tag)
            check('يسجّل' in ev(page, "document.querySelector('#mvFeed').innerText"), '%s: السجل يعرض الهدف بعد المشهد' % tag)
        # لحظة قرار تفاعلية: يقترب الملعب من لاعبك ويصغر ليفسح مكان الخيارات، وبعد الاختيار يُستأنف كل شيء
        if not reduce:
            h0 = ev(page, "G.UI.stadium.stats().h")
            ok = ev(page, "(()=>{const m=G.S.active.m; if(!G.Live.userOn(m)) return false; const c=G.Moments.make(m); if(!c) return false; c.lab=m.labs[m.i-1]; m.pending=c; G.UI.mvRepaint(); return true})()")
            check(ok, '%s: لحظة قرار أُنشئت للاعب داخل الملعب' % tag)
            if ok:
                page.wait_for_timeout(900)
                check(page.query_selector('#mvMoment .opt') is not None, '%s: خيارات القرار ظاهرة' % tag)
                h1 = ev(page, "G.UI.stadium.stats().h")
                check(h1 < h0, '%s: الملعب يصغر أثناء القرار (%d→%d)' % (tag, h0, h1))
                shot(page, 'stg_%s_moment' % tag)
                page.click('#mvMoment .opt'); page.wait_for_timeout(1200)
                check(ev(page, "!G.S.active.m.pending"), '%s: القرار يُحسم' % tag)
                for _ in range(40):
                    if not ev(page, "G.UI.stadium.busy()"): break
                    page.wait_for_timeout(300)
                check(ev(page, "G.UI.stadium.stats().h") >= h0, '%s: الملعب يعود لحجمه بعد القرار' % tag)
        # السرعة ×3 تتخطى المشاهد
        if not reduce:
            force_goal(page, False); page.wait_for_timeout(150)
            page.click('[data-a="mvSpeed"]'); page.click('[data-a="mvSpeed"]')
            check(ev(page, "G.UI.mv.speed") == 3, '%s: السرعة ×3' % tag)
            for _ in range(20):
                if not ev(page, "G.UI.stadium.busy()"): break
                page.wait_for_timeout(150)
            check(not ev(page, "G.UI.stadium.busy()"), '%s: ×3 تتخطى مشهد الهدف' % tag)
            m = ev(page, "G.S.active ? [G.S.active.m.i, G.S.active.m.done] : null")
            page.wait_for_timeout(1200)
            m2 = ev(page, "G.S.active ? [G.S.active.m.i, G.S.active.m.done] : null")
            check(m2 is None or m2[0] > m[0] or m2[1], '%s: المباراة تتقدّم عند ×3 (%s→%s)' % (tag, m, m2))
        # إنهاء فوري: يُحسم الباقي، تُعتمد النتيجة، ويُنظَّف الملعب
        ev(page, "G.UI.mv.speed=1; G.UI.mv.paused=false")
        page.click('[data-a="mvFinish"]'); page.wait_for_selector('.sheet [data-a="yes"], [data-a="yes"]', timeout=5000)
        page.click('[data-a="yes"]'); page.wait_for_timeout(1500)
        check(ev(page, "G.UI.mv && G.UI.mv.phase") == 'post', '%s: الإنهاء الفوري ينقل إلى ملخص المباراة' % tag)
        check(ev(page, "G.UI.stadium.stats()") is None, '%s: الملعب يُنظَّف بعد المباراة' % tag)
        lm = ev(page, "(()=>{const a=G.S.lastMatch, m=G.UI.lastM; return a&&m ? [a.score.h, a.score.a, m.score.h, m.score.a, m.ev.filter(e=>e.k==='goal').length] : null})()")
        check(lm is not None and lm[0] == lm[2] and lm[1] == lm[3] and lm[2] + lm[3] == lm[4], '%s: النتيجة المعتمدة = نتيجة المحرك = عدد أحداث الأهداف (%s)' % (tag, lm))
        check(not errors, '%s: أخطاء JS: %s' % (tag, errors[:3]))
        b.close()

def failover():
    print('— سقوط الرسم لا يجمّد المباراة —')
    errors.clear()
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar')
        page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
        open_live(page)
        ev(page, "G.Stadium.project = () => { throw new Error('boom') }")
        page.wait_for_timeout(600)
        check(ev(page, "G.UI.stadium.stats()") is None, 'الملعب يُسقِط نفسه بعد أخطاء متكررة')
        check(ev(page, "G.UI.stadium.busy()") is False, 'busy=false بعد السقوط')
        i0 = ev(page, "G.S.active.m.i"); page.wait_for_timeout(1500)
        i1 = ev(page, "G.S.active ? G.S.active.m.i : 99")
        check(i1 > i0, 'المباراة تتابع بدون الملعب (%d→%d)' % (i0, i1))
        check(ev(page, "G.lastError && G.lastError.label") == 'stadium', 'الخطأ مسجَّل في G.lastError')
        b.close()

for w in ([VW] if len(sys.argv) > 2 else [360, 390, 412]):
    run(w)
run(390, reduce=True)
failover()
finish()
