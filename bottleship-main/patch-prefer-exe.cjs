// Make BottleShip boot Game.exe instead of setup.exe when a .wgb's manifest points at an installer.
// Usage: node patch-prefer-exe.cjs assets/emulator.worker-CdVZe1Nf.js
//
// Behaviour (runs right after the .wgb is loaded + manifest override applied):
//   1. If the load URL has  #exe=Name.exe  (or ?exe=Name.exe) -> boot that exe (case-insensitive,
//      any folder inside the bundle; shallowest match wins). Example:
//        ?game=dev&load=https://.../mafia1.wgb#exe=Game.exe
//   2. Otherwise, if the manifest entrypoint is an installer-looking exe (setup / install / unins /
//      autorun) AND the bundle contains a Game.exe -> boot Game.exe instead.
//   3. Anything else is left untouched, so other games keep their normal entrypoint.
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node patch-prefer-exe.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');

if (s.includes('__bsPreferExe')) { console.log('already patched'); process.exit(0); }

const anchor = 'let i=gr(r.manifest);N.log(M.SYSTEM,`WGB: gameId=';
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('not applied: anchor found ' + n + 'x (expected 1)'); process.exit(1); }

const inject =
'{let __bsPreferExe=null;try{if(e.url){let __u=new URL(e.url,self.location.href);' +
'let __h=new URLSearchParams(__u.hash.replace(/^#/,"")).get("exe");' +
'__bsPreferExe=__h||__u.searchParams.get("exe")}}catch(__e){}' +
'let __base=x=>x.replace(/\\\\/g,"/").split("/").pop().toLowerCase();' +
'let __cur=__base(r.manifest.entrypoint||"");' +
'let __want=__bsPreferExe?__bsPreferExe.toLowerCase():"game.exe";' +
'let __installer=/^(setup|install|instal|unins|autorun)/i.test(__cur);' +
'if(__cur!==__want&&(__bsPreferExe||__installer)){' +
'let __hits=r.archive.listEntries().filter(x=>!x.isDirectory&&__base(x.name)===__want)' +
'.sort((a,b)=>a.name.split(/[\\\\/]/).length-b.name.split(/[\\\\/]/).length);' +
'if(__hits.length){let __old=r.manifest.entrypoint;r.manifest.entrypoint=__hits[0].name;' +
'r.entrypointBytes=await M9t(r.archive,__hits[0].name);' +
'N.log(M.SYSTEM,"[prefer-exe] entrypoint "+__old+" -> "+__hits[0].name+" ("+r.entrypointBytes.length+" bytes)")}' +
'else N.warn(M.SYSTEM,"[prefer-exe] "+__want+" not found in bundle; keeping "+r.manifest.entrypoint)}}';

fs.writeFileSync(file, s.replace(anchor, () => inject + anchor));
console.log('patched 1 of 1');
