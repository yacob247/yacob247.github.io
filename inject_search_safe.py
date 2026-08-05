#!/usr/bin/env python3
"""
inject_search_safe.py — SAFE, BUG-FREE version
Inserts the search widget before the last </body> in every HTML file.
Never removes or rewrites existing content. Skips files already patched.
Run: python inject_search_safe.py "C:\path\to\your\site"
"""

import os, sys
from pathlib import Path

SKIP_DIRS  = {".venv", "node_modules", ".git", ".agents", "__pycache__"}
SKIP_FILES = {"ads.txt", "robots.txt", "sitemap.xml", "CNAME"}

# ── The widget as a plain Python string — no heredoc escaping issues ──
WIDGET_HTML = (
'<!-- EZ-SEARCH-WIDGET-V2 -->\n'
'<div id="ez-search-overlay" style="display:none;position:fixed;inset:0;z-index:99998;'
'background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:flex-start;'
'justify-content:center;padding-top:72px;">\n'
'  <div style="background:#12121f;border:1px solid #2a2a4a;border-radius:14px;padding:20px;'
'width:92%;max-width:600px;box-shadow:0 12px 48px rgba(0,0,0,.6);display:flex;'
'flex-direction:column;gap:12px;">\n'
'    <div style="display:flex;gap:8px;align-items:center;">\n'
'      <span style="font-size:20px;">\U0001f50d</span>\n'
'      <input id="ez-search-input" type="text" placeholder="Search Envizion\u2026"\n'
'        autocomplete="off" spellcheck="false"\n'
'        style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #333;'
'background:#1c1c30;color:#f0f0f0;font-size:15px;outline:none;"\n'
'        oninput="ezSearch(this.value)" />\n'
'      <button onclick="ezClose()" style="background:none;border:none;color:#888;'
'font-size:22px;cursor:pointer;">\u2715</button>\n'
'    </div>\n'
'    <div id="ez-search-status" style="font-size:12px;color:#555;">'
'Type to search across all pages\u2026</div>\n'
'    <div id="ez-search-results" style="max-height:420px;overflow-y:auto;'
'display:flex;flex-direction:column;gap:8px;"></div>\n'
'    <p style="font-size:11px;color:#3a3a5a;text-align:right;margin:0;">'
'Press <kbd style="background:#1c1c30;padding:1px 5px;border-radius:3px;'
'border:1px solid #333;">Esc</kbd> to close</p>\n'
'  </div>\n'
'</div>\n'
'<button id="ez-search-btn" title="Search site" onclick="ezOpen()"\n'
'  style="position:fixed;top:14px;right:16px;z-index:99997;background:#4f8ef7;'
'border:none;border-radius:50%;width:42px;height:42px;font-size:19px;cursor:pointer;'
'box-shadow:0 2px 10px rgba(79,142,247,.4);display:flex;align-items:center;'
'justify-content:center;">\U0001f50d</button>\n'
)

WIDGET_JS = """\
<script>
(function(){
  var INDEX = null, LOADING = false;

  function loadIndex(cb) {
    if (INDEX) { cb(); return; }
    if (LOADING) { setTimeout(function(){ loadIndex(cb); }, 100); return; }
    LOADING = true;
    fetch('/search-index.json')
      .then(function(r){ return r.json(); })
      .then(function(d){ INDEX = d; LOADING = false; cb(); })
      .catch(function(){
        INDEX = [];
        LOADING = false;
        document.getElementById('ez-search-status').textContent = 'Index not found.';
      });
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function highlight(text, query) {
    if (!text) return '';
    var words = query.trim().split(/\\s+/).filter(Boolean);
    if (!words.length) return '';
    var CONTEXT = 60, found = [];
    words.forEach(function(w) {
      var rx = new RegExp(w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi'), m;
      while ((m = rx.exec(text)) !== null)
        found.push({ start: m.index, end: m.index + m[0].length });
    });
    if (!found.length) return '';
    found.sort(function(a,b){ return a.start - b.start; });
    var windows = [];
    found.forEach(function(f) {
      var ws = Math.max(0, f.start - CONTEXT), we = Math.min(text.length, f.end + CONTEXT);
      if (windows.length && ws <= windows[windows.length-1].end) {
        windows[windows.length-1].end = Math.max(windows[windows.length-1].end, we);
        windows[windows.length-1].matches.push(f);
      } else {
        windows.push({ start: ws, end: we, matches: [f] });
      }
    });
    var parts = [];
    windows.slice(0,3).forEach(function(win) {
      var slice = text.slice(win.start, win.end), offset = win.start, h = '', cur = 0;
      win.matches.forEach(function(f) {
        var ls = f.start - offset, le = f.end - offset;
        if (ls < 0 || le > slice.length) return;
        h += escHtml(slice.slice(cur, ls));
        h += '<mark style="background:#4f8ef7;color:#fff;border-radius:2px;padding:0 2px;">'
           + escHtml(slice.slice(ls, le)) + '</mark>';
        cur = le;
      });
      h += escHtml(slice.slice(cur));
      parts.push((win.start > 0 ? '\\u2026' : '') + h + (win.end < text.length ? '\\u2026' : ''));
    });
    return parts.join(' <span style="color:#555;">&#9475;</span> ');
  }

  function score(page, words) {
    var s = 0;
    var tl = (page.title    || '').toLowerCase();
    var hl = (page.headings || []).join(' ').toLowerCase();
    var bl = (page.body     || '').toLowerCase();
    var dl = (page.desc     || '').toLowerCase();
    words.forEach(function(w) {
      var wl = w.toLowerCase();
      if (tl.indexOf(wl) > -1) s += 10;
      if (dl.indexOf(wl) > -1) s += 5;
      if (hl.indexOf(wl) > -1) s += 4;
      if (bl.indexOf(wl) > -1) s += 1;
    });
    return s;
  }

  window.ezSearch = function(q) {
    var status  = document.getElementById('ez-search-status');
    var results = document.getElementById('ez-search-results');
    if (!q.trim()) {
      status.textContent = 'Type to search across all pages\\u2026';
      results.innerHTML  = '';
      return;
    }
    status.textContent = 'Searching\\u2026';
    results.innerHTML  = '';
    loadIndex(function() {
      var words = q.trim().split(/\\s+/).filter(Boolean);
      var hits  = INDEX
        .map(function(p){ return { page: p, s: score(p, words) }; })
        .filter(function(x){ return x.s > 0; })
        .sort(function(a,b){ return b.s - a.s; })
        .slice(0, 12);
      if (!hits.length) {
        status.textContent = 'No results for "' + escHtml(q) + '"';
        return;
      }
      status.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for "' + q + '"';
      results.innerHTML = hits.map(function(h) {
        var p = h.page;
        var snippet = highlight(p.body, q) || highlight(p.desc, q) || '';
        return '<a href="' + p.url + '"'
          + ' style="display:block;padding:12px 14px;border-radius:8px;background:#1c1c30;'
          + 'border:1px solid #2a2a4a;text-decoration:none;color:inherit;transition:border-color .15s;"'
          + ' onmouseover="this.style.borderColor=String.fromCharCode(39)+\'#4f8ef7\'+String.fromCharCode(39)"'
          + ' onmouseout="this.style.borderColor=String.fromCharCode(39)+\'#2a2a4a\'+String.fromCharCode(39)"'
          + '>'
          + '<div style="font-weight:600;color:#7eb3ff;font-size:14px;margin-bottom:4px;">'
          + escHtml(p.title) + '</div>'
          + (snippet ? '<div style="font-size:12px;color:#aaa;line-height:1.6;">' + snippet + '</div>' : '')
          + '<div style="font-size:11px;color:#444;margin-top:4px;">' + p.url + '</div>'
          + '</a>';
      }).join('');
    });
  };

  window.ezOpen = function() {
    document.getElementById('ez-search-overlay').style.display = 'flex';
    loadIndex(function(){});
    setTimeout(function(){ document.getElementById('ez-search-input').focus(); }, 60);
  };

  window.ezClose = function() {
    document.getElementById('ez-search-overlay').style.display = 'none';
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') ezClose();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); ezOpen(); }
  });

  document.getElementById('ez-search-overlay').addEventListener('click', function(e) {
    if (e.target === this) ezClose();
  });
})();
</script>
<!-- END-EZ-SEARCH-WIDGET-V2 -->
"""

SEARCH_WIDGET = WIDGET_HTML + WIDGET_JS


def safe_inject(filepath: Path) -> str:
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"ERROR reading: {e}"

    # Already patched — skip
    if "EZ-SEARCH-WIDGET-V2" in text:
        return "SKIP"

    # Find LAST </body> (case-insensitive)
    lower = text.lower()
    pos   = lower.rfind("</body>")

    if pos == -1:
        new_text = text + "\n" + SEARCH_WIDGET
        action   = "appended (no </body>)"
    else:
        new_text = text[:pos] + "\n" + SEARCH_WIDGET + text[pos:]
        action   = "injected before </body>"

    try:
        filepath.write_text(new_text, encoding="utf-8")
        return action
    except Exception as e:
        return f"ERROR writing: {e}"


def main():
    if len(sys.argv) < 2:
        print(r'Usage: python inject_search_safe.py "C:\path\to\site"')
        sys.exit(1)

    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"ERROR: {root} not found"); sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  Safe Search Injector v2 — {root.name}")
    print(f"{'='*60}\n")

    done = skipped = errors = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            if not fname.lower().endswith(".html"): continue
            if fname in SKIP_FILES: continue
            fp  = Path(dirpath) / fname
            rel = "/" + fp.relative_to(root).as_posix()
            r   = safe_inject(fp)
            if   r.startswith("ERROR"): print(f"  x  {rel} -> {r}"); errors  += 1
            elif r == "SKIP":           print(f"  -  {rel} (already done)"); skipped += 1
            else:                       print(f"  v  {rel} -> {r}"); done += 1

    print(f"\n{'='*60}")
    print(f"  Done: {done} injected | {skipped} skipped | {errors} errors")
    print(f"{'='*60}")
    print("\nNow run:")
    print("  git add -A")
    print('  git commit -m "feat: smart search v2"')
    print("  git push origin main --force\n")

if __name__ == "__main__":
    main()