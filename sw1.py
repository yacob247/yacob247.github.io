import os

# Define the root path of your website directory
ROOT_PATH = os.path.dirname(os.path.abspath(__file__))

# Strings to search for and remove
TARGET_STRINGS = [
    "://nap5k.com",
    "://5gvci.com",
    "<!-- Ad Network Script -->",
    "<!-- Additional Ad Network Script -->"
]

def undo_ad_injection():
    print(f"Starting complete ad removal sweep in: {ROOT_PATH}")
    cleaned_count = 0
    
    for root, dirs, files in os.walk(ROOT_PATH):
        # Only process inside sub-folders
        if root == ROOT_PATH:
            continue
            
        for file in files:
            if file.lower().endswith('.html'):
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    
                    modified = False
                    cleaned_lines = []
                    
                    # Scan every line and drop lines that contain our injected script markers
                    for line in lines:
                        should_remove = any(target in line for target in TARGET_STRINGS)
                        if should_remove:
                            modified = True
                            continue  # Skip this line to remove it
                        cleaned_lines.append(line)
                    
                    # If we found and stripped the tags, write the clean layout back to disk
                    if modified:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.writelines(cleaned_lines)
                        print(f"Successfully cleaned: {os.path.relpath(file_path, ROOT_PATH)}")
                        cleaned_count += 1
                        
                except Exception as e:
                    print(f"Error processing {file}: {e}")

    print(f"\nTask Finished. Removed tags from {cleaned_count} files.")

if __name__ == "__main__":
    undo_ad_injection()
