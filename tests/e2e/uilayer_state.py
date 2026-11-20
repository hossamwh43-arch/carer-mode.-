"""Build 27 — إثبات أن التعديلات واجهة فقط: نفس البذرة ونفس سلسلة الأفعال على الإصدار السابق (Build 26 المنشور) والجديد يعطيان حالة لعبة متطابقة تمامًا
(المحرك والمحاكاة والحفظ لم تتغيّر)، وبنية الحفظ نفسها. الاستخدام: python3 tests/e2e/uilayer_state.py /مسار/إلى/carer-mode.-/www
ملاحظة: القياس على Chromium في الحاوية لا على جهاز أندرويد حقيقي."""
import sys, os, json
from common import *
OLD = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'carer-mode.-', 'www')
URLS = {'old': 'file://' + os.path.join(OLD, 'index.html'), 'new': URL}
WEEKS = int(sys.argv[2]) if len(sys.argv) > 2 else 12

def run(b, which):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    page.goto(URLS[which]); page.wait_for_selector('#app'); ev(page, "localStorage.clear()"); page.goto(URLS[which]); page.wait_for_selector('#app')
    ev(page, "G.Season.newGame({name:'حسام الموصلي',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:12,diff:'normal'}); G.S.tour=9; G.UI.cur='home'; G.UI.sub={}; G.UI.render()")
    ev(page, "G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(200)
    # المحاكاة بأفعال الواجهة نفسها (محاكاة سريعة للمباراة ثم تقدّم أسبوع)
    for _ in range(WEEKS):
        g = 0
        while ev(page, '!!G.Season.pending()') and g < 4:
            g += 1; ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(100)
            if page.query_selector('.mcta [data-a="playMatch"][data-v2="s"]'):
                page.click('.mcta [data-a="playMatch"][data-v2="s"]'); page.wait_for_timeout(250)
                if page.query_selector('[data-a="mvHome"]'): page.click('[data-a="mvHome"]')
            else: break
        ev(page, "G.UI.cur='home'; G.UI.render()")
        if page.query_selector('[data-a="advanceWeek"]'): page.click('[data-a="advanceWeek"]'); page.wait_for_timeout(100)
    st = ev(page, "JSON.stringify(G.S)")
    keys = ev(page, "JSON.stringify(Object.keys(G.S).sort())")
    raw = ev(page, "localStorage.getItem(Object.keys(localStorage).find(k=>/save|career|fcc/i.test(k))||'')")
    rng = ev(page, "G.rngState")
    ctx.close()
    return json.loads(st), keys, rng, (raw or '')

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    so, ko, ro, rawo = run(b, 'old'); sn, kn, rn, rawn = run(b, 'new')
    b.close()
check(ko == kn, 'مفاتيح حالة اللعبة الجذرية متطابقة (بنية الحفظ لم تتغيّر)')
check(ro == rn, 'حالة المولّد العشوائي متطابقة بعد %d أسبوعًا (%s / %s)' % (WEEKS, ro, rn))
def diff(a, c, path='', out=None):
    out = out if out is not None else []
    if len(out) > 8: return out
    if isinstance(a, dict) and isinstance(c, dict):
        for k in sorted(set(a) | set(c)):
            if k not in a or k not in c: out.append(path + '/' + k + ' (مفقود)')
            else: diff(a[k], c[k], path + '/' + k, out)
    elif isinstance(a, list) and isinstance(c, list):
        if len(a) != len(c): out.append(path + ' (طول %d≠%d)' % (len(a), len(c)))
        else:
            for i, (x, y) in enumerate(zip(a, c)): diff(x, y, path + '[%d]' % i, out)
    elif a != c: out.append('%s: %r ≠ %r' % (path, str(a)[:30], str(c)[:30]))
    return out
# أختام الوقت الفعلي فقط تختلف بين تشغيلين (ليست حالة لعب)
for o in (so, sn):
    o.pop('created', None); o.pop('savedAt', None)
    if isinstance(o.get('check'), dict): o['check'].pop('t', None)
d = diff(so, sn)
check(not d, 'حالة اللعبة بعد %d أسبوعًا متطابقة بين Build 26 والجديد %s' % (WEEKS, d[:6]))
check(len(rawo) > 0 and len(rawn) > 0 and len(rawo) == len(rawn), 'حجم نص الحفظ في التخزين متطابق (%d / %d)' % (len(rawo), len(rawn)))
check(not errors, 'لا أخطاء JS %s' % errors[:3])
finish()
