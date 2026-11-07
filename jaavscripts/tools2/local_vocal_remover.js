// Initialize Lucide icons
        lucide.createIcons();

        // --- UI State Management ---
        const sections = {
            upload: document.getElementById('upload-section'),
            processing: document.getElementById('processing-section'),
            results: document.getElementById('results-section')
        };
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const statusText = document.getElementById('processing-status');

        function showSection(sectionName) {
            Object.values(sections).forEach(s => s.classList.add('hidden'));
            sections[sectionName].classList.remove('hidden');
            sections[sectionName].classList.add('flex');
        }

        function resetApp() {
            document.getElementById('original-player').src = "";
            document.getElementById('instrumental-player').src = "";
            fileInput.value = "";
            showSection('upload');
        }

        function showError(msg) {
            const modal = document.getElementById('error-modal');
            const content = document.getElementById('error-modal-content');
            document.getElementById('error-message').textContent = msg;
            modal.classList.remove('hidden');
            // Small delay for CSS transition
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                content.classList.remove('scale-95');
            }, 10);
            showSection('upload');
        }

        function closeError() {
            const modal = document.getElementById('error-modal');
            const content = document.getElementById('error-modal-content');
            modal.classList.add('opacity-0');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }

        // --- Drag and Drop Logic ---
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // --- Audio Processing Logic ---
        let audioCtx;

        async function handleFile(file) {
            if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|flac|ogg|aac)$/i)) {
                showError("Please upload a valid audio file format.");
                return;
            }

            showSection('processing');

            try {
                // Read file
                statusText.textContent = "Loading file into memory...";
                const arrayBuffer = await file.arrayBuffer();

                // Initialize AudioContext on user interaction
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }

                statusText.textContent = "Decoding audio data...";
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                if (audioBuffer.numberOfChannels < 2) {
                    showError("This file is mono (1 channel). Phase cancellation requires a stereo file to detect and remove center-panned vocals.");
                    return;
                }

                statusText.textContent = "Processing advanced DSP node routing...";

                // Allow UI to update before heavy processing blocks thread
                setTimeout(async () => {
                    try {
                        const processedBuffer = await executeVocalRemoval(audioBuffer);

                        statusText.textContent = "Generating audio players...";
                        setupPlayers(file, processedBuffer);
                    } catch (err) {
                        console.error(err);
                        showError("Failed to process the audio. The file might be corrupted or too large for available memory.");
                    }
                }, 100);

            } catch (err) {
                console.error(err);
                showError("Error decoding the audio file. It might be unsupported or corrupted.");
            }
        }

        // The Core DSP Engine
        async function executeVocalRemoval(buffer) {
            const offlineCtx = new OfflineAudioContext(
                2, 
                buffer.length, 
                buffer.sampleRate
            );

            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;

            // Strategy: 
            // 1. Separate bass frequencies (< 120Hz) and keep them stereo (kick, bassline).
            // 2. Take everything else (> 120Hz) and apply Phase Cancellation (L - R) to eliminate center vocals.
            // 3. Merge them back together.

            // --- Node Setup ---

            // Filters
            const crossoverFreq = 150; // Frequencies below this stay untouched

            const lowpassL = offlineCtx.createBiquadFilter();
            lowpassL.type = 'lowpass';
            lowpassL.frequency.value = crossoverFreq;

            const lowpassR = offlineCtx.createBiquadFilter();
            lowpassR.type = 'lowpass';
            lowpassR.frequency.value = crossoverFreq;

            const highpass = offlineCtx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = crossoverFreq;

            // Splitters & Mergers
            const initialSplitter = offlineCtx.createChannelSplitter(2);
            const highSplitter = offlineCtx.createChannelSplitter(2);

            // The magic node: Inverts the phase of the right channel
            const inverter = offlineCtx.createGain();
            inverter.gain.value = -1;

            // Bring it all back together
            const merger = offlineCtx.createChannelMerger(2);

            // --- Routing ---
            source.connect(initialSplitter);

            // Route 1: Bass Preservation
            initialSplitter.connect(lowpassL, 0); // Left bass
            initialSplitter.connect(lowpassR, 1); // Right bass
            lowpassL.connect(merger, 0, 0); // Route left bass to left output
            lowpassR.connect(merger, 0, 1); // Route right bass to right output

            // Route 2: Vocal Cancellation on Highs
            source.connect(highpass);
            highpass.connect(highSplitter);

            // Left high frequency passes through
            highSplitter.connect(merger, 0, 0); // To Left output
            highSplitter.connect(merger, 0, 1); // To Right output (makes the result mono, centered)

            // Right high frequency is INVERTED, then added
            highSplitter.connect(inverter, 1);
            inverter.connect(merger, 0, 0); // Subtract from Left
            inverter.connect(merger, 0, 1); // Subtract from Right

            merger.connect(offlineCtx.destination);

            // Start rendering
            source.start(0);
            const renderedBuffer = await offlineCtx.startRendering();

            // Optional: Normalize volume slightly since subtraction drops gain
            return normalizeAudio(renderedBuffer);
        }

        // Simple normalization to restore lost gain from cancellation
        function normalizeAudio(buffer) {
            let maxAmp = 0;
            const channels = [];
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                channels.push(buffer.getChannelData(i));
                for (let j = 0; j < buffer.length; j++) {
                    const absAmp = Math.abs(channels[i][j]);
                    if (absAmp > maxAmp) maxAmp = absAmp;
                }
            }

            // Only amplify if it's too quiet, don't clip
            if (maxAmp < 0.9 && maxAmp > 0.0) {
                const multiplier = 0.9 / maxAmp;
                for (let i = 0; i < buffer.numberOfChannels; i++) {
                    for (let j = 0; j < buffer.length; j++) {
                        channels[i][j] *= multiplier;
                    }
                }
            }
            return buffer;
        }

        function setupPlayers(originalFile, processedBuffer) {
            // Setup Original Player
            const originalURL = URL.createObjectURL(originalFile);
            document.getElementById('original-player').src = originalURL;

            // Setup Processed Player
            // Convert AudioBuffer to WAV Blob asynchronously so we don't freeze UI
            statusText.textContent = "Encoding final WAV file...";

            setTimeout(() => {
                const wavBlob = audioBufferToWav(processedBuffer);
                const processedURL = URL.createObjectURL(wavBlob);
                document.getElementById('instrumental-player').src = processedURL;

                // Setup Download Button
                const downloadBtn = document.getElementById('download-btn');
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = processedURL;
                    // Format file name
                    const originalName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
                    a.download = `${originalName}_instrumental.wav`;
                    a.click();
                };

                showSection('results');
            }, 50);
        }

        // --- WAV Encoding Logic ---
        function audioBufferToWav(buffer) {
            let numOfChan = buffer.numberOfChannels,
                length = buffer.length * numOfChan * 2 + 44,
                bufferArray = new ArrayBuffer(length),
                view = new DataView(bufferArray),
                channels = [], i, sample,
                offset = 0,
                pos = 0;

            // write WAVE header
            setUint32(0x46464952); // "RIFF"
            setUint32(length - 8); // file length - 8
            setUint32(0x45564157); // "WAVE"

            setUint32(0x20746d66); // "fmt " chunk
            setUint32(16); // length = 16
            setUint16(1); // PCM (uncompressed)
            setUint16(numOfChan);
            setUint32(buffer.sampleRate);
            setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
            setUint16(numOfChan * 2); // block-align
            setUint16(16); // 16-bit (hardcoded)

            setUint32(0x61746164); // "data" - chunk
            setUint32(length - pos - 4); // chunk length

            // write interleaved data
            for (i = 0; i < buffer.numberOfChannels; i++)
                channels.push(buffer.getChannelData(i));

            while (pos < buffer.length) {
                for (i = 0; i < numOfChan; i++) {
                    // interleave channels
                    sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
                    // scale to 16-bit signed int
                    sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
                    view.setInt16(offset, sample, true); // write 16-bit sample
                    offset += 2;
                }
                pos++;
            }

            return new Blob([bufferArray], {type: "audio/wav"});

            function setUint16(data) {
                view.setUint16(offset, data, true);
                offset += 2;
            }

            function setUint32(data) {
                view.setUint32(offset, data, true);
                offset += 4;
            }
        }

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
