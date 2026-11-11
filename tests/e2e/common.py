"""أدوات مشتركة لاختبارات المتصفح (Playwright): إنشاء لعبة، تنفيذ JS، فحوص، لقطات، تمرير أفقي، رموز تعبيرية."""
import sys, os, json
from playwright.sync_api import sync_playwright
ROOT = os.environ.get('FC_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
WEB = ROOT if os.path.exists(os.path.join(ROOT, 'index.html')) else os.path.join(ROOT, 'www')  # في مستودع الحزمة تكون اللعبة داخل www/
URL = 'file://' + os.path.join(WEB, 'index.html')
fails, errors = [], []
SHOTS = ''
EMOJI_JS = "(document.querySelector('#app').textContent.match(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u26FF\\u2700-\\u27BF]/gu)||[]).filter(c=>!['\\u2605','\\u2606','\\u2713','\\u2714','\\u2716','\\u2190','\\u2192','\\u21d2','\\u25b2','\\u25bc'].includes(c))"

def ev(page, js):
    return page.evaluate("js => eval(js)", js)

def check(cond, msg):
    if not cond:
        fails.append(msg)
    print(('  ok   ' if cond else '  FAIL ') + msg)

def txt(page):
    return page.evaluate("() => document.getElementById('app').innerText")

def overflow(page, label):
    w = page.evaluate("() => [document.documentElement.scrollWidth, innerWidth]")
    check(w[0] <= w[1] + 1, '%s: لا تمرير أفقي (%d/%d)' % (label, w[0], w[1]))

def nohs(page, label):
    check('حدث خطأ أثناء عرض هذه الصفحة' not in txt(page), label + ': لا خطأ عرض')

def shot(page, name, full=False):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        page.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=full)

def attach_errors(page):
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: errors.append('CONSOLE ' + m.text) if m.type == 'error' else None)

def new_game(page, club='ath', pos='CM', age=19, seed=12, start=True):
    page.goto(URL); page.wait_for_selector('#app')
    ev(page, "localStorage.clear()")
    page.goto(URL); page.wait_for_selector('#app')
    ev(page, "G.Season.newGame({name:'حسام الموصلي',nat:'IQ',age:%d,pos:'%s',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'%s',seed:%d,diff:'normal'}); G.S.tour=9; G.UI.cur='home'; G.UI.sub={}; G.UI.render()" % (age, pos, club, seed))
    if start:
        ev(page, "G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()")
    page.wait_for_timeout(200)

def play_weeks(page, n):
    """يلعب n أسابيع بالمحاكاة السريعة (يحاكي مباراة المستخدم إن وُجدت) ثم يتقدم أسبوعًا."""
    for _ in range(n):
        g = 0
        while ev(page, '!!G.Season.pending()') and g < 4:
            g += 1
            ev(page, "G.UI.cur='matches'; G.UI.render()"); page.wait_for_timeout(120)
            if page.query_selector('.mcta [data-a="playMatch"][data-v2="s"]'):
                page.click('.mcta [data-a="playMatch"][data-v2="s"]'); page.wait_for_timeout(300)
                if page.query_selector('[data-a="mvHome"]'): page.click('[data-a="mvHome"]')
            else: break
        ev(page, "G.UI.cur='home'; G.UI.render()")
        if page.query_selector('[data-a="advanceWeek"]'):
            page.click('[data-a="advanceWeek"]'); page.wait_for_timeout(100)

def finish():
    print('%s: %d فشل' % (os.path.basename(sys.argv[0]), len(fails)))
    sys.exit(1 if fails else 0)
