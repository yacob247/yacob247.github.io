#!/usr/bin/env python3
"""
Removes the OLD search widget (site-search-overlay) from all HTML files.
Keeps the new EZ-SEARCH-WIDGET-V2 intact.
"""
import os, sys, re
from pathlib import Path

SKIP_DIRS = {".venv", "node_modules", ".git", ".agents", "__pycache__"}

if len(sys.argv) < 2:
    print(r'Usage: python fix_old_widget.py "C:\path\to\site"')
    sys.exit(1)

root = Path(sys.argv[1]).resolve()
fixed = 0

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fname in sorted(filenames):
        if not fname.lower().endswith(".html"): continue
        fp = Path(dirpath) / fname
        text = fp.read_text(encoding="utf-8", errors="replace")

        # Remove old widget block
        new_text = re.sub(
            r'\n?<!-- ── Site Search Widget ──.*?<!-- ── End Site Search Widget ── -->',
            '', text, flags=re.DOTALL
        )
        # Also remove any leftover siteSearch script blocks
        new_text = re.sub(
            r'\n?<script>\s*\(function\(\)\s*\{[^<]*site-search[^<]*\}\)\(\);\s*</script>',
            '', new_text, flags=re.DOTALL
        )

        if new_text != text:
            fp.write_text(new_text, encoding="utf-8")
            rel = "/" + fp.relative_to(root).as_posix()
            print(f"  fixed  {rel}")
            fixed += 1

print(f"\nDone — {fixed} files cleaned")
