#!/usr/bin/env python3
"""
fix_search_path.py
Fixes the search-index.json fetch path in ALL html files.
Changes relative fetch to absolute /search-index.json so it works
from any subfolder (tools/, guides/, reviews-blog/, etc.)
"""
from pathlib import Path
import os, sys

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}

if len(sys.argv) < 2:
    print(r'Usage: python fix_search_path.py "C:\path\to\site"')
    sys.exit(1)

root = Path(sys.argv[1]).resolve()
fixed = 0

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fname in sorted(filenames):
        if not fname.lower().endswith(".html"): continue
        if fname in SKIP_FILES: continue
        fp = Path(dirpath) / fname
        text = fp.read_text(encoding="utf-8", errors="replace")

        # The bug: relative path used in subfolders
        if "fetch('search-index.json')" in text:
            text = text.replace("fetch('search-index.json')", "fetch('/search-index.json')")
            fp.write_text(text, encoding="utf-8")
            rel = "/" + fp.relative_to(root).as_posix()
            print(f"  fixed  {rel}")
            fixed += 1
        elif "fetch('/search-index.json')" in text:
            rel = "/" + fp.relative_to(root).as_posix()
            print(f"  ok     {rel} (already correct)")

print(f"\nDone — {fixed} files fixed")
