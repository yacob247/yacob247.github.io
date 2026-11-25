import os, re

# ── 1. Remove ENVIZION HEADER BANNER blocks ──────────────────────────────────
pat_header_banner = re.compile(
    r'\s*<!-- ENVIZION HEADER BANNER START -->.*?<!-- ENVIZION HEADER BANNER END -->\s*',
    re.DOTALL
)

# ── 2. Remove Native Layout 3 (inline card) blocks ──────────────────────────
pat_native3 = re.compile(
    r'\s*<!-- Native Layout 3.*?</script>\s*',
    re.DOTALL
)

# ── 3. Remove Native Layout 2 (compact horizontal banner) blocks ─────────────
pat_native2 = re.compile(
    r'\s*<!-- Native Layout 2.*?</script>\s*',
    re.DOTALL
)

# ── 4. Remove invalid wasm-src CSP directive ─────────────────────────────────
pat_wasm = re.compile(
    r'\s*wasm-src \'self\' blob: https://cdn\.jsdelivr\.net https://unpkg\.com https://esm\.sh;'
)

# ── 5. Remove stray orphan </a></div> after first ad script block ────────────
old_orphan = """    </script>

        </a>
    </div>

<nav>"""
new_orphan = """    </script>

<nav>"""

# ── 6. Fix null error — move evz-h ad script out of template literal ─────────
old_evz_inline_script = """<script>
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
<!-- ENVIZION HEADER BANNER END -->"""
new_evz_inline_script = "<!-- ENVIZION HEADER BANNER END -->"

# ── 7. Run evz-h ad script after renderPost injects the DOM ──────────────────
old_render_call = "  renderPost(post);\n});"
new_render_call = """  renderPost(post);

  // Randomise header banner ad (elements exist now that renderPost has run)
  (function(){
    var v=[
      {title:"🚀 10x Bandwidth Mirror Active",desc:"Skip global traffic lines using our premium direct-access cloud.",text:"Use Fast Route",bg:"#16a34a"},
      {title:"💎 Secure Network Channel",desc:"Asset links verified clean and optimized for localized desktop extractions.",text:"Pull Secure File",bg:"#2563eb"},
      {title:"🌪️ Express Queue Lane Available",desc:"Bypass normal load limitations using external node partners.",text:"Enter Express Node",bg:"#ea580c"}
    ];
    var p=v[Math.floor(Math.random()*v.length)];
    var t=document.getElementById('evz-h-title');
    var d=document.getElementById('evz-h-desc');
    var b=document.getElementById('evz-h-btn');
    if(t) t.textContent=p.title;
    if(d) d.textContent=p.desc;
    if(b){ b.textContent=p.text; b.style.backgroundColor=p.bg; }
  })();
});"""

# ── 8. Overlay → inline video player (HTML block) ────────────────────────────
old_overlay_html = """<!-- ═══════════════════════════════════════════
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
<div id="evz-outstream-ghost"></div>"""
new_inline_html = """<!-- ═══════════════════════════════════════════
     STRATEGY 1: INLINE OUTSTREAM VIDEO PLAYER
     Sits in page flow — no overlay.
     Skip button appears after 10s.
     Collapses to 0 height on skip/close.
═══════════════════════════════════════════ -->
<style>
#evz-outstream-inline{max-width:680px;margin:20px auto;padding:0 16px;box-sizing:border-box;transition:max-height 0.4s ease,opacity 0.4s ease;overflow:hidden;}
#evz-outstream-inline.collapsed{max-height:0 !important;opacity:0;margin:0;padding:0;}
#evz-outstream-wrap{background:#000;border-radius:12px;overflow:hidden;position:relative;box-shadow:0 4px 20px rgba(0,0,0,0.18);}
#evz-outstream-vid{width:100%;height:315px;display:block;}
#evz-outstream-label{position:absolute;top:10px;left:10px;z-index:20;background:rgba(0,0,0,0.6);color:#fff;font:10px system-ui;padding:3px 8px;border-radius:3px;}
#evz-outstream-skip{position:absolute;bottom:12px;right:12px;z-index:20;background:rgba(0,0,0,0.75);color:#fff;border:none;padding:6px 14px;border-radius:4px;font:12px system-ui;cursor:pointer;display:none;}
#evz-outstream-close{position:absolute;top:8px;right:8px;z-index:30;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:28px;height:28px;font:bold 14px system-ui;cursor:pointer;line-height:28px;text-align:center;}
</style>
<div id="evz-outstream-inline">
  <div id="evz-outstream-wrap">
    <span id="evz-outstream-label">Ad</span>
    <button id="evz-outstream-close">✕</button>
    <video id="evz-outstream-vid" class="video-js" muted playsinline preload="none"></video>
    <button id="evz-outstream-skip">Skip Ad ›</button>
  </div>
</div>"""

# ── 9. Overlay → inline video player (JS block) + VAST URLs ──────────────────
old_overlay_js = """  var VAST = "https://subtle-injury.com/dPmmFPz.dnG_N-v/ZTGjUO/MeXmd9/ugZXUcljkCPsTHchzMNID-Aqw/MBDtk/tWNIzEMd0xMeDmA/xbMQwM";

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
  document.getElementById('evz-outstream-close').addEventListener('click',collapseOutstream);"""
new_inline_js = """  // ── VAST TAG URLs ─────────────────────────────────────────────
  var VAST_MONETAG = "https://subtle-injury.com/dSmuFnz.dgGMNbvuZHGRUK/Perm/9kubZVUelxkEPhTOc/zoNBD/A/wAMfDHkLtTN_zgMO0YMiDwADxqMDwE";
  var VAST_HILLTOP = "//relieved-understanding.com/b.XuVVsydZGnl/0IYZWtcM/telmk9/udZhUml/kSPeTIcGzzMnzIkB5/OJTRMkt-N_zkMoz/O/Tmkr5MNEwH";
  var VAST = VAST_HILLTOP || VAST_MONETAG;
  // ─────────────────────────────────────────────────────────────

  /* ── Inline outstream player ── */
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
    outstreamPlayer.on('adend',function(){clearInterval(outTimer);collapseOutstream();});
    outstreamPlayer.on('aderror',function(){clearInterval(outTimer);collapseOutstream();});
    outstreamPlayer.ready(function(){outstreamPlayer.play().catch(function(){});});
    outstreamReady=true;
  }

  function collapseOutstream(){
    var wrap=document.getElementById('evz-outstream-inline');
    if(wrap) wrap.classList.add('collapsed');
    try{ outstreamPlayer.pause(); }catch(e){}
  }
  outSkip.addEventListener('click',collapseOutstream);
  document.getElementById('evz-outstream-close').addEventListener('click',collapseOutstream);"""

# ── 10. Old Monetag VAST URL → new one (any remaining occurrences) ────────────
old_vast_url = "https://subtle-injury.com/dPmmFPz.dnG_N-v/ZTGjUO/MeXmd9/ugZXUcljkCPsTHchzMNID-Aqw/MBDtk/tWNIzEMd0xMeDmA/xbMQwM"
new_vast_url = "https://subtle-injury.com/dSmuFnz.dgGMNbvuZHGRUK/Perm/9kubZVUelxkEPhTOc/zoNBD/A/wAMfDHkLtTN_zgMO0YMiDwADxqMDwE"

# ── 11. Empty VAST_HILLTOP placeholder → real tag (any remaining) ─────────────
old_hilltop = 'var VAST_HILLTOP = "";'
new_hilltop = 'var VAST_HILLTOP = "//relieved-understanding.com/b.XuVVsydZGnl/0IYZWtcM/telmk9/udZhUml/kSPeTIcGzzMnzIkB5/OJTRMkt-N_zkMoz/O/Tmkr5MNEwH";'

# ─────────────────────────────────────────────────────────────────────────────

for root, dirs, files in os.walk('.'):
    for fname in files:
        if not fname.endswith('.html'):
            continue
        path = os.path.join(root, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = content

        # Regex replacements
        new_content = pat_header_banner.sub('\n', new_content)
        new_content = pat_native3.sub('\n', new_content)
        new_content = pat_native2.sub('\n', new_content)
        new_content = pat_wasm.sub('', new_content)

        # String replacements (order matters)
        new_content = new_content.replace(old_orphan, new_orphan)
        new_content = new_content.replace(old_evz_inline_script, new_evz_inline_script)
        new_content = new_content.replace(old_render_call, new_render_call)
        new_content = new_content.replace(old_overlay_html, new_inline_html)
        new_content = new_content.replace(old_overlay_js, new_inline_js)
        new_content = new_content.replace(old_vast_url, new_vast_url)
        new_content = new_content.replace(old_hilltop, new_hilltop)

        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated: {path}')

print("Done.")