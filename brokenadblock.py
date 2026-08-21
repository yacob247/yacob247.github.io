import os
import re

# Set root directory to scan all files in your project folders
root_directory = '.' 

# 1. THE ANTI-ADBLOCK OBFUSCATED URL ENGINE (CrazyGames Layout Style)
# We slice your monetization URL into segments so ad blockers pass right over it during file scans.
obfuscated_url_js = """
    var _p1 = "ht" + "tps" + ":/";
    var _p2 = "/plump" + "-plas" + "tic.com";
    var dynamicUrl = _p1 + _p2;
"""

# 2. COMBINED PAYLOAD PACK: BANNER + POPUNDER WITH ZERO WEB CONTAINERS
combined_payload_html = """<!-- Envizion Global Unblockable Revenue Pack -->
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function() {
    var _p1 = "ht" + "tps" + ":/";
    var _p2 = "/plump" + "-plas" + "tic.com";
    var dynamicUrl = _p1 + _p2;
    
    // --- PART A: UNBLOCKABLE 300x250 SIDEBAR BANNER INJECTION ---
    // Instead of using rigid ad frames, we fetch the element and render it inside a random grid box
    var randomBoxId = "grid_mod_" + Math.floor(Math.random() * 99999);
    var bannerWrapper = document.createElement("div");
    bannerWrapper.id = randomBoxId;
    bannerWrapper.style.width = "300px";
    bannerWrapper.style.height = "250px";
    bannerWrapper.style.margin = "15px auto";
    bannerWrapper.style.textAlign = "center";
    
    // Create an unblockable direct structural frame targeting our scrambled layout URL
    var frame = document.createElement("iframe");
    frame.src = dynamicUrl;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.scrolling = "no";
    
    bannerWrapper.appendChild(frame);
    
    // Safely dock the banner into the main webpage layout grid structure outside the game
    var pageBody = document.body;
    if (pageBody) {
        pageBody.appendChild(bannerWrapper);
    }

    // --- PART B: SESSION-BASED ANTI-ADBLOCK POPUNDER ENGINE ---
    // If it triggered once during this gameplay session, lock it out completely
    if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
        return;
    }

    // Target only functional user action items (buttons, links, click regions)
    const clickableElements = document.querySelectorAll("button, input[type='submit'], a, .btn");

    function executePopunder(e) {
        if (sessionStorage.getItem('envizion_pop_fired') === 'true') {
            return;
        }

        // Fires the campaign link cleanly in a hidden background tab window
        var adTab = window.open(dynamicUrl, "_blank");
        
        if (adTab) {
            // Set session lockout flag so it cannot annoy users again until a page refresh
            sessionStorage.setItem('envizion_pop_fired', 'true');
            
            // Dismantle all active listeners instantly from the page elements
            clickableElements.forEach(el => el.removeEventListener("click", executePopunder));
        }
    }

    // Attach interaction triggers directly to the interface assets
    clickableElements.forEach(el => el.addEventListener("click", executePopunder));
});
</script>
<!-- End Envizion Revenue Pack -->"""

def run_clean_and_injection():
    cleaned_banners = 0
    cleaned_popunders = 0
    fresh_injections = 0
    
    # Compile safe regex tracking anchors for targeted body injection
    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    print("[Process] Initializing master cleanup and revenue migration across 3,000 files...")

    for dirpath, _, filenames in os.walk(root_directory):
        # Skip package environments and local system files entirely
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

                # --- STEP 1: DEEP CLEANUP REMOVAL ---
                # Wipe out old legacy banner footprints completely
                if 'adsterra-placement-group' in content:
                    content = re.sub(r'<!--.*?adsterra-placement-group.*?-->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_banners += 1
                    
                if 'HilltopAds Universal Responsive Banner Wrapper' in content:
                    content = re.sub(r'<!-- HilltopAds Universal Responsive Banner Wrapper -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_banners += 1

                if 'envizion-global-banner-container' in content:
                    content = re.sub(r'<!-- envizion-global-banner-container -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_banners += 1

                # Wipe out old legacy cookie/script popunder engine configs
                if 'HilltopAds High-Revenue Popunder Engine' in content:
                    content = re.sub(r'<!-- HilltopAds High-Revenue Popunder Engine -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_popunders += 1
                    
                if 'HilltopAds High-Revenue Non-Intrusive Popunder Engine' in content:
                    content = re.sub(r'<!-- HilltopAds High-Revenue Non-Intrusive Popunder Engine -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_popunders += 1

                # --- STEP 2: CLEAN COMBINED INJECTION ---
                # Place the new unified script pack right above the closing body tag
                if 'Envizion Global Unblockable Revenue Pack' not in content:
                    if body_end_pattern.search(content):
                        content = body_end_pattern.sub(f"{combined_payload_html}\n\\1", content)
                        fresh_injections += 1

                # Save the new architecture back to storage if layout tracks changed
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print("\n================== REGISTRY COMPLETE ==================")
    print(f"[Success] Removed {cleaned_banners} obsolete banner blocks.")
    print(f"[Success] Stripped {cleaned_popunders} legacy popunder scripts out of active files.")
    print(f"[Success] Embedded the Unblockable Combined Engine into {fresh_injections} pages!")
    print("=======================================================")

if __name__ == "__main__":
    run_clean_and_injection()
