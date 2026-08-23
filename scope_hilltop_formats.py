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

VAST_TAG = "https://subtle-injury.com/d.mOFCzWdrG/NcvdZDGOUT/kesmM9gudZGUDlfk/PITOcNzuNlDnAnwjMBD/kFttNmzeMr0UMsDVA-x/Mmwm"
VAST_TAG_2 = "https://subtle-injury.com/dGm-Fez/d.G_NvvnZAGjUP/Begm/9PuGZIUGlRkeP/T/cHzYNfDRAvwRMrDZkktDN/zxMK0UMxDpAex/MYy/ZCsQatWx1/pkdoDE0KxW"
VAST_TAG_3 = "https://subtle-injury.com/drmYFKz.d/GNNdvDZgGkUn/ceKmg9_uUZQUxlKkMPVT/ckzLN/D_Aww/MZD-k/t/N/zOM/0NMADvAAx/MJwF"
SMARTLINK = "https://plump-plastic.com/bk3OV_0XP.3BpJvCbnm/VjJ/ZcDq0R3OMvzUM/5tN/T/Ew3/LpTlcoz/M/zgk/1AMPjuE-"

COMPARISON_BLOCK = '''<!-- ENVIZION_AD_NETWORK_COMPARISON_PROMO_V1 -->
<aside aria-label="Envizion comparison tool" style="max-width:960px;margin:24px auto 0;padding:16px 18px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1e3a8a;clear:both;">
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
<section class="envizion-hilltop-formats" aria-label="Sponsored content" style="max-width:1100px;margin:20px auto;padding:10px;text-align:center;clear:both;position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start;">
  <style>
    .envizion-hilltop-formats > div {{ min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; overflow:hidden; }}
    .envizion-hilltop-formats img, .envizion-hilltop-formats iframe, .envizion-hilltop-formats video {{ max-width:100%; height:auto; }}
    .envizion-hilltop-formats .envizion-hilltop-smartlink {{ grid-column:1/-1; justify-self:center; }}
    @media (max-width:760px) {{ .envizion-hilltop-formats {{ grid-template-columns:1fr; }} .envizion-hilltop-formats .envizion-hilltop-smartlink {{ grid-column:auto; }} }}
  </style>
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
</section>
<script src="/ad-recovery.js" defer></script>
<!-- END ENVIZION_HILLTOP_NON_POP_FORMATS_V1 -->'''


def is_excluded_name(path: Path) -> bool:
    return path.name.lower() in EXCLUDED_NAMES or path.name.lower().startswith("index")


def is_target(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix().split("/")
    if not rel:
        return False
    top = rel[0].lower()
    if top == "game":
        return True
    if top in {"tools", "tools2", "guides"}:
        return not is_excluded_name(path)
    if top != "reviews-blog" or is_excluded_name(path):
        return False
    if len(rel) > 1 and rel[1].lower() in {"posts", "games"}:
        return True
    return path.name.lower() in {"blog.html", "blog-post.html", "game.html", "gamevaultoriginal.html"}


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
    full_bundle = f"{MONETIZATION_START}\n{COMPARISON_BLOCK}\n{static_banner}\n{NON_POP_BUNDLE}\n{MONETIZATION_END}"
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
    roots = [ROOT / "tools", ROOT / "tools2", ROOT / "reviews-blog", ROOT / "guides", ROOT / "Game"]
    target_count = 0
    excluded_cleaned = 0
    for base in roots:
        for path in base.rglob("*.html"):
            original = path.read_text(encoding="utf-8", errors="ignore")
            if is_target(path):
                updated = insert_formats(allow_sources(remove_old_block(original)))
                target_count += 1
            else:
                updated = clean_excluded(original)
            updated = trim_blank_line_whitespace(updated)
            if updated != original:
                path.write_text(updated, encoding="utf-8", newline="")
                if not is_target(path):
                    excluded_cleaned += 1
    print(f"Hilltop target pages: {target_count}; excluded pages cleaned: {excluded_cleaned}")


if __name__ == "__main__":
    main()
