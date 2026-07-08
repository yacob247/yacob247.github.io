"""
1_add_csp.py
------------
Adds a Content Security Policy <meta> tag to every .html file
in your repo (all folders, recursively) if one doesn't already exist.

Inserts it right after the <meta charset> line so it's near the top of <head>.

Run from your repo root:
    python 1_add_csp.py

Preview without changing files:
    Set DRY_RUN = True below
"""

import os
import re
import sys

ROOT    = sys.argv[1] if len(sys.argv) > 1 else "."
DRY_RUN = False

# ── The CSP tag to inject ─────────────────────────────────────────────────────
# Covers the scripts/fonts/images used across the Yacob Digital / Envizion site.
# Adjust domains here if you add new third-party scripts later.
CSP_TAG = (
    '<meta http-equiv="Content-Security-Policy" '
    'content="default-src \'self\'; '
    'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' '
    'https://cdn.tailwindcss.com https://unpkg.com '
    'https://www.googletagmanager.com https://www.google-analytics.com; '
    'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; '
    'font-src https://fonts.gstatic.com; '
    'img-src \'self\' https://images.unsplash.com https://repository-images.githubusercontent.com data: blob:; '
    'connect-src \'self\' https://www.google-analytics.com; '
    'frame-src \'self\';">'
)

def already_has_csp(html: str) -> bool:
    return bool(re.search(
        r'<meta\s[^>]*http-equiv\s*=\s*["\']Content-Security-Policy["\']',
        html, re.IGNORECASE
    ))

def inject_csp(html: str) -> str:
    """Insert CSP tag after the <meta charset> line."""

    # Try to place it right after <meta charset=...>
    charset_match = re.search(
        r'(<meta\s[^>]*charset[^>]*>)',
        html, re.IGNORECASE
    )
    if charset_match:
        insert_pos = charset_match.end()
        return html[:insert_pos] + "\n  " + CSP_TAG + html[insert_pos:]

    # Fallback: place it right after the opening <head> tag
    head_match = re.search(r'<head[^>]*>', html, re.IGNORECASE)
    if head_match:
        insert_pos = head_match.end()
        return html[:insert_pos] + "\n  " + CSP_TAG + html[insert_pos:]

    # Last resort: prepend to file
    return CSP_TAG + "\n" + html


def process_repo(root: str):
    total_files   = 0
    modified      = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        for filename in filenames:
            if not filename.lower().endswith(".html"):
                continue

            filepath = os.path.join(dirpath, filename)
            total_files += 1

            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()

            if already_has_csp(original):
                continue  # already has CSP, skip

            fixed = inject_csp(original)
            modified.append(os.path.relpath(filepath, root))

            if not DRY_RUN:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(fixed)

    mode = "[DRY RUN] " if DRY_RUN else ""
    print(f"\n{mode}CSP injection complete")
    print(f"  HTML files scanned : {total_files}")
    print(f"  Files updated      : {len(modified)}")
    if modified:
        print("\nUpdated files:")
        for p in modified:
            print(f"  → {p}")
    else:
        print("\nAll files already have a CSP tag.")


if __name__ == "__main__":
    print(f"Root : {os.path.abspath(ROOT)}")
    process_repo(ROOT)