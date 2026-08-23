import os

# Define the root path of your website directory
ROOT_PATH = os.path.dirname(os.path.abspath(__file__))

# Pages you strictly want to skip
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

# The new additional tag to insert
SECOND_AD_TAG = """    <!-- Additional Ad Network Script -->
    <script src="https://5gvci.com/act/files/tag.min.js?z=11637755" data-cfasync="false" async></script>"""

# Target indicator to prevent adding duplicate code
NEW_TAG_INDICATOR = "5gvci.com/act/files/tag.min.js"

def inject_second_tag():
    print(f"Starting secondary script injection sweep in: {ROOT_PATH}")
    processed_count = 0
    already_exists_count = 0
    
    for root, dirs, files in os.walk(ROOT_PATH):
        # Skip the core root folder itself to protect main layout pages
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
                    
                    # Prevent duplicating the tag if it's already there from a previous run
                    if NEW_TAG_INDICATOR in content:
                        already_exists_count += 1
                        continue
                    
                    # Find the exact opening <head> tag
                    head_index = content.find("<head>")
                    if head_index == -1:
                        head_index = content.find("<HEAD>")
                        
                    if head_index != -1:
                        insert_pos = head_index + len("<head>")
                        
                        # Stitch the text together placing the new tag right at the top of <head>
                        updated_content = content[:insert_pos] + "\n" + SECOND_AD_TAG + content[insert_pos:]
                        
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(updated_content)
                            
                        print(f"Successfully added second tag to: {os.path.relpath(file_path, ROOT_PATH)}")
                        processed_count += 1
                    else:
                        print(f"!! Warning: No <head> tag found in {os.path.relpath(file_path, ROOT_PATH)}")
                        
                except Exception as e:
                    print(f"Error processing {file}: {e}")

    print(f"\nTask Finished.")
    print(f"Total files updated with second tag: {processed_count}")
    print(f"Total files already containing this tag: {already_exists_count}")

if __name__ == "__main__":
    inject_second_tag()
