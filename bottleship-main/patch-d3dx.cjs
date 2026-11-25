const fs=require('fs');const p=process.argv[2];let s=fs.readFileSync(p,'utf8');
if(s.includes('t.D3DXGetShaderVersion=')){console.log('already patched');process.exit(0)}
const a='t.D3DXGetShaderConstantTable=(t,n,r)=>j6t(e,r[0]>>>0,r[1]>>>0),';
const c=s.split(a).length-1;console.log(c,'x anchor');
if(c!==1)throw 'anchor not found exactly once - build differs';
const add='t.D3DXGetShaderVersion=(t,n,r)=>{let a=r[0]>>>0;return a?(L.readUint32(a)??0)>>>0:0},';
fs.writeFileSync(p,s.replace(a,add+a));console.log('patched');
