import re, sys
from pathlib import Path

assets = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
dry = "--dry-run" in sys.argv
names = r"(v86|dxt-kernel-simd|dxt-kernel|video-decoder)\.wasm"
# quote, optional any path prefix, filename, same quote
pat = re.compile(r"""(["'`])(?:[^"'`\s]*/)?""" + names + r"\1")

for f in assets.rglob("*.js"):
    s = f.read_text(encoding="utf-8", errors="surrogateescape")
    new, n = pat.subn(lambda m: f"{m.group(1)}./{m.group(2)}.wasm{m.group(1)}", s)
    if n:
        print(f"{f.name}: {n} replacement(s)")
        if not dry:
            f.with_suffix(".js.bak2").write_text(s, encoding="utf-8", errors="surrogateescape")
            f.write_text(new, encoding="utf-8", errors="surrogateescape")