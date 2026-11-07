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

const CHUNK_SIZE = 65536; // 64 KB per chunk
const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

let selectedFile = null;
let peer = null;
let conn = null;
let receivedChunks = [];
let receivedBytes = 0;
let expectedSize = 0;
let receivedFileName = '';
let receivedMime = '';
let transferStart = null;
let lastBytes = 0;
let speedTimer = null;

// ── Bootstrap ──────────────────────────────────────────────────────
function loadPeerJS(cb) {
    if (window.Peer) { cb(); return; }
    const s = document.createElement('script');
    s.src = PEERJS_CDN;
    s.onload = cb;
    s.onerror = () => showToast('Failed to load PeerJS. Check your connection.');
    document.head.appendChild(s);
}

window.addEventListener('load', () => {
    const hash = location.hash;
    if (hash && hash.startsWith('#recv=')) {
        showView('receiverView');
        loadPeerJS(() => startReceiver());
    } else {
        showView('senderView');
    }
});

// ── UI helpers ─────────────────────────────────────────────────────
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goHome() {
    if (peer) { try { peer.destroy(); } catch(e){} peer = null; }
    conn = null;
    selectedFile = null;
    clearFile();
    document.getElementById('waitingCard').style.display = 'none';
    document.getElementById('uploadCard').style.display = 'block';
    history.replaceState(null, '', location.pathname);
    showView('senderView');
}

let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
    return (b/1073741824).toFixed(2) + ' GB';
}

function formatExt(name) {
    const p = name.lastIndexOf('.');
    return p >= 0 ? name.slice(p+1).toUpperCase() : 'FILE';
}

// ── File selection ─────────────────────────────────────────────────
const dropzone = document.getElementById('dropzone');
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
dropzone.addEventListener('click', () => document.getElementById('fileInput').click());

function handleFileSelect(e) {
    if (e.target.files[0]) loadFile(e.target.files[0]);
}

function loadFile(file) {
    selectedFile = file;
    document.getElementById('selectedFileName').textContent = file.name;
    document.getElementById('selectedFileSize').textContent = formatBytes(file.size) + ' · ' + file.type;
    document.getElementById('fileInfoBox').style.display = 'block';
    dropzone.style.display = 'none';
}

function clearFile() {
    selectedFile = null;
    document.getElementById('fileInfoBox').style.display = 'none';
    document.getElementById('fileInput').value = '';
    dropzone.style.display = '';
}

// ── SENDER ─────────────────────────────────────────────────────────
function startSender() {
    if (!selectedFile) return;
    document.getElementById('uploadCard').style.display = 'none';

    document.getElementById('statSize').textContent = formatBytes(selectedFile.size);
    document.getElementById('statChunks').textContent = Math.ceil(selectedFile.size / CHUNK_SIZE).toLocaleString();
    document.getElementById('statType').textContent = formatExt(selectedFile.name);
    document.getElementById('waitingCard').style.display = 'block';
    document.getElementById('shareUrl').value = 'Setting up…';

    loadPeerJS(() => {
        peer = new Peer({ debug: 0 });

        peer.on('open', id => {
            const url = `${location.origin}${location.pathname}#recv=${encodeURIComponent(id)}`;
            document.getElementById('shareUrl').value = url;
            showToast('Link ready — share it with the receiver!');
        });

        peer.on('connection', incoming => {
            conn = incoming;
            setConnStatus('connecting', 'Receiver connected — negotiating…');
            incoming.on('open', () => {
                setConnStatus('active', 'Transferring…');
                sendFileMeta();
                doTransfer();
            });
            incoming.on('error', e => {
                setConnStatus('error', 'Connection error');
                console.error(e);
            });
        });

        peer.on('error', e => {
            showToast('Peer error: ' + e.type);
            console.error(e);
        });
    });
}

function setConnStatus(type, label) {
    const el = document.getElementById('connStatus');
    el.className = 'status-pill ' + type;
    el.innerHTML = `<span class="status-dot${type==='active'||type==='connecting'?' blink':''}"></span>${label}`;
}

function sendFileMeta() {
    conn.send(JSON.stringify({
        type: 'meta',
        name: selectedFile.name,
        size: selectedFile.size,
        mime: selectedFile.type
    }));
}

function doTransfer() {
    document.getElementById('transferSection').style.display = 'block';
    transferStart = Date.now();
    lastBytes = 0;

    let offset = 0;

    speedTimer = setInterval(() => {
        const elapsed = (Date.now() - transferStart) / 1000;
        const bps = (conn && selectedFile) ? offset / elapsed : 0;
        document.getElementById('transferSpeed').textContent = formatBytes(bps) + '/s';
    }, 800);

    function sendNext() {
        if (offset >= selectedFile.size) {
            conn.send(JSON.stringify({ type: 'done' }));
            clearInterval(speedTimer);
            document.getElementById('transferSection').style.display = 'none';
            document.getElementById('transferDone').style.display = 'block';
            setConnStatus('done', 'Transfer complete');
            return;
        }
        const slice = selectedFile.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();
        reader.onload = e => {
            if (!conn) return;
            const buf = e.target.result;
            conn.send(buf);

            offset += buf.byteLength;
            const pct = Math.min(100, Math.round((offset / selectedFile.size) * 100));
            document.getElementById('senderBar').style.width = pct + '%';
            document.getElementById('sentBytes').textContent = formatBytes(offset) + ' sent';
            document.getElementById('sentPct').textContent = pct + '%';

            if (conn.dataChannel && conn.dataChannel.bufferedAmount > 16 * 1024 * 1024) {
                setTimeout(sendNext, 50);
            } else {
                sendNext();
            }
        };
        reader.readAsArrayBuffer(slice);
    }
    sendNext();
}

function copyLink() {
    const url = document.getElementById('shareUrl').value;
    if (!url || url === 'Setting up…') return;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy link'; btn.classList.remove('copied'); }, 2500);
    }).catch(() => {
        document.getElementById('shareUrl').select();
        document.execCommand('copy');
        showToast('Link copied!');
    });
}

// ── RECEIVER ───────────────────────────────────────────────────────
function startReceiver() {
    const hash = location.hash;
    const senderId = decodeURIComponent(hash.replace('#recv=', ''));
    if (!senderId) {
        showRecvError('Invalid link — no sender ID found.');
        return;
    }

    peer = new Peer({ debug: 0 });

    peer.on('open', myId => {
        setRecvStatus('connecting', 'Connecting to sender…');
        conn = peer.connect(senderId, {
            reliable: true,
            serialization: 'binary'
        });

        conn.on('open', () => {
            setRecvStatus('active', 'Connected — waiting for file…');
        });

        conn.on('data', data => {
            if (typeof data === 'string') {
                try {
                    const msg = JSON.parse(data);
                    if (msg.type === 'meta') handleMeta(msg);
                    if (msg.type === 'done') handleDone();
                } catch(e) {}
            } else {
                handleChunk(data);
            }
        });

        conn.on('error', e => {
            showRecvError('Connection lost: ' + e.type);
        });

        conn.on('close', () => {
            if (receivedBytes < expectedSize && expectedSize > 0) {
                showRecvError('Connection closed before transfer finished.');
            }
        });
    });

    peer.on('error', e => {
        showRecvError('Could not connect: ' + e.message + '. The sender may have closed their tab.');
    });
}

function handleMeta(msg) {
    receivedFileName = msg.name;
    receivedMime = msg.mime;
    expectedSize = msg.size;
    receivedChunks = [];
    receivedBytes = 0;
    transferStart = Date.now();

    document.getElementById('recvFileMeta').textContent =
        `"${msg.name}" — ${formatBytes(msg.size)}`;
    document.getElementById('recvProgressSection').style.display = 'block';
    setRecvStatus('active', 'Receiving…');

    const totalChunks = Math.ceil(msg.size / CHUNK_SIZE);
    const vizCount = Math.min(totalChunks, 200);
    const viz = document.getElementById('chunkViz');
    viz.innerHTML = '';
    for (let i = 0; i < vizCount; i++) {
        const c = document.createElement('div');
        c.className = 'chunk-cell';
        c.id = 'cc' + i;
        viz.appendChild(c);
    }
}

function handleChunk(data) {
    receivedChunks.push(data);
    receivedBytes += data.byteLength;

    const pct = expectedSize > 0 ? Math.min(100, Math.round((receivedBytes / expectedSize) * 100)) : 0;
    document.getElementById('recvBar').style.width = pct + '%';
    document.getElementById('recvBytes').textContent = formatBytes(receivedBytes) + ' received';
    document.getElementById('recvPct').textContent = pct + '%';

    const totalChunks = Math.ceil(expectedSize / CHUNK_SIZE);
    const vizCount = Math.min(totalChunks, 200);
    const cellIdx = Math.floor((receivedChunks.length / totalChunks) * vizCount);
    for (let i = 0; i < cellIdx; i++) {
        const c = document.getElementById('cc' + i);
        if (c) c.classList.add('done');
    }
}

function handleDone() {
    document.getElementById('recvProgressSection').style.display = 'none';
    document.getElementById('recvDoneSection').style.display = 'block';
    setRecvStatus('done', 'Complete');

    const elapsed = ((Date.now() - transferStart) / 1000).toFixed(1);
    const avgSpeed = formatBytes(receivedBytes / ((Date.now() - transferStart) / 1000));
    document.getElementById('recvCompleteInfo').textContent =
        `${formatBytes(receivedBytes)} in ${elapsed}s — avg ${avgSpeed}/s`;

    const blob = new Blob(receivedChunks, { type: receivedMime || 'application/octet-stream' });
    downloadURL = URL.createObjectURL(blob);
}

let downloadURL = null;
function triggerDownload() {
    if (!downloadURL) return;
    const a = document.createElement('a');
    a.href = downloadURL;
    a.download = receivedFileName || 'velolink-file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Saving to device…');
}

window.addEventListener('beforeunload', () => {
    if (downloadURL) {
        URL.revokeObjectURL(downloadURL);
        downloadURL = null;
    }
    receivedChunks = [];
});

function setRecvStatus(type, label) {
    const el = document.getElementById('recvStatus');
    el.className = 'status-pill ' + type;
    el.innerHTML = `<span class="status-dot${type==='active'||type==='connecting'?' blink':''}"></span>${label}`;
}

function showRecvError(msg) {
    document.getElementById('recvProgressSection').style.display = 'none';
    document.getElementById('recvDoneSection').style.display = 'none';
    document.getElementById('recvErrorSection').style.display = 'block';
    document.getElementById('recvErrorMsg').textContent = msg;
    setRecvStatus('error', 'Failed');
}

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
