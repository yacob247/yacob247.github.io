// Run AFTER patch-createtexture-diag.cjs. Makes each CreateTexture failure return
// a distinct HRESULT so the reason shows up in the crash report's thunk list
// ("IDirect3DDevice9_CreateTexture ... -> 0x88760fNN").
//   01 null out-pointer   02 bad pool        03 usage/pool combo invalid
//   04 Format==0 (UNKNOWN) 05 format blocked  06 bad level count
//   07 render-worker create / mip init failed  08 shared-handle check failed
//   09 device not found
// Usage: node patch-createtexture-code.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-createtexture-code.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
const B = 2289438464; // 0x88760f00
const edits = [
  ['p===0?"formatUNKNOWN":"formatBlocked"}`,p,c>>>0,l>>>0),t;if(cg(p,9))',
   'p===0?"formatUNKNOWN":"formatBlocked"}`,p,c>>>0,l>>>0),'+B+'+(!h?1:!sJ(m>>>0)?2:!kDe(f>>>0,m>>>0)?3:p===0?4:5);if(cg(p,9))'],
  ['return og(`texture:INVALID:levels${d>>>0}`,p,c>>>0,l>>>0),t;let x=b',
   'return og(`texture:INVALID:levels${d>>>0}`,p,c>>>0,l>>>0),'+(B+6)+';let x=b'],
  ['!R(r,C,e.bytes,`rw`))return t}', '!R(r,C,e.bytes,`rw`))return '+(B+8)+'}'],
  ['`CreateTexture: invalid device ${s}`),t;', '`CreateTexture: invalid device ${s}`),'+(B+9)+';'],
  ['?(l_(T),Ph(h),t):L.writeUint32(h,T)?0:(l_(T),t)', '?(l_(T),Ph(h),'+(B+7)+'):L.writeUint32(h,T)?0:(l_(T),t)']
];
let n = 0;
for (const [a, b] of edits) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('SKIP (found ' + (parts.length - 1) + 'x):', a.slice(0, 60) + '...'); continue; }
  s = parts.join(b); n++; console.log('1 x', a.slice(0, 60) + '...');
}
if (n) fs.writeFileSync(file, s);
console.log('patched', n, 'of', edits.length);
