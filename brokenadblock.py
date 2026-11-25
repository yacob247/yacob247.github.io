import os
import re

root_directory = '.' 

# The updated payload utilizing Shadow DOM and CSS Dimensional Blurring
unblockable_payload_html = """<!-- Envizion Shadow Protocol Pack -->
<script type="text/javascript">
(function() {
    // 1. REASSEMBLE THE TARGET URL
    var _p1 = "ht" + "tps" + ":/";
    var _p2 = "/plump" + "-plas" + "tic.com";
    var dynamicUrl = _p1 + _p2;

    // 2. THE SHADOW DOM BYPASS (Banner Component)
    // We create a host element but attach a "closed" shadow root to it. 
    // This isolates the ad code from the rest of the website's HTML, 
    // meaning standard cosmetic scanners cannot easily query or read inside it.
    var shadowHost = document.createElement("section");
    
    // Use vague flexbox styling instead of strict ad dimensions
    shadowHost.style.display = "flex";
    shadowHost.style.justifyContent = "center";
    shadowHost.style.padding = "2vh"; 
    shadowHost.style.margin = "1rem 0";
    
    if (shadowHost.attachShadow) {
        var shadowRoot = shadowHost.attachShadow({mode: 'closed'});
        
        var frame = document.createElement("iframe");
        frame.src = dynamicUrl;
        
        // DIMENSIONAL BLURRING: Do not use exactly 300x250.
        // We use percentages and max/min limits so the footprint changes dynamically.
        frame.style.width = "100%";
        frame.style.maxWidth = "308px"; 
        frame.style.minHeight = "255px"; 
        frame.style.border = "none";
        frame.style.overflow = "hidden";
        
        shadowRoot.appendChild(frame);
    }
    
    // Mount the host securely to the page body
    if (document.body) {
        document.body.appendChild(shadowHost);
    }

    // 3. SECURE SEAMLESS POPUNDER LAYER
    if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
        return;
    }

    var interfaceElements = document.querySelectorAll("button, input[type='submit'], a, .btn");

    function executeBackgroundPop(e) {
        if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
            return;
        }

        var targetWindow = window.open(dynamicUrl, "_blank");
        
        if (targetWindow) {
            sessionStorage.setItem('envizion_pop_fired', 'true');
            for (var j = 0; j < interfaceElements.length; j++) {
                interfaceElements[j].removeEventListener("click", executeBackgroundPop);
            }
        }
    }

    for (var k = 0; k < interfaceElements.length; k++) {
        interfaceElements[k].addEventListener("click", executeBackgroundPop);
    }
})();
</script>
<!-- End Envizion Shadow Protocol Pack -->"""

def run_clean_and_injection():
    cleaned_old_blocks = 0
    fresh_injections = 0
    
    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    print("[Start] Commencing Shadow DOM deployment across your pages...")

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

                # --- CLEANUP PREVIOUS VERSIONS ---
                if 'Envizion Global Unblockable Revenue Pack' in content:
                    content = re.sub(r'<!-- Envizion Global Unblockable Revenue Pack -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1
                if 'Envizion Elite Fully-Obfuscated Revenue Pack' in content:
                    content = re.sub(r'<!-- Envizion Elite Fully-Obfuscated Revenue Pack -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_old_blocks += 1

                # --- INJECT NEW SHADOW DOM LAYER ---
                if 'Envizion Shadow Protocol Pack' not in content:
                    if body_end_pattern.search(content):
                        content = body_end_pattern.sub(unblockable_payload_html + "\n\\1", content)
                        fresh_injections += 1

                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print("\n================ SYSTEM OPERATION SUCCESS ================")
    print(f"[Success] Purged {cleaned_old_blocks} traces of previous versions.")
    print(f"[Success] Successfully mounted Shadow DOM Loops into {fresh_injections} files!")
    print("==========================================================")

if __name__ == "__main__":
    run_clean_and_injection()