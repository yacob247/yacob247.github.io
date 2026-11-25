import os
import re

root_directory = '.' 

# Your premium HilltopAds high-revenue MultiTag URL for the 300x250 banner
banner_url = "https://plump-plastic.com"

# Premium High-Revenue Meta Tag Layout Anchor
premium_meta_tag = '\n    <!-- HilltopAds High-Revenue Meta Optimization Tag -->\n    <meta name="referrer" content="no-referrer-when-downgrade" />'

# Universal Banner Code with centralized Flexbox structural alignments
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
    meta_injected = 0
    banner_injected = 0
    
    # Universal fallback layout compiling patterns
    head_end_pattern = re.compile(r'(</\s*head\s*>)', re.IGNORECASE)
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

                # 1. CLEANUP REMOVAL: Clean up layout traces from old banner configurations if present
                if 'adsterra-placement-group' in content:
                    content = re.sub(r'<!-- AdSterra Display and Overlay Ads -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    cleaned_count += 1
                if 'HilltopAds Universal Responsive Banner Wrapper' in content:
                    content = re.sub(r'<!-- HilltopAds Universal Responsive Banner Wrapper -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)

                # 2. INJECT HIGH-REVENUE META TAG: Place inside the page header space
                if head_end_pattern.search(content) and 'HilltopAds High-Revenue Meta Optimization Tag' not in content:
                    content = head_end_pattern.sub(f"{premium_meta_tag}\\1", content)
                    meta_injected += 1

                # 3. UNIVERSAL BANNER INJECTION: Place directly above closing body markers
                if universal_body_pattern.search(content) and 'envizion-global-banner-container' not in content:
                    content = universal_body_pattern.sub(f"\n{universal_banner_html}\n\\1", content)
                    banner_injected += 1

                # Write modifications back to workspace if content has divergence updates
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

    print(f"\n[Success] Cleaned tracking history out of {cleaned_count} layout instances.")
    print(f"[Success] Applied high-revenue metadata headers to {meta_injected} page profiles.")
    print(f"[Success] Mounted unblockable 300x250 MultiTags onto {banner_injected} template streams!")

if __name__ == "__main__":
    precise_banner_injection()
