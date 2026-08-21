"""Place Hilltop's requested non-pop formats and remove legacy popunders."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
MARKER = "ENVIZION_HILLTOP_NON_POP_FORMATS_V1"
VAST_TAG = "https://subtle-injury.com/d.mOFCzWdrG/NcvdZDGOUT/kesmM9gudZGUDlfk/PITOcNzuNlDnAnwjMBD/kFttNmzeMr0UMsDVA-x/Mmwm"
RECOVERY_TAG = '<script src="/ad-recovery.js" defer></script>'

HILLTOP_BUNDLE = f'''<!-- {MARKER} -->
<section class="envizion-hilltop-formats" aria-label="Sponsored content" style="max-width:960px;margin:20px auto;padding:10px;text-align:center;clear:both;">
  <div class="envizion-hilltop-push" data-format="push" aria-hidden="true">
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
  <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="{VAST_TAG}"></div>
</section>
<!-- END {MARKER} -->'''

POPUNDER_PATTERNS = [
    re.compile(r"\s*<!--\s*Envizion Shadow Protocol Pack\s*-->.*?<!--\s*End Envizion Shadow Protocol Pack\s*-->\s*", re.I | re.S),
    re.compile(r"\s*<!--\s*HilltopAds[^>]*Popunder[^>]*-->.*?</script>\s*", re.I | re.S),
    re.compile(r"\s*<!--\s*AdSterra[^>]*Popunder[^>]*-->.*?</script>\s*", re.I | re.S),
    re.compile(r"\s*<script\b[^>]*src\s*=\s*['\"][^'\"]*effectivecpmnetwork\.com[^'\"]*['\"][^>]*>\s*</script>\s*", re.I | re.S),
    re.compile(r"\s*//\s*3\.\s*SECURE SEAMLESS POPUNDER LAYER.*?(?=\n\s*\}\)\(\);\s*\n)", re.I | re.S),
]


def allow_hilltop_sources(html: str) -> str:
    directives = {
        "script-src": ["https://relieved-understanding.com"],
        "connect-src": ["https://relieved-understanding.com", "https://subtle-injury.com"],
        "frame-src": ["https://relieved-understanding.com", "https://subtle-injury.com"],
    }
    for directive, domains in directives.items():
        def update(match: re.Match[str]) -> str:
            value = match.group(1)
            for domain in domains:
                if domain not in value:
                    value += " " + domain
            return value + match.group(2)

        html = re.sub(rf"({re.escape(directive)}\s+[^;]*)(;)", update, html, flags=re.I)
    return html


def process(path: Path) -> bool:
    original = path.read_text(encoding="utf-8", errors="ignore")
    updated = original
    for pattern in POPUNDER_PATTERNS:
        updated = pattern.sub("\n", updated)
    updated = allow_hilltop_sources(updated)
    if MARKER not in updated:
        updated, count = re.subn(r"</\s*body\s*>", HILLTOP_BUNDLE + "\n</body>", updated, count=1, flags=re.I)
        if count == 0:
            return False
    if RECOVERY_TAG not in updated:
        updated, count = re.subn(r"</\s*body\s*>", RECOVERY_TAG + "\n</body>", updated, count=1, flags=re.I)
        if count == 0:
            return False
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8", newline="")
    return True


def main() -> None:
    changed = 0
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".htm"}:
            if not any(part in {".git", "node_modules", "venv", "env"} for part in path.parts):
                changed += int(process(path))
    print(f"Updated {changed} HTML files: Hilltop formats placed; legacy popunders removed.")


if __name__ == "__main__":
    main()
