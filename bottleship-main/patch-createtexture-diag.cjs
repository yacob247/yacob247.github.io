// Adds diagnostics to the D3D9 CreateTexture handler in the emulator worker.
// Every INVALIDCALL path now records a reason via og(), which prints a one-time
// console warning: "[D3D9] refused to create texture:INVALID:<reason> ..."
// Usage: node patch-createtexture-diag.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-createtexture-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');

const edits = [
  [
    'if(!h||(Ph(h),!sJ(m>>>0))||!kDe(f>>>0,m>>>0)||p===0||lg(p,9))return t;if(cg(p,9))return og(`texture:unsupportedFormat`',
    'if(!h||(Ph(h),!sJ(m>>>0))||!kDe(f>>>0,m>>>0)||p===0||lg(p,9))return og(`texture:INVALID:${!h?"nullPP":!sJ(m>>>0)?"badPool"+(m>>>0):!kDe(f>>>0,m>>>0)?"usage0x"+(f>>>0).toString(16)+"+pool"+(m>>>0):p===0?"formatUNKNOWN":"formatBlocked"}`,p,c>>>0,l>>>0),t;if(cg(p,9))return og(`texture:unsupportedFormat`'
  ],
  [
    'if(b===null)return t;let x=b,S=Fh(p,m),C=0;',
    'if(b===null)return og(`texture:INVALID:levels${d>>>0}`,p,c>>>0,l>>>0),t;let x=b,S=Fh(p,m),C=0;'
  ],
  [
    '_.createTexture(T,v,y,x,p,f>>>0,S,C)===0||(',
    '(_.createTexture(T,v,y,x,p,f>>>0,S,C)===0?(og(`texture:INVALID:renderCreateFailed`,p,v,y),!0):!1)||('
  ]
];

let n = 0;
for (const [a, b] of edits) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('SKIP (found ' + (parts.length - 1) + 'x):', a.slice(0, 60) + '...'); continue; }
  s = parts.join(b); n++;
  console.log('1 x', a.slice(0, 60) + '...');
}
if (n) fs.writeFileSync(file, s);
console.log('patched', n, 'of', edits.length);
