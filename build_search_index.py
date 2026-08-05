#!/usr/bin/env python3
"""
build_search_index.py
Scrapes every HTML page in your site, extracts real text content,
and writes /search-index.json — used by the live search widget.

Run: python build_search_index.py "C:\path\to\your\site"
"""

import os, sys, re, json
from pathlib import Path
from html.parser import HTMLParser

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}

# Tags whose inner text we completely ignore
SKIP_TAGS  = {"script", "style", "noscript", "head", "meta", "link",
               "iframe", "svg", "path", "template"}

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip_depth  = 0
        self.skip_tag    = None
        self.chunks      = []
        self.in_heading  = False
        self.headings    = []
        self.heading_tag = None

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            self.skip_tag = tag
        if tag in ("h1","h2","h3","h4"):
            self.in_heading  = True
            self.heading_tag = tag

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
        if tag in ("h1","h2","h3","h4"):
            self.in_heading = False

    def handle_data(self, data):
        if self.skip_depth > 0:
            return
        text = data.strip()
        if not text:
            return
        if self.in_heading:
            self.headings.append(text)
        self.chunks.append(text)

    def get_text(self):
        return " ".join(self.chunks)

    def get_headings(self):
        return self.headings


def extract_title(html: str) -> str:
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if m:
        return re.sub(r'\s+', ' ', m.group(1)).strip()
    return ""


def extract_description(html: str) -> str:
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', html, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']', html, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return ""


def clean_text(text: str) -> str:
    # collapse whitespace, remove cookie/search widget text we injected
    text = re.sub(r'\s+', ' ', text)
    # strip out our injected widget noise
    text = re.sub(r'🍪.*?Terms\.', '', text)
    text = re.sub(r'Press Esc to close.*', '', text)
    return text.strip()


def build_index(root: Path) -> list:
    index = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            if not fname.lower().endswith(".html"):
                continue
            if fname in SKIP_FILES:
                continue
            fp = Path(dirpath) / fname
            rel = "/" + fp.relative_to(root).as_posix()

            try:
                html = fp.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            title = extract_title(html) or fname.replace(".html","").replace("-"," ").title()
            desc  = extract_description(html)

            parser = TextExtractor()
            parser.feed(html)
            body_text = clean_text(parser.get_text())
            headings  = parser.get_headings()

            # Limit body to 3000 chars to keep JSON small
            snippet = body_text[:3000]

            index.append({
                "title":    title,
                "url":      rel,
                "desc":     desc,
                "headings": headings[:10],   # first 10 headings
                "body":     snippet
            })
            print(f"  indexed  {rel}  ({len(snippet)} chars)")

    return index


def main():
    if len(sys.argv) < 2:
        print("Usage: python build_search_index.py <site-root>")
        sys.exit(1)

    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"ERROR: {root} not found")
        sys.exit(1)

    print(f"\nBuilding search index for: {root}\n")
    index = build_index(root)

    out = root / "search-index.json"
    out.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ Wrote {len(index)} pages → {out}")
    print("\nNow run:  python inject_search.py <site-root>")
    print("to replace the old search widget with the new smart one.\n")


if __name__ == "__main__":
    main()
