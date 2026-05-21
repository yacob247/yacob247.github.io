// ==========================================================================
// 1. MULTITHREADED WEB WORKER CODE (Embedded as a string for self-containment)
// ==========================================================================
const workerCode = `
    self.onmessage = function(e) {
        const { id, buffer, w, h, tolerancePercent, featherAmount, seedPoint } = e.data;
        const data = new Uint8ClampedArray(buffer); // Reconstruct array from ArrayBuffer

        const mappedTol = (tolerancePercent / 100) * 442;
        const tolSq = mappedTol * mappedTol;

        const queue = new Int32Array(w * h);
        const visited = new Uint8Array(w * h);
        let head = 0, tail = 0;
        let tR = 0, tG = 0, tB = 0;

        if (seedPoint) {
            const seedX = Math.min(w - 1, Math.max(0, Math.floor(seedPoint.x * w)));
            const seedY = Math.min(h - 1, Math.max(0, Math.floor(seedPoint.y * h)));
            const seedIdx = seedY * w + seedX;
            tR = data[seedIdx * 4];
            tG = data[seedIdx * 4 + 1];
            tB = data[seedIdx * 4 + 2];
            queue[tail++] = seedIdx;
            visited[seedIdx] = 1;
        } else {
            tR = data[0]; tG = data[1]; tB = data[2];
            // Grab edges
            for (let x = 0; x < w; x++) { queue[tail++] = x; queue[tail++] = (h - 1) * w + x; }
            for (let y = 1; y < h - 1; y++) { queue[tail++] = y * w; queue[tail++] = y * w + w - 1; }
            for (let i = 0; i < tail; i++) { visited[queue[i]] = 1; }
        }

        // Flood fill algorithm to detect and remove background
        while (head < tail) {
            const idx = queue[head++];
            const pIdx = idx * 4;
            const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
            const distSq = (r - tR)**2 + (g - tG)**2 + (b - tB)**2;

            if (distSq <= tolSq) {
                data[pIdx + 3] = 0; // Set Alpha (transparency) to 0
                const x = idx % w, y = Math.floor(idx / w);
                if (x > 0 && !visited[idx - 1]) { visited[idx - 1] = 1; queue[tail++] = idx - 1; }
                if (x < w - 1 && !visited[idx + 1]) { visited[idx + 1] = 1; queue[tail++] = idx + 1; }
                if (y > 0 && !visited[idx - w]) { visited[idx - w] = 1; queue[tail++] = idx - w; }
                if (y < h - 1 && !visited[idx + w]) { visited[idx + w] = 1; queue[tail++] = idx + w; }
            }
        }

        // Fast Box Blur Feathering for clean edges
        if (featherAmount > 0) {
            for (let f = 0; f < featherAmount; f++) {
                const outAlpha = new Uint8Array(w * h);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const idx = (y * w + x) * 4;
                        if (y === 0 || x === 0 || y === h - 1 || x === w - 1) {
                            outAlpha[y * w + x] = data[idx + 3]; continue;
                        }
                        let sum = data[idx - 4 + 3] + data[idx + 4 + 3] + data[idx - w * 4 + 3] + data[idx + w * 4 + 3] + (data[idx + 3] * 4);
                        outAlpha[y * w + x] = sum / 8;
                    }
                }
                for (let i = 0; i < w * h; i++) { data[i * 4 + 3] = outAlpha[i]; }
            }
        }

        // Send processed buffer back to main thread via fast transfer
        self.postMessage({ id, buffer: data.buffer, w, h }, [data.buffer]);
    };
`;

// ==========================================================================
// 2. SETUP THE RUNNING WEB WORKER
// ==========================================================================
const workerBlob = new Blob([workerCode], { type: "text/javascript" });
const workerUrl = window.URL.createObjectURL(workerBlob);
const bgWorker = new Worker(workerUrl);

// ==========================================================================
// 3. APPLICATION STATE MANAGEMENT
// ==========================================================================
let images = [];
let isProcessingAlphaQueue = false;
let isProcessingRenderQueue = false;

// Global settings configurations
const settings = {
    tolerance: 10,
    feather: 2,
    bgColor: 'transparent',
    bgHex: '#ffffff', // Active color selection fallback
    shadowEnabled: false,
    shadowBlur: 15,
    format: 'png', // png or jpeg
    jpegQuality: 0.9,
    size: 'original', // original, 1080, 800
    prefix: ''
};

// ==========================================================================
// 4. CACHED DOM ELEMENTS
// ==========================================================================
const DOM = {
    uploadContainer: document.getElementById('upload-container'),
    workspace: document.getElementById('workspace'),
    fileInput: document.getElementById('file-input'),
    addMoreInput: document.getElementById('add-more-input'),
    imageGrid: document.getElementById('image-grid'),
    addMoreCard: document.getElementById('add-more-card'),
    clearBtn: document.getElementById('clear-btn'),
    downloadZipBtn: document.getElementById('download-zip-btn'),
    progressContainer: document.getElementById('progress-container'),
    progressBar: document.getElementById('progress-bar'),
    // Modals
    modal: document.getElementById('compare-modal'),
    modalContent: document.getElementById('compare-modal-content'),
    modalClose: document.getElementById('close-modal-btn'),
    compWrapper: document.getElementById('compare-wrapper'),
    compOrig: document.getElementById('compare-original'),
    compProc: document.getElementById('compare-processed'),
    compSlider: document.getElementById('compare-slider'),
    compLine: document.getElementById('compare-line'),
    labelOriginal: document.getElementById('label-original'),
    labelProcessed: document.getElementById('label-processed')
};

// ==========================================================================
// 5. EVENT LISTENERS INITIALIZATION
// ==========================================================================
function initListeners() {
    // Drag & Drop / File Upload Actions
    DOM.uploadContainer.addEventListener('click', () => DOM.fileInput.click());
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        DOM.uploadContainer.addEventListener(evt, e => e.preventDefault());
    });
    DOM.uploadContainer.addEventListener('drop', e => {
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });
    DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
    DOM.addMoreInput.addEventListener('change', e => handleFiles(e.target.files));
    DOM.clearBtn.addEventListener('click', clearAll);
    DOM.downloadZipBtn.addEventListener('click', downloadZip);

    // Tolerance Adjustment
    document.getElementById('tolerance-slider').addEventListener('input', (e) => {
        settings.tolerance = parseInt(e.target.value);
        document.getElementById('tolerance-val').textContent = settings.tolerance + '%';
        triggerPhase1(); // Needs full re-extraction
    });

    // Feathering Adjustment
    document.getElementById('feather-slider').addEventListener('input', (e) => {
        settings.feather = parseInt(e.target.value);
        document.getElementById('feather-val').textContent = settings.feather + 'px';
        triggerPhase1(); // Needs full re-extraction
    });

    // Solid/Transparent Background Color Selection
    const bgBtns = document.querySelectorAll('.bg-btn');
    const customBgInput = document.getElementById('custom-bg-color');
    
    function updateBgSelection(selectedBtn) {
        bgBtns.forEach(b => {
            b.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-1');
            b.classList.add('border-slate-300');
        });
        selectedBtn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-1');
        selectedBtn.classList.remove('border-slate-300');
    }

    bgBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            settings.bgColor = e.target.dataset.bg;
            updateBgSelection(e.target);
            checkFormatCompatibility();
            triggerPhase2(); // Only needs visual re-render
        });
    });

    customBgInput.addEventListener('input', (e) => {
        settings.bgColor = e.target.value;
        settings.bgHex = e.target.value;
        updateBgSelection(customBgInput.parentElement);
        checkFormatCompatibility();
        triggerPhase2();
    });

    // Drop Shadow Toggles
    const shadowToggle = document.getElementById('shadow-toggle');
    const shadowSlider = document.getElementById('shadow-slider');
    shadowToggle.addEventListener('change', (e) => {
        settings.shadowEnabled = e.target.checked;
        shadowSlider.disabled = !settings.shadowEnabled;
        shadowSlider.classList.toggle('opacity-50', !settings.shadowEnabled);
        triggerPhase2();
    });
    shadowSlider.addEventListener('input', (e) => {
        settings.shadowBlur = parseInt(e.target.value);
        triggerPhase2();
    });

    // Output File Format and Sizing Config
    const formatSelect = document.getElementById('format-select');
    const qualityContainer = document.getElementById('quality-container');
    const qualitySlider = document.getElementById('quality-slider');
    
    formatSelect.addEventListener('change', (e) => {
        settings.format = e.target.value;
        qualityContainer.classList.toggle('hidden', settings.format !== 'jpeg');
        checkFormatCompatibility();
        triggerPhase2();
    });

    qualitySlider.addEventListener('input', (e) => {
        settings.jpegQuality = parseInt(e.target.value) / 100;
        document.getElementById('quality-val').textContent = e.target.value + '%';
        triggerPhase2();
    });

    document.getElementById('size-select').addEventListener('change', (e) => {
        settings.size = e.target.value;
        triggerPhase2();
    });

    document.getElementById('file-prefix').addEventListener('input', (e) => {
        settings.prefix = e.target.value;
    });

    // Comparison Modal Drag and Drop Slider UI
    DOM.modalClose.addEventListener('click', closeModal);
    
    const handleSliderMove = (val) => {
        DOM.compProc.style.clipPath = `polygon(0 0, ${val}% 0, ${val}% 100%, 0% 100%)`;
        DOM.compLine.style.left = `${val}%`;
        
        // Gradually fade out original/processed label overlays when sliding starts
        const opacityVal = Math.max(0, 1 - (Math.abs(50 - val) / 30));
        DOM.labelOriginal.style.opacity = opacityVal;
        DOM.labelProcessed.style.opacity = opacityVal;
    };

    DOM.compSlider.addEventListener('input', (e) => handleSliderMove(e.target.value));
    DOM.compSlider.addEventListener('change', (e) => handleSliderMove(e.target.value));
}

function checkFormatCompatibility() {
    // JPEG doesn't support transparency. Defaults to white if transparent is selected.
    if (settings.format === 'jpeg' && settings.bgColor === 'transparent') {
        // Fallback handled gracefully in visual renderer step
    }
}

// ==========================================================================
// 6. PROCESSING SCHEDULER & PIPELINE
// ==========================================================================
let phase1Timeout;
function triggerPhase1() {
    clearTimeout(phase1Timeout);
    phase1Timeout = setTimeout(() => {
        images.forEach(img => { if(img.status !== 'processing_alpha') img.status = 'pending_alpha'; });
        updateUI();
        processAlphaQueue();
    }, 400);
}

let phase2Timeout;
function triggerPhase2() {
    clearTimeout(phase2Timeout);
    phase2Timeout = setTimeout(() => {
        images.forEach(img => { if(img.status === 'done') img.status = 'pending_render'; });
        updateUI();
        processRenderQueue();
    }, 200);
}

function handleFiles(files) {
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (newFiles.length === 0) return;

    newFiles.forEach(file => {
        images.push({
            id: crypto.randomUUID(),
            file: file,
            originalUrl: URL.createObjectURL(file), // base
            alphaDataUrl: null, // intermediate transparent image
            processedUrl: null, // final customized image
            status: 'pending_alpha', // pending_alpha, processing_alpha, pending_render, done, error
            seedPoint: null,
            w: 0, h: 0
        });
    });

    updateUI();
    processAlphaQueue();
}

function clearAll() {
    images = [];
    DOM.progressContainer.classList.add('hidden');
    updateUI();
}

function updateUI() {
    if (images.length === 0) {
        DOM.uploadContainer.classList.remove('hidden');
        DOM.workspace.classList.add('hidden');
    } else {
        DOM.uploadContainer.classList.add('hidden');
        DOM.workspace.classList.remove('hidden');
    }

    const total = images.length;
    const doneCount = images.filter(i => i.status === 'done').length;
    const pendingCount = total - doneCount;

    // Progress Bar Feedback
    if (total > 0) {
        DOM.progressContainer.classList.remove('hidden');
        const percent = Math.round((doneCount / total) * 100);
        DOM.progressBar.style.width = `${percent}%`;
    }

    if (doneCount > 0 && pendingCount === 0) {
        DOM.downloadZipBtn.disabled = false;
        DOM.downloadZipBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download ZIP (${doneCount})`;
    } else {
        DOM.downloadZipBtn.disabled = true;
        DOM.downloadZipBtn.innerHTML = pendingCount > 0 ? `Processing (${pendingCount} left)...` : `Download ZIP`;
    }

    renderGrid();
}

function renderGrid() {
    const cards = DOM.imageGrid.querySelectorAll('.image-card');
    cards.forEach(c => c.remove());

    images.forEach(img => {
        const card = document.createElement('div');
        card.className = "image-card bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group transition-all hover:shadow-md";
        
        let contentHTML = '';
        if (img.status === 'done' && img.processedUrl) {
            contentHTML = `<img src="${img.processedUrl}" class="w-full h-full object-contain pointer-events-none" alt="Processed Output">`;
        } else if (img.status === 'error') {
            contentHTML = `<div class="text-red-500 text-xs text-center font-bold">Failed</div>`;
        } else {
            contentHTML = `<div class="text-blue-500 text-xs text-center font-bold animate-pulse">Processing...</div>`;
        }

        // Determine grid checkerboard pattern background vs solid background
        let gridBgClass = settings.bgColor === 'transparent' ? 'bg-checkerboard' : '';
        let customBgStyle = settings.bgColor !== 'transparent' ? `background-color: ${settings.bgColor};` : '';

        card.innerHTML = `
            <button class="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm" onclick="removeImg('${img.id}')" aria-label="Remove">&times;</button>
            
            <div class="aspect-square relative rounded-xl overflow-hidden ${gridBgClass} mb-3 shadow-inner group/target border border-slate-100" style="${customBgStyle}">
                <div class="w-full h-full flex flex-col items-center justify-center absolute inset-0 z-0">${contentHTML}</div>
                
                <img src="${img.originalUrl}" class="original-target absolute inset-0 w-full h-full object-contain cursor-crosshair transition-opacity ${img.processedUrl ? 'opacity-0 group-hover/target:opacity-45' : 'opacity-100'} z-10" title="Click anywhere to target a custom background color" alt="Original">
                
                ${img.seedPoint ? `<div class="absolute top-1 left-1 bg-slate-900/80 backdrop-blur border border-white/20 text-white text-[9px] px-1.5 py-0.5 rounded z-20 pointer-events-none">Color Targeted</div>` : ''}
                
                ${img.status === 'done' ? `
                    <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/target:opacity-100 transition-opacity flex items-center justify-center z-10">
                        <button class="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white font-bold text-xs py-1.5 px-3 rounded-full transition-colors flex items-center gap-1 shadow-lg" onclick="openModal('${img.id}')">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> Compare
                        </button>
                    </div>
                ` : ''}
            </div>

            <div class="flex items-center justify-between px-1 mt-auto">
                <p class="text-[11px] text-slate-500 truncate font-medium max-w-[70%]" title="${img.file.name}">${img.file.name}</p>
                ${img.status === 'done' ? `<button class="text-blue-600 hover:text-blue-800 text-[10px] font-bold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors uppercase" onclick="downloadSingle('${img.id}')">Save</button>` : ''}
            </div>
        `;

        // Direct-Click Color targeted logic handler
        const targetImg = card.querySelector('.original-target');
        targetImg.addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const reference = images.find(i => i.id === img.id);
            if(reference) {
                reference.seedPoint = {x, y};
                triggerPhase1();
            }
        });

        DOM.imageGrid.insertBefore(card, DOM.addMoreCard);
    });
}

// ==========================================================================
// 7. PHASE 1: BACKGROUND REMOVAL (Web Worker Pipeline)
// ==========================================================================
async function processAlphaQueue() {
    if (isProcessingAlphaQueue) return;
    const nextIdx = images.findIndex(img => img.status === 'pending_alpha');
    if (nextIdx === -1) {
        updateUI();
        return;
    }

    isProcessingAlphaQueue = true;
    const img = images[nextIdx];
    img.status = 'processing_alpha';
    updateUI();

    try {
        const imgElement = new Image();
        imgElement.crossOrigin = "Anonymous";
        
        await new Promise((resolve, reject) => {
            imgElement.onload = resolve;
            imgElement.onerror = reject;
            imgElement.src = img.originalUrl;
        });

        const cvs = document.createElement("canvas");
        let w = imgElement.width, h = imgElement.height;
        const MAX_RES = 1600;
        if (w > MAX_RES || h > MAX_RES) {
            const ratio = Math.min(MAX_RES / w, MAX_RES / h);
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
        }
        cvs.width = w; cvs.height = h;

        const ctx = cvs.getContext("2d");
        ctx.drawImage(imgElement, 0, 0, w, h);
        
        const imgData = ctx.getImageData(0, 0, w, h);
        bgWorker.postMessage({
            id: img.id,
            buffer: imgData.data.buffer,
            w: w, h: h,
            tolerancePercent: settings.tolerance,
            featherAmount: settings.feather,
            seedPoint: img.seedPoint
        }, [imgData.data.buffer]);

    } catch (err) {
        console.error("Alpha extraction error:", err);
        img.status = 'error';
        isProcessingAlphaQueue = false;
        processAlphaQueue();
    }
}

// ==========================================================================
// 8. PHASE 2: VISUAL RENDERING (Canvas Post-Processing)
// ==========================================================================
async function processRenderQueue() {
    if (isProcessingRenderQueue) return;
    const nextIdx = images.findIndex(img => img.status === 'pending_render');
    if (nextIdx === -1) {
        updateUI();
        return;
    }

    isProcessingRenderQueue = true;
    const img = images[nextIdx];

    try {
        const alphaImg = new Image();
        await new Promise((resolve, reject) => {
            alphaImg.onload = resolve;
            alphaImg.onerror = reject;
            alphaImg.src = img.alphaDataUrl;
        });

        const cvs = document.createElement("canvas");
        const ctx = cvs.getContext("2d");

        // Set output sizing constraints
        let outW = img.w, outH = img.h;
        if (settings.size !== 'original') {
            outW = parseInt(settings.size);
            outH = parseInt(settings.size);
        }
        cvs.width = outW; cvs.height = outH;

        // Draw custom chosen background backplate
        if (settings.bgColor !== 'transparent') {
            ctx.fillStyle = settings.bgColor;
            ctx.fillRect(0, 0, outW, outH);
        } else if (settings.format === 'jpeg') {
            // JPEGs cannot support transparent layers. Force White canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outW, outH);
        }

        // Calculate dimensional scaling ratios
        let drawW = img.w, drawH = img.h;
        let drawX = 0, drawY = 0;

        if (settings.size !== 'original') {
            const ratio = Math.min(outW / img.w, outH / img.h) * 0.9; // 90% contain padding
            drawW = img.w * ratio;
            drawH = img.h * ratio;
            drawX = (outW - drawW) / 2;
            drawY = (outH - drawH) / 2;
        }

        // Apply Drop Shadows if active
        if (settings.shadowEnabled) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = settings.shadowBlur;
            ctx.shadowOffsetX = settings.shadowBlur / 3;
            ctx.shadowOffsetY = settings.shadowBlur / 3;
        }

        // Draw subject above background and shadow layers
        ctx.drawImage(alphaImg, drawX, drawY, drawW, drawH);
        
        // Reset canvas context states
        ctx.shadowColor = 'transparent';

        // Save generated URL
        const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        img.processedUrl = cvs.toDataURL(mimeType, settings.jpegQuality);
        img.status = 'done';

    } catch (err) {
        console.error("Rendering error:", err);
        img.status = 'error';
    } finally {
        isProcessingRenderQueue = false;
        processRenderQueue(); // Continue processing next in queue
    }
}

// ==========================================================================
// 9. DOWNLOAD UTILITIES
// ==========================================================================
window.removeImg = function(id) {
    images = images.filter(img => img.id !== id);
    updateUI();
}

function generateFileName(originalName, index) {
    const ext = settings.format === 'jpeg' ? '.jpg' : '.png';
    if (settings.prefix.trim() !== '') {
        return `${settings.prefix.trim()}${index + 1}${ext}`;
    }
    return originalName.replace(/\.[^/.]+$/, "") + `-processed${ext}`;
}

window.downloadSingle = function(id) {
    const index = images.findIndex(i => i.id === id);
    const img = images[index];
    if(img && img.processedUrl) {
        const a = document.createElement("a");
        a.href = img.processedUrl;
        a.download = generateFileName(img.file.name, index);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

async function downloadZip() {
    DOM.downloadZipBtn.disabled = true;
    DOM.downloadZipBtn.innerText = "Zipping...";
    
    const zip = new JSZip();
    let addedFiles = 0;

    images.forEach((img, index) => {
        if (img.status === 'done' && img.processedUrl) {
            addedFiles++;
            const base64Data = img.processedUrl.split(',')[1];
            const fileName = generateFileName(img.file.name, index);
            zip.file(fileName, base64Data, { base64: true });
        }
    });

    if (addedFiles === 0) {
        updateUI();
        return;
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = settings.prefix ? `${settings.prefix.trim()}batch.zip` : "auto-remove-batch.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error("Zip generation failed:", e);
    } finally {
        updateUI();
    }
}

// ==========================================================================
// 10. COMPARISON SLIDER VIEW PORT BUILDER
// ==========================================================================
window.openModal = function(id) {
    const img = images.find(i => i.id === id);
    if (!img) return;

    // Unhide modal container layout so width measurements are valid (prevents 0px container bug)
    DOM.modal.classList.remove('hidden');

    const tempImg = new Image();
    tempImg.src = img.originalUrl;
    tempImg.onload = function() {
        const nativeW = tempImg.width;
        const nativeH = tempImg.height;

        const outerContainer = DOM.compWrapper.parentElement;
        const maxAvailableW = outerContainer.clientWidth - 48; // p-6 outer offset
        const maxAvailableH = window.innerHeight * 0.55; // Fit perfectly inside 55vh container limit

        // Calculate dynamic proportions to prevent letterbox alignment failures
        const scale = Math.min(maxAvailableW / nativeW, maxAvailableH / nativeH);
        const displayW = Math.floor(nativeW * scale);
        const displayH = Math.floor(nativeH * scale);

        // Adjust interactive display surface to exact image dimensions
        DOM.compWrapper.style.width = `${displayW}px`;
        DOM.compWrapper.style.height = `${displayH}px`;

        DOM.compOrig.src = img.originalUrl;
        DOM.compProc.src = img.processedUrl;
        
        // Match chosen custom color background inside comparison modal
        if(settings.bgColor === 'transparent') {
            DOM.compWrapper.style.backgroundColor = '';
            DOM.compWrapper.classList.add('bg-checkerboard');
        } else {
            DOM.compWrapper.style.backgroundColor = settings.bgColor;
            DOM.compWrapper.classList.remove('bg-checkerboard');
        }

        DOM.compSlider.value = 50;
        DOM.compProc.style.clipPath = `polygon(0 0, 50% 0, 50% 100%, 0% 100%)`;
        DOM.compLine.style.left = `50%`;
        DOM.labelOriginal.style.opacity = 1;
        DOM.labelProcessed.style.opacity = 1;

        // Apply slide animation transition trigger
        setTimeout(() => {
            DOM.modal.classList.remove('opacity-0');
            DOM.modalContent.classList.remove('scale-95');
        }, 10);
    };
}

function closeModal() {
    DOM.modal.classList.add('opacity-0');
    DOM.modalContent.classList.add('scale-95');
    setTimeout(() => {
        DOM.modal.classList.add('hidden');
        DOM.compOrig.src = '';
        DOM.compProc.src = '';
    }, 300);
}

// Start listeners instantly
initListeners();
