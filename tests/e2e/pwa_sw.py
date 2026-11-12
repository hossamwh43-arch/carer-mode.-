"""v4: Service Worker/PWA — يُخدَّم المشروع عبر http محلي (SW لا يعمل على file://).
يفحص: (1) كل ملف يشير إليه index.html موجود في قائمة sw.js وعلى القرص، (2) تثبيت SW وملء الكاش، (3) العمل بلا إنترنت (إعادة تحميل + لعب أسبوع)،
(4) التحديث: ملف جديد + رقم نسخة جديد ⇒ تُحمَّل الملفات الجديدة ويُحذف الكاش القديم ولا يختلط القديم بالجديد، (5) لا تُخزَّن استجابات 404.
الاستخدام: python3 tests/e2e/pwa_sw.py"""
import os, re, shutil, tempfile, threading, http.server, socketserver, functools, json
from common import *
import common
SRC = common.WEB
tmp = tempfile.mkdtemp(prefix='fcc_pwa_')
site = os.path.join(tmp, 'site'); shutil.copytree(SRC, site, ignore=shutil.ignore_patterns('tests', '*.md', '__pycache__'))

# 1) تدقيق ثابت: index.html ↔ sw.js ↔ القرص
html = open(os.path.join(site, 'index.html'), encoding='utf-8').read()
refs = set(re.findall(r'(?:src|href)="([^"#?]+)"', html)); refs = {r for r in refs if not r.startswith(('http', 'data:', '#', 'javascript'))}
sw = open(os.path.join(site, 'sw.js'), encoding='utf-8').read()
files = set(re.findall(r"'([^']+)'", sw[sw.index('const FILES'):sw.index('];')]))
miss_sw = sorted(r for r in refs if r not in files and r not in ('manifest.json',) or (r in refs and r not in files))
check(not miss_sw, 'كل ملفات index.html موجودة في قائمة sw.js %s' % miss_sw)
miss_disk = sorted(f for f in files if f != './' and not os.path.exists(os.path.join(site, f)))
check(not miss_disk, 'كل ملفات sw.js موجودة على القرص (وإلا يفشل addAll كله) %s' % miss_disk)
man = json.load(open(os.path.join(site, 'manifest.json'), encoding='utf-8'))
check(all(os.path.exists(os.path.join(site, i['src'])) for i in man['icons']), 'أيقونات manifest موجودة')
check(re.search(r"const VER = 'fcc-v\d+'", sw) is not None, 'رقم نسخة SW ثابت الصيغة')

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(H, directory=site)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d/' % port

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar', service_workers='allow'); pg = ctx.new_page(); pg.set_default_timeout(30000); attach_errors(pg)
    pg.goto(BASE + 'index.html'); pg.wait_for_selector('#app')
    pg.evaluate("navigator.serviceWorker.ready.then(() => 1)")
    pg.wait_for_function("navigator.serviceWorker.controller !== null || true")
    # ننتظر اكتمال التثبيت (addAll) ثم نتأكد من الكاش
    for _ in range(40):
        n = pg.evaluate("caches.keys().then(async ks => { let c = 0; for (const k of ks) c += (await (await caches.open(k)).keys()).length; return c })")
        if n >= len(files) - 1: break
        pg.wait_for_timeout(250)
    keys = pg.evaluate("caches.keys()"); check(len(keys) == 1, 'كاش واحد بعد التثبيت %s' % keys)
    check(n >= len(files) - 1, 'الكاش يحوي كل الملفات (%d/%d)' % (n, len(files) - 1))
    pg.reload(); pg.wait_for_selector('#app'); pg.wait_for_timeout(300)
    check(pg.evaluate("!!navigator.serviceWorker.controller"), 'الـSW يتحكم بالصفحة')
    # 3) بلا إنترنت
    new_game_js = "G.Season.newGame({name:'حسام',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:3,diff:'normal'}); G.S.preLeft=0; G.Season.startSeason(); G.UI.cur='home'; G.UI.render()"
    ev(pg, new_game_js); ev(pg, "G.Save.save(true)")
    ctx.set_offline(True)
    pg.goto(BASE + 'index.html?offline=1'); pg.wait_for_selector('#app'); pg.wait_for_timeout(500)
    check(ev(pg, "typeof G === 'object' && !!G.S && !!G.S.players"), 'بلا إنترنت: تُفتح اللعبة وتُستعاد المسيرة من الكاش (مع نص استعلام)')
    nohs(pg, 'بلا إنترنت')
    wk = ev(pg, "G.S.week"); play_weeks(pg, 2)
    check(ev(pg, "G.S.week") >= wk + 1, 'بلا إنترنت: اللعب يعمل')
    ctx.set_offline(False)
    # 5) 404 لا يدخل الكاش
    pg.evaluate("fetch('missing-file-xyz.js').catch(() => 0)"); pg.wait_for_timeout(400)
    cached404 = pg.evaluate("caches.keys().then(async ks => { for (const k of ks) { if (await (await caches.open(k)).match('missing-file-xyz.js')) return true } return false })")
    check(not cached404, 'استجابة 404 لا تُخزَّن في الكاش')
    # 4) تحديث: علامة جديدة في ملف + رقم نسخة جديد
    v_old = re.search(r"const VER = '(fcc-v\d+)'", sw).group(1)
    st = os.path.join(site, 'js', 'ui_start.js'); s0 = open(st, encoding='utf-8').read()
    open(st, 'w', encoding='utf-8').write(s0 + '\nwindow.__UPDATED_MARK = 42;\n')
    open(os.path.join(site, 'sw.js'), 'w', encoding='utf-8').write(sw.replace(v_old, 'fcc-v999'))
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())")
    for _ in range(40):
        ks = pg.evaluate("caches.keys()")
        if ks == ['fcc-v999']: break
        pg.wait_for_timeout(250)
    check(ks == ['fcc-v999'], 'بعد التحديث: الكاش القديم حُذف وبقي الجديد فقط %s' % ks)
    pg.reload(); pg.wait_for_selector('#app'); pg.wait_for_timeout(400)
    check(pg.evaluate("window.__UPDATED_MARK") == 42, 'الملف الجديد وصل (لا نسخة قديمة عالقة)')
    check(ev(pg, "!!G.S && !!G.S.players"), 'المسيرة سليمة بعد التحديث')
    check(not [e for e in errors if 'ERR_INTERNET_DISCONNECTED' not in e and 'Failed to fetch' not in e and '404' not in e], 'أخطاء JS: %s' % errors[:3])
    b.close()
srv.shutdown(); shutil.rmtree(tmp, ignore_errors=True)
finish()
