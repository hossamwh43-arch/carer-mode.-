"""مسح تخطيطي شامل (v4): كل مسار × كل تبويب فرعي، على عرض واحد (360/390/412).
يكشف: تمريرًا أفقيًا للصفحة، حاويات داخلية تمرَّر أفقيًا (مثل الجداول)، عناصر تخرج عن حدود الشاشة، ونصوصًا مقصوصة بلا نقاط حذف.
ليس مجرد scrollWidth للصفحة: الجدول داخل حاوية overflow-x:auto لا يظهر في الفحص القديم.
الاستخدام: python3 tests/e2e/layout_sweep.py [مجلد_اللقطات] [العرض=360] [مواسم_سابقة=2]"""
import sys, json
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 360
PRE = int(sys.argv[3]) if len(sys.argv) > 3 else 2
ROUTES = ['home', 'profile', 'career', 'trophies', 'market', 'stats', 'settings', 'matches', 'league', 'cup', 'ucl', 'intl', 'club', 'squad', 'train', 'more', 'press', 'inbox', 'bd']
# حاويات تمرير أفقي مقصودة (شرائط تبويب/كاروسيل) لا تُعدّ خللًا
ALLOW_SCROLL = ('.nws-tk-w',)  # شريط أخبار متحرك

CHECK_JS = r"""(allow) => {
  const vw = innerWidth, out = [];
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ((typeof el.className === 'string' && el.className.trim()) ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const app = document.querySelector('#app'); if (!app) return out;
  // حاويات التمرير المقصودة (كاروسيل/شرائط): scrollbar-width:none. كل أبنائها خارج الفحص.
  app.querySelectorAll('*').forEach(el => { const c = getComputedStyle(el); if (/(auto|scroll)/.test(c.overflowX) && c.scrollbarWidth === 'none') el.setAttribute('data-int', '1'); });
  // عناصر زخرفية مقصودة (علامة مائية مقصوصة): absolute + pointer-events:none. وأي عنصر يحتويها لا يُعدّ مقصوصًا بسببها
  const decor = [];
  app.querySelectorAll('*').forEach(el => { const c = getComputedStyle(el); if (c.position === 'absolute' && c.pointerEvents === 'none') { el.setAttribute('data-int', '1'); decor.push(el); } });
  app.querySelectorAll('*').forEach(el => {
    if (el.closest('[data-int]')) return;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return;
    const allowed = allow.some(a => el.matches(a) || el.closest(a));
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(cs.overflowX) && !allowed) out.push({k: 'scroll', s: sel(el), sw: el.scrollWidth, cw: el.clientWidth});
    if ((r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed' && !allowed) out.push({k: 'out', s: sel(el), l: Math.round(r.left), r: Math.round(r.right)});
    if (/hidden|clip/.test(cs.overflowX) && !decor.some(d => el.contains(d)) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && !allowed && el.textContent.trim()) out.push({k: 'clip', s: sel(el), sw: el.scrollWidth, cw: el.clientWidth, t: el.textContent.trim().slice(0, 30)});
  });
  return out;
}"""

from season_helpers import fast_seasons

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(60000); attach_errors(page)
    new_game(page); play_weeks(page, 10)
    if PRE: fast_seasons(page, PRE)
    play_weeks(page, 6)
    print('الموسم', ev(page, 'G.S.season'), 'الأسبوع', ev(page, 'G.S.week'))
    issues = {}; seen_states = 0
    for r in ROUTES:
        ev(page, "G.UI.sub={}; G.UI.cur='%s'; G.UI.render()" % r); page.wait_for_timeout(120)
        groups = page.evaluate("""() => { const g = {}; document.querySelectorAll('#app .tabs .tab[data-v][data-v2]').forEach(b => { (g[b.dataset.v] = g[b.dataset.v] || []).push(b.dataset.v2); }); return g; }""")
        states = [{}]
        for k, vals in groups.items():
            for v in vals: states.append({k: v})
        for st in states:
            ev(page, "G.UI.sub=%s; G.UI.cur='%s'; G.UI.render()" % (json.dumps(st), r)); page.wait_for_timeout(80)
            nohs(page, '%s %s' % (r, st))
            seen_states += 1
            res = page.evaluate(CHECK_JS, list(ALLOW_SCROLL))
            w = page.evaluate("() => [document.documentElement.scrollWidth, innerWidth]")
            if w[0] > w[1] + 1: res.append({'k': 'page', 's': 'document', 'sw': w[0], 'cw': w[1]})
            if res:
                key = '%s %s' % (r, json.dumps(st, ensure_ascii=False))
                issues[key] = res
                if common.SHOTS: shot(page, 'sw_%s_%s' % (r, '_'.join(st.values()) or 'main'), True)
    print('حالات مفحوصة:', seen_states)
    for k, v in issues.items():
        print('✗', k)
        seen = set()
        for i in v:
            sig = (i['k'], i['s'])
            if sig in seen: continue
            seen.add(sig); print('    ', i)
    check(not issues, 'لا تمرير أفقي ولا خروج عن الحدود ولا نص مقصوص في أي حالة (%d حالة بها مشاكل)' % len(issues))
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
