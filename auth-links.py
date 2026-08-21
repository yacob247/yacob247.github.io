"""Add consistent account links to every published HTML page."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
MARKER = "ENVIZION_ACCOUNT_LINKS_V1"
BLOCK = f'''<!-- {MARKER} -->
<nav aria-label="Account" style="text-align:center;padding:12px 16px;font:600 13px/1.4 system-ui,sans-serif;">
  <a href="/reviews-blog/signup.html" style="margin:0 8px;">Sign up</a>
  <a href="/reviews-blog/login.html" style="margin:0 8px;">Sign in</a>
</nav>
<!-- END {MARKER} -->'''


def process(path: Path) -> bool:
    original = path.read_text(encoding="utf-8", errors="ignore")
    if MARKER in original:
        return False
    updated, count = re.subn(r"</\s*body\s*>", BLOCK + "\n</body>", original, count=1, flags=re.I)
    if count == 0 or updated == original:
        return False
    path.write_text(updated, encoding="utf-8", newline="")
    return True


def main() -> None:
    changed = 0
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".htm"}:
            if not any(part in {".git", "node_modules", "venv", "env"} for part in path.parts):
                changed += int(process(path))
    print(f"Added account links to {changed} HTML files.")


if __name__ == "__main__":
    main()
