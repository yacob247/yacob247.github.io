const fs = require('fs');
let content = fs.readFileSync('c:\\Users\\youse\\Downloads\\javast\\desert.html', 'utf8');
content = content.replace(
  'let m = field + 0.5;\n  return (m * (H_MAX - H_MIN) + H_MIN); s = clamp01(field * 1.55 - 0.15);',
  'function terrainAt(wx, wz) {\n  const field = fbm(wx * 0.042 + 3.7, wz * 0.016, 2);\n  let s = clamp01(field * 1.55 - 0.15);'
);
fs.writeFileSync('c:\\Users\\youse\\Downloads\\javast\\desert.html', content, 'utf8');
console.log('Fixed file');