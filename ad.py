import os
import re

root_directory = '.' 

def clean_old_placements():
    cleaned = 0
    for dirpath, _, filenames in os.walk(root_directory):
        if '.git' in dirpath or '.github' in dirpath:
            continue
        for filename in filenames:
            if filename.endswith('.html') or filename.endswith('.htm'):
                file_path = os.path.join(dirpath, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except Exception:
                    continue
                
                original = content
                # Strip any existing placement wrappers completely
                content = re.sub(r'<div class="adsterra-placement-group".*?</div>\s*</div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                content = re.sub(r'<div class="adsterra-placement-group".*?</div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                content = re.sub(r'<!-- Adsterra Mainstream Responsive Configuration -->.*?<\/style>', '', content, flags=re.DOTALL | re.IGNORECASE)
                
                if content != original:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    cleaned += 1
    print(f"[Cleanup] Removed old ad codes from {cleaned} file(s).")

if __name__ == "__main__":
    clean_old_placements()
