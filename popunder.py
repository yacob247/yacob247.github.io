import os
import re

root_directory = '.' 

# Your premium HilltopAds high-revenue Direct Link URL
popunder_url = "https://plump-plastic.com"

# New Intelligent Session-Based Popunder Trigger Logic
new_popunder_js = """
<!-- HilltopAds High-Revenue Non-Intrusive Popunder Engine -->
<script>
document.addEventListener("DOMContentLoaded", function() {
    // 1. Session Storage check: If it triggered once during this session, lock it out completely
    if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
        return;
    }

    // 2. Target only actual functional action items (buttons, links, inputs)
    const activeElements = document.querySelectorAll("button, input[type='submit'], a, .btn");

    function triggerSinglePopunder(e) {
        if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
            return;
        }

        // Open your high-paying campaign link in a standard background tab
        var popWindow = window.open("POP_URL_PLACEHOLDER", "_blank");
        
        if (popWindow) {
            // Set session lockout flag so it CANNOT open again until a full browser page refresh occurs
            sessionStorage.setItem('envizion_pop_fired', 'true');
            
            // Cleanly dismantle and strip all event listeners immediately from the site DOM
            activeElements.forEach(el => el.removeEventListener("click", triggerSinglePopunder));
        }
    }

    // Attach listeners strictly to the user interaction buttons
    activeElements.forEach(el => el.addEventListener("click", triggerSinglePopunder));
});
</script>
""".replace("POP_URL_PLACEHOLDER", popunder_url)

def migration_process():
    cleaned_count = 0
    injected_count = 0
    
    for dirpath, _, filenames in os.walk(root_directory):
        if any(ignored in dirpath for ignored in ['.git', '.github', 'node_modules', 'venv', 'env']):
            continue

        for filename in filenames:
            if filename.endswith('.html') or filename.endswith('.htm'):
                file_path = os.path.join(dirpath, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except Exception:
                    continue

                original_content = content

                # 1. REMOVE: Find and strip out the old annoying cookie popunder engine completely
                if 'HilltopAds High-Revenue Popunder Engine' in content:
                    content = re.sub(r'<!-- HilltopAds High-Revenue Popunder Engine -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_count += 1

                # 2. INJECT: Add the new user-friendly session popunder above the closing body tag
                if 'HilltopAds High-Revenue Non-Intrusive Popunder Engine' not in content:
                    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)
                    if body_end_pattern.search(content):
                        content = body_end_pattern.sub(f"{new_popunder_js}\\1", content)
                        injected_count += 1

                # Write changes back to the files if the content layout changed
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print(f"\n[Success] Cleaned old scripts from {cleaned_count} files.")
    print(f"[Success] Applied new clean friendly session engine to {injected_count} files.")

if __name__ == "__main__":
    migration_process()
