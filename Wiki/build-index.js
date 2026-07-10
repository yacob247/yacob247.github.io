/**
 * WikiRare — build-index.js
 *
 * Place this file next to your index.html (same folder).
 * Run it once whenever you add new files to your Wiki/ folder:
 *
 *   node build-index.js
 *
 * It walks every file inside Wiki/ at any depth, reads them as plain text,
 * strips the HTML tags, extracts the header (<h1> or <title>), and writes
 * wiki-search-index.json next to this file.
 *
 * That JSON is what the search bar reads — no server needed, no manual listing.
 * Just run this script and refresh your browser.
 */

const fs   = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
// build-index.js lives INSIDE the Wiki/ folder.
// It scans everything in that same folder (and all sub-folders).
// It writes wiki-search-index.json one level UP, next to index.html.
const WIKI_DIR    = __dirname;                                         // scan THIS folder
const OUTPUT_FILE = path.join(__dirname, 'wiki-search-index.json'); // one level up, next to index.html
const EXTENSIONS  = ['.html', '.htm'];                                 // file types to index
// ────────────────────────────────────────────────────────────────────────────

// Walk a directory recursively and return all matching file paths
function walkDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkDir(full, results);
    } else if (EXTENSIONS.includes(path.extname(name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// Strip HTML tags and decode common entities, returning plain text
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract the best header from an HTML string
function extractHeader(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripHtml(h1[1]).trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return stripHtml(title[1]).trim();
  return '';
}

// ── MAIN ────────────────────────────────────────────────────────────────────
console.log(`Scanning: ${WIKI_DIR}`);

const files = walkDir(WIKI_DIR);
console.log(`Found ${files.length} file(s)`);

const index = [];

for (const filePath of files) {
  try {
    const html   = fs.readFileSync(filePath, 'utf8');
    const header = extractHeader(html);
    if (!header) {
      console.log(`  SKIP (no header): ${filePath}`);
      continue;
    }
    const text = stripHtml(html);
    // Store path relative to this script so it works as a URL
    // Path relative to index.html (one level up), with forward slashes for URLs
    const relPath = 'Wiki/' + path.relative(__dirname, filePath).replace(/\\/g, '/');
    index.push({ path: relPath, header, text });
    console.log(`  OK: ${relPath} — "${header}"`);
  } catch (err) {
    console.log(`  ERROR: ${filePath} — ${err.message}`);
  }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf8');
console.log(`\nDone. Wrote ${index.length} entries to:\n  ${OUTPUT_FILE}`);