import os
import glob
import re

BASE_DIR = r"C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main"

# Filenames strictly excluded from ad injection
EXCLUDED_EXACT_NAMES = {
    "index.html",
    "indexcopy.html",
    "privacy.html",
    "terms.html",
    "about.html",
    "codewebabout.html",
    "contact.html",
    "editorial-policy.html",
    "disclaimer.html",
    "unsubscribe.html",
    "404.html",
    "website-envizion.html"
}

# Substring patterns to exclude
EXCLUDED_PATTERNS = ["admin"]

# Unified Monetag & HilltopAds Integrated Ad System Payload
AD_SYSTEM_CODE = """
<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM START -->

<!-- 1. Monetag Native Horizontal Ad Container (Top Content Banner) -->
<div class="native-ad-horizontal-wrapper" style="margin: 20px auto; padding: 0 15px; max-width: 900px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box;">
    <div id="dynamic-h-box" style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 280px;">
            <span style="background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Sponsor</span>
            <div>
                <h4 id="dynamic-h-title" style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">Alternative Download Path Ready</h4>
                <p id="dynamic-h-desc" style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Get direct mirror access for all toolkit components.</p>
            </div>
        </div>
        <a id="dynamic-h-btn" href="https://omg10.com/4/11638041" target="_blank" rel="noopener noreferrer" style="background: #0f172a; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 6px; white-space: nowrap; transition: all 0.2s ease;">Grab Direct Link</a>
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
        var titleEl = document.getElementById('dynamic-h-title');
        var descEl = document.getElementById('dynamic-h-desc');
        var btnEl = document.getElementById('dynamic-h-btn');
        if (titleEl) titleEl.textContent = pick.title;
        if (descEl) descEl.textContent = pick.desc;
        if (btnEl) {
            btnEl.textContent = pick.text;
            btnEl.style.backgroundColor = pick.bg;
        }
    })();
</script>

<!-- 2. Monetag Floating Sticky Sidebars (Collapsible Left & Right Rails) -->
<style id="monetag-hilltop-sidebar-system">
  .ad-sidebar {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 99999;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .ad-sidebar-left {
    left: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .ad-sidebar-left.collapsed {
    transform: translateY(-50%) translateX(-100%);
  }

  .ad-sidebar-right {
    right: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .ad-sidebar-right.collapsed {
    transform: translateY(-50%) translateX(100%);
  }

  .ad-sidebar-toggle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: #111827;
    color: #ffffff;
    border: none;
    padding: 12px 6px;
    cursor: pointer;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.5px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    user-select: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    transition: background 0.2s ease;
  }

  .ad-sidebar-toggle:hover {
    background: #2563eb;
  }

  .ad-sidebar-left .ad-sidebar-toggle {
    right: -28px;
    border-radius: 0 6px 6px 0;
  }

  .ad-sidebar-right .ad-sidebar-toggle {
    left: -28px;
    border-radius: 6px 0 0 6px;
  }

  .ad-sidebar-content {
    width: 160px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 4px;
    background: #ffffff;
    overflow-y: auto;
  }

  .ad-sidebar-iframe {
    width: 160px;
    height: 250px;
    border: none;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .ad-sidebar {
      display: none !important;
    }
  }
</style>

<script>
(function() {
  if (window.innerWidth <= 768) return;

  // Left Sidebar
  const leftSidebar = document.createElement('div');
  leftSidebar.className = 'ad-sidebar ad-sidebar-left';
  leftSidebar.innerHTML = `
    <button class="ad-sidebar-toggle" aria-label="Toggle Left Ad">Hide Ad</button>
    <div class="ad-sidebar-content">
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638044" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638043" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638042" loading="lazy" scrolling="no"></iframe>
    </div>
  `;

  // Right Sidebar
  const rightSidebar = document.createElement('div');
  rightSidebar.className = 'ad-sidebar ad-sidebar-right';
  rightSidebar.innerHTML = `
    <button class="ad-sidebar-toggle" aria-label="Toggle Right Ad">Hide Ad</button>
    <div class="ad-sidebar-content">
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638041" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638040" loading="lazy" scrolling="no"></iframe>
    </div>
  `;

  document.body.appendChild(leftSidebar);
  document.body.appendChild(rightSidebar);

  function setupToggle(sidebar) {
    const btn = sidebar.querySelector('.ad-sidebar-toggle');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isCollapsed = sidebar.classList.toggle('collapsed');
        btn.textContent = isCollapsed ? 'Show Ad' : 'Hide Ad';
      });
    }
  }

  setupToggle(leftSidebar);
  setupToggle(rightSidebar);
})();
</script>

<!-- 3. HilltopAds Layout Grid & Interactive Side Rails -->
<!-- ENVIZION_MONETIZATION_START -->
<div class="envizion-hilltop-layout">
<section class="envizion-hilltop-formats" aria-label="Sponsored content" style="max-width:1100px;margin:20px auto;padding:10px;text-align:center;clear:both;position:relative;z-index:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;">
  <style>
    .envizion-hilltop-formats > .envizion-hilltop-left-rail, .envizion-hilltop-formats > .envizion-hilltop-right-rail { min-width:0; display:grid; gap:16px; align-content:start; align-items:start; width:100%; max-width:300px; padding:12px; border:1px solid #dbe3ef; border-radius:14px; background:#fff; box-shadow:0 8px 24px rgba(15,23,42,.08); transition:transform .22s ease, opacity .22s ease; }
    .envizion-hilltop-formats > .envizion-hilltop-left-rail { justify-self:end; }
    .envizion-hilltop-formats > .envizion-hilltop-right-rail { justify-self:start; }
    .envizion-hilltop-formats .envizion-hilltop-left-rail > div, .envizion-hilltop-formats .envizion-hilltop-right-rail > div { min-width:0; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; overflow:hidden; }
    .envizion-hilltop-formats [data-ad-status="unavailable"] { display:none !important; }
    .envizion-hilltop-formats img, .envizion-hilltop-formats iframe, .envizion-hilltop-formats video { width:100%; max-width:100%; height:auto; }
    .envizion-hilltop-formats iframe { height:250px; }
    .envizion-hilltop-formats .envizion-hilltop-smartlink { justify-self:stretch; text-align:center; white-space:nowrap; }
    .envizion-hilltop-rail-toggle { justify-self:end; border:0; border-radius:999px; padding:7px 12px; background:#0f172a; color:#fff; font:700 12px/1 system-ui,sans-serif; cursor:pointer; box-shadow:0 6px 16px rgba(15,23,42,.18); }
    .envizion-hilltop-right-rail > .envizion-hilltop-rail-toggle { justify-self:start; }
    .envizion-hilltop-left-rail.envizion-hilltop-collapsed { transform:translateX(calc(-100% + 56px)); opacity:.72; }
    .envizion-hilltop-right-rail.envizion-hilltop-collapsed { transform:translateX(calc(100% - 56px)); opacity:.72; }
    .envizion-hilltop-collapsed > :not(.envizion-hilltop-rail-toggle) { pointer-events:none; }
    @media (max-width:760px) { .envizion-hilltop-formats { grid-template-columns:1fr; } .envizion-hilltop-formats > .envizion-hilltop-left-rail, .envizion-hilltop-formats > .envizion-hilltop-right-rail { justify-self:stretch; max-width:none; } }
  </style>

  <!-- Left Rail -->
  <div class="envizion-hilltop-left-rail">
    <button type="button" class="envizion-hilltop-rail-toggle" aria-expanded="true" onclick="var rail=this.closest('.envizion-hilltop-left-rail, .envizion-hilltop-right-rail'); var c=rail.classList.toggle('envizion-hilltop-collapsed'); this.textContent=c?'Show ads':'Hide ads'; this.setAttribute('aria-expanded',(!c).toString());">Hide ads</button>
    
    <!-- Static Banner -->
    <aside aria-label="Sponsored advertisement" class="envizion-hilltopads-static-banner" style="max-width:728px;margin:12px auto 0;padding:0;text-align:center;clear:both;">
      <a href="https://plump-plastic.com/AUu7Y4" target="_blank" rel="sponsored noopener" referrerpolicy="no-referrer-when-downgrade" style="display:block;color:#1d4ed8;text-decoration:none;">
        <span style="display:block;margin-bottom:6px;font:600 13px/1.4 system-ui,sans-serif;">Sponsored advertisement · View offer</span>
        <img src="https://static.hilltopads.com/other/banners/pub/huge_income/728x90.gif?v=1787300403" alt="Sponsored advertisement" width="728" height="90" loading="eager" decoding="async" style="display:block;max-width:100%;height:auto;margin:0 auto;border:0;">
      </a>
    </aside>

    <!-- Hilltop Push -->
    <div class="envizion-hilltop-push" data-format="push">
      <script>
      (function(vyq){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = vyq || {};
        s.src = "//relieved-understanding.com/bUXWV.sQdCGnl/0dYsWocf/WeCmr9/uVZYUrl/kTPcTBcFzdMgz/kR5/Ngz/cgteNczeM/zBOfTNk/4YMKQV";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>

    <div class="envizion-hilltop-additional-1" data-format="additional">
      <script>
      (function(cfvbq){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = cfvbq || {};
        s.src = "//relieved-understanding.com/b.XAVbscdWGulD0/YuWicf/Me/m/9RugZ_UwlqkyPVTycQz-N/D/Ibw/MvDBUmtRN/zLMH0wMTjQAAwCOiQG";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>

    <div class="envizion-hilltop-additional-2" data-format="additional">
      <script>
      (function(hfzm){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = hfzm || {};
        s.src = "//relieved-understanding.com/brXZV.sPdDG_la0OYEWlcD/EeTmF9auoZjUXlikNPrT-cnziN-D/EG5/OTDWk/tdNHzeMH0/M/TFkQ5AMCwl";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>

    <div class="envizion-hilltop-additional-3" data-format="additional">
      <script>
      (function(hfzm){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = hfzm || {};
        s.src = "//relieved-understanding.com/btXTVhsFd.G/lG0OYHWNcm/delmj9VukZdUIlYkWPDTic/z/N/DAE/5oNZzdMbtBNFz/Mm0/METlkS3_N-wc";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>
  </div>

  <!-- Right Rail -->
  <div class="envizion-hilltop-right-rail">
    <button type="button" class="envizion-hilltop-rail-toggle" aria-expanded="true" onclick="var rail=this.closest('.envizion-hilltop-left-rail, .envizion-hilltop-right-rail'); var c=rail.classList.toggle('envizion-hilltop-collapsed'); this.textContent=c?'Show ads':'Hide ads'; this.setAttribute('aria-expanded',(!c).toString());">Hide ads</button>

    <div class="envizion-hilltop-additional-5" data-format="additional">
      <script>
      (function(hfzm){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = hfzm || {};
        s.src = "//relieved-understanding.com/bbX/VAs.dwG/l/0UYPWNco/yeuma9/uMZ-UWlCkkP/TWc/zMNkD/IbwdM/DRUqtgNxzJMd0/MpjeA/wKO/QB";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>

    <!-- Video Slider -->
    <div class="envizion-hilltop-video-slider" data-format="video-slider">
      <script>
      (function(aq){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = aq || {};
        s.src = "//relieved-understanding.com/boXPVms.dVGAld0fY/WCcv/IejmT9huGZVUFlGkRP/TfcjzLMPz-kC5FO/TGM/t/N/zbM_zpO/TKkW5iN/wF";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>

    <div class="envizion-hilltop-additional-4" data-format="additional">
      <script>
      (function(hfzm){
        var d = document, s = d.createElement('script'), l = d.scripts[d.scripts.length - 1];
        s.settings = hfzm || {};
        s.src = "//relieved-understanding.com/bcXPV.sxdjGjlU0SYrWecF/Vefm/9XuFZCUtlnkVPVTecizzMBzGkY0LNTziMmtQN/zlMYzeOZTwQk3/Nawm";
        s.async = true; s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
      </script>
    </div>

    <!-- VAST Video Ads -->
    <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="https://subtle-injury.com/d.mOFCzWdrG/NcvdZDGOUT/kesmM9gudZGUDlfk/PITOcNzuNlDnAnwjMBD/kFttNmzeMr0UMsDVA-x/Mmwm"></div>
    <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="https://subtle-injury.com/dGm-Fez/d.G_NvvnZAGjUP/Begm/9PuGZIUGlRkeP/T/cHzYNfDRAvwRMrDZkktDN/zxMK0UMxDpAex/MYy/ZCsQatWx1/pkdoDE0KxW"></div>
    <div class="envizion-hilltop-vast" data-format="vast-3.0" data-vast-tag="https://subtle-injury.com/drmYFKz.d/GNNdvDZgGkUn/ceKmg9_uUZQUxlKkMPVT/ckzLN/D_Aww/MZD-k/t/N/zOM/0NMADvAAx/MJwF"></div>
    
    <a class="envizion-hilltop-smartlink" href="https://plump-plastic.com/bk3OV_0XP.3BpJvCbnm/VjJ/ZcDq0R3OMvzUM/5tN/T/Ew3/LpTlcoz/M/zgk/1AMPjuE-" target="_blank" rel="sponsored noopener" referrerpolicy="no-referrer-when-downgrade" style="display:inline-block;margin:12px auto 0;padding:9px 14px;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none;">View sponsored offer</a>
  </div>
</section>
</div>
<!-- ENVIZION_MONETIZATION_END -->

<!-- 4. Monetag Vignette & Tag Script Zones -->
<script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11649331',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11649335',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>

<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM END -->
"""

def is_excluded(filepath):
    filename = os.path.basename(filepath).lower()

    if filename in EXCLUDED_EXACT_NAMES:
        return True

    for pattern in EXCLUDED_PATTERNS:
        if pattern.lower() in filename:
            return True

    return False

def run_injection():
    processed_count = 0
    skipped_count = 0
    already_injected_count = 0

    all_html_files = glob.glob(os.path.join(BASE_DIR, "**", "*.html"), recursive=True)

    print(f"Scanning target directory: {BASE_DIR}")
    print(f"Found {len(all_html_files)} total HTML files.\n")

    for filepath in all_html_files:
        rel_path = os.path.relpath(filepath, BASE_DIR)

        if is_excluded(filepath):
            skipped_count += 1
            print(f"[EXCLUDED] {rel_path}")
            continue

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Remove all existing ad system blocks (handles prior/duplicate injections)
            cleaned_content = re.sub(
                r'<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM START -->.*?<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM END -->\s*',
                '',
                content,
                flags=re.DOTALL
            )
            cleaned_content = re.sub(
                r'<!-- ENVIZION_MONETIZATION_START -->.*?<!-- ENVIZION_MONETIZATION_END -->\s*',
                '',
                cleaned_content,
                flags=re.DOTALL
            )

            lower_content = cleaned_content.lower()

            if "</body>" in lower_content:
                idx = lower_content.rfind("</body>")
                new_content = cleaned_content[:idx] + f"{AD_SYSTEM_CODE}\n" + cleaned_content[idx:]
            elif "</html>" in lower_content:
                idx = lower_content.rfind("</html>")
                new_content = cleaned_content[:idx] + f"{AD_SYSTEM_CODE}\n" + cleaned_content[idx:]
            else:
                new_content = cleaned_content.rstrip() + f"\n\n{AD_SYSTEM_CODE}\n"

            # Write file if modifications were made, guaranteeing exactly 1 ad block
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                processed_count += 1
                print(f"[CLEANED & SINGLE AD INJECTED] {rel_path}")
            else:
                already_injected_count += 1
                print(f"[SINGLE AD VERIFIED] {rel_path}")

        except Exception as e:
            print(f"[ERROR] Failed to process {rel_path}: {e}")

    print("\n" + "="*50)
    print("Injection Summary:")
    print(f"  • Successfully Cleaned & Injected: {processed_count}")
    print(f"  • Verified (Single Ad Present):    {already_injected_count}")
    print(f"  • Excluded Files:                  {skipped_count}")
    print("="*50)

if __name__ == "__main__":
    run_injection()