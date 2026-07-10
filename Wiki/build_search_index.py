"""
build_search_index.py
─────────────────────
Run this once (or whenever you add new articles):

    python build_search_index.py

It crawls every .html file in every subfolder next to this script,
extracts title + text content, and writes search_index.js next to index.html.
The homepage loads search_index.js and searches it instantly — no server needed.
"""

import os, re, json
from html.parser import HTMLParser

# ── CONFIG ──────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))   # folder containing index.html
SKIP_FILES = {'index.html'}                          # don't index the homepage itself
OUTPUT_JS  = os.path.join(ROOT, 'search_index.js')
# ────────────────────────────────────────────────────────────────────────────


class ArticleParser(HTMLParser):
    """Strips all HTML tags, keeps visible text + grabs <title> and meta description."""

    def __init__(self):
        super().__init__()
        self.title       = ''
        self.description = ''
        self.text_parts  = []
        self._in_skip    = 0          # depth counter for <script>/<style>
        self._in_title   = False
        self._collecting = True

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'style', 'noscript'):
            self._in_skip += 1
        if tag == 'title':
            self._in_title = True
        if tag == 'meta':
            name    = attrs.get('name', '').lower()
            prop    = attrs.get('property', '').lower()
            content = attrs.get('content', '')
            if name in ('description', 'og:description') or prop == 'og:description':
                if content and not self.description:
                    self.description = content

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'):
            self._in_skip = max(0, self._in_skip - 1)
        if tag == 'title':
            self._in_title = False

    def handle_data(self, data):
        if self._in_skip:
            return
        text = data.strip()
        if not text:
            return
        if self._in_title and not self.title:
            self.title = text
        else:
            self.text_parts.append(text)

    def body_text(self):
        return ' '.join(self.text_parts)


def clean(text):
    """Collapse whitespace."""
    return re.sub(r'\s+', ' ', text).strip()


def index_html_file(filepath, root):
    """Parse one HTML file and return an index record, or None on failure."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()
    except Exception as e:
        print(f'  ⚠ Could not read {filepath}: {e}')
        return None

    parser = ArticleParser()
    try:
        parser.feed(html)
    except Exception:
        pass  # partial parse is fine

    title   = clean(parser.title)
    desc    = clean(parser.description)
    body    = clean(parser.body_text())

    # Relative URL path (use forward slashes for web)
    rel_path = os.path.relpath(filepath, root).replace(os.sep, '/')

    # Snippet: prefer description, fall back to first 200 chars of body
    snippet = desc if desc else body[:200]

    # Search text = title + desc + body (lowercased for fast matching)
    search_text = f'{title} {desc} {body}'.lower()

    return {
        'url':     rel_path,
        'title':   title or rel_path,
        'snippet': snippet,
        'lang':    guess_lang(filepath, html),
        'search':  search_text,          # not displayed, only searched
    }


def guess_lang(filepath, html):
    """Try to detect language from html lang= attribute or folder name."""
    m = re.search(r'<html[^>]*lang=["\']([^"\']+)["\']', html, re.I)
    if m:
        return m.group(1).split('-')[0].lower()
    # Fall back to folder name
    parts = filepath.replace('\\', '/').split('/')
    if len(parts) >= 2:
        folder = parts[-2]
        if 2 <= len(folder) <= 5 and folder.isalpha():
            return folder.lower()
    return 'unknown'


def crawl(root):
    records = []
    total_files = 0

    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden folders
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]

        for fname in filenames:
            if not fname.lower().endswith('.html') and not fname.lower().endswith('.htm'):
                continue
            if fname in SKIP_FILES and dirpath == root:
                continue

            total_files += 1
            fpath = os.path.join(dirpath, fname)
            rel   = os.path.relpath(fpath, root)
            print(f'  Indexing: {rel}')

            rec = index_html_file(fpath, root)
            if rec:
                records.append(rec)

    print(f'\n✔ Parsed {total_files} files → {len(records)} indexed.')
    return records


def write_index(records, output_path):
    # Strip the heavy 'search' field into a separate parallel array to keep
    # the display data small, then write both.
    display = [{'url': r['url'], 'title': r['title'],
                'snippet': r['snippet'], 'lang': r['lang']} for r in records]
    search  = [r['search'] for r in records]

    js = (
        '// Auto-generated by build_search_index.py — do not edit manually.\n'
        f'var WR_INDEX = {json.dumps(display, ensure_ascii=False)};\n'
        f'var WR_SEARCH = {json.dumps(search, ensure_ascii=False)};\n'
    )

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js)

    size_kb = os.path.getsize(output_path) / 1024
    print(f'✔ Wrote {output_path}  ({size_kb:.1f} KB)')


if __name__ == '__main__':
    print(f'WikiRare Search Index Builder')
    print(f'Root: {ROOT}\n')
    records = crawl(ROOT)
    if records:
        write_index(records, OUTPUT_JS)
        print('\n✅ Done! Open index.html in your browser — search is ready.')
    else:
        print('\n⚠ No HTML files found. Make sure your article folders are next to this script.')
