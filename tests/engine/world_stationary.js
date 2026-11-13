/* اختبار انحدار «العالم الحي» (Node بلا متصفح، ~1 دقيقة): يلعب عدة مواسم على بذور مختلفة ويفشل إن:
   عاد تضخّم النجوم/انهيار المتوسط، أو عادت هيمنة نادٍ واحد، أو كُسرت ثابتة (تكرار/مرجع تالف/تشكيلة بحجم غير معقول)،
   أو تضخّم حجم الحفظ، أو ركد عدد الأحرار. الاستخدام: node tests/engine/world_stationary.js [مواسم=16] [بذور=3,4]  */
const { spawnSync } = require('child_process'), path = require('path');
const N = +(process.argv[2] || 16), SEEDS = (process.argv[3] || '3,4').split(',').map(Number);
const script = path.join(__dirname, 'world_health.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
SEEDS.forEach((seed) => {
  const r = spawnSync(process.execPath, [script, String(N), String(seed), '--json'], { encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
  if (r.status !== 0 && !r.stdout) { ok(false, 'تعذّر تشغيل المحاكاة: ' + r.stderr.slice(0, 200)); return; }
  const d = JSON.parse(r.stdout), R = d.rows;
  console.log('— بذرة ' + seed + ' (' + (R.length - 1) + ' مواسم)');
  const s0 = R[0], last = R.slice(-6);
  const mx = (k) => Math.max(...R.slice(1).map((x) => x[k])), mn = (k) => Math.min(...R.slice(1).map((x) => x[k]));
  ok(mx('s85') <= s0.s85 * 2.1, 'لا تضخّم نجوم ≥85: الأقصى ' + mx('s85') + ' مقابل البداية ' + s0.s85 + ' (الحد ' + Math.round(s0.s85 * 2.1) + ')');
  ok(mx('s90') <= Math.max(40, s0.s90 * 3), 'لا تضخّم نجوم ≥90: الأقصى ' + mx('s90') + ' مقابل ' + s0.s90);
  ok(mn('s85') >= s0.s85 * 0.4, 'لا انقراض للنجوم: الأدنى ' + mn('s85'));
  ok(mx('top100') <= s0.top100 + 3.5 && mn('top100') >= s0.top100 - 3.5, 'متوسط أفضل 100 مستقر (' + mn('top100').toFixed(1) + '–' + mx('top100').toFixed(1) + ' مقابل ' + s0.top100.toFixed(1) + ')');
  ok(mn('mean') >= s0.mean - 4.5 && mx('mean') <= s0.mean + 3, 'متوسط تقييم الدوريات مستقر (' + mn('mean').toFixed(1) + '–' + mx('mean').toFixed(1) + ' مقابل ' + s0.mean.toFixed(1) + ')');
  ok(mx('age') <= 30 && mn('age') >= 23.5, 'متوسط الأعمار منطقي (' + mn('age').toFixed(1) + '–' + mx('age').toFixed(1) + ')');
  ok(mx('free') <= 260, 'لا تراكم أحرار عالقين (الأقصى ' + mx('free') + ')');
  const sz = R.filter((x) => x.size).map((x) => x.size);
  ok(sz[sz.length - 1] <= sz[0] * 1.6 && sz[sz.length - 1] < 3.0e6, 'حجم الحفظ لا ينفجر (' + Math.round(sz[0] / 1e3) + 'K → ' + Math.round(sz[sz.length - 1] / 1e3) + 'K حرف)');
  ['ESP1', 'ENG1', 'ITA1', 'GER1', 'FRA1'].forEach((lg) => {
    const c = d.champs[lg] || {}, tot = Object.values(c).reduce((a, b) => a + b, 0), top = Math.max(0, ...Object.values(c)), k = Object.keys(c).length;
    ok(k >= 3 && top <= tot * 0.8, lg + ': أبطال مختلفون ' + k + '/' + tot + '، أكثر نادٍ ' + top + ' (لا هيمنة مطلقة)');
  });
  const lgs = R.filter((x) => x.lg).map((x) => x.lg);
  const gpm = lgs.map((m) => Object.values(m).reduce((a, x) => a + x.gpm * 2, 0) / Object.keys(m).length);
  const gAvg = gpm.reduce((a, b) => a + b, 0) / gpm.length;
  ok(gAvg > 2.3 && gAvg < 3.2, 'متوسط أهداف المباراة منطقي (' + gAvg.toFixed(2) + ')');
  const rho = lgs.map((m) => Object.values(m).reduce((a, x) => a + x.rho, 0) / Object.keys(m).length), rAvg = rho.reduce((a, b) => a + b, 0) / rho.length;
  ok(rAvg > 0.6 && rAvg < 0.93, 'ارتباط قوة الفريق بالترتيب منطقي — لا عشوائي ولا حتمي (' + rAvg.toFixed(2) + ')');
  ok(d.invariants.length === 0, 'الثوابت سليمة' + (d.invariants.length ? ': ' + d.invariants.slice(0, 3).join(' | ') : ''));
});
console.log('\nworld_stationary: ' + fails + ' فشل');
process.exit(fails ? 1 : 0);
