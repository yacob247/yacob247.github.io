"""
add_home_nav.py
───────────────
Centers the "Go Back Up" button horizontally and pins the blue folder navigation 
button to the bottom right corner at a 9px baseline. Both buttons remain hidden
until the user scrolls to the absolute bottom of the webpage.
"""

import os, sys, re

SITE_ROOT = os.path.dirname(os.path.abspath(__file__))
SKIP_ROOT_FILES = {"index.html","about.html","terms.html","privacy.html","contact.html"}
MARKER = "<!-- FOLDER NAV BAR - injected by add_home_nav.py -->"

NAV_TEMPLATE = """
<!-- FOLDER NAV BAR - injected by add_home_nav.py -->
<style>
.envizion-nav-element {{
    position: fixed;
    z-index: 99999;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 500;
    letter-spacing: 0.02em;
    padding: 10px 18px;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, background-color 0.2s ease, opacity 0.3s ease;
    opacity: 0;
    pointer-events: none; /* Block interactions until scrolled to bottom */
    cursor: pointer;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}}

/* Activated state toggled cleanly by JavaScript scroll monitor */
.envizion-nav-element.visible-at-bottom {{
    opacity: 0.4; /* Base visibility state when user is at the bottom */
    pointer-events: all;
}}

/* Go Back Up - Maintained height and horizontally centralized */
#envizion-scroll-up-btn {{
    bottom: 72px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    color: #000000;
    border: none;
}}
#envizion-scroll-up-btn.visible-at-bottom:hover,
#envizion-scroll-up-btn.visible-at-bottom:focus {{
    opacity: 1;
    background: #f0f0f0;
    transform: translateX(-50%) translateY(-2px);
}}
#envizion-scroll-up-btn:active {{
    transform: translateX(-50%) translateY(0);
}}

/* Folder Button - Pinned to bottom right corner, raised 9px from the bottom seam */
#envizion-folder-nav-btn {{
    bottom: 9px;
    right: 24px;
    background: #0055ff;
    color: #ffffff;
    text-decoration: none;
}}
#envizion-folder-nav-btn.visible-at-bottom:hover,
#envizion-folder-nav-btn.visible-at-bottom:focus {{
    opacity: 1;
    background: #0044cc;
    transform: translateY(-2px);
}}
#envizion-folder-nav-btn:active {{
    transform: translateY(0);
}}
</style>

<button id="envizion-scroll-up-btn" class="envizion-nav-element" onclick="window.scrollTo({{top: 0, behavior: 'smooth'}})">
    &#x2191; Go Back Up
</button>
<a id="envizion-folder-nav-btn" class="envizion-nav-element" href="{url}">{label}</a>

<script>
(function() {{
    const upBtn = document.getElementById('envizion-scroll-up-btn');
    const folderBtn = document.getElementById('envizion-folder-nav-btn');
    
    function checkScrollPosition() {{
        // Calculate document coordinates and viewport dimensions
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY || window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Triggers visibility when user is within 40px of the absolute page bottom
        if ((windowHeight + scrollY) >= (documentHeight - 40)) {{
            upBtn.classList.add('visible-at-bottom');
            folderBtn.classList.add('visible-at-bottom');
        }} else {{
            upBtn.classList.remove('visible-at-bottom');
            folderBtn.classList.remove('visible-at-bottom');
        }}
    }}

    window.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    // Initial run to verify height state on short pages
    document.addEventListener('DOMContentLoaded', checkScrollPosition);
    checkScrollPosition();
}})();
</script>
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

    print(f"Done. {len(changed)} file(s) updated with dynamic scroll monitoring behaviors.")

if __name__ == "__main__":
    main()
