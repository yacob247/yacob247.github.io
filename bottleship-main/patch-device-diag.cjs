// Run AFTER the two createtexture patches. Logs the D3D9 device lifecycle to the
// Console so we can see whether the device pointer was destroyed before CreateTexture.
// Look for lines starting with "[DIAG]" in the Console.
// Usage: node patch-device-diag.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-device-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const hex = 'x=>"0x"+(x>>>0).toString(16)';
const edits = [
  ['U.set(g,m),wEt(m,g),',
   'U.set(g,m),console.warn("[DIAG] D3D9 device created 0x"+(g>>>0).toString(16)),wEt(m,g),'],
  ['f_(g,()=>{m.releaseComBindings(),QEt(g),',
   'f_(g,()=>{console.warn("[DIAG] D3D9 device DESTROYED 0x"+(g>>>0).toString(16)+" | "+new Error().stack),m.releaseComBindings(),QEt(g),'],
  ['CreateTexture: invalid device ${s}`),',
   'CreateTexture: invalid device ${s}`),console.warn("[DIAG] CreateTexture this=0x"+(s>>>0).toString(16)+" knownDevices="+[...U.entries()].map(e=>"0x"+(e[0]>>>0).toString(16)).join(",")),']
];
let n = 0;
for (const [a, b] of edits) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('SKIP (found ' + (parts.length - 1) + 'x):', a.slice(0, 60) + '...'); continue; }
  s = parts.join(b); n++; console.log('1 x', a.slice(0, 60) + '...');
}
if (n) fs.writeFileSync(file, s);
console.log('patched', n, 'of', edits.length);
