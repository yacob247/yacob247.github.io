import os
import re

# 1. Define base root path and absolute ignore list rules
ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

# 2. Your direct ad network URL script payload
DIRECT_LINK_CODE = """    <!-- Direct Ad Network Link Event Handler -->
    <script>
        function openAdLink() {
            window.open('https://omg10.com', '_blank', 'noopener,noreferrer');
        }
        
        // Optional: Automatically trigger once on the very first click/tap interaction anywhere on the page
        document.addEventListener('click', function triggerFirstAd() {
            openAdLink();
            document.removeEventListener('click', triggerFirstAd); // Removes itself so it only fires once per session
        }, { once: true });
    </script>"""

# 3. Clean up string identifiers to prevent duplication
LINK_INDICATOR = "://omg10.com"
SCRIPT_HEADER = "<!-- Direct Ad Network Link Event Handler -->"

def inject_direct_link_sweep():
    print(f"Launching separate direct link injection sweep in: {ROOT_PATH}\\n")
    updated_count = 0
    skipped_count = 0
    
    for root, dirs, files in os.walk(ROOT_PATH):
        for file in files:
            if file.lower().endswith('.html'):
                
                # Verify against your ignore exclusions
                if file.lower() in EXCLUDED_PAGES:
                    skipped_count += 1
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # Prevent duplication if the direct link is already present
                    if LINK_INDICATOR in content:
                        print(f"-> Already exists inside: {os.path.relpath(file_path, ROOT_PATH)}")
                        continue
                    
                    # Clear out older broken structural blocks if they exist from a messy line build
                    if SCRIPT_HEADER in content:
                        lines = content.splitlines()
                        content = "\\n".join([line for line in lines if SCRIPT_HEADER not in line])
                    
                    # 4. Use case-insensitive Regex replacement to position safely above </body>
                    body_match = re.search(r"</body>", content, re.IGNORECASE)
                    
                    if body_match:
                        insert_pos = body_match.start()
                        updated_content = content[:insert_pos] + DIRECT_LINK_CODE + "\\n" + content[insert_pos:]
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(updated_content)
                        
                        relative_path = os.path.relpath(file_path, ROOT_PATH)
                        print(f"Successfully Configured Link: {relative_path}")
                        updated_count += 1
                    else:
                        print(f"!! Notice: No </body> closing tag found inside: {file}")
                        
                except Exception as e:
                    print(f"!! Error reading document file stream for {file}: {e}")

    print(f"\\nTask Finished Successfully.")
    print(f"Total files updated with direct link logic: {updated_count}")
    print(f"Total pages bypassed safely: {skipped_count}")

if __name__ == "__main__":
    inject_direct_link_sweep()
