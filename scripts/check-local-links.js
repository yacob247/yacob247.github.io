const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.name.toLowerCase().endsWith('.html')) files.push(filePath);
  }
}
walk(root);

const broken = [];
for (const filePath of files) {
  const html = fs.readFileSync(filePath, 'utf8');
  for (const match of html.matchAll(/\bhref=["']([^"'#?]+)["']/gi)) {
    const href = match[1].trim();
    if (!href || href.includes('${') || /^(https?:|mailto:|tel:|javascript:|data:|chrome-extension:)/i.test(href)) continue;
    const target = href.startsWith('/')
      ? path.join(root, href.replace(/^\/+/, ''))
      : path.resolve(path.dirname(filePath), href);
    const candidate = target.endsWith(path.sep) ? path.join(target, 'index.html') : target;
    if (!fs.existsSync(candidate)) broken.push(`${path.relative(root, filePath)} -> ${href}`);
  }
}

console.log(`HTML files: ${files.length}`);
console.log(`Broken local links: ${broken.length}`);
if (broken.length) console.log(broken.join('\n'));
process.exitCode = broken.length ? 1 : 0;
