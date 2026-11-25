import os
import ftfy

ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

def universal_mojibake_repair():
    print(f"Launching deep character encoding repair matrix across: {ROOT_PATH}\n")
    repaired_files = 0
    total_scanned = 0
    
    for root, dirs, files in os.walk(ROOT_PATH):
        for file in files:
            if file.lower().endswith('.html'):
                if file.lower() in EXCLUDED_PAGES:
                    continue
                
                file_path = os.path.join(root, file)
                total_scanned += 1
                
                try:
                    # 1. Read the file with Windows encoding fallback to safely capture the garbled bytes
                    with open(file_path, 'r', encoding='latin-1') as f:
                        raw_content = f.read()
                    
                    # 2. Re-encode back to original raw bytes to correctly feed into ftfy
                    raw_bytes = raw_content.encode('latin-1')
                    
                    # 3. Decode properly as UTF-8 while ignoring minor stream bugs
                    text_str = raw_bytes.decode('utf-8', errors='ignore')
                    
                    # 4. Run ftfy's advanced heuristic engine to auto-fix any remaining scrambled strings
                    # We turn unescape_html off to prevent it from messing with your actual source layout code tags.
                    fixed_content = ftfy.fix_text(text_str, unescape_html=False)
                    
                    # 5. If changes were applied by the repair matrix, save the file
                    if fixed_content != text_str or "ðŸ" in raw_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(fixed_content)
                        
                        print(f"✅ Successfully Repaired & Restored: {os.path.relpath(file_path, ROOT_PATH)}")
                        repaired_files += 1
                        
                except Exception as e:
                    print(f"⚠️ Could not evaluate layout rules inside {file}: {e}")

    print(f"\nScan Complete!")
    print(f"🔹 Total HTML files scanned: {total_scanned}")
    print(f"🔹 Total files fixed and saved: {repaired_files}")

if __name__ == "__main__":
    universal_mojibake_repair()
