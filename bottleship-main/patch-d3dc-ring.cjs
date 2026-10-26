// Usage (from bottleship-main): node patch-d3dc-ring.cjs assets/emulator.worker-<current>.js
// Prints [BS-DIAG2] lines with console.warn (not the N logger) at two places that are known to run:
//   1. when D3DXCompileShader starts  -> ESP + 16 stack dwords
//   2. when D3DCompile returns        -> ESP + 32 stack dwords + the last 150 API calls
// Compare the two stack dumps: if the dword at the thunk's return slot changed, that's the corruption.
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-d3dc-ring.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('BS-DIAG2')) { console.log('already patched'); process.exit(0); }

const helper = '(__t=>{try{let d=self.__bsDisp;if(!d){console.warn("[BS-DIAG2] "+__t+": no dispatcher");return}' +
 'let esp=d.regsRaw[4]>>>0,dv=d.cachedDataView,w=[];' +
 'if(dv&&esp>0&&esp+160<d.memLength)for(let i=0;i<40;i++)w.push(dv.getUint32(esp+i*4,!0).toString(16));' +
 'console.warn("[BS-DIAG2] "+__t+" ESP=0x"+esp.toString(16)+" EIP=0x"+((d.cachedIpRaw?d.cachedIpRaw[0]:0)>>>0).toString(16)+" stack="+w.join(","));' +
 'if(__t==="D3DCompile returned"){let c=d.getLastWinApiCalls(150);console.warn("[BS-DIAG2] last 150 API calls: "+(Array.isArray(c)?c.join(" | "):String(c)))}' +
 '}catch(e){console.warn("[BS-DIAG2] dump failed: "+e)}})';

const edits = [
  ['winApiRing=new QKe(this.namesTable);', 'winApiRing=new QKe(this.namesTable);__bsReg=(self.__bsDisp=this,0);'],
  ['{let cs=(q,mx)=>{let z=``;if(!q)return`<null>`;', '{' + helper + '("D3DXCompileShader start");let cs=(q,mx)=>{let z=``;if(!q)return`<null>`;'],
  ['console.warn(`[D3DC] D3DCompile hr=', helper + '("D3DCompile returned");console.warn(`[D3DC] D3DCompile hr='],
];
let n = 0;
for (const [a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error('edit NOT applied (matches=' + c + '): ' + a.slice(0, 60)); continue; }
  s = s.replace(a, () => b); n++;
}
if (n !== edits.length) { console.error('aborting, nothing written'); process.exit(1); }
fs.writeFileSync(file, s);
console.log('patched ' + n + ' of ' + edits.length + '. Look for [BS-DIAG2] in the console.');
