"""
fix_csp_final.py
----------------
FINAL comprehensive CSP fix for all .html files.

Replaces ANY existing CSP <meta> tag with the fully-corrected version
that covers every third-party resource used across the Envizion/Yacob site.

What's covered and why:
  script-src  + https://pagead2.googlesyndication.com   (AdSense script)
  style-src   + https://cdnjs.cloudflare.com            (Font Awesome, etc.)
  frame-src   + https://googleads.g.doubleclick.net     (AdSense iframes)
               + https://*.googlesyndication.com
  connect-src + blob:                                   (WaveSurfer fetch)
               + https://unpkg.com                      (source maps)
               + https://ep1.adtrafficquality.google    (AdSense telemetry)
               + https://*.googlesyndication.com
               + https://*.doubleclick.net
  media-src   + blob:                                   (WaveSurfer playback)
  worker-src  + blob:                                   (mp4tomp3 web worker)

Run from repo root:
    python fix_csp_final.py

Or pass a path:
    python fix_csp_final.py C:\\path\\to\\site

Preview without writing:
    Set DRY_RUN = True
"""

import os
import re
import sys

ROOT    = sys.argv[1] if len(sys.argv) > 1 else "."
DRY_RUN = False

# ── THE ONE TRUE CSP ──────────────────────────────────────────────────────────
NEW_CSP_CONTENT = (
    "default-src 'self'; "

    "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
        "https://cdn.tailwindcss.com "
        "https://unpkg.com "
        "https://cdnjs.cloudflare.com "
        "https://www.googletagmanager.com "
        "https://www.google-analytics.com "
        "https://pagead2.googlesyndication.com; "

    "style-src 'self' 'unsafe-inline' "
        "https://fonts.googleapis.com "
        "https://cdnjs.cloudflare.com; "

    "font-src 'self' "
        "https://fonts.gstatic.com "
        "https://cdnjs.cloudflare.com; "

    "img-src 'self' data: blob: "
        "https://images.unsplash.com "
        "https://repository-images.githubusercontent.com "
        "https://pagead2.googlesyndication.com "
        "https://*.googlesyndication.com "
        "https://*.doubleclick.net; "

    "media-src 'self' blob:; "

    "worker-src 'self' blob:; "

    "connect-src 'self' blob: "
        "https://unpkg.com "
        "https://cdnjs.cloudflare.com "
        "https://www.google-analytics.com "
        "https://ep1.adtrafficquality.google "
        "https://*.googlesyndication.com "
        "https://*.doubleclick.net; "

    "frame-src 'self' "
        "https://googleads.g.doubleclick.net "
        "https://*.googlesyndication.com; "
)

NEW_CSP_TAG = (
    '<meta http-equiv="Content-Security-Policy" '
    f'content="{NEW_CSP_CONTENT}">'
)

# Matches any existing CSP meta tag (full tag, any attribute order)
CSP_META_RE = re.compile(
    r'<meta\s[^>]*http-equiv\s*=\s*["\']Content-Security-Policy["\'][^>]*/?>',
    re.IGNORECASE | re.DOTALL
)

def has_csp(html: str) -> bool:
    return bool(CSP_META_RE.search(html))

def already_correct(html: str) -> bool:
    """True only if every required piece is already present."""
    checks = [
        "cdnjs.cloudflare.com",
        "googleads.g.doubleclick.net",
        "ep1.adtrafficquality.google",
        "worker-src",
        "media-src",
    ]
    return all(c in html for c in checks)

def apply_fix(html: str) -> str:
    return CSP_META_RE.sub(NEW_CSP_TAG, html, count=1)


def process_repo(root: str):
    total_html = 0
    fixed      = []
    already_ok = 0
    no_csp     = 0

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
    print(f"\n{mode}Final CSP fix complete")
    print(f"  HTML files scanned   : {total_html}")
    print(f"  Fixed                : {len(fixed)}")
    print(f"  Already correct      : {already_ok}")
    print(f"  No CSP (skipped)     : {no_csp}")

    if fixed:
        print("\nFixed files:")
        for p in fixed:
            print(f"  ✓ {p}")

if __name__ == "__main__":
    print(f"Root: {os.path.abspath(ROOT)}")
    process_repo(ROOT)