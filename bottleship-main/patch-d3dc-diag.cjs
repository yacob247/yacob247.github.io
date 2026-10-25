// Usage: node patch-d3dc-diag.cjs assets/emulator.worker-CdVZe1Nf.js
// Logs [D3DC] inputs, HRESULT and the compiler's error text for D3DXCompileShader.
// Works on the original worker or one already patched with patch-dtr-diag.cjs.
const fs = require('fs');
const p = process.argv[2];
if (!p) { console.error('usage: node patch-d3dc-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
if (s.includes('[D3DC]')) { console.error('already patched'); process.exit(1); }
const edits = [
 [ "let[a,o,s,c,l,u,d,f,p,m]=r.map(e=>e>>>0);",
   "let[a,o,s,c,l,u,d,f,p,m]=r.map(e=>e>>>0);{let cs=(q,mx)=>{let z=``;if(!q)return`<null>`;for(let i=0;i<mx;i++){let b=L.readUint8(q+i);if(!b)break;z+=String.fromCharCode(b)}return z};console.warn(`[D3DC] D3DXCompileShader src=0x${a.toString(16)} len=${o} entry=\"${cs(l,64)}\" profile=\"${cs(u,16)}\" flags=0x${d.toString(16)} defines=0x${s.toString(16)} include=0x${c.toString(16)} outShader=0x${f.toString(16)} outErr=0x${p.toString(16)} outCT=0x${m.toString(16)}`);console.warn(`[D3DC] source head: ${cs(a,300).replace(/\\r?\\n/g,` | `)}`)}" ],
 [ "r=L.readUint32(g)??0,v=L.readUint32(_)??0;",
   "r=L.readUint32(g)??0,v=L.readUint32(_)??0;console.warn(`[D3DC] D3DCompile hr=0x${(n>>>0).toString(16)} code=0x${r.toString(16)} errBlob=0x${v.toString(16)}`);if(v){try{let bp=(yield{fn:c3(v,3),args:[v],tag:`D3DC:ErrPtr`})>>>0,bs=(yield{fn:c3(v,4),args:[v],tag:`D3DC:ErrSize`})>>>0,by=bp&&bs&&bs<65536?L.readBytes(bp,bs):null;console.warn(`[D3DC] compiler message: ${by?String.fromCharCode(...by):`<unreadable ptr=0x`+bp.toString(16)+` size=`+bs+`>`}`)}catch(x){console.warn(`[D3DC] message read failed: ${x}`)}}if(r&&!R6t(n)){try{let bs=(yield{fn:c3(r,4),args:[r],tag:`D3DC:CodeSize`})>>>0;console.warn(`[D3DC] bytecode size=${bs}`)}catch(x){}}" ],
];
let n = 0;
for (const [a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error('edit not applied, matches=' + c + ' for: ' + a.slice(0, 50)); continue; }
  s = s.replace(a, () => b); n++;
}
fs.writeFileSync(p, s);
console.log('patched ' + n + ' of ' + edits.length);
