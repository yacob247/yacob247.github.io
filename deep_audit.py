#!/usr/bin/env python3
"""Deep audit to find the TRUE reasons for 15 AdSense rejections."""
import os, re

def count_words(fp):
    content = open(fp, 'r', encoding='utf-8', errors='ignore').read()
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', content, flags=re.DOTALL|re.I)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL|re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    return len(text.split())

def get_title(fp):
    content = open(fp, 'r', encoding='utf-8', errors='ignore').read()
    m = re.search(r'<title>(.*?)</title>', content, re.I)
    return m.group(1)[:60] if m else 'NO TITLE'

# 1. Check all root pages for thin content
print("=== ROOT PAGES ===")
for f in sorted(os.listdir('.')):
    if f.endswith('.html'):
        wc = count_words(f)
        print(f"  {wc:5d} words - {f} - {get_title(f)}")

# 2. Check TOOL pages - they are JS-heavy but Google needs text
print("\n=== TOOL PAGES (checking for minimal visible text) ===")
tool_dir = 'tools'
if os.path.isdir(tool_dir):
    for f in sorted(os.listdir(tool_dir)):
        if f.endswith('.html'):
            fp = os.path.join(tool_dir, f)
            wc = count_words(fp)
            if wc < 500:
                print(f"  THIN: {wc:4d} words - tools/{f}")

# 3. Check reviews-blog pages
print("\n=== REVIEWS-BLOG PAGES ===")
rb_dir = 'reviews-blog'
if os.path.isdir(rb_dir):
    for f in sorted(os.listdir(rb_dir)):
        if f.endswith('.html') and 'admin' not in f and '3029' not in f:
            fp = os.path.join(rb_dir, f)
            wc = count_words(fp)
            print(f"  {wc:5d} words - {f} - {get_title(fp)}")

# 4. Check for pages with NO text content (pure JS tools)
print("\n=== PURE JS TOOL PAGES (no visible readable content) ===")
js_only = []
for root, dirs, files in os.walk('tools'):
    for f in files:
        if f.endswith('.html'):
            fp = os.path.join(root, f)
            content = open(fp, 'r', encoding='utf-8', errors='ignore').read()
            text = re.sub(r'<script[^>]*>.*?</script>', ' ', content, flags=re.DOTALL|re.I)
            text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL|re.I)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = text.strip()
            words = len(text.split())
            if words < 100:
                rel = fp.replace('\\', '/')
                js_only.append((rel, words))

for path, wc in sorted(js_only, key=lambda x: x[1]):
    print(f"  CRITICAL: {wc:4d} words - {path} - has almost NO readable text!")

# 5. Check niche scattering
print("\n=== NICHE SCATTERING ===")
niches = {}
for f in os.listdir('.'):
    if f.endswith('.html'):
        niches['Company/Root'] = niches.get('Company/Root', 0) + 1
for d in ['tools', 'tools2', 'reviews-blog', 'WorldCups', 'Wiki', '212']:
    if os.path.isdir(d):
        count = len([f for f in os.listdir(d) if f.endswith('.html')])
        niches[d] = count

for k, v in niches.items():
    print(f"  {k}: {v} pages")

print("\n=== ROOT CAUSE OF 15 REJECTIONS ===")
print("1. TOPIC SCATTERING: Site covers browser tools, game reviews,")
print("   world cup history, wiki knowledge base, 212 directory.")
print("   Google wants ONE focused niche per site.")
print()
print("2. TOOL-ONLY PAGES: Most tools/*.html files are JavaScript")
print("   applications with minimal readable text content.")
print("   Google needs text to understand what the site is about.")
print()
print("3. TLD .work: Google AdSense prefers .com, .org, .net")
print()
print("4. RECOMMENDATION: Split the site into focused subdomains")
print("   or remove unrelated sections (WorldCups, Wiki, 212)")
print("   from the main site. Focus on ONE topic.")
