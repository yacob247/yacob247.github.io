import os
import re
import json
import html

ROOT_DIR = os.getcwd()

# The raw original navigation HTML string exactly as it was when you started
ORIGINAL_NAV = """<nav style="background:#481e2a;padding:12px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
    <span style="color:#fff;font-weight:800;margin-right:6px;">Discursive Pack</span>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="index.html">Home</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="index.html">Pack Home</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="discursive-text.html">The Guide</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="discursive-writing-lessons.html">10 Lessons</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="about.html">About</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="contact.html">Contact</a>
</nav>"""

def undo_html_modifications():
    """Finds any modified navigation bar templates and restores the original code."""
    # Pattern to match any navigation bars rewritten by previous scripts
    modified_nav_pattern = r'<nav\b[^>]* style="[^"]*background:#481e2a;[^"]*">([\s\S]*?)</nav>'
    revert_count = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check if this file contains a modified navigation layout
                if re.search(modified_nav_pattern, content):
                    # Replace the modified nav bar with your exact original code structure
                    restored_content = re.sub(modified_nav_pattern, ORIGINAL_NAV, content)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(restored_content)
                    revert_count += 1
                    print(f"↩️ Restored original code: {os.path.relpath(file_path, ROOT_DIR)}")
                    
    print(f"✅ Successfully reverted {revert_count} HTML files back to normal.")

def clean_html_to_text(html_content):
    """Safely extracts raw visible body text without modifying any files."""
    # Exclude structural layout items so they don't corrupt search snippet text
    text = re.sub(r'<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?</\1>', ' ', html_content, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    return html.unescape(text)

def generate_clean_search_json():
    """Gathers text layouts and generates the fresh search array map data."""
    search_index = []

    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            # Index active HTML pages, bypassing internal background system scripts
            if file.endswith('.html') and not file.startswith('_'):
                file_path = os.path.join(root, file)
                relative_url = os.path.relpath(file_path, ROOT_DIR).replace("\\", "/")
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    html_source = f.read()

                # Grab the document tab title
                title_match = re.search(r'<title>(.*?)</title>', html_source, flags=re.IGNORECASE | re.DOTALL)
                page_title = html.unescape(title_match.group(1)).strip() if title_match else file.replace('.html', '').title()
                page_title = re.sub(r'\s+', ' ', page_title)

                # Process the body text and extract precisely the first 100 words
                raw_text = clean_html_to_text(html_source)
                words_list = raw_text.split()
                snippet_text = " ".join(words_list[:100])

                if snippet_text:
                    search_index.append({
                        "title": page_title,
                        "url": relative_url,
                        "snippet": snippet_text
                    })

    # Save out the compiled search dataset configuration map 
    with open('search.json', 'w', encoding='utf-8') as json_out:
        json.dump(search_index, json_out, indent=4, ensure_ascii=False)
        
    print(f"📊 Completed! Compiled {len(search_index)} items into search.json")

if __name__ == "__main__":
    print("⏳ Step 1: Undoing script layout updates and restoring your HTML files...")
    undo_html_modifications()
    
    print("\n⏳ Step 2: Compiling pristine file listings to build search.json database...")
    generate_clean_search_json()
    
    print("\n✨ All operations complete! Workspace reset and search parameters saved.")
