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
