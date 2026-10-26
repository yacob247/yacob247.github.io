// Gives the emulator worker a NEW filename so browsers/service workers can't serve a stale cached copy.
// Run from bottleship-main:  node bump-worker.cjs
// Then: git add -A && git commit -m "bump worker" && git push
const fs = require('fs'), path = require('path');
const dir = 'assets';
const old = fs.readdirSync(dir).filter(f => /^emulator\.worker-.*\.js$/.test(f));
if (old.length !== 1) { console.error('expected exactly 1 emulator.worker-*.js, found: ' + old.join(', ')); process.exit(1); }
const oldName = old[0];
const stamp = Date.now().toString(36);
const newName = 'emulator.worker-v' + stamp + '.js';
fs.renameSync(path.join(dir, oldName), path.join(dir, newName));
let refs = 0;
for (const f of fs.readdirSync(dir).filter(f => /^index-.*\.js$/.test(f))) {
  const p = path.join(dir, f);
  const s = fs.readFileSync(p, 'utf8');
  const n = s.split(oldName).length - 1;
  if (n) { fs.writeFileSync(p, s.split(oldName).join(newName)); refs += n; console.log(f + ': ' + n + ' reference(s) updated'); }
}
const w = fs.readFileSync(path.join(dir, newName), 'utf8');
console.log('renamed ' + oldName + ' -> ' + newName + ' (' + refs + ' refs)');
console.log('contains ring-dump patch: ' + w.includes('__bsRingDump'));
if (!refs) { console.error('WARNING: no index-*.js referenced the old name'); process.exit(1); }
