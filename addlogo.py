"""
fix_favicon.py
--------------
Fixes the favicon <link rel="icon"> tag in every .html file to use
an absolute URL so it works from any subfolder depth.

Before: <link rel="icon" type="image/png" href="logo.png">
        <link rel="icon" href="../logo.png">
        (any relative path)

After:  <link rel="icon" type="image/png" href="https://envizion.work/logo.png">

Run from repo root:
    python fix_favicon.py

Preview without writing:
    Set DRY_RUN = True
"""

import os
import re
import sys

ROOT    = sys.argv[1] if len(sys.argv) > 1 else "."
DRY_RUN = False

ABSOLUTE_FAVICON = 'https://envizion.work/logo.png'

NEW_TAG = f'<link rel="icon" type="image/png" href="{ABSOLUTE_FAVICON}">'

# Matches any existing favicon link tag (rel="icon" or rel="shortcut icon")
FAVICON_RE = re.compile(
    r'<link\s[^>]*rel=["\'](?:shortcut )?icon["\'][^>]*/?>',
    re.IGNORECASE
)

# Also catch reversed attribute order (href before rel)
FAVICON_RE2 = re.compile(
    r'<link\s[^>]*href=[^>]*logo[^>]*rel=["\'](?:shortcut )?icon["\'][^>]*/?>',
    re.IGNORECASE
)

def fix_favicon(html: str) -> tuple[str, bool]:
    """Returns (fixed_html, was_changed)."""
    
    # Already correct
    if ABSOLUTE_FAVICON in html:
        return html, False

    # Try to replace existing favicon tag
    if FAVICON_RE.search(html):
        fixed = FAVICON_RE.sub(NEW_TAG, html, count=1)
        return fixed, True
    
    if FAVICON_RE2.search(html):
        fixed = FAVICON_RE2.sub(NEW_TAG, html, count=1)
        return fixed, True

    # No favicon tag exists — insert one after <meta charset>
    charset_match = re.search(r'(<meta\s[^>]*charset[^>]*>)', html, re.IGNORECASE)
    if charset_match:
        pos = charset_match.start()
        fixed = html[:pos] + NEW_TAG + "\n" + html[pos:]
        return fixed, True

    # Fallback: insert after <head>
    head_match = re.search(r'<head[^>]*>', html, re.IGNORECASE)
    if head_match:
        pos = head_match.end()
        fixed = html[:pos] + "\n  " + NEW_TAG + html[pos:]
        return fixed, True

    return html, False


def process_repo(root: str):
    total_html = 0
    fixed      = []
    already_ok = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        for filename in filenames:
            if not filename.lower().endswith(".html"):
                continue

            filepath = os.path.join(dirpath, filename)
            total_html += 1

            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()

            patched, changed = fix_favicon(original)

            if not changed:
                already_ok += 1
                continue

            rel = os.path.relpath(filepath, root)
            fixed.append(rel)

            if not DRY_RUN:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(patched)

    mode = "[DRY RUN] " if DRY_RUN else ""
    print(f"\n{mode}Favicon fix complete")
    print(f"  HTML files scanned : {total_html}")
    print(f"  Fixed              : {len(fixed)}")
    print(f"  Already correct    : {already_ok}")
    if fixed:
        print("\nFixed files:")
        for p in fixed:
            print(f"  ✓ {p}")

if __name__ == "__main__":
    print(f"Root: {os.path.abspath(ROOT)}")
    process_repo(ROOT)