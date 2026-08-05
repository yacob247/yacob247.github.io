#!/usr/bin/env python3
"""
Replaces the broken RegExp escape line in the search widget
with a safe indexOf-based version that has zero escaping issues.
"""
import os, sys, re
from pathlib import Path

SKIP_DIRS = {".venv", "node_modules", ".git", ".agents", "__pycache__"}

if len(sys.argv) < 2:
    print(r'Usage: python fix_regex_escape.py "C:\path\to\site"')
    sys.exit(1)

root = Path(sys.argv[1]).resolve()
fixed = 0

# The broken highlight function — match loosely
OLD_PATTERN = re.compile(
    r'words\.forEach\(function\(w\) \{.*?var rx = new RegExp.*?found\.push.*?\}\);',
    re.DOTALL
)

NEW_FOREACH = """\
words.forEach(function(w) {
      var wl = w.toLowerCase(), tl = text.toLowerCase(), idx = 0;
      while ((idx = tl.indexOf(wl, idx)) !== -1) {
        found.push({ start: idx, end: idx + wl.length });
        idx += wl.length;
      }
    });"""

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fname in sorted(filenames):
        if not fname.lower().endswith(".html"): continue
        fp = Path(dirpath) / fname
        text = fp.read_text(encoding="utf-8", errors="replace")
        if "RegExp(w.replace" not in text: continue

        new_text = OLD_PATTERN.sub(NEW_FOREACH, text)
        if new_text != text:
            fp.write_text(new_text, encoding="utf-8")
            rel = "/" + fp.relative_to(root).as_posix()
            print(f"  fixed  {rel}")
            fixed += 1

print(f"\nDone — {fixed} files fixed")
