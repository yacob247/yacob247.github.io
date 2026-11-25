// Usage: node patch-fpu-strict.cjs assets/emulator.worker-CdVZe1Nf.js
// Turns relaxed-FPU off by default so x87 runs in strict 80-bit mode (D3DCompiler_43 needs it).
const fs = require('fs');
const p = process.argv[2];
if (!p) { console.error('usage: node patch-fpu-strict.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
const a = 'relaxedFpuEnabled=!0;deadFlagElisionEnabled=!0;';
const b = 'relaxedFpuEnabled=!1;deadFlagElisionEnabled=!0;';
const c = s.split(a).length - 1;
if (c !== 1) { console.error('not applied, matches=' + c); process.exit(1); }
fs.writeFileSync(p, s.replace(a, () => b));
console.log('patched 1 of 1');
