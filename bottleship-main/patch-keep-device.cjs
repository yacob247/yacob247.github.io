// WORKAROUND (not a root-cause fix): never tear down the D3D9 device when its refcount hits 0.
// The game releases the device too early and then keeps using it; this lets it carry on.
// Run AFTER patch-device-diag.cjs (any refcount-diag patches are fine either way).
// Usage: node patch-keep-device.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-keep-device.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const a = 'f_(g,()=>{console.warn("[DIAG] D3D9 device DESTROYED';
const b = 'f_(g,()=>{if(!globalThis.__bsReallyDestroy){console.warn("[KEEP] ignored early device destroy 0x"+(g>>>0).toString(16));return}console.warn("[DIAG] D3D9 device DESTROYED';
const parts = s.split(a);
if (parts.length !== 2) { console.log('SKIP: anchor found ' + (parts.length - 1) + 'x (run patch-device-diag.cjs first?)'); process.exit(1); }
fs.writeFileSync(file, parts.join(b));
console.log('patched 1 of 1');
