// Usage (from bottleship-main): node patch-alloc-visible.cjs assets/emulator.worker-<current>.js
// The worker ALREADY logs "VirtualAlloc FAIL ..." and "HeapAlloc (fast path) refused ..." through its N.warn logger,
// but nothing from that logger has ever shown up in your console. This switches those two messages to console.warn
// (prefixed [BS-ALLOC]) so they can't be hidden. Nothing else changes.
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-alloc-visible.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('[BS-ALLOC]')) { console.log('already patched'); process.exit(0); }
const edits = [
  ['N.warn(M.KERNEL32,`VirtualAlloc FAIL ', 'console.warn(`[BS-ALLOC] VirtualAlloc FAIL '],
  ['N.warn(M.KERNEL32,`HeapAlloc (fast path) refused ', 'console.warn(`[BS-ALLOC] HeapAlloc (fast path) refused '],
];
let n = 0;
for (const [a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error('edit NOT applied (matches=' + c + '): ' + a); continue; }
  s = s.replace(a, () => b); n++;
}
if (n !== edits.length) { console.error('aborting, nothing written'); process.exit(1); }
fs.writeFileSync(file, s);
console.log('patched ' + n + ' of ' + edits.length + '. Look for [BS-ALLOC] in the console.');
