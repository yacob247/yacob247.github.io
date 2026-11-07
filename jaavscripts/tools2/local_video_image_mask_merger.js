if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }

    // ============================================================
    // DATA MODEL
    // ============================================================
    // assets: imported source files (video/image/gif), kept once, referenced by clips
    // tracks: ordered list of track objects, each with an array of clip ids (z-order = track index, later = on top)
    // clips: individual placed instances on the timeline referencing an asset (or raw text)

    let assets = [];      // { id, kind: 'video'|'image'|'gif', name, url, el (media element), width, height, duration }
    let tracks = [];      // { id, name }
    let clips = [];       // { id, trackId, assetId|null, kind, start, duration, x,y,scale,rotation, opacity, text?, cutout?, chroma?, bend? }
    let selectedClipId = null;
    let playheadTime = 0;
    let isPlaying = false;
    let pxPerSecond = 60;
    let timelineDuration = 30; // grows as clips are added

    const canvas = document.getElementById('displayCanvas');
    const ctx = canvas.getContext('2d');
    let canvasW = 1280, canvasH = 720;
    canvas.width = canvasW; canvas.height = canvasH;

    const canvasPlaceholder = document.getElementById('canvasPlaceholder');
    const resBadge = document.getElementById('resBadge');
    const assetList = document.getElementById('assetList');
    const timelineTracks = document.getElementById('timelineTracks');
    const rulerRow = document.getElementById('rulerRow');
    const playheadEl = document.getElementById('playhead');
    const timelineScroll = document.getElementById('timelineScroll');
    const propsPanel = document.getElementById('propsPanel');
    const propsEmpty = document.getElementById('propsEmpty');

    function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 9999); }
    function formatDuration(t) {
      if (!isFinite(t) || t < 0) t = 0;
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // ============================================================
    // ASSET IMPORT
    // ============================================================
    function addAssetFromFile(file) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isGif = file.type === 'image/gif';
      const kind = isVideo ? 'video' : (isGif ? 'gif' : 'image');

      const asset = { id: uid('asset'), kind, name: file.name, url, el: null, width: 0, height: 0, duration: 0 };
      assets.push(asset);

      if (kind === 'video') {
        const v = document.createElement('video');
        v.src = url; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous';
        v.onloadedmetadata = () => {
          asset.width = v.videoWidth; asset.height = v.videoHeight; asset.duration = v.duration || 5;
          asset.el = v;
          renderAssetList();
        };
      } else {
        const img = new Image();
        img.src = url; img.crossOrigin = 'anonymous';
        img.onload = () => {
          asset.width = img.naturalWidth; asset.height = img.naturalHeight; asset.duration = 5;
          asset.el = img;
          renderAssetList();
        };
      }
      renderAssetList();
      return asset;
    }

    function addAssetFromDataUrl(dataUrl, kind, name) {
      const asset = { id: uid('asset'), kind, name: name || kind, url: dataUrl, el: null, width: 0, height: 0, duration: 0 };
      assets.push(asset);
      if (kind === 'video') {
        const v = document.createElement('video');
        v.src = dataUrl; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous';
        v.onloadedmetadata = () => { asset.width = v.videoWidth; asset.height = v.videoHeight; asset.duration = v.duration || 5; asset.el = v; renderAssetList(); };
      } else {
        const img = new Image();
        img.src = dataUrl; img.crossOrigin = 'anonymous';
        img.onload = () => { asset.width = img.naturalWidth; asset.height = img.naturalHeight; asset.duration = 5; asset.el = img; renderAssetList(); };
      }
      renderAssetList();
      return asset;
    }

    function renderAssetList() {
      assetList.innerHTML = '';
      assets.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'bg-neutral-800/60 rounded-lg overflow-hidden border border-neutral-600/60 cursor-grab hover:border-neutral-600 transition group';
        card.draggable = true;
        card.dataset.assetId = asset.id;

        const iconName = asset.kind === 'video' ? 'clapperboard' : asset.kind === 'gif' ? 'image-play' : 'image';
        card.innerHTML = `
          <div class="asset-thumb bg-neutral-950 flex items-center justify-center relative">
            ${asset.el && asset.kind !== 'video' ? `<img src="${asset.url}" class="w-full h-full object-cover" />` : `<i data-lucide="${iconName}" class="w-6 h-6 text-neutral-400"></i>`}
            <span class="absolute bottom-1 right-1 bg-neutral-950/60 text-[8px] px-1 rounded text-neutral-300 uppercase">${asset.kind}</span>
          </div>
          <div class="px-2 py-1.5 text-[10px] text-neutral-300 truncate">${asset.name}</div>
        `;
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/asset-id', asset.id);
        });
        card.addEventListener('dblclick', () => {
          // Quick-add: drop onto first track at playhead
          if (tracks.length === 0) addTrack();
          addClipToTrack(asset.id, tracks[0].id, playheadTime);
        });
        assetList.appendChild(card);
      });
      if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
    }

    document.getElementById('btnImportMedia').addEventListener('click', () => {
      document.getElementById('mediaInput').click();
    });
    document.getElementById('mediaInput').addEventListener('change', (e) => {
      [...e.target.files].forEach(addAssetFromFile);
      e.target.value = '';
    });

    // Drag-and-drop import anywhere on the page
    ['dragover', 'drop'].forEach(evt => {
      window.addEventListener(evt, (e) => { e.preventDefault(); });
    });
    window.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        [...e.dataTransfer.files].forEach(f => {
          if (f.type.startsWith('video') || f.type.startsWith('image')) addAssetFromFile(f);
        });
      }
    });

    // Ctrl+V paste import
    window.addEventListener('paste', (e) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const items = e.clipboardData ? e.clipboardData.items : [];
      for (const item of items) {
        if (item.type.startsWith('image') || item.type.startsWith('video')) {
          const file = item.getAsFile();
          if (file) addAssetFromFile(file);
        }
      }
    });

    // ============================================================
    // TRACKS + CLIPS
    // ============================================================
    function addTrack(name) {
      const track = { id: uid('track'), name: name || `Track ${tracks.length + 1}` };
      tracks.push(track);
      renderTimeline();
      return track;
    }

    function addClipToTrack(assetId, trackId, startTime) {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return;
      const clip = {
        id: uid('clip'),
        trackId,
        assetId,
        kind: asset.kind,
        start: Math.max(0, startTime),
        duration: asset.duration || 5,
        x: canvasW / 2, y: canvasH / 2,
        scale: 1, rotation: 0, opacity: 100,
        text: null,
        cutout: null,   // freeform-cut shape, set in later stage
        chroma: null,   // chroma-key settings, set in later stage
        bend: null       // bend/warp settings, set in later stage
      };
      clips.push(clip);
      timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 10);
      selectClip(clip.id);
      renderTimeline();
      canvasPlaceholder.classList.add('hidden');
      requestFrameRedraw();
      return clip;
    }

    function addTextClip(trackId, startTime) {
      const clip = {
        id: uid('clip'), trackId, assetId: null, kind: 'text',
        start: Math.max(0, startTime), duration: 4,
        x: canvasW / 2, y: canvasH / 2, scale: 1, rotation: 0, opacity: 100,
        text: { content: 'Your Text', color: '#ececec', size: 64, font: 'Arial', bend: 0 },
        cutout: null, chroma: null, bend: null
      };
      clips.push(clip);
      timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 10);
      selectClip(clip.id);
      renderTimeline();
      canvasPlaceholder.classList.add('hidden');
      requestFrameRedraw();
      return clip;
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
      requestFrameRedraw();
    });

    document.getElementById('btnSplitClip').addEventListener('click', () => {
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip) return;
      if (playheadTime <= clip.start || playheadTime >= clip.start + clip.duration) return;
      const splitAt = playheadTime - clip.start;
      const newClip = JSON.parse(JSON.stringify(clip));
      newClip.id = uid('clip');
      newClip.start = playheadTime;
      newClip.duration = clip.duration - splitAt;
      clip.duration = splitAt;
      clips.push(newClip);
      renderTimeline();
    });

    // ============================================================
    // TIMELINE RENDERING
    // ============================================================
    function renderRuler() {
      rulerRow.innerHTML = '';
      rulerRow.style.width = (timelineDuration * pxPerSecond) + 'px';
      const step = pxPerSecond < 40 ? 5 : 1;
      for (let t = 0; t <= timelineDuration; t += step) {
        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        tick.style.left = (t * pxPerSecond) + 'px';
        tick.innerHTML = `<span>${formatDuration(t)}</span>`;
        rulerRow.appendChild(tick);
      }
    }

    function renderTimeline() {
      renderRuler();
      timelineTracks.innerHTML = '';
      timelineTracks.style.width = (timelineDuration * pxPerSecond) + 'px';

      tracks.forEach(track => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.dataset.trackId = track.id;
        row.style.width = (timelineDuration * pxPerSecond) + 'px';

        row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop-hover'); });
        row.addEventListener('dragleave', () => row.classList.remove('drop-hover'));
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drop-hover');
          const assetId = e.dataTransfer.getData('text/asset-id');
          if (!assetId) return;
          const rect = row.getBoundingClientRect();
          const startTime = Math.max(0, (e.clientX - rect.left) / pxPerSecond);
          addClipToTrack(assetId, track.id, startTime);
        });

        clips.filter(c => c.trackId === track.id).forEach(clip => {
          row.appendChild(renderClipBlock(clip));
        });

        timelineTracks.appendChild(row);
      });

      const ph = playheadTime * pxPerSecond;
      playheadEl.style.left = ph + 'px';
      if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
    }

    function renderClipBlock(clip) {
      const el = document.createElement('div');
      el.className = 'clip-block ' + clip.kind + (clip.id === selectedClipId ? ' selected' : '');
      el.style.left = (clip.start * pxPerSecond) + 'px';
      el.style.width = Math.max(20, clip.duration * pxPerSecond) + 'px';
      el.dataset.clipId = clip.id;

      const label = clip.kind === 'text' ? (clip.text ? clip.text.content : 'Text') :
        (assets.find(a => a.id === clip.assetId) || {}).name || clip.kind;
      el.innerHTML = `
        <div class="clip-handle left"></div>
        <div class="clip-label">${label}</div>
        <div class="clip-handle right"></div>
      `;

      el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('clip-handle')) return; // handled separately below
        e.stopPropagation();
        selectClip(clip.id);
        startClipDrag(e, clip);
      });

      el.querySelector('.clip-handle.left').addEventListener('mousedown', (e) => {
        e.stopPropagation(); selectClip(clip.id); startClipTrim(e, clip, 'left');
      });
      el.querySelector('.clip-handle.right').addEventListener('mousedown', (e) => {
        e.stopPropagation(); selectClip(clip.id); startClipTrim(e, clip, 'right');
      });

      return el;
    }

    function startClipDrag(e, clip) {
      const startX = e.clientX;
      const origStart = clip.start;
      function onMove(ev) {
        const dx = (ev.clientX - startX) / pxPerSecond;
        clip.start = Math.max(0, origStart + dx);
        timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 10);
        renderTimeline();
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    function startClipTrim(e, clip, side) {
      const startX = e.clientX;
      const origStart = clip.start;
      const origDuration = clip.duration;
      function onMove(ev) {
        const dx = (ev.clientX - startX) / pxPerSecond;
        if (side === 'left') {
          const newStart = Math.min(origStart + origDuration - 0.2, Math.max(0, origStart + dx));
          clip.duration = origDuration + (origStart - newStart);
          clip.start = newStart;
        } else {
          clip.duration = Math.max(0.2, origDuration + dx);
        }
        timelineDuration = Math.max(timelineDuration, clip.start + clip.duration + 10);
        renderTimeline();
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    // Playhead scrubbing via ruler + track area click
    function scrubToClientX(clientX) {
      const rect = timelineTracks.getBoundingClientRect();
      const t = Math.max(0, (clientX - rect.left) / pxPerSecond);
      playheadTime = t;
      playheadEl.style.left = (t * pxPerSecond) + 'px';
      updateTransportUI();
      requestFrameRedraw();
    }
    [rulerRow, timelineTracks].forEach(elm => {
      elm.addEventListener('mousedown', (e) => {
        if (e.target.closest('.clip-block')) return;
        scrubToClientX(e.clientX);
        function onMove(ev) { scrubToClientX(ev.clientX); }
        function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    });

    document.getElementById('btnZoomIn').addEventListener('click', () => { pxPerSecond = Math.min(400, pxPerSecond * 1.4); document.getElementById('zoomLabel').textContent = Math.round(pxPerSecond) + 'px/s'; renderTimeline(); });
    document.getElementById('btnZoomOut').addEventListener('click', () => { pxPerSecond = Math.max(10, pxPerSecond / 1.4); document.getElementById('zoomLabel').textContent = Math.round(pxPerSecond) + 'px/s'; renderTimeline(); });

    // ============================================================
    // PROPERTIES PANEL (basic transform — extended in later stage)
    // ============================================================
    function renderPropsPanel() {
      const clip = clips.find(c => c.id === selectedClipId);
      propsPanel.querySelectorAll('.dyn-prop').forEach(n => n.remove());
      if (!clip) {
        propsEmpty.classList.remove('hidden');
        return;
      }
      propsEmpty.classList.add('hidden');

      const wrap = document.createElement('div');
      wrap.className = 'dyn-prop space-y-4';
      wrap.innerHTML = `
        <div>
          <h3 class="text-xs font-semibold text-neutral-100 uppercase tracking-wide mb-2">Transform</h3>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-[10px] text-neutral-300 mb-1"><span>Rotation</span><span id="valRotation">${clip.rotation}°</span></div>
              <input type="range" id="sliderRotation" min="-180" max="180" value="${clip.rotation}" class="w-full accent-neutral-500">
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-neutral-300 mb-1"><span>Scale</span><span id="valScale">${clip.scale.toFixed(2)}x</span></div>
              <input type="range" id="sliderScale" min="0.1" max="3" step="0.01" value="${clip.scale}" class="w-full accent-neutral-500">
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-neutral-300 mb-1"><span>Opacity</span><span id="valOpacity">${clip.opacity}%</span></div>
              <input type="range" id="sliderOpacity" min="0" max="100" value="${clip.opacity}" class="w-full accent-neutral-500">
            </div>
          </div>
        </div>
        ${clip.kind === 'text' ? `
        <div>
          <h3 class="text-xs font-semibold text-neutral-100 uppercase tracking-wide mb-2">Text</h3>
          <textarea id="textContentInput" class="w-full bg-neutral-800 border border-neutral-600 rounded-lg text-xs p-2 text-neutral-300" rows="2">${clip.text.content}</textarea>
          <div class="flex items-center gap-2 mt-2">
            <input type="color" id="textColorInput" value="${clip.text.color}" class="w-8 h-8 rounded bg-neutral-800 border border-neutral-600">
            <input type="range" id="textSizeInput" min="12" max="200" value="${clip.text.size}" class="flex-1 accent-neutral-500">
          </div>
        </div>` : ''}
      `;
      propsPanel.appendChild(wrap);

      document.getElementById('sliderRotation').addEventListener('input', (e) => {
        clip.rotation = parseFloat(e.target.value);
        document.getElementById('valRotation').textContent = clip.rotation + '°';
        requestFrameRedraw();
      });
      document.getElementById('sliderScale').addEventListener('input', (e) => {
        clip.scale = parseFloat(e.target.value);
        document.getElementById('valScale').textContent = clip.scale.toFixed(2) + 'x';
        requestFrameRedraw();
      });
      document.getElementById('sliderOpacity').addEventListener('input', (e) => {
        clip.opacity = parseFloat(e.target.value);
        document.getElementById('valOpacity').textContent = clip.opacity + '%';
        requestFrameRedraw();
      });

      if (clip.kind === 'text') {
        document.getElementById('textContentInput').addEventListener('input', (e) => { clip.text.content = e.target.value; renderTimeline(); requestFrameRedraw(); });
        document.getElementById('textColorInput').addEventListener('input', (e) => { clip.text.color = e.target.value; requestFrameRedraw(); });
        document.getElementById('textSizeInput').addEventListener('input', (e) => { clip.text.size = parseFloat(e.target.value); requestFrameRedraw(); });
      }
    }

    // ============================================================
    // PLAYBACK + RENDER LOOP (base pass — real multi-layer compositor lands Stage 2)
    // ============================================================
    const btnPlay = document.getElementById('btnPlay');
    const playIcon = document.getElementById('playIcon');
    const currentTimeText = document.getElementById('currentTime');
    const totalDurationText = document.getElementById('totalDuration');
    const transportProgress = document.getElementById('transportProgress');

    function updateTransportUI() {
      currentTimeText.textContent = formatDuration(playheadTime);
      totalDurationText.textContent = formatDuration(timelineDuration);
      transportProgress.style.width = Math.min(100, (playheadTime / timelineDuration) * 100) + '%';
      const ph = playheadTime * pxPerSecond;
      playheadEl.style.left = ph + 'px';
    }

    btnPlay.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
      if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
      if (isPlaying) {
        clips.forEach(c => {
          if (c.kind === 'video') {
            const asset = assets.find(a => a.id === c.assetId);
            if (asset && asset.el) { /* per-clip playback sync handled in render loop */ }
          }
        });
        requestAnimationFrame(playLoop);
      }
    });

    let lastTick = null;
    function playLoop(ts) {
      if (!isPlaying) { lastTick = null; return; }
      if (lastTick === null) lastTick = ts;
      const dt = (ts - lastTick) / 1000;
      lastTick = ts;
      playheadTime += dt;
      if (playheadTime > timelineDuration) { playheadTime = 0; }
      updateTransportUI();
      renderComposerFrame();
      requestAnimationFrame(playLoop);
    }

    let frameRequest;
    function requestFrameRedraw() {
      if (frameRequest) cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(renderComposerFrame);
    }

    // Base compositor: draws active clips in track order (z-order), transform-aware.
    // Cutout / chroma-key / bend visual effects are layered on in later stages.
    function renderComposerFrame() {
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = '#171717';
      ctx.fillRect(0, 0, canvasW, canvasH);

      tracks.forEach(track => {
        clips.filter(c => c.trackId === track.id).forEach(clip => {
          const active = playheadTime >= clip.start && playheadTime <= clip.start + clip.duration;
          if (!active) {
            if (clip.kind === 'video') {
              const asset = assets.find(a => a.id === clip.assetId);
              if (asset && asset.el && !asset.el.paused) asset.el.pause();
            }
            return;
          }
          drawClip(clip);
        });
      });

      renderXformOverlay();
    }

    function drawClip(clip) {
      ctx.save();
      ctx.globalAlpha = clip.opacity / 100;
      ctx.translate(clip.x, clip.y);
      ctx.rotate(clip.rotation * Math.PI / 180);
      ctx.scale(clip.scale, clip.scale);

      // Apply freeform cutout clip path (Stage: Draw Cutout tool) before drawing content
      if (clip.cutout && clip.cutout.points && clip.cutout.points.length > 2) {
        ctx.beginPath();
        const pts = clip.cutout.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.clip();
      }

      if (clip.kind === 'text' && clip.text) {
        ctx.fillStyle = clip.text.color;
        ctx.font = `bold ${clip.text.size}px ${clip.text.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (clip.bend && clip.bend.amount) {
          drawBentText(ctx, clip.text, clip.bend.amount);
        } else {
          ctx.fillText(clip.text.content, 0, 0);
        }
      } else {
        const asset = assets.find(a => a.id === clip.assetId);
        if (asset && asset.el) {
          if (clip.kind === 'video') {
            const localT = playheadTime - clip.start;
            if (Math.abs(asset.el.currentTime - localT) > 0.15) {
              try { asset.el.currentTime = Math.min(localT, asset.el.duration || localT); } catch (e) {}
            }
            if (isPlaying && asset.el.paused) asset.el.play().catch(() => {});
            if (!isPlaying && !asset.el.paused) asset.el.pause();
          }
          const w = asset.width || 200, h = asset.height || 200;

          if (clip.bend && clip.bend.amount) {
            drawBentImage(ctx, asset.el, w, h, clip.bend.amount);
          } else if (clip.chroma && clip.chroma.enabled) {
            drawChromaKeyed(ctx, asset.el, w, h, clip.chroma);
          } else {
            ctx.drawImage(asset.el, -w / 2, -h / 2, w, h);
          }
        }
      }
      ctx.restore();
    }

    // ---- Bend/Warp effect (curve inward/outward) ----
    // amount: -100..100, negative curves inward (concave), positive bulges outward (convex)
    function drawBentImage(targetCtx, img, w, h, amount) {
      const strips = 40;
      const maxOffset = (amount / 100) * (h * 0.35);
      for (let i = 0; i < strips; i++) {
        const sx = (i / strips) * w;
        const sw = w / strips + 1;
        const t = (i / (strips - 1)) - 0.5; // -0.5..0.5
        const bow = Math.cos(t * Math.PI) ; // 1 at center, 0 at edges
        const yOffset = -maxOffset * bow;
        targetCtx.drawImage(img, sx * (img.naturalWidth || img.videoWidth || w) / w, 0, (img.naturalWidth || img.videoWidth || w) / strips, (img.naturalHeight || img.videoHeight || h),
          -w / 2 + sx, -h / 2 + yOffset, sw, h);
      }
    }
    function drawBentText(targetCtx, text, amount) {
      const chars = text.content.split('');
      const total = chars.length;
      const spread = Math.min(text.size * total * 0.6, 900);
      const radius = 300 - (amount * 2); // higher |amount| = tighter curve
      targetCtx.save();
      chars.forEach((ch, i) => {
        const t = (i / Math.max(1, total - 1)) - 0.5;
        const angle = t * (amount / 100) * 1.2;
        const x = Math.sin(angle) * spread / 2;
        const y = -Math.cos(angle) * (amount >= 0 ? 1 : -1) * Math.abs(amount) * 1.2 + (amount >= 0 ? Math.abs(amount) * 1.2 : -Math.abs(amount)*1.2);
        targetCtx.save();
        targetCtx.translate(x, y * 0.4);
        targetCtx.rotate(angle);
        targetCtx.fillText(ch, 0, 0);
        targetCtx.restore();
      });
      targetCtx.restore();
    }

    // ---- Chroma Key (color-based cutout, no AI/ML) ----
    const chromaScratch = document.createElement('canvas');
    const chromaScratchCtx = chromaScratch.getContext('2d', { willReadFrequently: true });
    function drawChromaKeyed(targetCtx, mediaEl, w, h, chroma) {
      chromaScratch.width = w; chromaScratch.height = h;
      chromaScratchCtx.clearRect(0, 0, w, h);
      chromaScratchCtx.drawImage(mediaEl, 0, 0, w, h);
      const frame = chromaScratchCtx.getImageData(0, 0, w, h);
      const data = frame.data;
      const keyR = chroma.r, keyG = chroma.g, keyB = chroma.b;
      const tolerance = chroma.tolerance != null ? chroma.tolerance : 40;
      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - keyR, dg = data[i+1] - keyG, db = data[i+2] - keyB;
        const dist = Math.sqrt(dr*dr + dg*dg + db*db);
        if (dist < tolerance) {
          data[i+3] = 0;
        } else if (dist < tolerance + 30) {
          data[i+3] = Math.round(((dist - tolerance) / 30) * 255);
        }
      }
      chromaScratchCtx.putImageData(frame, 0, 0);
      targetCtx.drawImage(chromaScratch, -w / 2, -h / 2, w, h);
    }

    // ============================================================
    // ON-CANVAS TRANSFORM OVERLAY (move / rotate / resize by dragging)
    // ============================================================
    const xformOverlay = document.getElementById('xformOverlay');
    const stageWrap = document.getElementById('stageWrap');

    function canvasToScreenScale() {
      const rect = canvas.getBoundingClientRect();
      return { sx: rect.width / canvasW, sy: rect.height / canvasH, rect };
    }

    function renderXformOverlay() {
      xformOverlay.innerHTML = '';
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip) return;
      const { sx, sy } = canvasToScreenScale();

      const asset = clip.kind === 'text' ? null : assets.find(a => a.id === clip.assetId);
      const baseW = clip.kind === 'text' ? (clip.text.size * (clip.text.content.length || 1) * 0.55) : ((asset && asset.width) || 200);
      const baseH = clip.kind === 'text' ? (clip.text.size * 1.2) : ((asset && asset.height) || 200);
      const w = baseW * clip.scale * sx;
      const h = baseH * clip.scale * sy;
      const cx = clip.x * sx;
      const cy = clip.y * sy;

      const box = document.createElement('div');
      box.style.cssText = `position:absolute; left:${cx - w/2}px; top:${cy - h/2}px; width:${w}px; height:${h}px; border:1.5px dashed rgba(255, 255, 255, 0.12); pointer-events:auto; cursor:move; transform: rotate(${clip.rotation}deg); transform-origin: center center;`;
      box.addEventListener('mousedown', (e) => { e.stopPropagation(); startCanvasMove(e, clip); });

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'xform-handle';
      resizeHandle.style.cssText += `right:-6px; bottom:-6px;`;
      resizeHandle.addEventListener('mousedown', (e) => { e.stopPropagation(); startCanvasResize(e, clip); });

      const rotateHandle = document.createElement('div');
      rotateHandle.className = 'xform-rotate';
      rotateHandle.style.cssText += `left:50%; top:-28px; margin-left:-7px;`;
      rotateHandle.addEventListener('mousedown', (e) => { e.stopPropagation(); startCanvasRotate(e, clip); });

      box.appendChild(resizeHandle);
      box.appendChild(rotateHandle);
      xformOverlay.appendChild(box);
    }

    function startCanvasMove(e, clip) {
      const { sx, sy } = canvasToScreenScale();
      const startX = e.clientX, startY = e.clientY;
      const origX = clip.x, origY = clip.y;
      function onMove(ev) {
        clip.x = origX + (ev.clientX - startX) / sx;
        clip.y = origY + (ev.clientY - startY) / sy;
        renderXformOverlay();
        requestFrameRedraw();
      }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    function startCanvasResize(e, clip) {
      const startX = e.clientX;
      const origScale = clip.scale;
      function onMove(ev) {
        const dx = (ev.clientX - startX) / 150;
        clip.scale = Math.max(0.05, origScale + dx);
        renderXformOverlay();
        renderPropsPanel();
        requestFrameRedraw();
      }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    function startCanvasRotate(e, clip) {
      const rect = canvas.getBoundingClientRect();
      const { sx, sy } = canvasToScreenScale();
      const cx = rect.left + clip.x * sx;
      const cy = rect.top + clip.y * sy;
      function onMove(ev) {
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
        clip.rotation = Math.round(angle + 90);
        renderXformOverlay();
        renderPropsPanel();
        requestFrameRedraw();
      }
      function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    // ============================================================
    // FREEFORM DRAW-CUTOUT TOOL — draw any shape on the stage, resizable,
    // clips the selected layer's content to that path (background stays
    // separate underneath, e.g. for placing text behind a subject).
    // ============================================================
    let isDrawingCutout = false;
    let cutoutPoints = [];
    const cutoutSvgLayer = document.createElement('div');
    cutoutSvgLayer.style.cssText = 'position:absolute; inset:0; pointer-events:none;';
    stageWrap.appendChild(cutoutSvgLayer);

    stageWrap.addEventListener('mousedown', (e) => {
      if (activeTool !== 'freeform-cut' && activeTool !== 'rotoscope') return;
      if (!selectedClipId) {
        triggerAlert('Select A Clip First', 'Choose a clip on the timeline before drawing a cutout shape for it.');
        return;
      }
      isDrawingCutout = true;
      cutoutPoints = [];
      const { rect } = canvasToScreenScale();
      addCutoutPoint(e, rect);
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDrawingCutout) return;
      const { rect } = canvasToScreenScale();
      addCutoutPoint(e, rect);
    });
    window.addEventListener('mouseup', () => {
      if (!isDrawingCutout) return;
      isDrawingCutout = false;
      finalizeCutout();
    });

    function addCutoutPoint(e, rect) {
      const sx = canvasW / rect.width, sy = canvasH / rect.height;
      const x = (e.clientX - rect.left) * sx;
      const y = (e.clientY - rect.top) * sy;
      cutoutPoints.push({ x, y });
      drawCutoutPreview();
    }

    function drawCutoutPreview() {
      const { rect } = canvasToScreenScale();
      const sx = rect.width / canvasW, sy = rect.height / canvasH;
      if (cutoutPoints.length < 2) { cutoutSvgLayer.innerHTML = ''; return; }
      const pathD = 'M ' + cutoutPoints.map(p => `${p.x * sx},${p.y * sy}`).join(' L ');
      cutoutSvgLayer.innerHTML = `<svg width="100%" height="100%" style="position:absolute; inset:0;">
        <path d="${pathD}" fill="rgba(255, 255, 255,0.15)" stroke="rgb(180, 180, 180)" stroke-width="2" stroke-dasharray="6,4" />
      </svg>`;
    }

    function finalizeCutout() {
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip || cutoutPoints.length < 3) { cutoutSvgLayer.innerHTML = ''; cutoutPoints = []; return; }

      // Store points relative to the clip's local (untransformed) space so the
      // cutout path travels with the clip when it's moved/rotated/scaled.
      const local = cutoutPoints.map(p => ({
        x: (p.x - clip.x) / clip.scale,
        y: (p.y - clip.y) / clip.scale
      }));

      if (activeTool === 'freeform-cut') {
        clip.cutout = { points: local };
        triggerAlert('Cutout Applied', 'The drawn shape now clips this clip\u2019s visible area. Draw again to redo, or select another clip.');
      } else if (activeTool === 'rotoscope') {
        clip.cutout = { points: local, rotoscoped: true };
        triggerAlert('Rotoscope Outline Set', 'Manual subject outline applied as a clip mask for this clip.');
      }

      cutoutSvgLayer.innerHTML = '';
      cutoutPoints = [];
      requestFrameRedraw();
    }

    // ============================================================
    // CHROMA KEY TOOL — pick a key color (eyedropper on canvas or swatch),
    // set tolerance, apply to selected clip. No AI/ML — pure color distance.
    // ============================================================
    function openChromaKeyPicker() {
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip) {
        triggerAlert('Select A Clip First', 'Choose a video or image clip to apply chroma key to.');
        return;
      }
      if (clip.kind === 'text') {
        triggerAlert('Not Applicable', 'Chroma key applies to video or image clips, not text.');
        return;
      }

      closeToolPopover();
      const pop = document.createElement('div');
      pop.id = 'toolPopover';
      pop.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-600 rounded-xl p-4 shadow-2xl z-[130] w-72 space-y-3';
      const current = clip.chroma || { r: 0, g: 255, b: 0, tolerance: 40, enabled: false };
      const hex = '#' + [current.r, current.g, current.b].map(v => v.toString(16).padStart(2, '0')).join('');
      pop.innerHTML = `
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-semibold text-neutral-100">Chroma Key</h4>
          <button id="closeChromaPop" class="text-neutral-400 hover:text-neutral-100"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>
        <div class="flex items-center gap-2">
          <input type="color" id="chromaColorInput" value="${hex}" class="w-9 h-9 rounded bg-neutral-800 border border-neutral-600">
          <button id="chromaEyedrop" class="flex-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 py-2 rounded-lg flex items-center justify-center gap-1"><i data-lucide="pipette" class="w-3.5 h-3.5"></i> Pick From Stage</button>
        </div>
        <div>
          <div class="flex justify-between text-[10px] text-neutral-300 mb-1"><span>Tolerance</span><span id="chromaTolVal">${current.tolerance}</span></div>
          <input type="range" id="chromaTolInput" min="5" max="150" value="${current.tolerance}" class="w-full accent-neutral-500">
        </div>
        <button id="chromaApplyBtn" class="w-full bg-neutral-600 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold py-2 rounded-lg">${current.enabled ? 'Update' : 'Apply'} Chroma Key</button>
        ${current.enabled ? `<button id="chromaRemoveBtn" class="w-full text-[11px] text-neutral-300 hover:text-neutral-300">Remove Chroma Key</button>` : ''}
      `;
      document.body.appendChild(pop);
      if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }

      let pending = { ...current };

      document.getElementById('closeChromaPop').addEventListener('click', closeToolPopover);
      document.getElementById('chromaColorInput').addEventListener('input', (e) => {
        const v = e.target.value;
        pending.r = parseInt(v.substr(1,2), 16);
        pending.g = parseInt(v.substr(3,2), 16);
        pending.b = parseInt(v.substr(5,2), 16);
      });
      document.getElementById('chromaTolInput').addEventListener('input', (e) => {
        pending.tolerance = parseInt(e.target.value);
        document.getElementById('chromaTolVal').textContent = pending.tolerance;
      });
      document.getElementById('chromaEyedrop').addEventListener('click', () => {
        triggerAlert('Pick A Color', 'Click anywhere on the stage to sample that pixel as the key color.');
        const handler = (e) => {
          const rect = canvas.getBoundingClientRect();
          const sx = canvasW / rect.width, sy = canvasH / rect.height;
          const x = Math.round((e.clientX - rect.left) * sx);
          const y = Math.round((e.clientY - rect.top) * sy);
          const px = ctx.getImageData(x, y, 1, 1).data;
          pending.r = px[0]; pending.g = px[1]; pending.b = px[2];
          document.getElementById('chromaColorInput').value = '#' + [px[0],px[1],px[2]].map(v => v.toString(16).padStart(2,'0')).join('');
          canvas.removeEventListener('click', handler);
        };
        canvas.addEventListener('click', handler, { once: true });
      });
      document.getElementById('chromaApplyBtn').addEventListener('click', () => {
        pending.enabled = true;
        clip.chroma = { ...pending };
        requestFrameRedraw();
        triggerAlert('Chroma Key Applied', 'The key color is now transparent on this clip.');
        closeToolPopover();
      });
      const removeBtn = document.getElementById('chromaRemoveBtn');
      if (removeBtn) removeBtn.addEventListener('click', () => {
        clip.chroma = null;
        requestFrameRedraw();
        closeToolPopover();
      });
    }

    // ============================================================
    // BEND / WARP TOOL — curve text or media inward/outward
    // ============================================================
    function openBendControls() {
      const clip = clips.find(c => c.id === selectedClipId);
      if (!clip) {
        triggerAlert('Select A Clip First', 'Choose a clip to apply the bend/warp effect to.');
        return;
      }
      closeToolPopover();
      const pop = document.createElement('div');
      pop.id = 'toolPopover';
      pop.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-600 rounded-xl p-4 shadow-2xl z-[130] w-72 space-y-3';
      const current = clip.bend || { amount: 0 };
      pop.innerHTML = `
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-semibold text-neutral-100">Bend / Warp</h4>
          <button id="closeBendPop" class="text-neutral-400 hover:text-neutral-100"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>
        <p class="text-[10px] text-neutral-400">Negative curves inward, positive bulges outward.</p>
        <div>
          <div class="flex justify-between text-[10px] text-neutral-300 mb-1"><span>Amount</span><span id="bendVal">${current.amount}</span></div>
          <input type="range" id="bendInput" min="-100" max="100" value="${current.amount}" class="w-full accent-neutral-500">
        </div>
        <button id="bendResetBtn" class="w-full text-[11px] text-neutral-300 hover:text-neutral-100">Reset to Flat</button>
      `;
      document.body.appendChild(pop);
      if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }

      document.getElementById('closeBendPop').addEventListener('click', closeToolPopover);
      document.getElementById('bendInput').addEventListener('input', (e) => {
        const amt = parseInt(e.target.value);
        document.getElementById('bendVal').textContent = amt;
        clip.bend = { amount: amt };
        requestFrameRedraw();
      });
      document.getElementById('bendResetBtn').addEventListener('click', () => {
        clip.bend = { amount: 0 };
        document.getElementById('bendInput').value = 0;
        document.getElementById('bendVal').textContent = 0;
        requestFrameRedraw();
      });
    }

    function closeToolPopover() {
      const existing = document.getElementById('toolPopover');
      if (existing) existing.remove();
    }

    // ============================================================
    // TOOL RAIL
    // ============================================================
    let activeTool = 'select';
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTool = btn.dataset.tool;
        closeToolPopover();

        if (activeTool === 'chromakey') {
          openChromaKeyPicker();
        } else if (activeTool === 'bend') {
          openBendControls();
        } else if (activeTool === 'freeform-cut' || activeTool === 'rotoscope') {
          if (!selectedClipId) {
            triggerAlert('Select A Clip First', 'Choose a clip on the timeline, then draw your shape directly on the stage.');
          } else {
            triggerAlert(activeTool === 'freeform-cut' ? 'Draw Cutout' : 'Rotoscope', 'Click and drag on the stage to trace the region. Release to apply.');
          }
        }
      });
    });

    // ============================================================
    // ALERT UI
    // ============================================================
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

    // ============================================================
    // EXPORT (MediaRecorder real-time capture of the composited canvas)
    // ============================================================
    let mediaRecorder = null;
    let recordedChunks = [];
    let isExporting = false;
    const exportModal = document.getElementById('exportModal');
    const renderProgressBar = document.getElementById('renderProgressBar');
    const renderProgressPercent = document.getElementById('renderProgressPercent');
    const renderFrameText = document.getElementById('renderFrameText');

    document.getElementById('btnExport').addEventListener('click', startExport);
    document.getElementById('btnAbortExport').addEventListener('click', abortExport);

    function startExport() {
      if (clips.length === 0) {
        triggerAlert('Nothing To Export', 'Add at least one clip to the timeline first.');
        return;
      }
      recordedChunks = [];
      isExporting = true;
      playheadTime = 0;
      exportModal.classList.remove('hidden');
      exportModal.classList.add('flex');

      const stream = canvas.captureStream(30);
      let options = { mimeType: 'video/webm; codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm; codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' };

      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (err) {
        triggerAlert('Codec Exception', 'Failed to initiate browser MediaRecorder codecs.');
        abortExport();
        return;
      }

      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `envizion_export_${Date.now()}.webm`;
          document.body.appendChild(a); a.click();
          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        }
        exportModal.classList.add('hidden');
        exportModal.classList.remove('flex');
        isExporting = false;
      };

      mediaRecorder.start();
      trackExportProgress();
    }

    function trackExportProgress() {
      if (!isExporting) return;
      playheadTime += 1 / 30;
      renderComposerFrame();
      updateTransportUI();
      const pct = Math.min(100, Math.floor((playheadTime / timelineDuration) * 100));
      renderProgressBar.style.width = pct + '%';
      renderProgressPercent.textContent = pct + '%';
      renderFrameText.textContent = `Compiling: ${formatDuration(playheadTime)} / ${formatDuration(timelineDuration)}`;

      if (playheadTime >= timelineDuration) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      } else {
        requestAnimationFrame(trackExportProgress);
      }
    }

    function abortExport() {
      isExporting = false;
      exportModal.classList.add('hidden');
      exportModal.classList.remove('flex');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }

    // ============================================================
    // BOARD HANDOFF — auto-import assets sent from the infinite board
    // Adapted from the single-slot version: now creates an asset + a
    // clip on a fresh track per item, instead of filling 1 video/1 image slot.
    // ============================================================
    (function initBoardHandoff() {
      function extractHandoffId() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('handoff')) return params.get('handoff');
        const path = window.location.pathname;
        const marker = 'local_video_image_mask_merger.html/';
        const idx = path.indexOf(marker);
        if (idx !== -1) {
          const rest = path.slice(idx + marker.length).replace(/\/+$/, '');
          if (rest) return decodeURIComponent(rest);
        }
        return null;
      }

      const handoffId = extractHandoffId();
      if (!handoffId) return;

      const req = indexedDB.open('envizion_studio_db', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handoffs')) db.createObjectStore('handoffs', { keyPath: 'id' });
      };
      req.onerror = () => triggerAlert('Handoff Unavailable', 'Could not open local storage to retrieve items sent from the board.');
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handoffs')) {
          triggerAlert('Nothing To Load', 'No board handoff data found in local storage.');
          return;
        }
        const tx = db.transaction('handoffs', 'readonly');
        const getReq = tx.objectStore('handoffs').get(handoffId);
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (!record || !Array.isArray(record.assets) || record.assets.length === 0) {
            triggerAlert('Nothing To Load', 'That board handoff had no usable media in it.');
            return;
          }
          const usable = record.assets.filter(a => (a.type === 'video' || a.type === 'image') && a.url);
          if (usable.length === 0) {
            triggerAlert('Unsupported Layers', 'The sent items were text/sticky notes, not video or image — nothing to load here.');
            return;
          }
          const track = addTrack('From Board');
          let cursor = 0;
          usable.forEach(item => {
            const asset = addAssetFromDataUrl(item.url, item.type, `Board ${item.type}`);
            const watcher = setInterval(() => {
              if (asset.el) {
                clearInterval(watcher);
                addClipToTrack(asset.id, track.id, cursor);
                cursor += asset.duration || 5;
              }
            }, 80);
          });
          triggerAlert('Loaded From Board', `Imported ${usable.length} item(s) onto a new track.`);
        };
        getReq.onerror = () => triggerAlert('Handoff Unavailable', 'Could not read the sent items from local storage.');
      };
    })();

    // ============================================================
    // INIT
    // ============================================================
    addTrack('Track 1');
    renderTimeline();
    updateTransportUI();
    resBadge.textContent = `Resolution: ${canvasW}x${canvasH}`;

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
