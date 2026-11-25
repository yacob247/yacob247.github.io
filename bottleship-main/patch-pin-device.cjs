// WORKAROUND: the game calls IDirect3DDevice9::Release 300+ times in a loop from one spot
// (guest 0x749587) against only ~23 references, so the device dies and CreateTexture then fails.
// This pins the device: its refcount never drops below 1, but the game is told it reached 0.
// Needs patch-refcount-diag.cjs applied first (it defines globalThis.__bsDev).
// Do NOT also apply patch-keep-device.cjs.
// Usage: node patch-pin-device.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-pin-device.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const a = 'function PDt(e,t){let n=t>>>0;if(!n)return 0;';
const b = a + 'if(n===globalThis.__bsDev){let k=c_(n);if(k!==void 0){l_(n);if(k<=2){let c=globalThis.__bsPin=(globalThis.__bsPin||0)+1;(c===1||c===10||c===100||c===1000||c===10000||c===100000)&&console.warn("[PIN] pinned device release #"+c+" (game released past its last reference)");return 0}}}';
const parts = s.split(a);
if (parts.length !== 2) { console.log('SKIP: anchor found ' + (parts.length - 1) + 'x'); process.exit(1); }
if (!s.includes('globalThis.__bsDev=')) { console.log('WARNING: run patch-refcount-diag.cjs first (no __bsDev found)'); process.exit(1); }
fs.writeFileSync(file, parts.join(b));
console.log('patched 1 of 1');
