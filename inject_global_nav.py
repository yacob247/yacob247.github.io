"""Add a consistent legal/site navigation bar to public HTML pages.

The operation is idempotent: pages that already contain ``global-nav`` are
left unchanged.
"""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent

LEGAL_NAV = """<nav class="global-nav" style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:8px 0;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;font-size:13px;">
    <a href="/">Home</a> |
    <a href="/tools/">All Tools</a> |
    <a href="/privacy.html">Privacy Policy</a> |
    <a href="/terms.html">Terms of Service</a> |
    <a href="/contact.html">Contact Us</a>
  </div>
</nav>"""

EXCLUDED_DIRECTORIES = {".git", "Loma", "node_modules", "__pycache__"}
EXCLUDED_NAMES = {
    "blog-post.html",
    "game.html",
    "404.html",
    "gamevaultoriginal.html",
    "indexcopy.html",
    "login.html",
    "signup.html",
    "unsubscribe.html",
}
EXCLUDED_NAME_PARTS = ("BlOg-PoSts", "3029-")
BODY_PATTERN = re.compile(r"(<body\b[^>]*>)", re.IGNORECASE)


def is_eligible(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(part in EXCLUDED_DIRECTORIES for part in relative.parts[:-1]):
        return False
    if path.name in EXCLUDED_NAMES:
        return False
    return not any(part in path.name for part in EXCLUDED_NAME_PARTS)


def main() -> None:
    changed = 0
    skipped_existing = 0
    skipped_no_body = 0
    errors: list[str] = []

    for path in sorted(ROOT.rglob("*.html")):
        if not is_eligible(path):
            continue

        try:
            content = path.read_text(encoding="utf-8")
            if 'class="global-nav"' in content or "class='global-nav'" in content:
                skipped_existing += 1
                continue
            if not BODY_PATTERN.search(content):
                skipped_no_body += 1
                continue

            updated = BODY_PATTERN.sub(
                lambda match: f"{match.group(1)}\n{LEGAL_NAV}", content, count=1
            )
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"Updated: {path.relative_to(ROOT).as_posix()}")
        except (OSError, UnicodeError) as exc:
            errors.append(f"{path.relative_to(ROOT).as_posix()}: {exc}")

    print(f"\nUpdated: {changed}")
    print(f"Already had navigation: {skipped_existing}")
    print(f"Skipped (no body element): {skipped_no_body}")
    if errors:
        print("Errors:")
        for error in errors:
            print(f"  {error}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()