import os
import glob
import re

BASE_DIR = r"C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main"

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

EXCLUDED_PATTERNS = ["admin"]

# ─────────────────────────────────────────────────────────────────────────────
# HEADER BANNER — injected right after <header>...</header> close tag
# ─────────────────────────────────────────────────────────────────────────────
HEADER_BANNER_CODE = """
<!-- ENVIZION HEADER BANNER START -->
<div class="native-ad-horizontal-wrapper" style="margin:15px auto;padding:0 15px;max-width:900px;font-family:system-ui,sans-serif;box-sizing:border-box;">
  <div id="evz-h-box" style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 20px;flex-wrap:wrap;gap:12px;">
    <div style="display:flex;align-items:center;gap:15px;flex:1;min-width:280px;">
      <span style="background:#e2e8f0;color:#475569;font-size:9px;font-weight:700;padding:3px 6px;border-radius:3px;text-transform:uppercase;">Sponsor</span>
      <div>
        <h4 id="evz-h-title" style="margin:0;font-size:14px;color:#1e293b;font-weight:700;">Alternative Download Path Ready</h4>
        <p id="evz-h-desc" style="margin:2px 0 0 0;font-size:12px;color:#64748b;">Get direct mirror access for all toolkit components.</p>
      </div>
    </div>
    <a id="evz-h-btn" href="https://omg10.com/4/11638041" target="_blank" rel="noopener noreferrer" style="background:#0f172a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 18px;border-radius:4px;white-space:nowrap;">Grab Direct Link</a>
  </div>
</div>
<script>
(function(){
  var v=[
    {title:"🚀 10x Bandwidth Mirror Active",desc:"Skip global traffic lines using our premium direct-access cloud.",text:"Use Fast Route",bg:"#16a34a"},
    {title:"💎 Secure Network Channel",desc:"Asset links verified clean and optimized for localized desktop extractions.",text:"Pull Secure File",bg:"#2563eb"},
    {title:"🌪️ Express Queue Lane Available",desc:"Bypass normal load limitations using external node partners.",text:"Enter Express Node",bg:"#ea580c"}
  ];
  var p=v[Math.floor(Math.random()*v.length)];
  document.getElementById('evz-h-title').textContent=p.title;
  document.getElementById('evz-h-desc').textContent=p.desc;
  var b=document.getElementById('evz-h-btn');
  b.textContent=p.text; b.style.backgroundColor=p.bg;
})();
</script>
<!-- ENVIZION HEADER BANNER END -->
"""

# ─────────────────────────────────────────────────────────────────────────────
# MAIN AD BLOCK — injected before <footer>
# Contains: outstream video box + rewarded gate + sidebars + refresh + vignette
# ─────────────────────────────────────────────────────────────────────────────
AD_SYSTEM_CODE = """
<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM START -->

<!-- VideoJS + IMA SDK for VAST -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video-js.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video.min.js"></script>
<script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/videojs-contrib-ads/6.9.0/videojs.ads.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/videojs-ima/1.10.1/videojs.ima.min.js"></script>

<!-- ═══════════════════════════════════════════
     STRATEGY 1: OUTSTREAM VIDEO POPUP
     Opens as centered popup on load.
     Skip after 10s → popup collapses/hides,
     video keeps playing silently in background.
═══════════════════════════════════════════ -->
<style>
#evz-outstream-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.70);z-index:99998;display:flex;align-items:center;justify-content:center;}
#evz-outstream-wrap{width:560px;max-width:94vw;background:#000;border-radius:12px;overflow:hidden;position:relative;box-shadow:0 8px 40px rgba(0,0,0,0.5);}
#evz-outstream-vid{width:100%;height:315px;display:block;}
#evz-outstream-label{position:absolute;top:10px;left:10px;z-index:20;background:rgba(0,0,0,0.6);color:#fff;font:10px system-ui;padding:3px 8px;border-radius:3px;}
#evz-outstream-skip{position:absolute;bottom:12px;right:12px;z-index:20;background:rgba(0,0,0,0.75);color:#fff;border:none;padding:6px 14px;border-radius:4px;font:12px system-ui;cursor:pointer;display:none;}
/* Hidden ghost — keeps video alive off-screen after popup closes */
#evz-outstream-ghost{position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;}
</style>
<div id="evz-outstream-overlay">
  <div id="evz-outstream-wrap">
    <span id="evz-outstream-label">Ad</span>
    <button id="evz-outstream-close" style="position:absolute;top:8px;right:8px;z-index:30;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:28px;height:28px;font:bold 14px system-ui;cursor:pointer;line-height:28px;text-align:center;">✕</button>
    <video id="evz-outstream-vid" class="video-js" muted playsinline preload="none"></video>
    <button id="evz-outstream-skip">Skip Ad ›</button>
  </div>
</div>
<!-- Ghost container video migrates into after skip -->
<div id="evz-outstream-ghost"></div>

<!-- ═══════════════════════════════════════════
     STRATEGY 2: REWARDED VIDEO GATE
     Intercepts download clicks → "Watch to unlock"
     30s countdown, then releases the download.
═══════════════════════════════════════════ -->
<style>
#evz-rewarded-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.82);z-index:999999;align-items:center;justify-content:center;flex-direction:column;}
#evz-rewarded-overlay.active{display:flex;}
#evz-rewarded-box{position:relative;width:520px;max-width:93vw;background:#000;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);}
#evz-rewarded-vid{width:100%;height:292px;display:block;}
#evz-rewarded-meta{background:#111;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
#evz-rewarded-meta p{margin:0;color:#e2e8f0;font:13px/1.4 system-ui;flex:1;}
#evz-rewarded-countdown{font:700 13px system-ui;color:#facc15;white-space:nowrap;}
#evz-rewarded-skip-btn{background:#2563eb;color:#fff;border:none;padding:8px 18px;border-radius:6px;font:600 13px system-ui;cursor:pointer;white-space:nowrap;display:none;}
#evz-rewarded-skip-btn:hover{background:#1d4ed8;}
</style>
<div id="evz-rewarded-overlay">
  <div id="evz-rewarded-box">
    <video id="evz-rewarded-vid" class="video-js" muted playsinline preload="none"></video>
    <div id="evz-rewarded-meta">
      <p>🔓 Watch this short ad to unlock your download</p>
      <span id="evz-rewarded-countdown">30s</span>
      <button id="evz-rewarded-skip-btn">Download Now ↓</button>
    </div>
  </div>
</div>

<script>
(function(){
  var VAST = "https://subtle-injury.com/dPmmFPz.dnG_N-v/ZTGjUO/MeXmd9/ugZXUcljkCPsTHchzMNID-Aqw/MBDtk/tWNIzEMd0xMeDmA/xbMQwM";

  /* ── Outstream player ── */
  var outstreamReady = false, outstreamPlayer;
  var outSkip  = document.getElementById('evz-outstream-skip');
  var outTimer, outElapsed = 0;

  function initOutstream(){
    if(typeof videojs==='undefined'||typeof google==='undefined'){setTimeout(initOutstream,400);return;}
    if(outstreamReady) return;
    outstreamPlayer = videojs('evz-outstream-vid',{controls:false,muted:true,autoplay:true,fluid:false,width:640,height:360});
    outstreamPlayer.ima({adTagUrl:VAST});
    outstreamPlayer.on('adstart',function(){
      outElapsed=0; outSkip.style.display='none';
      outTimer=setInterval(function(){
        outElapsed++;
        if(outElapsed>=10){outSkip.style.display='block';clearInterval(outTimer);}
      },1000);
    });
    outstreamPlayer.on('adend',function(){clearInterval(outTimer);outSkip.style.display='none';});
    outstreamPlayer.on('aderror',function(){clearInterval(outTimer);});
    outstreamPlayer.ready(function(){outstreamPlayer.play().catch(function(){});});
    outstreamReady=true;
  }

  function collapseOutstream(){
    var overlay=document.getElementById('evz-outstream-overlay');
    var ghost=document.getElementById('evz-outstream-ghost');
    var vidEl=document.getElementById('evz-outstream-vid');
    if(overlay) overlay.style.display='none';
    if(ghost && vidEl) ghost.appendChild(vidEl); /* video keeps playing silently */
  }
  outSkip.addEventListener('click',collapseOutstream);
  document.getElementById('evz-outstream-close').addEventListener('click',collapseOutstream);

  /* ── Rewarded gate player ── */
  var rewardedReady=false, rewardedPlayer;
  var rewardedOverlay = document.getElementById('evz-rewarded-overlay');
  var rewardedCountdown = document.getElementById('evz-rewarded-countdown');
  var rewardedSkipBtn = document.getElementById('evz-rewarded-skip-btn');
  var pendingDownloadHref = null;
  var rewardTimer, rewardElapsed;

  function initRewarded(){
    if(typeof videojs==='undefined'||typeof google==='undefined'){setTimeout(initRewarded,400);return;}
    if(rewardedReady) return;
    rewardedPlayer = videojs('evz-rewarded-vid',{controls:false,muted:true,autoplay:false,fluid:false,width:520,height:292});
    rewardedPlayer.ima({adTagUrl:VAST});
    rewardedPlayer.on('adstart',function(){
      rewardElapsed=0; rewardedSkipBtn.style.display='none';
      rewardTimer=setInterval(function(){
        rewardElapsed++;
        var left=30-rewardElapsed;
        rewardedCountdown.textContent=left>0?left+'s':'';
        if(rewardElapsed>=30){
          clearInterval(rewardTimer);
          rewardedSkipBtn.style.display='block';
          rewardedCountdown.textContent='';
          rewardedSkipBtn.textContent='Download Now ↓';
        }
      },1000);
    });
    rewardedPlayer.on('adend',function(){
      clearInterval(rewardTimer);
      closeRewarded();
    });
    rewardedPlayer.on('aderror',function(){clearInterval(rewardTimer);closeRewarded();});
    rewardedReady=true;
  }

  function openRewarded(href){
    pendingDownloadHref=href;
    rewardedOverlay.classList.add('active');
    rewardedCountdown.textContent='30s';
    rewardedSkipBtn.style.display='none';
    if(rewardedReady){
      try{rewardedPlayer.ima.requestAds();rewardedPlayer.play();}catch(e){closeRewarded();}
    }
  }

  function closeRewarded(){
    rewardedOverlay.classList.remove('active');
    try{rewardedPlayer.pause();}catch(e){}
    if(pendingDownloadHref){window.location.href=pendingDownloadHref;pendingDownloadHref=null;}
  }

  rewardedSkipBtn.addEventListener('click',closeRewarded);

  /* ── Hook download triggers ── */
  window.addEventListener('load',function(){
    initOutstream();
    initRewarded();

    var dlSelectors=[
      'a[download]','a[href*="download"]','a[href*=".zip"]',
      'a[href*=".exe"]','a[href*=".pdf"]',
      'button[id*="download"]','button[class*="download"]',
      '.download-btn','#download-btn','[data-action="download"]'
    ];
    document.querySelectorAll(dlSelectors.join(',')).forEach(function(el){
      el.addEventListener('click',function(e){
        e.preventDefault();
        var href=(el.tagName==='A'&&el.href)?el.href:null;
        openRewarded(href);
      });
    });
  });
})();
</script>

<!-- ═══════════════════════════════════════════
     INLINE PAGE SIDE AD COLUMNS
     Two boxes, part of page flow, sit left & right.
     Each box auto-sizes to its ad content.
     STRATEGY 3 refresh every 45s.
═══════════════════════════════════════════ -->
<style>
.evz-cols{display:flex;gap:16px;max-width:1100px;margin:24px auto;padding:0 16px;box-sizing:border-box;align-items:flex-start;}
.evz-col-box{flex:1;min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.07);padding:8px;display:flex;flex-direction:column;align-items:center;gap:10px;}
.evz-col-box iframe{width:100%;border:none;border-radius:6px;display:block;min-height:250px;}
.evz-col-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;align-self:flex-start;}
.evz-col-hide{font-size:9px;background:#0f172a;color:#fff;border:none;border-radius:20px;padding:3px 10px;cursor:pointer;align-self:flex-end;}
@media(max-width:640px){.evz-cols{flex-direction:column;}}
</style>
<div class="evz-cols">
  <div class="evz-col-box">
    <span class="evz-col-lbl">Sponsored</span>
    <iframe src="https://omg10.com/4/11638044" loading="lazy" scrolling="no"></iframe>
    <iframe src="https://omg10.com/4/11638043" loading="lazy" scrolling="no"></iframe>
    <button class="evz-col-hide" onclick="this.closest('.evz-col-box').remove()">Hide</button>
  </div>
  <div class="evz-col-box">
    <span class="evz-col-lbl">Sponsored</span>
    <iframe src="https://omg10.com/4/11638041" loading="lazy" scrolling="no"></iframe>
    <iframe src="https://omg10.com/4/11638040" loading="lazy" scrolling="no"></iframe>
    <button class="evz-col-hide" onclick="this.closest('.evz-col-box').remove()">Hide</button>
  </div>
</div>

<!-- STRATEGY 3: Auto-refresh inline ad iframes every 45s -->
<script>
(function(){
  setInterval(function(){
    if(document.hidden)return;
    document.querySelectorAll('.evz-col-box iframe').forEach(function(f){
      f.src=f.src.split('?')[0]+'?_t='+Date.now();
    });
  },45000);
})();
</script>

<!-- Vignette -->
<script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>

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

    print(f"Scanning: {BASE_DIR}")
    print(f"Found {len(all_html_files)} HTML files.\n")

    for filepath in all_html_files:
        rel_path = os.path.relpath(filepath, BASE_DIR)

        if is_excluded(filepath):
            skipped_count += 1
            print(f"[EXCLUDED] {rel_path}")
            continue

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Strip all existing ad blocks (clean slate)
            cleaned = re.sub(
                r'<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM START -->.*?<!-- MONETAG & HILLTOPADS INTEGRATED AD SYSTEM END -->\s*',
                '', content, flags=re.DOTALL
            )
            cleaned = re.sub(
                r'<!-- ENVIZION_MONETIZATION_START -->.*?<!-- ENVIZION_MONETIZATION_END -->\s*',
                '', cleaned, flags=re.DOTALL
            )
            cleaned = re.sub(
                r'<!-- ENVIZION HEADER BANNER START -->.*?<!-- ENVIZION HEADER BANNER END -->\s*',
                '', cleaned, flags=re.DOTALL
            )

            # Fix duplicate closing tags from old bad injections
            for tag in ['</body>', '</html>']:
                parts = re.split(re.escape(tag), cleaned, flags=re.IGNORECASE)
                if len(parts) > 2:
                    cleaned = ''.join(parts[:-1]) + tag + parts[-1]

            lower = cleaned.lower()

            # ── Inject header banner right after </header> ──
            header_close = lower.rfind('</header>')
            if header_close != -1:
                insert_at = header_close + len('</header>')
                cleaned = cleaned[:insert_at] + '\n' + HEADER_BANNER_CODE + cleaned[insert_at:]
                lower = cleaned.lower()  # refresh after mutation

            # ── Inject main ad block before <footer> / </body> / </html> ──
            if '<footer' in lower:
                idx = lower.rfind('<footer')
                new_content = cleaned[:idx] + AD_SYSTEM_CODE + '\n' + cleaned[idx:]
            elif '</body>' in lower:
                idx = lower.rfind('</body>')
                new_content = cleaned[:idx] + AD_SYSTEM_CODE + '\n' + cleaned[idx:]
            elif '</html>' in lower:
                idx = lower.rfind('</html>')
                new_content = cleaned[:idx] + AD_SYSTEM_CODE + '\n' + cleaned[idx:]
            else:
                new_content = cleaned.rstrip() + '\n\n' + AD_SYSTEM_CODE + '\n'

            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                processed_count += 1
                print(f"[INJECTED] {rel_path}")
            else:
                already_injected_count += 1
                print(f"[VERIFIED] {rel_path}")

        except Exception as e:
            print(f"[ERROR] {rel_path}: {e}")

    print("\n" + "=" * 50)
    print(f"  Injected:  {processed_count}")
    print(f"  Verified:  {already_injected_count}")
    print(f"  Excluded:  {skipped_count}")
    print("=" * 50)


if __name__ == "__main__":
    run_injection()