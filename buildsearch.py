#!/usr/bin/env python3
"""
build_search_ind.py
Walks every HTML/md/txt file in your site, extracts real text,
writes search-index.json.

Run: python build_search_ind.py .
"""

import os, sys, re, json, html, urllib.parse
from pathlib import Path

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__", "Loma"}
SKIP_FILES = {
    "ads.txt", "robots.txt", "sitemap.xml", "CNAME",
    "search-index.json", "build_search_ind.py", "build_search_index.py",
    ".gitattributes", ".gitignore",
}
SUPPORTED_EXT = {".html", ".htm", ".xhtml", ".md", ".markdown", ".txt"}
SKIP_EXT      = {".py", ".json", ".sh", ".yml", ".yaml", ".lock", ".csv", ".bat", ".js", ".css"}


def extract_title(content, fname):
    m = re.search(r'<title[^>]*>(.*?)</title>', content, re.I | re.S)
    if m:
        t = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
        if t:
            return re.sub(r'\s+', ' ', t)
    stem = fname.rsplit(".", 1)[0]
    return re.sub(r'[-_]', ' ', stem).title()


def extract_description(content):
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', content, re.I)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']', content, re.I)
    return html.unescape(m.group(1)).strip() if m else ""


def extract_headings(content):
    out = []
    for m in re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', content, re.I | re.S):
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m))).strip()
        if t and t not in out:
            out.append(t)
    return out[:10]


def extract_body(content):
    # 1. Remove the search widget injected by inject_search.py (by id)
    text = re.sub(
        r'<!--\s*[-─]+\s*Smart Site Search.*?<!--\s*[-─]+\s*End Smart.*?-->',
        ' ', content, flags=re.I | re.S
    )
    # Also strip by div id in case comment markers differ
    text = re.sub(
        r'<div[^>]+id=["\']ez-search-overlay["\'][^>]*>.*?</div>',
        ' ', text, flags=re.I | re.S
    )
    text = re.sub(
        r'<button[^>]+id=["\']ez-search-btn["\'][^>]*>.*?</button>',
        ' ', text, flags=re.I | re.S
    )
    # 2. Strip <head>, scripts, styles, svg, iframes
    text = re.sub(r'<head\b[^>]*>.*?</head>', ' ', text, flags=re.I | re.S)
    text = re.sub(r'<(script|style|svg|iframe|noscript)[^>]*>.*?</\1>', ' ', text, flags=re.I | re.S)
    # 3. Strip comments
    text = re.sub(r'<!--.*?-->', ' ', text, flags=re.S)
    # 4. Strip all tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # 5. Unescape entities
    text = html.unescape(text)
    # 6. Collapse whitespace
    return re.sub(r'\s+', ' ', text).strip()


def build_index(root):
    index = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXT or fname in SKIP_FILES or ext in SKIP_EXT:
                continue

            fp  = Path(dirpath) / fname
            url = urllib.parse.quote("/" + fp.relative_to(root).as_posix(), safe="/#?")

            try:
                raw = fp.read_bytes()
                if raw[:2] in (b'\xff\xfe', b'\xfe\xff') or raw.count(b'\x00') > len(raw) // 4:
                    print(f"  [skip-utf16] {url}")
                    continue
                content = raw.decode("utf-8", errors="replace")
            except Exception as e:
                print(f"  [!] {url}: {e}")
                continue

            if ext in {".html", ".htm", ".xhtml"}:
                title    = extract_title(content, fname)
                desc     = extract_description(content)
                headings = extract_headings(content)
                body     = extract_body(content)
            else:
                title    = fname.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
                desc     = f"File: {fname}"
                headings = []
                body     = re.sub(r'\s+', ' ', content).strip()

            snippet = body[:3000]
            index.append({"title": title, "url": url, "desc": desc, "headings": headings, "body": snippet})
            print(f"  indexed  {url}  ({len(snippet)} chars)")

    return index


def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(".").resolve()
    if not root.exists():
        print(f"ERROR: {root} not found"); sys.exit(1)

    print(f"\nBuilding search index for: {root}\n")
    index = build_index(root)

    out = root / "search-index.json"
    out.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ Wrote {len(index)} entries → {out}\n")


if __name__ == "__main__":
    main()