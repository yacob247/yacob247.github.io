#!/usr/bin/env python3
"""
build_search_index.py
Scrapes every page and file in your site, extracts real text content,
and writes /search-index.json — used by the live search widget.

Run: python build_search_index.py .
"""

import os
import sys
import re
import json
import html
import urllib.parse
from pathlib import Path

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}
SUPPORTED_EXTENSIONS = {".html", ".htm", ".xhtml", ".md", ".markdown", ".txt"}

def extract_title(content: str, fname: str) -> str:
    """Extracts the <title> tag, falling back to a formatted filename."""
    m = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
    if m:
        t = re.sub(r'<[^>]+>', '', m.group(1))
        t = html.unescape(t).strip()
        if t:
            return re.sub(r'\s+', ' ', t)
    
    # Fallback to readable filename
    clean_name = fname.rsplit(".", 1)[0]
    clean_name = re.sub(r'[-_]', ' ', clean_name)
    return clean_name.title()

def extract_description(content: str) -> str:
    """Extracts the meta description."""
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', content, re.IGNORECASE)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']', content, re.IGNORECASE)
    if m:
        return html.unescape(m.group(1)).strip()
    return ""

def extract_headings(content: str) -> list:
    """Extracts h1-h4 tags to index as section topics."""
    headings = []
    matches = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', content, re.IGNORECASE | re.DOTALL)
    for match in matches:
        text = re.sub(r'<[^>]+>', '', match)
        text = html.unescape(text).strip()
        text = re.sub(r'\s+', ' ', text)
        if text and text not in headings:
            headings.append(text)
    return headings[:10]

def extract_clean_body_text(content: str) -> str:
    """Safely extracts readable text by removing hidden tags and markup."""
    # 1. Strip scripts, styles, svg, iframe, noscript blocks completely
    text = re.sub(r'<(script|style|svg|iframe|noscript|head)[^>]*>.*?</\1>', ' ', content, flags=re.IGNORECASE | re.DOTALL)
    
    # 2. Strip all HTML comments
    text = re.sub(r'<!--.*?-->', ' ', text, flags=re.DOTALL)
    
    # 3. Strip all HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # 4. Unescape HTML entities (&nbsp;, &amp;, etc.)
    text = html.unescape(text)
    
    # 5. Strip widget leftover text if present (specific to this site's UI)
    text = re.sub(r'🍪.*?Terms\.', ' ', text)
    text = re.sub(r'Press Esc to close.*', ' ', text)
    
    # 6. Collapse multiple whitespaces/newlines into single spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def build_index(root: Path) -> list:
    """Walks through directories, parses valid files, and builds the JSON structure."""
    index = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Exclude skipped directories in-place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        
        for fname in sorted(filenames):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS or fname in SKIP_FILES:
                continue
            
            fp = Path(dirpath) / fname
            
            # Format exactly for standard web routing to hit the exact file
            raw_rel_path = "/" + fp.relative_to(root).as_posix()
            exact_url_path = urllib.parse.quote(raw_rel_path, safe="/#?")

            try:
                content = fp.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                print(f"  [!] Failed to read {exact_url_path}: {e}")
                continue

            # Process HTML vs text/markdown differently
            if ext in {".html", ".htm", ".xhtml"}:
                title = extract_title(content, fname)
                desc = extract_description(content)
                headings = extract_headings(content)
                body_text = extract_clean_body_text(content)
            else:
                title = fname.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
                desc = f"File: {fname}"
                headings = []
                body_text = re.sub(r'\s+', ' ', content).strip()

            # Limit body snippet to 3000 chars per page to keep JSON performant
            snippet = body_text[:3000]

            index.append({
                "title":    title,
                "url":      exact_url_path,
                "desc":     desc,
                "headings": headings,
                "body":     snippet
            })
            print(f"  indexed  {exact_url_path}  ({len(snippet)} chars)")

    return index

def main():
    if len(sys.argv) < 2:
        script_name = os.path.basename(sys.argv[0])
        print(f"Usage: python {script_name} <site-root>")
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