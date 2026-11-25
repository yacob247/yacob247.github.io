#!/usr/bin/env node
// BottleShip patch v3e: stop heartbeat log spam so useful lines stay in the console.
// Run from bottleship-main:  node apply-v3e.cjs   (auto-finds assets/emulator.worker-*.js)
// Works with or without v3d applied. Safe to re-run. Keeps a .bak copy (first run only).
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
function findEmu() {
  for (const d of [path.join(__dirname, "assets"), path.join(process.cwd(), "assets"), __dirname, process.cwd()]) {
    try { const f = fs.readdirSync(d).filter(n => /^emulator\.worker-.*\.js$/.test(n)); if (f.length) return path.join(d, f.sort().pop()); } catch (e) {}
  }
  return null;
}
const src = process.argv[2] || findEmu();
if (!src) { console.error("emulator.worker-*.js not found. Run from bottleship-main or pass the path."); process.exit(1); }
console.log("target:", src);
let s = fs.readFileSync(src, "utf8");
if (s.includes("__hbN")) { console.log("already patched (v3e), nothing to do"); process.exit(0); }
const edits = [
  ["N.log(M.SYSTEM,`[HEARTBEAT] v86=", "(self.__hbN=(self.__hbN|0)+1)%120===1&&N.log(M.SYSTEM,`[HEARTBEAT] v86="],
  ["N.warn(M.SYSTEM,`[HEARTBEAT] EIP stuck at", "(self.__eipN=(self.__eipN|0)+1)%40===1&&N.warn(M.SYSTEM,`[HEARTBEAT] EIP stuck at"],
];
for (const [a, b] of edits) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error("PATCH FAILED: anchor found " + n + " times: " + a); process.exit(2); }
  s = s.replace(a, () => b);
}
s = s.replace(/\[D3D8-FIX v3([a-z]) active:/, (m, c) => "[D3D8-FIX v3" + c + "+e active:");
function check(code, label) {
  const f = path.join(path.dirname(path.resolve(src)), ".v3e-check-" + label + ".mjs");
  fs.writeFileSync(f, code);
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  try { fs.unlinkSync(f); } catch (e) {}
  if (r.status === 0) return null;
  const m = (r.stderr || "").match(/^.*\w*Error: .*$/m);
  return m ? m[0].slice(0, 300) : "unknown syntax error";
}
if (!process.argv.includes("--no-check")) {
  const before = check(fs.readFileSync(src, "utf8"), "orig"), after = check(s, "new");
  if (after && !before) { console.error("PATCH FAILED syntax check: " + after); process.exit(3); }
}
if (!fs.existsSync(src + ".bak")) fs.copyFileSync(src, src + ".bak");
fs.writeFileSync(src, s);
console.log("patched OK ->", src, "(heartbeat now logs 1 in 120, EIP-stuck 1 in 40)");
