const fs = require('fs');
const path = require('path');

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.name.toLowerCase().endsWith('.html')) files.push(filePath);
  }
}

walk(process.cwd());
const errors = [];
for (const filePath of files) {
  const html = fs.readFileSync(filePath, 'utf8');
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype=["']application\/ld\+json["'])(?![^>]*\btype=["']module["'])(?![^>]*\btype=["']importmap["'])[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      new Function(match[1]);
    } catch (error) {
      errors.push(`${path.relative(process.cwd(), filePath)}: ${error.message}`);
    }
  }
}

console.log(`HTML files: ${files.length}`);
console.log(`Inline script syntax errors: ${errors.length}`);
if (errors.length) console.log(errors.join('\n'));
process.exitCode = errors.length ? 1 : 0;
