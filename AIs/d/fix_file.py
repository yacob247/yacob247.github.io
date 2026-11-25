# -*- coding: utf-8 -*-
import sys

# Read the original file
content = open('c:/Users/youse/Downloads/d/index.html', 'r', encoding='utf-8').read()

# Find </main> and keep everything before it
idx = content.find('</main>')
prefix = content[:idx + len('</main>')]

# Read the new script content
script = open('c:/Users/youse/Downloads/d/new_script.txt', 'r', encoding='utf-8').read()

# Write the result
result = prefix + script
open('c:/Users/youse/Downloads/d/index.html', 'w', encoding='utf-8').write(result)
print('File written successfully')
print(f'New file size: {len(result)} chars')