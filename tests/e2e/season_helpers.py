"""مساعدات اختبار: محاكاة مواسم كاملة بسرعة (تُستورد من اختبارات أخرى)."""
from common import *

def fast_seasons(page, n):
    for _ in range(n):
        for _i in range(40):
            r = ev(page, "(()=>{const x=G.Sim.run({mode:'event',autoDP:true}); if(G.S.offers&&G.S.offers.length) G.S.offers.slice().forEach(o=>G.Transfers.rejectOffer(o.id)); return {ph:G.S.phase, stop:x.run&&x.run.stop&&x.run.stop.reason}})()")
            if r['stop'] == 'end' or r['ph'] == 'end': break
        ev(page, "G.S.tour=9; G.UI.cur='home'; G.UI.render()")
        if ev(page, 'G.S.intl && !G.S.intl.done'): ev(page, "G.Intl.autoFinish(); G.Save.save(); G.UI.render()")
        ev(page, "G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(150)
        if page.query_selector('[data-a="rollover"]'):
            page.eval_on_selector('[data-a="rollover"]', 'e => e.click()'); page.wait_for_timeout(400)
        ev(page, "G.UI.closeSheet(); if(G.S.userExpired && G.Transfers.emergencyContract) G.Transfers.emergencyContract(); if(G.S.phase==='summer'){G.S.preLeft=0; G.Season.startSeason();} G.UI.cur='home'; G.UI.render()")
