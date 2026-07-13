import os, re

html_files = []
for root, dirs, files in os.walk('.'):
    # Skip Loma and hidden directories
    if '\\Loma\\' in root or '/Loma/' in root or '\\node_modules' in root or '/node_modules' in root or '\\.git' in root:
        continue
    for f in files:
        if f.endswith('.html'):
            fp = os.path.join(root, f)
            html_files.append(fp)

missing_title = []
missing_desc = []
missing_canonical = []
missing_og = []
missing_robots = []
missing_h1 = []
missing_adsense = []
has_all = []

for fp in sorted(html_files):
    content = open(fp, 'r', encoding='utf-8', errors='ignore').read()
    issues = []
    
    if not re.search(r'<title>', content, re.I):
        missing_title.append(fp)
        issues.append('no_title')
    if not re.search(r'<meta[^>]*name=["\']description["\']', content, re.I):
        missing_desc.append(fp)
        issues.append('no_desc')
    if not re.search(r'rel=["\']canonical["\']', content, re.I):
        missing_canonical.append(fp)
        issues.append('no_canonical')
    if not re.search(r'property=["\']og:', content, re.I):
        missing_og.append(fp)
        issues.append('no_og')
    if not re.search(r'name=["\']robots["\']', content, re.I):
        missing_robots.append(fp)
        issues.append('no_robots')
    if not re.search(r'<h1[> ]', content, re.I):
        missing_h1.append(fp)
        issues.append('no_h1')
    if 'ca-pub-5812524294035974' not in content:
        missing_adsense.append(fp)
        issues.append('no_adsense')
    
    if not issues:
        has_all.append(fp)

print(f"Total HTML files scanned: {len(html_files)}")
print(f"Has ALL required elements: {len(has_all)}")
print()
print(f"Missing <title>: {len(missing_title)}")
if missing_title:
    for f in missing_title: print(f"  {f}")
print()
print(f"Missing meta description: {len(missing_desc)}")
if missing_desc:
    for f in missing_desc: print(f"  {f}")
print()
print(f"Missing canonical: {len(missing_canonical)}")
if missing_canonical:
    for f in missing_canonical: print(f"  {f}")
print()
print(f"Missing OG tags: {len(missing_og)}")
if missing_og:
    for f in missing_og: print(f"  {f}")
print()
print(f"Missing robots meta: {len(missing_robots)}")
if missing_robots:
    for f in missing_robots: print(f"  {f}")
print()
print(f"Missing H1: {len(missing_h1)}")
if missing_h1:
    for f in missing_h1: print(f"  {f}")
print()
print(f"Missing AdSense publisher ID: {len(missing_adsense)}")
if missing_adsense:
    for f in missing_adsense: print(f"  {f}")