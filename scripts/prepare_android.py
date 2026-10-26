#!/usr/bin/env python3
"""
يُشغَّل بعد `npx cap add android` وقبل البناء. يخصّص مشروع أندرويد المولَّد:
  - الأيقونات (من www/icons/icon-512.png) بنفس أحجام ملفات القالب الموجودة
  - شاشة البداية الداكنة بدل شاشة Capacitor البيضاء
  - ألوان شريط الحالة وشريط التنقل
  - اتجاه عمودي فقط
  - إذن الاهتزاز (VIBRATE) لمؤثرات اللعبة
  - رقم الإصدار (versionCode) من رقم تشغيل البناء

كل تعديل معزول: إن فشل أحدها يطبع تحذيرًا ويكمل، ولا يفشل البناء بسبب أمر تجميلي.
"""
import os, re, sys, glob

BG = "#060a15"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID = os.path.join(ROOT, "android")
RES = os.path.join(ANDROID, "app", "src", "main", "res")
ICON = os.path.join(ROOT, "www", "icons", "icon-512.png")

if not os.path.isdir(ANDROID):
    sys.exit("مجلد android غير موجود: شغّل `npx cap add android` أولًا")


def step(name):
    def deco(fn):
        try:
            fn()
            print(f"[ok]   {name}")
        except Exception as e:  # noqa: BLE001
            print(f"[warn] {name}: {e!r} (تجاوز)")
        return fn
    return deco


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


@step("الأيقونات")
def icons():
    from PIL import Image, ImageDraw
    src = Image.open(ICON).convert("RGBA")
    bg = tuple(int(BG[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    n = 0
    for p in glob.glob(os.path.join(RES, "mipmap-*", "ic_launcher*.png")):
        name = os.path.basename(p)
        size = Image.open(p).size[0]
        if name == "ic_launcher_foreground.png":
            canvas = Image.new("RGBA", (size, size), bg)
            k = int(size * 0.80)
            canvas.alpha_composite(src.resize((k, k), Image.LANCZOS), ((size - k) // 2, (size - k) // 2))
            canvas.save(p)
        elif name == "ic_launcher_round.png":
            im = src.resize((size, size), Image.LANCZOS)
            mask = Image.new("L", (size, size), 0)
            ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
            out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            out.paste(im, (0, 0), mask)
            out.save(p)
        elif name == "ic_launcher.png":
            src.resize((size, size), Image.LANCZOS).save(p)
        else:
            continue
        n += 1
    # لون خلفية الأيقونة التكيفية
    for p in glob.glob(os.path.join(RES, "values", "*.xml")):
        s = read(p)
        if "ic_launcher_background" in s:
            s2 = re.sub(r'(name="ic_launcher_background">)#[0-9A-Fa-f]{3,8}(<)', r"\g<1>" + BG + r"\g<2>", s)
            if s2 != s:
                write(p, s2)
    if n == 0:
        raise RuntimeError("لم أجد ملفات أيقونات في القالب")


def feather(img, edge=0.16):
    """يُليّن حواف الأيقونة المربعة حتى تذوب في خلفية شاشة البداية فلا يظهر إطار مربع حولها."""
    from PIL import Image
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = min(x, w - 1 - x, y, h - 1 - y) / (min(w, h) * edge)
            t = 1.0 if t >= 1 else max(t, 0.0)
            t = t * t * (3 - 2 * t)  # smoothstep
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, int(a * t))
    return img


@step("شاشة البداية")
def splash():
    from PIL import Image
    src = Image.open(ICON).convert("RGBA")
    bg = tuple(int(BG[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    n = 0
    for p in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
        w, h = Image.open(p).size
        canvas = Image.new("RGBA", (w, h), bg)
        k = int(min(w, h) * 0.38)
        canvas.alpha_composite(feather(src.resize((k, k), Image.LANCZOS)), ((w - k) // 2, (h - k) // 2))
        canvas.save(p)
        n += 1
    if n == 0:
        raise RuntimeError("لم أجد splash.png")


@step("ألوان شريط الحالة والتنقل")
def bars():
    for p in glob.glob(os.path.join(RES, "values", "*.xml")):
        s = read(p)
        o = s
        s = re.sub(r'(name="colorPrimaryDark">)#[0-9A-Fa-f]{3,8}(<)', r"\g<1>" + BG + r"\g<2>", s)
        s = re.sub(r'(name="colorPrimary">)#[0-9A-Fa-f]{3,8}(<)', r"\g<1>" + BG + r"\g<2>", s)
        if 'name="AppTheme.NoActionBar"' in s and "android:navigationBarColor" not in s:
            s = re.sub(
                r'(<style\s+name="AppTheme\.NoActionBar"[^>]*>)',
                r'\1\n        <item name="android:statusBarColor">' + BG +
                '</item>\n        <item name="android:navigationBarColor">' + BG + '</item>',
                s, count=1)
        if s != o:
            write(p, s)


@step("الاتجاه العمودي")
def orient():
    p = os.path.join(ANDROID, "app", "src", "main", "AndroidManifest.xml")
    s = read(p)
    if "screenOrientation" not in s:
        s2 = s.replace("<activity", '<activity\n            android:screenOrientation="portrait"', 1)
        if s2 == s:
            raise RuntimeError("لم أجد <activity>")
        write(p, s2)


@step("إذن الاهتزاز")
def vibrate():
    # navigator.vibrate داخل WebView يحتاج إذن VIBRATE في المانيفست (يتجاهله النظام بصمت إن غاب)
    p = os.path.join(ANDROID, "app", "src", "main", "AndroidManifest.xml")
    s = read(p)
    if "android.permission.VIBRATE" in s:
        return
    perm = '    <uses-permission android:name="android.permission.VIBRATE" />\n'
    if "</manifest>" not in s:
        raise RuntimeError("لم أجد </manifest>")
    write(p, s.replace("</manifest>", perm + "</manifest>", 1))


@step("رقم الإصدار")
def version():
    run = os.environ.get("RUN_NUMBER", "1")
    p = os.path.join(ANDROID, "app", "build.gradle")
    s = read(p)
    s2 = re.sub(r"versionCode\s+\d+", f"versionCode {int(run)}", s, count=1)
    s2 = re.sub(r'versionName\s+"[^"]*"', f'versionName "1.0.{int(run)}"', s2, count=1)
    if s2 != s:
        write(p, s2)
