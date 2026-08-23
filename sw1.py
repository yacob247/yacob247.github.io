import os

ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

# Isolated individual layout blocks to prevent page crashes
SAFE_CONTAINERS = """    <!-- Isolated Ad Tracking Blocks -->
    <div id="ad-zone-vignette" style="display:none !important; visibility:hidden !important;">
        <script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
    </div>
    <div id="ad-zone-tag" style="display:none !important; visibility:hidden !important;">
        <script>(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
    </div>"""

def inject_safe_bottom_ads():
    print(f"Injecting isolated ad containers above </body> in: {ROOT_PATH}")
    updated_count = 0
    
    for root, dirs, files in os.walk(ROOT_PATH):
        if root == ROOT_PATH:
            continue
            
        for file in files:
            if file.lower().endswith('.html'):
                if file.lower() in EXCLUDED_PAGES:
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # Duplication Guard Check
                    if "ad-zone-vignette" in content:
                        continue
                    
                    # Find closing body tag to cleanly insert containers above it
                    body_index = content.find("</body>")
                    if body_index == -1:
                        body_index = content.find("</BODY>")
                        
                    if body_index != -1:
                        # Insert safely right before the closing body layout tag
                        updated_content = content[:body_index] + SAFE_CONTAINERS + "\n" + content[body_index:]
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(updated_content)
                            
                        print(f"Safely containerized: {os.path.relpath(file_path, ROOT_PATH)}")
                        updated_count += 1
                    else:
                        print(f"!! Warning: Could not locate </body> tag in {os.path.relpath(file_path, ROOT_PATH)}")
                except Exception as e:
                    print(f"Error processing {file}: {e}")

    print(f"\nTask Finished. Containerized ads injected across {updated_count} pages.")

if __name__ == "__main__":
    inject_safe_bottom_ads()
