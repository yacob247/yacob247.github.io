import os
import re

root_directory = '.' 

# Your premium HilltopAds high-revenue Direct Link / MultiTag URL for the 300x250 banner
# (Using the same unblockable monetization URL format from your screenshot)
banner_url = "https://plump-plastic.com"

# Universal Banner Injection Script (Injects global styling and loads safely on ALL pages)
universal_banner_html = """
<!-- HilltopAds Universal Responsive Banner Wrapper -->
<style>
    .envizion-global-banner-container {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 30px auto;
        clear: both;
        text-align: center;
    }
    .envizion-banner-frame {
        width: 300px;
        height: 250px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }
</style>

<div class="envizion-global-banner-container">
    <div class="envizion-banner-frame">
        <script>
        (function(jdpqbei){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = jdpqbei || {};
        s.src = "BANNER_URL_PLACEHOLDER";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
        })({})
        </script>
    </div>
</div>
""".replace("BANNER_URL_PLACEHOLDER", banner_url)

def precise_banner_injection():
    cleaned_count = 0
    injected_count = 0
    
    # Universal fallback anchor that is guaranteed to exist on every single HTML file layout
    universal_body_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

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

                # 1. CLEANUP REMOVAL: Find and wipe out past banner layout attempts completely
                if 'adsterra-placement-group' in content:
                    content = re.sub(r'<!-- AdSterra Display and Overlay Ads -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_count += 1
                if 'HilltopAds Universal Responsive Banner Wrapper' in content:
                    content = re.sub(r'<!-- HilltopAds Universal Responsive Banner Wrapper -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)

                # 2. UNIVERSAL INJECTION: Target directly above the closing body tag
                if universal_body_pattern.search(content) and 'envizion-global-banner-container' not in content:
                    content = universal_body_pattern.sub(f"\n{universal_banner_html}\n\\1", content)
                    injected_count += 1

                # Write changes back if the file layout structure has modified
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print(f"\n[Success] Cleaned legacy banner codes out of {cleaned_count} folder items.")
    print(f"[Success] Applied universal 300x250 banners to {injected_count} layout files perfectly!")

if __name__ == "__main__":
    precise_banner_injection()
