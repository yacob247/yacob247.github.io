from pypdf import PdfReader

r = PdfReader(r"deep.pdf")
print("pages:", len(r.pages))
parts = []
total = 0
for i, page in enumerate(r.pages):
    t = page.extract_text() or ""
    total += len(t)
    parts.append("=== PAGE %d ===\n%s" % (i + 1, t))
with open("_deep_text.txt", "w", encoding="utf-8") as f:
    f.write("\n\n".join(parts))
print("total chars:", total)
