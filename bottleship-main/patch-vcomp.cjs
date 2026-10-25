const fs=require('fs');const p=process.argv[2];let s=fs.readFileSync(p,'utf8');
const reps=[
 ['let f=!r.callingConvention||r.callingConvention===`stdcall`,p=','let f=(!r.callingConvention||r.callingConvention===`stdcall`)&&!/^vcomp/i.test(e),p='],
 ['s=!r||r===`stdcall`,c=this.resolveBytesToPop(t,s,n,i)','s=(!r||r===`stdcall`)&&!/^vcomp/i.test(e),c=this.resolveBytesToPop(t,s,n,i)'],
 ['s=!i||i===`stdcall`,c=this.resolveBytesToPop(n,s,r,a)','s=(!i||i===`stdcall`)&&!/^vcomp/i.test(t),c=this.resolveBytesToPop(n,s,r,a)'],
 ['o=!i||i===`stdcall`,s=this.resolveBytesToPop(n,o,r,a)','o=(!i||i===`stdcall`)&&!/^vcomp/i.test(t.dllName),s=this.resolveBytesToPop(n,o,r,a)'],
];
let n=0;for(const [a,b] of reps){const c=s.split(a).length-1;console.log(c,'x',a.slice(0,45));if(c>=1){s=s.split(a).join(b);n+=c}}
if(!n)throw 'nothing patched (already patched?)';fs.writeFileSync(p,s);console.log('patched',n);
