import os
import re

# We will test on just ONE file first to confirm it works perfectly
test_file_path = "./index.html"

popunder_code = '\n<!-- Popunder Ad -->\n<script src="https://effectivecpmnetwork.com"></script>\n'

body_ads_code = """
<!-- AdSterra Display and Overlay Ads -->
<div class="adsterra-placement-group" style="text-align: center; margin: 20px auto;">
    <!-- 160x600 Banner -->
    <script type="text/javascript">
        atOptions = {
            'key' : 'c59f5ea73d04a243f74729dbc489d13d',
            'format' : 'iframe',
            'height' : 600,
            'width' : 160,
            'params' : {}
        };
    </script>
    <script type="text/javascript" src="https://highperformanceformat.com"></script>

    <!-- Native Banner -->
    <script async="async" data-cfasync="false" src="https://effectivecpmnetwork.com"></script>
    <div id="container-826ab5bcf43f7537f86f613c4ee3b633"></div>
</div>

<!-- Social Bar Ad -->
<script src="https://effectivecpmnetwork.com"></script>
"""

def test_inject():
    if not os.path.exists(test_file_path):
        print(f"Error: Could not find {test_file_path} in this directory.")
        return

    with open(test_file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Dynamic regex to catch variations of </head> and </body> tags
    head_pattern = re.compile(r'(</\s*head\s*>)', re.IGNORECASE)
    body_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)

    original_content = content

    if head_pattern.search(content):
        content = head_pattern.sub(f"{popunder_code}\\1", content)
    else:
        print("Notice: No </head> tag found in this file.")

    if body_pattern.search(content):
        content = body_pattern.sub(f"{body_ads_code}\\1", content)
    else:
        print("Notice: No </body> tag found in this file.")

    if content != original_content:
        with open(test_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully updated test file: {test_file_path}")
    else:
        print("No changes made. The tags might not have matched.")

if __name__ == "__main__":
    test_inject()
