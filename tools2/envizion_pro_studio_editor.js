lucide.createIcons();

    // ============================================================
    // APPLICATION STATE & DATA MODEL
    // ============================================================
    let assets = [];      // { id, kind: 'video'|'image', name, url, el, width, height, duration, audioSource }
    let tracks = [];      // { id, name }
    let clips = [];       // { id, trackId, assetId|null, kind, start, duration, inPoint, x, y, scale, rotation, opacity, mask, color, blendMode, chroma }

    let selectedClipId = null;
    let playheadTime = 0;
    let isPlaying = false;
    let pxPerSecond = 60;
    let timelineDuration = 30; // auto-expands
    let activeTool = 'select';

    // Canvas Engine Core
    const canvas = document.getElementById('displayCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let canvasW = 1280, canvasH = 720;
    canvas.width = canvasW; canvas.height = canvasH;

    // Advanced Offscreen Compositing (Enables Feathering & Blending)
    const offCtxCanvas = document.createElement('canvas');
    const offCtx = offCtxCanvas.getContext('2d');
    const maskCtxCanvas = document.createElement('canvas');
    const maskCtx = maskCtxCanvas.getContext('2d');
    const chromaCtxCanvas = document.createElement('canvas');
    const chromaCtx = chromaCtxCanvas.getContext('2d', { willReadFrequently: true });
    offCtxCanvas.width = maskCtxCanvas.width = chromaCtxCanvas.width = canvasW;
    offCtxCanvas.height = maskCtxCanvas.height = chromaCtxCanvas.height = canvasH;

    // Audio Engine 
    let audioContext = null;
    let audioDestNode = null;

    function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 9999); }

    function formatDuration(t) {
      if (!isFinite(t) || t < 0) t = 0;
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      const ms = Math.floor((t % 1) * 10);
      return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
    }

    // ============================================================
    // MEDIA IMPORT SYSTEM
    // ============================================================
    function initAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioDestNode = audioContext.createMediaStreamDestination();
      }
    }

    function addAssetFromFile(file) {
      initAudioContext();
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const kind = isVideo ? 'video' : 'image';

      const asset = { id: uid('asset'), kind, name: file.name, url, el: null, width: 0, height: 0, duration: 5, audioSource: null };
      assets.push(asset);

      if (kind === 'video') {
        const v = document.createElement('video');
        v.src = url; v.crossOrigin = 'anonymous'; 
        // Need to play temporarily to unlock audio context in some browsers, but we keep it muted normally.
        v.muted = true; v.playsInline = true;
        v.onloadedmetadata = () => {
          asset.width = v.videoWidth; asset.height = v.videoHeight; asset.duration = v.duration || 5;
          asset.el = v;
          try {
            asset.audioSource = audioContext.createMediaElementSource(v);
            // Connect to speakers for live preview
            asset.audioSource.connect(audioContext.destination);
            // Connect to stream destination for export
            asset.audioSource.connect(audioDestNode);
          } catch(e) { console.warn('Audio routing error', e); }
          renderAssetList();
        };
      } else {
        const img = new Image();
        img.src = url; img.crossOrigin = 'anonymous';
        img.onload = () => {
          asset.width = img.naturalWidth; asset.height = img.naturalHeight; asset.el = img;
          renderAssetList();
        };
      }
      renderAssetList();
    }

    function renderAssetList() {
      const list = document.getElementById('assetList');
      list.innerHTML = '';
      assets.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'bg-neutral-800/80 rounded border border-neutral-600/60 cursor-grab hover:border-neutral-600 hover:bg-neutral-800 transition group flex flex-col relative overflow-hidden';
        card.draggable = true;
        card.dataset.assetId = asset.id;

        card.innerHTML = `
          <div class="h-16 bg-neutral-950 flex items-center justify-center relative pointer-events-none">
            ${asset.el && asset.kind === 'image' ? `<img src="${asset.url}" class="w-full h-full object-cover opacity-70" />` : `<i data-lucide="${asset.kind === 'video' ? 'film' : 'image'}" class="w-6 h-6 text-neutral-400"></i>`}
            <span class="absolute bottom-1 right-1 bg-neutral-900/80 backdrop-blur text-[9px] px-1.5 py-0.5 rounded text-neutral-300 uppercase shadow">${asset.kind}</span>
          </div>
          <div class="px-2 py-1.5 text-[10px] text-neutral-300 truncate font-medium bg-neutral-800 border-t border-neutral-600 pointer-events-none">${asset.name}</div>
        `;
        card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/asset-id', asset.id); });
        card.addEventListener('dblclick', () => {
          if (tracks.length === 0) addTrack();
          addClipToTrack(asset.id, tracks[0].id, playheadTime);
        });
        list.appendChild(card);
      });
      lucide.createIcons();
    }

    // Handlers
    document.getElementById('btnImportMedia').addEventListener('click', () => document.getElementById('mediaInput').click());
    document.getElementById('mediaInput').addEventListener('change', (e) => {
      [...e.target.files].forEach(addAssetFromFile);
      e.target.value = '';
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files) [...e.dataTransfer.files].forEach(f => {
        if (f.type.startsWith('video') || f.type.startsWith('image')) addAssetFromFile(f);
      });
    });

    // ============================================================
    // TIMELINE & CLIP MANAGEMENT
    // ============================================================
    function addTrack(name) {
      const track = { id: uid('track'), name: name || `Track ${tracks.length + 1}` };
      tracks.push(track);
      renderTimeline();
      return track;
    }

    function generateDefaultClip(trackId, kind) {
      return {
        id: uid('clip'), trackId, kind,
        start: playheadTime, duration: 5, inPoint: 0,
        x: canvasW / 2, y: canvasH / 2, scale: 1, rotation: 0, opacity: 100,
        blendMode: 'source-over',
        color: { brightness: 100, contrast: 100, saturation: 100 },
        mask: { shape: 'none', size: 300, feather: 0, points: null },
        chroma: null
      };
    }

    function addClipToTrack(assetId, trackId, startTime) {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return;
      const clip = generateDefaultClip(trackId, asset.kind);
      clip.assetId = asset.id;
      clip.start = Math.max(0, startTime);
      clip.duration = asset.duration;

      // Auto-scale large media to fit canvas initially
      if (asset.width && asset.height) {
        const scaleFit = Math.min((canvasW * 0.8) / asset.width, (canvasH * 0.8) / asset.height, 1);
        clip.scale = scaleFit;
      }

      clips.push(clip);
      timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 5);
      document.getElementById('canvasPlaceholder').classList.add('hidden');
      selectClip(clip.id);
      renderTimeline();
      requestFrameRedraw();
      return clip;
    }

    function addTextClip(trackId, startTime) {
      const clip = generateDefaultClip(trackId, 'text');
      clip.start = Math.max(0, startTime);
      clip.text = { content: 'New Text', color: '#ececec', size: 80, font: 'Inter' };
      clips.push(clip);
      timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 5);
      document.getElementById('canvasPlaceholder').classList.add('hidden');
      selectClip(clip.id);
      renderTimeline();
      requestFrameRedraw();
    }

    document.getElementById('btnAddTrack').addEventListener('click', () => addTrack());
    document.getElementById('btnAddText').addEventListener('click', () => {
      if (tracks.length === 0) addTrack();
      addTextClip(tracks[tracks.length - 1].id, playheadTime);
    });

    function selectClip(id) {
      selectedClipId = id;
      renderTimeline();
      renderPropsPanel();
      renderXformOverlay();
    }

    document.getElementById('btnDeleteClip').addEventListener('click', () => {
      if (!selectedClipId) return;
      clips = clips.filter(c => c.id !== selectedClipId);
      selectedClipId = null;
      renderTimeline();
      renderPropsPanel();
      renderXformOverlay();
      requestFrameRedraw();
    });

    document.getElementById('btnSplitClip').addEventListener('click', () => {
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip) return;
      if (playheadTime <= clip.start || playheadTime >= clip.start + clip.duration) return;

      const splitOffset = playheadTime - clip.start;
      const newClip = JSON.parse(JSON.stringify(clip)); // Deep copy
      newClip.id = uid('clip');

      // Adjust original clip (left half)
      clip.duration = splitOffset;

      // Adjust new clip (right half)
      newClip.start = playheadTime;
      newClip.inPoint = clip.inPoint + splitOffset;
      newClip.duration = newClip.duration - splitOffset;

      clips.push(newClip);
      selectClip(newClip.id);
      renderTimeline();
      requestFrameRedraw();
    });

    // ============================================================
    // TIMELINE RENDERING & INTERACTION
    // ============================================================
    function renderTimeline() {
      const ruler = document.getElementById('rulerRow');
      const container = document.getElementById('timelineTracks');
      const trackWidth = (timelineDuration * pxPerSecond) + 'px';

      ruler.innerHTML = ''; ruler.style.width = trackWidth;
      const step = pxPerSecond < 40 ? 5 : 1;
      for (let t = 0; t <= timelineDuration; t += step) {
        const tick = document.createElement('div');
        tick.className = 'ruler-tick'; tick.style.left = (t * pxPerSecond) + 'px';
        tick.innerHTML = `<span>${formatDuration(t)}</span>`;
        ruler.appendChild(tick);
      }

      container.innerHTML = ''; container.style.width = trackWidth;
      tracks.forEach(track => {
        const row = document.createElement('div');
        row.className = 'track-row flex items-center';
        row.style.width = trackWidth;
        row.dataset.trackId = track.id;

        // Drag-drop to timeline logic
        row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop-hover'); });
        row.addEventListener('dragleave', () => row.classList.remove('drop-hover'));
        row.addEventListener('drop', (e) => {
          e.preventDefault(); row.classList.remove('drop-hover');
          const assetId = e.dataTransfer.getData('text/asset-id');
          if (assetId) {
            const rect = row.getBoundingClientRect();
            addClipToTrack(assetId, track.id, Math.max(0, (e.clientX - rect.left) / pxPerSecond));
          }
        });

        clips.filter(c => c.trackId === track.id).forEach(clip => {
          const el = document.createElement('div');
          el.className = 'clip-block ' + clip.kind + (clip.id === selectedClipId ? ' selected' : '');
          el.style.left = (clip.start * pxPerSecond) + 'px';
          el.style.width = Math.max(15, clip.duration * pxPerSecond) + 'px';

          let label = clip.kind;
          if (clip.kind === 'text') label = clip.text.content;
          else {
            const asset = assets.find(a => a.id === clip.assetId);
            if (asset) label = asset.name;
          }

          el.innerHTML = `<div class="clip-handle left"></div><div class="clip-label">${label}</div><div class="clip-handle right"></div>`;

          el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('clip-handle')) return;
            e.stopPropagation(); selectClip(clip.id); startClipDrag(e, clip);
          });
          el.querySelector('.clip-handle.left').addEventListener('mousedown', (e) => {
            e.stopPropagation(); selectClip(clip.id); startClipTrim(e, clip, 'left');
          });
          el.querySelector('.clip-handle.right').addEventListener('mousedown', (e) => {
            e.stopPropagation(); selectClip(clip.id); startClipTrim(e, clip, 'right');
          });
          row.appendChild(el);
        });
        container.appendChild(row);
      });

      document.getElementById('playhead').style.left = (playheadTime * pxPerSecond) + 'px';
    }

    function startClipDrag(e, clip) {
      const startX = e.clientX, origStart = clip.start;
      function onMove(ev) {
        clip.start = Math.max(0, origStart + (ev.clientX - startX) / pxPerSecond);
        timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 2);
        renderTimeline(); requestFrameRedraw();
      }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }

    function startClipTrim(e, clip, side) {
      const startX = e.clientX, origStart = clip.start, origDur = clip.duration, origIn = clip.inPoint;
      function onMove(ev) {
        const dx = (ev.clientX - startX) / pxPerSecond;
        if (side === 'left') {
          // Prevent negative duration or negative inPoint
          let maxDx = origDur - 0.1; // minimum length 0.1s
          let minDx = -origIn;       // Cannot trim left past the start of source media
          let finalDx = Math.max(minDx, Math.min(maxDx, dx));

          clip.start = Math.max(0, origStart + finalDx);
          clip.duration = origDur - finalDx;
          clip.inPoint = origIn + finalDx;
        } else {
          clip.duration = Math.max(0.1, origDur + dx);
        }
        timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 2);
        renderTimeline(); requestFrameRedraw();
      }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }

    // Playhead Scrubbing
    function setPlayhead(clientX) {
      const rect = document.getElementById('timelineTracks').getBoundingClientRect();
      playheadTime = Math.max(0, (clientX - rect.left) / pxPerSecond);
      updateTransportUI(); requestFrameRedraw();
    }
    document.getElementById('timelineScroll').addEventListener('mousedown', (e) => {
      if (e.target.closest('.clip-block')) return;
      setPlayhead(e.clientX);
      function onMove(ev) { setPlayhead(ev.clientX); }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    });

    // Zooming
    document.getElementById('btnZoomIn').addEventListener('click', () => { pxPerSecond = Math.min(400, pxPerSecond * 1.5); document.getElementById('zoomLabel').textContent = Math.round(pxPerSecond) + 'px/s'; renderTimeline(); });
    document.getElementById('btnZoomOut').addEventListener('click', () => { pxPerSecond = Math.max(5, pxPerSecond / 1.5); document.getElementById('zoomLabel').textContent = Math.round(pxPerSecond) + 'px/s'; renderTimeline(); });

    // ============================================================
    // PROPERTIES PANEL (Tabbed Interface)
    // ============================================================
    const propsTabs = document.querySelectorAll('.prop-tab');
    propsTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        propsTabs.forEach(b => {
          b.classList.remove('text-neutral-300', 'border-b-2', 'border-neutral-600', 'bg-neutral-800/30');
          b.classList.add('text-neutral-300');
        });
        btn.classList.add('text-neutral-300', 'border-b-2', 'border-neutral-600', 'bg-neutral-800/30');
        btn.classList.remove('text-neutral-300');
        document.querySelectorAll('.prop-pane').forEach(p => p.classList.add('hidden'));
        document.getElementById(btn.dataset.target).classList.remove('hidden');
      });
    });

    function createSlider(label, id, min, max, val, step, suffix, onChange) {
      return `
        <div>
          <div class="flex justify-between text-[10px] text-neutral-300 mb-1">
            <span>${label}</span><span id="val_${id}">${val}${suffix}</span>
          </div>
          <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" class="w-full accent-neutral-500" oninput="document.getElementById('val_${id}').textContent = this.value + '${suffix}';">
        </div>
      `;
    }

    function renderPropsPanel() {
      const clip = clips.find(c => c.id === selectedClipId);
      const empty = document.getElementById('propsEmpty');
      const content = document.getElementById('propsContent');

      if (!clip) { empty.classList.remove('hidden'); content.classList.add('hidden'); content.classList.remove('flex'); return; }
      empty.classList.add('hidden'); content.classList.remove('hidden'); content.classList.add('flex');

      // TAB 1: Basic
      let basicHtml = `
        ${createSlider('Scale', 'inpScale', 0.1, 5, clip.scale, 0.01, 'x')}
        ${createSlider('Rotation', 'inpRot', -180, 180, clip.rotation, 1, '°')}
        ${createSlider('Opacity', 'inpOpac', 0, 100, clip.opacity, 1, '%')}
      `;
      if (clip.kind === 'text') {
        basicHtml += `
          <div class="pt-4 border-t border-neutral-600">
            <label class="text-[10px] text-neutral-300 mb-1 block">Text Content</label>
            <textarea id="inpTextVal" class="w-full bg-neutral-950 border border-neutral-600 rounded p-2 text-xs text-neutral-100" rows="2">${clip.text.content}</textarea>
            <div class="flex items-center gap-2 mt-2">
              <input type="color" id="inpTextColor" value="${clip.text.color}" class="w-8 h-8 rounded bg-neutral-950 border border-neutral-600">
              <input type="number" id="inpTextSize" value="${clip.text.size}" class="flex-1 bg-neutral-950 border border-neutral-600 rounded px-2 text-xs text-neutral-100 h-8">
            </div>
          </div>
        `;
      }
      document.getElementById('tab-basic').innerHTML = basicHtml;

      // TAB 2: Mask
      document.getElementById('tab-mask').innerHTML = `
        <div class="space-y-1 mb-4">
          <label class="text-[10px] text-neutral-300">Mask Shape</label>
          <select id="inpMaskShape" class="w-full bg-neutral-950 border border-neutral-600 rounded px-2 py-1.5 text-xs text-neutral-100">
            <option value="none" ${clip.mask.shape === 'none' ? 'selected' : ''}>None</option>
            <option value="circle" ${clip.mask.shape === 'circle' ? 'selected' : ''}>Circle</option>
            <option value="square" ${clip.mask.shape === 'square' ? 'selected' : ''}>Square</option>
            <option value="custom" ${clip.mask.shape === 'custom' ? 'selected' : ''} disabled>Custom (Use Tool)</option>
          </select>
        </div>
        ${clip.mask.shape !== 'none' ? createSlider('Mask Size', 'inpMaskSize', 10, 2000, clip.mask.size, 1, 'px') : ''}
        ${clip.mask.shape !== 'none' ? createSlider('Feather / Blur Edge', 'inpMaskFeather', 0, 100, clip.mask.feather, 1, 'px') : ''}
        ${clip.mask.shape === 'custom' ? `<p class="text-[10px] text-neutral-300 bg-neutral-900/30 p-2 rounded border border-neutral-600/50 mt-2">Custom mask active. Draw on canvas to update.</p>` : ''}
      `;

      // TAB 3: Color / Blend
      document.getElementById('tab-color').innerHTML = `
        <div class="space-y-1 mb-4">
          <label class="text-[10px] text-neutral-300">Blend Mode</label>
          <select id="inpBlendMode" class="w-full bg-neutral-950 border border-neutral-600 rounded px-2 py-1.5 text-xs text-neutral-100">
            <option value="source-over" ${clip.blendMode === 'source-over' ? 'selected' : ''}>Normal</option>
            <option value="multiply" ${clip.blendMode === 'multiply' ? 'selected' : ''}>Multiply</option>
            <option value="screen" ${clip.blendMode === 'screen' ? 'selected' : ''}>Screen</option>
            <option value="overlay" ${clip.blendMode === 'overlay' ? 'selected' : ''}>Overlay</option>
            <option value="soft-light" ${clip.blendMode === 'soft-light' ? 'selected' : ''}>Soft Light</option>
            <option value="color-dodge" ${clip.blendMode === 'color-dodge' ? 'selected' : ''}>Color Dodge</option>
          </select>
        </div>
        ${clip.kind !== 'text' ? `
          <div class="pt-2 border-t border-neutral-600 space-y-3">
            ${createSlider('Brightness', 'inpColBright', 0, 200, clip.color.brightness, 1, '%')}
            ${createSlider('Contrast', 'inpColCont', 0, 200, clip.color.contrast, 1, '%')}
            ${createSlider('Saturation', 'inpColSat', 0, 200, clip.color.saturation, 1, '%')}
          </div>
        ` : ''}
      `;

      // Wire up basic listeners
      document.getElementById('inpScale').addEventListener('input', e => { clip.scale = parseFloat(e.target.value); renderXformOverlay(); requestFrameRedraw(); });
      document.getElementById('inpRot').addEventListener('input', e => { clip.rotation = parseFloat(e.target.value); renderXformOverlay(); requestFrameRedraw(); });
      document.getElementById('inpOpac').addEventListener('input', e => { clip.opacity = parseFloat(e.target.value); requestFrameRedraw(); });

      if (clip.kind === 'text') {
        document.getElementById('inpTextVal').addEventListener('input', e => { clip.text.content = e.target.value; renderTimeline(); requestFrameRedraw(); });
        document.getElementById('inpTextColor').addEventListener('input', e => { clip.text.color = e.target.value; requestFrameRedraw(); });
        document.getElementById('inpTextSize').addEventListener('input', e => { clip.text.size = parseFloat(e.target.value); renderXformOverlay(); requestFrameRedraw(); });
      }

      // Wire up Mask Listeners
      document.getElementById('inpMaskShape').addEventListener('change', e => { clip.mask.shape = e.target.value; renderPropsPanel(); requestFrameRedraw(); });
      if (document.getElementById('inpMaskSize')) document.getElementById('inpMaskSize').addEventListener('input', e => { clip.mask.size = parseFloat(e.target.value); requestFrameRedraw(); });
      if (document.getElementById('inpMaskFeather')) document.getElementById('inpMaskFeather').addEventListener('input', e => { clip.mask.feather = parseFloat(e.target.value); requestFrameRedraw(); });

      // Wire up Color Listeners
      document.getElementById('inpBlendMode').addEventListener('change', e => { clip.blendMode = e.target.value; requestFrameRedraw(); });
      if (document.getElementById('inpColBright')) {
        document.getElementById('inpColBright').addEventListener('input', e => { clip.color.brightness = parseFloat(e.target.value); requestFrameRedraw(); });
        document.getElementById('inpColCont').addEventListener('input', e => { clip.color.contrast = parseFloat(e.target.value); requestFrameRedraw(); });
        document.getElementById('inpColSat').addEventListener('input', e => { clip.color.saturation = parseFloat(e.target.value); requestFrameRedraw(); });
      }
    }

    // ============================================================
    // CANVAS RENDERING ENGINE (The Core Compositor)
    // ============================================================
    function renderComposerFrame() {
      // 1. Clear Main Canvas
      ctx.clearRect(0, 0, canvasW, canvasH);

      // Process tracks from bottom to top (z-index)
      tracks.forEach(track => {
        clips.filter(c => c.trackId === track.id).forEach(clip => {
          // Check if clip is active at current playhead time
          if (playheadTime < clip.start || playheadTime > clip.start + clip.duration) {
            if (clip.kind === 'video') {
              const asset = assets.find(a => a.id === clip.assetId);
              if (asset && asset.el && !asset.el.paused) asset.el.pause(); // stop off-screen videos
            }
            return;
          }

          drawClip(clip);
        });
      });

      renderXformOverlay();
    }

    function drawClip(clip) {
      // Clear offscreen workspaces
      offCtx.clearRect(0, 0, canvasW, canvasH);
      maskCtx.clearRect(0, 0, canvasW, canvasH);

      const asset = clip.kind !== 'text' ? assets.find(a => a.id === clip.assetId) : null;

      // Sync Video Playback
      if (asset && asset.kind === 'video' && asset.el) {
        const localTime = (playheadTime - clip.start) + clip.inPoint;

        // Handle playback vs scrubbing
        if (isPlaying) {
          if (asset.el.paused) asset.el.play().catch(e => console.warn(e));
          if (Math.abs(asset.el.currentTime - localTime) > 0.25) asset.el.currentTime = localTime;
        } else {
          if (!asset.el.paused) asset.el.pause();
          asset.el.currentTime = localTime;
        }
      }

      // ----------------------------------------------------
      // STEP A: Render Content into Offscreen Context
      // ----------------------------------------------------
      offCtx.save();
      // Apply transforms
      offCtx.translate(clip.x, clip.y);
      offCtx.rotate(clip.rotation * Math.PI / 180);
      offCtx.scale(clip.scale, clip.scale);

      if (clip.kind === 'text') {
        offCtx.fillStyle = clip.text.color;
        offCtx.font = `bold ${clip.text.size}px ${clip.text.font}`;
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.fillText(clip.text.content, 0, 0);
      } else if (asset && asset.el) {
        const w = asset.width || 400, h = asset.height || 400;

        // Apply Color Correction Filters
        offCtx.filter = `brightness(${clip.color.brightness}%) contrast(${clip.color.contrast}%) saturate(${clip.color.saturation}%)`;

        // Apply Chroma Key (Pixel data manipulation)
        if (clip.chroma && clip.chroma.enabled) {
          chromaCtx.clearRect(0, 0, canvasW, canvasH);
          chromaCtx.drawImage(asset.el, 0, 0, w, h);
          const frame = chromaCtx.getImageData(0, 0, w, h);
          const data = frame.data;
          const { r, g, b, tolerance } = clip.chroma;
          for (let i = 0; i < data.length; i += 4) {
            const dist = Math.sqrt(Math.pow(data[i]-r,2) + Math.pow(data[i+1]-g,2) + Math.pow(data[i+2]-b,2));
            if (dist < tolerance) data[i+3] = 0;
            else if (dist < tolerance + 30) data[i+3] = Math.round(((dist - tolerance)/30)*255);
          }
          chromaCtx.putImageData(frame, 0, 0);
          offCtx.drawImage(chromaCtxCanvas, 0, 0, w, h, -w/2, -h/2, w, h);
        } else {
          // Standard Draw
          offCtx.drawImage(asset.el, -w/2, -h/2, w, h);
        }
      }
      offCtx.restore();

      // ----------------------------------------------------
      // STEP B: Apply Masking & Feathering
      // ----------------------------------------------------
      if (clip.mask.shape !== 'none') {
        maskCtx.save();
        maskCtx.translate(clip.x, clip.y);
        maskCtx.rotate(clip.rotation * Math.PI / 180);
        maskCtx.scale(clip.scale, clip.scale); // scale mask with clip

        // Apply Feather Blur to the Mask Vector Path!
        if (clip.mask.feather > 0) maskCtx.filter = `blur(${clip.mask.feather}px)`;
        maskCtx.fillStyle = '#ececec';
        maskCtx.beginPath();

        if (clip.mask.shape === 'circle') {
          maskCtx.arc(0, 0, clip.mask.size / 2, 0, Math.PI * 2);
        } else if (clip.mask.shape === 'square') {
          const s = clip.mask.size;
          maskCtx.rect(-s/2, -s/2, s, s);
        } else if (clip.mask.shape === 'custom' && clip.mask.points && clip.mask.points.length > 2) {
          maskCtx.moveTo(clip.mask.points[0].x, clip.mask.points[0].y);
          for(let i=1; i<clip.mask.points.length; i++) maskCtx.lineTo(clip.mask.points[i].x, clip.mask.points[i].y);
        }
        maskCtx.closePath();
        maskCtx.fill();
        maskCtx.restore();

        // Punch out pixels: only keep offCtx pixels where maskCtx has pixels
        offCtx.save();
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.drawImage(maskCtxCanvas, 0, 0);
        offCtx.restore();
      }

      // ----------------------------------------------------
      // STEP C: Composite to Main Canvas
      // ----------------------------------------------------
      ctx.save();
      ctx.globalAlpha = clip.opacity / 100;
      ctx.globalCompositeOperation = clip.blendMode;
      ctx.drawImage(offCtxCanvas, 0, 0);
      ctx.restore();
    }

    // ============================================================
    // CANVAS TOOLS (Move, Freeform Mask, Chroma Picker)
    // ============================================================
    const xformOverlay = document.getElementById('xformOverlay');
    function getCanvasScale() { const rect = canvas.getBoundingClientRect(); return { sx: rect.width / canvasW, sy: rect.height / canvasH, rect }; }

    function renderXformOverlay() {
      xformOverlay.innerHTML = '';
      if (activeTool !== 'select') return; // Only show handles in select mode

      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip) return;
      const { sx, sy } = getCanvasScale();

      const asset = clip.kind !== 'text' ? assets.find(a => a.id === clip.assetId) : null;
      const baseW = clip.kind === 'text' ? (clip.text.size * clip.text.content.length * 0.55) : (asset ? asset.width : 200);
      const baseH = clip.kind === 'text' ? (clip.text.size * 1.2) : (asset ? asset.height : 200);

      const w = baseW * clip.scale * sx; const h = baseH * clip.scale * sy;
      const cx = clip.x * sx; const cy = clip.y * sy;

      const box = document.createElement('div');
      box.style.cssText = `position:absolute; left:${cx - w/2}px; top:${cy - h/2}px; width:${w}px; height:${h}px; border:1.5px dashed rgba(255, 255, 255, 0.12); pointer-events:auto; cursor:move; transform: rotate(${clip.rotation}deg);`;

      box.addEventListener('mousedown', e => { e.stopPropagation(); startCanvasMove(e, clip); });

      const handle = document.createElement('div'); handle.className = 'xform-handle'; handle.style.cssText = `right:-6px; bottom:-6px;`;
      handle.addEventListener('mousedown', e => { e.stopPropagation(); startCanvasResize(e, clip); });

      const rot = document.createElement('div'); rot.className = 'xform-rotate'; rot.style.cssText = `left:50%; top:-25px; margin-left:-7px;`;
      rot.addEventListener('mousedown', e => { e.stopPropagation(); startCanvasRotate(e, clip); });

      box.appendChild(handle); box.appendChild(rot); xformOverlay.appendChild(box);
    }

    function startCanvasMove(e, clip) {
      const { sx, sy } = getCanvasScale();
      const startX = e.clientX, startY = e.clientY, origX = clip.x, origY = clip.y;
      function onMove(ev) { clip.x = origX + (ev.clientX - startX)/sx; clip.y = origY + (ev.clientY - startY)/sy; renderXformOverlay(); requestFrameRedraw(); }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }
    function startCanvasResize(e, clip) {
      const startX = e.clientX, origScale = clip.scale;
      function onMove(ev) { clip.scale = Math.max(0.05, origScale + (ev.clientX - startX) / 150); renderXformOverlay(); renderPropsPanel(); requestFrameRedraw(); }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }
    function startCanvasRotate(e, clip) {
      const { sx, sy, rect } = getCanvasScale();
      const cx = rect.left + clip.x * sx, cy = rect.top + clip.y * sy;
      function onMove(ev) { clip.rotation = Math.round(Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90); renderXformOverlay(); renderPropsPanel(); requestFrameRedraw(); }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }

    // Tool Rail Logic
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'bg-neutral-600', 'text-neutral-100'));
        btn.classList.add('active', 'bg-neutral-600', 'text-neutral-100');
        activeTool = btn.dataset.tool;
        renderXformOverlay();
        if(activeTool === 'freeform-cut') triggerAlert('Draw Cutout Mask', 'Select a clip, then click and drag on the canvas to draw a custom mask shape.');
        if(activeTool === 'chromakey') openChromaKeyTool();
      });
    });

    // Custom Mask Drawing
    let isDrawingMask = false;
    let customMaskPts = [];
    const maskSvgLayer = document.createElement('div');
    maskSvgLayer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index: 100;';
    document.getElementById('stageWrap').appendChild(maskSvgLayer);

    document.getElementById('stageWrap').addEventListener('mousedown', e => {
      if(activeTool !== 'freeform-cut') return;
      if(!selectedClipId) { triggerAlert('Error', 'Select a clip first.'); return; }
      isDrawingMask = true; customMaskPts = []; addMaskPoint(e); e.preventDefault();
    });
    window.addEventListener('mousemove', e => { if(isDrawingMask) addMaskPoint(e); });
    window.addEventListener('mouseup', () => {
      if(!isDrawingMask) return;
      isDrawingMask = false;
      const clip = clips.find(c => c.id === selectedClipId);
      if(clip && customMaskPts.length > 3) {
        // Transform points into clip's local space so mask sticks to clip
        clip.mask.points = customMaskPts.map(p => {
          // Simplified projection: rotate & scale back relative to clip center
          const dx = p.x - clip.x, dy = p.y - clip.y;
          const rad = -clip.rotation * Math.PI/180;
          return {
            x: (dx * Math.cos(rad) - dy * Math.sin(rad)) / clip.scale,
            y: (dx * Math.sin(rad) + dy * Math.cos(rad)) / clip.scale
          };
        });
        clip.mask.shape = 'custom';
        renderPropsPanel(); requestFrameRedraw();
        triggerAlert('Mask Applied', 'Custom mask generated. You can now adjust feathering in the properties panel.');
      }
      maskSvgLayer.innerHTML = '';
      document.querySelector('[data-tool="select"]').click(); // auto revert tool
    });

    function addMaskPoint(e) {
      const { rect, sx, sy } = getCanvasScale();
      customMaskPts.push({ x: (e.clientX - rect.left)/sx, y: (e.clientY - rect.top)/sy });
      if(customMaskPts.length > 1) {
        const path = 'M ' + customMaskPts.map(p => `${p.x * sx},${p.y * sy}`).join(' L ');
        maskSvgLayer.innerHTML = `<svg width="100%" height="100%"><path d="${path}" fill="rgba(255, 255, 255,0.2)" stroke="#10a37f" stroke-width="2" stroke-dasharray="4" /></svg>`;
      }
    }

    // Chroma Key Quick Tool
    function openChromaKeyTool() {
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip || clip.kind === 'text') { triggerAlert('Error', 'Select an image or video clip first.'); return; }
      triggerAlert('Pick Chroma Color', 'Click on a color in the canvas to key it out.');

      const pickHandler = (e) => {
        const { rect, sx, sy } = getCanvasScale();
        const x = Math.round((e.clientX - rect.left) / sx);
        const y = Math.round((e.clientY - rect.top) / sy);

        // Temporarily render without chroma to pick raw color
        const oldChroma = clip.chroma;
        clip.chroma = null; renderComposerFrame();

        const px = ctx.getImageData(x, y, 1, 1).data;
        clip.chroma = { enabled: true, r: px[0], g: px[1], b: px[2], tolerance: 50 };

        requestFrameRedraw();
        canvas.removeEventListener('click', pickHandler);
        document.querySelector('[data-tool="select"]').click();
        triggerAlert('Key Applied', 'Color removed. Settings can be refined (requires advanced properties extension).');
      };
      // Delay attachment to avoid immediate trigger
      setTimeout(() => canvas.addEventListener('click', pickHandler), 100); 
    }

    // ============================================================
    // TRANSPORT (Playback Loop)
    // ============================================================
    const btnPlay = document.getElementById('btnPlay');
    function updateTransportUI() {
      document.getElementById('currentTime').textContent = formatDuration(playheadTime);
      document.getElementById('totalDuration').textContent = formatDuration(timelineDuration);
      document.getElementById('transportProgress').style.width = Math.min(100, (playheadTime / timelineDuration) * 100) + '%';
      document.getElementById('playhead').style.left = (playheadTime * pxPerSecond) + 'px';
    }

    btnPlay.addEventListener('click', () => {
      initAudioContext(); // Ensure audio context starts
      isPlaying = !isPlaying;
      document.getElementById('playIcon').setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
      lucide.createIcons();
      if (isPlaying) requestAnimationFrame(playLoop);
      else requestFrameRedraw(); // sync pauses
    });

    document.getElementById('transportTrack').addEventListener('mousedown', e => {
      const rect = e.target.closest('#transportTrack').getBoundingClientRect();
      playheadTime = Math.max(0, Math.min(timelineDuration, ((e.clientX - rect.left)/rect.width) * timelineDuration));
      updateTransportUI(); requestFrameRedraw();
    });

    let lastTick = null;
    let frameRequest;

    function playLoop(ts) {
      if (!isPlaying) { lastTick = null; return; }
      if (!lastTick) lastTick = ts;
      playheadTime += (ts - lastTick) / 1000;
      lastTick = ts;

      if (playheadTime > timelineDuration) { playheadTime = 0; btnPlay.click(); }

      updateTransportUI();
      renderComposerFrame();
      frameRequest = requestAnimationFrame(playLoop);
    }

    function requestFrameRedraw() {
      if (isPlaying) return; // playloop handles it
      if (frameRequest) cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(renderComposerFrame);
    }

    // ============================================================
    // EXPORT ENGINE (Canvas + Audio API)
    // ============================================================
    let mediaRecorder = null;
    let isExporting = false;

    document.getElementById('btnExport').addEventListener('click', async () => {
      if (clips.length === 0) { triggerAlert('Empty', 'Add clips to export.'); return; }
      initAudioContext();

      if (audioContext.state === 'suspended') await audioContext.resume();

      document.getElementById('exportModal').classList.remove('hidden');
      document.getElementById('exportModal').classList.add('flex');
      isPlaying = false;
      playheadTime = 0;
      isExporting = true;

      // Capture Canvas 
      const videoStream = canvas.captureStream(30);
      let finalStream = videoStream;

      // Add Audio if available
      const audioTracks = audioDestNode.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        finalStream = new MediaStream([videoStream.getVideoTracks()[0], audioTracks[0]]);
      }

      const options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
        ? { mimeType: 'video/webm; codecs=vp9' } : { mimeType: 'video/webm' };

      try {
        let recordedChunks = [];
        mediaRecorder = new MediaRecorder(finalStream, options);
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
          if (recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `envizion_composite_${Date.now()}.webm`;
            a.click(); URL.revokeObjectURL(url);
          }
          abortExport();
        };

        mediaRecorder.start();

        // Start all video assets playing silently to feed audio to context
        assets.filter(a => a.kind === 'video').forEach(a => {
           a.el.currentTime = 0;
           a.el.play().catch(e=>console.warn(e)); 
        });

        requestAnimationFrame(exportLoop);
      } catch (err) { triggerAlert('Export Error', err.message); abortExport(); }
    });

    let lastExportTick = performance.now();
    function exportLoop(ts) {
      if (!isExporting) return;
      // Synthesize timeline progress for 30 FPS render independent of real-time lag
      const dt = (ts - lastExportTick) / 1000;
      lastExportTick = ts;
      playheadTime += dt; 

      const pct = Math.min(100, Math.floor((playheadTime / timelineDuration) * 100));
      document.getElementById('renderProgressBar').style.width = pct + '%';
      document.getElementById('renderProgressPercent').textContent = pct + '%';
      document.getElementById('renderFrameText').textContent = `Compiling: ${formatDuration(playheadTime)} / ${formatDuration(timelineDuration)}`;

      renderComposerFrame();

      if (playheadTime >= timelineDuration) mediaRecorder.stop();
      else requestAnimationFrame(exportLoop);
    }

    function abortExport() {
      isExporting = false;
      document.getElementById('exportModal').classList.add('hidden');
      document.getElementById('exportModal').classList.remove('flex');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      playheadTime = 0;
      assets.filter(a => a.kind === 'video').forEach(a => a.el.pause());
      updateTransportUI(); requestFrameRedraw();
    }

    // ============================================================
    // UTILS
    // ============================================================
    function triggerAlert(title, msg) {
      document.getElementById('alertTitle').textContent = title;
      document.getElementById('alertMessage').textContent = msg;
      const el = document.getElementById('customAlert');
      el.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-4');
      el.classList.add('opacity-100', 'translate-y-0');
      setTimeout(dismissAlert, 4000);
    }
    function dismissAlert() {
      const el = document.getElementById('customAlert');
      el.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');
      el.classList.remove('opacity-100', 'translate-y-0');
    }

    // Initialize Base Tracks
    addTrack('Main Track');
    addTrack('Overlay Track');
    renderTimeline();
    updateTransportUI();

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
