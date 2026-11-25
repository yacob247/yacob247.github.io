const fs = require('fs');
const file = 'rewrites.json';

const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// start numbering after the highest existing numeric key
let nextNum = 0;
for (const k of Object.keys(data)) {
  const n = Number(k);
  if (Number.isInteger(n) && n > nextNum) nextNum = n;
}
nextNum = Math.max(nextNum, 99999) + 1;

const out = {};
for (const [oldKey, entry] of Object.entries(data)) {
  let newKey = oldKey;
  if (!/^\d+$/.test(oldKey)) {
    newKey = String(nextNum++);
    console.log(`  "${oldKey}" → "${newKey}"`);
  }
  out[newKey] = entry;
}

fs.copyFileSync(file, file + '.bak');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('✓ done:', Object.keys(out).length, 'entries');