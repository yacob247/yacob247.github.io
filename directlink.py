import os
import re

ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html"]

# ==========================================
# LAYOUT 1: STICKY INLINE VERTICAL SIDEBAR
# ==========================================
VERTICAL_SIDEBAR_CODE = """    <!-- Native Layout 1: Vertical Sidebar Banner (Non-Overlay) -->
    <div class="native-ad-sidebar-container" style="display: flex; max-width: 1200px; margin: 20px auto; padding: 0 15px; font-family: system-ui, sans-serif; box-sizing: border-box;">
        <div style="flex: 1; min-width: 0;"><!-- Your Existing Main Content Wraps Here -->"""

VERTICAL_SIDEBAR_CLOSING = """        </div>
        <!-- Safe Sidebar Panel -->
        <div style="width: 260px; margin-left: 20px; flex-shrink: 0; box-sizing: border-box; display: block;">
            <div id="dynamic-v-box" style="background: #fdfdfd; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; position: sticky; top: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <span id="dynamic-v-label" style="display: block; font-size: 10px; color: #a0aec0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">Sponsored Widget</span>
                <h4 id="dynamic-v-title" style="margin: 0 0 10px 0; font-size: 15px; color: #2d3748; line-height: 1.3;">Need Faster Bandwidth?</h4>
                <p id="dynamic-v-desc" style="margin: 0 0 20px 0; font-size: 12px; color: #718096; line-height: 1.5;">Support our gaming assets pipeline by utilizing premium host mirrors.</p>
                <a id="dynamic-v-btn" href="https://omg10.com/4/11638041" target="_blank" rel="noopener noreferrer" style="display: block; background: #3182ce; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(49,130,206,0.25); transition: all 0.2s;">⚡ Open High-Speed Mirror</a>
            </div>
        </div>
    </div>
    <script>
        (function() {
            var v_variants = [
                { title: "⚡ Speed Up Transfers", desc: "Instantly unlock maximum cloud hosting distribution pipes securely.", text: "Connect Node Now", bg: "#2b6cb0" },
                { title: "🎮 Uncapped Cloud Slots", desc: "Running into processing lags? Route assets via premium gaming channels.", text: "Bypass Staging Hub", bg: "#b83280" },
                { title: "🛠️ Admin Cloud Node", desc: "Direct file execution routes deployed and optimized for your area.", text: "Access Direct Server", bg: "#2f855a" }
            ];
            var pick = v_variants[Math.floor(Math.random() * v_variants.length)];
            document.getElementById('dynamic-v-title').textContent = pick.title;
            document.getElementById('dynamic-v-desc').textContent = pick.desc;
            var btn = document.getElementById('dynamic-v-btn');
            btn.textContent = pick.text;
            btn.style.backgroundColor = pick.bg;
            document.getElementById('dynamic-v-box').style.borderTop = "4px solid " + pick.bg;
        })();
    </script>"""

# ==========================================
# LAYOUT 2: COMPACT HORIZONTAL BAR HEADER
# ==========================================
HORIZONTAL_BAR_CODE = """    <!-- Native Layout 2: Compact Horizontal Content Banner (Non-Overlay) -->
    <div class="native-ad-horizontal-wrapper" style="margin: 15px auto; padding: 0 15px; max-width: 900px; font-family: system-ui, sans-serif; box-sizing: border-box;">
        <div id="dynamic-h-box" style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 20px; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 280px;">
                <span style="background: #e2e8f0; color: #475569; font-size: 9px; font-weight: 700; padding: 3px 6px; border-radius: 3px; text-transform: uppercase;">Sponsor</span>
                <div>
                    <h4 id="dynamic-h-title" style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">Alternative Download Path Ready</h4>
                    <p id="dynamic-h-desc" style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Get direct mirror access for all toolkit components.</p>
                </div>
            </div>
            <a id="dynamic-h-btn" href="https://omg10.com/4/11638041" target="_blank" rel="noopener noreferrer" style="background: #0f172a; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 4px; white-space: nowrap; transition: background 0.2s;">Grab Direct Link</a>
        </div>
    </div>
    <script>
        (function() {
            var h_variants = [
                { title: "🚀 10x Bandwidth Mirror Active", desc: "Skip global traffic lines using our premium direct-access cloud.", text: "Use Fast Route", bg: "#16a34a" },
                { title: "💎 Secure Network Channel", desc: "Asset links verified clean and optimized for localized desktop extractions.", text: "Pull Secure File", bg: "#2563eb" },
                { title: "🌪️ Express Queue Lane Available", desc: "Bypass normal load limitations using external node partners.", text: "Enter Express Node", bg: "#ea580c" }
            ];
            var pick = h_variants[Math.floor(Math.random() * h_variants.length)];
            document.getElementById('dynamic-h-title').textContent = pick.title;
            document.getElementById('dynamic-h-desc').textContent = pick.desc;
            var btn = document.getElementById('dynamic-h-btn');
            btn.textContent = pick.text;
            btn.style.backgroundColor = pick.bg;
        })();
    </script>"""

# ==========================================
# LAYOUT 3: FULL-WIDTH CONTENT INLINE CARD
# ==========================================
INLINE_CARD_CODE = """    <!-- Native Layout 3: Inline Content Display Card (Non-Overlay) -->
    <div class="native-ad-card-wrapper" style="margin: 30px auto; padding: 0 15px; max-width: 680px; font-family: system-ui, sans-serif; box-sizing: border-box;">
        <div id="dynamic-c-box" style="background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.02);">
            <span style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Partner Announcement</span>
            <h3 id="dynamic-c-title" style="margin: 10px 0 8px 0; font-size: 18px; color: #0f172a; font-weight: 800;">Free Platform Support Lane</h3>
            <p id="dynamic-c-desc" style="margin: 0 0 20px 0; font-size: 13px; color: #475569; line-height: 1.5;">Click below to browse our feature sponsor options and help maintain our server infrastructure costs.</p>
            <a id="dynamic-c-btn" href="https://omg10.com/4/11638041" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 32px; background: #7c3aed; color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">✨ Continue to External Sponsor</a>
        </div>
    </div>
    <script>
        (function() {
            var c_variants = [
                { title: "📦 Need High Capacity Cloud Storage?", desc: "Sync, store, and stream heavy files utilizing premium processing pools.", text: "Explore Cloud Pools", bg: "#7c3aed" },
                { title: "⚡ Instant Unlimited Staging Download", desc: "Avoid multiple routing delays. Jump directly to verified file repositories.", text: "Access Repository Node", bg: "#db2777" },
                { title: "🛡️ Integrity Check Node Passed", desc: "Our platform partners verify safe data handshakes via encrypted external channels.", text: "Download Secure Mirror", bg: "#0d9488" }
            ];
            var pick = c_variants[Math.floor(Math.random() * c_variants.length)];
            document.getElementById('dynamic-c-title').textContent = pick.title;
            document.getElementById('dynamic-c-desc').textContent = pick.desc;
            var btn = document.getElementById('dynamic-c-btn');
            btn.textContent = pick.text;
            btn.style.backgroundColor = pick.bg;
        })();
    </script>"""

ANY_AD_INDICATOR = "native-ad-"

EXCLUDED_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html", "codewebabout.html", "index.html"]

def clean_past_attempts(content):
    # 1. PURGE ENDEAVOR 1: Direct Ad Network Link Event Handler (Popunder)
    content = re.sub(r'<!-- Direct Ad Network Link Event Handler -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<script[^>]*>\s*function openAdLink[\s\S]*?<\/script>', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<script[^>]*>.*?triggerFirstAd.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # 2. PURGE ENDEAVOR 2: Authentic Featured Ad Link Banner (Button)
    content = re.sub(r'<!-- Authentic Featured Ad Link Banner -->.*?<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<div class="featured-ad-container"[^>]*>.*?<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # 3. PURGE ENDEAVOR 3: Native Sponsored Advertisement Banner Block
    content = re.sub(r'<!-- Native Sponsored Advertisement Banner Block -->.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<div class="native-sponsor-ad-wrapper"[^>]*>.*?<\/div>\s*<\/div>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # 4. PURGE CURRENT MULTI-LAYOUTS (In case of broken/partial previous runs)
    # Layout 2 (Horizontal) & Layout 3 (Card) - Safe to delete whole block
    content = re.sub(r'<!-- Native Layout 2:.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<!-- Native Layout 3:.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<div class="native-ad-horizontal-wrapper".*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<div class="native-ad-card-wrapper".*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Layout 1 (Sidebar) - Requires safe "unwrapping" so we don't delete your actual page content
    content = re.sub(r'<!-- Native Layout 1:.*?<!-- Your Existing Main Content Wraps Here -->', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<\/div>\s*<!-- Safe Sidebar Panel -->.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Final aggressive sweep for any leftover tracking links or markers
    content = re.sub(r'<script[^>]*>[^<]*omg10\.com[^<]*<\/script>', '', content, flags=re.IGNORECASE)
    
    # Clean up massive gaps of blank lines left behind by the deletions
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    return content

def distribute_ad_layouts():
    print(f"Executing Master Purge & Multi-Layout Distribution in: {ROOT_PATH}\n")
    
    lines = content.splitlines()
    cleaned_lines = []
    for line in lines:
        if not any(m in line for m in dirty_markers):
            cleaned_lines.append(line)
            
    return "\n".join(cleaned_lines)

def distribute_ad_layouts():
    print(f"Executing Multi-Layout Distribution Sweeps in: {ROOT_PATH}\n")
    counts = {"sidebar": 0, "horizontal": 0, "card": 0}
    skipped = {"excluded": 0, "already_has_ad": 0, "no_body_tags": 0}
    
    for root, dirs, files in os.walk(ROOT_PATH):
        # Calculate current relative depth directory names safely
        folder_name = os.path.basename(root).lower()
        parent_dir = os.path.dirname(root)
        parent_folder = os.path.basename(parent_dir).lower() if parent_dir else ""
        
        for file in files:
            if file.lower().endswith('.html'):
                if file.lower() in EXCLUDED_PAGES:
                    skipped["excluded"] += 1
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    content = clean_past_attempts(content)
                    
                    # Prevent duplicates
                    if ANY_AD_INDICATOR in content:
                        skipped["already_has_ad"] += 1
                        continue
                    
                    # Search for body tags
                    body_match = re.search(r"<body[^>]*>", content, re.IGNORECASE)
                    close_body_match = re.search(r"</body>", content, re.IGNORECASE)
                    
                    # Fallback if body tags are missing: assume the whole file is the body
                    b_pos = 0
                    cb_pos = len(content)
                    has_body_tags = False
                    
                    if body_match and close_body_match:
                        b_pos = body_match.end()
                        cb_pos = close_body_match.start()
                        has_body_tags = True
                    else:
                         print(f"Warning: No <body> tags found in {file}. Attempting fallback injection.")
                         skipped["no_body_tags"] += 1 # We still track it, but we won't skip it entirely now

                    # Determine optimal layout strategy based on path structural metrics
                    if "game" in folder_name or "game" in parent_folder:
                        # Strategy A: Wrapping the page layout into an Inline Vertical Split Sidebar
                        if has_body_tags:
                            updated = content[:b_pos] + "\n" + VERTICAL_SIDEBAR_CODE + content[b_pos:cb_pos] + VERTICAL_SIDEBAR_CLOSING + "\n" + content[cb_pos:]
                        else:
                            updated = VERTICAL_SIDEBAR_CODE + content + VERTICAL_SIDEBAR_CLOSING
                        counts["sidebar"] += 1
                        
                    elif "tools" in folder_name or "tools2" in folder_name:
                        # Strategy B: Horizontal Bar docked cleanly below headers
                        target_tag = "</header>"
                        target_idx = content.find(target_tag)
                        
                        if target_idx == -1: 
                            target_tag = "</nav>"
                            target_idx = content.find(target_tag)
                            
                        if target_idx == -1: 
                            target_idx = b_pos # Use body start or file start as fallback
                        else: 
                            target_idx += len(target_tag)
                            
                        updated = content[:target_idx] + "\n" + HORIZONTAL_BAR_CODE + content[target_idx:]
                        counts["horizontal"] += 1
                        
                    else:
                        # Strategy C: Full Width Native Display Cards for blog flows and main root indices
                        target_tag = "<main>"
                        target_idx = content.find(target_tag)
                        
                        if target_idx == -1: 
                            target_tag = '<div class="container">'
                            target_idx = content.find(target_tag)
                            
                        if target_idx == -1: 
                            target_idx = b_pos # Use body start or file start as fallback
                        else: 
                            target_idx += len(target_tag)
                            
                        updated = content[:target_idx] + "\n" + INLINE_CARD_CODE + content[target_idx:]
                        counts["card"] += 1
                        
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(updated)
                    print(f"Configured Layout [{os.path.basename(file_path)}]: {os.path.relpath(file_path, ROOT_PATH)}")
                except Exception as e:
                    print(f"Error processing {file}: {e}")
                    
    print(f"\nDeployment Matrix Successfully Distributed!")
    print(f"🔹 Vertical Sidebars (Games): {counts['sidebar']}")
    print(f"🔹 Horizontal Headers (Tools): {counts['horizontal']}")
    print(f"🔹 Inline Content Cards (Blogs/Roots): {counts['card']}")
    print(f"\n--- Diagnostics ---")
    print(f"🔸 Skipped (Explicitly Excluded): {skipped['excluded']}")
    print(f"🔸 Skipped (Already Has Ad): {skipped['already_has_ad']}")
    print(f"🔸 Warning (No <body> tags, used fallback): {skipped['no_body_tags']}")

if __name__ == "__main__":
    distribute_ad_layouts()