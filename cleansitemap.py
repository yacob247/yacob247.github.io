"""
2_clean_sitemap.py
------------------
Removes junk, admin, draft, and internal-only URLs from sitemap.xml.

Rules for removal — a URL is removed if it matches ANY of:
  • Contains "admin"         (admin pages)
  • Contains "login"         (login pages)
  • Contains "signup"        (signup pages)
  • Contains "unsubscribe"   (email unsub pages)
  • Contains "EMAIL_"        (email notification pages)
  • Contains "copy"          (draft copies e.g. "index copy.html")
  • Contains "Untitled"      (unnamed/draft files)
  • Contains "geminicopy"    (AI draft copies)
  • Fragment-only URLs       (e.g. page.html#section — not real pages)
  • URL path has CAPS mixed oddly like "BlOg-PoSts" (obfuscated)
  • Contains long random strings (20+ char alphanumeric blobs in the path)

Run from your repo root (sitemap.xml must be in the same folder):
    python 2_clean_sitemap.py

Or pass a path:
    python 2_clean_sitemap.py /path/to/sitemap.xml

Preview without writing:
    Set DRY_RUN = True
"""

import os
import re
import sys
from xml.etree import ElementTree as ET

DRY_RUN      = False
SITEMAP_PATH = sys.argv[1] if len(sys.argv) > 1 else "sitemap.xml"

# ── Patterns that mark a URL as junk ─────────────────────────────────────────
JUNK_KEYWORDS = [
    "admin", "login", "signup", "unsubscribe",
    "EMAIL_", "geminicopy", "Untitled", "index copy",
]

def is_junk_url(url: str) -> tuple[bool, str]:
    """Returns (should_remove, reason)."""

    # Keyword match (case-insensitive for most, case-sensitive for EMAIL_)
    for kw in JUNK_KEYWORDS:
        if kw.lower() in url.lower() or kw in url:
            return True, f"contains '{kw}'"

    # Fragment-only anchor URLs (page.html#section — not a real page)
    # These are fine on the page itself but pollute sitemaps
    if re.search(r'\.html#.+', url):
        return True, "fragment/anchor URL"

    # Long random strings in the path (20+ consecutive alphanumerics)
    path = url.split("://", 1)[-1].split("/", 1)[-1]  # strip protocol + domain
    if re.search(r'[a-zA-Z0-9]{20,}', path):
        return True, "contains long random string in path"

    # Mixed-case obfuscation like "BlOg-PoSts"
    # Detect by checking if a path segment has alternating case (heuristic)
    segments = re.findall(r'[a-zA-Z]{4,}', path)
    for seg in segments:
        alternating = all(
            seg[i].isupper() != seg[i+1].isupper()
            for i in range(min(4, len(seg)-1))
        )
        if alternating:
            return True, f"mixed-case obfuscation in '{seg}'"

    return False, ""


def clean_sitemap(sitemap_path: str):
    if not os.path.exists(sitemap_path):
        print(f"ERROR: File not found: {sitemap_path}")
        return

    # Parse preserving namespaces
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    tree = ET.parse(sitemap_path)
    root = tree.getroot()

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    kept    = []
    removed = []

    for url_el in root.findall("sm:url", ns):
        loc_el = url_el.find("sm:loc", ns)
        if loc_el is None:
            kept.append(url_el)
            continue

        loc = loc_el.text.strip() if loc_el.text else ""
        junk, reason = is_junk_url(loc)

        if junk:
            removed.append((loc, reason))
            root.remove(url_el)
        else:
            kept.append(url_el)

    # Report
    print(f"\nSitemap: {os.path.abspath(sitemap_path)}")
    print(f"  URLs kept    : {len(kept)}")
    print(f"  URLs removed : {len(removed)}")

    if removed:
        print("\nRemoved URLs:")
        for url, reason in removed:
            print(f"  [{reason}]  {url}")

    if not DRY_RUN and removed:
        # Write back with XML declaration
        tree.write(sitemap_path, encoding="unicode", xml_declaration=True)
        # Fix declaration encoding label (ET writes encoding="us-ascii" sometimes)
        with open(sitemap_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace(
            "<?xml version='1.0' encoding='us-ascii'?>",
            '<?xml version="1.0" encoding="UTF-8"?>'
        )
        with open(sitemap_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\nSitemap saved: {sitemap_path}")
    elif DRY_RUN:
        print("\n[DRY RUN] No changes written.")
    else:
        print("\nNothing to remove — sitemap is already clean.")


if __name__ == "__main__":
    clean_sitemap(SITEMAP_PATH)