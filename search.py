#!/usr/bin/env python3
"""
inject_search.py
Injects the search widget into every HTML file exactly once.
Safe to re-run — skips files that already have the widget.

Run: python inject_search.py .
"""

import os, sys, re
from pathlib import Path

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__", "Loma"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}

WIDGET = """<!-- ── Smart Site Search Widget v2 ── -->
<div id="ez-search-overlay" style="display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:flex-start;justify-content:center;padding-top:72px;">
  <div style="background:#12121f;border:1px solid #2a2a4a;border-radius:14px;padding:20px;width:92%;max-width:600px;box-shadow:0 12px 48px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;gap:8px;align-items:center;">
      <span style="font-size:20px;">🔍</span>
      <input id="ez-search-input" type="text" placeholder="Search Envizion…" autocomplete="off" spellcheck="false"
        style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #333;background:#1c1c30;color:#f0f0f0;font-size:15px;outline:none;"
        oninput="ezSearch(this.value)"/>
      <button onclick="ezClose()" title="Close" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;line-height:1;">✕</button>
    </div>
    <div id="ez-search-status" style="font-size:12px;color:#555;padding:0 2px;">Type to search across all pages…</div>
    <div id="ez-search-results" style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></div>
    <p style="font-size:11px;color:#3a3a5a;text-align:right;margin:0;">Press <kbd style="background:#1c1c30;padding:1px 5px;border-radius:3px;border:1px solid #333;">Esc</kbd> to close</p>
  </div>
</div>
<button id="ez-search-btn" title="Search site" onclick="ezOpen()"
  style="position:fixed;top:14px;right:16px;z-index:99997;background:#4f8ef7;border:none;border-radius:50%;width:42px;height:42px;font-size:19px;cursor:pointer;box-shadow:0 2px 10px rgba(79,142,247,.4);display:flex;align-items:center;justify-content:center;">🔍</button>
<script>
(function(){
  var INDEX=null,LOADING=false;
  function loadIndex(cb){
    if(INDEX){cb();return;}
    if(LOADING){setTimeout(function(){loadIndex(cb);},100);return;}
    LOADING=true;
    fetch('/search-index.json')
      .then(function(r){return r.json();})
      .then(function(d){INDEX=d;LOADING=false;cb();})
      .catch(function(){INDEX=[];LOADING=false;document.getElementById('ez-search-status').textContent='Index not found – run build_search_ind.py first.';});
  }
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function highlight(text,q){
    if(!text)return'';
    var words=q.trim().split(/\s+/).filter(Boolean);
    if(!words.length)return'';
    var C=60,found=[];
    words.forEach(function(w){
      var rx=new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),m;
      while((m=rx.exec(text))!==null)found.push({start:m.index,end:m.index+m[0].length});
    });
    if(!found.length)return'';
    found.sort(function(a,b){return a.start-b.start;});
    var wins=[];
    found.forEach(function(f){
      var ws=Math.max(0,f.start-C),we=Math.min(text.length,f.end+C);
      if(wins.length&&ws<=wins[wins.length-1].end){wins[wins.length-1].end=Math.max(wins[wins.length-1].end,we);wins[wins.length-1].matches.push(f);}
      else wins.push({start:ws,end:we,matches:[f]});
    });
    return wins.slice(0,3).map(function(win){
      var s=text.slice(win.start,win.end),off=win.start,h='',cur=0;
      win.matches.forEach(function(f){
        var ls=f.start-off,le=f.end-off;
        if(ls<0||le>s.length)return;
        h+=esc(s.slice(cur,ls))+'<mark style="background:#4f8ef7;color:#fff;border-radius:2px;padding:0 2px;">'+esc(s.slice(ls,le))+'</mark>';
        cur=le;
      });
      h+=esc(s.slice(cur));
      return(win.start>0?'…':'')+h+(win.end<text.length?'…':'');
    }).join(' <span style="color:#444;">┃</span> ');
  }
  function score(p,words){
    var s=0,tl=(p.title||'').toLowerCase(),dl=(p.desc||'').toLowerCase(),hl=(p.headings||[]).join(' ').toLowerCase(),bl=(p.body||'').toLowerCase();
    words.forEach(function(w){var wl=w.toLowerCase();if(tl.indexOf(wl)>-1)s+=10;if(dl.indexOf(wl)>-1)s+=5;if(hl.indexOf(wl)>-1)s+=4;if(bl.indexOf(wl)>-1)s+=1;});
    return s;
  }
  window.ezSearch=function(q){
    var st=document.getElementById('ez-search-status'),rs=document.getElementById('ez-search-results');
    if(!q.trim()){st.textContent='Type to search across all pages…';rs.innerHTML='';return;}
    st.textContent='Searching…';rs.innerHTML='';
    loadIndex(function(){
      var words=q.trim().split(/\s+/).filter(Boolean);
      var hits=INDEX.map(function(p){return{page:p,s:score(p,words)};}).filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,12);
      if(!hits.length){st.textContent='No results for "'+esc(q)+'"';return;}
      st.textContent=hits.length+' result'+(hits.length===1?'':'s')+' for "'+q+'"';
      rs.innerHTML=hits.map(function(h){
        var p=h.page,sn=highlight(p.body,q)||highlight(p.desc,q)||'';
        return'<a href="'+p.url+'" style="display:block;padding:12px 14px;border-radius:8px;background:#1c1c30;border:1px solid #2a2a4a;text-decoration:none;color:inherit;" onmouseover="this.style.borderColor=\'#4f8ef7\'" onmouseout="this.style.borderColor=\'#2a2a4a\'">'
          +'<div style="font-weight:600;color:#7eb3ff;font-size:14px;margin-bottom:4px;">'+esc(p.title)+'</div>'
          +(sn?'<div style="font-size:12px;color:#aaa;line-height:1.6;">'+sn+'</div>':'')
          +'<div style="font-size:11px;color:#444;margin-top:4px;">'+p.url+'</div>'
          +'</a>';
      }).join('');
    });
  };
  window.ezOpen=function(){
    var ov=document.getElementById('ez-search-overlay');
    ov.style.display='flex';
    loadIndex(function(){});
    setTimeout(function(){document.getElementById('ez-search-input').focus();},60);
  };
  window.ezClose=function(){document.getElementById('ez-search-overlay').style.display='none';};
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')ezClose();
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();ezOpen();}
  });
  document.getElementById('ez-search-overlay').addEventListener('click',function(e){if(e.target===this)ezClose();});
})();
</script>
<!-- ── End Smart Search Widget v2 ── -->"""


def has_widget(content):
    return "ez-search-overlay" in content


def inject(content):
    # Try before </body>
    m = re.search(r'</body>', content, re.I)
    if m:
        i = m.start()
        return content[:i] + WIDGET + "\n" + content[i:], "injected before </body>"
    # No </body> — append
    return content + "\n" + WIDGET, "appended (no </body>)"


def main():
    root_arg = sys.argv[1] if len(sys.argv) > 1 else "."
    root = __import__('pathlib').Path(root_arg).resolve()
    if not root.exists():
        print(f"ERROR: {root} not found"); sys.exit(1)

    print(f"\nInjecting search widget into: {root}\n")
    count = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            if not fname.lower().endswith(".html"): continue
            if fname in SKIP_FILES: continue
            fp  = __import__('pathlib').Path(dirpath) / fname
            rel = "/" + fp.relative_to(root).as_posix()
            content = fp.read_text(encoding="utf-8", errors="replace")
            if has_widget(content):
                print(f"  –  {rel}  (skipped, already has widget)")
                continue
            new_content, action = inject(content)
            fp.write_text(new_content, encoding="utf-8")
            print(f"  ✓  {rel}  ({action})")
            count += 1

    print(f"\n✓ Done — {count} files updated.\n")
    print("Next: python build_search_ind.py .")
    print("Then: git add -A && git commit -m 'feat: search widget' && git push origin master --force\n")


if __name__ == "__main__":
    main()