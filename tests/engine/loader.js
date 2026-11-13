/* محمّل المحرك بلا متصفح: يقرأ ترتيب السكربتات من index.html ويحمّل ملفات المنطق فقط (بلا ui_* ولا audio ولا main).
   يوفّر window/localStorage بسيطة. الاستخدام: const G = require('./loader').load(); */
const fs = require('fs'), path = require('path'), vm = require('vm');
let ROOT = process.env.FC_ROOT || path.resolve(__dirname, '..', '..');
if (!fs.existsSync(path.join(ROOT, 'index.html')) && fs.existsSync(path.join(ROOT, 'www', 'index.html'))) ROOT = path.join(ROOT, 'www'); // داخل المستودع: ملفات اللعبة في www/

function load(opts) {
  opts = opts || {};
  const mem = {};
  const ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const g = globalThis;
  g.window = g; g.localStorage = ls; g.G = undefined;
  if (g.document) delete g.document;
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((f) => !/\/(ui_|audio|main)/.test('/' + f));
  files.forEach((f) => { vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); });
  return { G: g.G, files, mem };
}
module.exports = { load, ROOT };
