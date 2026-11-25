const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
function parse(label, start, end) {
    const sub = s.slice(start, end);
    try { new Function(sub); console.log(label + ': OK (' + sub.length + ' chars)'); }
    catch (e) { console.log(label + ': ERROR -> ' + e.message); }
}
let idx = -1;
const closes = [];
while ((idx = s.indexOf('</script>', idx + 1)) !== -1) closes.push(idx);
console.log('script closes:', closes);
// MAIN_APP
const i1 = s.indexOf('const CLASSIFIER_PROMPT');
parse('MAIN_APP', i1, closes[3]);
// Engine loader block
const root = s.indexOf('<!-- 2. Engine loader script');
const tagA = s.indexOf('<script>', root);
parse('SCRIPT_A_ENGINE', tagA + 8, closes[5]);
// UI controller (last block) — includes connectors/code messages
const tagB = s.indexOf('<script>', closes[5] + 1);
parse('SCRIPT_B_UI_CONTROLLER', tagB + 8, closes[7]);
// sanity: no real </script> inside the string macro of runCode
const probe = s.slice(tagB + 8, closes[7]);
console.log('raw </script inside SCRIPT_B (should be -1):', probe.indexOf('</script'));