#!/usr/bin/env python3
"""
fix_envizion.py — Auto-patches envizion.work / yacob247.github.io
Fixes: Cookie banner, CSP headers, Open Graph tags, Twitter meta, Search bar
Run from anywhere: python fix_envizion.py "C:\path\to\your\site"
"""

import os
import sys
import re
from pathlib import Path
from datetime import datetime

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
SITE_NAME    = "Envizion"
SITE_URL     = "https://envizion.work"
SITE_LOGO    = "/logo.png"
SITE_DESC    = "Envizion – Your digital workspace for tools, guides, and resources."
TWITTER_HANDLE = "@envizionwork"   # change if different

# Files/folders to skip entirely
SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}

# ─────────────────────────────────────────────
# COOKIE BANNER  (injected once, just before </body>)
# ─────────────────────────────────────────────
COOKIE_BANNER = """
<!-- ── Cookie Consent Banner ── -->
<div id="cookie-banner" style="
  display:none;
  position:fixed;bottom:0;left:0;right:0;z-index:99999;
  background:#1a1a2e;color:#e0e0e0;
  padding:16px 24px;
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
  gap:12px;font-family:inherit;font-size:14px;
  box-shadow:0 -2px 12px rgba(0,0,0,.4);
">
  <span style="flex:1;min-width:220px;">
    🍪 We use cookies to improve your experience and analyse site traffic.
    By clicking <strong>Accept</strong> you consent to our
    <a href="/privacy.html" style="color:#7eb3ff;">Privacy Policy</a> &amp;
    <a href="/terms.html"   style="color:#7eb3ff;">Terms</a>.
  </span>
  <div style="display:flex;gap:10px;flex-shrink:0;">
    <button onclick="cookieChoice('decline')" style="
      padding:8px 18px;border:1px solid #555;background:transparent;
      color:#ccc;border-radius:6px;cursor:pointer;font-size:13px;">
      Decline
    </button>
    <button onclick="cookieChoice('accept')" style="
      padding:8px 18px;border:none;background:#4f8ef7;
      color:#fff;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
      Accept All
    </button>
  </div>
</div>
<script>
(function(){
  var b = document.getElementById('cookie-banner');
  if(!localStorage.getItem('cookieConsent')) b.style.display='flex';
  window.cookieChoice = function(v){
    localStorage.setItem('cookieConsent', v);
    b.style.display='none';
  };
})();
</script>
<!-- ── End Cookie Consent Banner ── -->
"""

# ─────────────────────────────────────────────
# SEARCH BAR WIDGET  (injected once per file, before </body>)
# ─────────────────────────────────────────────
SEARCH_WIDGET = """
<!-- ── Site Search Widget ── -->
<div id="site-search-overlay" style="
  display:none;position:fixed;inset:0;z-index:99998;
  background:rgba(0,0,0,.7);backdrop-filter:blur(4px);
  align-items:flex-start;justify-content:center;padding-top:80px;">
  <div style="
    background:#1a1a2e;border-radius:12px;padding:24px;
    width:90%;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.5);">
    <input id="site-search-input" type="text" placeholder="Search Envizion…"
      style="width:100%;padding:12px 16px;border-radius:8px;border:1px solid #444;
             background:#0f0f1e;color:#fff;font-size:16px;box-sizing:border-box;"
      oninput="siteSearch(this.value)"
    />
    <div id="site-search-results" style="margin-top:12px;max-height:320px;overflow-y:auto;"></div>
    <p style="font-size:12px;color:#666;margin-top:8px;">
      Press <kbd>Esc</kbd> to close &nbsp;|&nbsp; Powered by site index
    </p>
  </div>
</div>
<script>
(function(){
  /* ---- page index ---- */
  var pages = [
    {t:'Home',          u:'/'},
    {t:'About',         u:'/about.html'},
    {t:'Contact',       u:'/contact.html'},
    {t:'Privacy Policy',u:'/privacy.html'},
    {t:'Terms of Service',u:'/terms.html'},
    {t:'Disclaimer',    u:'/disclaimer.html'},
    {t:'Editorial Policy',u:'/editorial-policy.html'},
    {t:'Guides',        u:'/guides/'},
    {t:'Encryption Guide',u:'/guides/encryption-guide.html'},
    {t:'File Formats Guide',u:'/guides/file-formats-guide.html'},
    {t:'Media Processing Guide',u:'/guides/media-processing-guide.html'},
    {t:'Privacy Tools Guide',u:'/guides/privacy-tools-guide.html'},
    {t:'Blog',          u:'/reviews-blog/blog.html'},
    {t:'Tools',         u:'/tools/'},
    {t:'Background Remover',u:'/tools/'},
    {t:'PDF Merger',    u:'/tools/'},
    {t:'Image Optimizer',u:'/tools/'},
    {t:'MP4 to MP3',    u:'/tools/'},
    {t:'Dictionary',    u:'/tools/'},
    {t:'Teleprompter',  u:'/tools/'},
    {t:'Video Watermarker',u:'/tools/'},
    {t:'3D Viewer',     u:'/tools2/'},
    {t:'Video Compressor',u:'/tools2/'},
    {t:'PDF Compressor',u:'/tools2/'},
    {t:'Image Resizer', u:'/tools2/'},
  ];

  window.siteSearch = function(q){
    var res = document.getElementById('site-search-results');
    if(!q.trim()){res.innerHTML='';return;}
    var hits = pages.filter(function(p){
      return p.t.toLowerCase().indexOf(q.toLowerCase()) > -1;
    });
    if(!hits.length){
      res.innerHTML='<p style="color:#888;font-size:14px;">No results found.</p>';
      return;
    }
    res.innerHTML = hits.map(function(p){
      return '<a href="'+p.u+'" style="display:block;padding:10px 12px;border-radius:6px;'+
             'color:#7eb3ff;text-decoration:none;font-size:15px;margin-bottom:4px;'+
             'background:#0f0f1e;border:1px solid #2a2a3e;">'+p.t+'</a>';
    }).join('');
  };

  /* ---- trigger button (adds a 🔍 icon to top-right) ---- */
  var btn = document.createElement('button');
  btn.innerHTML = '&#128269;';
  btn.title = 'Search site';
  btn.style.cssText = 'position:fixed;top:14px;right:16px;z-index:99997;'+
    'background:#4f8ef7;border:none;border-radius:50%;width:40px;height:40px;'+
    'font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);';
  btn.onclick = function(){ toggleSearch(true); };
  document.body.appendChild(btn);

  var ov = document.getElementById('site-search-overlay');
  window.toggleSearch = function(open){
    ov.style.display = open ? 'flex' : 'none';
    if(open) setTimeout(function(){ document.getElementById('site-search-input').focus(); },50);
  };
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape') toggleSearch(false);
  });
  ov.addEventListener('click', function(e){ if(e.target===ov) toggleSearch(false); });
})();
</script>
<!-- ── End Site Search Widget ── -->
"""

# ─────────────────────────────────────────────
# CSP <meta> tag
# ─────────────────────────────────────────────
CSP_META = (
    '<meta http-equiv="Content-Security-Policy" content="'
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com "
    "https://www.google-analytics.com https://pagead2.googlesyndication.com "
    "https://www.gstatic.com https://apis.google.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "frame-src https://www.youtube.com https://player.vimeo.com "
    "https://googleads.g.doubleclick.net; "
    "connect-src 'self' https://www.google-analytics.com https://firebase.googleapis.com;"
    '">'
)

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def og_block(title: str, url_path: str) -> str:
    full_url = SITE_URL + url_path
    return f"""
  <!-- Open Graph -->
  <meta property="og:type"        content="website">
  <meta property="og:site_name"   content="{SITE_NAME}">
  <meta property="og:title"       content="{title}">
  <meta property="og:description" content="{SITE_DESC}">
  <meta property="og:url"         content="{full_url}">
  <meta property="og:image"       content="{SITE_URL}{SITE_LOGO}">
  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:site"        content="{TWITTER_HANDLE}">
  <meta name="twitter:title"       content="{title}">
  <meta name="twitter:description" content="{SITE_DESC}">
  <meta name="twitter:image"       content="{SITE_URL}{SITE_LOGO}">"""


def extract_title(html: str) -> str:
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else SITE_NAME


def has_tag(html: str, pattern: str) -> bool:
    return bool(re.search(pattern, html, re.IGNORECASE))


def patch_file(filepath: Path, rel_url: str) -> dict:
    """Patch a single HTML file. Returns a report dict."""
    report = {"file": str(filepath), "changes": []}

    try:
        raw = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        report["error"] = str(e)
        return report

    html = raw
    title = extract_title(html)

    # ── 1. CSP ──────────────────────────────────────────
    if not has_tag(html, r'http-equiv=["\']Content-Security-Policy'):
        html = re.sub(r'(<head[^>]*>)', r'\1\n  ' + CSP_META, html, count=1, flags=re.IGNORECASE)
        report["changes"].append("CSP meta tag")

    # ── 2. Open Graph / Twitter ──────────────────────────
    missing_og = not has_tag(html, r'property=["\']og:title')
    missing_tw = not has_tag(html, r'name=["\']twitter:card')
    if missing_og or missing_tw:
        og = og_block(title, rel_url)
        html = re.sub(r'(</head>)', og + r'\n\1', html, count=1, flags=re.IGNORECASE)
        if missing_og: report["changes"].append("Open Graph tags")
        if missing_tw: report["changes"].append("Twitter Card tags")

    # ── 3. Cookie banner (before </body>) ────────────────
    if "cookie-banner" not in html:
        html = re.sub(r'(</body>)', COOKIE_BANNER + r'\n\1', html, count=1, flags=re.IGNORECASE)
        report["changes"].append("Cookie consent banner")

    # ── 4. Search widget (before </body>) ────────────────
    if "site-search-overlay" not in html:
        html = re.sub(r'(</body>)', SEARCH_WIDGET + r'\n\1', html, count=1, flags=re.IGNORECASE)
        report["changes"].append("Search widget")

    # ── Write back only if changed ───────────────────────
    if report["changes"]:
        filepath.write_text(html, encoding="utf-8")

    return report


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_envizion.py <path-to-site-root>")
        print(r'Example: python fix_envizion.py "C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main"')
        sys.exit(1)

    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"ERROR: Path not found: {root}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  Envizion Site Fixer  —  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Root: {root}")
    print(f"{'='*60}\n")

    all_html = []
    for dirpath, dirnames, filenames in os.walk(root):
        # prune skip dirs
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if fname.lower().endswith(".html") and fname not in SKIP_FILES:
                all_html.append(Path(dirpath) / fname)

    print(f"Found {len(all_html)} HTML files to process.\n")

    total_changes = 0
    for fp in sorted(all_html):
        rel = "/" + fp.relative_to(root).as_posix()
        rep = patch_file(fp, rel)
        if "error" in rep:
            print(f"  ✗  {rel}  →  ERROR: {rep['error']}")
        elif rep["changes"]:
            changes_str = ", ".join(rep["changes"])
            print(f"  ✓  {rel}")
            print(f"       + {changes_str}")
            total_changes += len(rep["changes"])
        else:
            print(f"  –  {rel}  (already compliant)")

    print(f"\n{'='*60}")
    print(f"  Done!  {total_changes} patches applied across {len(all_html)} files.")
    print(f"{'='*60}")
    print("""
Next steps:
  1. Open one of your HTML files in VS Code and confirm the patches look right.
  2. git add -A && git commit -m "fix: cookie banner, CSP, OG tags, search widget"
  3. git push origin main
  4. Resubmit to Google AdSense.
""")


if __name__ == "__main__":
    main()
