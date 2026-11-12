"""v4: متانة الحفظ — تلف الملف الرئيسي، تلف الاثنين، امتلاء التخزين، الإغلاق والاستعادة، وعدم الكتابة فوق نسخة سليمة.
الاستخدام: python3 tests/e2e/save_robustness.py"""
import sys
from common import *
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar'); pg = ctx.new_page(); pg.set_default_timeout(60000); attach_errors(pg)
    S = lambda js: ev(pg, js)
    new_game(pg); play_weeks(pg, 4)
    SK = S("G.CONFIG.saveKey"); BK = S("G.CONFIG.backupKey")

    # 1) إغلاق ثم إعادة فتح: التقدّم يُستعاد (visibilitychange → حفظ قسري)
    wk = S("G.S.week"); name = S("G.S.players[G.S.user].n"); ovr = S("G.S.players[G.S.user].ovr")
    S("document.dispatchEvent(new Event('visibilitychange'))")  # visible: لا حفظ
    S("Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.reload(); pg.wait_for_selector('#app'); pg.wait_for_timeout(400)
    check(S("!!G.S && G.S.week") == wk, 'الاستعادة بعد الإغلاق: الأسبوع %s' % wk)
    check(S("G.S.players[G.S.user].n") == name and S("G.S.players[G.S.user].ovr") == ovr, 'الاستعادة: نفس اللاعب والتقييم')
    check(S("G.loadedFrom") == SK, 'حُمّل من الحفظ الرئيسي')

    # 2) الرئيسي تالف + الاحتياطي سليم: يُحمَّل الاحتياطي وتُعرض المسيرة في شاشة البداية
    S("G.Save.save(true); G.Save.save(true)")  # يضمن وجود نسخة احتياطية
    S("localStorage.setItem(G.CONFIG.saveKey, localStorage.getItem(G.CONFIG.saveKey).slice(0, 40000))")  # بتر الملف
    pk = S("(()=>{const k=G.Save.peek(); return k&&{fromBackup:k.fromBackup}})()")
    check(pk and pk['fromBackup'], 'peek يتجاوز الرئيسي التالف إلى الاحتياطي')
    S("G.S=null; G.Save.load(); 0")
    check(S("!!G.S") and S("G.loadedFrom") == BK, 'load يحمّل الاحتياطي عند تلف الرئيسي')
    S("G.S=null; G.UI.cur='start'; G.UI.render()")
    t = txt(pg); check('مسيرة محفوظة' in t and 'النسخة الاحتياطية' in t, 'شاشة البداية تعرض المسيرة من الاحتياطي')

    # 3) الدوران لا ينسخ ملفًا تالفًا فوق الاحتياطي السليم
    S("G.Save.load(); 0")
    good_bak = S("localStorage.getItem(G.CONFIG.backupKey)")
    S("localStorage.setItem(G.CONFIG.saveKey, '{broken')")
    S("G.Save.save(true)")
    check(S("localStorage.getItem(G.CONFIG.backupKey)") == good_bak, 'التالف لم يُنسخ فوق الاحتياطي السليم')
    check(S("G.Save.valid(JSON.parse(localStorage.getItem(G.CONFIG.saveKey)))"), 'الحفظ الرئيسي أُعيد كتابته سليمًا')

    # 4) الاثنان تالفان: لا انهيار، نسخة إنقاذ، رسالة واضحة، والإنقاذ لا يُمسح بمسيرة جديدة
    bigjunk = '{"junk":"' + 'x' * 5000
    S("localStorage.setItem(G.CONFIG.saveKey, %s); localStorage.setItem(G.CONFIG.backupKey, %s); G.S=null" % (repr(bigjunk), repr(bigjunk)))
    ok = S("G.Save.load()")
    check(ok is False, 'load يعيد false بلا استثناء عند تلف الاثنين')
    check(S("localStorage.getItem(G.CONFIG.saveKey + '_rescue')") == bigjunk, 'نسخة الإنقاذ محفوظة')
    S("G.UI.cur='start'; G.UI.render()"); check('تعذّر فتح الحفظ' in txt(pg), 'شاشة البداية تشرح أن الحفظ تالف')
    nohs(pg, 'بداية بعد التلف')
    S("G.Season.newGame({name:'لاعب جديد',nat:'IQ',age:19,pos:'CM',h:178,w:72,foot:'R',look:{skin:2,hair:0,style:0,beard:0,band:0},num:8,clubId:'ath',seed:9,diff:'normal'}); G.S.preLeft=0; G.Season.startSeason(); G.Save.save(true)")
    check(S("G.Save.valid(JSON.parse(localStorage.getItem(G.CONFIG.saveKey)))"), 'المسيرة الجديدة حُفظت')
    check(S("localStorage.getItem(G.CONFIG.saveKey + '_rescue')") == bigjunk, 'مسيرة جديدة لا تمسح نسخة الإنقاذ')

    # 5) امتلاء التخزين: نحاكي حدًّا للمساحة يسمح بنسخة واحدة فقط
    S("""(()=>{ window.__lim = 2.2e6; const orig = Storage.prototype.setItem; window.__orig = orig;
      Storage.prototype.setItem = function(k, v){ let tot = 0; for (let i=0;i<this.length;i++){ const kk=this.key(i); if (kk!==k) tot += (this.getItem(kk)||'').length; } if (tot + String(v).length > window.__lim) { const e = new Error('quota'); e.name='QuotaExceededError'; throw e; } return orig.call(this,k,v); }; })()""")
    S("G.Save.save(true)")
    size = S("G.Save.lastJson.length")
    S("window.__lim = %d" % int(size * 1.4))   # يتّسع لنسخة واحدة + هامش، لا لنسختين
    S("localStorage.removeItem(G.CONFIG.saveKey + '_rescue')")
    r = S("G.Save.save(true)"); r2 = S("G.Save.save(true)")
    check(r and r2 and S("G.lastSaveError") is None, 'مساحة تكفي نسخة واحدة: الحفظ ينجح بإسقاط النسخة الاحتياطية (%s)' % S("G.lastSaveError"))
    check(S("G.Save.valid(JSON.parse(localStorage.getItem(G.CONFIG.saveKey)))"), 'الحفظ الرئيسي سليم بعد الإخلاء')
    # لا تتّسع حتى لنسخة واحدة: الفشل بلا استثناء، الحفظ القديم يبقى، وتظهر رسالة
    before = S("localStorage.getItem(G.CONFIG.saveKey)")
    S("window.__lim = 1000; window.__warned = 0; G.onSaveFail = (e, n) => { window.__warned = n }")
    r = S("G.Save.save(true)")
    check(r is False and S("window.__warned") >= 1, 'امتلاء كامل: الحفظ يفشل بأمان ويُبلَّغ اللاعب')
    check(S("localStorage.getItem(G.CONFIG.saveKey)") == before, 'الحفظ القديم لم يُمسّ عند فشل الكتابة')
    S("G.UI.cur='settings'; G.UI.render()"); check('آخر محاولة حفظ فشلت' in txt(pg), 'الإعدادات تعرض تحذير فشل الحفظ')
    S("Storage.prototype.setItem = window.__orig")
    check(S("G.Save.save(true)") is True and S("G.lastSaveError") is None, 'يتعافى الحفظ فور توفر المساحة')

    # 6) تصدير/استيراد يعيد نفس اللاعب
    txt_save = S("G.Save.exportText()"); n0 = S("G.S.players[G.S.user].n")
    S("G.S=null"); check(S("G.Save.importText(%s)" % repr(txt_save)) is True and S("G.S.players[G.S.user].n") == n0, 'تصدير ثم استيراد')
    check(not errors, 'أخطاء JS: %s' % [e for e in errors if 'quota' not in e.lower()][:3])
    b.close()
finish()
