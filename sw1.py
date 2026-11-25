import os
import re

# 1. Define base root path and absolute ignore list rules
ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

# 2. Your direct script injection configuration parameters
CLEAN_AD_SCRIPTS = """    <!-- Safe Ad Network Scripts -->
    <script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
    <script>(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>"""

# 3. Clean up identifiers from all old previous attempts to wipe fresh
DIRTY_STRINGS = [
    "ad-zone-vignette", 
    "ad-zone-tag", 
    "Final Ad Network Scripts", 
    "<!-- Isolated Ad Tracking Blocks -->",
    "<!-- Safe Ad Network Scripts -->"
]

def master_ad_injection_sweep():
    print(f"Launching total root + nested directory sweep in: {ROOT_PATH}\n")
    updated_count = 0
    skipped_count = 0
    
    # 4. Recursively walk through ALL folders, nested sub-folders, and the root itself
    for root, dirs, files in os.walk(ROOT_PATH):
        for file in files:
            if file.lower().endswith('.html'):
                
                # Verify against your ignore exclusions
                if file.lower() in EXCLUDED_PAGES:
                    print(f"-> Left Clean (Excluded Page): {file}")
                    skipped_count += 1
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    # Open file cleanly handles all text formats without breaking stream
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 5. Sweep and remove any line containing dirty variables from past layout versions
                    lines = content.splitlines()
                    cleaned_lines = []
                    for line in lines:
                        if any(dirty in line for dirty in DIRTY_STRINGS) or "vignette.min.js" in line or "tag.min.js" in line:
                            continue
                        cleaned_lines.append(line)
                    content = "\n".join(cleaned_lines)
                    
                    # 6. Apply case-insensitive check to place script right before the closing </body> tag
                    # Matches </body>, </BODY>, </Body> dynamically
                    body_match = re.search(r"</body>", content, re.IGNORECASE)
                    
                    if body_match:
                        insert_pos = body_match.start()
                        # Stitch code seamlessly
                        updated_content = content[:insert_pos] + CLEAN_AD_SCRIPTS + "\n" + content[insert_pos:]
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(updated_content)
                        
                        relative_path = os.path.relpath(file_path, ROOT_PATH)
                        print(f"Successfully Verified & Configured: {relative_path}")
                        updated_count += 1
                    else:
                        print(f"!! Notice: No body closing tag structure found inside: {file}")
                        
                except Exception as e:
                    print(f"!! Error reading layout index configuration path for {file}: {e}")

    print(f"\nTask Finished Successfully.")
    print(f"Total files live and injected: {updated_count}")
    print(f"Total core layouts left alone: {skipped_count}")

if __name__ == "__main__":
    master_ad_injection_sweep()
