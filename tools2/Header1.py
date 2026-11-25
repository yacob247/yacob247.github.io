import os
from bs4 import BeautifulSoup

folder = "."  # path to your tools2 folder

html_files = [f for f in os.listdir(folder) if f.endswith(".html")]
print(f"Found {len(html_files)} HTML files...")

for filename in html_files:
    filepath = os.path.join(folder, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    h1_tags = soup.find_all("h1")
    if h1_tags:
        for h1 in h1_tags:
            existing = h1.get("style", "")
            h1["style"] = existing + "; color: white !important;" if existing else "color: white !important;"

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(str(soup))

        print(f"  Updated {len(h1_tags)} <h1>(s) in {filename}")
    else:
        print(f"  Skipped {filename} (no <h1>)")

print("Done!")