from pathlib import Path
import os, sys

if len(sys.argv) < 2:
    print(r'Usage: python fix_syntax_error.py "C:\path\to\site"')
    sys.exit(1)

root = Path(sys.argv[1]).resolve()
SKIP_DIRS = {".venv", "node_modules", ".git", ".agents", "__pycache__"}

BAD_OVER  = "' onmouseover=\"this.style.borderColor=String.fromCharCode(39)+'#4f8ef7'+String.fromCharCode(39)\"'"
BAD_OUT   = "' onmouseout=\"this.style.borderColor=String.fromCharCode(39)+'#2a2a4a'+String.fromCharCode(39)\"'"
GOOD_OVER = "' onmouseover=\"this.style.borderColor=\\'#4f8ef7\\'\"'"
GOOD_OUT  = "' onmouseout=\"this.style.borderColor=\\'#2a2a4a\\'\"'"

fixed = 0
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fname in filenames:
        if not fname.lower().endswith(".html"): continue
        fp = Path(dirpath) / fname
        text = fp.read_text(encoding="utf-8", errors="replace")
        if "String.fromCharCode(39)" in text:
            text = text.replace(BAD_OVER, GOOD_OVER)
            text = text.replace(BAD_OUT,  GOOD_OUT)
            fp.write_text(text, encoding="utf-8")
            rel = "/" + fp.relative_to(root).as_posix()
            print(f"  fixed  {rel}")
            fixed += 1

print(f"\nDone — {fixed} files fixed")
