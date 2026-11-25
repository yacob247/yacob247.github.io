// Adds a detailed dump when guest execution escapes to the bootloader region (0x7c00-0x9000).
// Usage: node patch-bootescape-diag.cjs assets/emulator.worker-CdVZe1Nf.js
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-bootescape-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('__bsBootDiag')) { console.log('already patched'); process.exit(0); }
const anchor = 'N.error(M.SYSTEM,`?? FATAL: Execution escaped to bootloader region!`),';
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('not applied: anchor found ' + n + 'x (expected 1)'); process.exit(1); }
const inject =
'(()=>{/*__bsBootDiag*/try{let __r=e.getLastWinApiCallsRich?.(50)??[];' +
'for(let __x of __r)N.error(M.SYSTEM,"   [RECENT-API] "+(typeof __x==="string"?__x:JSON.stringify(__x)))}catch(__e){}' +
'try{let __h=e.getLastHypercalls?.(48)??[];for(let __x of __h)N.error(M.SYSTEM,"   [RECENT-HC] "+__x)}catch(__e){}' +
'try{let __sp=(i[4]>>>0);if(e.cachedMem8&&e.cachedDataView&&__sp>0&&__sp+256<=e.cachedMem8.length){' +
'for(let __k=-8;__k<56;__k++){let __v=e.cachedDataView.getUint32(__sp+__k*4,!0)>>>0;' +
'N.error(M.SYSTEM,"   [STACK] esp"+(__k<0?"":"+")+(__k*4)+" = 0x"+__v.toString(16))}}}catch(__e){}' +
'try{N.error(M.SYSTEM,"   [REGS] eax=0x"+(i[0]>>>0).toString(16)+" ecx=0x"+(i[1]>>>0).toString(16)+" edx=0x"+(i[2]>>>0).toString(16)+" ebx=0x"+(i[3]>>>0).toString(16)+" ebp=0x"+(i[5]>>>0).toString(16)+" esi=0x"+(i[6]>>>0).toString(16)+" edi=0x"+(i[7]>>>0).toString(16))}catch(__e){}})(),';
fs.writeFileSync(file, s.replace(anchor, () => anchor + inject));
console.log('patched 1 of 1');
