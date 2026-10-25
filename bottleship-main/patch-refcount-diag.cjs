// Run AFTER patch-device-diag.cjs. Logs every AddRef/Release that touches the D3D9 device,
// with the resulting refcount, the JS call path, and the guest (game) return address.
// Look for lines starting with "[DIAG2]" in the Console.
// Usage: node patch-refcount-diag.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-refcount-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const ST = 'new Error().stack.split("\\n").slice(2,7).map(x=>x.trim().replace(/emulator\\.worker-[^:]*/,"w")).join(" < ")';
const edits = [
  // remember the device pointer
  ['U.set(g,m),console.warn("[DIAG] D3D9 device created 0x"+(g>>>0).toString(16)),',
   'U.set(g,m),globalThis.__bsDev=g>>>0,console.warn("[DIAG] D3D9 device created 0x"+(g>>>0).toString(16)),'],
  // internal AddRef (c_)
  ['let r=o_(t,n)+1;return s_(t,r),C_.size!==0&&xDe(t),r}function l_(e)',
   'let r=o_(t,n)+1;return t===globalThis.__bsDev&&console.warn("[DIAG2] dev AddRef -> "+r+" | "+' + ST + '),s_(t,r),C_.size!==0&&xDe(t),r}function l_(e)'],
  // internal Release (l_)
  ['let r=o_(t,n)-1;return r>0?(s_(t,r),C_.size!==0&&xDe(t),r):',
   'let r=o_(t,n)-1;return t===globalThis.__bsDev&&console.warn("[DIAG2] dev Release -> "+r+" | "+' + ST + '),r>0?(s_(t,r),C_.size!==0&&xDe(t),r):'],
  // guest-called AddRef
  ['e[`${t}_AddRef`]=(e,n,r)=>{let i=r[0];return N.verbose(',
   'e[`${t}_AddRef`]=(e,n,r)=>{let i=r[0];return (i>>>0)===globalThis.__bsDev&&console.warn("[DIAG2] GUEST AddRef via "+t+" ret=0x"+(L.readUint32(e.esp)>>>0).toString(16)),N.verbose('],
  // guest-called Release
  ['e[`${t}_Release`]=(e,n,r)=>{let i=r[0];return N.verbose(',
   'e[`${t}_Release`]=(e,n,r)=>{let i=r[0];return (i>>>0)===globalThis.__bsDev&&console.warn("[DIAG2] GUEST Release via "+t+" ret=0x"+(L.readUint32(e.esp)>>>0).toString(16)),N.verbose(']
];
let n = 0;
for (const [a, b] of edits) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('SKIP (found ' + (parts.length - 1) + 'x):', a.slice(0, 60) + '...'); continue; }
  s = parts.join(b); n++; console.log('1 x', a.slice(0, 60) + '...');
}
if (n) fs.writeFileSync(file, s);
console.log('patched', n, 'of', edits.length);
