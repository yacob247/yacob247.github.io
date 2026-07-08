"""
fix_csp.py
----------
Fixes the Content-Security-Policy <meta> tag in every .html file
by adding `blob:` to the connect-src directive.

Before: connect-src 'self' https://www.google-analytics.com
After:  connect-src 'self' blob: https://www.google-analytics.com

Run from your repo root:
    python fix_csp.py

Or pass a path:
    python fix_csp.py /path/to/repo

Preview without changing files:
    Set DRY_RUN = True below
"""

import os
import re
import sys

ROOT    = sys.argv[1] if len(sys.argv) > 1 else "."
DRY_RUN = False

OLD_CONNECT = "connect-src 'self' https://www.google-analytics.com"
NEW_CONNECT = "connect-src 'self' blob: https://www.google-analytics.com"

def needs_fix(html: str) -> bool:
    """Returns True if the file has the old connect-src without blob:."""
    return OLD_CONNECT in html

def apply_fix(html: str) -> str:
    return html.replace(OLD_CONNECT, NEW_CONNECT)

def process_repo(root: str):
    total_files = 0
    already_ok  = 0
    modified    = []
    no_csp      = 0

    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden dirs like .git
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        for filename in filenames:
            if not filename.lower().endswith(".html"):
                continue

            filepath = os.path.join(dirpath, filename)
            total_files += 1

            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()

            # Skip files that have no CSP at all
            if "Content-Security-Policy" not in original:
                no_csp += 1
                continue

            if not needs_fix(original):
                already_ok += 1
                continue

            fixed = apply_fix(original)
            rel_path = os.path.relpath(filepath, root)
            modified.append(rel_path)

            if not DRY_RUN:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(fixed)

    mode = "[DRY RUN] " if DRY_RUN else ""
    print(f"\n{mode}connect-src blob: fix complete")
    print(f"  HTML files scanned  : {total_files}")
    print(f"  Fixed (blob: added) : {len(modified)}")
    print(f"  Already correct     : {already_ok}")
    print(f"  No CSP tag at all   : {no_csp}")
    if modified:
        print("\nFixed files:")
        for p in modified:
            print(f"  ✓ {p}")

if __name__ == "__main__":
    print(f"Root: {os.path.abspath(ROOT)}")
    process_repo(ROOT)