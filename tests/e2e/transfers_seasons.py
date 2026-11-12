"""مواسم متتالية لنظام الانتقالات (v3.8): يحاكي N مواسم ويجرّب في كل موسم استراتيجية مختلفة للمستخدم
(رفض الكل · وكيل+مزاد+تفاوض · طلب انتقال · طلب إعارة · قبول مباشر) ويفحص بعد كل توقف ثوابت العالم:
لا قيم NaN، المستخدم موجود في تشكيلة واحدة فقط، لا عروض والسوق مغلق، لا لاعب في ناديين، أحجام التشكيلات، الإعارة تنتهي،
وأن كل انتقال للمستخدم تم أثناء نافذة مفتوحة. الاستخدام: python3 transfers_seasons.py [المواسم=6] [البذرة=7] [العرض=390]"""
import sys, time, collections
from common import *
import common
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 7
VW = int(sys.argv[3]) if len(sys.argv) > 3 else 390

INV_JS = r"""
window.__bad = function(){
  const S = G.S, out = [], P = S.players, C = S.clubs;
  const walk = (v, path, d) => { if (d > 4 || v == null) return; if (typeof v === 'number') { if (!isFinite(v)) out.push('NaN في ' + path); return; }
    if (typeof v === 'object') for (const k in v) walk(v[k], path + '.' + k, d + 1); };
  const u = P[S.user];
  ['offers','fin','rel','ag','treq','lreq','reoffer','window'].forEach(k => walk(S[k], 'S.' + k, 0));
  walk(u, 'user', 0);
  Object.keys(C).forEach(id => { const c = C[id]; ['tb','wcap','rep'].forEach(k => { if (c[k] != null && !isFinite(c[k])) out.push('NaN نادي ' + id + '.' + k); }); });
  // مكان المستخدم
  let where = [], seen = {}, dup = [];
  Object.keys(C).forEach(id => { const sq = C[id].squad || [];
    if (sq.includes(S.user)) where.push(id);
    sq.forEach(pid => { if (seen[pid] && seen[pid] !== id) dup.push(pid + '@' + seen[pid] + '/' + id); seen[pid] = id; });
    if (new Set(sq).size !== sq.length) out.push('تكرار داخل تشكيلة ' + id);
    sq.forEach(pid => { const q = P[pid]; if (!q) out.push('لاعب مفقود ' + pid + ' في ' + id); else if (q.club !== id) out.push('p.club≠التشكيلة: ' + pid + ' ' + q.club + '/' + id); });
  });
  if (where.length !== 1) out.push('المستخدم في ' + where.length + ' تشكيلات: ' + where.join(','));
  else if (where[0] !== u.club) out.push('club المستخدم ' + u.club + ' ≠ التشكيلة ' + where[0]);
  if (dup.length) out.push('لاعب في ناديين: ' + dup.slice(0, 3).join(' '));
  if (u.parentPays && !C[u.parent]) out.push('نادٍ أصلي غير موجود أثناء الإعارة');
  if (!u.parentPays && u.parent) out.push('parent بلا parentPays');
  if (!S.userExpired && !(u.ct && u.ct.y >= 0 && u.ct.w > 0)) out.push('عقد غير صالح ' + JSON.stringify(u.ct));
  // العروض
  const types = ['transfer','loan','free'];
  (S.offers || []).forEach(o => {
    if (!types.includes(o.type)) out.push('نوع عرض غريب ' + o.type);
    if (!(o.wage > 0)) out.push('راتب عرض غير صالح ' + o.id);
    if (o.type === 'transfer' && !(o.fee >= 0)) out.push('رسوم غير صالحة ' + o.id);
    if (o.type === 'loan' ? o.years !== 0 : !(o.years >= 1 && o.years <= 5)) out.push('مدة عرض غير صالحة ' + o.years);
    if (!C[o.club]) out.push('نادي عرض مجهول ' + o.club);
    if (o.club === u.club && o.type === 'transfer') out.push('عرض من ناديه الحالي');
    if (!S.window.open && !S.userExpired) out.push('عرض ' + o.id + ' والنافذة مغلقة');
  });
  // أحجام التشكيلات (أندية السوق)
  const bad = [];
  G.Transfers.market().forEach(id => { const n = (C[id].squad || []).length; if (n < 14 || n > 40) bad.push(id + ':' + n); });
  if (bad.length) out.push('أحجام تشكيلات: ' + bad.slice(0, 4).join(' '));
  return out;
};
window.__ex = [];
(function(){ const T = G.Transfers, ex = T.execute; T.execute = function(p, to, fee, wage, years, opts){
  window.__ex.push({ user: !!p.user, loan: !!(opts && opts.loan), open: !!(G.S.window && G.S.window.open), phase: G.S.phase, week: G.S.week, season: G.S.season, from: p.club, to: to });
  return ex.apply(this, arguments); }; })();
"""

STRATS = ['reject', 'agent', 'request', 'loan', 'accept']

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': VW, 'height': 844}, locale='ar', device_scale_factor=1)
    page = ctx.new_page(); page.set_default_timeout(60000); attach_errors(page)
    S = lambda js: ev(page, js)
    new_game(page, 'ath', 'CM', 19, SEED)
    S(INV_JS)
    seasons = 0; stops = 0; viol = collections.Counter(); outcome = collections.Counter(); fails = collections.Counter()
    state = {}; loans_seen = 0; moves = 0
    t0 = time.time()
    # دفع الشعبية لتفتح مستويات الوكيل
    S("G.Media.get().pop = 62")
    while seasons < N and stops < 160:
        stops += 1
        r = S("(()=>{const x=G.Sim.run({mode:'event',autoDP:true}); return {ok:x.ok,msg:x.msg||null,stop:x.run&&x.run.stop&&x.run.stop.reason,ph:G.S.phase,wk:G.S.week}})()")
        if not r['ok']:
            check(False, 'المحاكاة رفضت: %s' % r['msg']); break
        for v in S("window.__bad()"): viol[v.split(' ')[0] + ' ' + (v.split(' ')[1] if ' ' in v else '')] += 1; print('   ! ' + v)
        strat = STRATS[seasons % len(STRATS)]
        sea = S('G.S.season'); st = state.setdefault(sea, {})
        has_off = S('G.S.window.open && G.S.offers.length > 0'); wopen = S('G.S.window.open')
        if wopen and not st.get('done'):
            n_tr = S("G.S.offers.filter(o=>o.type==='transfer').length")
            if strat == 'reject':
                if has_off: S("G.S.offers.slice().forEach(o => G.Transfers.rejectOffer(o.id))"); outcome['reject'] += 1
            elif strat == 'agent':
                if not S('G.Agent.has()'): print('   agent.hire:', S("G.Agent.hire(2)"))
                if n_tr and not st.get('worked'):
                    st['worked'] = 1
                    print('   work:', S("G.Agent.work()"))
                    if n_tr >= 2: au = S("G.Agent.auction()"); print('   auction:', au); outcome['auction ' + str(au.get('ok'))] += 1
                    oid = S("(()=>{const o=G.S.offers.filter(o=>o.type==='transfer').sort((a,b)=>G.Agent.wEq(b,'CM')-G.Agent.wEq(a,'CM'))[0]; return o&&o.id})()")
                    if oid:
                        d = S("G.Agent.delegate('%s')" % oid); print('   delegate:', d.get('msg')); outcome['delegate ' + str(d.get('win'))] += 1
                        a = S("(()=>{const o=G.S.offers.find(x=>x.id==='%s'); return o?G.Transfers.acceptOffer(o.id):{ok:false,msg:'العرض اختفى'}})()" % oid)
                        outcome['agent-accept ' + str(a['ok'])] += 1
                        if not a['ok']: fails[a.get('msg', '?')] += 1
                        else: moves += 1; st['done'] = 1
            elif strat == 'request':
                if not st.get('req'):
                    st['req'] = 1; rq = S("G.Transfers.requestTransfer()"); print('   request:', rq); outcome['request ' + str(rq.get('status'))] += 1
                oid = S("(()=>{const o=G.S.offers.filter(o=>o.type==='transfer')[0]; return o&&o.id})()")
                if oid:
                    a = S("G.Transfers.acceptOffer('%s')" % oid); outcome['request-accept ' + str(a['ok'])] += 1
                    if not a['ok']: fails[a.get('msg', '?')] += 1
                    else: moves += 1; st['done'] = 1
            elif strat == 'loan':
                if not st.get('lreq'):
                    st['lreq'] = 1; lr = S("G.Transfers.requestLoan()"); print('   loanreq:', lr); outcome['loanreq ' + str(lr.get('ok'))] += 1
                lo = S("(()=>{const o=G.S.offers.filter(o=>o.type==='loan')[0]; return o&&o.id})()")
                if lo:
                    a = S("G.Transfers.acceptOffer('%s')" % lo); outcome['loan-accept ' + str(a['ok'])] += 1
                    if a['ok']: loans_seen += 1; moves += 1; st['done'] = 1
                    else: fails[a.get('msg', '?')] += 1
            elif strat == 'accept':
                oid = S("(()=>{const o=G.S.offers.filter(o=>o.type==='transfer').sort((a,b)=>b.score-a.score)[0]; return o&&o.id})()")
                if oid:
                    n = S("(()=>{const o=G.S.offers.find(x=>x.id==='%s'); return G.Transfers.negotiate(o, Math.round(o.wage*1.06/500)*500, o.years, {})})()" % oid)
                    outcome['neg ' + str(n.get('res'))] += 1
                    a = S("(()=>{const o=G.S.offers.find(x=>x.id==='%s'); return o?G.Transfers.acceptOffer(o.id):{ok:false,msg:'سحب العرض'}})()" % oid)
                    outcome['accept ' + str(a['ok'])] += 1
                    if not a['ok']: fails[a.get('msg', '?')] += 1
                    else: moves += 1; st['done'] = 1
            for v in S("window.__bad()"): viol[v.split(' ')[0] + ' ' + (v.split(' ')[1] if ' ' in v else '')] += 1; print('   ! بعد الإجراء: ' + v)
            S("G.UI.cur='market'; G.UI.sub={}; G.UI.render()")
            if 'حدث خطأ أثناء عرض هذه الصفحة' in txt(page): check(False, 'خطأ عرض السوق في الموسم %s' % sea)
            S("G.UI.cur='home'; G.UI.render()")
        if S('G.S.window.open && G.S.offers.length > 0') and (st.get('done') or strat == 'reject' or st.get('worked')):
            S("G.S.offers.slice().forEach(o => G.Transfers.rejectOffer(o.id))")  # لا تُترك عروض تعلّق المحاكاة
        if r['stop'] == 'end' or r['ph'] == 'end':
            seasons += 1
            was_loan = S('!!G.S.players[G.S.user].parentPays')
            S("G.S.tour=9; G.UI.cur='home'; G.UI.render()")
            if S('G.S.intl && !G.S.intl.done'): S("G.Intl.autoFinish(); G.Save.save(); G.UI.render()")
            S("G.UI.cur='home'; G.UI.render()"); page.wait_for_timeout(200)
            if page.query_selector('[data-a="rollover"]'):
                page.eval_on_selector('[data-a="rollover"]', 'e => e.click()'); page.wait_for_timeout(500)
            else:
                check(False, 'لا زر الانتقال للموسم التالي بعد الموسم %d' % seasons); break
            S("G.UI.closeSheet(); G.UI.cur='home'; G.UI.render()")
            if was_loan:
                now = S('({pp:G.S.players[G.S.user].parentPays, buy:!!G.S.players[G.S.user].loanBuy})')
                check(not now['pp'], 'انتهت الإعارة مع نهاية الموسم %d' % seasons)
            for v in S("window.__bad()"): viol[v.split(' ')[0] + ' ' + (v.split(' ')[1] if ' ' in v else '')] += 1; print('   ! بعد الانتقال للموسم: ' + v)
            if S('G.S.userExpired'): S("G.Transfers.emergencyContract && G.Transfers.emergencyContract()")
            if S('G.S.phase') == 'summer': S("G.S.preLeft=0; G.Season.startSeason(); G.UI.render()")
            for v in S("window.__bad()"): viol[v.split(' ')[0] + ' ' + (v.split(' ')[1] if ' ' in v else '')] += 1; print('   ! بعد بدء الموسم: ' + v)
    el = time.time() - t0
    ex = S("window.__ex")
    ue = [e for e in ex if e['user']]
    print('مواسم', seasons, '· توقفات', stops, '· انتقالات للمستخدم', len(ue), '· انتقالات AI', len(ex) - len(ue), '· زمن', round(el), 'ث')
    print('نتائج:', dict(outcome)); print('أسباب فشل:', dict(fails)); print('مخالفات:', dict(viol))
    check(seasons >= N, 'اكتملت %d مواسم (%d)' % (N, seasons))
    check(not viol, 'لا مخالفات ثوابت: %s' % dict(viol))
    check(all(e['open'] or e['phase'] in ('summer',) for e in ue), 'كل انتقالات المستخدم أثناء نافذة مفتوحة %s' % [e for e in ue if not e['open']][:3])
    check(all(e['from'] != e['to'] for e in ex), 'لا انتقال من النادي لنفسه')
    check(all(isinstance(k, str) and k and k != 'undefined' for k in fails), 'أسباب الفشل كلها نصوص واضحة')
    check(S("Object.keys(localStorage).reduce((a,k)=>a+localStorage[k].length,0)") < 4_500_000, 'حجم الحفظ معقول')
    S('G.Save.save(true)'); page.reload(); page.wait_for_selector('#app'); page.wait_for_timeout(300)
    check(S('G.S.season') >= N, 'التحميل بعد المواسم')
    for rt in ['market', 'inbox', 'home', 'profile']:
        S("G.UI.cur='%s'; G.UI.sub={}; G.UI.render()" % rt); nohs(page, 'بعد التحميل ' + rt); overflow(page, rt)
    check(not errors, 'أخطاء JS: %s' % errors[:3])
    b.close()
finish()
