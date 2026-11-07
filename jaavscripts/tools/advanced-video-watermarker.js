(function () {
  "use strict";

  const storageKey = "envizion-advanced-video-watermarker-intro-hidden";
  const defaultLayer = {
    text: "Envizion Work",
    x: 0.5,
    y: 0.5,
    size: 46,
    opacity: 0.74,
    rotation: 0,
    color: "#ffffff",
    accent: "#38bdf8",
    font: "Inter, system-ui, sans-serif",
    effect: "light",
    start: 0,
    end: 0,
    phase: 0
  };
  const els = {
    input: document.getElementById("videoInput"),
    addLayerBtn: document.getElementById("addLayerBtn"),
    duplicateLayerBtn: document.getElementById("duplicateLayerBtn"),
    deleteLayerBtn: document.getElementById("deleteLayerBtn"),
    layerList: document.getElementById("layerList"),
    text: document.getElementById("watermarkText"),
    effect: document.getElementById("effectSelect"),
    font: document.getElementById("fontSelect"),
    color: document.getElementById("colorInput"),
    accent: document.getElementById("accentInput"),
    opacity: document.getElementById("opacityRange"),
    opacityLabel: document.getElementById("opacityLabel"),
    size: document.getElementById("sizeRange"),
    sizeLabel: document.getElementById("sizeLabel"),
    rotation: document.getElementById("rotationRange"),
    rotationLabel: document.getElementById("rotationLabel"),
    start: document.getElementById("startInput"),
    end: document.getElementById("endInput"),
    previewBtn: document.getElementById("previewBtn"),
    renderBtn: document.getElementById("renderBtn"),
    downloadLink: document.getElementById("downloadLink"),
    status: document.getElementById("statusLine"),
    progress: document.getElementById("progressBar"),
    canvas: document.getElementById("previewCanvas"),
    video: document.getElementById("sourceVideo"),
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
  const ctx = els.canvas.getContext("2d");
  let layers = [];
  let selectedId = "";
  let previewing = false;
  let renderInProgress = false;
  let sourceUrl = "";
  let confirmResolve = null;
  let dragging = null;

  function init() {
    setFooterYear();
    wireIntro();
    wireConfirm();
    wireAds();
    addLayer();
    drawEmpty();
    els.input.addEventListener("change", loadVideo);
    els.addLayerBtn.addEventListener("click", addLayer);
    els.duplicateLayerBtn.addEventListener("click", duplicateSelectedLayer);
    els.deleteLayerBtn.addEventListener("click", deleteSelectedLayer);
    [els.text, els.effect, els.font, els.color, els.accent, els.opacity, els.size, els.rotation, els.start, els.end].forEach((input) => {
      input.addEventListener("input", updateSelectedFromControls);
    });
    els.previewBtn.addEventListener("click", togglePreview);
    els.renderBtn.addEventListener("click", renderVideo);
    els.canvas.addEventListener("pointerdown", beginDrag);
    els.canvas.addEventListener("pointermove", moveDrag);
    els.canvas.addEventListener("pointerup", endDrag);
    els.canvas.addEventListener("pointercancel", endDrag);
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

  function addLayer() {
    const offset = layers.length * 0.06;
    const layer = {
      ...defaultLayer,
      id: crypto.randomUUID ? crypto.randomUUID() : `layer-${Date.now()}-${Math.random()}`,
      text: layers.length ? `Watermark ${layers.length + 1}` : defaultLayer.text,
      x: clamp(defaultLayer.x + offset, 0.08, 0.92),
      y: clamp(defaultLayer.y + offset, 0.1, 0.9),
      phase: Math.random() * Math.PI * 2
    };
    layers.push(layer);
    selectedId = layer.id;
    syncControls();
    renderLayerList();
    drawFrame(currentTime());
    setStatus(`Added ${layer.text}. Drag it in the preview to position it.`);
  }

  function duplicateSelectedLayer() {
    const selected = getSelectedLayer();
    if (!selected) return;
    const clone = {
      ...selected,
      id: crypto.randomUUID ? crypto.randomUUID() : `layer-${Date.now()}-${Math.random()}`,
      text: `${selected.text} copy`,
      x: clamp(selected.x + 0.05, 0.05, 0.95),
      y: clamp(selected.y + 0.05, 0.06, 0.94),
      phase: Math.random() * Math.PI * 2
    };
    layers.push(clone);
    selectedId = clone.id;
    syncControls();
    renderLayerList();
    drawFrame(currentTime());
  }

  function deleteSelectedLayer() {
    if (layers.length <= 1) {
      setStatus("Keep at least one watermark layer.", true);
      return;
    }
    layers = layers.filter((layer) => layer.id !== selectedId);
    selectedId = layers[0].id;
    syncControls();
    renderLayerList();
    drawFrame(currentTime());
  }

  function renderLayerList() {
    els.layerList.innerHTML = layers.map((layer, index) => `
      <button class="layer-chip ${layer.id === selectedId ? "active" : ""}" type="button" data-id="${layer.id}">
        <span>${index + 1}</span>
        <strong>${escapeHtml(layer.text || "Untitled watermark")}</strong>
      </button>
    `).join("");
    els.layerList.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedId = button.dataset.id;
        syncControls();
        renderLayerList();
        drawFrame(currentTime());
      });
    });
  }

  function syncControls() {
    const layer = getSelectedLayer();
    if (!layer) return;
    els.text.value = layer.text;
    els.effect.value = layer.effect;
    els.font.value = layer.font;
    els.color.value = layer.color;
    els.accent.value = layer.accent;
    els.opacity.value = Math.round(layer.opacity * 100);
    els.size.value = layer.size;
    els.rotation.value = layer.rotation;
    els.start.value = layer.start;
    els.end.value = layer.end;
    updateLabels(layer);
  }

  function updateSelectedFromControls() {
    const layer = getSelectedLayer();
    if (!layer) return;
    layer.text = els.text.value || "Watermark";
    layer.effect = els.effect.value;
    layer.font = els.font.value;
    layer.color = els.color.value;
    layer.accent = els.accent.value;
    layer.opacity = Number(els.opacity.value) / 100;
    layer.size = Number(els.size.value);
    layer.rotation = Number(els.rotation.value);
    layer.start = Math.max(0, Number(els.start.value) || 0);
    layer.end = Math.max(0, Number(els.end.value) || 0);
    updateLabels(layer);
    renderLayerList();
    drawFrame(currentTime());
  }

  function updateLabels(layer) {
    const active = layer || getSelectedLayer() || defaultLayer;
    els.opacityLabel.textContent = `${Math.round(active.opacity * 100)}%`;
    els.sizeLabel.textContent = active.size;
    els.rotationLabel.textContent = active.rotation;
  }

  function loadVideo() {
    const file = els.input.files && els.input.files[0];
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    els.video.src = sourceUrl;
    els.downloadLink.classList.add("hidden");
    els.video.addEventListener("loadedmetadata", () => {
      fitCanvasToVideo();
      drawFrame(0);
      setStatus(`Loaded ${file.name}. Duration: ${formatTime(els.video.duration)}.`);
      setProgress(0);
    }, { once: true });
  }

  function fitCanvasToVideo() {
    const width = els.video.videoWidth || 1280;
    const height = els.video.videoHeight || 720;
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / width);
    els.canvas.width = Math.max(320, Math.round(width * scale));
    els.canvas.height = Math.max(180, Math.round(height * scale));
  }

  function beginDrag(event) {
    const point = canvasPoint(event);
    const hit = hitTest(point.x, point.y);
    if (!hit) return;
    event.preventDefault();
    selectedId = hit.id;
    const layer = getSelectedLayer();
    dragging = {
      id: hit.id,
      dx: point.x - layer.x * els.canvas.width,
      dy: point.y - layer.y * els.canvas.height
    };
    els.canvas.setPointerCapture(event.pointerId);
    syncControls();
    renderLayerList();
    drawFrame(currentTime());
  }

  function moveDrag(event) {
    if (!dragging) return;
    const layer = getSelectedLayer();
    if (!layer) return;
    const point = canvasPoint(event);
    layer.x = clamp((point.x - dragging.dx) / els.canvas.width, 0, 1);
    layer.y = clamp((point.y - dragging.dy) / els.canvas.height, 0, 1);
    drawFrame(currentTime());
  }

  function endDrag(event) {
    if (!dragging) return;
    try {
      els.canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      console.warn("Pointer capture release skipped", error);
    }
    dragging = null;
  }

  function hitTest(x, y) {
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const layer = layers[i];
      const bounds = layerBounds(layer);
      if (x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h) {
        return layer;
      }
    }
    return null;
  }

  function layerBounds(layer) {
    ctx.save();
    ctx.font = fontFor(layer);
    const width = Math.max(ctx.measureText(layer.text || "Watermark").width + layer.size * 1.1, layer.size * 3);
    ctx.restore();
    const height = layer.size * 1.8;
    return {
      x: layer.x * els.canvas.width - width / 2,
      y: layer.y * els.canvas.height - height / 2,
      w: width,
      h: height
    };
  }

  function canvasPoint(event) {
    const rect = els.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * els.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * els.canvas.height
    };
  }

  function togglePreview() {
    if (!els.video.src) {
      setStatus("Choose a video first.", true);
      return;
    }
    previewing = !previewing;
    els.previewBtn.textContent = previewing ? "Pause Preview" : "Preview Motion";
    if (previewing) {
      els.video.muted = true;
      els.video.play().catch(() => setStatus("Click preview again if the browser paused playback.", true));
      requestAnimationFrame(previewLoop);
    } else {
      els.video.pause();
      drawFrame(currentTime());
    }
  }

  function previewLoop(time) {
    if (!previewing) return;
    drawFrame(time / 1000);
    if (els.video.ended) {
      els.video.currentTime = 0;
      els.video.play().catch(() => undefined);
    }
    requestAnimationFrame(previewLoop);
  }

  async function renderVideo() {
    if (!els.video.src) {
      setStatus("Choose a video first.", true);
      return;
    }
    if (!window.MediaRecorder || !els.canvas.captureStream) {
      setStatus("This browser does not support canvas video recording.", true);
      return;
    }
    const activeCount = layers.length;
    const ok = await ask("Render watermarked video?", `This will record ${formatTime(els.video.duration)} of video in real time with ${activeCount} editable watermark layer${activeCount === 1 ? "" : "s"}.`);
    if (!ok) return;

    renderInProgress = true;
    previewing = false;
    els.previewBtn.textContent = "Preview Motion";
    els.video.pause();
    els.downloadLink.classList.add("hidden");
    toggleBusy(true);

    try {
      await seekVideo(0);
      drawFrame(0);
      const canvasStream = els.canvas.captureStream(30);
      const stream = new MediaStream(canvasStream.getVideoTracks());
      const sourceStream = getSourceStream();
      if (sourceStream) {
        sourceStream.getAudioTracks().forEach((track) => stream.addTrack(track));
      }
      const mimeType = bestMimeType();
      const options = mimeType ? { mimeType, videoBitsPerSecond: 6500000 } : { videoBitsPerSecond: 6500000 };
      const recorder = new MediaRecorder(stream, options);
      const chunks = [];
      let animationId = 0;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      });
      const recorderError = new Promise((resolve, reject) => {
        recorder.addEventListener("error", (event) => reject(event.error || new Error("The browser recorder failed.")), { once: true });
      });
      const stopped = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
      const ended = new Promise((resolve) => els.video.addEventListener("ended", resolve, { once: true }));
      recorder.start(200);
      await els.video.play();

      const drawing = new Promise((resolve) => {
        function tick(now) {
          drawFrame(now / 1000);
          const progress = els.video.duration ? (els.video.currentTime / els.video.duration) * 100 : 0;
          setProgress(progress);
          setStatus(`Rendering ${Math.round(progress)}%... keep this tab open.`);
          if (!renderInProgress || els.video.ended) {
            resolve();
            return;
          }
          animationId = requestAnimationFrame(tick);
        }
        animationId = requestAnimationFrame(tick);
      });

      await Promise.race([
        ended,
        drawing,
        recorderError,
        waitForRenderTimeout()
      ]);
      if (animationId) cancelAnimationFrame(animationId);
      if (recorder.state !== "inactive") {
        recorder.requestData();
        recorder.stop();
      }
      await stopped;
      renderInProgress = false;
      stream.getTracks().forEach((track) => track.stop());
      if (!chunks.length) {
        throw new Error("The browser produced an empty recording. Try a shorter video or use Chrome/Edge with WebM recording support.");
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      els.downloadLink.href = url;
      els.downloadLink.download = `${baseName(els.input.files[0].name)}-watermarked.webm`;
      els.downloadLink.classList.remove("hidden");
      els.downloadLink.click();
      setProgress(100);
      setStatus("Render complete. If the download did not start automatically, use the download button.");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Video render failed.", true);
    } finally {
      renderInProgress = false;
      els.video.pause();
      toggleBusy(false);
    }
  }

  function getSourceStream() {
    try {
      if (typeof els.video.captureStream === "function") {
        return els.video.captureStream();
      }
      if (typeof els.video.mozCaptureStream === "function") {
        return els.video.mozCaptureStream();
      }
    } catch (error) {
      console.warn("Could not capture source audio", error);
    }
    return null;
  }

  function bestMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function drawEmpty() {
    const gradient = ctx.createLinearGradient(0, 0, els.canvas.width, els.canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#1e293b");
    gradient.addColorStop(1, "#0f766e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "800 34px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Choose a video, then drag the watermark layer", els.canvas.width / 2, els.canvas.height / 2);
    drawAllWatermarks(performance.now() / 1000);
  }

  function drawFrame(time) {
    if (!els.video.src || !els.video.videoWidth) {
      drawEmpty();
      return;
    }
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    ctx.drawImage(els.video, 0, 0, els.canvas.width, els.canvas.height);
    drawAllWatermarks(time);
  }

  function drawAllWatermarks(time) {
    const videoTime = Number.isFinite(els.video.currentTime) ? els.video.currentTime : 0;
    layers.forEach((layer) => {
      if (!isLayerVisible(layer, videoTime)) return;
      drawWatermark(layer, time, layer.id === selectedId && !renderInProgress);
    });
  }

  function isLayerVisible(layer, videoTime) {
    if (videoTime < layer.start) return false;
    return !layer.end || videoTime <= layer.end;
  }

  function drawWatermark(layer, time, selected) {
    ctx.save();
    const pulse = Math.sin(time * 1.8 + layer.phase);
    const sweep = (Math.sin(time * 1.7 + layer.phase) + 1) / 2;
    const x = layer.x * els.canvas.width;
    const y = layer.y * els.canvas.height;
    const wiggle = layer.effect === "none" ? 0 : 1;
    ctx.translate(x + Math.cos(time + layer.phase) * 4 * wiggle, y + Math.sin(time * 0.8 + layer.phase) * 4 * wiggle);
    ctx.rotate((layer.rotation * Math.PI) / 180 + pulse * 0.025 * wiggle);
    ctx.globalAlpha = layer.opacity;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (layer.effect === "none") drawStill(layer);
    if (layer.effect === "wave") drawWaveText(layer, time);
    if (layer.effect === "light") drawLightSweep(layer, sweep);
    if (layer.effect === "glow") drawGlow(layer, pulse);
    if (layer.effect === "orbit") drawOrbit(layer, time);
    if (layer.effect === "glass") drawGlass(layer, sweep);
    if (layer.effect === "stamp") drawStamp(layer, pulse);
    if (layer.effect === "lower") drawLowerThird(layer);
    if (layer.effect === "spark") drawSpark(layer, time);
    if (layer.effect === "serif") drawSerif(layer, pulse);
    if (layer.effect === "prism") drawPrism(layer, pulse);
    if (selected) drawSelection(layer);
    ctx.restore();
  }

  function drawStill(layer) {
    ctx.font = fontFor(layer);
    ctx.fillStyle = layer.color;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(4, layer.size * 0.14);
    ctx.fillText(layer.text, 0, 0);
  }

  function drawWaveText(layer, time) {
    ctx.font = fontFor(layer);
    const text = layer.text;
    const spacing = layer.size * 0.62;
    const start = -((text.length - 1) * spacing) / 2;
    for (let i = 0; i < text.length; i += 1) {
      const y = Math.sin(time * 3 + i * 0.7 + layer.phase) * layer.size * 0.22;
      ctx.fillStyle = i % 2 ? layer.accent : layer.color;
      ctx.fillText(text[i], start + i * spacing, y);
    }
  }

  function drawLightSweep(layer, sweep) {
    ctx.font = fontFor(layer);
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, 0);
    const width = ctx.measureText(layer.text).width + layer.size;
    const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    gradient.addColorStop(Math.max(0, sweep - 0.2), "rgba(255,255,255,0)");
    gradient.addColorStop(sweep, layer.accent);
    gradient.addColorStop(Math.min(1, sweep + 0.2), "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillText(layer.text, 0, 0);
  }

  function drawGlow(layer, pulse) {
    ctx.font = fontFor(layer);
    ctx.shadowColor = layer.accent;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, 0);
    ctx.strokeStyle = layer.accent;
    ctx.lineWidth = 2;
    ctx.strokeText(layer.text, 0, 0);
  }

  function drawOrbit(layer, time) {
    ctx.font = fontFor(layer);
    const radius = layer.size * 0.9;
    ctx.strokeStyle = layer.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 2.6, radius, Math.sin(time + layer.phase) * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, 0);
  }

  function drawGlass(layer, sweep) {
    ctx.font = fontFor(layer);
    const width = ctx.measureText(layer.text).width + layer.size;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(-width / 2, -layer.size * 0.82, width, layer.size * 1.62);
    ctx.strokeStyle = layer.accent;
    ctx.strokeRect(-width / 2, -layer.size * 0.82, width, layer.size * 1.62);
    ctx.fillStyle = sweep > 0.55 ? layer.accent : layer.color;
    ctx.fillText(layer.text, 0, 0);
  }

  function drawStamp(layer, pulse) {
    ctx.font = `1000 ${layer.size}px ${layer.font}`;
    ctx.scale(1 + pulse * 0.035, 1 + pulse * 0.035);
    ctx.strokeStyle = "rgba(0,0,0,0.82)";
    ctx.lineWidth = Math.max(4, layer.size * 0.14);
    ctx.strokeText(layer.text.toUpperCase(), 0, 0);
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text.toUpperCase(), 0, 0);
  }

  function drawLowerThird(layer) {
    ctx.font = fontFor(layer);
    const width = ctx.measureText(layer.text).width + layer.size * 1.5;
    ctx.fillStyle = hexToRgba(layer.accent, 0.58);
    ctx.fillRect(-width / 2, -layer.size, width, layer.size * 1.65);
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, -layer.size * 0.1);
  }

  function drawSpark(layer, time) {
    ctx.font = fontFor(layer);
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, 0);
    ctx.fillStyle = layer.accent;
    for (let i = 0; i < 9; i += 1) {
      const angle = time * 1.8 + layer.phase + i;
      const radius = layer.size * (0.6 + (i % 4) * 0.24);
      ctx.fillRect(Math.cos(angle) * radius, Math.sin(angle * 1.3) * radius * 0.5, 3, 3);
    }
  }

  function drawSerif(layer, pulse) {
    ctx.font = `800 ${layer.size}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(layer.text, 3 + pulse * 2, 3);
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, 0);
    ctx.strokeStyle = layer.accent;
    ctx.lineWidth = 1;
    ctx.strokeText(layer.text, 0, 0);
  }

  function drawPrism(layer, pulse) {
    ctx.font = fontFor(layer);
    ctx.fillStyle = hexToRgba(layer.accent, 0.72);
    ctx.fillText(layer.text, -3 - pulse * 3, 0);
    ctx.fillStyle = "rgba(56,189,248,0.72)";
    ctx.fillText(layer.text, 3 + pulse * 3, 0);
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, 0, 0);
  }

  function drawSelection(layer) {
    const bounds = layerBounds(layer);
    const localX = bounds.x + bounds.w / 2 - layer.x * els.canvas.width;
    const localY = bounds.y + bounds.h / 2 - layer.y * els.canvas.height;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#2dd4bf";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(localX - bounds.w / 2, localY - bounds.h / 2, bounds.w, bounds.h);
    ctx.setLineDash([]);
  }

  function fontFor(layer) {
    return `900 ${layer.size}px ${layer.font}`;
  }

  function getSelectedLayer() {
    return layers.find((layer) => layer.id === selectedId) || layers[0];
  }

  function currentTime() {
    return previewing ? performance.now() / 1000 : (Number.isFinite(els.video.currentTime) ? els.video.currentTime : performance.now() / 1000);
  }

  function toggleBusy(isBusy) {
    els.renderBtn.disabled = isBusy;
    els.previewBtn.disabled = isBusy;
    els.addLayerBtn.disabled = isBusy;
    els.duplicateLayerBtn.disabled = isBusy;
    els.deleteLayerBtn.disabled = isBusy;
  }

  function setProgress(value) {
    els.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.style.color = isError ? "#fb7185" : "";
  }

  function seekVideo(time) {
    return new Promise((resolve) => {
      if (els.video.readyState < 1) {
        els.video.addEventListener("loadedmetadata", () => seekVideo(time).then(resolve), { once: true });
        return;
      }
      const target = Math.min(Math.max(0, time), Math.max(0, (els.video.duration || 0) - 0.05));
      if (Math.abs(els.video.currentTime - target) < 0.03 && els.video.readyState >= 2) {
        resolve();
        return;
      }
      const done = () => resolve();
      els.video.addEventListener("seeked", done, { once: true });
      els.video.currentTime = target;
    });
  }

  function waitForRenderTimeout() {
    const duration = Number.isFinite(els.video.duration) ? els.video.duration : 60;
    return new Promise((resolve) => setTimeout(resolve, (duration + 3) * 1000));
  }

  function baseName(name) {
    return name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-");
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "unknown length";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
