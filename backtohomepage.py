"""
add_home_nav.py
───────────────
Adds a sticky "Back to Homepage" footer bar to every HTML page on
envizion.work EXCEPT the pages listed in SKIP_FILES.

HOW TO USE
──────────
1.  Copy this script into the root of your local website folder
    (the same folder that contains index.html, tools/, tools2/, etc.)
2.  Run:  python add_home_nav.py
3.  The script will edit every qualifying .html file in-place and
    print a summary of what it changed.

To do a DRY RUN first (see what would change without touching files):
    python add_home_nav.py --dry-run
"""

import os
import sys
import re

# ── Configuration ────────────────────────────────────────────────────────────

# Root of your website folder (the script auto-detects this as its own directory)
SITE_ROOT = os.path.dirname(os.path.abspath(__file__))

# Files to SKIP entirely (relative paths from SITE_ROOT, case-insensitive)
SKIP_FILES = {
    "index.html",
    "about.html",
    "terms.html",
    "privacy.html",
    "contact.html",
}

# Also skip any file whose path contains these folder segments
# (add more if you have other top-level sections you want left alone)
SKIP_FOLDERS = set()  # e.g. {"drafts", "admin"}

# The homepage URL the back-link points to
HOMEPAGE_URL = "https://envizion.work/"
HOMEPAGE_LABEL = "← Back to Homepage"

# ── The injected HTML snippet ────────────────────────────────────────────────
# A minimal, non-intrusive sticky footer bar that won't clash with dark UIs.
# Inlined so the script is fully self-contained (no external CSS file needed).

NAV_HTML = """
<!-- HOME NAV BAR – injected by add_home_nav.py -->
<div id="envizion-home-nav" style="
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    background: rgba(15, 15, 20, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-sizing: border-box;
">
    <a href="{url}" style="
        color: #a0a8b8;
        text-decoration: none;
        font-size: 13px;
        letter-spacing: 0.02em;
        transition: color 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    "
    onmouseover="this.style.color='#ffffff'"
    onmouseout="this.style.color='#a0a8b8'"
    >{label}</a>

    <button onclick="document.getElementById('envizion-home-nav').style.display='none'"
        title="Dismiss"
        style="
            position: absolute;
            right: 16px;
            background: none;
            border: none;
            color: #555;
            font-size: 16px;
            cursor: pointer;
            line-height: 1;
            padding: 2px 6px;
        "
        onmouseover="this.style.color='#aaa'"
        onmouseout="this.style.color='#555'"
    >✕</button>
</div>
<!-- END HOME NAV BAR -->
""".format(url=HOMEPAGE_URL, label=HOMEPAGE_LABEL)

MARKER = "<!-- HOME NAV BAR – injected by add_home_nav.py -->"

# ── Helpers ──────────────────────────────────────────────────────────────────

def should_skip(filepath: str) -> bool:
    """Return True if this file should be left untouched."""
    rel = os.path.relpath(filepath, SITE_ROOT).replace("\\", "/")

    # Check explicit skip list (match on the filename part or full rel path)
    filename = os.path.basename(rel).lower()
    if filename in SKIP_FILES:
        return True

    # Check skip folders
    parts = rel.lower().split("/")
    for part in parts[:-1]:  # folder segments only
        if part in SKIP_FOLDERS:
            return True

    return False


def inject(html: str) -> tuple[str, bool]:
    """
    Insert NAV_HTML just before </body>.
    Returns (new_html, was_changed).
    If the marker is already present the file is left unchanged.
    """
    if MARKER in html:
        return html, False  # already injected

    # Try to insert before </body>
    pattern = re.compile(r"(</body\s*>)", re.IGNORECASE)
    match = pattern.search(html)
    if match:
        new_html = html[: match.start()] + NAV_HTML + "\n" + html[match.start():]
        return new_html, True

    # No </body> tag? Append to end of file.
    new_html = html + "\n" + NAV_HTML
    return new_html, True


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("DRY RUN — no files will be modified.\n")

    changed, skipped, already_done = [], [], []

    for root, dirs, files in os.walk(SITE_ROOT):
        # Skip hidden directories (e.g. .git)
        dirs[:] = [d for d in dirs if not d.startswith(".")]

        for fname in files:
            if not fname.lower().endswith(".html"):
                continue

            filepath = os.path.join(root, fname)

            if should_skip(filepath):
                skipped.append(os.path.relpath(filepath, SITE_ROOT))
                continue

            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()

            new_html, was_changed = inject(original)

            if not was_changed:
                already_done.append(os.path.relpath(filepath, SITE_ROOT))
                continue

            if not dry_run:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_html)

            changed.append(os.path.relpath(filepath, SITE_ROOT))

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"{'[DRY RUN] ' if dry_run else ''}Results")
    print("=" * 60)

    print(f"\n✅  {'Would update' if dry_run else 'Updated'} ({len(changed)} files):")
    for p in sorted(changed):
        print(f"    {p}")

    if already_done:
        print(f"\n⏭   Already had nav bar ({len(already_done)} files):")
        for p in sorted(already_done):
            print(f"    {p}")

    print(f"\n⏭   Skipped / exempt ({len(skipped)} files):")
    for p in sorted(skipped):
        print(f"    {p}")

    print(f"\nDone. {len(changed)} file(s) {'would be ' if dry_run else ''}updated.")


if __name__ == "__main__":
    main()