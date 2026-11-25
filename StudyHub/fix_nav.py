import os
import re

# Set the root directory to StudyHub where the script runs
ROOT_DIR = os.getcwd()

def clean_folder_name(folder_name):
    """Converts folder names like '01_Imaginative_Texts' to clean titles like 'Imaginative'"""
    name = re.sub(r'^\d+_+', '', folder_name)
    name = name.replace('_', ' ')
    name = re.sub(r'\s*Texts?$', '', name, flags=re.IGNORECASE)
    return name.strip().title()

def determine_page_links(file, prefix, parent_folder):
    """Calculates context-specific paths for local guide files."""
    # Default links for the guide and lessons pages assume local folder execution
    guide_link = "index.html"
    lessons_link = "lessons.html"
    
    # If we are in a subfolder, adjust paths depending on known file structures
    if parent_folder not in ["StudyHub", "NESA_English_Text_Categories"]:
        clean_name = clean_folder_name(parent_folder).lower().replace(" ", "-")
        guide_link = f"{clean_name}-text.html"
        lessons_link = f"{clean_name}-lessons.html"
        
    return guide_link, lessons_link

def process_navigation():
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                
                # 1. Calculate relative step-back strings (e.g., '../../')
                relative_path_to_root = os.path.relpath(ROOT_DIR, root)
                if relative_path_to_root == ".":
                    prefix = ""
                else:
                    prefix = relative_path_to_root.replace("\\", "/") + "/"

                # 2. Determine structural context titles and index endpoints
                parent_folder = os.path.basename(root)
                if parent_folder in ["StudyHub", "NESA_English_Text_Categories"]:
                    pack_title = "Study Hub"
                    pack_home_link = f"{prefix}index.html"
                else:
                    pack_title = f"{clean_folder_name(parent_folder)} Pack"
                    pack_home_link = f"{prefix}NESA_English_Text_Categories/{parent_folder}/index.html"

                # 3. Handle local structural guide targets
                guide_target, lessons_target = determine_page_links(file, prefix, parent_folder)

                # 4. Generate the optimized, uniform navigation structure
                new_nav = f"""<nav style="background:#481e2a;padding:12px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
    <span style="color:#fff;font-weight:800;margin-right:6px;">{pack_title}</span>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="{prefix}index.html">Home</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="{pack_home_link}">Pack Home</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="{guide_target}">The Guide</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="{lessons_target}">10 Lessons</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="{prefix}about.html">About</a>
    <a style="color:#fff;font-weight:600;margin-right:14px;text-decoration:none;" href="{prefix}contact.html">Contact</a>
</nav>"""

                # 5. Read file contents safely
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                # 6. Target ANY matching <nav> container block and purge/replace it safely
                nav_pattern = r'<nav\b[^>]*>([\s\S]*?)</nav>'
                
                if re.search(nav_pattern, content):
                    updated_content = re.sub(nav_pattern, new_nav, content)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(updated_content)
                    print(f"🔄 Rebuilt & updated navigation layout: {os.path.relpath(file_path, ROOT_DIR)}")

if __name__ == "__main__":
    print("⏳ Purging old nav structures and generating updated assets...")
    process_navigation()
    print("✨ Nav bars cleanly rewritten with fixed structural paths!")
