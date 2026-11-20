"""الهندسة البصرية (Build 25): يضمن بقاء نظام الأشكال موحّدًا في كل الشاشات — لا قيم فردية شاذة ولا أهداف لمس ناقصة.
يقيس على Chromium المحاكي (وليس جهاز أندرويد حقيقي). الاستخدام: python3 tests/e2e/geometry.py [مجلد_اللقطات] [العرض]
ما يُفحص لكل مسار من 22 مسارًا (يشمل أقسام تصنيفات العالم الثلاثة):
  • كل نص بحجم خط صحيح (يُستثنى نص SVG لأنه يتبع مقياس viewBox، وعنوان الاستوديو السائل clamp)
  • كل أيقونة .ic بعرض وارتفاع زوجيين (مع دعم round()) ومربعة
  • كل زر/رابط تحت 44px يملك منطقة لمس فعلية ≥44 (اختبار elementFromPoint خارج حدود العنصر)
  • الوسوم .pill ارتفاعها 24 بالضبط؛ المفتاح .tgl بقياس 56×32
  • لا زوايا موحّدة بقيم شاذة (26px/10px/6px) في الأزرار والبطاقات (زوايا القصّ المتباينة مثل 18px 6px هي هوية التصميم)
  • الشرائط القابلة للتمرير فيها قناع تدرّج عند حافتها (لا قصّ حاد)
"""
import sys
from common import *
import common
common.SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 390
ROUTES = ['home', 'profile', 'career', 'trophies', 'market', 'stats', 'settings', 'matches', 'league', 'cup', 'ucl', 'intl', 'club', 'squad', 'train', 'more', 'press', 'inbox', 'bd', 'worldrank:clubs', 'worldrank:nations', 'worldrank:history']

PROBE = r"""(()=>{
  const bad={font:[],icon:[],tap:[],pill:[],tgl:[],radius:[],mask:[]};
  const vh=innerHeight, vw=innerWidth;
  const navTop=(document.querySelector('.bottomnav')||{getBoundingClientRect:()=>({top:vh})}).getBoundingClientRect().top;
  document.querySelectorAll('#app *').forEach(e=>{
    const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return;
    const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none') return;
    const cn=e.className&&e.className.toString?e.className.toString():'';
    const tag=e.tagName.toLowerCase();
    // الخطوط
    if(tag!=='text'&&tag!=='tspan'&&!(e.closest&&e.closest('svg'))&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())){
      const f=parseFloat(cs.fontSize);
      if(!Number.isInteger(f)&&!/cine-name/.test(cn)) bad.font.push(tag+'.'+cn.slice(0,24)+' '+cs.fontSize);
    }
    // الأيقونات
    if(tag==='svg'&&/(^|\s)ic(\s|$)/.test(cn)){
      const w=Math.round(r.width*100)/100,h=Math.round(r.height*100)/100;
      if(Math.abs(w-h)>.5||Math.round(w)%2!==0) bad.icon.push(cn.slice(0,20)+' '+w+'x'+h);
    }
    // أهداف اللمس
    if((tag==='button'||tag==='a'||e.hasAttribute('data-a'))&&(r.height<43.5||r.width<43.5)&&r.top>=0&&r.bottom<=navTop-4&&r.top>=70){
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      const hit=(x,y)=>{if(x<0||y<0||x>=vw||y>=vh)return true;const t=document.elementFromPoint(x,y);return !!t&&(t===e||e.contains(t));};
      const okH=r.height>=43.5||(hit(cx,cy-21)&&hit(cx,cy+21));
      const okW=r.width>=43.5||(hit(cx-21,cy)&&hit(cx+21,cy));
      if(!(okH&&okW)) bad.tap.push((cn||tag).slice(0,26)+' '+Math.round(r.width)+'x'+Math.round(r.height));
    }
    if(/(^|\s)pill(\s|$)/.test(cn)&&!/of-why/.test(e.parentElement.className)&&Math.abs(r.height-24)>.6&&r.height<30) bad.pill.push(cn+' '+r.height.toFixed(1));
    if(/(^|\s)tgl(\s|$)/.test(cn)&&(Math.round(r.width)!==56||Math.round(r.height)!==32)) bad.tgl.push(Math.round(r.width)+'x'+Math.round(r.height));
    if(/(^|\s)(btn|card|sheet)(\s|$)/.test(cn)){
      const br=cs.borderTopLeftRadius+' '+cs.borderTopRightRadius+' '+cs.borderBottomRightRadius+' '+cs.borderBottomLeftRadius;
      if(cs.borderTopLeftRadius===cs.borderTopRightRadius&&cs.borderTopRightRadius===cs.borderBottomRightRadius&&cs.borderBottomRightRadius===cs.borderBottomLeftRadius&&/^(26|10|6)px$/.test(cs.borderTopLeftRadius)) bad.radius.push(cn.slice(0,20)+' '+br);
    }
    if(/(^|\s)(tabs|sw)(\s|$)/.test(cn)){
      // Build 27: الشريط اللاصق .sw يُظهر حوافه بسهمين بتدرّج (.sw-go) بدل القناع؛ و.tabs داخله يتبعه؛ والصف المضمّن .tabs.inline يبقى بالقناع
      const m=cs.maskImage||cs.webkitMaskImage;
      if(/(^|\s)sw(\s|$)/.test(cn)){
        const gs=[...e.querySelectorAll('.sw-go')].map(g=>getComputedStyle(g).backgroundImage.indexOf('gradient')>=0);
        if(gs.length!==2||gs.some(x=>!x)) bad.mask.push(cn+' (أسهم التدرّج)');
      } else if(e.parentElement&&/(^|\s)sw(\s|$)/.test(e.parentElement.className)) { /* حافة الشريط اللاصق تتولاها أسهمه */ }
      else if(!m||m==='none') bad.mask.push(cn);
    }
  });
  const u=a=>[...new Set(a)].slice(0,6);
  for(const k in bad) bad[k]=u(bad[k]);
  return bad;
})()"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=2)
    page = ctx.new_page(); page.set_default_timeout(30000); attach_errors(page)
    new_game(page); play_weeks(page, 14)
    agg = {k: set() for k in ['font', 'icon', 'tap', 'pill', 'tgl', 'radius', 'mask']}
    for r in ROUTES:
        rt, _, sb = r.partition(':')
        ev(page, "G.UI.cur='%s'; G.UI.sub=%s; G.UI.render()" % (rt, "{wr:'%s'}" % sb if sb else '{}')); page.wait_for_timeout(200)
        res = ev(page, PROBE)
        for k, v in res.items():
            for x in v: agg[k].add('%s: %s' % (r, x))
    names = {'font': 'كل أحجام الخطوط صحيحة', 'icon': 'كل الأيقونات مربعة بقياس زوجي', 'tap': 'كل أهداف اللمس الصغيرة لها منطقة ≥44',
             'pill': 'ارتفاع الوسوم 24', 'tgl': 'المفتاح 56×32', 'radius': 'لا زوايا شاذة في الأزرار والبطاقات', 'mask': 'تدرّج حافة على الشرائط القابلة للتمرير'}
    for k, nm in names.items():
        check(not agg[k], '%s: %s %s' % (VW, nm, sorted(agg[k])[:5] if agg[k] else ''))
    # الإعدادات: المفتاح موجود فعلًا ويعمل بالقياس الجديد
    ev(page, "G.UI.cur='settings'; G.UI.sub={}; G.UI.render()"); page.wait_for_timeout(200)
    t = ev(page, "(()=>{const e=document.querySelector('.tgl');if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})()")
    check(t == [56, 32], '%s: مفتاح الإعدادات 56×32 (%s)' % (VW, t))
    # الإبهام داخل المفتاح عند التشغيل لا يخرج عن المفتاح
    th = ev(page, "(()=>{const e=document.querySelector('.tgl.on');if(!e)return 'none';const r=e.getBoundingClientRect();const a=getComputedStyle(e,'::after');const left=parseFloat(a.insetInlineStart||a.left);return [Math.round(r.width),left,parseFloat(a.width)]})()")
    check(th == 'none' or (th[1] + th[2] < th[0]), '%s: الإبهام داخل المفتاح عند التشغيل %s' % (VW, th))
    shot(page, 'geom_%s_settings' % VW)
    b.close()
finish()
