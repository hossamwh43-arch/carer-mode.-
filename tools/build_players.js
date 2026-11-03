#!/usr/bin/env node
/* build_players.js — يحوّل ملفات النصوص tools/rosters/*.txt إلى js/data_players.js (تشكيلات حقيقية تقديرية).
 * التشغيل:  node tools/build_players.js            (يكتب js/data_players.js ويطبع تقريرًا)
 *           node tools/build_players.js --dups     (يطبع التكرارات فقط)
 * صيغة السطر:  id|اسم,المركز,الجنسية,سنةالميلاد,التقييم;...   أو الصيغة المختصرة  اسم,المركز,الجنسية
 * المركز المختصر GK/DF/MF/FW يُوزَّع على مراكز اللعبة بالتناوب. التكرار بين الأندية: يُبقى اللاعب في النادي الأعلى درجة
 * (أو بحسب dedup.json). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = fs.existsSync(path.join(__dirname, '..', 'www', 'js')) ? path.join(__dirname, '..', 'www') : path.join(__dirname, '..'), SRC = path.join(__dirname, 'rosters');
const clubsByLeague = JSON.parse(fs.readFileSync(path.join(SRC, 'clubs.json'), 'utf8'));
const dedupFile = path.join(__dirname, 'dedup.json');
const KEEP = fs.existsSync(dedupFile) ? JSON.parse(fs.readFileSync(dedupFile, 'utf8')) : {}; // { "اسم لاعب مطبَّع": "clubId" | "-" (حذف من الكل) }
const PRIO = { ESP1: 0, ENG1: 0, ITA1: 0, GER1: 0, FRA1: 0, OUT: 1, ESP2: 2, ENG2: 2, ITA2: 2, GER2: 2, FRA2: 2 };
const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const CYC = { DF: ['CB', 'RB', 'CB', 'LB', 'CB'], MF: ['CM', 'CDM', 'CAM', 'CM', 'CDM'], FW: ['ST', 'LW', 'RW', 'ST'] };
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ø]/gi, 'o').replace(/[ł]/gi, 'l').replace(/[đ]/gi, 'd').replace(/[ß]/g, 'ss').replace(/[^a-z0-9 ]/gi, '').toLowerCase().replace(/\s+/g, ' ').trim();

const clubs = {}; const errors = [];
Object.keys(clubsByLeague).forEach((lg) => {
  const lines = fs.readFileSync(path.join(SRC, lg + '.txt'), 'utf8').split('\n').filter((l) => l.trim());
  const meta = {}; clubsByLeague[lg].forEach((c) => { meta[c.id] = c; });
  lines.forEach((ln) => {
    const i = ln.indexOf('|'), id = ln.slice(0, i); if (!meta[id]) { errors.push('نادٍ غير معروف ' + lg + ':' + id); return; }
    const cyc = { DF: 0, MF: 0, FW: 0 }, list = [];
    ln.slice(i + 1).split(';').forEach((ent) => {
      const f = ent.split(',').map((x) => x.trim()); if (f.length < 3 || !f[0]) { errors.push('إدخال معطوب ' + id + ': ' + ent); return; }
      let pos = f[1]; const nat = f[2].toUpperCase(), yr = f[3] ? +f[3] : 0, r = f[4] ? +f[4] : 0;
      if (CYC[pos]) { pos = CYC[pos][cyc[pos]++ % CYC[pos].length]; }
      if (POS.indexOf(pos) < 0) { errors.push('مركز غير صالح ' + id + ': ' + ent); return; }
      if (!/^[A-Z]{2}$/.test(nat)) { errors.push('رمز جنسية غير صالح ' + id + ': ' + ent); return; }
      if (yr && (yr < 1975 || yr > 2007)) { errors.push('سنة ميلاد غير منطقية ' + id + ': ' + ent); return; }
      if (r && (r < 40 || r > 95)) { errors.push('تقييم غير منطقي ' + id + ': ' + ent); return; }
      list.push({ n: f[0], pos, nat, yr, r });
    });
    clubs[id] = { lg, prio: PRIO[lg], rep: meta[id].rep, name: meta[id].name, list };
  });
});

// ——— التكرار بين الأندية ———
// الهوية = الاسم المطبَّع + الجنسية. القائمة both: أسماء مشتركة بين لاعبين مختلفين (تبقى في الجميع). الأندية unverified (مصدرها الذاكرة) تخسر دائمًا.
const BOTH = (KEEP.both || []), UNV = (KEEP.unverified || []), KEEPM = KEEP.keep || {};
const seen = {};
Object.keys(clubs).forEach((id) => clubs[id].list.forEach((p) => { const k = norm(p.n) + '|' + p.nat; (seen[k] = seen[k] || []).push({ id, p }); }));
const dups = Object.keys(seen).filter((k) => seen[k].length > 1 && BOTH.indexOf(k.split('|')[0]) < 0);
let removed = 0; const report = [];
dups.forEach((k) => {
  const arr = seen[k]; let keep = null;
  if (KEEPM[k]) keep = arr.find((x) => x.id === KEEPM[k]) || null;
  if (!keep) {
    keep = arr.slice().sort((a, b) => (UNV.indexOf(a.id) >= 0) - (UNV.indexOf(b.id) >= 0) || clubs[a.id].prio - clubs[b.id].prio || clubs[b.id].rep - clubs[a.id].rep)[0];
  }
  report.push(k + ' ← ' + arr.map((x) => x.id + (x === keep ? '*' : '')).join(' '));
  arr.forEach((x) => { if (x !== keep) { const c = clubs[x.id]; c.list.splice(c.list.indexOf(x.p), 1); removed++; } });
});
if (process.argv.includes('--dups')) { console.log(report.join('\n')); console.log('تكرارات:', dups.length, 'محذوف:', removed); process.exit(0); }

// ——— الإخراج ———
const extra = {}; // رموز الجنسيات
const out = {}; let total = 0;
Object.keys(clubs).forEach((id) => {
  const c = clubs[id]; total += c.list.length;
  out[id] = c.list.map((p) => [p.n, p.pos, p.nat, p.yr, p.r].join(',')).join(';');
  c.list.forEach((p) => { extra[p.nat] = (extra[p.nat] || 0) + 1; });
});
const natNames = fs.existsSync(path.join(__dirname, 'nat_names.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'nat_names.json'), 'utf8')) : {};
let js = '/* data_players.js — تشكيلات حقيقية (أسماء لاعبين حقيقيين) للأندية الـ' + Object.keys(out).length + '. مُولَّد آليًا بـ tools/build_players.js من tools/rosters/*.txt — لا تعدّله يدويًا.\n' +
  ' * الصيغة: id ← «اسم,المركز,الجنسية,سنةالميلاد,التقييم;…» (سنة الميلاد أو التقييم 0 = غير معروف). التقييمات والمراكز وسنوات الميلاد تقديرية، والأسماء من صفحات ويكيبيديا (2026) وقد يكون بعضها قديمًا.\n' +
  ' * الأسماء غير مرخّصة (ليست من شركة كرة قدم) — اللعبة للاستخدام الشخصي وليست لنشرها في المتاجر. */\n(function (G) {\n  \'use strict\';\n  G.REAL_SQUADS = {\n';
js += Object.keys(out).map((id) => '    ' + id + ': ' + JSON.stringify(out[id])).join(',\n') + '\n  };\n';
js += '  // أسماء عربية لرموز الجنسيات التي لا توجد في جدول المنتخبات الـ112 (للعرض فقط)\n  G.NAT_EXTRA = ' + JSON.stringify(natNames, null, 0).replace(/","/g, '", "') + ';\n})(window.G = window.G || {});\n';
fs.writeFileSync(path.join(ROOT, 'js', 'data_players.js'), js);
console.log('أندية:', Object.keys(out).length, '| لاعبون:', total, '| تكرارات معالجة:', dups.length, '(محذوف', removed + ')', '| أخطاء:', errors.length);
errors.forEach((e) => console.log('  ✗', e));
const nm = JSON.parse(JSON.stringify(require('./nations_in_game.json')));
const missing = Object.keys(extra).filter((c) => nm.indexOf(c) < 0 && !natNames[c]);
console.log('رموز جنسيات بلا اسم عربي:', missing.length ? missing.sort().join(' ') : 'لا شيء');
console.log('عدد الرموز الإضافية:', Object.keys(extra).filter((c) => nm.indexOf(c) < 0).length);
