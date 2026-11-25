/* autoload.js - put in battleship-main/ and add before </body> in index.html:
   <script src="autoload.js"></script>
   Reads ?load=<url>, downloads it in parallel chunks with a progress overlay
   (MB / MB), caches it in IndexedDB, then hands it to the emulator's file input. */
(function () {
  var ALLOWED_HOSTS = ['pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev'];
  var CHUNK = 8 * 1024 * 1024; // 8 MB per request
  var PARALLEL = 8;            // simultaneous requests
  var RETRIES = 3;

  var url = new URLSearchParams(location.search).get('load');
  if (!url) return;
  var u;
  try { u = new URL(url); } catch (e) { return console.error('[autoload] bad URL'); }
  if (ALLOWED_HOSTS.indexOf(u.hostname) === -1) return console.error('[autoload] host not allowed');
  var fileName = decodeURIComponent(u.pathname.split('/').pop()) || 'game.wgb';

  /* ---------- progress overlay ---------- */
  var ui;
  function showUI() {
    ui = document.createElement('div');
    ui.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;' +
      'background:#0b1215;color:#e8f1f5;font:14px system-ui,sans-serif;padding:20px 24px;border-radius:12px;' +
      'width:min(86vw,380px);box-shadow:0 8px 40px rgba(0,0,0,.6);text-align:center';
    ui.innerHTML = '<div id="al-title" style="margin-bottom:12px;font-weight:600">Loading game...</div>' +
      '<div style="height:10px;background:#1c2a31;border-radius:6px;overflow:hidden">' +
      '<div id="al-bar" style="height:100%;width:0;background:#2dd4bf;transition:width .15s"></div></div>' +
      '<div id="al-text" style="margin-top:10px;font-variant-numeric:tabular-nums">0.0 MB / ? MB</div>';
    document.body.appendChild(ui);
  }
  var t0 = 0;
  function mb(n) { return (n / 1048576).toFixed(1); }
  function progress(done, total) {
    if (!ui) return;
    var secs = Math.max((Date.now() - t0) / 1000, 0.1);
    var speed = done / 1048576 / secs;
    var pct = total ? Math.min(100, done / total * 100) : 0;
    document.getElementById('al-bar').style.width = pct + '%';
    document.getElementById('al-text').textContent =
      mb(done) + ' MB / ' + (total ? mb(total) : '?') + ' MB' +
      (total ? ' (' + pct.toFixed(0) + '%)' : '') + ' \u00b7 ' + speed.toFixed(1) + ' MB/s';
  }
  function setTitle(t) { if (ui) document.getElementById('al-title').textContent = t; }
  function hideUI() { if (ui) { ui.remove(); ui = null; } }

  /* ---------- IndexedDB cache ---------- */
  function openDb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('autoload-cache', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idb(db, mode, fn) {
    return new Promise(function (res, rej) {
      var req = fn(db.transaction('files', mode).objectStore('files'));
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }

  /* ---------- downloading ---------- */
  async function fetchRange(start, end, onBytes) {
    for (var attempt = 1; ; attempt++) {
      var got = 0;
      try {
        var r = await fetch(url, { headers: { Range: 'bytes=' + start + '-' + end } });
        if (r.status !== 206) throw new Error('range not supported (HTTP ' + r.status + ')');
        var reader = r.body.getReader(), parts = [];
        for (;;) {
          var s = await reader.read();
          if (s.done) break;
          parts.push(s.value); got += s.value.length; onBytes(s.value.length);
        }
        if (got !== end - start + 1) throw new Error('short chunk');
        return new Blob(parts);
      } catch (e) {
        onBytes(-got); // roll back progress for this attempt
        if (attempt >= RETRIES) throw e;
      }
    }
  }

  async function parallelDownload(total) {
    var count = Math.ceil(total / CHUNK), results = new Array(count), next = 0, done = 0;
    function onBytes(n) { done += n; progress(done, total); }
    async function worker() {
      while (next < count) {
        var i = next++, s = i * CHUNK, e = Math.min(s + CHUNK, total) - 1;
        results[i] = await fetchRange(s, e, onBytes);
      }
    }
    var workers = [];
    for (var w = 0; w < Math.min(PARALLEL, count); w++) workers.push(worker());
    await Promise.all(workers);
    return new Blob(results);
  }

  async function singleDownload(known) {
    var r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var total = known || +r.headers.get('Content-Length') || 0;
    var reader = r.body.getReader(), parts = [], done = 0;
    for (;;) {
      var s = await reader.read();
      if (s.done) break;
      parts.push(s.value); done += s.value.length; progress(done, total);
    }
    return new Blob(parts);
  }

  async function download() {
    var total = 0;
    try {
      var h = await fetch(url, { method: 'HEAD' });
      if (h.ok) total = +h.headers.get('Content-Length') || 0;
    } catch (e) {}
    progress(0, total);
    if (total > CHUNK) {
      try { return await parallelDownload(total); }
      catch (e) { console.warn('[autoload] parallel failed, falling back:', e); t0 = Date.now(); }
    }
    return singleDownload(total);
  }

  /* ---------- hand off to emulator ---------- */
  function waitForInput(ms) {
    return new Promise(function (res) {
      var s = Date.now();
      (function poll() {
        var el = document.querySelector('input[type=file]');
        if (el) return res(el);
        if (Date.now() - s > ms) return res(null);
        setTimeout(poll, 200);
      })();
    });
  }

  async function run() {
    try {
      var db = null, blob = null;
      try { db = await openDb(); blob = await idb(db, 'readonly', function (s) { return s.get(url); }); } catch (e) {}
      showUI();
      if (blob) {
        console.log('[autoload] using cached copy');
        progress(blob.size, blob.size);
      } else {
        t0 = Date.now();
        blob = await download();
        if (db) { try { await idb(db, 'readwrite', function (s) { return s.put(blob, url); }); } catch (e) {} }
      }
      setTitle('Starting emulator...');
      var file = new File([blob], fileName, { type: 'application/octet-stream' });
      var input = await waitForInput(10000);
      var dt = new DataTransfer();
      dt.items.add(file);
      if (input) {
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        document.body.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      }
      setTimeout(hideUI, 1500);
    } catch (err) {
      console.error('[autoload] failed:', err);
      setTitle('Download failed - check Console (F12)');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();