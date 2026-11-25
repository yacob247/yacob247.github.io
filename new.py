import os
import re

files_to_tag = [
    "disclaimer.html",
    "website-envizion.html"
]

target_robots_tag = '\n    <meta name="robots" content="noindex, nofollow">'

def force_noindex_injection():
    for filename in files_to_tag:
        if not os.path.exists(filename):
            print(f"⚠️ Warning: File '{filename}' not found.")
            continue
            
        with open(filename, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Check if any robots meta tag already exists
        robots_pattern = r'<meta\s+name=["\']robots["\'][^>]*>'
        
        if re.search(robots_pattern, content, re.IGNORECASE):
            # Replace the existing robots tag with our strict noindex directive
            print(f"🔄 Found old robots tag in '{filename}'. Overwriting to strict noindex...")
            updated_content = re.sub(robots_pattern, target_robots_tag, content, flags=re.IGNORECASE)
        else:
            # Inject right after opening <head> if no robots tag exists
            print(f"➕ No robots tag found in '{filename}'. Injecting brand new tag...")
            head_match = re.search(r'<head([^>]*)>', content, re.IGNORECASE)
            if head_match:
                insert_point = head_match.end()
                updated_content = content[:insert_point] + target_robots_tag + content[insert_point:]
            else:
                print(f"❌ Error: Could not find <head> in '{filename}'")
                continue
                
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(updated_content)
        print(f"✅ Successfully updated '{filename}'")

if __name__ == "__main__":
    force_noindex_injection()
