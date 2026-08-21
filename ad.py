import os
import re

root_directory = '.' 

# Reconstruct the long script paths using dynamic string addition 
# to stop Codespaces/Git from truncating or stripping the URLs.
popunder_url = "https:" + "//" + "pl30945705" + "." + "effectivecpmnetwork" + "." + "com" + "/53/44/2b/53442bce7c99993e423850e0f8f43f1a.js"
banner_url   = "https:" + "//" + "www" + "." + "highperformanceformat" + "." + "com" + "/c59f5ea73d04a243f74729dbc489d13d/invoke.js"
native_url   = "https:" + "//" + "pl30945707" + "." + "effectivecpmnetwork" + "." + "com" + "/826ab5bcf43f7537f86f613c4ee3b633/invoke.js"
social_url   = "https:" + "//" + "pl30945706" + "." + "effectivecpmnetwork" + "." + "com" + "/b8/a0/d7/b8a0d7ccfba96d7484ebda7c760c807b.js"

popunder_code = f"""
<!-- AdSterra Popunder Ad -->
<script src="{popunder_url}"></script>
"""

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

def precise_inject_ads():
    updated = 0
    head_pattern = re.compile(r'(</\s*head\s*>)', re.IGNORECASE)
    body_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    for dirpath, _, filenames in os.walk(root_directory):
        if '.git' in dirpath or '.github' in dirpath:
            continue

        for filename in filenames:
            if filename.endswith('.html') or filename.endswith('.htm'):
                file_path = os.path.join(dirpath, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except Exception as e:
                    continue

                if '53442bce7c99993e423850e0f8f43f1a' in content:
                    continue

                original_content = content

                if head_pattern.search(content):
                    content = head_pattern.sub(f"{popunder_code}\\1", content)
                if body_pattern.search(content):
                    content = body_pattern.sub(f"{body_ads_code}\\1", content)

                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    updated += 1

    print(f"\n[Success] Fixed and updated {updated} files with the full URL paths.")

if __name__ == "__main__":
    precise_inject_ads()