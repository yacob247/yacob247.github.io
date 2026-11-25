"""
fix_rel_attributes.py
---------------------
Scans every .html file in the repo (all folders, recursively) and:

1. Finds every <a> tag that points to an external URL (href starts with http/https)
2. If rel is missing entirely → adds rel="noopener noreferrer"
3. If rel="noopener" only → upgrades to rel="noopener noreferrer"
4. If rel already contains both → leaves it alone

Run from the root of your repo:
    python fix_rel_attributes.py

Or point it at a specific folder:
    python fix_rel_attributes.py /path/to/your/repo
"""

import os
import re
import sys

# ── Config ────────────────────────────────────────────────────────────────────
ROOT = sys.argv[1] if len(sys.argv) > 1 else "."   # default: current directory
DRY_RUN = True   # set True to preview changes without writing files
# ─────────────────────────────────────────────────────────────────────────────


def fix_external_links(html: str) -> tuple[str, int]:
    """
    Returns (fixed_html, number_of_changes_made).
    Processes every <a ...> tag that has an external href.
    """
    changes = 0

    # Match any <a ...> tag (including multiline tags)
    # We capture the full tag so we can inspect and rewrite it
    def replace_tag(m: re.Match) -> str:
        nonlocal changes
        tag = m.group(0)

        # Only care about external links
        href_match = re.search(r'href\s*=\s*["\']?(https?://)', tag, re.IGNORECASE)
        if not href_match:
            return tag  # internal link or no href → skip

        # Check existing rel attribute
        rel_match = re.search(r'rel\s*=\s*(["\'])(.*?)\1', tag, re.IGNORECASE)

        if rel_match:
            rel_value = rel_match.group(2)
            has_noopener   = "noopener"   in rel_value
            has_noreferrer = "noreferrer" in rel_value

            if has_noopener and has_noreferrer:
                return tag  # already correct, nothing to do

            # Build the correct rel value
            parts = [p.strip() for p in rel_value.split() if p.strip()]
            if "noopener"   not in parts: parts.append("noopener")
            if "noreferrer" not in parts: parts.append("noreferrer")
            new_rel = " ".join(parts)

            # Replace the old rel="..." with the new value
            new_tag = tag[:rel_match.start()] + \
                      f'rel="{new_rel}"' + \
                      tag[rel_match.end():]
            changes += 1
            return new_tag

        else:
            # No rel attribute at all → inject before the closing >
            # Handle self-closing />  or plain >
            if tag.endswith("/>"):
                new_tag = tag[:-2] + ' rel="noopener noreferrer"/>'
            else:
                new_tag = tag[:-1] + ' rel="noopener noreferrer">'
            changes += 1
            return new_tag

    # Match opening <a> tags (not closing </a>)
    # re.DOTALL so . matches newlines (handles multiline attributes)
    fixed = re.sub(r'<a\s[^>]*>', replace_tag, html, flags=re.IGNORECASE | re.DOTALL)
    return fixed, changes


def process_repo(root: str):
    total_files   = 0
    total_changes = 0
    modified_files = []

    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden folders like .git
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        for filename in filenames:
            if not filename.lower().endswith(".html"):
                continue

            filepath = os.path.join(dirpath, filename)
            total_files += 1

            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                original = f.read()

            fixed, changes = fix_external_links(original)

            if changes > 0:
                total_changes += changes
                modified_files.append((filepath, changes))
                if not DRY_RUN:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(fixed)

    # ── Report ────────────────────────────────────────────────────────────────
    mode = "[DRY RUN] " if DRY_RUN else ""
    print(f"\n{mode}Scan complete")
    print(f"  HTML files scanned : {total_files}")
    print(f"  Files modified     : {len(modified_files)}")
    print(f"  Links fixed        : {total_changes}")

    if modified_files:
        print("\nModified files:")
        for path, count in modified_files:
            rel = os.path.relpath(path, root)
            print(f"  {count:>3} fix(es)  →  {rel}")
    else:
        print("\nNo changes needed — all external links already have correct rel attributes.")


if __name__ == "__main__":
    print(f"Root directory : {os.path.abspath(ROOT)}")
    print(f"Dry run        : {DRY_RUN}")
    process_repo(ROOT)