(function () {
  "use strict";

  const lockMagic = "EVZLOCK1";
  const storageKey = "envizion-universal-file-encryption-intro-hidden";
  const els = {
    fileInput: document.getElementById("fileInput"),
    dropZone: document.getElementById("dropZone"),
    password: document.getElementById("passwordInput"),
    confirm: document.getElementById("confirmInput"),
    encryptBtn: document.getElementById("encryptBtn"),
    decryptBtn: document.getElementById("decryptBtn"),
    clearBtn: document.getElementById("clearBtn"),
    fileList: document.getElementById("fileList"),
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
  let confirmResolve = null;

  function init() {
    setFooterYear();
    wireIntro();
    wireConfirm();
    wireAds();
    els.fileInput.addEventListener("change", () => addFiles(els.fileInput.files));
    els.dropZone.addEventListener("dragover", onDragOver);
    els.dropZone.addEventListener("drop", onDrop);
    els.encryptBtn.addEventListener("click", () => runBatch("encrypt"));
    els.decryptBtn.addEventListener("click", () => runBatch("decrypt"));
    els.clearBtn.addEventListener("click", clearFiles);
    renderFileList();
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
      if (els.dontShow.checked) {
        localStorage.setItem(storageKey, "1");
      }
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
    addFiles(event.dataTransfer.files);
  }

  function addFiles(fileList) {
    files = files.concat(Array.from(fileList || []));
    renderFileList();
    els.status.textContent = `${files.length} file${files.length === 1 ? "" : "s"} ready.`;
  }

  function clearFiles() {
    files = [];
    els.fileInput.value = "";
    setProgress(0);
    renderFileList();
    els.status.textContent = "Choose files to begin.";
  }

  function renderFileList() {
    if (!files.length) {
      els.fileList.innerHTML = '<article class="result-item"><strong>No files selected</strong><span class="field-note">Add one or more files to encrypt or decrypt locally.</span></article>';
      return;
    }
    els.fileList.innerHTML = files.map((file, index) => `
      <article class="result-item">
        <strong>${escapeHtml(file.name)}</strong>
        <span class="field-note">${formatBytes(file.size)} | ${escapeHtml(file.type || "unknown file type")}</span>
        <button class="power-button ghost" type="button" data-remove="${index}">Remove</button>
      </article>
    `).join("");
    els.fileList.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        files.splice(Number(button.dataset.remove), 1);
        renderFileList();
      });
    });
  }

  async function runBatch(mode) {
    const password = normalizePassword(els.password.value);
    const confirmation = normalizePassword(els.confirm.value);
    if (!files.length) {
      setStatus("Add files first.", true);
      return;
    }
    if (password.length < 8) {
      setStatus("Use a password with at least 8 characters.", true);
      return;
    }
    if (mode === "encrypt" && !confirmation) {
      setStatus("Repeat the password in the confirmation field before encrypting.", true);
      return;
    }
    if (mode === "encrypt" && password !== confirmation) {
      setStatus("Password confirmation does not match.", true);
      return;
    }
    const ok = await ask(
      mode === "encrypt" ? "Encrypt selected files?" : "Decrypt selected lock files?",
      mode === "encrypt"
        ? `This will encrypt ${files.length} file${files.length === 1 ? "" : "s"} and download locked copies. Keep your password safe.`
        : `This will decrypt ${files.length} locked file${files.length === 1 ? "" : "s"} using the password you entered.`
    );
    if (!ok) return;

    toggleBusy(true);
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setStatus(`${mode === "encrypt" ? "Encrypting" : "Decrypting"} ${file.name}...`);
        const output = mode === "encrypt"
          ? await encryptFile(file, password)
          : await decryptFile(file, password);
        downloadBlob(output.blob, output.name);
        setProgress(((i + 1) / files.length) * 100);
        await wait(140);
      }
      setStatus(mode === "encrypt" ? "Encrypted downloads are ready." : "Decrypted downloads are ready.");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The file operation failed.", true);
    } finally {
      toggleBusy(false);
    }
  }

  async function encryptFile(file, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const plain = await file.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
    const metadata = {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      salt: toBase64(salt),
      iv: toBase64(iv),
      created: new Date().toISOString()
    };
    const metaBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const header = new TextEncoder().encode(lockMagic);
    const length = new ArrayBuffer(4);
    new DataView(length).setUint32(0, metaBytes.length, false);
    return {
      blob: new Blob([header, length, metaBytes, encrypted], { type: "application/octet-stream" }),
      name: `${file.name}.envizionlock`
    };
  }

  async function decryptFile(file, password) {
    const buffer = await file.arrayBuffer();
    const header = new TextDecoder().decode(buffer.slice(0, 8));
    if (header !== lockMagic) {
      throw new Error(`${file.name} is not an Envizion lock file.`);
    }
    const metadataLength = new DataView(buffer.slice(8, 12)).getUint32(0, false);
    const metadata = JSON.parse(new TextDecoder().decode(buffer.slice(12, 12 + metadataLength)));
    const cipher = buffer.slice(12 + metadataLength);
    const key = await deriveKey(password, fromBase64(metadata.salt));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(metadata.iv) }, key, cipher);
    return {
      blob: new Blob([plain], { type: metadata.type || "application/octet-stream" }),
      name: metadata.name || file.name.replace(/\.envizionlock$/i, "")
    };
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
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

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.style.color = isError ? "#be123c" : "";
  }

  function setProgress(value) {
    els.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function toggleBusy(isBusy) {
    els.encryptBtn.disabled = isBusy;
    els.decryptBtn.disabled = isBusy;
  }

  function toBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** power)).toFixed(power ? 1 : 0)} ${units[power]}`;
  }

  function sanitizeName(name) {
    return name.replace(/[\\/:*?"<>|]+/g, "-");
  }

  function normalizePassword(value) {
    return String(value).replace(/\r\n/g, "\n").normalize("NFC").trim();
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
