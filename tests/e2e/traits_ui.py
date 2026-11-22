"""القدرات المميزة (Build 28): شاشة «نجوم العالم» (شريط تصفية بالقدرة، صفوف بأيقونات القدرات، بطاقة نجم بالقدرات والمنافسين)،
وظهور الأيقونات في التشكيلة والهدّافين، وبلاط «نجوم العالم» في المزيد؛ أهداف لمس ≥ 44px، لا رموز خام ولا تمرير أفقي.
الاستخدام: python3 tests/e2e/traits_ui.py [مجلد_اللقطات] [العرض=390]"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    S = lambda js: ev(page, js)
    new_game(page)
    # المزيد: البلاط موجود ويفتح الشاشة
    S("G.UI.cur='more'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(250)
    check('نجوم العالم' in txt(page), '%d: بلاط «نجوم العالم» في المزيد' % VW)
    nohs(page, 'المزيد'); overflow(page, 'المزيد')
    page.click('.tile[data-v="stars"]'); page.wait_for_timeout(300)
    check(S('G.UI.cur') == 'stars', 'البلاط يفتح الشاشة')
    n_h = S('G.Traits.holders().length')
    check(n_h >= 30, 'حاملو القدرات عند البداية (%d)' % n_h)
    chips = page.query_selector_all('.st-flt .chip')
    check(len(chips) >= 8, 'شريط التصفية: %d زرًّا' % len(chips))
    hs = S("[...document.querySelectorAll('.st-flt .chip')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in hs), 'أهداف لمس التصفية ≥ 44px (%s)' % min(hs))
    rows = page.query_selector_all('.st-list .st-r')
    check(len(rows) == 20, 'أول 20 نجمًا (%d)' % len(rows))
    rh = S("[...document.querySelectorAll('.st-list .st-r')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in rh), 'صفوف النجوم ≥ 44px (%s)' % min(rh))
    ovrs = S("[...document.querySelectorAll('.st-list .st-r .sq-o')].map(e=>+e.textContent)")
    check(all(ovrs[i] >= ovrs[i + 1] for i in range(len(ovrs) - 1)), 'مرتّبة بالتقييم تنازليًا')
    check(len(page.query_selector_all('.st-list .tri')) >= 20, 'أيقونات القدرات ظاهرة')
    geo = S("[...document.querySelectorAll('.tri,.tri .ic')].every(e=>{const r=e.getBoundingClientRect();return Math.round(r.width)%2===0&&Math.abs(r.width-r.height)<0.6})")
    check(geo, 'أيقونات القدرات مربعة بأبعاد زوجية')
    check('هالاند' in txt(page) or 'Haaland' in txt(page) or 'Erling' in txt(page), 'هالاند بين النجوم')
    check('يامال' in txt(page) or 'Yamal' in txt(page) or 'Lamine' in txt(page), 'يامال بين النجوم')
    check(not ev(page, EMOJI_JS), 'لا رموز خام'); nohs(page, 'النجوم'); overflow(page, 'النجوم'); shot(page, 'stars', True)
    # عرض الكل
    page.click('[data-a="starAll"]'); page.wait_for_timeout(250)
    check(len(page.query_selector_all('.st-list .st-r')) == n_h, 'عرض الكل = %d' % n_h)
    page.click('[data-a="starAll"]'); page.wait_for_timeout(200)
    # تصفية بقدرة
    for k in ['machine', 'keeper', 'dribbler']:
        c = page.query_selector('.st-flt .chip[data-v="%s"]' % k)
        if not c: check(False, 'زر القدرة %s موجود' % k); continue
        c.click(); page.wait_for_timeout(250)
        want = S("G.Traits.holders('%s').length" % k)
        got = page.query_selector_all('.st-list .st-r')
        check(len(got) == min(20, want) and S('G.UI.sub.stF') == k, 'تصفية %s: %d من %d' % (k, len(got), want))
        ok = S("[...document.querySelectorAll('.st-list .st-r')].every(r=>{const id=r.dataset.v;return (G.S.players[id].tr||[]).indexOf('%s')>=0})" % k)
        check(ok, 'كل صفوف %s تحمل القدرة' % k)
    page.click('.st-flt .chip[data-v="all"]'); page.wait_for_timeout(250)
    # بطاقة نجم
    page.click('.st-list .st-r'); page.wait_for_timeout(300)
    sh = S("document.getElementById('sheet').innerText")
    check('القدرات المميزة' in sh and 'منافسوه في مركزه' in sh and 'مباراة دوري' in sh, 'بطاقة النجم: قدرات + منافسون + إحصاءات')
    check(len(page.query_selector_all('#sheet .tr-it')) >= 1, 'بطاقة النجم: وصف القدرة بأثرها')
    check(not ev(page, "(document.getElementById('sheet').textContent.match(/[\\u{1F300}-\\u{1FAFF}]/gu)||[]).length"), 'بطاقة النجم بلا رموز خام')
    bh = S("[...document.querySelectorAll('#sheet button')].map(e=>Math.round(e.getBoundingClientRect().height))")
    check(all(h >= 44 for h in bh), 'أزرار البطاقة ≥ 44px'); shot(page, 'star_sheet')
    page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(200)
    # التشكيلة: نمنح زميلًا قدرة (اختبار عرض فقط) فتظهر الأيقونة والبطاقة
    S("(()=>{const u=G.S.players[G.S.user];const q=Object.values(G.S.players).find(x=>x.club===u.club&&!x.user&&x.ovr>=70);q.tr=['sniper','wall'];window.__q=q.id})()")
    S("G.UI.cur='squad'; G.UI.sub={sq:'all',sqAll:true}; G.UI.render()"); page.wait_for_timeout(300)
    check(len(page.query_selector_all('.sq-n .trs')) >= 1, 'التشكيلة: أيقونات القدرة بجانب الاسم')
    page.click('.sq-r[data-v="%s"]' % S('window.__q')); page.wait_for_timeout(300)
    check(len(page.query_selector_all('#sheet .tr-it')) == 2, 'بطاقة الزميل تعرض قدرتيه')
    page.click('#sheet [data-a="closeSheet"]'); page.wait_for_timeout(200)
    nohs(page, 'التشكيلة'); overflow(page, 'التشكيلة')
    # الهدّافون: بعد بضعة أسابيع تظهر أيقونات النجوم في جدول الهدافين
    S("(()=>{for(let i=0;i<60;i++){const r=G.Sim.run({mode:'event',autoDP:true});if(G.S.offers&&G.S.offers.length)G.S.offers.slice().forEach(o=>G.Transfers.rejectOffer(o.id));if(G.S.week>=10)break;}})()")
    S("G.UI.cur='league'; G.UI.sub={lg:'scorers'}; G.UI.render()"); page.wait_for_timeout(300)
    check(len(page.query_selector_all('table.t tr')) > 3, 'جدول الهدافين يُعرض')
    nohs(page, 'الهدافون'); overflow(page, 'الهدافون')
    S("G.UI.cur='stars'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(300)
    check(len(page.query_selector_all('.st-r2')) >= 3, 'سباق الهدافين يظهر بعد المباريات (%d)' % len(page.query_selector_all('.st-r2')))
    nohs(page, 'النجوم بعد مباريات'); overflow(page, 'النجوم بعد مباريات'); shot(page, 'stars_after', True)
    check(not errors, 'لا أخطاء JS: %s' % errors[:3])
    finish()
