"""Remove legacy popunder code without injecting any replacement."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
PATTERNS = [
    re.compile(r"\s*<!--\s*Envizion Shadow Protocol Pack\s*-->.*?<!--\s*End Envizion Shadow Protocol Pack\s*-->\s*", re.I | re.S),
    re.compile(r"\s*<!--\s*HilltopAds[^>]*Popunder[^>]*-->.*?</script>\s*", re.I | re.S),
    re.compile(r"\s*<!--\s*AdSterra[^>]*Popunder[^>]*-->.*?</script>\s*", re.I | re.S),
    re.compile(r"\s*<script\b[^>]*src\s*=\s*['\"][^'\"]*effectivecpmnetwork\.com[^'\"]*['\"][^>]*>\s*</script>\s*", re.I | re.S),
    re.compile(r"\s*//\s*3\.\s*SECURE SEAMLESS POPUNDER LAYER.*?(?=\n\s*\}\)\(\);\s*\n)", re.I | re.S),
]


def clean(path: Path) -> bool:
    original = path.read_text(encoding="utf-8", errors="ignore")
    updated = original
    for pattern in PATTERNS:
        updated = pattern.sub("\n", updated)
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8", newline="")
    return True


def main() -> None:
    changed = 0
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".htm"}:
            if not any(part in {".git", "node_modules", "venv", "env"} for part in path.parts):
                changed += int(clean(path))
    print(f"Removed legacy popunders from {changed} HTML files; no popunder code was injected.")


if __name__ == "__main__":
    main()
