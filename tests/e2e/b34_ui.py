"""Build 34 — التجديد البصري: ملعب النادي المتجهي (معرّفات فريدة، لون النادي، خفيف)، شاشة إدارة النادي (الأرقام تطابق بيانات اللعبة، الاختصارات تعمل)،
مفتاح مناطق الدوري، تذكرة المباراة، احترام تقليل الحركة. (Chromium فقط — ليس جهاز أندرويد حقيقيًا.)"""
from common import *
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar', reduced_motion='reduce'); page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    new_game(page, club='ath', pos='CM', age=21, seed=12); play_weeks(page, 6)
    # 1) الملعب: معرّفات فريدة عند وجود عدة نسخ، ألوان تختلف بين الأندية، حجم DOM محدود
    r = ev(page, """(()=>{const ids=['ath','rma','bar','mci'];const h=ids.map(i=>G.UI.stadiumArt(i,{ball:1})).join('');const d=document.createElement('div');d.innerHTML=h;document.body.appendChild(d);
      const all=[...d.querySelectorAll('[id]')].map(e=>e.id);const uniq=new Set(all).size===all.length;
      const refs=[...d.querySelectorAll('[fill^="url(#"]')].every(e=>d.querySelector('#'+e.getAttribute('fill').slice(5,-1)));
      const per=d.querySelectorAll('svg')[0].querySelectorAll('*').length;
      const cols=ids.map(i=>G.UI.stadiumArt(i)).map(s=>(s.match(/<pattern[\\s\\S]*?fill="(#[0-9a-f]{6})"/i)||[])[1]);
      d.remove();return {uniq,refs,per,n:ids.length,distinct:new Set(cols).size,cols}})()""")
    check(r['uniq'], 'معرّفات SVG فريدة بين نسخ الملعب (%d نسخ)' % r['n'])
    check(r['refs'], 'كل مرجع تدرّج/نمط له هدف موجود')
    check(r['per'] < 220, 'عدد عناصر الملعب الواحد خفيف (%d)' % r['per'])
    check(r['distinct'] >= 3, 'ألوان المدرّج تختلف بين الأندية %s' % r['cols'])
    check(ev(page, "G.UI.stadiumArt('ath').indexOf('<animate')") == -1 and ev(page, "G.UI.stadiumArt('ath').indexOf('filter')") == -1, 'لا حركة ولا فلاتر داخل الملعب (أداء الهاتف)')
    check(ev(page, "G.UI.stadiumArt('zzz_unknown').length>500"), 'نادٍ غير معروف لا يكسر الرسم')
    # 2) الرئيسية: غلاف بملعب وشريط مؤشرات
    ev(page, "G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(250)
    check(ev(page, "document.querySelectorAll('.cine .sta-art').length") == 1 and ev(page, "document.querySelectorAll('.cp-kpis .cp-k').length") == 3, 'الرئيسية: ملعب النادي + 3 مؤشرات')
    an = ev(page, "(()=>{const e=document.querySelector('.mcta,.pnl,.sec-h2');return e?getComputedStyle(e).animationName:'missing'})()")
    check(an == 'none', 'مع تقليل الحركة لا حركة دخول على التذكرة/اللوحات (animation-name=%s)' % an)
    # 3) إدارة النادي: الأرقام تطابق بيانات اللعبة
    ev(page, "G.UI.cur='facilities'; G.UI.render()"); page.wait_for_timeout(250)
    d = ev(page, "(()=>{const c=G.S.clubs[G.S.players[G.S.user].club];return {tb:G.U.money(c.tb),cap:G.U.money(c.wcap),bill:G.U.money(G.Players.wageBill(c)),used:Math.round(G.Players.wageBill(c)/c.wcap*100)}})()")
    txt = ev(page, "document.getElementById('app').innerText")
    check(d['tb'] in txt and d['cap'] in txt and d['bill'] in txt, 'إدارة النادي تعرض الميزانية والسقف والفاتورة الحقيقية (%s · %s · %s)' % (d['tb'], d['cap'], d['bill']))
    check(('%d٪' % d['used']) in txt or ('%d%%' % d['used']) in txt, 'نسبة استخدام السقف صحيحة (%d)' % d['used'])
    check('سعة' not in txt and 'متفرج' not in txt, 'لا أرقام سعة جماهيرية مختلقة (لا بيانات لها في اللعبة)')
    for route in ['club', 'squad', 'train', 'market', 'money']:
        ev(page, "G.UI.cur='facilities'; G.UI.render()"); page.wait_for_timeout(120)
        btn = page.query_selector('.lrow[data-a="go"][data-v="%s"]' % route)
        check(btn is not None, 'اختصار %s موجود' % route)
        if btn:
            btn.click(); page.wait_for_timeout(250)
            check(ev(page, 'G.UI.cur') == route, 'الاختصار يفتح %s' % route)
    # 4) المسار ضمن مجموعة «النادي» والتبويب العلوي
    check(ev(page, "G.UI.groupOf('facilities')") == 'club' and ev(page, "G.UI.MAIN.indexOf('facilities')") >= 0, 'المسار ضمن مجموعة النادي')
    # 5) الدوري: مفتاح المناطق ونص عدد الأندية
    ev(page, "G.UI.cur='league'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    check(ev(page, "document.querySelectorAll('.zkey span').length") >= 2 and 'ناديًا' in ev(page, "document.querySelector('.lg-hd').innerText"), 'الدوري: رأس + مفتاح مناطق (أبطال/هبوط)')
    # 6) المباريات: ملعب المضيف + زر اللعب الأساسي واحد
    ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(250)
    check(ev(page, "!!document.querySelector('.mcta .mc-sta .sta-art')"), 'تذكرة المباراة: ملعب المضيف')
    check(ev(page, "document.querySelectorAll('.mcta .btn.pri').length") == 1, 'زر أساسي واحد في التذكرة')
    # 7) كل صفوف lrow القابلة للضغط ≥ 44
    ev(page, "G.UI.cur='facilities'; G.UI.render()"); page.wait_for_timeout(200)
    hs = ev(page, "[...document.querySelectorAll('button.lrow')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(hs and min(hs) >= 44, 'صفوف القوائم القابلة للضغط ≥44 (%s)' % hs)
    check(not errors, 'لا أخطاء JS: %s' % errors[:3])
    b.close()
finish()
