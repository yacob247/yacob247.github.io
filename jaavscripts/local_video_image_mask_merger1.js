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

// Initialize icons
    lucide.createIcons();

    // Media References
    const videoInput = document.getElementById('videoInput');
    const imageInput = document.getElementById('imageInput');
    const videoName = document.getElementById('videoName');
    const imageName = document.getElementById('imageName');
    const canvasPlaceholder = document.getElementById('canvasPlaceholder');
    const displayCanvas = document.getElementById('displayCanvas');
    const resBadge = document.getElementById('resBadge');

    // Control Tabs
    const tabMask = document.getElementById('tabMask');
    const tabImage = document.getElementById('tabImage');
    const tabBlend = document.getElementById('tabBlend');
    const maskControlsPanel = document.getElementById('maskControls');
    const imageControlsPanel = document.getElementById('imageControls');
    const blendControlsPanel = document.getElementById('blendControls');
    const activeModeLabel = document.getElementById('activeModeLabel');

    // Sliders & Values - Mask
    const sliderMaskX = document.getElementById('sliderMaskX');
    const sliderMaskY = document.getElementById('sliderMaskY');
    const sliderMaskSize = document.getElementById('sliderMaskSize');
    const sliderMaskHeight = document.getElementById('sliderMaskHeight');
    const maskHeightContainer = document.getElementById('maskHeightContainer');
    const maskSizeLabel = document.getElementById('maskSizeLabel');

    const valMaskX = document.getElementById('valMaskX');
    const valMaskY = document.getElementById('valMaskY');
    const valMaskSize = document.getElementById('valMaskSize');
    const valMaskHeight = document.getElementById('valMaskHeight');

    // Sliders & Values - Image Placement
    const sliderImgScale = document.getElementById('sliderImgScale');
    const sliderImgX = document.getElementById('sliderImgX');
    const sliderImgY = document.getElementById('sliderImgY');

    const valImgScale = document.getElementById('valImgScale');
    const valImgX = document.getElementById('valImgX');
    const valImgY = document.getElementById('valImgY');

    // Sliders & Values - Color & Blend
    const sliderFeather = document.getElementById('sliderFeather');
    const sliderOpacity = document.getElementById('sliderOpacity');
    const sliderBrightness = document.getElementById('sliderBrightness');
    const sliderContrast = document.getElementById('sliderContrast');
    const sliderSaturation = document.getElementById('sliderSaturation');
    const selectBlendMode = document.getElementById('selectBlendMode');

    const valFeather = document.getElementById('valFeather');
    const valOpacity = document.getElementById('valOpacity');
    const valBrightness = document.getElementById('valBrightness');
    const valContrast = document.getElementById('valContrast');
    const valSaturation = document.getElementById('valSaturation');
    const btnResetBlend = document.getElementById('btnResetBlend');

    // Mode Buttons
    const modeCutout = document.getElementById('modeCutout');
    const modeReverse = document.getElementById('modeReverse');
    const shapeCircle = document.getElementById('shapeCircle');
    const shapeSquare = document.getElementById('shapeSquare');
    const shapeRectangle = document.getElementById('shapeRectangle');

    // Export/Timeline Buttons
    const btnPlay = document.getElementById('btnPlay');
    const btnMute = document.getElementById('btnMute');
    const btnExport = document.getElementById('btnExport');
    const timelineSlider = document.getElementById('timelineSlider');
    const progressBar = document.getElementById('progressBar');
    const currentTimeText = document.getElementById('currentTime');
    const totalDurationText = document.getElementById('totalDuration');

    // Export Modal References
    const exportModal = document.getElementById('exportModal');
    const renderProgressPercent = document.getElementById('renderProgressPercent');
    const renderProgressBar = document.getElementById('renderProgressBar');
    const renderFrameText = document.getElementById('renderFrameText');
    const btnAbortExport = document.getElementById('btnAbortExport');
    const btnResetImage = document.getElementById('btnResetImage');

    // Native Media Instances
    let videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous';
    videoElement.muted = false;
    videoElement.loop = false;

    let imageElement = new Image();
    imageElement.crossOrigin = 'anonymous';

    // Application State Variables
    let isVideoLoaded = false;
    let isImageLoaded = false;
    let activeEditorTab = 'mask'; // 'mask', 'image', or 'blend'
    let cropShape = 'circle'; // 'circle', 'square', 'rectangle'
    let compMode = 'cutout'; // 'cutout' (Image inside mask), 'reverse' (Video inside mask over image)

    // Position/Sizing state (percentages)
    let maskState = {
      xPercent: 50, // Center X
      yPercent: 50, // Center Y
      sizePercent: 25, // Width / Radius
      heightPercent: 20 // Active only for rectangle
    };

    let imageState = {
      scale: 1.0,
      xOffsetPercent: 0,
      yOffsetPercent: 0
    };

    // Color & Blend State
    let blendState = {
      feather: 15, // Edge Blur
      opacity: 100, // Transparency
      brightness: 100, // Luminescence match
      contrast: 100, // Shadows match
      saturation: 100, // Vibrancy Match
      blendMode: 'source-over' // Photoshop blend modes
    };

    // Tracking canvas render sizes
    let canvasW = 640;
    let canvasH = 360;
    const ctx = displayCanvas.getContext('2d');

    // Offscreen Canvases for Feathering & Masking Blends
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    // Drag-and-drop / Click-and-drag interaction details
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let dragStartOffset = { x: 0, y: 0 };

    // Export / Record status
    let mediaRecorder = null;
    let recordedChunks = [];
    let isExporting = false;
    let audioContextInstance = null;
    let audioDestinationNode = null;

    // --- Dynamic Slider Constraints and Label updates ---
    function updateStateFromSliders() {
      if (activeEditorTab === 'mask') {
        maskState.xPercent = (sliderMaskX.value / sliderMaskX.max) * 100;
        maskState.yPercent = (sliderMaskY.value / sliderMaskY.max) * 100;
        maskState.sizePercent = (sliderMaskSize.value / sliderMaskSize.max) * 100;
        maskState.heightPercent = (sliderMaskHeight.value / sliderMaskHeight.max) * 100;
      } else if (activeEditorTab === 'image') {
        imageState.scale = parseFloat(sliderImgScale.value);
        imageState.xOffsetPercent = (sliderImgX.value / sliderImgX.max) * 100;
        imageState.yOffsetPercent = (sliderImgY.value / sliderImgY.max) * 100;
      } else if (activeEditorTab === 'blend') {
        blendState.feather = parseInt(sliderFeather.value);
        blendState.opacity = parseInt(sliderOpacity.value);
        blendState.brightness = parseInt(sliderBrightness.value);
        blendState.contrast = parseInt(sliderContrast.value);
        blendState.saturation = parseInt(sliderSaturation.value);
        blendState.blendMode = selectBlendMode.value;
      }
      requestFrameRedraw();
    }

    function syncSlidersToState() {
      if (activeEditorTab === 'mask') {
        sliderMaskX.value = (maskState.xPercent / 100) * sliderMaskX.max;
        sliderMaskY.value = (maskState.yPercent / 100) * sliderMaskY.max;
        sliderMaskSize.value = (maskState.sizePercent / 100) * sliderMaskSize.max;
        sliderMaskHeight.value = (maskState.heightPercent / 100) * sliderMaskHeight.max;

        valMaskX.textContent = `${Math.round((maskState.xPercent / 100) * canvasW)}px`;
        valMaskY.textContent = `${Math.round((maskState.yPercent / 100) * canvasH)}px`;

        if (cropShape === 'circle') {
          maskSizeLabel.textContent = "Mask Radius (R)";
          valMaskSize.textContent = `${Math.round((maskState.sizePercent / 100) * Math.max(canvasW, canvasH))}px`;
        } else {
          maskSizeLabel.textContent = "Mask Width (W)";
          valMaskSize.textContent = `${Math.round((maskState.sizePercent / 100) * canvasW)}px`;
        }
        valMaskHeight.textContent = `${Math.round((maskState.heightPercent / 100) * canvasH)}px`;
      } else if (activeEditorTab === 'image') {
        sliderImgScale.value = imageState.scale;
        sliderImgX.value = (imageState.xOffsetPercent / 100) * sliderImgX.max;
        sliderImgY.value = (imageState.yOffsetPercent / 100) * sliderImgY.max;

        valImgScale.textContent = `${imageState.scale.toFixed(2)}x`;
        valImgX.textContent = `${Math.round((imageState.xOffsetPercent / 100) * canvasW)}px`;
        valImgY.textContent = `${Math.round((imageState.yOffsetPercent / 100) * canvasH)}px`;
      } else if (activeEditorTab === 'blend') {
        sliderFeather.value = blendState.feather;
        sliderOpacity.value = blendState.opacity;
        sliderBrightness.value = blendState.brightness;
        sliderContrast.value = blendState.contrast;
        sliderSaturation.value = blendState.saturation;
        selectBlendMode.value = blendState.blendMode;

        valFeather.textContent = `${blendState.feather}px`;
        valOpacity.textContent = `${blendState.opacity}%`;
        valBrightness.textContent = `${blendState.brightness}%`;
        valContrast.textContent = `${blendState.contrast}%`;
        valSaturation.textContent = `${blendState.saturation}%`;
      }
    }

    // --- Interactive Drag Handling on Canvas ---
    displayCanvas.addEventListener('mousedown', startDrag);
    displayCanvas.addEventListener('touchstart', startDrag, { passive: false });

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleDrag, { passive: false });

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);

    function getCanvasCoordinates(e) {
      const rect = displayCanvas.getBoundingClientRect();
      let clientX = e.clientX;
      let clientY = e.clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      return {
        x: ((clientX - rect.left) / rect.width) * canvasW,
        y: ((clientY - rect.top) / rect.height) * canvasH
      };
    }

    function startDrag(e) {
      if (!isVideoLoaded) return;
      e.preventDefault();

      const mousePos = getCanvasCoordinates(e);
      isDragging = true;
      dragStartPos = mousePos;

      if (activeEditorTab === 'mask') {
        const maskX = (maskState.xPercent / 100) * canvasW;
        const maskY = (maskState.yPercent / 100) * canvasH;
        dragStartOffset = {
          x: mousePos.x - maskX,
          y: mousePos.y - maskY
        };
      } else {
        const imgX = (imageState.xOffsetPercent / 100) * canvasW;
        const imgY = (imageState.yOffsetPercent / 100) * canvasH;
        dragStartOffset = {
          x: mousePos.x - imgX,
          y: mousePos.y - imgY
        };
      }
    }

    function handleDrag(e) {
      if (!isDragging) return;
      e.preventDefault();

      const mousePos = getCanvasCoordinates(e);

      if (activeEditorTab === 'mask') {
        const newX = mousePos.x - dragStartOffset.x;
        const newY = mousePos.y - dragStartOffset.y;
        maskState.xPercent = Math.max(0, Math.min(100, (newX / canvasW) * 100));
        maskState.yPercent = Math.max(0, Math.min(100, (newY / canvasH) * 100));
      } else {
        const newX = mousePos.x - dragStartOffset.x;
        const newY = mousePos.y - dragStartOffset.y;
        imageState.xOffsetPercent = Math.max(-100, Math.min(100, (newX / canvasW) * 100));
        imageState.yOffsetPercent = Math.max(-100, Math.min(100, (newY / canvasH) * 100));
      }

      syncSlidersToState();
      requestFrameRedraw();
    }

    function stopDrag() {
      isDragging = false;
    }

    // --- Interactive Editing Mode Tabs Switching ---
    tabMask.addEventListener('click', () => {
      activeEditorTab = 'mask';
      tabMask.className = "px-3 py-1.5 rounded-md font-medium bg-indigo-600 text-white transition flex items-center gap-1.5";
      tabImage.className = "px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
      tabBlend.className = "px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";

      maskControlsPanel.classList.remove('hidden');
      imageControlsPanel.classList.add('hidden');
      blendControlsPanel.classList.add('hidden');
      activeModeLabel.textContent = "Adjusting: Mask Shape";
      syncSlidersToState();
    });

    tabImage.addEventListener('click', () => {
      activeEditorTab = 'image';
      tabImage.className = "px-3 py-1.5 rounded-md font-medium bg-indigo-600 text-white transition flex items-center gap-1.5";
      tabMask.className = "px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
      tabBlend.className = "px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";

      imageControlsPanel.classList.remove('hidden');
      maskControlsPanel.classList.add('hidden');
      blendControlsPanel.classList.add('hidden');
      activeModeLabel.textContent = "Adjusting: Image Placement";
      syncSlidersToState();
    });

    tabBlend.addEventListener('click', () => {
      activeEditorTab = 'blend';
      tabBlend.className = "px-3 py-1.5 rounded-md font-medium bg-indigo-600 text-white transition flex items-center gap-1.5";
      tabMask.className = "px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
      tabImage.className = "px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";

      blendControlsPanel.classList.remove('hidden');
      maskControlsPanel.classList.add('hidden');
      imageControlsPanel.classList.add('hidden');
      activeModeLabel.textContent = "Adjusting: Layer Blending";
      syncSlidersToState();
    });

    btnResetImage.addEventListener('click', () => {
      imageState.scale = 1.0;
      imageState.xOffsetPercent = 0;
      imageState.yOffsetPercent = 0;
      syncSlidersToState();
      requestFrameRedraw();
    });

    btnResetBlend.addEventListener('click', () => {
      blendState.feather = 15;
      blendState.opacity = 100;
      blendState.brightness = 100;
      blendState.contrast = 100;
      blendState.saturation = 100;
      blendState.blendMode = 'source-over';
      syncSlidersToState();
      requestFrameRedraw();
    });

    // Wire up events for adjustments
    const controlInputs = [
      sliderMaskX, sliderMaskY, sliderMaskSize, sliderMaskHeight,
      sliderImgScale, sliderImgX, sliderImgY,
      sliderFeather, sliderOpacity, sliderBrightness, sliderContrast, sliderSaturation, selectBlendMode
    ];
    controlInputs.forEach(inp => {
      inp.addEventListener('input', updateStateFromSliders);
    });

    // --- Composition Layout Settings Configuration ---
    modeCutout.addEventListener('click', () => {
      compMode = 'cutout';
      modeCutout.className = "py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-white transition flex flex-col items-center justify-center gap-1";
      modeReverse.className = "py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition flex flex-col items-center justify-center gap-1";
      requestFrameRedraw();
    });

    modeReverse.addEventListener('click', () => {
      compMode = 'reverse';
      modeReverse.className = "py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-white transition flex flex-col items-center justify-center gap-1";
      modeCutout.className = "py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition flex flex-col items-center justify-center gap-1";
      requestFrameRedraw();
    });

    function setShape(shape) {
      cropShape = shape;
      shapeCircle.className = `py-2.5 px-3 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 ${shape === 'circle' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'}`;
      shapeSquare.className = `py-2.5 px-3 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 ${shape === 'square' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'}`;
      shapeRectangle.className = `py-2.5 px-3 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 ${shape === 'rectangle' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'}`;

      // Toggle custom mask heights
      if (shape === 'rectangle') {
        maskHeightContainer.classList.remove('hidden');
      } else {
        maskHeightContainer.classList.add('hidden');
      }

      syncSlidersToState();
      requestFrameRedraw();
    }

    shapeCircle.addEventListener('click', () => setShape('circle'));
    shapeSquare.addEventListener('click', () => setShape('square'));
    shapeRectangle.addEventListener('click', () => setShape('rectangle'));

    // --- Media Core Initialization and Integration ---

    // Video Upload Handlers
    videoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        videoName.textContent = file.name.substring(0, 24) + (file.name.length > 24 ? '...' : '');
        videoElement.src = url;
        videoElement.load();

        // Auto display custom feedback on change
        videoElement.onloadedmetadata = () => {
          canvasW = videoElement.videoWidth;
          canvasH = videoElement.videoHeight;
          displayCanvas.width = canvasW;
          displayCanvas.height = canvasH;
          resBadge.textContent = `Resolution: ${canvasW}x${canvasH}`;

          isVideoLoaded = true;
          timelineSlider.max = videoElement.duration;
          totalDurationText.textContent = formatDuration(videoElement.duration);

          checkIntegrityAndEnableUI();
          syncSlidersToState();
          requestFrameRedraw();
        };
      }
    });

    // Image Upload Handlers
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        imageName.textContent = file.name.substring(0, 24) + (file.name.length > 24 ? '...' : '');
        imageElement.src = url;

        imageElement.onload = () => {
          isImageLoaded = true;
          checkIntegrityAndEnableUI();
          requestFrameRedraw();
        };
      }
    });

    function checkIntegrityAndEnableUI() {
      if (isVideoLoaded && isImageLoaded) {
        canvasPlaceholder.classList.add('opacity-0');
        setTimeout(() => canvasPlaceholder.classList.add('hidden'), 300);
        btnExport.disabled = false;
        btnExport.className = "w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl cursor-pointer transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20";
      }
    }

    // --- Dynamic Render Loop ---
    let frameRequest;
    function requestFrameRedraw() {
      if (frameRequest) cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(renderComposerFrame);
    }

    videoElement.addEventListener('play', () => {
      playIcon.setAttribute('data-lucide', 'pause');
      lucide.createIcons();
      drawPreviewLoop();
    });

    videoElement.addEventListener('pause', () => {
      playIcon.setAttribute('data-lucide', 'play');
      lucide.createIcons();
      cancelAnimationFrame(frameRequest);
    });

    videoElement.addEventListener('timeupdate', () => {
      if (!videoElement.paused) {
        timelineSlider.value = videoElement.currentTime;
        currentTimeText.textContent = formatDuration(videoElement.currentTime);
        progressBar.style.width = `${(videoElement.currentTime / videoElement.duration) * 100}%`;
      }
    });

    function drawPreviewLoop() {
      if (!videoElement.paused && !videoElement.ended) {
        renderComposerFrame();
        // Update custom play progress inside standard RAF for smoothness
        timelineSlider.value = videoElement.currentTime;
        currentTimeText.textContent = formatDuration(videoElement.currentTime);
        progressBar.style.width = `${(videoElement.currentTime / videoElement.duration) * 100}%`;
        requestAnimationFrame(drawPreviewLoop);
      }
    }

    // Secondary drawing helper to apply image scale, translation and offsets
    function drawImageLayer(targetCtx, useMatchingFilters) {
      if (!isImageLoaded) return;

      const mX = (maskState.xPercent / 100) * canvasW;
      const mY = (maskState.yPercent / 100) * canvasH;

      const imgScaleW = imageElement.width * imageState.scale;
      const imgScaleH = imageElement.height * imageState.scale;

      const imgX = mX + ((imageState.xOffsetPercent / 100) * canvasW) - (imgScaleW / 2);
      const imgY = mY + ((imageState.yOffsetPercent / 100) * canvasH) - (imgScaleH / 2);

      targetCtx.save();
      if (useMatchingFilters) {
        // Integrate real-time color correction blends directly to image matrix
        targetCtx.filter = `brightness(${blendState.brightness}%) contrast(${blendState.contrast}%) saturate(${blendState.saturation}%) opacity(${blendState.opacity}%)`;
      }
      targetCtx.drawImage(imageElement, imgX, imgY, imgScaleW, imgScaleH);
      targetCtx.restore();
    }

    // --- The Core Composition Frame Engine ---
    function renderComposerFrame() {
      if (!ctx) return;

      // Clear main canvas context
      ctx.clearRect(0, 0, canvasW, canvasH);

      if (!isVideoLoaded) return;

      // Extract mask coordinates
      const mX = (maskState.xPercent / 100) * canvasW;
      const mY = (maskState.yPercent / 100) * canvasH;
      const mSize = (maskState.sizePercent / 100) * (cropShape === 'circle' ? Math.max(canvasW, canvasH) : canvasW);
      const mHeight = (maskState.heightPercent / 100) * canvasH;

      // 1. Resize offscreen compositing buffers if the video source size shifted
      if (offscreenCanvas.width !== canvasW || offscreenCanvas.height !== canvasH) {
        offscreenCanvas.width = canvasW;
        offscreenCanvas.height = canvasH;
        maskCanvas.width = canvasW;
        maskCanvas.height = canvasH;
      }

      // Clear offscreen workspaces
      offscreenCtx.clearRect(0, 0, canvasW, canvasH);
      maskCtx.clearRect(0, 0, canvasW, canvasH);

      // Helper function to draw mask shape vector
      function drawMaskShape(targetCtx) {
        targetCtx.beginPath();
        if (cropShape === 'circle') {
          targetCtx.arc(mX, mY, mSize, 0, Math.PI * 2);
        } else if (cropShape === 'square') {
          targetCtx.rect(mX - mSize / 2, mY - mSize / 2, mSize, mSize);
        } else if (cropShape === 'rectangle') {
          targetCtx.rect(mX - mSize / 2, mY - mHeight / 2, mSize, mHeight);
        }
        targetCtx.closePath();
        targetCtx.fill();
      }

      // 2. Compile feathered edge mask onto maskCanvas
      maskCtx.save();
      if (blendState.feather > 0) {
        // Feathering is achieved by applying a live Gaussian blur directly to the vector mask
        maskCtx.filter = `blur(${blendState.feather}px)`;
      }
      maskCtx.fillStyle = 'white';
      drawMaskShape(maskCtx);
      maskCtx.restore();

      // 3. Render base backgrounds and foreground mask structures
      if (compMode === 'cutout') {
        // Background: Original Video
        ctx.drawImage(videoElement, 0, 0, canvasW, canvasH);

        // Foreground (Inside Mask): Replacement Image
        offscreenCtx.save();
        drawImageLayer(offscreenCtx, true); // Render image with user color corrections
        offscreenCtx.restore();

        // Clip the image to the feathered mask shape
        offscreenCtx.save();
        offscreenCtx.globalCompositeOperation = 'destination-in';
        offscreenCtx.drawImage(maskCanvas, 0, 0);
        offscreenCtx.restore();

        // Draw feathered image on top of background video using active blend modes
        ctx.save();
        ctx.globalCompositeOperation = blendState.blendMode;
        ctx.drawImage(offscreenCanvas, 0, 0);
        ctx.restore();

      } else {
        // Background: Replacement Image
        drawImageLayer(ctx, true);

        // Foreground (Inside Mask): Live Video
        offscreenCtx.save();
        offscreenCtx.drawImage(videoElement, 0, 0, canvasW, canvasH);
        offscreenCtx.restore();

        // Clip video to feathered mask shape
        offscreenCtx.save();
        offscreenCtx.globalCompositeOperation = 'destination-in';
        offscreenCtx.drawImage(maskCanvas, 0, 0);
        offscreenCtx.restore();

        // Draw feathered video on top of image background
        ctx.save();
        ctx.globalCompositeOperation = blendState.blendMode;
        ctx.drawImage(offscreenCanvas, 0, 0);
        ctx.restore();
      }

      // 4. Render user interface vector guides when paused to allow position adjustments
      if (videoElement.paused && activeEditorTab === 'mask') {
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        if (cropShape === 'circle') {
          ctx.beginPath();
          ctx.arc(mX, mY, mSize, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.arc(mX, mY, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (cropShape === 'square') {
          ctx.strokeRect(mX - mSize / 2, mY - mSize / 2, mSize, mSize);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(mX - 3, mY - 3, 6, 6);
        } else if (cropShape === 'rectangle') {
          ctx.strokeRect(mX - mSize / 2, mY - mHeight / 2, mSize, mHeight);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(mX - 3, mY - 3, 6, 6);
        }
        ctx.restore();
      }
    }

    // --- Timeline Interaction Handlers ---
    timelineSlider.addEventListener('input', () => {
      videoElement.currentTime = timelineSlider.value;
      currentTimeText.textContent = formatDuration(timelineSlider.value);
      progressBar.style.width = `${(timelineSlider.value / videoElement.duration) * 100}%`;
      requestFrameRedraw();
    });

    btnPlay.addEventListener('click', () => {
      if (!isVideoLoaded) return;
      if (videoElement.paused) {
        videoElement.play().catch(err => {
          triggerAlert("Playback Error", "Failed to start media stream. Try reloading your video.");
        });
      } else {
        videoElement.pause();
      }
    });

    btnMute.addEventListener('click', () => {
      videoElement.muted = !videoElement.muted;
      if (videoElement.muted) {
        muteIcon.setAttribute('data-lucide', 'volume-x');
        btnMute.className = "bg-red-950/40 text-red-400 p-2.5 rounded-lg border border-red-900/30 transition focus:outline-none flex items-center justify-center";
      } else {
        muteIcon.setAttribute('data-lucide', 'volume-2');
        btnMute.className = "bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg transition focus:outline-none flex items-center justify-center";
      }
      lucide.createIcons();
    });

    // Format Duration helper
    function formatDuration(sec) {
      if (isNaN(sec)) return "0:00";
      const minutes = Math.floor(sec / 60);
      const seconds = Math.floor(sec % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // --- Alert UI Handler ---
    function triggerAlert(title, message) {
      const customAlert = document.getElementById('customAlert');
      document.getElementById('alertTitle').textContent = title;
      document.getElementById('alertMessage').textContent = message;
      customAlert.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-4');
      customAlert.classList.add('opacity-100', 'translate-y-0');
      setTimeout(dismissAlert, 6000);
    }

    function dismissAlert() {
      const customAlert = document.getElementById('customAlert');
      customAlert.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');
      customAlert.classList.remove('opacity-100', 'translate-y-0');
    }

    // --- Advanced Local Media Recorder Export Engine ---
    btnExport.addEventListener('click', startCompilationExport);
    btnAbortExport.addEventListener('click', abortCompilation);

    async function startCompilationExport() {
      if (!isVideoLoaded || !isImageLoaded) return;

      // Reset controls
      videoElement.pause();
      videoElement.currentTime = 0;

      recordedChunks = [];
      isExporting = true;
      exportModal.classList.remove('hidden');
      exportModal.classList.add('flex');

      // Update compilation visual stats
      renderProgressPercent.textContent = "0%";
      renderProgressBar.style.width = "0%";
      renderFrameText.textContent = "Preparing browser encoding engine...";

      // Setup output streams (Canvas Frame rate at robust 30fps stream)
      const videoStream = displayCanvas.captureStream(30);
      let combinedStream = videoStream;

      try {
        // Safely capture audio if the video file has audio tracks
        const hasAudioTracks = videoElement.audioTracks ? videoElement.audioTracks.length > 0 : true; // fallback check
        if (hasAudioTracks) {
          if (!audioContextInstance) {
            audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();

            // Route video element audio stream into web audio context
            const sourceNode = audioContextInstance.createMediaElementSource(videoElement);
            audioDestinationNode = audioContextInstance.createMediaStreamDestination();

            // Split audio stream to destination and system speakers
            sourceNode.connect(audioDestinationNode);
            sourceNode.connect(audioContextInstance.destination);
          }

          // Merge canvas visual track with the output audio node destination
          const audioTrack = audioDestinationNode.stream.getAudioTracks()[0];
          if (audioTrack) {
            combinedStream = new MediaStream([
              videoStream.getVideoTracks()[0],
              audioTrack
            ]);
          }
        }
      } catch (err) {
        console.warn("Could not capture/process audio tracks directly. Continuing video-only: ", err);
      }

      // Establish recording mime types
      let options = { mimeType: 'video/webm; codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm; codecs=vp8' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      try {
        mediaRecorder = new MediaRecorder(combinedStream, options);
      } catch (err) {
        triggerAlert("Codec Exception", "Failed to initiate browser MediaRecorder codecs.");
        abortCompilation();
        return;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const exportUrl = URL.createObjectURL(blob);

          // Generate a download link
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = exportUrl;
          downloadAnchor.download = `composite_composition_${Date.now()}.webm`;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();

          // Clean up track instances
          setTimeout(() => {
            document.body.removeChild(downloadAnchor);
            URL.revokeObjectURL(exportUrl);
          }, 100);
        }

        // Return window to normal state
        abortCompilation();
      };

      // Ensure Audio Context is active
      if (audioContextInstance && audioContextInstance.state === 'suspended') {
        await audioContextInstance.resume();
      }

      // Start the media recording capturing frame timeline
      mediaRecorder.start();
      videoElement.play();

      // Monitor recording stream timeline progress
      trackRecordingProgress();
    }

    function trackRecordingProgress() {
      if (!isExporting) return;

      const duration = videoElement.duration || 1;
      const cur = videoElement.currentTime;
      const progress = Math.min(100, Math.floor((cur / duration) * 100));

      renderProgressPercent.textContent = `${progress}%`;
      renderProgressBar.style.width = `${progress}%`;
      renderFrameText.textContent = `Compiling timeline: ${formatDuration(cur)} / ${formatDuration(duration)}`;

      if (videoElement.ended || cur >= duration) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } else {
        // Redraw rendering cycle manually
        renderComposerFrame();
        requestAnimationFrame(trackRecordingProgress);
      }
    }

    function abortCompilation() {
      isExporting = false;
      exportModal.classList.add('hidden');
      exportModal.classList.remove('flex');

      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
      }

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      requestFrameRedraw();
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
