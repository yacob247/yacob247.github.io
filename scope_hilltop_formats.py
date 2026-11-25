from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
MONETIZATION_START = "<!-- ENVIZION_MONETIZATION_START -->"
MONETIZATION_END = "<!-- ENVIZION_MONETIZATION_END -->"
NON_POP_MARKER = "<!-- ENVIZION_HILLTOP_NON_POP_FORMATS_V1 -->"
NON_POP_END = "<!-- END ENVIZION_HILLTOP_NON_POP_FORMATS_V1 -->"

EXCLUDED_NAMES = {
    "about.html",
    "contact.html",
    "disclaimer.html",
    "editorial-policy.html",
    "index.html",
    "privacy.html",
    "terms.html",
    "login.html",
    "signup.html",
    "unsubscribe.html",
    "404.html",
}

EXCLUDED_NAME_PARTS = (
    "index",
    "about",
    "contact",
    "privacy",
    "terms",
    "disclaimer",
    "editorial",
    "login",
    "signup",
    "unsubscribe",
    "admin",
    "404",
)

SKIP_DIR_PARTS = {
    ".git",
    ".agents",
    ".codex",
    "node_modules",
}

VAST_TAG = "https://subtle-injury.com/d.mOFCzWdrG/NcvdZDGOUT/kesmM9gudZGUDlfk/PITOcNzuNlDnAnwjMBD/kFttNmzeMr0UMsDVA-x/Mmwm"
VAST_TAG_2 = "https://subtle-injury.com/dGm-Fez/d.G_NvvnZAGjUP/Begm/9PuGZIUGlRkeP/T/cHzYNfDRAvwRMrDZkktDN/zxMK0UMxDpAex/MYy/ZCsQatWx1/pkdoDE0KxW"
VAST_TAG_3 = "https://subtle-injury.com/drmYFKz.d/GNNdvDZgGkUn/ceKmg9_uUZQUxlKkMPVT/ckzLN/D_Aww/MZD-k/t/N/zOM/0NMADvAAx/MJwF"
SMARTLINK = "https://plump-plastic.com/bk3OV_0XP.3BpJvCbnm/VjJ/ZcDq0R3OMvzUM/5tN/T/Ew3/LpTlcoz/M/zgk/1AMPjuE-"

COMPARISON_BLOCK = '''<!-- ENVIZION_AD_NETWORK_COMPARISON_PROMO_V1 -->
<aside class="envizion-ad-network-comparison-promo" aria-label="Envizion comparison tool" style="max-width:960px;margin:24px auto 0;padding:16px 18px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1e3a8a;clear:both;">
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
    <div><strong>Compare ad networks for your site</strong><br><span style="font-size:.9rem;">Use Envizion's free calculator—no Envizion account is required.</span></div>
    <a href="/guides/ad-network-comparison.html" style="display:inline-block;padding:9px 13px;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none;">Open comparison tool</a>
  </div>
</aside>'''

STATIC_BANNER = '''<!-- HILLTOPADS_STATIC_BANNER_V1 -->
<aside aria-label="Sponsored advertisement" class="envizion-hilltopads-static-banner" style="max-width:728px;margin:24px auto 0;padding:0;text-align:center;clear:both;">
  <a href="https://plump-plastic.com/AUu7Y4" target="_blank" rel="sponsored noopener" referrerpolicy="no-referrer-when-downgrade" style="display:block;color:#1d4ed8;text-decoration:none;">
    <span style="display:block;margin-bottom:6px;font:600 13px/1.4 system-ui,sans-serif;">Sponsored advertisement · View offer</span>
    <img src="https://static.hilltopads.com/other/banners/pub/huge_income/728x90.gif?v=1787300403" alt="Sponsored advertisement" width="728" height="90" loading="eager" decoding="async" style="display:block;max-width:100%;height:auto;margin:0 auto;border:0;">
  </a>
</aside>'''

NON_POP_BUNDLE = f'''{NON_POP_MARKER}
<section class="envizion-hilltop-formats" aria-label="Sponsored content" style="max-width:1100px;margin:20px auto;padding:10px;text-align:center;clear:both;position:relative;z-index:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;">
  <style>
    .envizion-hilltop-formats > .envizion-hilltop-left-rail, .envizion-hilltop-formats > .envizion-hilltop-right-rail {{ min-width:0; display:grid; gap:16px; align-content:start; align-items:start; width:100%; max-width:300px; padding:12px; border:1px solid #dbe3ef; border-radius:14px; background:#fff; box-shadow:0 8px 24px rgba(15,23,42,.08); transition:transform .22s ease, opacity .22s ease; }}
    .envizion-hilltop-formats > .envizion-hilltop-left-rail {{ justify-self:end; }}
    .envizion-hilltop-formats > .envizion-hilltop-right-rail {{ justify-self:start; }}
    .envizion-hilltop-formats .envizion-hilltop-left-rail > div, .envizion-hilltop-formats .envizion-hilltop-right-rail > div {{ min-width:0; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; overflow:hidden; }}
    .envizion-hilltop-formats [data-ad-status="unavailable"] {{ display:none !important; }}
    .envizion-hilltop-formats img, .envizion-hilltop-formats iframe, .envizion-hilltop-formats video {{ width:100%; max-width:100%; height:auto; }}
    .envizion-hilltop-formats iframe {{ height:250px; }}
    .envizion-hilltop-formats .envizion-hilltop-smartlink {{ justify-self:stretch; text-align:center; white-space:nowrap; }}
    .envizion-hilltop-rail-toggle {{ justify-self:end; border:0; border-radius:999px; padding:7px 12px; background:#0f172a; color:#fff; font:700 12px/1 system-ui,sans-serif; cursor:pointer; box-shadow:0 6px 16px rgba(15,23,42,.18); }}
    .envizion-hilltop-right-rail > .envizion-hilltop-rail-toggle {{ justify-self:start; }}
    .envizion-hilltop-left-rail.envizion-hilltop-collapsed {{ transform:translateX(calc(-100% + 56px)); opacity:.72; }}
    .envizion-hilltop-right-rail.envizion-hilltop-collapsed {{ transform:translateX(calc(100% - 56px)); opacity:.72; }}
    .envizion-hilltop-collapsed > :not(.envizion-hilltop-rail-toggle) {{ pointer-events:none; }}
    @media (max-width:760px) {{ .envizion-hilltop-formats {{ grid-template-columns:1fr; }} .envizion-hilltop-formats > .envizion-hilltop-left-rail, .envizion-hilltop-formats > .envizion-hilltop-right-rail {{ justify-self:stretch; max-width:none; }} }}
    @media (min-width:900px) {{
      body:has(.envizion-hilltop-layout):has(.page) {{ margin:0; display:grid !important; grid-template-columns:minmax(260px,1fr) minmax(0,860px) minmax(260px,1fr); column-gap:0; align-items:start; }}
      body:has(.envizion-hilltop-layout):has(.page) > nav.site-nav {{ grid-column:1/-1; grid-row:1; }}
      body:has(.envizion-hilltop-layout):has(.page) > main.page {{ grid-column:2; grid-row:2; width:100%; max-width:none; min-width:0; margin:0; }}
      body:has(.envizion-hilltop-layout):has(.page) > footer {{ grid-column:1/-1; grid-row:8; }}
      body:has(.envizion-hilltop-layout):has(.page) > .envizion-hilltop-layout {{ display:contents; }}
      body:has(.envizion-hilltop-layout):has(.page) .envizion-hilltop-layout > .envizion-ad-network-comparison-promo {{ grid-column:2; grid-row:3; width:100%; margin:20px 0 0; }}
      body:has(.envizion-hilltop-layout):has(.page) .envizion-hilltop-formats {{ display:contents !important; }}
      body:has(.envizion-hilltop-layout):has(.page) .envizion-hilltop-formats > .envizion-hilltop-left-rail {{ grid-column:1; grid-row:2/4; position:sticky; top:20px; justify-self:start; width:min(360px,100%); max-width:360px; border-radius:0 14px 14px 0; }}
      body:has(.envizion-hilltop-layout):has(.page) .envizion-hilltop-formats > .envizion-hilltop-right-rail {{ grid-column:3; grid-row:2/4; position:sticky; top:20px; justify-self:end; width:min(360px,100%); max-width:360px; border-radius:14px 0 0 14px; }}
    }}
  </style>
  <div class="envizion-hilltop-left-rail">
    <button type="button" class="envizion-hilltop-rail-toggle" aria-expanded="true" onclick="var rail=this.closest('.envizion-hilltop-left-rail, .envizion-hilltop-right-rail'); var c=rail.classList.toggle('envizion-hilltop-collapsed'); this.textContent=c?'Show ads':'Hide ads'; this.setAttribute('aria-expanded',(!c).toString());">Hide ads</button>
    {STATIC_BANNER}
  <div class="envizion-hilltop-push" data-format="push">
    <script>
    (function(vyq){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = vyq || {{}};
      s.src = "//relieved-understanding.com/bUXWV.sQdCGnl/0dYsWocf/WeCmr9/uVZYUrl/kTPcTBcFzdMgz/kR5/Ngz/cgteNczeM/zBOfTNk/4YMKQV";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  <div class="envizion-hilltop-additional-1" data-format="additional">
    <script>
    (function(cfvbq){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = cfvbq || {{}};
      s.src = "//relieved-understanding.com/b.XAVbscdWGulD0/YuWicf/Me/m/9RugZ_UwlqkyPVTycQz-N/D/Ibw/MvDBUmtRN/zLMH0wMTjQAAwCOiQG";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  <div class="envizion-hilltop-additional-2" data-format="additional">
    <script>
    (function(hfzm){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = hfzm || {{}};
      s.src = "//relieved-understanding.com/brXZV.sPdDG_la0OYEWlcD/EeTmF9auoZjUXlikNPrT-cnziN-D/EG5/OTDWk/tdNHzeMH0/M/TFkQ5AMCwl";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  <div class="envizion-hilltop-additional-3" data-format="additional">
    <script>
    (function(hfzm){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = hfzm || {{}};
      s.src = "//relieved-understanding.com/btXTVhsFd.G/lG0OYHWNcm/delmj9VukZdUIlYkWPDTic/z/N/DAE/5oNZzdMbtBNFz/Mm0/METlkS3_N-wc";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  </div>
  <div class="envizion-hilltop-right-rail">
    <button type="button" class="envizion-hilltop-rail-toggle" aria-expanded="true" onclick="var rail=this.closest('.envizion-hilltop-left-rail, .envizion-hilltop-right-rail'); var c=rail.classList.toggle('envizion-hilltop-collapsed'); this.textContent=c?'Show ads':'Hide ads'; this.setAttribute('aria-expanded',(!c).toString());">Hide ads</button>
  <div class="envizion-hilltop-additional-5" data-format="additional">
    <script>
    (function(hfzm){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = hfzm || {{}};
      s.src = "//relieved-understanding.com/bbX/VAs.dwG/l/0UYPWNco/yeuma9/uMZ-UWlCkkP/TWc/zMNkD/IbwdM/DRUqtgNxzJMd0/MpjeA/wKO/QB";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  <div class="envizion-hilltop-video-slider" data-format="video-slider">
    <script>
    (function(aq){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = aq || {{}};
      s.src = "//relieved-understanding.com/boXPVms.dVGAld0fY/WCcv/IejmT9huGZVUFlGkRP/TfcjzLMPz-kC5FO/TGM/t/N/zbM_zpO/TKkW5iN/wF";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  <div class="envizion-hilltop-additional-4" data-format="additional">
    <script>
    (function(hfzm){{
      var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
      s.settings = hfzm || {{}};
      s.src = "//relieved-understanding.com/bcXPV.sxdjGjlU0SYrWecF/Vefm/9XuFZCUtlnkVPVTecizzMBzGkY0LNTziMmtQN/zlMYzeOZTwQk3/Nawm";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      l.parentNode.insertBefore(s, l);
    }})({{}});
    </script>
  </div>
  <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="{VAST_TAG}"></div>
  <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="{VAST_TAG_2}"></div>
  <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="{VAST_TAG_3}"></div>
  <a class="envizion-hilltop-smartlink" href="{SMARTLINK}" target="_blank" rel="sponsored noopener" referrerpolicy="no-referrer-when-downgrade" style="display:inline-block;margin:12px auto 0;padding:9px 14px;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none;">View sponsored offer</a>
  </div>
</section>
<script src="/ad-recovery.js" defer></script>
<!-- END ENVIZION_HILLTOP_NON_POP_FORMATS_V1 -->'''


def is_excluded_name(path: Path) -> bool:
    name = path.name.lower()
    stem = path.stem.lower()
    return name in EXCLUDED_NAMES or any(part in stem for part in EXCLUDED_NAME_PARTS)


def is_target(path: Path) -> bool:
    rel = path.relative_to(ROOT).parts
    if any(part.lower() in SKIP_DIR_PARTS for part in rel):
        return False
    return path.suffix.lower() == ".html" and not is_excluded_name(path)


def remove_old_block(html: str) -> str:
    return re.sub(
        rf"\s*{re.escape(MONETIZATION_START)}.*?{re.escape(MONETIZATION_END)}\s*",
        "\n",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )


def allow_sources(html: str) -> str:
    additions = {
        "script-src": ["https://relieved-understanding.com"],
        "connect-src": ["https://relieved-understanding.com", "https://subtle-injury.com"],
        "frame-src": ["https://relieved-understanding.com", "https://subtle-injury.com"],
    }
    for directive, domains in additions.items():
        def update(match: re.Match[str]) -> str:
            value = match.group(1)
            for domain in domains:
                if domain not in value:
                    value += " " + domain
            return value + match.group(2)

        html = re.sub(rf"({re.escape(directive)}\s+[^;]*)(;)", update, html, flags=re.IGNORECASE)
    return html


def insert_formats(html: str) -> str:
    html = remove_old_block(html)
    static_banner = "" if "static.hilltopads.com" in html else STATIC_BANNER
    full_bundle = f"{MONETIZATION_START}\n<div class=\"envizion-hilltop-layout\">\n{COMPARISON_BLOCK}\n{NON_POP_BUNDLE}\n</div>\n{MONETIZATION_END}"
    main = re.search(r"</\s*main\s*>", html, flags=re.IGNORECASE)
    footer = re.search(r"<\s*footer\b[^>]*>", html, flags=re.IGNORECASE)

    # Keep ads outside the page content. If a footer is nested in <main>, place
    # the bundle after </main>; otherwise place it after the standalone footer.
    if footer and (not main or footer.start() > main.end()):
        return html[:footer.start()] + full_bundle + "\n" + html[footer.start():]
    if main:
        return html[:main.end()] + "\n" + full_bundle + html[main.end():]
    body = re.search(r"</\s*body\s*>", html, flags=re.IGNORECASE)
    if body:
        return html[:body.start()] + full_bundle + "\n" + html[body.start():]
    return html


def clean_excluded(html: str) -> str:
    html = remove_old_block(html)
    html = html.replace(" https://relieved-understanding.com", "")
    html = html.replace(" https://subtle-injury.com", "")
    html = html.replace(" https://static.hilltopads.com", "")
    return html


def trim_blank_line_whitespace(html: str) -> str:
    return re.sub(r"(?m)^[ \t]+$", "", html)


def main() -> None:
    target_count = 0
    excluded_cleaned = 0
    for path in ROOT.rglob("*.html"):
        if any(part.lower() in SKIP_DIR_PARTS for part in path.relative_to(ROOT).parts):
            continue
        original = path.read_text(encoding="utf-8", errors="ignore")
        target = is_target(path)
        if target:
            updated = insert_formats(allow_sources(remove_old_block(original)))
            target_count += 1
        else:
            updated = clean_excluded(original)
        updated = trim_blank_line_whitespace(updated)
        if updated != original:
            path.write_text(updated, encoding="utf-8", newline="")
            if not target:
                excluded_cleaned += 1
    print(f"Hilltop target pages: {target_count}; excluded pages cleaned: {excluded_cleaned}")


if __name__ == "__main__":
    main()
