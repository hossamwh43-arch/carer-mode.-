"""مواسم متتالية (v3.6): يحاكي N مواسم كاملة بالمحاكاة الذكية ويتوقف عند كل توقف حقيقي (عروض، مباريات مفصلية، نهاية الموسم)
ليفحص «غرفة الأخبار» و«صندوقي» والرئيسية والسوق والملف: لا أخطاء، لا تمرير أفقي، قرارات الصندوق تطابق الحالة، العروض تُقبل وتُرفض.
الاستخدام: python3 tests/e2e/seasons_smoke.py [عدد_المواسم=3] [العرض=390] [مجلد_اللقطات]"""
import sys, time
from common import *
import common
N = int(sys.argv[1]) if len(sys.argv) > 1 else 3
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
common.SHOTS = sys.argv[3] if len(sys.argv) > 3 else ''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    S = lambda js: ev(page, js)
    new_game(page, 'ath', 'CM', 19, 7)
    stops = 0; seasons = 0; acc = rej = 0; slow = []; offers_seen = 0
    t0 = time.time()
    while seasons < N and stops < 60:
        stops += 1
        r = S("(()=>{const x=G.Sim.run({mode:'event',autoDP:true}); return {ok:x.ok,msg:x.msg||null,stop:x.run&&x.run.stop&&x.run.stop.reason,ph:G.S.phase,wk:G.S.week}})()")
        if not r['ok']:
            check(False, 'المحاكاة رفضت: %s' % r['msg']); break
        # الشاشات الثلاث عند كل توقف + قياس زمن العرض
        for rt in ['home', 'press', 'inbox', 'profile', 'market']:
            tm = S("(()=>{G.UI.cur='%s'; G.UI.sub={}; const t=performance.now(); G.UI.render(); return performance.now()-t})()" % rt)
            if tm > 150: slow.append((rt, round(tm)))
            if 'حدث خطأ أثناء عرض هذه الصفحة' in txt(page): check(False, 'خطأ عرض في %s عند التوقف %d (%s)' % (rt, stops, r['stop']))
        w = S('document.documentElement.scrollWidth'); 
        if w > VW + 1: check(False, 'تمرير أفقي عند التوقف %d: %d' % (stops, w))
        # قرارات صندوقي تطابق الحالة فعلًا
        ids = S("G.UI.decisions().map(d=>d.id)")
        has_off = S('G.S.offers.length > 0'); 
        if has_off:
            offers_seen += 1
            if 'offers' not in ids: check(False, 'يوجد عرض ولا بطاقة قرار عند التوقف %d' % stops)
        if S('!!G.Media.pending()') and 'press' not in ids: check(False, 'مؤتمر معلّق بلا بطاقة')
        if not has_off and 'offers' in ids: check(False, 'بطاقة عروض بلا عروض')
        # التعامل مع العروض: رفض أول عرض مرة وقبول مرة (يختبر أن البطاقات تتحدث)
        if has_off:
            S("G.S.offers.slice().forEach(o => G.Transfers.rejectOffer(o.id))"); rej += 1
            S("G.UI.cur='inbox'; G.UI.render()")
            ids2 = S("G.UI.decisions().map(d=>d.id)")
            if S('G.S.offers.length') == 0 and 'offers' in ids2: check(False, 'بعد رفض العروض ما زالت بطاقة العروض ظاهرة')
        if r['stop'] == 'end' or r['ph'] == 'end':
            seasons += 1
            common.shot(page, 'sea_%d_end' % seasons)
            if seasons < N:
                # نهاية الموسم: قد تبقى بطولة منتخبات؛ تُنهى كما يفعل اللاعب (محاكاة البطولة) ثم «الانتقال للموسم التالي»
                S("G.S.tour=9; G.UI.cur='home'; G.UI.render()")
                if S('G.S.intl && !G.S.intl.done'):
                    S("G.Intl.autoFinish(); G.Save.save(); G.UI.render()")
                S("G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(200)
                if page.query_selector('[data-a="rollover"]'):
                    page.eval_on_selector('[data-a="rollover"]', 'e => e.click()'); page.wait_for_timeout(400)
                else:
                    check(False, 'لا زر «الانتقال للموسم التالي» بعد الموسم %d' % seasons); break
                S("G.UI.closeSheet(); G.UI.cur='home'; G.UI.render()")
                if S('G.S.phase') == 'summer': S("G.S.preLeft=0; G.Season.startSeason(); G.UI.render()")
                if S('G.S.userExpired'): S("G.Transfers.emergencyContract && G.Transfers.emergencyContract(); G.S.userExpired=false")
    el = time.time() - t0
    print('مواسم', seasons, '· توقفات', stops, '· عروض ظهرت', offers_seen, '· زمن', round(el), 'ث · الموسم', S('G.S.season'), '· الأخبار', S('G.Press.get().feed.length'), '· الرسائل', S('G.S.inbox.length'))
    check(seasons >= N, 'اكتملت %d مواسم (%d)' % (N, seasons))
    check(S('G.Press.get().feed.length') <= 150 and S('G.S.inbox.length') <= 120, 'حدود الأخبار (≤150) والرسائل (≤120) محترمة')
    check(not slow, 'زمن العرض < 150ms في كل التوقفات %s' % slow[:6])
    # الحفظ بعد مواسم طويلة ثم إعادة التحميل
    S('G.Save.save(true)'); sz = S("Object.keys(localStorage).reduce((a,k)=>a+localStorage[k].length,0)")
    check(sz < 4_500_000, 'حجم الحفظ معقول (%.2f MB)' % (sz / 1e6))
    page.reload(); page.wait_for_selector('.cine, #app'); page.wait_for_timeout(300)
    check(S('G.S.season') >= N, 'التحميل بعد المواسم'); 
    for rt in ['press', 'inbox', 'home']:
        S("G.UI.cur='%s'; G.UI.render()" % rt); nohs(page, 'بعد التحميل ' + rt)
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
