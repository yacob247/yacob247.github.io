import os
import re

root_directory = '.' 

# Your premium HilltopAds high-revenue Direct Link URL
popunder_url = "https://plump-plastic.com"

# High-revenue Popunder script logic (Doubled brackets to fix the Python SyntaxError)
popunder_js_code = """
<!-- HilltopAds High-Revenue Popunder Engine -->
<script>
document.addEventListener("click", function launchPopunder(e) {
    // Check if the user has already seen a popunder to avoid constant spamming
    if (document.cookie.split(';').some((item) => item.trim().startsWith('envizion_pop_seen='))) {
        return;
    }

    // Open your high-paying campaign destination link in a background tab
    var popWindow = window.open("POP_URL_PLACEHOLDER", "_blank");
    
    if (popWindow) {
        // Set a cookie so the user isn't spammed with popunders continuously
        var date = new Date();
        date.setTime(date.getTime() + (2 * 60 * 60 * 1000)); // 2 Hour Cooldown window
        document.cookie = "envizion_pop_seen=true; expires=" + date.toUTCString() + "; path=/; SameSite=Lax";
        
        // Remove the click listener once triggered successfully
        document.removeEventListener("click", launchPopunder);
    }
}, { capture: true, once: false });
</script>
""".replace("POP_URL_PLACEHOLDER", popunder_url)

def inject_popunder_engine():
    updated = 0
    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

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

                # Guard check to prevent double injection
                if 'HilltopAds High-Revenue Popunder Engine' in content:
                    continue

                original_content = content

                # Append the popunder trigger code cleanly right above the closing body tag
                if body_end_pattern.search(content):
                    content = body_end_pattern.sub(f"{popunder_js_code}\\1", content)

                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    updated += 1

    print(f"\n[Success] Integrated premium high-revenue popunder engine into {updated} file(s)!")

if __name__ == "__main__":
    inject_popunder_engine()
