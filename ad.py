import os
import re

root_directory = '.' 

# Original ad URLs
popunder_url = "https://effectivecpmnetwork.com"
banner_url   = "https://highperformanceformat.com"
native_url   = "https://effectivecpmnetwork.com"
social_url   = "https://effectivecpmnetwork.com"

popunder_code = f'\n<!-- AdSterra Popunder Ad -->\n<script src="{popunder_url}"></script>\n'

body_ads_code = f"""
<!-- AdSterra Display and Overlay Ads -->
<div class="adsterra-placement-group" style="text-align: center; margin: 20px auto; clear: both;">
    <!-- 160x600 Banner -->
    <script type="text/javascript">
        atOptions = {{
            'key' : 'c59f5ea73d04a243f74729dbc489d13d',
            'format' : 'iframe',
            'height' : 600,
            'width' : 160,
            'params' : {{}}
        }};
    </script>
    <script type="text/javascript" src="{banner_url}"></script>

    <!-- Native Banner -->
    <script async="async" data-cfasync="false" src="{native_url}"></script>
    <div id="container-826ab5bcf43f7537f86f613c4ee3b633"></div>
</div>

<!-- AdSterra Social Bar Ad -->
<script src="{social_url}"></script>
"""

def force_inject():
    updated = 0
    head_pattern = re.compile(r'(</\s*head\s*>)', re.IGNORECASE)
    body_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    for dirpath, _, filenames in os.walk(root_directory):
        if any(ignored in dirpath for ignored in ['.git', '.github', 'node_modules', 'venv']):
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

                # Forcefully inject codes into place without guard limits
                if head_pattern.search(content) and popunder_url not in content:
                    content = head_pattern.sub(f"{popunder_code}\\1", content)
                if body_pattern.search(content) and 'adsterra-placement-group' not in content:
                    content = body_pattern.sub(f"{body_ads_code}\\1", content)

                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    updated += 1

    print(f"\n[Success] Forcefully added ad scripts to {updated} files.")

if __name__ == "__main__":
    force_inject()
