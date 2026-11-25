import os

# Define the root path of your website directory
ROOT_PATH = os.path.dirname(os.path.abspath(__file__))

# Pages you strictly want to skip
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

# Your exact ad script layout
NEW_AD_TAG = """    <!-- Ad Network Script -->
    <script>(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>"""

# Target checks to prevent duplication
OLD_ADSENSE_INDICATOR = "adsbygoogle.js"
NEW_AD_INDICATOR = "nap5k.com/tag.min.js"

def inject_or_update_ads():
    print(f"Starting target zone updates in: {ROOT_PATH}")
    injected_count = 0
    updated_count = 0
    
    for root, dirs, files in os.walk(ROOT_PATH):
        # Skip the root directory itself to protect core pages
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
                    
                    # 1. Skip if the exact new tag is already present
                    if NEW_AD_INDICATOR in content:
                        continue
                    
                    # 2. Check if an old adsbygoogle script should be stripped or swapped
                    if OLD_ADSENSE_INDICATOR in content:
                        # Find the bounds of the old script block to clean it out cleanly
                        # This cleanly overwrites placeholder sweeps
                        lines = content.splitlines()
                        cleaned_lines = []
                        skip_mode = False
                        
                        for line in lines:
                            if "adsbygoogle" in line or "ca-pub-" in line:
                                continue
                            cleaned_lines.append(line)
                            
                        content = "\n".join(cleaned_lines)
                    
                    # 3. Inject the brand new tag seamlessly under <head>
                    head_index = content.find("<head>")
                    if head_index == -1:
                        head_index = content.find("<HEAD>")
                        
                    if head_index != -1:
                        insert_pos = head_index + len("<head>")
                        updated_content = content[:insert_pos] + "\n" + NEW_AD_TAG + content[insert_pos:]
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(updated_content)
                            
                        if OLD_ADSENSE_INDICATOR in content:
                            print(f"Swapped out old tag for new code: {os.path.relpath(file_path, ROOT_PATH)}")
                            updated_count += 1
                        else:
                            print(f"Successfully injected new zone code: {os.path.relpath(file_path, ROOT_PATH)}")
                            injected_count += 1
                            
                except Exception as e:
                    print(f"Error processing {file}: {e}")

    print(f"\nTask Finished.")
    print(f"Total new tags injected: {injected_count}")
    print(f"Total tags upgraded: {updated_count}")

if __name__ == "__main__":
    inject_or_update_ads()
