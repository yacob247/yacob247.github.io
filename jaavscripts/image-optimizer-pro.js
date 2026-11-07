(function () {
  "use strict";

  const storageKey = "envizion-image-optimizer-pro-intro-hidden";
  const els = {
    input: document.getElementById("imageInput"),
    dropZone: document.getElementById("dropZone"),
    format: document.getElementById("formatSelect"),
    upscale: document.getElementById("upscaleRange"),
    upscaleLabel: document.getElementById("upscaleLabel"),
    maxWidth: document.getElementById("maxWidthInput"),
    quality: document.getElementById("qualityRange"),
    qualityLabel: document.getElementById("qualityLabel"),
    processBtn: document.getElementById("processBtn"),
    clearBtn: document.getElementById("clearBtn"),
    downloadAllBtn: document.getElementById("downloadAllBtn"),
    folderBtn: document.getElementById("folderBtn"),
    zipBtn: document.getElementById("zipBtn"),
    grid: document.getElementById("resultGrid"),
    status: document.getElementById("statusLine"),
    progress: document.getElementById("progressBar"),
    intro: document.getElementById("introModal"),
    openInfo: document.getElementById("openInfo"),
    closeIntro: document.getElementById("closeIntro"),
    dontShow: document.getElementById("dontShowIntro"),
    confirmModal: document.getElementById("confirmModal"),
    confirmTitle: document.getElementById("confirmTitle"),
    confirmText: document.getElementById("confirmText"),
    cancelConfirm: document.getElementById("cancelConfirm"),
    acceptConfirm: document.getElementById("acceptConfirm")
  };
  let files = [];
  let results = [];
  let confirmResolve = null;

  function init() {
    setFooterYear();
    wireIntro();
    wireConfirm();
    wireAds();
    updateLabels();
    renderResults();
    els.input.addEventListener("change", () => addFiles(els.input.files));
    els.dropZone.addEventListener("dragover", onDragOver);
    els.dropZone.addEventListener("drop", onDrop);
    els.upscale.addEventListener("input", updateLabels);
    els.quality.addEventListener("input", updateLabels);
    els.processBtn.addEventListener("click", processImages);
    els.clearBtn.addEventListener("click", clearAll);
    els.downloadAllBtn.addEventListener("click", downloadAll);
    els.folderBtn.addEventListener("click", saveFolder);
    els.zipBtn.addEventListener("click", downloadZip);
  }

  function setFooterYear() {
    document.querySelectorAll("[data-year]").forEach((element) => {
      element.textContent = new Date().getFullYear();
    });
  }

  function wireIntro() {
    if (!localStorage.getItem(storageKey)) {
      els.intro.classList.add("open");
    }
    els.openInfo.addEventListener("click", () => els.intro.classList.add("open"));
    els.closeIntro.addEventListener("click", () => {
      if (els.dontShow.checked) localStorage.setItem(storageKey, "1");
      els.intro.classList.remove("open");
    });
  }

  function wireConfirm() {
    els.cancelConfirm.addEventListener("click", () => closeConfirm(false));
    els.acceptConfirm.addEventListener("click", () => closeConfirm(true));
  }

  function wireAds() {
    window.addEventListener("load", () => {
      document.querySelectorAll(".adsbygoogle").forEach(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.warn("AdSense unavailable", error);
        }
      });
    });
  }

  function ask(title, text) {
    els.confirmTitle.textContent = title;
    els.confirmText.textContent = text;
    els.confirmModal.classList.add("open");
    return new Promise((resolve) => {
      confirmResolve = resolve;
    });
  }

  function closeConfirm(value) {
    els.confirmModal.classList.remove("open");
    if (confirmResolve) {
      confirmResolve(value);
      confirmResolve = null;
    }
  }

  function onDragOver(event) {
    event.preventDefault();
    els.dropZone.style.borderColor = "rgba(15, 118, 110, 0.65)";
  }

  function onDrop(event) {
    event.preventDefault();
    els.dropZone.style.borderColor = "";
    addFiles(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/")));
  }

  function addFiles(fileList) {
    files = files.concat(Array.from(fileList || []).filter((file) => file.type.startsWith("image/")));
    els.status.textContent = `${files.length} image${files.length === 1 ? "" : "s"} ready for optimization.`;
    results = [];
    renderResults();
    updateExportButtons();
  }

  async function processImages() {
    if (!files.length) {
      setStatus("Choose image files first.", true);
      return;
    }
    const ok = await ask("Optimize image batch?", `This will upscale and compress ${files.length} image${files.length === 1 ? "" : "s"} locally in your browser.`);
    if (!ok) return;
    toggleBusy(true);
    results = [];
    renderResults();
    try {
      for (let i = 0; i < files.length; i += 1) {
        setStatus(`Optimizing ${files[i].name}...`);
        results.push(await optimizeFile(files[i]));
        setProgress(((i + 1) / files.length) * 100);
        renderResults();
        await wait(80);
      }
      setStatus(`Optimized ${results.length} image${results.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Image optimization failed.", true);
    } finally {
      toggleBusy(false);
      updateExportButtons();
    }
  }

  async function optimizeFile(file) {
    const bitmap = await createImageBitmap(file);
    const upscale = Number(els.upscale.value);
    const maxWidth = Math.max(100, Number(els.maxWidth.value) || 1920);
    const quality = Number(els.quality.value) / 100;
    const requestedFormat = resolveOutputFormat(file);
    const intermediateWidth = Math.round(bitmap.width * upscale);
    const intermediateHeight = Math.round(bitmap.height * upscale);
    const finalWidth = Math.min(intermediateWidth, maxWidth);
    const finalHeight = Math.max(1, Math.round(finalWidth * (bitmap.height / bitmap.width)));
    const work = document.createElement("canvas");
    work.width = intermediateWidth;
    work.height = intermediateHeight;
    const keepsAlpha = requestedFormat !== "image/jpeg";
    const workCtx = work.getContext("2d", { alpha: keepsAlpha });
    workCtx.imageSmoothingEnabled = true;
    workCtx.imageSmoothingQuality = "high";
    if (!keepsAlpha) {
      workCtx.fillStyle = "#ffffff";
      workCtx.fillRect(0, 0, intermediateWidth, intermediateHeight);
    }
    workCtx.drawImage(bitmap, 0, 0, intermediateWidth, intermediateHeight);

    const output = document.createElement("canvas");
    output.width = finalWidth;
    output.height = finalHeight;
    const outCtx = output.getContext("2d", { alpha: keepsAlpha });
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    if (!keepsAlpha) {
      outCtx.fillStyle = "#ffffff";
      outCtx.fillRect(0, 0, finalWidth, finalHeight);
    }
    outCtx.drawImage(work, 0, 0, finalWidth, finalHeight);
    const blob = await canvasToBlob(output, requestedFormat, quality);
    const finalFormat = blob.type || requestedFormat;
    const extension = extensionFor(finalFormat, file.name);
    const name = `${baseName(file.name)}-optimized.${extension}`;
    bitmap.close();
    return {
      name,
      blob,
      url: URL.createObjectURL(blob),
      originalSize: file.size,
      newSize: blob.size,
      width: finalWidth,
      height: finalHeight,
      format: finalFormat
    };
  }

  function renderResults() {
    if (!results.length) {
      els.grid.innerHTML = files.length
        ? files.map((file) => `<article class="result-item"><strong>${escapeHtml(file.name)}</strong><span class="field-note">${formatBytes(file.size)} selected</span></article>`).join("")
        : '<article class="result-item"><strong>No optimized images yet</strong><span class="field-note">Add images, choose settings, then process the batch.</span></article>';
      return;
    }
    els.grid.innerHTML = results.map((item, index) => `
      <article class="result-item">
        <img src="${item.url}" alt="Optimized preview of ${escapeHtml(item.name)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="field-note">${item.width}x${item.height} | ${formatBytes(item.originalSize)} to ${formatBytes(item.newSize)} | ${savingText(item)}</span>
        <button class="power-button ghost" data-download="${index}" type="button">Download</button>
      </article>
    `).join("");
    els.grid.querySelectorAll("[data-download]").forEach((button) => {
      button.addEventListener("click", () => downloadBlob(results[Number(button.dataset.download)].blob, results[Number(button.dataset.download)].name));
    });
  }

  async function downloadAll() {
    if (!results.length) return;
    const ok = await ask("Download all optimized images?", "Your browser may ask to allow multiple downloads. This exports each optimized file separately.");
    if (!ok) return;
    for (const item of results) {
      downloadBlob(item.blob, item.name);
      await wait(160);
    }
  }

  async function saveFolder() {
    if (!results.length) return;
    const ok = await ask("Save unzipped folder?", "Chrome and Edge can save directly to a chosen folder. Other browsers will use individual downloads as a fallback.");
    if (!ok) return;
    if (!window.showDirectoryPicker) {
      setStatus("Folder saving is not supported here, starting individual downloads instead.");
      await downloadAllFallback();
      return;
    }
    const directory = await window.showDirectoryPicker();
    for (const item of results) {
      const handle = await directory.getFileHandle(item.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(item.blob);
      await writable.close();
    }
    setStatus("Saved optimized images into the selected folder.");
  }

  async function downloadZip() {
    if (!results.length) return;
    const ok = await ask("Create ZIP file?", `This will package ${results.length} optimized image${results.length === 1 ? "" : "s"} into one ZIP download.`);
    if (!ok) return;
    if (!window.JSZip) {
      setStatus("JSZip is not available yet. Try again after the page finishes loading.", true);
      return;
    }
    toggleBusy(true);
    try {
      const zip = new window.JSZip();
      results.forEach((item) => zip.file(item.name, item.blob));
      const blob = await zip.generateAsync({ type: "blob" }, (meta) => setProgress(meta.percent));
      downloadBlob(blob, "envizion-optimized-images.zip");
      setStatus("ZIP download is ready.");
    } finally {
      toggleBusy(false);
    }
  }

  async function downloadAllFallback() {
    for (const item of results) {
      downloadBlob(item.blob, item.name);
      await wait(160);
    }
  }

  function clearAll() {
    results.forEach((item) => URL.revokeObjectURL(item.url));
    results = [];
    files = [];
    els.input.value = "";
    setProgress(0);
    updateExportButtons();
    renderResults();
    setStatus("Choose images to begin.");
  }

  function updateLabels() {
    els.upscaleLabel.textContent = `${Number(els.upscale.value).toFixed(Number.isInteger(Number(els.upscale.value)) ? 0 : 1)}x`;
    els.qualityLabel.textContent = `${els.quality.value}%`;
  }

  function updateExportButtons() {
    const disabled = !results.length;
    els.downloadAllBtn.disabled = disabled;
    els.folderBtn.disabled = disabled;
    els.zipBtn.disabled = disabled;
  }

  function toggleBusy(isBusy) {
    els.processBtn.disabled = isBusy;
    els.downloadAllBtn.disabled = isBusy || !results.length;
    els.folderBtn.disabled = isBusy || !results.length;
    els.zipBtn.disabled = isBusy || !results.length;
  }

  function setProgress(value) {
    els.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.style.color = isError ? "#be123c" : "";
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode image."));
      }, type, quality);
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitizeName(name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function resolveOutputFormat(file) {
    if (els.format.value !== "auto") return els.format.value;
    const type = (file.type || "").toLowerCase();
    const extension = file.name.split(".").pop().toLowerCase();
    if (type === "image/jpeg" || extension === "jpg" || extension === "jpeg") return "image/jpeg";
    if (type === "image/webp" || extension === "webp") return "image/webp";
    if (type === "image/png" || extension === "png") return "image/png";
    return "image/png";
  }

  function extensionFor(format, originalName) {
    const originalExtension = (originalName.split(".").pop() || "").toLowerCase();
    if (format === "image/png") return "png";
    if (format === "image/jpeg") return originalExtension === "jpeg" ? "jpeg" : "jpg";
    if (format === "image/webp") return "webp";
    return "png";
  }

  function baseName(name) {
    return sanitizeName(name.replace(/\.[^.]+$/, ""));
  }

  function sanitizeName(name) {
    return name.replace(/[\\/:*?"<>|]+/g, "-");
  }

  function savingText(item) {
    const diff = item.originalSize - item.newSize;
    if (diff <= 0) return "larger after quality/upscale";
    return `${Math.round((diff / item.originalSize) * 100)}% smaller`;
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** power)).toFixed(power ? 1 : 0)} ${units[power]}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  document.addEventListener("DOMContentLoaded", init);
}());


/* --- extracted inline scripts --- */
(function(){
  // ── VAST TAG URLs ─────────────────────────────────────────────
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

(function(){
  setInterval(function(){
    if(document.hidden)return;
    document.querySelectorAll('.evz-col-box iframe').forEach(function(f){
      f.src=f.src.split('?')[0]+'?_t='+Date.now();
    });
  },45000);
})();

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function() {
    const upBtn = document.getElementById('envizion-scroll-up-btn');
    const folderBtn = document.getElementById('envizion-folder-nav-btn');

    function checkScrollPosition() {
        // Calculate document coordinates and viewport dimensions
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY || window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;

        // Triggers visibility when user is within 40px of the absolute page bottom
        if ((windowHeight + scrollY) >= (documentHeight - 40)) {
            upBtn.classList.add('visible-at-bottom');
            folderBtn.classList.add('visible-at-bottom');
        } else {
            upBtn.classList.remove('visible-at-bottom');
            folderBtn.classList.remove('visible-at-bottom');
        }
    }

    window.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    // Initial run to verify height state on short pages
    document.addEventListener('DOMContentLoaded', checkScrollPosition);
    checkScrollPosition();
})();

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

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

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

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11649331',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11649335',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
