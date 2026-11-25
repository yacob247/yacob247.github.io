// Logs the calls that usually explain a D3DCompile "out of memory / aborted unexpectedly" failure:
//   - RaiseException / _CxxThrowException / abort / terminate etc. (with the exception code)
//   - very large allocation requests (>= 32 MB) from HeapAlloc/VirtualAlloc/malloc/etc.
// Lines look like:  [BS-DIAG] kernel32:RaiseException args=0xc0000017,... ret=0x...
// Usage: node patch-compile-diag.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-compile-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('__bsCompDiag')) { console.log('already patched'); process.exit(0); }
const anchor = 'this.recordWinApiCall(i,e,o,l),this.checkEspSanity(o,i),';
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('not applied: anchor found ' + n + 'x (expected 1)'); process.exit(1); }
const inject =
'(()=>{/*__bsCompDiag*/try{let __dv=this.cachedDataView;if(!__dv||o<=0||o+20>this.memLength)return;' +
'let __a=k=>__dv.getUint32(o+4+4*k,!0)>>>0,__h=v=>"0x"+v.toString(16);' +
'let __re=this.__bsRe||(this.__bsRe=/RaiseException|CxxThrow|_purecall|:abort$|_amsg_exit|RtlUnwind|terminate|_invalid_parameter|_set_se_translator/i);' +
'if(__re.test(i)){N.warn(M.THUNK,"[BS-DIAG] "+i+" args="+__h(__a(0))+","+__h(__a(1))+","+__h(__a(2))+","+__h(__a(3))+" ret="+__h(__dv.getUint32(o,!0)>>>0));return}' +
'let __nm=i.split(":").pop(),__m=this.__bsAllocArg||(this.__bsAllocArg={HeapAlloc:2,HeapReAlloc:3,VirtualAlloc:1,malloc:0,realloc:1,LocalAlloc:1,GlobalAlloc:1,_malloc_crt:0,HeapCreate:1,calloc:-1});' +
'let __k=__m[__nm];if(__k===void 0)return;let __sz=__k<0?__a(0)*__a(1):__a(__k);' +
'if(__sz>=33554432)N.warn(M.THUNK,"[BS-DIAG] big alloc request: "+i+" size="+__h(__sz)+" ("+Math.round(__sz/1048576)+" MB) ret="+__h(__dv.getUint32(o,!0)>>>0))' +
'}catch(__e){}})(),';
fs.writeFileSync(file, s.replace(anchor, () => inject + anchor));
console.log('patched 1 of 1');
