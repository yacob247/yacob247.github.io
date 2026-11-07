   // DOM Elements
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        const activeFileSection = document.getElementById('activeFileSection');
        const fileNameDisp = document.getElementById('fileName');
        const fileSizeDisp = document.getElementById('fileSize');
        const btnRemoveFile = document.getElementById('btnRemoveFile');
        const btnConvert = document.getElementById('btnConvert');
        
        const progressCard = document.getElementById('progressCard');
        const processStatus = document.getElementById('processStatus');
        const overallPercentage = document.getElementById('overallPercentage');
        const progressBar = document.getElementById('progressBar');
        const extractionBadge = document.getElementById('extractionBadge');
        const encodingBadge = document.getElementById('encodingBadge');
        
        const outputCard = document.getElementById('outputCard');
        const outputFileName = document.getElementById('outputFileName');
        const outputFileSize = document.getElementById('outputFileSize');
        const btnPlayOutput = document.getElementById('btnPlayOutput');
        const downloadAnchor = document.getElementById('downloadAnchor');
        const conversionTimeLabel = document.getElementById('conversionTimeLabel');
        const audioPlayerWrapper = document.getElementById('audioPlayerWrapper');
        const audioPlayer = document.getElementById('audioPlayer');

        const bitrateValLabel = document.getElementById('bitrateVal');
        const bitrateBtns = document.querySelectorAll('.bitrate-btn');
        const channelStereo = document.getElementById('channelStereo');
        const channelMono = document.getElementById('channelMono');

        const trimLabel = document.getElementById('trimLabel');
        const trimControls = document.getElementById('trimControls');
        const trimStart = document.getElementById('trimStart');
        const trimEnd = document.getElementById('trimEnd');
        const totalDurationLabel = document.getElementById('totalDurationLabel');

        const historyEmpty = document.getElementById('historyEmpty');
        const historyListWrapper = document.getElementById('historyListWrapper');
        const historyTableBody = document.getElementById('historyTableBody');
        const btnClearHistory = document.getElementById('btnClearHistory');

        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        // State variables
        let selectedFile = null;
        let selectedBitrate = 320; // default 320kbps
        let selectedChannels = 2; // default stereo
        let decodedAudioBuffer = null;
        let exportHistory = [];
        let currentWorker = null;

        // Custom Toast Helper
        function showToast(message, type = 'info') {
            toastMessage.textContent = message;
            
            if (type === 'success') {
                toastIcon.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i>`;
                toast.className = toast.className.replace(/border-[a-z]+/g, '') + ' border-emerald-500';
            } else if (type === 'error') {
                toastIcon.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-400"></i>`;
                toast.className = toast.className.replace(/border-[a-z]+/g, '') + ' border-rose-500';
            } else {
                toastIcon.innerHTML = `<i class="fa-solid fa-circle-info text-violet-400"></i>`;
                toast.className = toast.className.replace(/border-[a-z]+/g, '') + ' border-violet-500';
            }

            // Slide in
            toast.classList.remove('translate-y-24', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            setTimeout(() => {
                toast.classList.add('translate-y-24', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 3500);
        }

        // Dropzone Highlight Events
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('border-violet-500', 'bg-violet-950/15');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('border-violet-500', 'bg-violet-950/15');
            }, false);
        });

        // Handle File Pick
        fileInput.addEventListener('change', handleFileSelect);
        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect();
            }
        });

        function handleFileSelect() {
            const files = fileInput.files;
            if (files.length === 0) return;

            const file = files[0];
            
            // Allow general media tracks
            if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
                showToast('Unsupported file type. Please upload a video or audio file.', 'error');
                return;
            }

            selectedFile = file;

            // Update UI
            fileNameDisp.textContent = file.name;
            fileSizeDisp.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            
            const isVideo = file.type.startsWith('video/');
            document.getElementById('fileIcon').className = isVideo ? 'fa-solid fa-file-video text-xl' : 'fa-solid fa-file-audio text-xl';

            activeFileSection.classList.remove('hidden');
            btnConvert.removeAttribute('disabled');
            
            // Clear prior results
            outputCard.classList.add('hidden');
            progressCard.classList.add('hidden');
            progressBar.style.width = '0%';
            overallPercentage.textContent = '0%';
            
            // Reset state
            decodedAudioBuffer = null;
            trimControls.classList.add('opacity-40', 'pointer-events-none');
            trimLabel.textContent = "Off";
            totalDurationLabel.textContent = "Decoding audio data to load clipping boundaries...";

            showToast('Loading metadata...', 'info');

            // Quick preliminary decode just to get duration for trimming configuration
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const arrayBuffer = e.target.result;
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // OfflineAudioContext is much cleaner for fast background decoding of metadata
                    decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    // Enable Trimming Option
                    const duration = decodedAudioBuffer.duration;
                    trimStart.value = 0;
                    trimEnd.value = duration.toFixed(1);
                    trimStart.max = duration.toFixed(1);
                    trimEnd.max = duration.toFixed(1);
                    
                    trimControls.classList.remove('opacity-40', 'pointer-events-none');
                    trimLabel.textContent = "Ready (" + duration.toFixed(1) + "s max)";
                    totalDurationLabel.textContent = `Total file duration resolved: ${duration.toFixed(2)} seconds. Use parameters below to specify clip boundaries.`;
                    showToast('Media loaded & ready to convert!', 'success');
                } catch (err) {
                    console.error("Audio Decoding Error:", err);
                    totalDurationLabel.textContent = "Unsupported audio track/codec inside this file. Audio could not be indexed.";
                    showToast('Unable to extract audio track. Check if file has active sound stream.', 'error');
                    btnConvert.setAttribute('disabled', 'true');
                }
            };
            reader.readAsArrayBuffer(file);
        }

        // Remove active file
        btnRemoveFile.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFile = null;
            decodedAudioBuffer = null;
            fileInput.value = '';
            activeFileSection.classList.add('hidden');
            btnConvert.setAttribute('disabled', 'true');
            progressCard.classList.add('hidden');
            outputCard.classList.add('hidden');
            trimControls.classList.add('opacity-40', 'pointer-events-none');
            trimLabel.textContent = "Off";
            totalDurationLabel.textContent = "Duration will be automatically calculated when file is loaded.";
        });

        // Config buttons toggling
        bitrateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                bitrateBtns.forEach(b => {
                    b.classList.remove('active', 'border-2', 'border-violet-500', 'bg-violet-600/15', 'text-white');
                    b.classList.add('border-slate-800', 'bg-slate-900/40', 'text-slate-400');
                });
                btn.classList.add('active', 'border-2', 'border-violet-500', 'bg-violet-600/15', 'text-white');
                btn.classList.remove('border-slate-800', 'bg-slate-900/40', 'text-slate-400');
                
                selectedBitrate = parseInt(btn.dataset.bitrate);
                bitrateValLabel.textContent = selectedBitrate + ' kbps';
            });
        });

        channelStereo.addEventListener('click', () => {
            channelStereo.classList.add('active', 'border-2', 'border-violet-500', 'bg-violet-600/15', 'text-white');
            channelStereo.classList.remove('border-slate-800', 'bg-slate-900/40', 'text-slate-400');
            channelMono.classList.remove('active', 'border-2', 'border-violet-500', 'bg-violet-600/15', 'text-white');
            channelMono.classList.add('border-slate-800', 'bg-slate-900/40', 'text-slate-400');
            selectedChannels = 2;
        });

        channelMono.addEventListener('click', () => {
            channelMono.classList.add('active', 'border-2', 'border-violet-500', 'bg-violet-600/15', 'text-white');
            channelMono.classList.remove('border-slate-800', 'bg-slate-900/40', 'text-slate-400');
            channelStereo.classList.remove('active', 'border-2', 'border-violet-500', 'bg-violet-600/15', 'text-white');
            channelStereo.classList.add('border-slate-800', 'bg-slate-900/40', 'text-slate-400');
            selectedChannels = 1;
        });


        // Conversion Trigger
        btnConvert.addEventListener('click', async () => {
            if (!selectedFile || !decodedAudioBuffer) return;

            const startTime = performance.now();
            
            // Set UI to loading/processing state
            progressCard.classList.remove('hidden');
            outputCard.classList.add('hidden');
            audioPlayerWrapper.classList.add('hidden');
            btnConvert.setAttribute('disabled', 'true');
            
            updateStepState('extraction', 'loading', 'Extracting Track...');
            updateStepState('encoding', 'pending', 'Waiting...');

            try {
                // Read Trim inputs
                let trimStartVal = parseFloat(trimStart.value) || 0;
                let trimEndVal = parseFloat(trimEnd.value) || decodedAudioBuffer.duration;
                
                if (trimStartVal < 0) trimStartVal = 0;
                if (trimEndVal > decodedAudioBuffer.duration) trimEndVal = decodedAudioBuffer.duration;
                if (trimStartVal >= trimEndVal) {
                    showToast('Invalid trim range: Start time must be less than End time.', 'error');
                    resetButtons();
                    return;
                }

                // Sub-slice the buffers to extract correct trimmed data
                const originalSampleRate = decodedAudioBuffer.sampleRate;
                const startOffset = Math.floor(trimStartVal * originalSampleRate);
                const endOffset = Math.floor(trimEndVal * originalSampleRate);
                const totalTargetSamples = endOffset - startOffset;

                updateProgressBar(15, 'Extracting channel PCM data...');

                // Left & Right PCM (Float32Array)
                let leftChannel = decodedAudioBuffer.getChannelData(0);
                let rightChannel = decodedAudioBuffer.numberOfChannels > 1 ? decodedAudioBuffer.getChannelData(1) : leftChannel;

                // Slice channels
                let slicedLeft = leftChannel.slice(startOffset, endOffset);
                let slicedRight = rightChannel.slice(startOffset, endOffset);

                updateStepState('extraction', 'success', 'Extracted!');
                updateStepState('encoding', 'loading', 'Encoding MP3...');
                updateProgressBar(30, 'Launching multi-threaded background Web Worker...');

                // Launch Web Worker with LameJS in Blob URL
                const workerCode = `
                    importScripts("https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.all.min.js");

                    function floatTo16BitPCM(float32Array) {
                        const buffer = new Int16Array(float32Array.length);
                        for (let i = 0; i < float32Array.length; i++) {
                            let s = Math.max(-1, Math.min(1, float32Array[i]));
                            buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        return buffer;
                    }

                    self.onmessage = function(e) {
                        const { left, right, sampleRate, bitrate, channels } = e.data;
                        
                        // Convert floats to Int16 values locally in thread
                        const leftInt16 = floatTo16BitPCM(left);
                        const rightInt16 = (channels === 2 && right) ? floatTo16BitPCM(right) : null;
                        
                        // Initialize lame encoder
                        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
                        const mp3Data = [];
                        
                        const sampleBlockSize = 1152;
                        const length = leftInt16.length;
                        
                        if (channels === 2 && rightInt16) {
                            for (let i = 0; i < length; i += sampleBlockSize) {
                                const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
                                const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
                                const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                                if (mp3buf.length > 0) {
                                    mp3Data.push(mp3buf);
                                }
                                
                                if (i % (sampleBlockSize * 15) === 0) {
                                    self.postMessage({ type: 'progress', progress: (i / length) * 100 });
                                }
                            }
                        } else {
                            for (let i = 0; i < length; i += sampleBlockSize) {
                                const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
                                const mp3buf = mp3encoder.encodeBuffer(leftChunk);
                                if (mp3buf.length > 0) {
                                    mp3Data.push(mp3buf);
                                }
                                
                                if (i % (sampleBlockSize * 15) === 0) {
                                    self.postMessage({ type: 'progress', progress: (i / length) * 100 });
                                }
                            }
                        }
                        
                        const mp3buf = mp3encoder.flush();
                        if (mp3buf.length > 0) {
                            mp3Data.push(new Int8Array(mp3buf));
                        }
                        
                        self.postMessage({ type: 'complete', data: mp3Data });
                    };
                `;

                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                currentWorker = new Worker(workerUrl);

                // Send data to worker, transferring float arrays directly to prevent cloning overhead
                currentWorker.postMessage({
                    left: slicedLeft,
                    right: slicedRight,
                    sampleRate: originalSampleRate,
                    bitrate: selectedBitrate,
                    channels: selectedChannels
                }, [slicedLeft.buffer, slicedRight.buffer]);

                currentWorker.onmessage = function(e) {
                    const message = e.data;
                    if (message.type === 'progress') {
                        // Keep within progress limits (30% to 95%)
                        const renderProg = Math.min(95, 30 + (message.progress * 0.65));
                        updateProgressBar(renderProg, `Converting frames: ${Math.round(message.progress)}% completed...`);
                    } else if (message.type === 'complete') {
                        updateProgressBar(100, 'Finishing up file packaging...');
                        updateStepState('encoding', 'success', 'Completed!');

                        const mp3Blob = new Blob(message.data, { type: 'audio/mp3' });
                        const outputUrl = URL.createObjectURL(mp3Blob);
                        
                        const durationSec = (performance.now() - startTime) / 1000;
                        conversionTimeLabel.textContent = `Completed in ${durationSec.toFixed(2)}s`;

                        // Display output details
                        const convertedName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) + '_audio.mp3';
                        outputFileName.textContent = convertedName;
                        outputFileSize.textContent = (mp3Blob.size / (1024 * 1024)).toFixed(2) + ' MB';
                        
                        // Set up links
                        downloadAnchor.href = outputUrl;
                        downloadAnchor.download = convertedName;
                        
                        audioPlayer.src = outputUrl;

                        // Slide Card Open
                        outputCard.classList.remove('hidden');
                        showToast('MP3 generated successfully!', 'success');
                        
                        // Add to history list
                        const durationPretty = `${Math.floor(totalTargetSamples / originalSampleRate / 60)}m ${(Math.floor(totalTargetSamples / originalSampleRate) % 60)}s`;
                        addToHistory(convertedName, selectedBitrate, durationPretty, (mp3Blob.size / (1024 * 1024)).toFixed(2) + ' MB', outputUrl);

                        resetButtons();
                        currentWorker.terminate();
                    }
                };

            } catch (error) {
                console.error("Conversion Thread Fail:", error);
                showToast('Conversion process failed. Try refreshing and uploading again.', 'error');
                resetButtons();
            }
        });

        // Reset states
        function resetButtons() {
            btnConvert.removeAttribute('disabled');
        }

        // Toggle Output Preview Player
        btnPlayOutput.addEventListener('click', () => {
            audioPlayerWrapper.classList.toggle('hidden');
            if (!audioPlayerWrapper.classList.contains('hidden')) {
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
        });

        // History Management
        function addToHistory(name, bitrate, length, size, url) {
            const entry = { id: Date.now(), name, bitrate, length, size, url };
            exportHistory.unshift(entry);
            renderHistory();
        }

        function renderHistory() {
            if (exportHistory.length === 0) {
                historyEmpty.classList.remove('hidden');
                historyListWrapper.classList.add('hidden');
                return;
            }

            historyEmpty.classList.add('hidden');
            historyListWrapper.classList.remove('hidden');
            
            historyTableBody.innerHTML = '';
            exportHistory.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-white/5 hover:bg-slate-900/40 transition-colors';
                tr.innerHTML = `
                    <td class="py-3 px-4 font-semibold text-slate-200 truncate max-w-[200px] md:max-w-xs">${item.name}</td>
                    <td class="py-3 px-4 font-mono text-xs"><span class="px-2 py-0.5 rounded bg-violet-600/10 text-violet-400 border border-violet-500/10">${item.bitrate}k</span></td>
                    <td class="py-3 px-4 text-xs text-slate-400">${item.length}</td>
                    <td class="py-3 px-4 text-xs text-slate-400">${item.size}</td>
                    <td class="py-3 px-4 text-right space-x-2">
                        <button onclick="playHistoryItem('${item.url}')" class="p-1.5 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white rounded transition-colors text-xs" title="Play">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <a href="${item.url}" download="${item.name}" class="inline-flex p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded transition-colors text-xs" title="Download">
                            <i class="fa-solid fa-download"></i>
                        </a>
                        <button onclick="deleteHistoryItem(${item.id})" class="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded transition-colors text-xs" title="Remove">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                `;
                historyTableBody.appendChild(tr);
            });
        }

        window.playHistoryItem = function(url) {
            audioPlayer.src = url;
            audioPlayerWrapper.classList.remove('hidden');
            audioPlayer.play();
            // Scroll smoothly to output preview
            outputCard.scrollIntoView({ behavior: 'smooth' });
        };

        window.deleteHistoryItem = function(id) {
            exportHistory = exportHistory.filter(item => item.id !== id);
            renderHistory();
            showToast('Item deleted from studio history.', 'info');
        };

        btnClearHistory.addEventListener('click', () => {
            exportHistory = [];
            renderHistory();
            showToast('All conversions cleared.', 'info');
        });

        // Step/Progress helpers
        function updateProgressBar(percent, text) {
            progressBar.style.width = percent + '%';
            overallPercentage.textContent = Math.round(percent) + '%';
            processStatus.textContent = text;
        }

        function updateStepState(step, state, label) {
            const el = step === 'extraction' ? extractionBadge : encodingBadge;
            if (state === 'pending') {
                el.className = "flex items-center gap-1.5 text-slate-500";
                el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> ${label}`;
            } else if (state === 'loading') {
                el.className = "flex items-center gap-1.5 text-amber-400 font-semibold";
                el.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i> ${label}`;
            } else if (state === 'success') {
                el.className = "flex items-center gap-1.5 text-emerald-400 font-bold animate-pulse";
                el.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${label}`;
            }
        }


/* --- extracted inline scripts --- */
(function() {function signalGooglefcPresent() {if (!window.frames['googlefcPresent']) {if (document.body) {const iframe = document.createElement('iframe'); iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;'; iframe.style.display = 'none'; iframe.name = 'googlefcPresent'; document.body.appendChild(iframe);} else {setTimeout(signalGooglefcPresent, 0);}}}signalGooglefcPresent();})();

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
