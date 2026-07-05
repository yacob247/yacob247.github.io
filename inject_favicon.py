import os, re

# ── CONFIG ──────────────────────────────────────────────────────────────────
# Path to your logo relative to the repo root (adjust if needed)
LOGO_PATH = "/logo.png"   # e.g. if it lives at repo root
# If the logo is in a subfolder, use something like "/assets/logo.png"
# ────────────────────────────────────────────────────────────────────────────

FAVICON_TAG = f'<link rel="icon" type="image/png" href="{LOGO_PATH}">'

# Matches any existing favicon/shortcut icon link tags
EXISTING_FAVICON = re.compile(
    r'<link[^>]+rel=["\'](?:icon|shortcut icon)["\'][^>]*>',
    re.IGNORECASE
)

def process_file(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()

    original = html

    if EXISTING_FAVICON.search(html):
        # Replace any existing favicon tag
        html = EXISTING_FAVICON.sub(FAVICON_TAG, html, count=1)
        # Remove any extra favicon tags if there were duplicates
        html = EXISTING_FAVICON.sub("", html)
    elif "<head>" in html.lower():
        # Inject after <head>
        html = re.sub(r'(<head[^>]*>)', r'\1\n  ' + FAVICON_TAG, html, count=1, flags=re.IGNORECASE)
    else:
        # No <head> at all — skip
        return False

    if html != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return True
    return False

count = 0
skipped = 0
for root, dirs, files in os.walk("."):
    # Skip hidden folders like .git
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for file in files:
        if file.endswith(".html"):
            path = os.path.join(root, file)
            result = process_file(path)
            if result:
                print(f"  ✓  {path}")
                count += 1
            else:
                skipped += 1

print(f"\nDone — {count} files updated, {skipped} skipped (no <head> or already correct)")
