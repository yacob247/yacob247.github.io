import os
import glob

# Project Base Directory
BASE_DIR = r"C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main"

# Filenames to strictly exclude from ad injection (Now safely lowercase)
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

# Substring patterns to exclude (e.g. admin files)
EXCLUDED_PATTERNS = ["admin"]

# Full Ad System (Collapsible Sidebars + Direct Links + Vignette/Tag Scripts)
AD_SYSTEM_CODE = """
<!-- MONETAG & HILLTOPADS SIDEBAR SYSTEM START -->
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

  // Left Sidebar with Direct Links
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

  // Right Sidebar with Direct Links
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
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isCollapsed = sidebar.classList.toggle('collapsed');
      btn.textContent = isCollapsed ? 'Show Ad' : 'Hide Ad';
    });
  }

  setupToggle(leftSidebar);
  setupToggle(rightSidebar);
})();
</script>

<!-- Script Zones -->
<script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11649331',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11649335',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<!-- MONETAG & HILLTOPADS SIDEBAR SYSTEM END -->
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

    all_html_files = glob.glob(os.path.join(BASE_DIR, "**", "*.html"), recursive=True)

    for filepath in all_html_files:
        rel_path = os.path.relpath(filepath, BASE_DIR)

        if is_excluded(filepath):
            skipped_count += 1
            print(f"[PROTECTED/EXCLUDED] {rel_path}")
            continue

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Global safety check: skip if already injected
            if "monetag-hilltop-sidebar-system" in content or "vignette.min.js" in content:
                print(f"[ALREADY INJECTED] {rel_path}")
                continue

            # Injection priority:
            # 1. Before </body>  — ideal, scripts run inside a valid document body
            # 2. Before </html>  — fallback for files missing </body> (e.g. CodeWeb.html)
            # 3. Before </head>  — last resort if neither closing tag exists
            # 4. Append to end   — only if the file has no recognisable structure at all
            if "</body>" in content:
                new_content = content.replace("</body>", f"{AD_SYSTEM_CODE}\n</body>", 1)
            elif "</html>" in content:
                new_content = content.replace("</html>", f"{AD_SYSTEM_CODE}\n</html>", 1)
            elif "</head>" in content:
                new_content = content.replace("</head>", f"{AD_SYSTEM_CODE}\n</head>", 1)
            else:
                new_content = content + f"\n{AD_SYSTEM_CODE}"

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)

            processed_count += 1
            print(f"[SUCCESSFULLY INJECTED] {rel_path}")

        except Exception as e:
            print(f"[ERROR] Failed to process {rel_path}: {e}")

    print("\n" + "="*50)
    print(f"Injection Complete!")
    print(f"Total HTML files updated: {processed_count}")
    print(f"Total files protected/skipped: {skipped_count}")
    print("="*50)

if __name__ == "__main__":
    run_injection()