/* autoload.js — orchestrates ROM download + hand-off to BottleShip.
 *
 * Loaded synchronously in <head> so it can rewrite location.search BEFORE
 * the app module script reads it. Downloads the ROM to IndexedDB (parallel
 * chunked fetch, cached across visits), then dispatches a drop event onto
 * the emulator UI, which is the supported path BottleShip uses to receive
 * .wgb files from a FileList.
 *
 * URL contract:  ?load=<https://…/game.wgb>
 *                 (autoload forces ?game=dev so the emulator UI renders)
 */
(function () {
  'use strict';

  var PENDING_KEY = 'bottleship_autoload_pending';
  var RETRIES_KEY = 'bottleship_autoload_retries';
  var ALLOWED_HOSTS = ['pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev'];
  var CHUNK = 8 * 1024 * 1024;
  var PARALLEL = 8;
  var RETRIES = 3;

  /* ---------- 1. Capture URL, rewrite location synchronously ---------- */
  var search = new URLSearchParams(location.search);
  var url = search.get('load');

  if (url) {
    try { sessionStorage.setItem(PENDING_KEY, url); } catch (e) {}
  } else {
    try { url = sessionStorage.getItem(PENDING_KEY); } catch (e) {}
  }
  if (!url) return;

  // Force emulator UI (?game=dev) and strip `load` so the app doesn't try to
  // fetch the URL itself — we hand it a cached blob via a drop event instead.
  if (search.has('load') || search.get('game') !== 'dev') {
    search.set('game', 'dev');
    search.delete('load');
    try {
      history.replaceState(null, '',
        location.pathname + '?' + search.toString() + location.hash);
    } catch (e) { /* file:// or sandboxed — ignore */ }
  }

  /* ---------- 2. Validate the URL ---------- */
  var u;
  try { u = new URL(url); } catch (e) {
    console.error('[autoload] bad URL'); return;
  }
  if (ALLOWED_HOSTS.indexOf(u.hostname) === -1) {
    console.error('[autoload] host not allowed:', u.hostname); return;
  }
  var fileName = decodeURIComponent(u.pathname.split('/').pop()) || 'game.wgb';

  /* ---------- 3. Progress overlay ---------- */
  var ui;
  function showUI() {
    if (ui) return;
    ui = document.createElement('div');
    ui.style.cssText =
      'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'z-index:99999;background:#0b1215;color:#e8f1f5;font:14px system-ui,sans-serif;' +
      'padding:20px 24px;border-radius:12px;width:min(86vw,380px);' +
      'box-shadow:0 8px 40px rgba(0,0,0,.6);text-align:center';
    ui.innerHTML =
      '<div id="al-title" style="margin-bottom:12px;font-weight:600">Loading game…</div>' +
      '<div style="height:10px;background:#1c2a31;border-radius:6px;overflow:hidden">' +
      '<div id="al-bar" style="height:100%;width:0;background:#2dd4bf;transition:width .15s"></div></div>' +
      '<div id="al-text" style="margin-top:10px;font-variant-numeric:tabular-nums">0.0 MB / ? MB</div>';
    (document.body || document.documentElement).appendChild(ui);
  }
  var t0 = 0;
  function mb(n) { return (n / 1048576).toFixed(1); }
  function progress(done, total) {
    if (!ui) return;
    var secs = Math.max((Date.now() - t0) / 1000, 0.1);
    var speed = done / 1048576 / secs;
    var pct = total ? Math.min(100, done / total * 100) : 0;
    var bar = document.getElementById('al-bar');
    var txt = document.getElementById('al-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent =
      mb(done) + ' MB / ' + (total ? mb(total) : '?') + ' MB' +
      (total ? ' (' + pct.toFixed(0) + '%)' : '') +
      ' · ' + speed.toFixed(1) + ' MB/s';
  }
  function setTitle(t) {
    var el = document.getElementById('al-title');
    if (el) el.textContent = t;
  }
  function hideUI() { if (ui) { ui.remove(); ui = null; } }

  /* ---------- 4. IndexedDB cache ---------- */
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

  /* ---------- 5. Download ---------- */
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
        onBytes(-got);
        if (attempt >= RETRIES) throw e;
      }
    }
  }

  async function parallelDownload(total) {
    var count = Math.ceil(total / CHUNK), results = new Array(count),
        next = 0, done = 0;
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
      catch (e) {
        console.warn('[autoload] parallel failed, falling back:', e);
        t0 = Date.now();
      }
    }
    return singleDownload(total);
  }

  /* ---------- 6. Hand-off to BottleShip ---------- */
  //
  // BottleShip does NOT expose an input[type=file]. The supported path is a
  // native `drop` event on the app root, whose React onDrop handler:
  //   – sets the loading state,
  //   – calls Q.postMessage({type:'load_bundle', blob: file}),
  //   – wires focus to the canvas.
  // We wait for the app to actually render the canvas AND create the worker
  // (window.worker) before dispatching.
  //
  function waitForEmulator(ms) {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function poll() {
        var canvas = document.querySelector('[class*="_app__canvas_"]');
        var worker = window.worker;
        if (canvas && worker) return resolve({ canvas: canvas, worker: worker });
        if (Date.now() - start > ms) return resolve({ canvas: canvas, worker: worker });
        setTimeout(poll, 150);
      })();
    });
  }

  async function handOff(blob, name) {
    var file = new File([blob], name, { type: 'application/octet-stream' });

    var ctx = await waitForEmulator(20000);
    if (!ctx.canvas || !ctx.worker) {
      console.warn('[autoload] emulator UI or worker not ready; falling back to loadApp(url)');
      // Last resort: let the worker fetch the URL directly (re-downloads).
      if (typeof window.loadApp === 'function') {
        try {
          await window.loadApp(url);
          return true;
        } catch (e) {
          console.error('[autoload] loadApp fallback failed:', e);
        }
      }
      return false;
    }

    var dt = new DataTransfer();
    dt.items.add(file);

    var drop = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    });

    // The app root div has the onDrop handler.
    var appRoot =
      ctx.canvas.closest('[class*="_app_"]') ||
      ctx.canvas.parentElement ||
      ctx.canvas;

    appRoot.dispatchEvent(drop);
    console.log('[autoload] dispatched drop event with', name);
    return true;
  }

  /* ---------- 7. Orchestration ---------- */
  async function run() {
    try {
      showUI();

      var db = null, blob = null;
      try {
        db = await openDb();
        blob = await idb(db, 'readonly', function (s) { return s.get(url); });
      } catch (e) {
        console.warn('[autoload] cache read failed:', e);
      }

      if (blob) {
        console.log('[autoload] using cached copy (' + mb(blob.size) + ' MB)');
        progress(blob.size, blob.size);
      } else {
        t0 = Date.now();
        blob = await download();
        if (db) {
          try {
            await idb(db, 'readwrite', function (s) { return s.put(blob, url); });
          } catch (e) {
            console.warn('[autoload] cache write failed:', e);
          }
        }
      }

      setTitle('Starting emulator…');
      var ok = await handOff(blob, fileName);

      if (ok) {
        setTitle('Game loaded');
        setTimeout(hideUI, 1500);
        // Clear the pending marker once we're past the SW reload window.
        setTimeout(function () {
          try {
            if (window.crossOriginIsolated ||
                navigator.serviceWorker &&
                navigator.serviceWorker.controller) {
              sessionStorage.removeItem(PENDING_KEY);
              sessionStorage.removeItem(RETRIES_KEY);
            }
          } catch (e) {}
        }, 4000);
      } else {
        setTitle('Could not hand off to emulator — check Console (F12)');
        bumpRetry();
      }
    } catch (err) {
      console.error('[autoload] failed:', err);
      setTitle('Download failed — check Console (F12)');
      bumpRetry();
    }
  }

  function bumpRetry() {
    try {
      var r = (parseInt(sessionStorage.getItem(RETRIES_KEY) || '0', 10) || 0) + 1;
      sessionStorage.setItem(RETRIES_KEY, String(r));
      if (r >= 3) {
        sessionStorage.removeItem(PENDING_KEY);
        sessionStorage.removeItem(RETRIES_KEY);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else
    run();
})();