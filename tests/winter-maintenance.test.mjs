import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: () => load('../src/utils/saisonZeitraum.ts'), Date });
  return exports;
}
const api = load('../src/utils/winterMaintenance.ts');
function storage(seed) { const map = new Map(Object.entries(seed)); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k), map }; }
test('Season boundaries retain other dates and invalid timestamps', () => {
  const logs = ['2026-10-31','2026-11-01','2027-03-31','2027-04-01'].map((d,id) => ({ id, timestamp: new Date(d+'T12:00:00').getTime() }));
  logs.push({ id: 4, timestamp: NaN });
  const result = api.teileWinterSaison(logs,'2026-11-01','2027-03-31');
  assert.deepEqual(Array.from(result.saison, x => x.id), [1,2]);
  assert.deepEqual(Array.from(result.verbleibend, x => x.id), [0,3,4]);
  assert.throws(() => api.teileWinterSaison(logs,'2027-04-01','2026-11-01'));
});
test('Cleanup and undo preserve customers, properties and unrelated storage byte for byte', () => {
  const seed = { becdra_kunden:'[{"id":1}]', becdra_liegenschaften:'[{"id":2}]', garden:'unchanged', becdra_lager_bestaende:'{"Salz":15}', becdra_material_preise:'{"Salz":5}', becdra_history:'[{"id":3}]', becdra_saison_archiv:'[{"id":4}]', becdra_active_objekt:'{"id":2}' };
  const s=storage(seed); api.bereinigeWinterTestdaten(s);
  for (const k of ['becdra_kunden','becdra_liegenschaften','garden','becdra_lager_bestaende','becdra_material_preise']) assert.equal(s.getItem(k),seed[k]);
  assert.equal(s.getItem('becdra_history'),'[]'); assert.equal(s.getItem('becdra_active_objekt'),null);
  assert.throws(() => api.bereinigeWinterTestdaten(s));
  api.stelleWinterTestdatenWiederHer(s); assert.deepEqual(Object.fromEntries(s.map),seed);
});
test('Failed checkpoint aborts before cleanup', () => {
  const s=storage({becdra_history:'history'}); s.setItem=()=>{throw new Error('QuotaExceededError')};
  assert.throws(() => api.bereinigeWinterTestdaten(s)); assert.equal(s.getItem('becdra_history'),'history');
});
test('Failure during cleanup rolls back and retains checkpoint', () => {
  const s=storage({becdra_history:'history',becdra_saison_archiv:'archive'}); const set=s.setItem; let failed=false;
  s.setItem=(k,v)=>{if(k==='becdra_saison_archiv' && !failed){failed=true;throw new Error('unavailable')}set(k,v)};
  assert.throws(()=>api.bereinigeWinterTestdaten(s)); assert.equal(s.getItem('becdra_history'),'history'); assert.equal(s.getItem('becdra_saison_archiv'),'archive'); assert.ok(s.getItem(api.WINTER_CHECKPOINT));
});
