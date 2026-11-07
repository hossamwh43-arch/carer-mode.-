#!/usr/bin/env python3
"""يولّد icons/bg-stadium.svg: خلفية ملعب ليلية سينمائية (بوكيه جمهور + كشّافات + عشب) بلا صور خارجية.
قيم عشوائية ثابتة (seed) فتتطابق النتيجة في كل مرة. التشغيل: python3 tools/gen_stadium.py"""
import random, math, os
random.seed(7)
W, H = 800, 560
o = []
a = o.append
a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice">')
a('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050913"/><stop offset=".42" stop-color="#0b1733"/><stop offset=".62" stop-color="#0a1429"/><stop offset="1" stop-color="#060b16"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6" stop-opacity=".20"/><stop offset=".55" stop-color="#cfe0ff" stop-opacity=".05"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#fff7e0" stop-opacity=".95"/><stop offset=".25" stop-color="#ffe9b0" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>
<radialGradient id="bk"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".6" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="pg" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#1a6b63" stop-opacity=".55"/><stop offset="1" stop-color="#0a2a2c" stop-opacity="0"/></radialGradient>
<radialGradient id="vg" cx=".5" cy=".46" r=".78"><stop offset=".55" stop-color="#03060e" stop-opacity="0"/><stop offset="1" stop-color="#03060e" stop-opacity=".78"/></radialGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050913" stop-opacity="0"/><stop offset="1" stop-color="#050913" stop-opacity=".85"/></linearGradient>
</defs>''')
a(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
# --- جمهور بوكيه: صفوف دوائر ناعمة متفاوتة الحجم واللون (تشبه عدسة بعيدة المدى) ---
pal = ['#ffe7b8', '#ffe7b8', '#a9c8ff', '#ffc53d', '#ffffff', '#8fe9d0', '#c3d5ff']
def bokeh(y0, y1, n, rmin, rmax, opmin, opmax):
    for _ in range(n):
        x = random.uniform(-10, W + 10)
        y = random.uniform(y0, y1)
        r = random.uniform(rmin, rmax)
        c = random.choice(pal)
        op = random.uniform(opmin, opmax)
        a(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{c}" opacity="{op:.2f}"/>')
bokeh(150, 215, 170, 1.6, 3.4, .10, .34)
bokeh(205, 285, 220, 2.2, 5.2, .08, .30)
bokeh(270, 330, 120, 3.0, 7.0, .05, .20)
# --- ظلّ المدرّج العلوي (سقف) وحاجز المدرّج السفلي ---
a(f'<path d="M0 150 L0 96 Q200 126 400 132 Q600 126 800 96 L800 150 Q600 178 400 182 Q200 178 0 150Z" fill="#050a16" opacity=".94"/>')
a(f'<path d="M0 318 L800 318 L800 350 L0 350Z" fill="#040810" opacity=".92"/>')
# لوحات إعلانات باهتة (بلا نصوص أو شعارات)
x = 0
while x < W:
    w = random.choice([54, 62, 70, 80])
    c = random.choice(['#1d3a7a', '#12486b', '#6a2b4a', '#6b5a1b', '#1a5b52', '#2a3566'])
    a(f'<rect x="{x + 2}" y="326" width="{w - 4}" height="16" rx="2" fill="{c}" opacity=".5"/>')
    x += w
# --- كشّافات: عناقيد أضواء + هالة + أشعة ---
def tower(cx, cy, sc, beam_to):
    a(f'<circle cx="{cx}" cy="{cy}" r="{70 * sc:.0f}" fill="url(#glow)" opacity=".75"/>')
    for i in range(3):
        for j in range(4):
            px, py = cx - 18 * sc + j * 12 * sc, cy - 11 * sc + i * 11 * sc
            a(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{3.1 * sc:.1f}" fill="#fffaf0"/>')
    bx0, bx1 = beam_to
    for k, f in enumerate((1.0, .66, .36)):
        m0 = cx + (bx0 - cx) * f; m1 = cx + (bx1 - cx) * f
        a(f'<polygon points="{cx - 14 * sc * f:.0f},{cy} {cx + 14 * sc * f:.0f},{cy} {m1:.0f},{H - 30} {m0:.0f},{H - 30}" fill="url(#beam)" opacity=".7"/>')
tower(96, 112, 1.25, (-60, 380))
tower(704, 112, 1.25, (420, 860))
tower(270, 128, .8, (80, 400))
tower(530, 128, .8, (400, 720))
# --- العشب: شرائط بمنظور + توهّج مركزي + خطوط خافتة ---
top = 350
a(f'<polygon points="0,{top} {W},{top} {W},{H} 0,{H}" fill="#0a2326"/>')
n = 9
for i in range(n):
    y0 = top + (H - top) * (i / n) ** 1.35
    y1 = top + (H - top) * ((i + 1) / n) ** 1.35
    col = '#0c2c2f' if i % 2 == 0 else '#0a2427'
    a(f'<rect x="0" y="{y0:.1f}" width="{W}" height="{y1 - y0 + .6:.1f}" fill="{col}"/>')
a(f'<ellipse cx="400" cy="{top + 52}" rx="360" ry="120" fill="url(#pg)"/>')
a(f'<g fill="none" stroke="#e8fff6" stroke-opacity=".10" stroke-width="2"><path d="M-40 {H - 20} Q400 {top + 20} 840 {H - 20}"/><ellipse cx="400" cy="{top + 74}" rx="120" ry="26"/></g>')
a(f'<rect x="0" y="{top - 30}" width="{W}" height="64" fill="url(#fade)"/>')
a(f'<rect width="{W}" height="{H}" fill="url(#vg)"/>')
a('</svg>')
out = os.path.join(os.path.dirname(__file__), '..', 'icons', 'bg-stadium.svg')
open(out, 'w').write('\n'.join(o))
print(out, os.path.getsize(out) // 1024, 'KB')
