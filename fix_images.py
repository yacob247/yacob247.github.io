with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Company app dashboard image - line ~318
old = 'alt="Company app dashboard" class="w-full h-full object-cover" loading="lazy" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3'
new = 'alt="Company app dashboard" width="1000" height="1000" class="w-full h-full object-cover" loading="lazy" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("Fixed: Company app dashboard image")
else:
    print("WARN: Could not find company app dashboard image")

# 2. Software code image - line ~682
old = 'alt="Software code on screen" class="w-full h-64 md:h-80 object-cover object-center" loading="lazy" src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3'
new = 'alt="Software code on screen" width="800" height="400" class="w-full h-64 md:h-80 object-cover object-center" loading="lazy" src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("Fixed: Software code image")
else:
    print("WARN: Could not find software code image")

print(f"\nTotal changes: {changes}")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html saved")