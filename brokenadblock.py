import os
import re

root_directory = '.' 

# This is the raw JavaScript payload block using complete mathematical string encryption
# Your domain (plump-plastic.com) is translated into character codes so scanners cannot find it
unblockable_payload_html = """<!-- Envizion Elite Fully-Obfuscated Revenue Pack -->
<script type="text/javascript">
(function() {
    // 1. MATHEMATICAL URL OBFUSCATION
    // These numbers represent the exact letters for "https://plump-plastic.com"
    // Ad blockers reading your source code cannot decode this without running it
    var charCodes = [104,116,116,112,115,58,47,47,112,108,117,109,112,45,112,108,97,115,116,105,99,46,99,111,109];
    var dynamicUrl = "";
    for (var i = 0; i < charCodes.length; i++) {
        dynamicUrl += String.fromCharCode(charCodes[i]);
    }

    // 2. UNPREDICTABLE COSMETIC BYPASS (300x250 Banner Component)
    // Generates a totally unique class and ID name on every single page load
    var randomSeed = Math.floor(Math.random() * 99999);
    var layoutId = "module_sys_" + randomSeed;
    var layoutClass = "frame_wrapper_" + randomSeed;

    var bannerBox = document.createElement("div");
    bannerBox.id = layoutId;
    bannerBox.className = layoutClass;
    bannerBox.style.width = "300px";
    bannerBox.style.height = "250px";
    bannerBox.style.margin = "15px auto";
    bannerBox.style.textAlign = "center";

    var frame = document.createElement("iframe");
    frame.src = dynamicUrl;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.scrolling = "no";

    bannerBox.appendChild(frame);
    
    // Mount directly to the website DOM structure outside the game loop
    if (document.body) {
        document.body.appendChild(bannerBox);
    }

    // 3. SECURE SEAMLESS POPUNDER LAYER
    // Session check to make sure it only triggers once per user gameplay loop
    if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
        return;
    }

    // Track active navigation buttons and real functional items across the layout
    var interfaceElements = document.querySelectorAll("button, input[type='submit'], a, .btn");

    function executeBackgroundPop(e) {
        if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
            return;
        }

        // Open the decrypted monetization link inside a clean new window index
        var targetWindow = window.open(dynamicUrl, "_blank");
        
        if (targetWindow) {
            sessionStorage.setItem('envizion_pop_fired', 'true');
            // Immediately clear the event listeners so it doesn't break site functions
            for (var j = 0; j < interfaceElements.length; j++) {
                interfaceElements[j].removeEventListener("click", executeBackgroundPop);
            }
        }
    }

    // Link triggers securely to the actual page assets
    for (var k = 0; k < interfaceElements.length; k++) {
        interfaceElements[k].addEventListener("click", executeBackgroundPop);
    }
})();
</script>
<!-- End Envizion Revenue Pack -->"""

def run_clean_and_injection():
    cleaned_old_blocks = 0
    fresh_injections = 0
    
    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    print("[Start] Commencing master encryption deployment across your pages...")

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

                # --- STEP 1: COMPREHENSIVE OLD CODE SCRUBBER ---
                if 'adsterra-placement-group' in content:
                    content = re.sub(r'<!--.*?adsterra-placement-group.*?-->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1
                if 'HilltopAds Universal Responsive Banner Wrapper' in content:
                    content = re.sub(r'<!-- HilltopAds Universal Responsive Banner Wrapper -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1
                if 'envizion-global-banner-container' in content:
                    content = re.sub(r'<!-- envizion-global-banner-container -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1
                if 'HilltopAds High-Revenue Popunder Engine' in content:
                    content = re.sub(r'<!-- HilltopAds High-Revenue Popunder Engine -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1
                if 'HilltopAds High-Revenue Non-Intrusive Popunder Engine' in content:
                    content = re.sub(r'<!-- HilltopAds High-Revenue Non-Intrusive Popunder Engine -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1
                if 'Envizion Global Unblockable Revenue Pack' in content:
                    content = re.sub(r'<!-- Envizion Global Unblockable Revenue Pack -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1

                # --- STEP 2: MOUNT THE FINAL ENCRYPTED LAYER ---
                if 'Envizion Elite Fully-Obfuscated Revenue Pack' not in content:
                    if body_end_pattern.search(content):
                        content = body_end_pattern.sub(unblockable_payload_html + "\n\\1", content)
                        fresh_injections += 1

                # Save modifications back to file if structural change detected
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print("\n================ SYSTEM OPERATION SUCCESS ================")
    print(f"[Success] Purged {cleaned_old_blocks} traces of legacy broken tags.")
    print(f"[Success] Successfully mounted Encrypted Revenue Loops into {fresh_injections} files!")
    print("==========================================================")

if __name__ == "__main__":
    run_clean_and_injection()
