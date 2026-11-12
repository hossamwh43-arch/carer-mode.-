"""محرك الانتقالات الجديد (بلا واجهة): وكيل، اهتمام الأندية وأسبابه، حزمة العقد، مزاد، رد النادي، فشل الصفقة، إعارة، نوافذ."""
import sys
from common import *
import common

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar')
    page = ctx.new_page(); attach_errors(page)
    new_game(page, club='ath', pos='CM', age=23, seed=21)
    play_weeks(page, 3)
    # لاعب قوي بما يكفي ليجذب عروضًا
    ev(page, "const u=G.S.players[G.S.user]; u.ovr=Math.max(u.ovr,80); u.pot=Math.max(u.pot,85); u.val=G.Players.value(u); G.Players.refresh(u)")
    ev(page, "G.S.week=G.Season.WINTER_OPEN; G.S.window={open:true,kind:'winter'}; G.S.offers=[]")
    print('--- الاهتمام')
    sw = ev(page, "G.Transfers.suitors().slice(0,5).map(x=>({c:x.club,s:x.score,r:x.reasons,a:x.afford}))")
    print(sw)
    check(len(sw) > 0 and all(isinstance(x['s'], int) for x in sw), 'درجات اهتمام الأندية محسوبة')
    check(any(len(x['r']) for x in sw), 'للأندية أسباب مقروءة')
    # توليد عروض عدة مرات: كم عرضًا في المتوسط؟
    tot = 0; trials = 12
    for i in range(trials):
        tot += ev(page, "G.S.offers=[]; G.Transfers.generateOffers(1.3)")
    print('متوسط العروض/نافذة:', tot / trials)
    check(tot / trials >= 0.5, 'تُولَّد عروض بمعدل معقول (%.1f)' % (tot / trials))
    # نريد 3 عروض على الأقل
    for i in range(30):
        if ev(page, "G.S.offers.filter(o=>o.type==='transfer').length") >= 3: break
        ev(page, "G.Transfers.generateOffers(2.5)")
    n = ev(page, "G.S.offers.filter(o=>o.type==='transfer').length")
    check(n >= 2, 'عدة أندية تنافس على اللاعب (%d)' % n)
    o = ev(page, "JSON.parse(JSON.stringify(G.S.offers.find(o=>o.type==='transfer')))")
    print(o)
    check(all(k in o for k in ['bonus', 'ab', 'gb', 'role', 'score', 'why', 'rivals', 'maxWage']), 'العرض يحمل مكافآت ودورًا وأسبابًا ومنافسين')
    check(o['rivals'] == n - 1, 'عدد المنافسين = العروض الأخرى')

    print('--- الوكيل')
    r = ev(page, "G.Agent.hire(3)")
    print(r)
    ev(page, "G.Media.get().pop = 70")
    r = ev(page, "G.Agent.hire(3)"); check(r['ok'], 'تعاقد مع وكيل نخبة بعد بلوغ الشعبية')
    check(ev(page, "G.Agent.maxTries()") == 4, 'الوكيل يمنح محاولة تفاوض إضافية')
    a0 = ev(page, "G.S.offers.filter(o=>o.type==='transfer').map(o=>G.Agent.wEq(o,'CM'))")
    r = ev(page, "G.Agent.auction()"); print(r)
    check(r['ok'], 'المزاد نجح: ' + str(r.get('msg')))
    a1 = ev(page, "G.S.offers.filter(o=>o.type==='transfer').map(o=>G.Agent.wEq(o,'CM'))")
    check(len(a1) <= len(a0) and max(a1) >= max(a0), 'المزاد يرفع أفضل عرض أو يُخرج الأضعف (%.0f→%.0f)' % (max(a0), max(a1)))
    check(not ev(page, "G.Agent.auction().ok"), 'لا مزاد ثانٍ فورًا (تبريد)')
    oid = ev(page, "G.S.offers.find(o=>o.type==='transfer').id")
    d = ev(page, "G.Agent.delegate('%s')" % oid); print(d)
    check('msg' in d, 'تفويض الوكيل يعيد نتيجة')
    check(ev(page, "G.S.offers.every(o=>!o.bonus || o.bonus < 50*o.wage*52)"), 'مكافآت التوقيع بعد التفويض ضمن المعقول')

    print('--- التفاوض بحزمة كاملة')
    ev(page, "G.S.offers=[]; G.S.window={open:true,kind:'winter'}")
    for i in range(30):
        if ev(page, "G.S.offers.filter(o=>o.type==='transfer').length") >= 1: break
        ev(page, "G.Transfers.generateOffers(3)")
    oid = ev(page, "G.S.offers.find(o=>o.type==='transfer').id")
    # مطلب مبالغ فيه جدًا: انسحاب النادي
    got = set()
    for i in range(14):
        ev(page, "G.S.offers=[]")
        for j in range(30):
            if ev(page, "G.S.offers.length"): break
            ev(page, "G.Transfers.generateOffers(3)")
        if not ev(page, "G.S.offers.length"): continue
        oo = ev(page, "G.S.offers[0]")
        r = ev(page, "G.Transfers.negotiate(G.S.offers[0], Math.round(G.S.offers[0].maxWage*2), 3, {bonus: 0, ab: 0, gb: 0, role:'none'})")
        got.add(r['res'])
    print('نتائج المطالب المبالغ فيها:', got)
    check(got & {'withdraw', 'reject'}, 'المطالب المبالغ فيها تُرفض أو ينسحب النادي')
    # طلب دور أساسي لا يمنحه النادي
    ev(page, "G.S.offers=[]")
    for j in range(40):
        if ev(page, "G.S.offers.length"): break
        ev(page, "G.Transfers.generateOffers(3)")
    ev(page, "G.S.offers[0].nat='prospect'; G.S.offers[0].role='prospect'")
    r = ev(page, "G.Transfers.negotiate(G.S.offers[0], G.S.offers[0].wage, 3, {role:'starter'})")
    check(r['res'] == 'reject' and 'مركز' in r['msg'], 'النادي لا يضمن دورًا أساسيًا لا يستحقه')

    print('--- رد النادي على طلب الانتقال')
    ev(page, "G.S.treq={status:'none'}; G.S.transferRequest=false; const u=G.S.players[G.S.user]; u.role='starter'; u.ct.y=4; G.S.rel.club=70; G.S.clubs[u.club].rep=80")
    r = ev(page, "G.Transfers.requestTransfer()"); print(r)
    check(r['ok'] and r['status'] == 'refused', 'النادي يرفض طلب ركيزة (%s)' % r.get('status'))
    check(not ev(page, "G.Transfers.requestTransfer().ok"), 'لا طلب ثانٍ فورًا بعد الرفض')
    ev(page, "G.S.treq={status:'none'}; G.S.players[G.S.user].role='bench'")
    r = ev(page, "G.Transfers.requestTransfer()"); check(r['status'] == 'accepted', 'احتياطي: النادي يقبل الطلب')
    check(ev(page, "G.S.transferRequest===true"), 'طلب مقبول يفتح السوق')
    r = ev(page, "G.Transfers.withdrawRequest()"); check(r['ok'], 'سحب الطلب')

    print('--- فشل الصفقة بسبب رسوم النادي البائع')
    ev(page, "G.S.treq={status:'refused',until:0}; G.S.window={open:true,kind:'winter'}; G.S.offers=[]; G.S.players[G.S.user].role='starter'; G.S.players[G.S.user].inj=0")
    for j in range(40):
        if ev(page, "G.S.offers.length"): break
        ev(page, "G.Transfers.generateOffers(3)")
    st = ev(page, "G.S.offers[0].stance")
    print(st)
    check(not st['ok'], 'نادي لا يريد البيع: العرض لا يُنفَّذ (%s)' % st['why'])
    r = ev(page, "G.Transfers.acceptOffer(G.S.offers[0].id)")
    check(not r['ok'] and not r.get('collapsed'), 'قبول عرض يرفضه البائع يفشل بسبب واضح')
    # جزئي: عرض بين 90% و100% من السعر المطلوب
    ev(page, "G.S.treq={status:'none'}; G.S.transferRequest=false")
    outcomes = {'ok': 0, 'collapsed': 0}
    for i in range(24):
        ev(page, "G.S.window={open:true,kind:'winter'}; G.S.offers=[]; G.S.players[G.S.user].role='starter'")
        for j in range(40):
            if ev(page, "G.S.offers.length"): break
            ev(page, "G.Transfers.generateOffers(3)")
        if not ev(page, "G.S.offers.length"): continue
        ev(page, "const o=G.S.offers[0], p=G.S.players[G.S.user]; const ask=G.Transfers.sellerView(p,0).ask; o.fee=Math.round(ask*0.95/25000)*25000; o.score=50; G.S.clubs[o.club].tb=Math.max(G.S.clubs[o.club].tb, ask*2); o.stance=G.Transfers.stance(p,o.fee)")
        before = ev(page, "G.S.players[G.S.user].club")
        r = ev(page, "G.Transfers.acceptOffer(G.S.offers[0].id)")
        if r.get('collapsed'): outcomes['collapsed'] += 1
        elif r['ok']:
            outcomes['ok'] += 1
            ev(page, "G.S.players[G.S.user].club!==null"); 
            # نعيد اللاعب إلى ناديه الأصلي ليستمر الاختبار
            ev(page, "G.Transfers.execute(G.S.players[G.S.user], '%s', 0, 5000, 3)" % before)
            ev(page, "G.S.players[G.S.user].inj=0")
    print(outcomes)
    check(outcomes['collapsed'] > 0 and outcomes['ok'] > 0, 'تفاوض الناديين على الرسوم ينجح أحيانًا ويفشل أحيانًا')

    print('--- المصاب لا يجتاز الفحص الطبي')
    ev(page, "G.S.rel.cool={}; G.S.rel.ex={}; G.S.window={open:true,kind:'winter'}; G.S.offers=[]; G.S.treq={status:'accepted'}; G.S.transferRequest=true; G.S.players[G.S.user].inj=6")
    for j in range(40):
        if ev(page, "G.S.offers.length"): break
        ev(page, "G.Transfers.generateOffers(3)")
    check(ev(page, "G.S.offers.length") > 0, 'توليد عرض للاعب المصاب (تهيئة الاختبار)')
    r = ev(page, "G.Transfers.acceptOffer(G.S.offers[0].id)")
    check(not r['ok'] and 'الفحص الطبي' in r['msg'], 'الفحص الطبي يمنع صفقة المصاب')
    ev(page, "G.S.players[G.S.user].inj=0")

    print('--- انتقال كامل: علاقات ومكافآت ووعد وأخبار')
    ev(page, "G.S.rel.cool={}; G.S.rel.ex={}; G.S.treq={status:'accepted'}; G.S.transferRequest=true; G.S.players[G.S.user].role='bench'; G.S.offers=[]")
    for j in range(40):
        if ev(page, "G.S.offers.length"): break
        ev(page, "G.Transfers.generateOffers(3)")
    ev(page, "const o=G.S.offers[0]; o.role='starter'; o.nat='starter'; o.ab=3000; o.gb=5000; o.bonus=400000; G.S.clubs[o.club].tb=9e9; G.S.clubs[o.club].wcap=9e9; o.fee=Math.max(o.fee, G.Transfers.sellerView(G.S.players[G.S.user],0).ask)")
    old = ev(page, "G.S.players[G.S.user].club"); new = ev(page, "G.S.offers[0].club")
    r = ev(page, "G.Transfers.acceptOffer(G.S.offers[0].id)"); print(r)
    check(r['ok'], 'تم الانتقال')
    check(ev(page, "G.S.players[G.S.user].club") == new, 'اللاعب في النادي الجديد')
    check(ev(page, "G.S.players[G.S.user].ct.ab") == 3000 and ev(page, "G.S.players[G.S.user].ct.gb") == 5000, 'مكافآت العقد محفوظة في العقد')
    check(ev(page, "G.S.fin.signing") >= 400000 and ev(page, "G.S.fin.agent") > 0, 'مكافأة التوقيع وعمولة الوكيل محاسَبتان')
    check(ev(page, "G.S.players[G.S.user].promise && G.S.players[G.S.user].promise.role") == 'starter', 'وعد الدور مسجّل')
    check(ev(page, "G.S.rel.ex['%s']" % old) < -10, 'علاقة النادي السابق ساءت بعد الرحيل بطلب (%s)' % ev(page, "G.S.rel.ex['%s']" % old))
    check(ev(page, "G.S.rel.loyal") < 50, 'سمعة الولاء انخفضت')
    check(ev(page, "G.S.treq.status") == 'none', 'طلب الانتقال أُغلق بعد الانتقال')
    check(ev(page, "G.Press.list({mine:true}).some(a=>a.k==='uMove')"), 'الصحافة كتبت عن الانتقال')
    # مكافأة مباراة
    f0 = ev(page, "G.S.fin.bonus")
    ev(page, "G.Agent.payMatch({mins:90,g:2,comp:'LL'})")
    check(ev(page, "G.S.fin.bonus") - f0 == 3000 + 2 * 5000, 'مكافأة المشاركة والأهداف تُدفع')
    # وعد غير مُوفى
    ev(page, "const u=G.S.players[G.S.user]; u.role='out'; u.promise.left=1; G.Agent.checkPromise()")
    check(ev(page, "G.S.rel.broken") == ev(page, "G.S.season"), 'وعد غير مُوفى يُسجَّل ويتيح رحيلًا بلا غضب')

    print('--- الإعارة')
    ev(page, "G.S.rel.cool={}; const u=G.S.players[G.S.user]; u.age=27; u.role='starter'; u.ct.y=4; G.S.rel.club=50; G.S.window={open:true,kind:'winter'}; G.S.offers=[]")
    r = ev(page, "G.Transfers.requestLoan()"); print(r)
    check(not r['ok'], 'النادي يرفض إعارة لاعب أساسي')
    ev(page, "G.S.players[G.S.user].role='bench'; G.S.players[G.S.user].age=22")
    n = 0
    for i in range(12):
        ev(page, "G.S.offers=[]")
        r = ev(page, "G.Transfers.requestLoan()")
        if r['ok']: n += 1; break
    check(n == 1, 'وافق النادي الأم وجاءت عروض إعارة')
    if n:
        lo = ev(page, "G.S.offers.filter(o=>o.type==='loan').map(o=>({buy:o.buy,role:o.role}))")
        print(lo)
        ev(page, "G.S.offers.filter(o=>o.type==='loan').forEach(o=>o.buy=o.buy||5000000)")
        r = ev(page, "G.Transfers.acceptOffer(G.S.offers.find(o=>o.type==='loan').id)")
        check(r['ok'] and ev(page, "G.S.players[G.S.user].parentPays===true"), 'تمت الإعارة')
        check(ev(page, "!!G.S.players[G.S.user].loanBuy"), 'بند الشراء مسجّل')

    print('--- نافذة مغلقة')
    ev(page, "G.S.window={open:false,kind:'none'}")
    check(not ev(page, "G.Transfers.requestLoan().ok"), 'لا إعارة والنافذة مغلقة')
    check(ev(page, "G.Transfers.generateOffers(5)") == 0, 'لا عروض والنافذة مغلقة')
    check(ev(page, "G.S.offers.length>=0"), 'تم')
    check(not errors, 'لا أخطاء كونسول: ' + str(errors[:3]))
    b.close()
finish()
