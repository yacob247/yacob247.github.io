"""
fix_csp2.py
-----------
Rewrites the Content-Security-Policy <meta> tag in every .html file
to the fully-corrected version.

Fixes applied vs the original injected CSP:
  1. script-src  — adds https://pagead2.googlesyndication.com  (AdSense)
  2. media-src   — NEW directive: 'self' blob:  (WaveSurfer audio playback)
  3. connect-src — adds blob: and https://unpkg.com

Handles files patched by earlier fix_csp.py (v1) as well.

Run from your repo root:
    python fix_csp2.py

Pass a specific path:
    python fix_csp2.py /path/to/site

Preview only (no writes):
    Set DRY_RUN = True
"""

import os
import re
import sys

ROOT    = sys.argv[1] if len(sys.argv) > 1 else "."
DRY_RUN = False

# ── Fully-fixed CSP content value ─────────────────────────────────────────────
NEW_CSP_CONTENT = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
    "https://cdn.tailwindcss.com https://unpkg.com "
    "https://www.googletagmanager.com https://www.google-analytics.com "
    "https://pagead2.googlesyndication.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' https://images.unsplash.com "
    "https://repository-images.githubusercontent.com data: blob:; "
    "media-src 'self' blob:; "
    "connect-src 'self' blob: https://unpkg.com https://www.google-analytics.com; "
    "frame-src 'self';"
)

# Regex that matches the full CSP <meta> tag regardless of what's in content=
CSP_META_RE = re.compile(
    r'<meta\s[^>]*http-equiv\s*=\s*["\']Content-Security-Policy["\'][^>]*>',
    re.IGNORECASE | re.DOTALL
)

NEW_CSP_TAG = (
    '<meta http-equiv="Content-Security-Policy" '
    f'content="{NEW_CSP_CONTENT}">'
)

def already_correct(html: str) -> bool:
    """True if the file already has every required directive correctly."""
    return (
        "pagead2.googlesyndication.com" in html and
        "media-src" in html and
        "blob: https://unpkg.com" in html
    )

def has_csp(html: str) -> bool:
    return bool(CSP_META_RE.search(html))

def apply_fix(html: str) -> str:
    return CSP_META_RE.sub(NEW_CSP_TAG, html, count=1)

def process_repo(root: str):
    total_html  = 0
    fixed       = []
    already_ok  = 0
    no_csp      = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        for filename in filenames:
            if not filename.lower().endswith(".html"):
                continue

            filepath = os.path.join(dirpath, filename)
            total_html += 1

            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()

            if not has_csp(original):
                no_csp += 1
                continue

            if already_correct(original):
                already_ok += 1
                continue

            patched = apply_fix(original)
            rel = os.path.relpath(filepath, root)
            fixed.append(rel)

            if not DRY_RUN:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(patched)

    mode = "[DRY RUN] " if DRY_RUN else ""
    print(f"\n{mode}CSP fix complete")
    print(f"  HTML files scanned   : {total_html}")
    print(f"  Fixed                : {len(fixed)}")
    print(f"  Already correct      : {already_ok}")
    print(f"  No CSP tag (skipped) : {no_csp}")

    if fixed:
        print("\nFixed files:")
        for p in fixed:
            print(f"  ✓ {p}")

if __name__ == "__main__":
    print(f"Root: {os.path.abspath(ROOT)}")
    process_repo(ROOT)