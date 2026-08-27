const fs = require('fs');
const t = fs.readFileSync('StudyHub/HSC_Chemistry/Applying_Chemical_Ideas/textbook.html', 'utf8');
const opens = [...t.matchAll(/<script(?![^>]*src)[^>]*>/g)];
let n = 0;
for (const m of opens) {
  n++;
  const a = m.index + m[0].length;
  const b = t.indexOf('</script>', a);
  const code = t.slice(a, b);
  try { new Function(code); console.log('script', n, 'OK (' + code.length + ' chars)'); }
  catch (err) { console.log('script', n, 'FAILS:', err.message, 'len', code.length); }
}
