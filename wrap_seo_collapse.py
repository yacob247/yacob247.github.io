"""
wrap_seo_collapse.py
--------------------
Run this from your repo root (where index.html lives, next to tools/, tools2/, reviews-blog/).
It finds every .html file recursively, and wraps the static SEO block in a collapse toggle.

Usage:
    python3 wrap_seo_collapse.py
    python3 wrap_seo_collapse.py --dry-run   # preview changes without writing
"""

import os
import re
import sys
import argparse

START = "<!-- ENVIZION_STATIC_SEO_START -->"
END   = "<!-- ENVIZION_STATIC_SEO_END -->"

# Already-wrapped guard string — skip files that already have the toggle
GUARD = "envizion-seo-collapse-toggle"

COLLAPSE_OPEN = """\
<!-- ENVIZION_SEO_COLLAPSE_START -->
<div class="envizion-seo-collapse">
  <button class="envizion-seo-collapse-toggle" aria-expanded="false" onclick="(function(b){var p=b.parentElement,c=p.querySelector('.envizion-seo-collapse-body');var open=b.getAttribute('aria-expanded')==='true';c.style.display=open?'none':'block';b.setAttribute('aria-expanded',open?'false':'true');b.querySelector('.envizion-seo-toggle-label').textContent=open?'What is this page about?':'Hide page info';})(this)" type="button" style="display:flex;align-items:center;gap:8px;cursor:pointer;background:none;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 14px;color:#b4b4b4;font-size:12px;font-family:inherit;margin:12px auto;transition:color .2s;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    <span class="envizion-seo-toggle-label">What is this page about?</span>
  </button>
  <div class="envizion-seo-collapse-body" style="display:none;">
"""

COLLAPSE_CLOSE = """\
  </div>
</div>
<!-- ENVIZION_SEO_COLLAPSE_END -->
"""


def wrap_file(path, dry_run=False):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    if GUARD in content:
        return "skip"

    if START not in content or END not in content:
        return "no-block"

    # Extract the block between markers (inclusive)
    start_idx = content.index(START)
    end_idx   = content.index(END) + len(END)
    block     = content[start_idx:end_idx]

    # Build replacement: collapse wrapper around the entire block
    replacement = COLLAPSE_OPEN + block + "\n" + COLLAPSE_CLOSE

    new_content = content[:start_idx] + replacement + content[end_idx:]

    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)

    return "patched"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--root", default=".", help="Root directory to scan (default: current dir)")
    args = parser.parse_args()

    counts = {"patched": 0, "skip": 0, "no-block": 0, "error": 0}

    for dirpath, dirnames, filenames in os.walk(args.root):
        # Skip hidden dirs and node_modules
        dirnames[:] = [d for d in dirnames if not d.startswith(".") and d != "node_modules"]
        for fname in filenames:
            if not fname.endswith(".html"):
                continue
            fpath = os.path.join(dirpath, fname)
            try:
                result = wrap_file(fpath, dry_run=args.dry_run)
                counts[result] += 1
                if result == "patched":
                    label = "[DRY RUN] would patch" if args.dry_run else "PATCHED"
                    print(f"  {label}: {fpath}")
            except Exception as e:
                counts["error"] += 1
                print(f"  ERROR: {fpath} — {e}")

    print()
    print(f"Results: {counts['patched']} patched, {counts['skip']} already done, "
          f"{counts['no-block']} no SEO block, {counts['error']} errors")


if __name__ == "__main__":
    main()
