import glob, os

MARK1 = "<!-- ENIG-ADS-INJECTED -->"
MARK2 = "<!-- ENIG-SECTIONS-INJECTED -->"

ADS_BLOCK = MARK1 + """
<!-- ===== ENVIZION ADS: HILLTOPADS + MONETAG ===== -->
<style>
.ez-cols{display:flex;gap:16px;max-width:1100px;margin:26px auto;padding:0 16px;align-items:flex-start;flex-wrap:wrap;}
.ez-col-box{flex:1;min-width:260px;background:#fff;border:1px solid #e9ecef;border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:10px;box-shadow:0 2px 12px rgba(0,0,0,.07);}
.ez-col-box iframe{width:100%;border:none;border-radius:6px;display:block;min-height:250px;}
.ez-col-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;align-self:flex-start;}
.ez-col-hide{font-size:9px;background:#0f172a;color:#fff;border:none;border-radius:20px;padding:3px 10px;cursor:pointer;align-self:flex-end;}
@media(max-width:640px){.ez-cols{flex-direction:column;}}
</style>
<div id="ez-slot">
  <div class="ez-cols">
    <div class="ez-col-box">
      <span class="ez-col-lbl">Sponsored</span>
      <iframe src="https://omg10.com/4/11638044" loading="lazy" scrolling="no"></iframe>
      <iframe src="https://omg10.com/4/11638043" loading="lazy" scrolling="no"></iframe>
      <button class="ez-col-hide" onclick="this.closest('.ez-col-box').remove()">Hide</button>
    </div>
    <div class="ez-col-box">
      <span class="ez-col-lbl">Sponsored</span>
      <iframe src="https://omg10.com/4/11638041" loading="lazy" scrolling="no"></iframe>
      <iframe src="https://omg10.com/4/11638040" loading="lazy" scrolling="no"></iframe>
      <button class="ez-col-hide" onclick="this.closest('.ez-col-box').remove()">Hide</button>
    </div>
  </div>
</div>
<script>
(function(){setInterval(function(){if(document.hidden)return;document.querySelectorAll('#ez-slot .ez-col-box iframe').forEach(function(f){f.src=f.src.split('?')[0]+'?_t='+Date.now();});},45000);})();
</script>
<script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
"""

SECTIONS_JS = """
<script>
/* ENIG-SECTIONS: make every h2 section collapsible */
(function(){
  function init(){
    document.querySelectorAll('.container').forEach(function(container){
      if(container.getAttribute('data-enig-sec')) return;
      container.setAttribute('data-enig-sec','1');
      var children = Array.prototype.slice.call(container.children);
      var current = null;
      children.forEach(function(child){
        if(child.tagName === 'H2'){
          current = document.createElement('details');
          current.className = 'sec';
          current.setAttribute('open','');
          var summary = document.createElement('summary');
          while(child.firstChild){ summary.appendChild(child.firstChild); }
          child.remove();
          current.appendChild(summary);
          container.appendChild(current);
        } else if(current){
          current.appendChild(child);
        } else {
          container.appendChild(child);
        }
      });
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
"""

count = 0
for path in sorted(glob.glob('Greece_History/*.html') + glob.glob('Rome_History/*.html')):
    with open(path, encoding='utf-8') as f:
        t = f.read()
    if MARK1 not in t:
        t = t.replace('</body>', ADS_BLOCK + '\n</body>', 1)
    if MARK2 not in t:
        t = t.replace('</body>', SECTIONS_JS + '\n</body>', 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    count += 1
    print('patched', path)
print('TOTAL', count)