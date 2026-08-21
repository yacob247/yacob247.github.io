import os
import re

root_directory = '.' 

banner_url   = "https:" + "//" + "www" + "." + "highperformanceformat" + "." + "com" + "/c59f5ea73d04a243f74729dbc489d13d/invoke.js"
native_url   = "https:" + "//" + "pl30945707" + "." + "effectivecpmnetwork" + "." + "com" + "/826ab5bcf43f7537f86f613c4ee3b633/invoke.js"

responsive_css_code = """
<!-- Adsterra Mainstream Responsive Configuration -->
<style>
    .envizion-mobile-ad { display: none !important; }
    .envizion-desktop-ad { display: block; text-align: center; margin: 20px auto; clear: both; }
    @media screen and (max-width: 768px) {
        .envizion-desktop-ad { display: none !important; }
        .envizion-mobile-ad { display: block !important; text-align: center; margin: 15px auto; clear: both; }
    }
</style>
"""

body_ads_code = f"""
<!-- AdSterra Mainstream Placements -->
<div class="adsterra-placement-group" style="text-align: center; margin: 25px auto; clear: both; width: 100%;">
    
    <!-- 💻 Desktop Layout (728x90 Banner) -->
    <div class="envizion-desktop-ad">
        <script type="text/javascript">
            atOptions = {{
                'key' : 'c59f5ea73d04a243f74729dbc489d13d',
                'format' : 'iframe',
                'height' : 90,
                'width' : 728,
                'params' : {{}}
            }};
        </script>
        <script type="text/javascript" src="{banner_url}"></script>
    </div>

    <!-- 📱 Mobile Layout (Native Banner Box) -->
    <div class="envizion-mobile-ad">
        <script async="async" data-cfasync="false" src="{native_url}"></script>
        <div id="container-826ab5bcf43f7537f86f613c4ee3b633"></div>
    </div>

</div>
"""

def precise_inject_ads():
    updated = 0
    head_pattern = re.compile(r'(</\s*head\s*>)', re.IGNORECASE)
    
    # Strictly target elements above the footer to stop bottom/under page bleeding
    content_patterns = [
        re.compile(r'(<\s*/\s*main\s*>)', re.IGNORECASE),                         
        re.compile(r'(<\s*footer[^>]*>)', re.IGNORECASE),                         
        re.compile(r'(<\s*div[^>]*class="[^"]*container[^"]*"[^>]*>)', re.IGNORECASE) 
    ]

    for dirpath, _, filenames in os.walk(root_directory):
        if '.git' in dirpath or '.github' in dirpath:
            continue

        for filename in filenames:
            if filename.endswith('.html') or filename.endswith('.htm'):
                file_path = os.path.join(dirpath, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except Exception:
                    continue

                # Guard check to ensure it doesn't double-inject
                if 'adsterra-placement-group' in content:
                    continue

                original_content = content

                if head_pattern.search(content):
                    content = head_pattern.sub(f"{responsive_css_code}\\1", content)
                
                injected = False
                for pattern in content_patterns:
                    if pattern.search(content):
                        content = pattern.sub(f"\n{body_ads_code}\n\\1", content)
                        injected = True
                        break

                if not injected:
                    body_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)
                    if body_pattern.search(content):
                        content = body_pattern.sub(f"{body_ads_code}\\1", content)

                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    updated += 1

    print(f"\n[Success] Cleaned, repositioned away from page bounds, and updated {updated} files.")

if __name__ == "__main__":
    precise_inject_ads()
