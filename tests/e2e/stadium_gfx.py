"""رسوميات الملعب (Build 24): ليل/غروب/نهار + مطر بلا تدهور أداء، 5 احتفالات متنوعة بوضعيات مختلفة، جمهور متحرك، شريط تبديل تلفزيوني،
وضع الحركة المخفّضة، وعدم وجود أخطاء JS. تلتقط لقطات للمراجعة البصرية. الاستخدام: python3 tests/e2e/stadium_gfx.py [مجلد_اللقطات] [العرض]
ملاحظة: القياس على Chromium في الحاوية لا على جهاز أندرويد حقيقي."""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

def open_live(page):
    new_game(page)
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(200)
    page.query_selector('[data-a="playMatch"][data-v2="i"]').click()
    page.wait_for_selector('#mvStage canvas', timeout=8000); page.wait_for_timeout(500)

def sig(page):  # بصمة بسيطة لمحتوى الـCanvas: ألوان فريدة + نسبة الأخضر
    return ev(page, """(()=>{const c=document.querySelector('#mvStage canvas'); const g=c.getContext('2d'); const d=g.getImageData(0,0,c.width,c.height).data; const s=new Set(); let gr=0,n=0;
      for(let i=0;i<d.length;i+=4*37){ s.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4)); if(d[i+1]>d[i]+20&&d[i+1]>d[i+2]+10)gr++; n++; } return [s.size, Math.round(100*gr/n)]})()""")

def run(vw, reduce=False):
    tag = '%d%s' % (vw, 'r' if reduce else '')
    print('— العرض %s —' % tag)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': vw, 'height': 844}, locale='ar', device_scale_factor=2, reduced_motion='reduce' if reduce else 'no-preference')
        page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
        open_live(page)
        ev(page, "G.UI.mv.paused=true")
        # 1) إضاءة وأجواء
        sigs = {}
        for tod, rain, nm in [(0, False, 'night'), (1, False, 'dusk'), (2, False, 'day'), (0, True, 'rain')]:
            ev(page, "G.UI.stadium.debug({tod:%d, rain:%s})" % (tod, 'true' if rain else 'false')); page.wait_for_timeout(700)
            sg = sig(page); sigs[nm] = sg
            st = ev(page, "G.UI.stadium.stats()")
            check(sg[0] >= 60 and sg[1] >= 30, '%s: %s — الـCanvas غني (%s لونًا · أخضر %s%%)' % (tag, nm, sg[0], sg[1]))
            check(st['avgMs'] < 8, '%s: %s — متوسط زمن الإطار %.2fms (<8)' % (tag, nm, st['avgMs']))
            if rain and not reduce: check(ev(page, "G.UI.stadium.stats().rain") is True, '%s: المطر مفعّل' % tag)
            shot(page, 'gfx_%s_%s' % (tag, nm))
        check(sigs['night'] != sigs['day'], '%s: الليل يختلف بصريًا عن النهار' % tag)
        # 2) الاحتفالات الخمسة
        seen = set(); ev(page, "G.UI.stadium.debug({mute:true})"); ev(page, "G.UI.mv.paused=false"); page.wait_for_timeout(2500); ev(page, "G.UI.mv.paused=true")  # تفريغ أي هجمة جارية
        for kind in ['corner', 'slide', 'fans', 'hug', 'sky']:
            ev(page, "G.UI.stadium.debug({tod:0, rain:false})")
            pid = ev(page, "G.UI.stadium.debug({celeb:'%s', cam:'follow'})" % kind)
            check(bool(pid), '%s: احتفال %s يبدأ' % (tag, kind))
            ev(page, "G.UI.mv.paused=false"); dust_max = 0; exc = 0; poses = set()   # بلا هجمات طبيعية تقاطع الاحتفال
            seen.add(ev(page, "G.UI.stadium.stats().celeb"))
            for _ in range(14):
                page.wait_for_timeout(250)
                s2 = ev(page, "G.UI.stadium.stats()"); dust_max = max(dust_max, s2['dust']); exc = max(exc, s2['excite']); poses |= set(s2['poses'].keys())
                if _ == 8: shot(page, 'gfx_%s_celeb_%s' % (tag, kind))
            want = {'corner': 'arms', 'slide': 'slide', 'fans': 'arms', 'hug': 'jump', 'sky': 'kneel'}[kind]
            if not reduce: check(want in poses, '%s: وضعية %s ظهرت في احتفال %s (%s)' % (tag, want, kind, sorted(poses)))
            check(exc >= 0.5, '%s: حماس الجمهور يرتفع في %s (%.2f)' % (tag, kind, exc))
            if kind == 'slide' and not reduce: check(dust_max > 0, '%s: غبار الانزلاق يظهر (%d)' % (tag, dust_max))
            ev(page, "G.UI.mv.paused=true")
        check(len(seen) == 5, '%s: خمسة أنواع احتفال مختلفة (%s)' % (tag, sorted(seen)))
        ev(page, "G.UI.stadium.debug({mute:false})")
        # 3) شريط التبديل
        did = ev(page, """(()=>{const m=G.S.active.m, s=m.side; const out=m.xi[s].find(x=>x.slot==='CM'||x.slot==='CDM'||x.slot==='CAM'||x.slot==='LW'||x.slot==='ST'); const inn=m.bench[s].map(id=>G.S.players[id]).find(p=>p&&p.pos!=='GK'&&!m.ps[p.id].out);
          let r=false; if(out&&inn&&m.subs[s]>0){ r=G.Live.doSub(m,s,out.id,inn.id,out.slot,'إرهاق'); } G.UI.mvRepaint(); return r; })()""")
        check(did is True, '%s: تبديل فعلي نُفِّذ لاختبار الشريط' % tag)
        ev(page, "G.UI.mv.paused=false"); sub = None
        for _ in range(16):
            page.wait_for_timeout(250)
            sub = ev(page, "(()=>{const e=document.querySelector('.stg-sub'); return e&&!e.hidden?e.innerText:null})()")
            if sub: break
        check(sub is not None and '▲' in sub and '▼' in sub, '%s: شريط التبديل يظهر (%s)' % (tag, (sub or '').replace('\n', ' | ')))
        if sub:
            box = ev(page, "(()=>{const r=document.querySelector('.stg-sub').getBoundingClientRect(), s=document.querySelector('.stg-in').getBoundingClientRect(); return [r.left>=s.left-0.5, r.right<=s.right+0.5, r.top>=s.top-0.5, r.bottom<=s.bottom+0.5]})()")
            check(all(box), '%s: الشريط داخل الملعب (%s)' % (tag, box))
            shot(page, 'gfx_%s_sub' % tag)
        overflow(page, tag + ' الرسوميات'); nohs(page, tag)
        # 4) مباراة كاملة بسرعة ×3 بلا أخطاء
        ev(page, "G.UI.mv.speed=3")
        for _ in range(200):
            if ev(page, "!G.S.active || G.S.active.m.done || G.UI.mv.phase==='post'"): break
            if page.query_selector('#mvMoment .opt'): page.click('#mvMoment .opt')
            page.wait_for_timeout(200)
        st = ev(page, "G.UI.stadium.stats()")
        if st: check(st['avgMs'] < 8, '%s: متوسط الإطار بعد المباراة %.2fms' % (tag, st['avgMs']))
        check(not errors, '%s: أخطاء JS: %s' % (tag, errors[:3]))
        b.close()

for w in ([VW] if len(sys.argv) > 2 else [360, 390, 412]):
    run(w)
run(VW, reduce=True)
finish()
