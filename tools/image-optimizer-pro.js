(function () {
  "use strict";

  const storageKey = "envizion-image-optimizer-pro-intro-hidden";
  const els = {
    input: document.getElementById("imageInput"),
    dropZone: document.getElementById("dropZone"),
    format: document.getElementById("formatSelect"),
    upscale: document.getElementById("upscaleRange"),
    upscaleLabel: document.getElementById("upscaleLabel"),
    maxWidth: document.getElementById("maxWidthInput"),
    quality: document.getElementById("qualityRange"),
    qualityLabel: document.getElementById("qualityLabel"),
    processBtn: document.getElementById("processBtn"),
    clearBtn: document.getElementById("clearBtn"),
    downloadAllBtn: document.getElementById("downloadAllBtn"),
    folderBtn: document.getElementById("folderBtn"),
    zipBtn: document.getElementById("zipBtn"),
    grid: document.getElementById("resultGrid"),
    status: document.getElementById("statusLine"),
    progress: document.getElementById("progressBar"),
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
  let files = [];
  let results = [];
  let confirmResolve = null;

  function init() {
    setFooterYear();
    wireIntro();
    wireConfirm();
    wireAds();
    updateLabels();
    renderResults();
    els.input.addEventListener("change", () => addFiles(els.input.files));
    els.dropZone.addEventListener("dragover", onDragOver);
    els.dropZone.addEventListener("drop", onDrop);
    els.upscale.addEventListener("input", updateLabels);
    els.quality.addEventListener("input", updateLabels);
    els.processBtn.addEventListener("click", processImages);
    els.clearBtn.addEventListener("click", clearAll);
    els.downloadAllBtn.addEventListener("click", downloadAll);
    els.folderBtn.addEventListener("click", saveFolder);
    els.zipBtn.addEventListener("click", downloadZip);
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

  function onDragOver(event) {
    event.preventDefault();
    els.dropZone.style.borderColor = "rgba(15, 118, 110, 0.65)";
  }

  function onDrop(event) {
    event.preventDefault();
    els.dropZone.style.borderColor = "";
    addFiles(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/")));
  }

  function addFiles(fileList) {
    files = files.concat(Array.from(fileList || []).filter((file) => file.type.startsWith("image/")));
    els.status.textContent = `${files.length} image${files.length === 1 ? "" : "s"} ready for optimization.`;
    results = [];
    renderResults();
    updateExportButtons();
  }

  async function processImages() {
    if (!files.length) {
      setStatus("Choose image files first.", true);
      return;
    }
    const ok = await ask("Optimize image batch?", `This will upscale and compress ${files.length} image${files.length === 1 ? "" : "s"} locally in your browser.`);
    if (!ok) return;
    toggleBusy(true);
    results = [];
    renderResults();
    try {
      for (let i = 0; i < files.length; i += 1) {
        setStatus(`Optimizing ${files[i].name}...`);
        results.push(await optimizeFile(files[i]));
        setProgress(((i + 1) / files.length) * 100);
        renderResults();
        await wait(80);
      }
      setStatus(`Optimized ${results.length} image${results.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Image optimization failed.", true);
    } finally {
      toggleBusy(false);
      updateExportButtons();
    }
  }

  async function optimizeFile(file) {
    const bitmap = await createImageBitmap(file);
    const upscale = Number(els.upscale.value);
    const maxWidth = Math.max(100, Number(els.maxWidth.value) || 1920);
    const quality = Number(els.quality.value) / 100;
    const requestedFormat = resolveOutputFormat(file);
    const intermediateWidth = Math.round(bitmap.width * upscale);
    const intermediateHeight = Math.round(bitmap.height * upscale);
    const finalWidth = Math.min(intermediateWidth, maxWidth);
    const finalHeight = Math.max(1, Math.round(finalWidth * (bitmap.height / bitmap.width)));
    const work = document.createElement("canvas");
    work.width = intermediateWidth;
    work.height = intermediateHeight;
    const keepsAlpha = requestedFormat !== "image/jpeg";
    const workCtx = work.getContext("2d", { alpha: keepsAlpha });
    workCtx.imageSmoothingEnabled = true;
    workCtx.imageSmoothingQuality = "high";
    if (!keepsAlpha) {
      workCtx.fillStyle = "#ffffff";
      workCtx.fillRect(0, 0, intermediateWidth, intermediateHeight);
    }
    workCtx.drawImage(bitmap, 0, 0, intermediateWidth, intermediateHeight);

    const output = document.createElement("canvas");
    output.width = finalWidth;
    output.height = finalHeight;
    const outCtx = output.getContext("2d", { alpha: keepsAlpha });
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    if (!keepsAlpha) {
      outCtx.fillStyle = "#ffffff";
      outCtx.fillRect(0, 0, finalWidth, finalHeight);
    }
    outCtx.drawImage(work, 0, 0, finalWidth, finalHeight);
    const blob = await canvasToBlob(output, requestedFormat, quality);
    const finalFormat = blob.type || requestedFormat;
    const extension = extensionFor(finalFormat, file.name);
    const name = `${baseName(file.name)}-optimized.${extension}`;
    bitmap.close();
    return {
      name,
      blob,
      url: URL.createObjectURL(blob),
      originalSize: file.size,
      newSize: blob.size,
      width: finalWidth,
      height: finalHeight,
      format: finalFormat
    };
  }

  function renderResults() {
    if (!results.length) {
      els.grid.innerHTML = files.length
        ? files.map((file) => `<article class="result-item"><strong>${escapeHtml(file.name)}</strong><span class="field-note">${formatBytes(file.size)} selected</span></article>`).join("")
        : '<article class="result-item"><strong>No optimized images yet</strong><span class="field-note">Add images, choose settings, then process the batch.</span></article>';
      return;
    }
    els.grid.innerHTML = results.map((item, index) => `
      <article class="result-item">
        <img src="${item.url}" alt="Optimized preview of ${escapeHtml(item.name)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="field-note">${item.width}x${item.height} | ${formatBytes(item.originalSize)} to ${formatBytes(item.newSize)} | ${savingText(item)}</span>
        <button class="power-button ghost" data-download="${index}" type="button">Download</button>
      </article>
    `).join("");
    els.grid.querySelectorAll("[data-download]").forEach((button) => {
      button.addEventListener("click", () => downloadBlob(results[Number(button.dataset.download)].blob, results[Number(button.dataset.download)].name));
    });
  }

  async function downloadAll() {
    if (!results.length) return;
    const ok = await ask("Download all optimized images?", "Your browser may ask to allow multiple downloads. This exports each optimized file separately.");
    if (!ok) return;
    for (const item of results) {
      downloadBlob(item.blob, item.name);
      await wait(160);
    }
  }

  async function saveFolder() {
    if (!results.length) return;
    const ok = await ask("Save unzipped folder?", "Chrome and Edge can save directly to a chosen folder. Other browsers will use individual downloads as a fallback.");
    if (!ok) return;
    if (!window.showDirectoryPicker) {
      setStatus("Folder saving is not supported here, starting individual downloads instead.");
      await downloadAllFallback();
      return;
    }
    const directory = await window.showDirectoryPicker();
    for (const item of results) {
      const handle = await directory.getFileHandle(item.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(item.blob);
      await writable.close();
    }
    setStatus("Saved optimized images into the selected folder.");
  }

  async function downloadZip() {
    if (!results.length) return;
    const ok = await ask("Create ZIP file?", `This will package ${results.length} optimized image${results.length === 1 ? "" : "s"} into one ZIP download.`);
    if (!ok) return;
    if (!window.JSZip) {
      setStatus("JSZip is not available yet. Try again after the page finishes loading.", true);
      return;
    }
    toggleBusy(true);
    try {
      const zip = new window.JSZip();
      results.forEach((item) => zip.file(item.name, item.blob));
      const blob = await zip.generateAsync({ type: "blob" }, (meta) => setProgress(meta.percent));
      downloadBlob(blob, "envizion-optimized-images.zip");
      setStatus("ZIP download is ready.");
    } finally {
      toggleBusy(false);
    }
  }

  async function downloadAllFallback() {
    for (const item of results) {
      downloadBlob(item.blob, item.name);
      await wait(160);
    }
  }

  function clearAll() {
    results.forEach((item) => URL.revokeObjectURL(item.url));
    results = [];
    files = [];
    els.input.value = "";
    setProgress(0);
    updateExportButtons();
    renderResults();
    setStatus("Choose images to begin.");
  }

  function updateLabels() {
    els.upscaleLabel.textContent = `${Number(els.upscale.value).toFixed(Number.isInteger(Number(els.upscale.value)) ? 0 : 1)}x`;
    els.qualityLabel.textContent = `${els.quality.value}%`;
  }

  function updateExportButtons() {
    const disabled = !results.length;
    els.downloadAllBtn.disabled = disabled;
    els.folderBtn.disabled = disabled;
    els.zipBtn.disabled = disabled;
  }

  function toggleBusy(isBusy) {
    els.processBtn.disabled = isBusy;
    els.downloadAllBtn.disabled = isBusy || !results.length;
    els.folderBtn.disabled = isBusy || !results.length;
    els.zipBtn.disabled = isBusy || !results.length;
  }

  function setProgress(value) {
    els.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.style.color = isError ? "#be123c" : "";
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode image."));
      }, type, quality);
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitizeName(name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function resolveOutputFormat(file) {
    if (els.format.value !== "auto") return els.format.value;
    const type = (file.type || "").toLowerCase();
    const extension = file.name.split(".").pop().toLowerCase();
    if (type === "image/jpeg" || extension === "jpg" || extension === "jpeg") return "image/jpeg";
    if (type === "image/webp" || extension === "webp") return "image/webp";
    if (type === "image/png" || extension === "png") return "image/png";
    return "image/png";
  }

  function extensionFor(format, originalName) {
    const originalExtension = (originalName.split(".").pop() || "").toLowerCase();
    if (format === "image/png") return "png";
    if (format === "image/jpeg") return originalExtension === "jpeg" ? "jpeg" : "jpg";
    if (format === "image/webp") return "webp";
    return "png";
  }

  function baseName(name) {
    return sanitizeName(name.replace(/\.[^.]+$/, ""));
  }

  function sanitizeName(name) {
    return name.replace(/[\\/:*?"<>|]+/g, "-");
  }

  function savingText(item) {
    const diff = item.originalSize - item.newSize;
    if (diff <= 0) return "larger after quality/upscale";
    return `${Math.round((diff / item.originalSize) * 100)}% smaller`;
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** power)).toFixed(power ? 1 : 0)} ${units[power]}`;
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

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  document.addEventListener("DOMContentLoaded", init);
}());
