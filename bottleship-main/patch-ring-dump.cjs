// When Microsoft's d3dcompiler (loaded at 0x24xxxxxx) calls _vsnprintf to build an error message,
// dump the last ~700 API calls (run-length compressed, oldest first) plus the format string.
// Also prints "[BS-DIAG] ring-dump patch active" once so you can tell the patch is deployed.
// Usage: node patch-ring-dump.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-ring-dump.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('__bsRingDump')) { console.log('already patched'); process.exit(0); }
const anchor = 'this.recordWinApiCall(i,e,o,l),this.checkEspSanity(o,i),';
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('not applied: anchor found ' + n + 'x (expected 1)'); process.exit(1); }
const inject =
'(()=>{/*__bsRingDump*/try{if(!this.__bsMark){this.__bsMark=1;N.warn(M.THUNK,"[BS-DIAG] ring-dump patch active")}' +
'if(i!=="msvcrt:_vsnprintf"||(this.__bsDumped|0)>=2)return;' +
'let __dv=this.cachedDataView;if(!__dv||o<=0||o+16>this.memLength)return;' +
'let __ra=__dv.getUint32(o,!0)>>>0;if(__ra<603979776||__ra>=620756992)return;' +
'this.__bsDumped=(this.__bsDumped|0)+1;' +
'let __f=__dv.getUint32(o+12,!0)>>>0,__fs="";' +
'if(this.cachedMem8&&__f>0&&__f+160<this.cachedMem8.length){for(let q=0;q<160;q++){let c=this.cachedMem8[__f+q];if(!c)break;__fs+=String.fromCharCode(c)}}' +
'let __r=this.winApiRing,__n=Math.min(__r.count,700),__out=[],__last=null,__cnt=0,__first=0;' +
'let __fl=()=>{if(__last!==null)__out.push(__last+(__cnt>1?" x"+__cnt:"")+"(a0=0x"+__first.toString(16)+")")};' +
'for(let k=__n;k>=1;k--){let ix=(__r.index-k+__r.size)%__r.size,nm=__r.names[__r.ids[ix]]||"id_"+__r.ids[ix];' +
'if(nm===__last){__cnt++}else{__fl();__last=nm;__cnt=1;__first=__r.arg0s[ix]>>>0}}__fl();' +
'N.warn(M.THUNK,"[BS-DIAG] _vsnprintf from compiler ret=0x"+__ra.toString(16)+" fmt="+JSON.stringify(__fs)+"; last "+__n+" calls, "+__out.length+" runs, oldest first:");' +
'for(let k=0;k<__out.length;k+=40)N.warn(M.THUNK,"[BS-DIAG] ring "+(k/40|0)+": "+__out.slice(k,k+40).join(" | "))' +
'}catch(__e){}})(),';
fs.writeFileSync(file, s.replace(anchor, () => inject + anchor));
console.log('patched 1 of 1');
