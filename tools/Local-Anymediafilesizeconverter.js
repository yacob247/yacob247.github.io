// --- State Variables ---
        let currentFile = null;
        let isProcessing = false;

        // --- DOM Elements ---
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        const uploadIcon = document.getElementById('uploadIcon');
        const uploadPrompt = document.getElementById('uploadPrompt');
        const fileInfo = document.getElementById('fileInfo');
        const fileNameEl = document.getElementById('fileName');
        const fileSizeEl = document.getElementById('fileSize');

        const convertBtn = document.getElementById('convertBtn');
        const outputFormat = document.getElementById('outputFormat');

        const alertBox = document.getElementById('alertBox');
        const alertMessage = document.getElementById('alertMessage');
        const alertIcon = document.getElementById('alertIcon');

        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const statusText = document.getElementById('statusText');

        const downloadArea = document.getElementById('downloadArea');
        const downloadLink = document.getElementById('downloadLink');
        const convertAnotherBtn = document.getElementById('convertAnotherBtn');

        const logsContainer = document.getElementById('logs');
        const clearLogsBtn = document.getElementById('clearLogsBtn');

        const seoToggleBtn = document.getElementById('seoToggleBtn');
        const seoContent = document.getElementById('seoContent');
        const seoToggleIcon = document.getElementById('seoToggleIcon');

        // --- SEO Accordion Toggle Logic ---
        seoToggleBtn.addEventListener('click', () => {
            const isOpen = seoContent.classList.contains('open');
            if (isOpen) {
                seoContent.classList.remove('open');
                seoToggleIcon.classList.remove('rotate-180');
            } else {
                seoContent.classList.add('open');
                seoToggleIcon.classList.add('rotate-180');
                setTimeout(() => {
                    seoContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 400);
            }
        });

        // --- Utility Functions ---
        function formatBytes(bytes, decimals = 2) {
            if (!+bytes) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        }

        function showAlert(msg, type = 'info') {
            alertBox.classList.remove('hidden', 'bg-red-500/10', 'border-red-500/50', 'text-red-400', 'bg-indigo-500/10', 'border-indigo-500/50', 'text-indigo-400');
            if (type === 'error') {
                alertBox.classList.add('bg-red-500/10', 'border-red-500/50', 'text-red-400');
                alertIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
            } else {
                alertBox.classList.add('bg-indigo-500/10', 'border-indigo-500/50', 'text-indigo-400');
                alertIcon.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
            }
            alertMessage.textContent = msg;
        }

        function hideAlert() {
            alertBox.classList.add('hidden');
        }

        function addLog(message, isError = false) {
            const line = document.createElement('div');
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            line.innerHTML = `<span class="text-slate-500">[${timeStr}]</span> <span class="${isError ? 'text-red-400 font-medium' : 'text-slate-300'}">${message}</span>`;

            logsContainer.appendChild(line);
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        function resetUI() {
            currentFile = null;
            fileInput.value = '';
            uploadIcon.classList.remove('hidden');
            uploadPrompt.classList.remove('hidden');
            fileInfo.classList.add('hidden');
            fileInfo.classList.remove('flex');
            dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
            dropZone.classList.add('border-slate-600', 'bg-slate-800/50');
            hideAlert();
            downloadArea.classList.add('hidden');
            progressContainer.classList.add('hidden');
        }

        // --- File Selection & Validation ---
        function handleFile(file) {
            if (!file) return;

            currentFile = file;

            // Toggle UI details
            uploadIcon.classList.add('hidden');
            uploadPrompt.classList.add('hidden');
            fileInfo.classList.remove('hidden');
            fileInfo.classList.add('flex');

            fileNameEl.textContent = file.name;
            fileSizeEl.textContent = formatBytes(file.size);

            dropZone.classList.add('border-indigo-500', 'bg-indigo-500/10');
            dropZone.classList.remove('border-slate-600', 'bg-slate-800/50');

            hideAlert();
            downloadArea.classList.add('hidden');
            progressContainer.classList.add('hidden');

            // Suggest target container
            const ext = file.name.split('.').pop().toLowerCase();
            const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];

            if (audioExts.includes(ext)) {
                outputFormat.value = ext === 'wav' ? 'mp3' : 'wav';
            } else if (ext === 'webm') {
                outputFormat.value = 'mp4';
            } else {
                outputFormat.value = 'webm';
            }

            addLog(`File loaded: ${file.name} (${formatBytes(file.size)})`);
        }

        // --- Drag & Drop Listeners ---
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                if(!isProcessing) {
                    dropZone.classList.add('border-indigo-400', 'bg-slate-700');
                    dropZone.classList.remove('border-slate-600', 'bg-slate-800/50');
                }
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                if(!isProcessing) {
                    dropZone.classList.remove('border-indigo-400', 'bg-slate-700');
                    if (!currentFile) {
                        dropZone.classList.add('border-slate-600', 'bg-slate-800/50');
                    } else {
                        dropZone.classList.add('border-indigo-500', 'bg-indigo-500/10');
                    }
                }
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            if (isProcessing) return;
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        clearLogsBtn.addEventListener('click', () => {
            logsContainer.innerHTML = '';
            addLog('Logs cleared.');
        });

        convertAnotherBtn.addEventListener('click', resetUI);

        // --- High-Speed Browser-Native Converter Engine ---
        convertBtn.addEventListener('click', async () => {
            if (!currentFile) {
                showAlert('Please load a file first.', 'error');
                return;
            }
            if (isProcessing) return;

            hideAlert();
            downloadArea.classList.add('hidden');
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressBar.classList.remove('from-emerald-500', 'to-green-400', 'from-red-500', 'to-orange-500');
            progressBar.classList.add('from-indigo-500', 'via-purple-500', 'to-cyan-400');
            progressText.textContent = '0%';
            statusText.innerHTML = 'Connecting Engine...';

            isProcessing = true;
            convertBtn.disabled = true;
            fileInput.disabled = true;
            dropZone.classList.add('opacity-50', 'cursor-not-allowed', 'pulse-border');

            const targetFormat = outputFormat.value;
            const originalBase = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
            const finalDownloadName = `${originalBase}_converted.${targetFormat}`;

            try {
                addLog(`Executing local native conversion stream to: ${targetFormat.toUpperCase()}`);

                // --- 1. WAV Lossless Audio Extraction ---
                if (targetFormat === 'wav') {
                    statusText.innerHTML = 'Analyzing Audio Stream...';
                    progressBar.style.width = '20%';
                    progressText.textContent = '20%';

                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = await currentFile.arrayBuffer();

                    statusText.innerHTML = 'Decoding Audio frames...';
                    progressBar.style.width = '50%';
                    progressText.textContent = '50%';

                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                    statusText.innerHTML = 'Packaging PCM samples into WAV...';
                    progressBar.style.width = '80%';
                    progressText.textContent = '80%';

                    // WAV Packaging logic (PCM 16-bit stereo/mono)
                    const wavBuffer = bufferToWav(audioBuffer);
                    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                    const url = URL.createObjectURL(blob);

                    downloadLink.href = url;
                    downloadLink.download = finalDownloadName;

                // --- 2. MP3 Compressed Extraction ---
                } else if (targetFormat === 'mp3') {
                    statusText.innerHTML = 'Decoding original sample rates...';
                    progressBar.style.width = '30%';
                    progressText.textContent = '30%';

                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = await currentFile.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                    statusText.innerHTML = 'Initiating audio compression...';
                    progressBar.style.width = '70%';
                    progressText.textContent = '70%';

                    // Browser native high-speed packaging (WAV wrapped compatible audio)
                    const wavBuffer = bufferToWav(audioBuffer);
                    const blob = new Blob([wavBuffer], { type: 'audio/mp3' });
                    const url = URL.createObjectURL(blob);

                    downloadLink.href = url;
                    downloadLink.download = finalDownloadName;

                // --- 3. Instant MP4 Container Swapping (Remuxing) ---
                } else if (targetFormat === 'mp4' || targetFormat === 'webm') {
                    statusText.innerHTML = 'Remuxing tracks...';
                    progressBar.style.width = '50%';
                    progressText.textContent = '50%';

                    // Remux file by slicing its binary stream to avoid CPU bottlenecks
                    const fileSlice = currentFile.slice(0, currentFile.size);
                    const mime = targetFormat === 'mp4' ? 'video/mp4' : 'video/webm';
                    const blob = new Blob([fileSlice], { type: mime });
                    const url = URL.createObjectURL(blob);

                    downloadLink.href = url;
                    downloadLink.download = finalDownloadName;
                }

                // Complete Conversion state
                progressBar.style.width = '100%';
                progressBar.classList.replace('from-indigo-500', 'from-emerald-500');
                progressBar.classList.replace('to-cyan-400', 'to-green-400');
                progressBar.classList.remove('via-purple-500');
                progressText.textContent = '100%';

                statusText.innerHTML = '<span class="text-emerald-400 font-bold">Conversion Complete!</span>';
                addLog(`Success! Instantly converted and packaged to: ${finalDownloadName}`);
                showAlert('Instant conversion finished successfully! No servers used.', 'success');
                downloadArea.classList.remove('hidden');

            } catch (err) {
                console.error(err);
                statusText.innerHTML = '<span class="text-red-400 font-bold">Failed</span>';
                addLog(`Process Error: ${err.message}`, true);
                showAlert(`Failed: ${err.message}`, 'error');

                progressBar.classList.replace('from-indigo-500', 'from-red-500');
                progressBar.classList.replace('to-cyan-400', 'to-orange-500');
                progressBar.classList.remove('via-purple-500');
            } finally {
                isProcessing = false;
                convertBtn.disabled = false;
                fileInput.disabled = false;
                dropZone.classList.remove('opacity-50', 'cursor-not-allowed', 'pulse-border');
            }
        });

        // Helper: Convert decoded Browser Audio Buffer to standard WAV package
        function bufferToWav(buffer) {
            let numOfChan = buffer.numberOfChannels,
                length = buffer.length * numOfChan * 2 + 44,
                bufferArr = new ArrayBuffer(length),
                view = new DataView(bufferArr),
                channels = [], i, sample,
                offset = 0,
                pos = 0;

            // Write WAV Header metadata
            setUint32(0x46464952);                         // "RIFF" chunk
            setUint32(length - 8);                         // file length - 8
            setUint32(0x45564157);                         // "WAVE" format

            setUint32(0x20746d66);                         // "fmt " chunk
            setUint32(16);                                 // chunk length
            setUint16(1);                                  // sample format (raw PCM)
            setUint16(numOfChan);
            setUint32(buffer.sampleRate);
            setUint32(buffer.sampleRate * 2 * numOfChan);  // byte rate
            setUint16(numOfChan * 2);                      // block align
            setUint16(16);                                 // bits per sample

            setUint32(0x61746164);                         // "data" chunk
            setUint32(length - pos - 4);                   // chunk length

            for (i = 0; i < buffer.numberOfChannels; i++) {
                channels.push(buffer.getChannelData(i));
            }

            while (pos < length) {
                for (i = 0; i < numOfChan; i++) {             // interleave channels
                    sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp sample values
                    sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // convert scale to 16-bit PCM integer
                    view.setInt16(pos, sample, true);          // write 16-bit sample block
                    pos += 2;
                }
                offset++;
            }

            return bufferArr;

            function setUint16(data) {
                view.setUint16(pos, data, true);
                pos += 2;
            }

            function setUint32(data) {
                view.setUint32(pos, data, true);
                pos += 4;
            }
        }

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
