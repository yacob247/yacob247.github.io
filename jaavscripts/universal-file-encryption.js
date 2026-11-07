(function () {
  "use strict";

  const lockMagic = "EVZLOCK1";
  const storageKey = "envizion-universal-file-encryption-intro-hidden";
  const els = {
    fileInput: document.getElementById("fileInput"),
    dropZone: document.getElementById("dropZone"),
    password: document.getElementById("passwordInput"),
    confirm: document.getElementById("confirmInput"),
    encryptBtn: document.getElementById("encryptBtn"),
    decryptBtn: document.getElementById("decryptBtn"),
    clearBtn: document.getElementById("clearBtn"),
    fileList: document.getElementById("fileList"),
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
  let confirmResolve = null;

  function init() {
    setFooterYear();
    wireIntro();
    wireConfirm();
    wireAds();
    els.fileInput.addEventListener("change", () => addFiles(els.fileInput.files));
    els.dropZone.addEventListener("dragover", onDragOver);
    els.dropZone.addEventListener("drop", onDrop);
    els.encryptBtn.addEventListener("click", () => runBatch("encrypt"));
    els.decryptBtn.addEventListener("click", () => runBatch("decrypt"));
    els.clearBtn.addEventListener("click", clearFiles);
    renderFileList();
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
      if (els.dontShow.checked) {
        localStorage.setItem(storageKey, "1");
      }
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
    addFiles(event.dataTransfer.files);
  }

  function addFiles(fileList) {
    files = files.concat(Array.from(fileList || []));
    renderFileList();
    els.status.textContent = `${files.length} file${files.length === 1 ? "" : "s"} ready.`;
  }

  function clearFiles() {
    files = [];
    els.fileInput.value = "";
    setProgress(0);
    renderFileList();
    els.status.textContent = "Choose files to begin.";
  }

  function renderFileList() {
    if (!files.length) {
      els.fileList.innerHTML = '<article class="result-item"><strong>No files selected</strong><span class="field-note">Add one or more files to encrypt or decrypt locally.</span></article>';
      return;
    }
    els.fileList.innerHTML = files.map((file, index) => `
      <article class="result-item">
        <strong>${escapeHtml(file.name)}</strong>
        <span class="field-note">${formatBytes(file.size)} | ${escapeHtml(file.type || "unknown file type")}</span>
        <button class="power-button ghost" type="button" data-remove="${index}">Remove</button>
      </article>
    `).join("");
    els.fileList.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        files.splice(Number(button.dataset.remove), 1);
        renderFileList();
      });
    });
  }

  async function runBatch(mode) {
    const password = normalizePassword(els.password.value);
    const confirmation = normalizePassword(els.confirm.value);
    if (!files.length) {
      setStatus("Add files first.", true);
      return;
    }
    if (password.length < 8) {
      setStatus("Use a password with at least 8 characters.", true);
      return;
    }
    if (mode === "encrypt" && !confirmation) {
      setStatus("Repeat the password in the confirmation field before encrypting.", true);
      return;
    }
    if (mode === "encrypt" && password !== confirmation) {
      setStatus("Password confirmation does not match.", true);
      return;
    }
    const ok = await ask(
      mode === "encrypt" ? "Encrypt selected files?" : "Decrypt selected lock files?",
      mode === "encrypt"
        ? `This will encrypt ${files.length} file${files.length === 1 ? "" : "s"} and download locked copies. Keep your password safe.`
        : `This will decrypt ${files.length} locked file${files.length === 1 ? "" : "s"} using the password you entered.`
    );
    if (!ok) return;

    toggleBusy(true);
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setStatus(`${mode === "encrypt" ? "Encrypting" : "Decrypting"} ${file.name}...`);
        const output = mode === "encrypt"
          ? await encryptFile(file, password)
          : await decryptFile(file, password);
        downloadBlob(output.blob, output.name);
        setProgress(((i + 1) / files.length) * 100);
        await wait(140);
      }
      setStatus(mode === "encrypt" ? "Encrypted downloads are ready." : "Decrypted downloads are ready.");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The file operation failed.", true);
    } finally {
      toggleBusy(false);
    }
  }

  async function encryptFile(file, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const plain = await file.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
    const metadata = {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      salt: toBase64(salt),
      iv: toBase64(iv),
      created: new Date().toISOString()
    };
    const metaBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const header = new TextEncoder().encode(lockMagic);
    const length = new ArrayBuffer(4);
    new DataView(length).setUint32(0, metaBytes.length, false);
    return {
      blob: new Blob([header, length, metaBytes, encrypted], { type: "application/octet-stream" }),
      name: `${file.name}.envizionlock`
    };
  }

  async function decryptFile(file, password) {
    const buffer = await file.arrayBuffer();
    const header = new TextDecoder().decode(buffer.slice(0, 8));
    if (header !== lockMagic) {
      throw new Error(`${file.name} is not an Envizion lock file.`);
    }
    const metadataLength = new DataView(buffer.slice(8, 12)).getUint32(0, false);
    const metadata = JSON.parse(new TextDecoder().decode(buffer.slice(12, 12 + metadataLength)));
    const cipher = buffer.slice(12 + metadataLength);
    const key = await deriveKey(password, fromBase64(metadata.salt));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(metadata.iv) }, key, cipher);
    return {
      blob: new Blob([plain], { type: metadata.type || "application/octet-stream" }),
      name: metadata.name || file.name.replace(/\.envizionlock$/i, "")
    };
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
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

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.style.color = isError ? "#be123c" : "";
  }

  function setProgress(value) {
    els.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function toggleBusy(isBusy) {
    els.encryptBtn.disabled = isBusy;
    els.decryptBtn.disabled = isBusy;
  }

  function toBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** power)).toFixed(power ? 1 : 0)} ${units[power]}`;
  }

  function sanitizeName(name) {
    return name.replace(/[\\/:*?"<>|]+/g, "-");
  }

  function normalizePassword(value) {
    return String(value).replace(/\r\n/g, "\n").normalize("NFC").trim();
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
