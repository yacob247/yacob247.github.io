// Usage: node patch-dtr-diag.cjs assets/emulator.worker-CdVZe1Nf.js
// Adds [DTR] diagnostics to the direct-thunk callback return path.
const fs = require('fs');
const p = process.argv[2];
if (!p) { console.error('usage: node patch-dtr-diag.cjs <worker.js>'); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');

const edits = [
  [
    String.raw`_=()=>o.process===s&&s?.resetGeneration===c&&s?.dispatcher?.callbackManager===u&&!o.isExiting&&o.scheduler.getCurrentThreadId()===l,`,
    String.raw`_=()=>{let k=o.process===s&&s?.resetGeneration===c&&s?.dispatcher?.callbackManager===u&&!o.isExiting&&o.scheduler.getCurrentThreadId()===l;return k||console.warn("[DTR] context check FAILED in "+i+": sameProcess="+(o.process===s)+" resetGen="+(s?.resetGeneration===c)+" sameCbMgr="+(s?.dispatcher?.callbackManager===u)+" exiting="+o.isExiting+" thread="+o.scheduler.getCurrentThreadId()+" expected="+l),k},`,
  ],
  [
    String.raw`s=n.directThunkReturn.complete?.(l);if(s===null){this.releaseCallback(e,t);return}`,
    String.raw`s=n.directThunkReturn.complete?.(l);console.warn("[DTR] callback return src="+(n.source??"?")+" value=0x"+(l>>>0).toString(16)+" returnAddr=0x"+a.toString(16)+" postEsp=0x"+o.toString(16)+" -> "+(s===null?"null (released, nested call or cancelled)":s===void 0?"undefined":"0x"+(s>>>0).toString(16)));if(s===null){this.releaseCallback(e,t);return}`,
  ],
];

let n = 0;
for (const [a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error('edit not applied, matches=' + c); continue; }
  s = s.replace(a, () => b);
  n++;
}
fs.writeFileSync(p, s);
console.log('patched ' + n + ' of ' + edits.length);
