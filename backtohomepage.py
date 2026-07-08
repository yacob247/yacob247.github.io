"""
add_home_nav.py
───────────────
Adds a hover-reveal "Back to [Folder]" link to every HTML page,
linking back to the index.html inside the SAME folder as each file.

HOW TO USE
──────────
1. Copy into your site root folder (same level as index.html)
2. Run:   python add_home_nav.py
3. Dry-run preview:  python add_home_nav.py --dry-run
"""

import os, sys, re

SITE_ROOT = os.path.dirname(os.path.abspath(__file__))

SKIP_ROOT_FILES = {"index.html","about.html","terms.html","privacy.html","contact.html"}

MARKER = "<!-- FOLDER NAV BAR - injected by add_home_nav.py -->"

# NOTE: CSS braces are doubled ({{ }}) to escape Python's str.format()
NAV_TEMPLATE = """
<!-- FOLDER NAV BAR - injected by add_home_nav.py -->
<style>
#envizion-folder-nav {{
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 20px;
    pointer-events: none;
}}
#envizion-folder-nav a {{
    color: rgba(160,168,184,0);
    text-decoration: none;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    letter-spacing: 0.03em;
    pointer-events: all;
    transition: color 0.3s ease;
}}
#envizion-folder-nav:hover a,
#envizion-folder-nav a:focus {{
    color: rgba(160,168,184,1);
}}
#envizion-folder-nav a:hover {{
    color: #ffffff;
}}
</style>
<div id="envizion-folder-nav">
    <a href="{url}">{label}</a>
</div>
<!-- END FOLDER NAV BAR -->
"""

def should_skip(filepath):
    rel = os.path.relpath(filepath, SITE_ROOT).replace("\\", "/")
    filename = os.path.basename(rel).lower()
    if filename == "index.html": return True
    if rel.count("/") == 0 and filename in SKIP_ROOT_FILES: return True
    return False

def nav_html_for(filepath):
    folder_name = os.path.basename(os.path.dirname(filepath))
    if not folder_name or folder_name == os.path.basename(SITE_ROOT):
        label = "\u2190 Back to Home"
    else:
        label = f"\u2190 Back to {folder_name.replace('-',' ').replace('_',' ').title()}"
    return NAV_TEMPLATE.format(url="index.html", label=label)

def inject(html, nav):
    if MARKER in html: return html, False
    m = re.search(r"(</body\s*>)", html, re.IGNORECASE)
    if m:
        return html[:m.start()] + nav + "\n" + html[m.start():], True
    return html + "\n" + nav, True

def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run: print("DRY RUN - no files will be modified.\n")
    changed, skipped, already_done = [], [], []

    for root, dirs, files in os.walk(SITE_ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for fname in files:
            if not fname.lower().endswith(".html"): continue
            filepath = os.path.join(root, fname)
            if should_skip(filepath):
                skipped.append(os.path.relpath(filepath, SITE_ROOT)); continue
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()
            new_html, was_changed = inject(original, nav_html_for(filepath))
            if not was_changed:
                already_done.append(os.path.relpath(filepath, SITE_ROOT)); continue
            if not dry_run:
                with open(filepath, "w", encoding="utf-8") as f: f.write(new_html)
            changed.append(os.path.relpath(filepath, SITE_ROOT))

    print(f"{'[DRY RUN] ' if dry_run else ''}Results\n" + "="*60)
    print(f"\n  {'Would update' if dry_run else 'Updated'} ({len(changed)} files):")
    for p in sorted(changed): print(f"    {p}")
    if already_done:
        print(f"\n  Already done ({len(already_done)} files):")
        for p in sorted(already_done): print(f"    {p}")
    print(f"\n  Skipped ({len(skipped)} files):")
    for p in sorted(skipped): print(f"    {p}")
    print(f"\nDone. {len(changed)} file(s) {'would be ' if dry_run else ''}updated.")

if __name__ == "__main__":
    main()