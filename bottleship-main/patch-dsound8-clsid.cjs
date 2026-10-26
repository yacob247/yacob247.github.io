// Make CoCreateInstance(CLSID_DirectSound8 {3901cc3f-84b5-4fa4-ba35-aa8172b8a09b}) work.
// The worker already routes CLSID_DirectSound (47d4d946-...) to its DirectSoundCreate/DirectSoundCreate8
// implementation, but not CLSID_DirectSound8, so eax.dll's request failed with "CLSID/IID not found".
// Usage: node patch-dsound8-clsid.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-dsound8-clsid.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('3901cc3f-84b5-4fa4-ba35-aa8172b8a09b`')) { console.log('already patched'); process.exit(0); }
const anchor = 'else if(i===`47d4d946-62e8-11cf-93bc-444553540000`){';
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('not applied: anchor found ' + n + 'x (expected 1)'); process.exit(1); }
const repl = 'else if(i===`47d4d946-62e8-11cf-93bc-444553540000`||i===`3901cc3f-84b5-4fa4-ba35-aa8172b8a09b`){';
fs.writeFileSync(file, s.replace(anchor, () => repl));
console.log('patched 1 of 1');
