const fs = require('fs');
const p = 'StudyHub/HSC_Chemistry/Applying_Chemical_Ideas/textbook.html';
const raw = fs.readFileSync(p);
const s = raw.toString('utf8');

if (!s.includes('\u00C2')) {
  console.log('File already clean - no mojibake detected.');
} else {
  const fixed = Buffer.from(s, 'latin1').toString('utf8');
  if (fixed.includes('\u00C2')) {
    console.log('Still contains mojibake after one pass. Sample:', JSON.stringify(fixed.slice(0, 200)));
  } else {
    fs.writeFileSync(p, fixed, 'utf8');
    console.log('REPAIRED. Sample:', JSON.stringify(fixed.slice(0, 150)));
  }
}
