#!/usr/bin/env python3
"""
Strips ALL search widget code (old and new) and reinjects a clean, tested version.
Run: python rebuild_widget.py "C:\path\to\site"
"""
import os, sys, re
from pathlib import Path

SKIP_DIRS  = {".venv","node_modules",".git",".agents","__pycache__"}
SKIP_FILES = {"ads.txt","robots.txt","sitemap.xml","CNAME"}

CLEAN_WIDGET = '''
<!-- EZ-SEARCH-WIDGET-V2 -->
<div id="ez-search-overlay" style="display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:flex-start;justify-content:center;padding-top:72px;">
  <div style="background:#12121f;border:1px solid #2a2a4a;border-radius:14px;padding:20px;width:92%;max-width:600px;box-shadow:0 12px 48px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;gap:8px;align-items:center;">
      <span style="font-size:20px;">&#128269;</span>
      <input id="ez-search-input" type="text" placeholder="Search Envizion..." autocomplete="off" spellcheck="false"
        style="flex:1;padding:10px 14px;border-radius:8px;border:1px solid #333;background:#1c1c30;color:#f0f0f0;font-size:15px;outline:none;"
        oninput="ezSearch(this.value)" />
      <button onclick="ezClose()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&#10005;</button>
    </div>
    <div id="ez-search-status" style="font-size:12px;color:#555;">Type to search...</div>
    <div id="ez-search-results" style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></div>
    <p style="font-size:11px;color:#3a3a5a;text-align:right;margin:0;">Press Esc to close</p>
  </div>
</div>
<button onclick="ezOpen()" style="position:fixed;top:14px;right:16px;z-index:999999;background:#4f8ef7;border:none;border-radius:50%;width:42px;height:42px;font-size:19px;cursor:pointer;box-shadow:0 2px 10px rgba(79,142,247,.4);display:flex;align-items:center;justify-content:center;">&#128269;</button>
<script>
(function() {
  var INDEX = null, LOADING = false;

  function loadIndex(cb) {
    if (INDEX) { cb(); return; }
    if (LOADING) { setTimeout(function() { loadIndex(cb); }, 100); return; }
    LOADING = true;
    fetch('/search-index.json')
      .then(function(r) { return r.json(); })
      .then(function(d) { INDEX = d; LOADING = false; cb(); })
      .catch(function() {
        INDEX = [];
        LOADING = false;
        var s = document.getElementById('ez-search-status');
        if (s) s.textContent = 'Search index not found.';
      });
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function highlight(text, query) {
    if (!text) return '';
    var words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    var CONTEXT = 60, found = [];
    words.forEach(function(w) {
      var wl = w.toLowerCase(), tl = text.toLowerCase(), i = 0;
      while ((i = tl.indexOf(wl, i)) !== -1) {
        found.push({ start: i, end: i + wl.length });
        i += wl.length;
      }
    });
    if (!found.length) return '';
    found.sort(function(a, b) { return a.start - b.start; });
    var wins = [];
    found.forEach(function(f) {
      var ws = Math.max(0, f.start - CONTEXT), we = Math.min(text.length, f.end + CONTEXT);
      if (wins.length && ws <= wins[wins.length-1].end) {
        wins[wins.length-1].end = Math.max(wins[wins.length-1].end, we);
        wins[wins.length-1].matches.push(f);
      } else {
        wins.push({ start: ws, end: we, matches: [f] });
      }
    });
    var parts = [];
    wins.slice(0, 3).forEach(function(win) {
      var slice = text.slice(win.start, win.end), off = win.start, h = '', cur = 0;
      win.matches.forEach(function(f) {
        var ls = f.start - off, le = f.end - off;
        if (ls < 0 || le > slice.length) return;
        h += escHtml(slice.slice(cur, ls));
        h += '<mark style="background:#4f8ef7;color:#fff;border-radius:2px;padding:0 2px;">' + escHtml(slice.slice(ls, le)) + '</mark>';
        cur = le;
      });
      h += escHtml(slice.slice(cur));
      parts.push((win.start > 0 ? '...' : '') + h + (win.end < text.length ? '...' : ''));
    });
    return parts.join(' | ');
  }

  function score(page, words) {
    var s = 0;
    var tl = (page.title || '').toLowerCase();
    var hl = (page.headings || []).join(' ').toLowerCase();
    var bl = (page.body || '').toLowerCase();
    var dl = (page.desc || '').toLowerCase();
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
    var status = document.getElementById('ez-search-status');
    var results = document.getElementById('ez-search-results');
    if (!q.trim()) { status.textContent = 'Type to search...'; results.innerHTML = ''; return; }
    status.textContent = 'Searching...';
    results.innerHTML = '';
    loadIndex(function() {
      var words = q.trim().split(/\s+/).filter(Boolean);
      var hits = INDEX.map(function(p) { return { page: p, s: score(p, words) }; })
        .filter(function(x) { return x.s > 0; })
        .sort(function(a, b) { return b.s - a.s; })
        .slice(0, 12);
      if (!hits.length) { status.textContent = 'No results for "' + escHtml(q) + '"'; return; }
      status.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for "' + q + '"';
      results.innerHTML = hits.map(function(h) {
        var p = h.page, snippet = highlight(p.body, q) || highlight(p.desc, q) || '';
        return '<a href="' + p.url + '" style="display:block;padding:12px 14px;border-radius:8px;background:#1c1c30;border:1px solid #2a2a4a;text-decoration:none;color:inherit;">'
          + '<div style="font-weight:600;color:#7eb3ff;font-size:14px;margin-bottom:4px;">' + escHtml(p.title) + '</div>'
          + (snippet ? '<div style="font-size:12px;color:#aaa;line-height:1.6;">' + snippet + '</div>' : '')
          + '<div style="font-size:11px;color:#444;margin-top:4px;">' + p.url + '</div>'
          + '</a>';
      }).join('');
    });
  };

  window.ezOpen = function() {
    var ov = document.getElementById('ez-search-overlay');
    ov.style.display = 'flex';
    document.body.style.overflow = 'visible';
    loadIndex(function() {});
    setTimeout(function() { document.getElementById('ez-search-input').focus(); }, 60);
  };

  window.ezClose = function() {
    document.getElementById('ez-search-overlay').style.display = 'none';
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') ezClose();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); ezOpen(); }
  });

  document.getElementById('ez-search-overlay').addEventListener('click', function(e) {
    if (e.target === this) ezClose();
  });
}());
</script>
<!-- END-EZ-SEARCH-WIDGET-V2 -->'''

def strip_all_widgets(text):
    # Remove new widget
    text = re.sub(r'\n?<!-- EZ-SEARCH-WIDGET-V2 -->.*?<!-- END-EZ-SEARCH-WIDGET-V2 -->', '', text, flags=re.DOTALL)
    # Remove old widget
    text = re.sub(r'\n?<!-- ── Site Search Widget ──.*?<!-- ── End Site Search Widget ── -->', '', text, flags=re.DOTALL)
    # Remove orphan search overlay divs
    text = re.sub(r'\n?<div id="ez-search-overlay".*?</div>\s*\n?', '', text, flags=re.DOTALL)
    text = re.sub(r'\n?<div id="site-search-overlay".*?</div>\s*\n?', '', text, flags=re.DOTALL)
    return text

def main():
    if len(sys.argv) < 2:
        print(r'Usage: python rebuild_widget.py "C:\path\to\site"'); sys.exit(1)
    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"ERROR: {root} not found"); sys.exit(1)

    done = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            if not fname.lower().endswith(".html"): continue
            if fname in SKIP_FILES: continue
            fp  = Path(dirpath) / fname
            rel = "/" + fp.relative_to(root).as_posix()
            text = fp.read_text(encoding="utf-8", errors="replace")

            # Strip all old/broken widgets
            clean = strip_all_widgets(text)

            # Inject clean widget before last </body>
            lower = clean.lower()
            pos = lower.rfind("</body>")
            if pos == -1:
                clean = clean + "\n" + CLEAN_WIDGET
            else:
                clean = clean[:pos] + "\n" + CLEAN_WIDGET + "\n" + clean[pos:]

            fp.write_text(clean, encoding="utf-8")
            print(f"  rebuilt  {rel}")
            done += 1

    print(f"\nDone — {done} files rebuilt cleanly")

if __name__ == "__main__":
    main()
