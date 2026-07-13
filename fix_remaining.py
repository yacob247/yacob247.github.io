n#!/usr/bin/env python3
"""Fix remaining issues: missing H1 tags, admin login robots, missing descriptions on Loma pages."""

import os, re

def add_h1_tag(filepath, h1_text):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    if re.search(r'<h1[> ]', content, re.I):
        return False
    # Try to add H1 before the first <main> or <section> or after <body>
    # Look for <main> tag
    match = re.search(r'<main[^>]*>', content, re.I)
    if match:
        h1 = f'\n    <h1>{h1_text}</h1>\n    '
        content = content[:match.end()] + h1 + content[match.end():]
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    # Look for first section
    match = re.search(r'<section[^>]*>', content, re.I)
    if match:
        h1 = f'\n    <h1>{h1_text}</h1>\n    '
        content = content[:match.end()] + h1 + content[match.end():]
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    # Look for body tag
    match = re.search(r'<body[^>]*>', content, re.I)
    if match:
        h1 = f'\n    <h1>{h1_text}</h1>\n    '
        content = content[:match.end()] + h1 + content[match.end():]
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    return False

def add_noindex(filepath):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    if not re.search(r'name=["\']robots["\']', content, re.I):
        noindex = '<meta content="noindex, nofollow" name="robots"/>'
        content = re.sub(r'(<meta[^>]*charset[^>]*>)', r'\1\n  ' + noindex, content, count=1, flags=re.I)
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    return False

def add_description(filepath, desc):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    if not re.search(r'<meta[^>]*name=["\']description["\']', content, re.I):
        desc_tag = f'<meta name="description" content="{desc}"/>'
        if '<title>' in content:
            content = re.sub(r'(</title>)', r'\1\n  ' + desc_tag, content, count=1, flags=re.I)
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    return False

# Fix missing H1 tags
h1_fixes = {
    'tools/envizionomniconvertpro.html': 'OmniConvert Pro - All-in-One File Converter',
    'tools/htmlviewer.html': 'HTML Viewer & URL Opener',
    'tools/life-tools.html': 'Life Tools - Everyday Utilities',
    'tools2/envizion_playground.html': 'Envizion Playground - Test & Prototype',
    'tools2/visual_level_builder.html': 'Visual Level Builder - Game Design Tool',
    'reviews-blog/3029-43987395439453enviz474666-(8-ion34525indexa34532dmin.html': 'Admin Dashboard',
}

# Add noindex to admin/login pages
noindex_pages = [
    'reviews-blog/BlOg-PoSts---admin.html',
    'reviews-blog/login.html',
    'reviews-blog/signup.html',
]

# Add meta descriptions to Loma pages (even though they are separate)
loma_descs = {
    'Loma/image-gen.html': 'Loma AI image generation platform - create and generate images using advanced machine learning models.',
    'Loma/index copy.html': 'Loma AI platform - intelligent agent system for automated training and content generation.',
    'Loma/index.html': 'Loma AI platform - intelligent agent system for automated training and content generation.',
    'Loma/music-gen.html': 'Loma AI music generation platform - create and generate music using advanced machine learning models.',
}

print("=== Fixing H1 tags ===")
for path, h1 in h1_fixes.items():
    if add_h1_tag(path, h1):
        print(f"  Added H1 to {path}")
    else:
        print(f"  FAILED to add H1 to {path}")

print("\n=== Adding noindex to admin/login pages ===")
for path in noindex_pages:
    if add_noindex(path):
        print(f"  Added noindex to {path}")

print("\n=== Adding descriptions to Loma pages ===")
for path, desc in loma_descs.items():
    if add_description(path, desc):
        print(f"  Added description to {path}")

print("\nDone!")