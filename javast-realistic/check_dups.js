const fs = require('fs');
const src = fs.readFileSync('c:\\Users\\youse\\Downloads\\javast\\_check.js', 'utf8');

// strip template literals and strings to avoid matching shader code
const stripped = src
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const declared = new Set();
// declarations
for (const m of stripped.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
for (const m of stripped.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
// function params (simple, non-nested)
for (const m of stripped.matchAll(/function\s*[\w$]*\s*\(([^)]*)\)/g)) {
  m[1].split(',').forEach(p => { const n = p.trim().split(/[=\s]+/)[0]; if (n) declared.add(n); });
}
for (const m of stripped.matchAll(/(?:=>|\bfunction\b)[^{]*?\(([^)]*)\)\s*(?:=>|\{)/g)) {
  m[1].split(',').forEach(p => { const n = p.trim().split(/[=\s]+/)[0]; if (n) declared.add(n); });
}
// catch params
for (const m of stripped.matchAll(/\bcatch\s*\(\s*([\w$]+)/g)) declared.add(m[1]);

const globals = new Set(['Math','JSON','Object','Array','Float32Array','Uint8Array','Uint32Array',
  'console','document','window','performance','requestAnimationFrame','performance','Infinity','NaN',
  'undefined','parseInt','parseFloat','isNaN','Boolean','Number','String','Date','Map','Set','Promise',
  'Error','performance','crypto','devicePixelRatio','navigator','setTimeout','clearTimeout']);

const used = new Set();
for (const m of stripped.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*(?![\w$]*\s*[:=][^=])/g)) used.add(m[1]);

const keywords = new Set(['const','let','var','function','return','if','else','for','while','do','switch',
  'case','break','continue','new','typeof','instanceof','in','of','this','null','true','false','void',
  'delete','class','extends','try','catch','finally','throw','async','await','yield','static','get','set',
  'import','export','default','from','as','with','debugger','enum','interface','package','private',
  'protected','public','super']);

const missing = [...used].filter(n => !declared.has(n) && !globals.has(n) && !keywords.has(n));
console.log('Possibly undeclared:', missing.join(', '));