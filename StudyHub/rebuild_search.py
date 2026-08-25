import os
import re
import json
import html

ROOT_DIR = os.getcwd()
TARGET_JSON = "search.json"

def extract_pure_body_prose(html_source_code):
    """Strips out style blocks, navigation tags, and markup to leave clean prose."""
    # 1. Purge scripts, styles, header tags, and nav menus completely
    clean_text = re.sub(r'<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?</\1>', ' ', html_source_code, flags=re.IGNORECASE)
    
    # 2. Strip remaining generic HTML element tags
    clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
    
    # 3. Translate encoded symbols like &mdash; into readable terminal punctuation
    decoded_prose = html.unescape(clean_text)
    
    # 4. Normalise extra carriage returns, tabs, and multi-spacing down to clean text layout
    return re.sub(r'\s+', ' ', decoded_prose).strip()

def rebuild_search_index():
    # Step 1: Wipe the existing search.json file if it exists to ensure a total reset
    if os.path.exists(TARGET_JSON):
        try:
            os.remove(TARGET_JSON)
            print(f"🗑️ Successfully deleted old {TARGET_JSON} file.")
        except Exception as e:
            print(f"⚠️ Could not delete existing file: {e}. Proceeding to overwrite instead.")
    else:
        print(f"✨ No existing {TARGET_JSON} found. Creating a fresh index.")

    search_index = []
    processed_count = 0
    
    print("⏳ Parsing text nodes from your real local machine files...")
    
    # Step 2: Scan directories for genuine html data files
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            # Target active website pages while filtering out system backups or matrix scrapers
            if file.endswith('.html') and not file.startswith('_') and file != "matrix do not copy or replciate.html":
                file_path = os.path.join(root, file)
                relative_url = os.path.relpath(file_path, ROOT_DIR).replace("\\", "/")
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    html_content = f.read()

                # Grab the document title tag context
                title_match = re.search(r'<title>(.*?)</title>', html_content, flags=re.IGNORECASE | re.DOTALL)
                page_title = html.unescape(title_match.group(1)).strip() if title_match else file.replace('.html', '').title()
                page_title = re.sub(r'\s+', ' ', page_title)

                # Extract content body text and isolate the true initial 100 words from your file
                clean_body = extract_pure_body_prose(html_content)
                words_list = clean_body.split()
                first_100_words = " ".join(words_list[:100])

                if first_100_words:
                    # Append structured dictionary database block to our tracking index array map
                    search_index.append({
                        "title": page_title,
                        "url": relative_url,
                        "snippet": first_100_words
                    })
                    processed_count += 1
                    print(f"✅ Indexed real prose from: {relative_url}")

    # Step 3: Write out the freshly compiled dataset records to the new search.json
    with open(TARGET_JSON, 'w', encoding='utf-8') as json_out:
        json.dump(search_index, json_out, indent=4, ensure_ascii=False)
        
    print(f"\n🏁 Finished! Re-compiled and added {processed_count} genuine items into clean '{TARGET_JSON}'")

if __name__ == "__main__":
    rebuild_search_index()
