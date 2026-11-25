#!/usr/bin/env python3
"""
build_search_index.py - Fixed version
Handles double <head> tags caused by injected widgets.
Run: python build_search_index.py "C:\path\to\your\site"
"""
import os, sys, re, json
from pathlib import Path

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}

def extract_title(html):
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ""

def extract_description(html):
    for pat in [
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{10,})',
        r'<meta[^>]+content=["\']([^"\']{10,})["\'][^>]+name=["\']description["\']',
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']{10,})',
    ]:
        m = re.search(pat, html, re.IGNORECASE)
        if m: return m.group(1).strip()
    return ""

def extract_body_text(html):
    # Step 1: Remove the FIRST <head>...</head> block only
    html = re.sub(r'<head\b[^>]*>.*?</head>', '', html, count=1, flags=re.IGNORECASE | re.DOTALL)

    # Step 2: Remove all script, style, noscript, svg blocks
    for tag in ['script', 'style', 'noscript', 'svg', 'iframe', 'template']:
        html = re.sub(rf'<{tag}\b[^>]*>.*?</{tag}>', ' ', html, flags=re.IGNORECASE | re.DOTALL)

    # Step 3: Remove our injected widgets
    html = re.sub(r'<!-- EZ-SEARCH-WIDGET-V2 -->.*?<!-- END-EZ-SEARCH-WIDGET-V2 -->', '', html, flags=re.DOTALL)
    html = re.sub(r'<!-- ── Cookie Consent Banner ──.*?<!-- ── End Cookie Consent Banner ── -->', '', html, flags=re.DOTALL)

    # Step 4: Strip all remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', html)

    # Step 5: Decode common HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>') \
               .replace('&nbsp;', ' ').replace('&#39;', "'").replace('&quot;', '"')

    # Step 6: Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_headings(html):
    # Remove first head block first
    html = re.sub(r'<head\b[^>]*>.*?</head>', '', html, count=1, flags=re.IGNORECASE | re.DOTALL)
    headings = []
    for m in re.finditer(r'<h[1-4][^>]*>(.*?)</h[1-4]>', html, re.IGNORECASE | re.DOTALL):
        text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        if text and len(text) < 200:
            headings.append(text)
    return headings[:10]

def is_noindex(html):
    return bool(re.search(
        r'<meta[^>]*(?:name=["\']robots["\'][^>]*content=["\'][^"\']*noindex|content=["\'][^"\']*noindex[^"\']*["\'][^>]*name=["\']robots["\'])',
        html,
        re.IGNORECASE
    ))

def build_index(root):
    index = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            if not fname.lower().endswith(".html"): continue
            if fname in SKIP_FILES: continue
            fp  = Path(dirpath) / fname
            rel = "/" + fp.relative_to(root).as_posix()
            try:
                html = fp.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            if is_noindex(html):
                continue

            title    = extract_title(html) or fname.replace(".html","").replace("-"," ").title()
            desc     = extract_description(html)
            body     = extract_body_text(html)[:4000]
            headings = extract_headings(html)

            index.append({
                "title":    title,
                "url":      rel,
                "desc":     desc,
                "headings": headings,
                "body":     body
            })
            print(f"  {'OK ' if body else 'NO '} {rel} ({len(body)} chars)")

    return index

def main():
    if len(sys.argv) < 2:
        print(r'Usage: python build_search_index.py "C:\path\to\site"')
        sys.exit(1)
    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"ERROR: {root} not found"); sys.exit(1)

    print(f"\nBuilding index: {root}\n")
    index = build_index(root)

    # Write to root AND all subfolders
    for folder in [root] + [p for p in root.iterdir() if p.is_dir() and p.name not in SKIP_DIRS]:
        out = folder / "search-index.json"
        out.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    filled = sum(1 for p in index if p["body"])
    print(f"\nDone — {filled}/{len(index)} pages have body content")
    print(f"Index written to root + all subfolders\n")

if __name__ == "__main__":
    main()
