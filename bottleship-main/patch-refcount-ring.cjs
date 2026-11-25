// Run AFTER patch-refcount-diag.cjs. Stops the [DIAG2] flood: keeps the last 80 device
// AddRef/Release events in memory and prints them ONCE as "[DIAG3]" when the count reaches 0.
// Usage: node patch-refcount-ring.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-refcount-ring.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const helper = 'globalThis.__bsRing=[],globalThis.__bsN=0,globalThis.__bsLog=m=>{let R=globalThis.__bsRing;R.push((++globalThis.__bsN)+" "+m);R.length>80&&R.shift();/Release -> (0|-)/.test(m)&&console.warn("[DIAG3] last "+R.length+" device refcount events (oldest first):\\n"+R.join("\\n"))},';
const edits = [
  ['globalThis.__bsDev=g>>>0,', 'globalThis.__bsDev=g>>>0,' + helper]
];
let n = 0;
for (const [a, b] of edits) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('SKIP (found ' + (parts.length - 1) + 'x):', a.slice(0, 60)); continue; }
  s = parts.join(b); n++;
}
const before = s.split('console.warn("[DIAG2] ').length - 1;
s = s.split('console.warn("[DIAG2] ').join('globalThis.__bsLog("');
console.log('redirected', before, 'DIAG2 log calls');
if (n || before) fs.writeFileSync(file, s);
console.log('patched', n, 'of', edits.length);
