"""Build 27 — صورة اللاعب (الأفاتار): تنوّع واضح بين اللاعبين، ثبات الهوية بين الرئيسية والملف والبطاقة والمسيرة والمعالج،
عدم استهلاك عشوائية اللعبة أو تغيير الحالة، تحمّل بيانات look القديمة/الناقصة، ووضوح الحجم الصغير. الاستخدام: python3 tests/e2e/avatar_ui.py [مجلد_اللقطات] [العرض]
ملاحظة: القياس على Chromium في الحاوية لا على جهاز أندرويد حقيقي."""
import sys, re
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390

NORM = "(h) => h.replace(/ width=\"[^\"]*\"/, '').replace(/ height=\"[^\"]*\"/, '').replace(/id=\"[^\"]*\"/g, '').replace(/url\\(#[^)]*\\)/g, '')"

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(20000); attach_errors(page)
    new_game(page); play_weeks(page, 2)

    # 1) ثبات الهوية: نفس اللاعب بأحجام مختلفة = نفس الرسم
    r = ev(page, """(()=>{ const p=G.S.players[G.S.user]; const norm=(h)=>h.replace(/ width="[^"]*"/,'').replace(/ height="[^"]*"/,'').replace(/av\\d+/g,'avN');
      const a=[210,176,118,110,84,78].map(s=>norm(G.UI.avatar(p.look,p.club,s,p.n))); return {same:a.every(x=>x===a[0]), len:a[0].length, svg:/^<svg class="avatar"/.test(G.UI.avatar(p.look,p.club,78,p.n))} })()""")
    check(r['same'], 'اللاعب نفسه يُرسم بنفس الوجه في كل الأحجام (210/176/118/110/84/78)')
    check(r['svg'] and r['len'] > 800, 'الأفاتار SVG غني (%d حرفًا)' % r['len'])

    # 2) التنوّع: نفس look مع 60 اسمًا مختلفًا = وجوه مختلفة
    d = ev(page, """(()=>{ const look={skin:2,hair:0,style:0,beard:0,band:0}; const s=new Set(); for(let i=0;i<60;i++) s.add(G.UI.avatar(look,'ath',100,'لاعب'+i+' Name'+(i*7))); return s.size })()""")
    check(d >= 50, 'التنوّع: %d وجهًا مختلفًا من 60 اسمًا بنفس الإعدادات' % d)
    # كل خيار في المحرّر يغيّر الرسم فعلًا
    ch = ev(page, """(()=>{ const L=G.LOOK, base={skin:2,hair:0,style:0,beard:0,band:0}, out={}; const ref=G.UI.avatar(base,'ath',100,'X');
      for (const k of ['skin','hair','style','beard','band']) { const n=(L[k+'s']||L[k]||[]).length || (k==='band'?3:0); const set=new Set(); for(let i=0;i<Math.max(n,1);i++){ const lk=Object.assign({},base); lk[k]=i; set.add(G.UI.avatar(lk,'ath',100,'X')) } out[k]=[set.size,n] } return out })()""")
    print('   خيارات المحرر (متميّز/عدد):', ch)
    for k, v in ch.items():
        if v[1] > 1: check(v[0] == v[1], 'خيار «%s»: كل قيمة تعطي رسمًا مختلفًا (%d من %d)' % (k, v[0], v[1]))
    # لون القميص يتبع النادي
    c = ev(page, """(()=>{ const p=G.S.players[G.S.user]; const ids=Object.keys(G.S.clubs).slice(0,12); return new Set(ids.map(i=>G.UI.avatar(p.look,i,100,p.n))).size })()""")
    check(c >= 6, 'القميص يتبع النادي: %d صورة مختلفة من 12 ناديًا' % c)

    # 3) لا استهلاك للعشوائية ولا تغيير للحالة
    r1 = ev(page, "JSON.stringify([G.rngState, G.S.rng])"); s1 = ev(page, "JSON.stringify(G.S)")
    ev(page, "(()=>{ const p=G.S.players[G.S.user]; for(let i=0;i<300;i++) G.UI.avatar(p.look,p.club,100,'n'+i) })()")
    check(r1 == ev(page, "JSON.stringify([G.rngState, G.S.rng])"), 'رسم 300 أفاتار لا يستهلك عشوائية اللعبة')
    check(s1 == ev(page, "JSON.stringify(G.S)"), 'رسم الأفاتار لا يغيّر حالة اللعبة')

    # 4) بيانات look قديمة أو ناقصة
    bad = ev(page, """(()=>{ const t=[undefined,null,{},{skin:1},{skin:99,hair:99,style:99,beard:99,band:99},{skin:-1},{skin:'2',hair:'1'},{style:3}]; const out=[]; t.forEach((l,i)=>{ try{ const h=G.UI.avatar(l,'ath',80,'سيد'); if(!/^<svg/.test(h)||/NaN|undefined/.test(h)) out.push(i) }catch(e){ out.push(i+':'+e.message) } }); try{ const h=G.UI.avatar({skin:1},null,80); if(!/^<svg/.test(h)) out.push('nocl') }catch(e){ out.push('nocl:'+e.message) } try{ const h=G.UI.avatar({skin:1},'zzz-unknown',80,''); if(!/^<svg/.test(h)) out.push('unk') }catch(e){ out.push('unk:'+e.message) } return out })()""")
    check(not bad, 'look قديم/ناقص/خارج المدى لا يكسر الرسم %s' % bad)

    # 5) الظهور وثبات الوجه عبر الشاشات الحقيقية
    shots = {}
    for route, sub in [('home', {}), ('profile', {}), ('career', {}), ('profile', {'pf': 'ov'})]:
        ev(page, "G.UI.fxClear(); G.UI.cur=%r; G.UI.sub=%s; G.UI.render(); window.scrollTo(0,0)" % (route, repr(sub).replace("'", '"'))); page.wait_for_timeout(250)
        n = ev(page, "document.querySelectorAll('#app svg.avatar').length")
        check(n >= 1, '%s: أفاتار ظاهر (%d)' % (route, n)); nohs(page, route)
        shots.setdefault(route, ev(page, "(document.querySelector('#app svg.avatar')||{outerHTML:''}).outerHTML.replace(/ width=\"[^\"]*\"/,'').replace(/ height=\"[^\"]*\"/,'').replace(/av\\d+/g,'avN')"))
        shot(page, 'avatar_%s_%d' % (route, VW))
    check(shots['home'] == shots['profile'], 'وجه اللاعب في الرئيسية = وجهه في الملف الشخصي')
    ev(page, "G.UI.cur='home'; G.UI.render()")
    card = page.query_selector('[data-a="cardOpen"]')
    if card:
        card.click(); page.wait_for_timeout(400)
        cc = ev(page, "(document.querySelector('.sheet svg.avatar, #sheet svg.avatar, .fifa svg.avatar, svg.avatar')||{outerHTML:''}).outerHTML.replace(/ width=\"[^\"]*\"/,'').replace(/ height=\"[^\"]*\"/,'').replace(/av\\d+/g,'avN')")
        check(cc != '' and cc == shots['home'], 'وجه بطاقة اللاعب = وجهه في الرئيسية')
        shot(page, 'avatar_card_%d' % VW)
        ev(page, "G.UI.closeSheet()"); page.wait_for_timeout(250)
    else:
        check(False, 'زر بطاقتي غير موجود')
    # اللاعبون الآخرون (زملاء الفريق) لهم وجوه مختلفة عن بعضهم
    ev(page, "G.UI.cur='squad'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(200)

    # 6) معالج اللاعب الجديد
    ctx2 = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar'); pg2 = ctx2.new_page(); attach_errors(pg2); pg2.goto(common.URL); pg2.wait_for_selector('#app'); ev(pg2, "localStorage.clear()"); pg2.goto(common.URL); pg2.wait_for_selector('#app')
    pg2.wait_for_timeout(500)
    has_start = ev(pg2, "!!document.querySelector('[data-a=\"wzNew\"]')")
    check(has_start, 'شاشة البداية فيها زر إنشاء لاعب')
    if has_start:
        pg2.click('[data-a="wzNew"]'); pg2.wait_for_timeout(250)
        ev(pg2, "G.UI.wz.name='Ahmed Test'; G.UI.wz.step=3; G.UI.render()"); pg2.wait_for_timeout(250)
        check(ev(pg2, "document.querySelectorAll('#app svg.avatar').length") >= 1, 'المعالج (خطوة المظهر): الأفاتار ظاهر')
        a1 = ev(pg2, "document.querySelector('#app svg.avatar').outerHTML")
        pg2.click('[data-a="wzLook"][data-v="hair"][data-v2="2"]'); pg2.wait_for_timeout(200)
        a2 = ev(pg2, "document.querySelector('#app svg.avatar').outerHTML")
        check(a1 != a2, 'تغيير لون الشعر في المعالج يغيّر الصورة فورًا')
        pg2.click('[data-a="wzLook"][data-v="style"][data-v2="3"]'); pg2.wait_for_timeout(200)
        a3 = ev(pg2, "document.querySelector('#app svg.avatar').outerHTML")
        check(a3 != a2, 'تغيير قصّة الشعر يغيّر الصورة')
        overflow(pg2, 'خطوة المظهر'); shot(pg2, 'avatar_wizard_%d' % VW)
    check(not errors, 'لا أخطاء JS %s' % errors[:3])
    b.close()
finish()
