"""
fix_csp_final.py
----------------
THE FINAL CSP fix. Built from scanning every domain across all 94 HTML files.
Replaces ANY existing CSP <meta> tag with the complete version below.

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

# ── THE FINAL CSP ─────────────────────────────────────────────────────────────
NEW_CSP_CONTENT = (
    "default-src 'self'; "

    # Scripts — every CDN + analytics + ads used across the site
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
        "https://cdn.tailwindcss.com "
        "https://cdn.jsdelivr.net "
        "https://cdnjs.cloudflare.com "
        "https://unpkg.com "
        "https://esm.sh "
        "https://raw.githack.com "
        "https://www.googletagmanager.com "
        "https://www.google-analytics.com "
        "https://pagead2.googlesyndication.com "
        "https://fundingchoicesmessages.google.com "
        "https://script.google.com; "

    # Styles — Google Fonts + CDN libraries (Font Awesome etc.)
    "style-src 'self' 'unsafe-inline' "
        "https://fonts.googleapis.com "
        "https://cdn.jsdelivr.net "
        "https://cdnjs.cloudflare.com "
        "https://unpkg.com; "

    # Fonts — Google Fonts + CDN icon fonts
    "font-src 'self' "
        "https://fonts.gstatic.com "
        "https://cdn.jsdelivr.net "
        "https://cdnjs.cloudflare.com; "

    # Images — all image sources found across the site
    "img-src 'self' data: blob: "
        "https://images.unsplash.com "
        "https://repository-images.githubusercontent.com "
        "https://raw.githubusercontent.com "
        "https://image.pollinations.ai "
        "https://image.tmdb.org "
        "https://img.youtube.com "
        "https://covers.openlibrary.org "
        "https://randomuser.me "
        "https://placehold.co "
        "https://tile.openstreetmap.org "
        "https://pagead2.googlesyndication.com "
        "https://*.googlesyndication.com "
        "https://*.doubleclick.net "
        "https://www.gstatic.com; "

    # Media — blob: for WaveSurfer / audio / video tools
    "media-src 'self' blob: "
        "https://audio.pollinations.ai; "

    # Workers — blob: for mp4tomp3, ffmpeg, and other web workers
    "worker-src 'self' blob:; "

    # Fetch / XHR — every API and external service called from JS
    "connect-src 'self' blob: "
        "https://api.envizion.work "
        "https://train.envizion.work "
        "https://multipleimagesbackgroundremover.envizion.work "
        "https://api.allorigins.win "
        "https://api.dictionaryapi.dev "
        "https://api.fda.gov "
        "https://api.github.com "
        "https://api.lsm.link "
        "https://api.nasa.gov "
        "https://api.open-meteo.com "
        "https://api.themoviedb.org "
        "https://audio.pollinations.ai "
        "https://image.pollinations.ai "
        "https://cdn.jsdelivr.net "
        "https://cdnjs.cloudflare.com "
        "https://unpkg.com "
        "https://esm.sh "
        "https://raw.githubusercontent.com "
        "https://raw.githack.com "
        "https://ipapi.co "
        "https://itunes.apple.com "
        "https://open.er-api.com "
        "https://openlibrary.org "
        "https://covers.openlibrary.org "
        "https://p.oceansaver.in "
        "https://pokeapi.co "
        "https://restcountries.com "
        "https://swapi.dev "
        "https://v2.jokeapi.dev "
        "https://zenquotes.io "
        "https://noembed.com "
        "https://newsapi.org "
        "https://loader.to "
        "https://search.projectsegfau.lt "
        "https://searx.be "
        "https://static.seeles.ai "
        "https://yacob-okour14342-llama-engine.hf.space "
        "https://www.themealdb.com "
        "https://www.googleapis.com "
        "https://upload.googleapis.com "
        "https://www.google-analytics.com "
        "https://ep1.adtrafficquality.google "
        "https://fundingchoicesmessages.google.com "
        "https://*.googlesyndication.com "
        "https://*.doubleclick.net; "

    # Frames — AdSense, Google Docs embeds
    "frame-src 'self' "
        "https://googleads.g.doubleclick.net "
        "https://*.googlesyndication.com "
        "https://docs.google.com "
        "https://www.youtube.com "
        "https://sandbox.babylonjs.com "
        "https://yacob-okour14342-llama-engine.hf.space; "

    # Wasm — needed for ffmpeg, BabylonJS, image processing tools
    "wasm-src 'self' blob: "
        "https://cdn.jsdelivr.net "
        "https://unpkg.com "
        "https://esm.sh; "
)

NEW_CSP_TAG = (
    '<meta http-equiv="Content-Security-Policy" '
    f'content="{NEW_CSP_CONTENT}">'
)

CSP_META_RE = re.compile(
    r'<meta\s[^>]*http-equiv\s*=\s*["\']Content-Security-Policy["\'][^>]*/?>',
    re.IGNORECASE | re.DOTALL
)

def has_csp(html: str) -> bool:
    return bool(CSP_META_RE.search(html))

def already_correct(html: str) -> bool:
    checks = [
        "ep1.adtrafficquality.google",
        "worker-src",
        "media-src",
        "wasm-src",
        "yacob-okour14342-llama-engine.hf.space",
        "api.open-meteo.com",
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
    print(f"  HTML files scanned : {total_html}")
    print(f"  Fixed              : {len(fixed)}")
    print(f"  Already correct    : {already_ok}")
    print(f"  No CSP (skipped)   : {no_csp}")
    if fixed:
        print("\nFixed files:")
        for p in fixed:
            print(f"  ✓ {p}")

if __name__ == "__main__":
    print(f"Root: {os.path.abspath(ROOT)}")
    process_repo(ROOT)