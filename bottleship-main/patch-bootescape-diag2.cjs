// Second diagnostic pass. Apply AFTER patch-bootescape-diag.cjs.
// Usage: node patch-bootescape-diag2.cjs assets/emulator.worker-CdVZe1Nf.js
// On a bootloader escape it logs (each as ONE line, so log caps can't truncate it):
//   [STACK2]  64 stack words from the handler ESP
//   [CODE]    the code bytes just before each code-looking return address on the stack
//   [CODE-GWP] the code around 0x748cb8 (where GTA resumes after GetWindowPlacement)
//   [SCAN7C00] every place on the guest stack that holds the value 0x7c00
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-bootescape-diag2.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
if (s.includes('__bsBootDiag2')) { console.log('already patched'); process.exit(0); }
const anchor = '(()=>{/*__bsBootDiag*/';
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('not applied: anchor found ' + n + 'x (apply patch-bootescape-diag.cjs first)'); process.exit(1); }
const inject =
'(()=>{/*__bsBootDiag2*/try{let __m=e.cachedMem8,__dv=e.cachedDataView;if(!__m||!__dv)return;' +
'let __hx=(a,len)=>{let b=[];for(let j=0;j<len;j++){let p=a+j;b.push(p>=0&&p<__m.length?__m[p].toString(16).padStart(2,"0"):"??")}return b.join(" ")};' +
'let __sp=i[4]>>>0,__w=[];for(let k=0;k<64;k++){let a=__sp+k*4;if(a+4>__m.length)break;__w.push(__dv.getUint32(a,!0)>>>0)}' +
'N.error(M.SYSTEM,"   [STACK2] esp=0x"+__sp.toString(16)+" words: "+__w.map(x=>x.toString(16)).join(" "));' +
'N.error(M.SYSTEM,"   [REGS2] eax=0x"+(i[0]>>>0).toString(16)+" ecx=0x"+(i[1]>>>0).toString(16)+" edx=0x"+(i[2]>>>0).toString(16)+" ebx=0x"+(i[3]>>>0).toString(16)+" ebp=0x"+(i[5]>>>0).toString(16)+" esi=0x"+(i[6]>>>0).toString(16)+" edi=0x"+(i[7]>>>0).toString(16));' +
'let __seen=new Set(),__c=0;for(let x of __w){if(x>=4194304&&x<16777216&&!__seen.has(x)&&__c<12){__seen.add(x);__c++;N.error(M.SYSTEM,"   [CODE] bytes at 0x"+(x-40).toString(16)+" (ret addr 0x"+x.toString(16)+" is after the 40th byte): "+__hx(x-40,56))}}' +
'N.error(M.SYSTEM,"   [CODE-GWP] bytes at 0x748c90: "+__hx(0x748c90,96));' +
'let __b=(e.curStackBase>>>0)||(__sp-8192),__t=(e.curStackTop>>>0)||(__sp+8192),__h=[];' +
'if(__t>__m.length)__t=__m.length;for(let a=__b;a+4<=__t&&__h.length<32;a+=4)if(__dv.getUint32(a,!0)===31744)__h.push("0x"+a.toString(16));' +
'N.error(M.SYSTEM,"   [SCAN7C00] stack=[0x"+__b.toString(16)+",0x"+__t.toString(16)+") slots holding 0x7c00: "+(__h.join(" ")||"none"))' +
'}catch(__e){N.error(M.SYSTEM,"   [DIAG2-ERR] "+__e)}})(),';
fs.writeFileSync(file, s.replace(anchor, () => inject + anchor));
console.log('patched 1 of 1');
