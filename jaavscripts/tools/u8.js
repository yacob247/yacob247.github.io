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

// System Constants
    const NYQUIST = 22050; // typical max frequency standard mapping

    // Core Application State
    let originalFile = null;
    let wavesurfer = null;
    let isPlaying = false;
    let zoomLevel = 1.0;

    // History stack (Visual regions arrays)
    let regionsHistory = [[]];
    let historyIndex = 0;

    // Selection State
    let selectedRegionIds = []; // Holds selected region IDs (Multi-selection enabled)

    // Drawing, Dragging and Resizing variables
    let isDrawing = false;
    let isDragging = false;
    let isResizing = false;
    let activeDragRegionId = null;
    let resizeDirection = null; // 'nw', 'ne', 'se', 'sw'
    let startX = 0;
    let startY = 0;
    let dragStartX = 0;
    let dragStartY = 0;
    let activeRegionEl = null;

    // Web Audio Node Cache for Live Preview (Real-time Filter Cascade)
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;
    let activeFilters = [];

    // Color Map generation for Spectrogram Plugin (Magma Heat palette)
    function generateColormap() {
      const cmap = [];
      for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const r = Math.min(255, Math.max(0, Math.round(255 * (3 * t - 0.1))));
        const g = Math.min(255, Math.max(0, Math.round(255 * (3 * t - 1.1))));
        const b = Math.min(255, Math.max(0, Math.round(255 * (1.2 * t + 0.2 - 2 * t * t))));
        cmap.push([r / 255, g / 255, b / 255, 1]);
      }
      return cmap;
    }

    // UI Elements Selection
    const uploadState = document.getElementById('upload-state');
    const interactiveState = document.getElementById('interactive-state');
    const audioFileInput = document.getElementById('audio-file-input');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const fileNameBadge = document.getElementById('file-name-badge');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playIcon = document.getElementById('play-icon');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');
    const playbackSpeedSelect = document.getElementById('playback-speed'); // Speed Select Element
    const zoomContainer = document.getElementById('zoom-container');
    const scrollContainer = document.getElementById('scroll-container');
    const drawingOverlay = document.getElementById('drawing-overlay');
    const btnProcessAudio = document.getElementById('btn-process-audio');
    const processingState = document.getElementById('processing-state');
    const resultState = document.getElementById('result-state');
    const btnDownloadLink = document.getElementById('btn-download-link');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnClear = document.getElementById('btn-clear');
    const btnRestart = document.getElementById('btn-restart');
    const btnAutoDetect = document.getElementById('btn-auto-detect'); // Auto-Detect Button
    const currentPlaybackTime = document.getElementById('current-playback-time');
    const totalPlaybackDuration = document.getElementById('total-playback-duration');
    const progressPercent = document.getElementById('progress-percent');
    const progressBarFill = document.getElementById('progress-bar-fill');

    // Inspector Elements
    const inspectorActive = document.getElementById('inspector-active');
    const inspectorEmpty = document.getElementById('inspector-empty');
    const sliderGain = document.getElementById('slider-gain');
    const labelGain = document.getElementById('label-gain');
    const sliderQ = document.getElementById('slider-q');
    const labelQ = document.getElementById('label-q');
    const sliderFreq = document.getElementById('slider-freq');
    const labelFreq = document.getElementById('label-freq');
    const btnDeselect = document.getElementById('btn-deselect');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    const metaSelectedCount = document.getElementById('meta-selected-count');
    const metaTotalCount = document.getElementById('meta-total-count');

    // Tooltip UI Elements
    const tooltip = document.getElementById('spectral-tooltip');
    const tooltipTime = document.getElementById('tooltip-time');
    const tooltipFreq = document.getElementById('tooltip-freq');
    const tooltipSelection = document.getElementById('tooltip-selection');
    const tooltipBand = document.getElementById('tooltip-band');

    // Init Lucide Web Icons on load
    document.addEventListener("DOMContentLoaded", () => {
      lucide.createIcons();
    });

    // Handle Upload / File Change
    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        originalFile = file;
        fileNameBadge.textContent = file.name;
        uploadState.classList.add('hidden');
        interactiveState.classList.remove('hidden');
        errorContainer.classList.add('hidden');

        // Reset state
        regionsHistory = [[]];
        historyIndex = 0;
        selectedRegionIds = [];
        playbackSpeedSelect.value = "1";
        updateUndoRedoButtons();
        syncInspector();

        const fileUrl = URL.createObjectURL(file);
        initWaveSurfer(fileUrl);
      }
    });

    // Start over helper
    btnRestart.addEventListener('click', () => {
      destroyWaveSurfer();
      uploadState.classList.remove('hidden');
      interactiveState.classList.add('hidden');
      resultState.classList.add('hidden');
      processingState.classList.add('hidden');
      audioFileInput.value = '';
      originalFile = null;
    });

    // WaveSurfer initialization
    function initWaveSurfer(audioUrl) {
      destroyWaveSurfer();

      // Create new WaveSurfer instance
      wavesurfer = WaveSurfer.create({
        container: '#waveform-viewport',
        waveColor: '#4f46e5',
        progressColor: '#818cf8',
        cursorColor: '#c7d2fe',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 60,
        plugins: [
          WaveSurfer.Spectrogram.create({
            container: '#spectrogram-viewport',
            labels: true,
            height: 350, // Increased height for better vertical detail
            fftSamples: 2048, // Increased FFT resolution for sharper frequency breakdown
            labelsBackground: 'rgba(0, 0, 0, 0.7)',
            labelsColor: '#a3a3a3',
            frequencyMax: NYQUIST,
            colorMap: generateColormap()
          })
        ]
      });

      wavesurfer.on('ready', () => {
        const duration = formatTime(wavesurfer.getDuration());
        totalPlaybackDuration.textContent = `/ ${duration}`;
        currentPlaybackTime.textContent = '0:00.00';

        // Audio Node setup for live preview filters
        try {
          const media = wavesurfer.getMediaElement();
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          sourceNode = audioCtx.createMediaElementSource(media);
          gainNode = audioCtx.createGain();

          sourceNode.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          updateLivePreviewFilters();
        } catch (err) {
          console.warn("Could not bind Web Audio preview context: ", err);
        }
      });

      wavesurfer.on('play', () => {
        isPlaying = true;
        playIcon.setAttribute('data-lucide', 'pause');
        lucide.createIcons();
      });

      wavesurfer.on('pause', () => {
        isPlaying = false;
        playIcon.setAttribute('data-lucide', 'play');
        lucide.createIcons();
      });

      wavesurfer.on('finish', () => {
        isPlaying = false;
        playIcon.setAttribute('data-lucide', 'play');
        lucide.createIcons();
      });

      wavesurfer.on('timeupdate', (time) => {
        currentPlaybackTime.textContent = formatTime(time);

        if (scrollContainer) {
          const duration = wavesurfer.getDuration();
          if (duration > 0) {
            const progress = time / duration;
            const contentWidth = scrollContainer.scrollWidth;
            const viewportWidth = scrollContainer.clientWidth;
            const targetScrollLeft = (progress * contentWidth) - (viewportWidth / 2);
            if (Math.abs(scrollContainer.scrollLeft - targetScrollLeft) > viewportWidth * 0.4) {
              scrollContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            }
          }
        }
        updateFilterGains(time);
      });

      wavesurfer.load(audioUrl);
    }

    function destroyWaveSurfer() {
      if (wavesurfer) {
        wavesurfer.destroy();
        wavesurfer = null;
      }
      if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
        sourceNode = null;
        gainNode = null;
        activeFilters = [];
      }
      drawingOverlay.innerHTML = '';
    }

    // Playback Speed Adjustment Event Listener
    playbackSpeedSelect.addEventListener('change', (e) => {
      if (wavesurfer) {
        wavesurfer.setPlaybackRate(parseFloat(e.target.value));
      }
    });

    // 1fps Auto-Detect Vocal Regions (Beta Feature)
    btnAutoDetect.addEventListener('click', async () => {
      if (!originalFile || !wavesurfer) return;
      const duration = wavesurfer.getDuration();
      if (duration === 0) return;

      const originalHtml = btnAutoDetect.innerHTML;
      btnAutoDetect.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Scanning...';
      btnAutoDetect.disabled = true;
      lucide.createIcons();

      try {
        const arrayBuffer = await originalFile.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1650; 
        filter.Q.value = 0.5;

        source.connect(filter);
        filter.connect(offlineCtx.destination);
        source.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        const channelData = renderedBuffer.getChannelData(0);

        const fps = 1; 
        const frameSamples = renderedBuffer.sampleRate / fps;
        const numFrames = Math.floor(channelData.length / frameSamples);

        let totalEnergy = 0;
        const frameEnergies = [];

        for (let i = 0; i < numFrames; i++) {
          let energy = 0;
          const start = i * frameSamples;
          for (let j = 0; j < frameSamples; j += 10) {
            energy += Math.abs(channelData[start + j]);
          }
          frameEnergies.push(energy);
          totalEnergy += energy;
        }

        const avgEnergy = totalEnergy / numFrames;
        const threshold = avgEnergy * 1.5; 

        const vocalMinFreq = 300;
        const vocalMaxFreq = 3000;
        const startY = 1 - (vocalMaxFreq / NYQUIST);
        const height = (vocalMaxFreq - vocalMinFreq) / NYQUIST;

        let newRegions = [...getCurrentRegions()];

        for (let i = 0; i < numFrames; i++) {
          if (frameEnergies[i] > threshold) {
            const frameStartTime = i / fps;
            const startX = frameStartTime / duration;
            const width = (1 / fps) / duration;

            if (startX + width <= 1) {
              newRegions.push({
                id: Math.random().toString(36).substring(7),
                startX: startX,
                startY: startY,
                width: width,
                height: height,
                gain: -60, // Custom default gain
                q: 5.0     // Custom default Q factor
              });
            }
          }
        }

        if (newRegions.length > getCurrentRegions().length) {
          pushRegionsHistory(newRegions);
        }

      } catch (err) {
        console.error("Auto-detect logic failed:", err);
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = 'Auto-detect failed. Audio too large or incompatible.';
      } finally {
        btnAutoDetect.innerHTML = originalHtml;
        btnAutoDetect.disabled = false;
        lucide.createIcons();
      }
    });

    // Interactive Drawing/Dragging/Resizing Overlay Handlers
    drawingOverlay.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const rect = drawingOverlay.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      const clickY = (e.clientY - rect.top) / rect.height;

      // Check if clicked inside or on borders of existing regions
      const regions = getCurrentRegions();
      let clickedRegion = null;
      let targetDirection = null;

      // Scan reverse order to select top-most drawn item first
      for (let i = regions.length - 1; i >= 0; i--) {
        const r = regions[i];
        const insideX = clickX >= r.startX && clickX <= r.startX + r.width;
        const insideY = clickY >= r.startY && clickY <= r.startY + r.height;

        if (insideX && insideY) {
          clickedRegion = r;

          // Check corner-resize handle closeness (5% threshold boundary)
          const pxThresholdX = 12 / rect.width;
          const pxThresholdY = 12 / rect.height;
          const nearLeft = Math.abs(clickX - r.startX) < pxThresholdX;
          const nearRight = Math.abs(clickX - (r.startX + r.width)) < pxThresholdX;
          const nearTop = Math.abs(clickY - r.startY) < pxThresholdY;
          const nearBottom = Math.abs(clickY - (r.startY + r.height)) < pxThresholdY;

          if (nearTop && nearLeft) targetDirection = 'nw';
          else if (nearTop && nearRight) targetDirection = 'ne';
          else if (nearBottom && nearLeft) targetDirection = 'sw';
          else if (nearBottom && nearRight) targetDirection = 'se';
          break;
        }
      }

      if (clickedRegion) {
        if (targetDirection) {
          // Resize state
          isResizing = true;
          activeDragRegionId = clickedRegion.id;
          resizeDirection = targetDirection;
          dragStartX = clickX;
          dragStartY = clickY;
        } else {
          // Drag position state
          isDragging = true;
          activeDragRegionId = clickedRegion.id;
          dragStartX = clickX - clickedRegion.startX;
          dragStartY = clickY - clickedRegion.startY;
        }

        // Multi-select key handle
        if (e.shiftKey) {
          if (selectedRegionIds.includes(clickedRegion.id)) {
            selectedRegionIds = selectedRegionIds.filter(id => id !== clickedRegion.id);
          } else {
            selectedRegionIds.push(clickedRegion.id);
          }
        } else {
          selectedRegionIds = [clickedRegion.id];
        }
        renderStoredRegions();
        syncInspector();
      } else {
        // Normal Canvas drawing initiation
        isDrawing = true;
        startX = clickX;
        startY = clickY;

        // Remove selections if clicking empty spectrum space (unless holding Shift)
        if (!e.shiftKey) {
          selectedRegionIds = [];
          renderStoredRegions();
          syncInspector();
        }

        activeRegionEl = document.createElement('div');
        activeRegionEl.className = 'absolute border-2 border-indigo-400 bg-indigo-500/20 shadow-lg';
        activeRegionEl.style.left = `${startX * 100}%`;
        activeRegionEl.style.top = `${startY * 100}%`;
        activeRegionEl.style.width = '0%';
        activeRegionEl.style.height = '0%';
        drawingOverlay.appendChild(activeRegionEl);
      }
    });

    drawingOverlay.addEventListener('mousemove', (e) => {
      const rect = drawingOverlay.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;

      // Real-time Tooltip Tracking Logic (Always runs on hover)
      if (wavesurfer && wavesurfer.getDuration() > 0) {
        tooltip.classList.remove('hidden');

        const clampedX = Math.max(0, Math.min(1, currentX));
        const clampedY = Math.max(0, Math.min(1, currentY));
        const time = clampedX * wavesurfer.getDuration();
        const freq = (1 - clampedY) * NYQUIST;

        tooltipTime.textContent = time.toFixed(3) + 's';
        tooltipFreq.textContent = Math.round(freq) + ' Hz';

        tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
        tooltip.style.top = (e.clientY - rect.top + 15) + 'px';

        if (isDrawing) {
           let y1 = startY;
           let y2 = currentY;
           let maxFreq = (1 - Math.min(y1, y2)) * NYQUIST;
           let minFreq = (1 - Math.max(y1, y2)) * NYQUIST;
           tooltipSelection.classList.remove('hidden');
           tooltipBand.textContent = `${Math.round(minFreq)} Hz - ${Math.round(maxFreq)} Hz`;
        } else {
           tooltipSelection.classList.add('hidden');
        }
      }

      if (isDrawing && activeRegionEl) {
        let displayX = startX;
        let displayY = startY;
        let width = currentX - startX;
        let height = currentY - startY;

        if (width < 0) { displayX = currentX; width = Math.abs(width); }
        if (height < 0) { displayY = currentY; height = Math.abs(height); }

        displayX = Math.max(0, Math.min(1, displayX));
        displayY = Math.max(0, Math.min(1, displayY));
        width = Math.min(1 - displayX, width);
        height = Math.min(1 - displayY, height);

        activeRegionEl.style.left = `${displayX * 100}%`;
        activeRegionEl.style.top = `${displayY * 100}%`;
        activeRegionEl.style.width = `${width * 100}%`;
        activeRegionEl.style.height = `${height * 100}%`;
        return;
      }

      if (isDragging && activeDragRegionId) {
        const regions = getCurrentRegions();
        const updated = regions.map(r => {
          if (r.id === activeDragRegionId) {
            let newX = currentX - dragStartX;
            let newY = currentY - dragStartY;

            // Boundary constraints mapping
            newX = Math.max(0, Math.min(1 - r.width, newX));
            newY = Math.max(0, Math.min(1 - r.height, newY));

            return { ...r, startX: newX, startY: newY };
          }
          return r;
        });

        // Dynamic push to history & immediately update audio nodes as they drag
        replaceCurrentRegionsState(updated);
        renderStoredRegions();
        syncInspector();
        updateLivePreviewFilters();
        return;
      }

      if (isResizing && activeDragRegionId) {
        const regions = getCurrentRegions();
        const updated = regions.map(r => {
          if (r.id === activeDragRegionId) {
            let startX = r.startX;
            let startY = r.startY;
            let endX = r.startX + r.width;
            let endY = r.startY + r.height;

            if (resizeDirection.includes('w')) startX = Math.max(0, Math.min(endX - 0.01, currentX));
            if (resizeDirection.includes('e')) endX = Math.max(startX + 0.01, Math.min(1, currentX));
            if (resizeDirection.includes('n')) startY = Math.max(0, Math.min(endY - 0.01, currentY));
            if (resizeDirection.includes('s')) endY = Math.max(startY + 0.01, Math.min(1, currentY));

            return {
              ...r,
              startX: startX,
              startY: startY,
              width: endX - startX,
              height: endY - startY
            };
          }
          return r;
        });

        replaceCurrentRegionsState(updated);
        renderStoredRegions();
        syncInspector();
        updateLivePreviewFilters();
        return;
      }
    });

    drawingOverlay.addEventListener('mouseup', (e) => {
      if (isDrawing) {
        isDrawing = false;
        const rect = drawingOverlay.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        let finalX = Math.min(startX, currentX);
        let finalY = Math.min(startY, currentY);
        let width = Math.abs(currentX - startX);
        let height = Math.abs(currentY - startY);

        if (width > 0.005 && height > 0.005) {
          const newRegion = {
            id: Math.random().toString(36).substring(7),
            startX: finalX,
            startY: finalY,
            width: width,
            height: height,
            gain: -60, // default -60dB attenuation cut
            q: 5.0     // default surgical quality factor
          };
          pushRegionsHistory([...getCurrentRegions(), newRegion]);
          selectedRegionIds = [newRegion.id];
          renderStoredRegions();
          syncInspector();
        } else {
          if (activeRegionEl) activeRegionEl.remove();
        }
        activeRegionEl = null;
      }

      isDragging = false;
      isResizing = false;
      activeDragRegionId = null;
      resizeDirection = null;
    });

    drawingOverlay.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden'); 
      if (isDrawing) {
        isDrawing = false;
        if (activeRegionEl) activeRegionEl.remove();
        activeRegionEl = null;
      }
      isDragging = false;
      isResizing = false;
      activeDragRegionId = null;
    });

    // History & State Control Stack
    function getCurrentRegions() {
      return regionsHistory[historyIndex] || [];
    }

    function pushRegionsHistory(newRegions) {
      const updatedHistory = regionsHistory.slice(0, historyIndex + 1);
      updatedHistory.push(newRegions);
      regionsHistory = updatedHistory;
      historyIndex = regionsHistory.length - 1;

      renderStoredRegions();
      updateUndoRedoButtons();
      updateLivePreviewFilters();
    }

    // Directly updates current history state index when dragging/resizing for high performance
    function replaceCurrentRegionsState(updatedRegions) {
      regionsHistory[historyIndex] = updatedRegions;
    }

    function renderStoredRegions() {
      drawingOverlay.innerHTML = '';
      const current = getCurrentRegions();

      current.forEach(r => {
        const isSelected = selectedRegionIds.includes(r.id);
        const rEl = document.createElement('div');

        rEl.className = `absolute border-2 rounded ${
          isSelected 
            ? 'selected-region border-indigo-400 bg-indigo-500/25 z-20' 
            : 'border-red-500 bg-red-500/15'
        } cursor-move flex items-center justify-center`;

        rEl.style.left = `${r.startX * 100}%`;
        rEl.style.top = `${r.startY * 100}%`;
        rEl.style.width = `${r.width * 100}%`;
        rEl.style.height = `${r.height * 100}%`;

        // Add corner resize indicator visual guides
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const cornerStyles = {
          'top-left': 'top-0 left-0 cursor-nwse-resize',
          'top-right': 'top-0 right-0 cursor-nesw-resize',
          'bottom-left': 'bottom-0 left-0 cursor-nesw-resize',
          'bottom-right': 'bottom-0 right-0 cursor-nwse-resize'
        };

        corners.forEach(c => {
          const handle = document.createElement('div');
          handle.className = `absolute w-2 h-2 bg-white border border-neutral-900 rounded-full opacity-0 group-hover:opacity-100 ${cornerStyles[c]}`;
          rEl.appendChild(handle);
        });

        const dBadge = document.createElement('div');
        dBadge.className = 'absolute bottom-1 bg-neutral-900 text-red-400 text-[9px] py-0.5 px-1 rounded border border-red-500/30 opacity-0 hover:opacity-100 transition-opacity font-bold cursor-pointer';
        dBadge.innerHTML = 'Remove';
        dBadge.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const filtered = getCurrentRegions().filter(item => item.id !== r.id);
          selectedRegionIds = selectedRegionIds.filter(id => id !== r.id);
          pushRegionsHistory(filtered);
          syncInspector();
        });
        rEl.appendChild(dBadge);

        drawingOverlay.appendChild(rEl);
      });

      // Update counters
      metaSelectedCount.textContent = selectedRegionIds.length;
      metaTotalCount.textContent = current.length;

      if (current.length > 0) {
        btnClear.classList.remove('hidden');
        btnProcessAudio.removeAttribute('disabled');
      } else {
        btnClear.classList.add('hidden');
        btnProcessAudio.setAttribute('disabled', 'true');
      }
    }

    // Inspector Synchronization Logic
    function syncInspector() {
      if (selectedRegionIds.length === 1) {
        const regions = getCurrentRegions();
        const active = regions.find(r => r.id === selectedRegionIds[0]);

        if (active) {
          inspectorActive.classList.remove('hidden');
          inspectorEmpty.classList.add('hidden');

          sliderGain.value = active.gain !== undefined ? active.gain : -60;
          labelGain.textContent = `${sliderGain.value} dB`;

          sliderQ.value = active.q !== undefined ? active.q : 5.0;
          labelQ.textContent = parseFloat(sliderQ.value).toFixed(1);

          // Map vertical Y coords to exact Hz
          const maxFreq = (1 - active.startY) * NYQUIST;
          const minFreq = (1 - (active.startY + active.height)) * NYQUIST;
          const centerFreq = Math.round((minFreq + maxFreq) / 2);

          sliderFreq.value = centerFreq;
          labelFreq.textContent = `${centerFreq} Hz`;
          return;
        }
      }

      // No select or multi select state active
      inspectorActive.classList.add('hidden');
      inspectorEmpty.classList.remove('hidden');
    }

    // Real-Time Slider Editing Logic & Immediate Web Audio Feedback Loop
    sliderGain.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      labelGain.textContent = `${val} dB`;
      updateSelectedRegionParameter('gain', val);
    });

    sliderQ.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      labelQ.textContent = val.toFixed(1);
      updateSelectedRegionParameter('q', val);
    });

    sliderFreq.addEventListener('input', (e) => {
      const targetCenter = parseInt(e.target.value);
      labelFreq.textContent = `${targetCenter} Hz`;

      // Keep height intact, move center frequency to new box bounds
      const regions = getCurrentRegions();
      const active = regions.find(r => r.id === selectedRegionIds[0]);
      if (active) {
        const bandwidth = active.height * NYQUIST;
        const newMinFreq = targetCenter - (bandwidth / 2);
        const newMaxFreq = targetCenter + (bandwidth / 2);

        let newStartY = 1 - (newMaxFreq / NYQUIST);
        let newHeight = (newMaxFreq - newMinFreq) / NYQUIST;

        // Constraints clamp bounds
        if (newStartY < 0) newStartY = 0;
        if (newStartY + newHeight > 1) newHeight = 1 - newStartY;

        const updated = regions.map(r => {
          if (r.id === active.id) {
            return { ...r, startY: newStartY, height: newHeight };
          }
          return r;
        });

        replaceCurrentRegionsState(updated);
        renderStoredRegions();
        updateLivePreviewFilters();
      }
    });

    function updateSelectedRegionParameter(key, value) {
      if (selectedRegionIds.length === 1) {
        const regions = getCurrentRegions();
        const updated = regions.map(r => {
          if (r.id === selectedRegionIds[0]) {
            return { ...r, [key]: value };
          }
          return r;
        });
        replaceCurrentRegionsState(updated);
        updateLivePreviewFilters();
      }
    }

    btnDeselect.addEventListener('click', () => {
      selectedRegionIds = [];
      renderStoredRegions();
      syncInspector();
    });

    btnDeleteSelected.addEventListener('click', () => {
      if (selectedRegionIds.length > 0) {
        const filtered = getCurrentRegions().filter(r => !selectedRegionIds.includes(r.id));
        selectedRegionIds = [];
        pushRegionsHistory(filtered);
        syncInspector();
      }
    });

    btnUndo.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        selectedRegionIds = [];
        renderStoredRegions();
        updateUndoRedoButtons();
        syncInspector();
        updateLivePreviewFilters();
      }
    });

    btnRedo.addEventListener('click', () => {
      if (historyIndex < regionsHistory.length - 1) {
        historyIndex++;
        selectedRegionIds = [];
        renderStoredRegions();
        updateUndoRedoButtons();
        syncInspector();
        updateLivePreviewFilters();
      }
    });

    btnClear.addEventListener('click', () => {
      selectedRegionIds = [];
      pushRegionsHistory([]);
      syncInspector();
    });

    function updateUndoRedoButtons() {
      btnUndo.disabled = historyIndex === 0;
      btnRedo.disabled = historyIndex === regionsHistory.length - 1;
    }

    // Zooming mechanics
    zoomSlider.addEventListener('input', (e) => {
      zoomLevel = parseFloat(e.target.value);
      zoomValue.textContent = `${zoomLevel.toFixed(1)}x`;
      zoomContainer.style.width = `${zoomLevel * 100}%`;
      if (wavesurfer) {
        wavesurfer.zoom(zoomLevel * 10);
      }
    });

    // Real-Time Preview Live Filter Setup
    function updateLivePreviewFilters() {
      if (!audioCtx || !sourceNode || !gainNode) return;

      sourceNode.disconnect();
      activeFilters.forEach(f => f.filter.disconnect()); // Bug fixed here: targeted .filter child node disconnect
      activeFilters = [];

      let lastNode = sourceNode;
      const current = getCurrentRegions();

      current.forEach(region => {
        const maxFreq = (1 - region.startY) * NYQUIST;
        const minFreq = (1 - (region.startY + region.height)) * NYQUIST;
        const centerFreq = Math.max(50, (minFreq + maxFreq) / 2);

        // Use user-defined Q factor or calculate dynamic fallback
        const customQ = region.q !== undefined ? region.q : 5.0;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = centerFreq;
        filter.Q.value = customQ;
        filter.gain.value = 0; // Starts clean, gains applied inside playhead active window frame

        lastNode.connect(filter);
        lastNode = filter;
        activeFilters.push({
          filter: filter,
          region: region
        });
      });

      lastNode.connect(gainNode);
    }

    function updateFilterGains(currentTime) {
      if (!audioCtx || activeFilters.length === 0) return;
      const duration = wavesurfer.getDuration();
      if (duration <= 0) return;
      const now = audioCtx.currentTime;

      activeFilters.forEach(({ filter, region }) => {
        const startTime = region.startX * duration;
        const endTime = (region.startX + region.width) * duration;
        const targetGain = region.gain !== undefined ? region.gain : -60;

        if (currentTime >= startTime && currentTime <= endTime) {
          filter.gain.setTargetAtTime(targetGain, now, 0.01);
        } else {
          filter.gain.setTargetAtTime(0, now, 0.01);
        }
      });
    }

    btnPlayPause.addEventListener('click', () => {
      if (wavesurfer) {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        wavesurfer.playPause();
      }
    });

    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 100);
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    // AUDIO RENDERING ENGINE: Local Web Audio Offline Rendering Loop
    btnProcessAudio.addEventListener('click', async () => {
      if (!originalFile || !wavesurfer) return;

      document.getElementById('action-wrapper').classList.add('hidden');
      processingState.classList.remove('hidden');
      resultState.classList.add('hidden');
      progressBarFill.style.width = '10%';
      progressPercent.textContent = '10%';

      try {
        const duration = wavesurfer.getDuration();
        const currentRegions = getCurrentRegions();

        const logicalRegions = currentRegions.map(r => {
          const startTime = r.startX * duration;
          const endTime = (r.startX + r.width) * duration;
          const maxFreq = (1 - r.startY) * NYQUIST;
          const minFreq = (1 - (r.startY + r.height)) * NYQUIST;
          return {
            startTime, 
            endTime, 
            minFreq: Math.max(0, minFreq), 
            maxFreq: Math.max(0, maxFreq),
            gain: r.gain !== undefined ? r.gain : -60,
            q: r.q !== undefined ? r.q : 5.0
          };
        });

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        progressBarFill.style.width = '30%';
        progressPercent.textContent = '30%';

        const arrayBuffer = await originalFile.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        progressBarFill.style.width = '50%';
        progressPercent.textContent = '50%';

        const sampleRate = audioBuffer.sampleRate;
        const numberOfChannels = audioBuffer.numberOfChannels;
        const offlineCtx = new OfflineAudioContext(numberOfChannels, audioBuffer.length, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        let lastNode = source;

        logicalRegions.forEach(region => {
          const centerFreq = (region.minFreq + region.maxFreq) / 2;
          const customQ = region.q;

          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.setValueAtTime(centerFreq, 0);
          filter.Q.setValueAtTime(customQ, 0);

          filter.gain.setValueAtTime(0, 0);
          filter.gain.setValueAtTime(0, region.startTime);
          filter.gain.linearRampToValueAtTime(region.gain, region.startTime + 0.02);
          filter.gain.setValueAtTime(region.gain, region.endTime - 0.02);
          filter.gain.linearRampToValueAtTime(0, region.endTime);

          lastNode.connect(filter);
          lastNode = filter;
        });

        lastNode.connect(offlineCtx.destination);
        source.start(0);

        progressBarFill.style.width = '70%';
        progressPercent.textContent = '70%';

        const renderedBuffer = await offlineCtx.startRendering();

        progressBarFill.style.width = '90%';
        progressPercent.textContent = '90%';

        const wavBlob = audioBufferToWav(renderedBuffer);

        progressBarFill.style.width = '100%';
        progressPercent.textContent = '100%';

        const finalUrl = URL.createObjectURL(wavBlob);

        setTimeout(() => {
          processingState.classList.add('hidden');
          resultState.classList.remove('hidden');
          btnDownloadLink.href = finalUrl;
          btnDownloadLink.download = `instrumental-${originalFile.name.split('.')[0] || 'track'}.wav`;
          document.getElementById('action-wrapper').classList.remove('hidden');
        }, 300);

      } catch (err) {
        console.error(err);
        processingState.classList.add('hidden');
        document.getElementById('action-wrapper').classList.remove('hidden');
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = 'Could not process audio track. Verify file format or reduce size.';
      }
    });

    function audioBufferToWav(buffer) {
      let numOfChan = buffer.numberOfChannels,
          length = buffer.length * numOfChan * 2 + 44,
          bufferArr = new ArrayBuffer(length),
          view = new DataView(bufferArr),
          channels = [], i, sample,
          offset = 0,
          pos = 0;

      setUint32(0x46464952); // "RIFF"
      setUint32(length - 8); 
      setUint32(0x45564157); // "WAVE"

      setUint32(0x20746d66); // "fmt " 
      setUint32(16);         
      setUint16(1);          
      setUint16(numOfChan);
      setUint32(buffer.sampleRate);
      setUint32(buffer.sampleRate * 2 * numOfChan); 
      setUint16(numOfChan * 2);                    
      setUint16(16);                                

      setUint32(0x61746164);                        // "data" 
      setUint32(length - pos - 4);                  

      for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
      }

      while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
          sample = Math.max(-1, Math.min(1, channels[i][offset]));
          sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF); 
          view.setInt16(pos, sample, true); 
          pos += 2;
        }
        offset++;
      }

      return new Blob([bufferArr], { type: "audio/wav" });

      // Utility helpers to write data to buffer safely
      function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
      function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
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
