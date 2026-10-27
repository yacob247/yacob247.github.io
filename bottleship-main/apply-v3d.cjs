#!/usr/bin/env node
// BottleShip emulator patch v3d: loopback Winsock sockets + yielding select().
// Usage (from bottleship-main): node apply-v3d.cjs   (auto-finds assets/emulator.worker-*.js)
// Or: node apply-v3d.cjs <path/to/emulator.worker-XXXX.js> [output.js]
// Default output: patches the file in place and keeps a .bak copy. Safe to re-run (skips if already applied).
const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");
function findEmu() {
  const dirs = [path.join(__dirname, "assets"), path.join(process.cwd(), "assets"), __dirname, process.cwd()];
  for (const d of dirs) {
    try {
      const f = fs.readdirSync(d).filter(n => /^emulator\.worker-.*\.js$/.test(n));
      if (f.length) return path.join(d, f.sort().pop());
    } catch (e) {}
  }
  return null;
}
const src = process.argv[2] || findEmu();
if (!src) { console.error("emulator.worker-*.js not found. Run from bottleship-main (it looks in ./assets) or pass the path."); process.exit(1); }
console.log("target:", src);
const dst = process.argv[3] || src;
let s = fs.readFileSync(src, "utf8");
if (s.includes("function __LB(")) { console.log("already patched (v3d present), nothing to do"); process.exit(0); }
const LB = "function __LB(l,tbl,err){\nconst ports=new Map();let eph=49152;\nconst dv=m=>new DataView(m.buffer,m.byteOffset,m.byteLength);\nconst S=id=>tbl.sockets.get(id>>>0);\nconst key=(sk,port)=>(sk.type===2?\"2:\":\"1:\")+port;\nconst readAddr=(m,p)=>{if(!p)return null;const d=dv(m);return{port:((d.getUint8(p+2)<<8)|d.getUint8(p+3))>>>0}};\nconst writeAddr=(m,p,port)=>{const d=dv(m);d.setUint16(p,2,true);d.setUint8(p+2,(port>>8)&255);d.setUint8(p+3,port&255);d.setUint32(p+4,0x0100007f,true);for(let i=8;i<16;i++)d.setUint8(p+i,0)};\nconst bindTo=(id,sk,port)=>{if(!port){do{port=eph++;if(eph>65000)eph=49152}while(ports.has(key(sk,port)))}ports.set(key(sk,port),id>>>0);sk.port=port;return port};\nconst ensureBound=(id,sk)=>{if(!sk.port)bindTo(id,sk,0)};\nconst orr=tbl.reset.bind(tbl);tbl.reset=()=>{ports.clear();orr()};\nconst peerPort=aid=>{const as=S(aid);const ps=as&&S(as.peer);return ps&&ps.port||0};\nconst o={};\no.bind=(c,m,a)=>{const id=a[0]>>>0,sk=S(id);if(!sk){err(10038);return-1}if(sk.port){err(10022);return-1}const ad=readAddr(m,a[1]>>>0);const port=ad?ad.port:0;if(port&&ports.has(key(sk,port))&&ports.get(key(sk,port))!==id&&!sk.reuse){err(10048);return-1}bindTo(id,sk,port);err(0);return 0};\no.connect=(c,m,a)=>{const id=a[0]>>>0,sk=S(id);if(!sk){err(10038);return-1}const ad=readAddr(m,a[1]>>>0);if(!ad){err(10014);return-1}\nif(sk.type===2){ensureBound(id,sk);sk.peerPort=ad.port;sk.connected=true;err(0);return 0}\nconst lid=ports.get(\"1:\"+ad.port),ls=lid&&S(lid);if(!ls||!ls.listening){err(10061);return-1}\nensureBound(id,sk);const aid=tbl.socket(sk.type),as=S(aid);as.connected=true;as.peer=id;as.port=ls.port;as.rbuf=[];as.rlen=0;sk.peer=aid;sk.connected=true;sk.rbuf=[];sk.rlen=0;\n(ls.pend||(ls.pend=[])).push(aid);if(ls.accepts.length){const r=ls.accepts.shift();r(ls.pend.shift())}err(0);return 0};\no.accept=(c,m,a)=>{const id=a[0]>>>0,sk=S(id);if(!sk){err(10038);return-1}if(sk.type===2||sk.type===3){err(10045);return-1}if(!sk.listening){err(10022);return-1}\nconst fin=aid=>{const ap=a[1]>>>0;if(ap&&a[2]>>>0&&m){writeAddr(m,ap,peerPort(aid));dv(m).setInt32(a[2]>>>0,16,true)}err(0);return aid};\nif(sk.pend&&sk.pend.length)return fin(sk.pend.shift());\nif(sk.nonBlocking){err(10035);return-1}\nreturn new Promise(res=>sk.accepts.push(res)).then(v=>v===-1?(err(10004),-1):fin(v))};\nconst tx=(m,a,toPtr)=>{const id=a[0]>>>0,sk=S(id);if(!sk){err(10038);return-1}const buf=a[1]>>>0,len=a[2]>>>0;const data=m.slice(buf,buf+len);\nif(sk.type===2){let port;if(toPtr){const ad=readAddr(m,toPtr);if(!ad){err(10014);return-1}port=ad.port}else{if(!sk.connected){err(10057);return-1}port=sk.peerPort}\nensureBound(id,sk);const t=S(ports.get(\"2:\"+port));if(t)(t.q||(t.q=[])).push({d:data,from:sk.port});err(0);return len}\nif(!sk.connected){err(10057);return-1}const ps=S(sk.peer);if(!ps){err(10054);return-1}ps.rbuf.push(data);ps.rlen+=data.length;err(0);return len};\no.send=(c,m,a)=>tx(m,a,0);\no.sendto=(c,m,a)=>tx(m,a,a[4]>>>0);\nconst rx=(m,a,withFrom)=>{const id=a[0]>>>0,sk=S(id);if(!sk){err(10038);return-1}const buf=a[1]>>>0,len=a[2]>>>0,peek=((a[3]|0)&2)!==0;\nif(sk.type===2){const q=sk.q;if(!q||!q.length){err(10035);return-1}const p=peek?q[0]:q.shift();const n=Math.min(len,p.d.length);m.set(p.d.subarray(0,n),buf);\nif(withFrom&&a[4]>>>0){writeAddr(m,a[4]>>>0,p.from);if(a[5]>>>0)dv(m).setInt32(a[5]>>>0,16,true)}if(n<p.d.length){err(10040);return-1}err(0);return n}\nif(!sk.connected){err(10057);return-1}\nif(!sk.rlen){if(sk.eof||!S(sk.peer)){err(0);return 0}err(10035);return-1}\nlet n=0;while(n<len&&sk.rbuf.length){const ch=sk.rbuf[0],k=Math.min(len-n,ch.length);m.set(ch.subarray(0,k),buf+n);n+=k;if(peek)break;if(k===ch.length)sk.rbuf.shift();else sk.rbuf[0]=ch.subarray(k)}\nif(!peek)sk.rlen-=n;err(0);return n};\no.recv=(c,m,a)=>rx(m,a,false);\no.recvfrom=(c,m,a)=>rx(m,a,true);\nconst origClose=l.closesocket;\no.closesocket=(c,m,a)=>{const id=a[0]>>>0,sk=S(id);if(sk){if(sk.port&&ports.get(key(sk,sk.port))===id)ports.delete(key(sk,sk.port));const ps=sk.peer&&S(sk.peer);if(ps)ps.eof=true}return origClose(c,m,a)};\nconst origShut=l.shutdown;\no.shutdown=(c,m,a)=>{const sk=S(a[0]>>>0);if(sk&&((a[1]|0)===1||(a[1]|0)===2)){const ps=sk.peer&&S(sk.peer);if(ps)ps.eof=true}return origShut(c,m,a)};\no.getsockname=(c,m,a)=>{const sk=S(a[0]>>>0);if(!sk){err(10038);return-1}const p=a[1]>>>0;if(!p||!(a[2]>>>0)){err(10014);return-1}writeAddr(m,p,sk.port||0);dv(m).setInt32(a[2]>>>0,16,true);err(0);return 0};\no.getpeername=(c,m,a)=>{const sk=S(a[0]>>>0);if(!sk){err(10038);return-1}if(!sk.connected){err(10057);return-1}const p=a[1]>>>0;if(!p||!(a[2]>>>0)){err(10014);return-1}writeAddr(m,p,sk.type===2?(sk.peerPort||0):peerPort(sk.peer));dv(m).setInt32(a[2]>>>0,16,true);err(0);return 0};\nconst origIoctl=l.ioctlsocket;\no.ioctlsocket=(c,m,a)=>{if((a[1]>>>0)===1074030207){const sk=S(a[0]>>>0);if(!sk){err(10038);return-1}const n=sk.type===2?(sk.q&&sk.q.length?sk.q[0].d.length:0):(sk.rlen||0);if(a[2]>>>0)dv(m).setUint32(a[2]>>>0,n,true);err(0);return 0}return origIoctl(c,m,a)};\nconst origSso=l.setsockopt;\no.setsockopt=(c,m,a)=>{const sk=S(a[0]>>>0);if(sk&&(a[2]>>>0)===4)sk.reuse=true;return origSso(c,m,a)};\nconst readable=x=>{const sk=S(x);if(!sk)return false;if(sk.listening)return!!(sk.pend&&sk.pend.length);if(sk.type===2)return!!(sk.q&&sk.q.length);return!!(sk.rlen>0||sk.eof)};\nconst writable=x=>{const sk=S(x);if(!sk)return false;return sk.type===2?true:!!sk.connected};\no.__sel=(c,m,a)=>{const rp=a[1]>>>0,wp=a[2]>>>0,ep=a[3]>>>0;const R=d1(m,rp),W=d1(m,wp),E=d1(m,ep);for(const x of[...R,...W,...E])if(!tbl.isValid(x)){err(10038);return-1}\nconst rr=R.filter(readable),ww=W.filter(writable);if(!mGt(m,rp,rr)||!mGt(m,wp,ww)||!mGt(m,ep,[])){err(10014);return-1}err(0);return rr.length+ww.length};\nObject.assign(l,o);return l}\nfunction __SLP(P){return(e,t,n)=>{let r=P(e,t,n);if(r!==0)return r;try{let a=$.getInstance().scheduler,dv=new DataView(t.buffer,t.byteOffset,t.byteLength),o=dv.getUint32(e.esp,!0),s=e.esp+24;if(o<1048576||o>=2147483648)return r;let tp=n[4]>>>0,ms=10;if(tp){let sec=dv.getInt32(tp,!0),us=dv.getInt32(tp+4,!0);ms=Math.max(1,Math.min(sec*1e3+Math.ceil(us/1e3),20))}let l=a.sleepWithContext(ms,o,s,{ecx:e.ecx,edx:e.edx,ebx:e.ebx,ebp:e.ebp,esi:e.esi,edi:e.edi,eflags:e.eflags});return l===4294967294?{value:0,blockedNoSwitch:!0,stackCleanup:20}:0}catch(_){return r}}}\n";
function count(h, n) { return h.split(n).length - 1; }
function need(c, msg) { if (!c) { console.error("PATCH FAILED: " + msg); process.exit(2); } }
const anchor = "var kGt=class{name=`wsock32`";
need(count(s, anchor) === 1, "wsock32 class anchor not found exactly once");
let k = s.indexOf(anchor);
s = s.slice(0, k) + LB + s.slice(k);
k = s.indexOf(anchor);
// replace old select wrapper (if present) inside wsock32 class
const wsA = "this.exports.select=((P)=>";
const a = s.indexOf(wsA, k);
if (a !== -1) {
  const endTok = "})(p),";
  const b = s.indexOf(endTok, a);
  need(b !== -1, "select wrapper end not found");
  s = s.slice(0, a) + "this.exports.select=p," + s.slice(b + endTok.length);
}
const old1 = "l=DGt(this.socketTable,s),u=cGt(e,s)";
const i = s.indexOf(old1, k);   // first occurrence after wsock32 class start
need(i !== -1, "socket table anchor not found");
s = s.slice(0, i) + "l=__LB(DGt(this.socketTable,s),this.socketTable,s),u=cGt(e,s)" + s.slice(i + old1.length);
const old2 = "p=hGt(this.socketTable,s),m=gGt()";
need(count(s, old2) === 1, "select anchor not found exactly once");
s = s.replace(old2, "p=__SLP(l.__sel),m=gGt()");
s = s.replace(/\[D3D8-FIX v3[a-z]?(\+e)? active[^\]]*\]/, (m, e) => "[D3D8-FIX v3d" + (e || "") + " active: loopback sockets + select yields]");
// Syntax check. The emulator bundle is an ES module (uses import.meta), so check it as .mjs
// regardless of any package.json. Only fail if the ORIGINAL passes and the patched file does not.
const { spawnSync } = require("child_process");
function check(code, label) {
  const f = path.join(path.dirname(path.resolve(dst)), ".v3d-check-" + label + ".mjs");
  fs.writeFileSync(f, code);
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  try { fs.unlinkSync(f); } catch (e) {}
  if (r.status === 0) return null;
  const m = (r.stderr || "").match(/^.*\w*Error: .*$/m);
  return m ? m[0].slice(0, 300) : "unknown syntax error";
}
if (!process.argv.includes("--no-check")) {
  const before = check(fs.readFileSync(src, "utf8"), "orig");
  const after = check(s, "new");
  if (after && !before) { console.error("PATCH FAILED syntax check: " + after); process.exit(3); }
  if (after && before) console.warn("note: original also fails the syntax check (" + before + "); continuing");
}
const tmp = dst + ".tmp";
fs.writeFileSync(tmp, s);
if (dst === src) fs.copyFileSync(src, src + ".bak");
fs.renameSync(tmp, dst);
console.log("patched OK ->", dst);
