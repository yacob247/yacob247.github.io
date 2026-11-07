lucide.createIcons();

        // --- Application State ---
        const state = {
            images: [],
            settings: {
                mode: 'auto', 
                targetColor: { r: 255, g: 255, b: 255 },
                tolerance: 15,
                feathering: 2,
                brightness: 0,
                contrast: 0,
                saturation: 0,
                flipH: false,
                flipV: false,
                bgColor: 'transparent',
                shadow: false,
                shadowVal: 15,
                padding: 0,
                size: 'original',
                trim: true,
                format: 'png',
                prefix: '',
                watermark: ''
            },
            isProcessing: false,
            worker: null
        };

        // --- Toast System ---
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`;
            const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
            toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i> <span>${message}</span>`;
            container.appendChild(toast);
            lucide.createIcons({ root: toast });
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // --- Web Worker Setup ---
        const workerCode = `
            self.onmessage = function(e) {
                const { id, imageData, settings } = e.data;
                const { mode, targetColor, tolerance, feathering, brightness, contrast, saturation } = settings;
                const data = imageData.data;
                const width = imageData.width;
                const height = imageData.height;

                let bgR, bgG, bgB;
                if (mode === 'auto') {
                    const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + (width - 1)) * 4];
                    let rSum = 0, gSum = 0, bSum = 0;
                    corners.forEach(idx => { rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2]; });
                    bgR = rSum / 4; bgG = gSum / 4; bgB = bSum / 4;
                } else {
                    bgR = targetColor.r; bgG = targetColor.g; bgB = targetColor.b;
                }

                let minX = width, minY = height, maxX = 0, maxY = 0;
                const maxDistance = 441.67; 
                const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                const satFactor = saturation / 100;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const i = (y * width + x) * 4;
                        let r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                        
                        if (a === 0) continue;

                        const distance = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
                        const normalizedDist = (distance / maxDistance) * 100;

                        if (normalizedDist <= tolerance) {
                            a = 0; 
                        } else if (normalizedDist <= tolerance + feathering) {
                            const factor = (normalizedDist - tolerance) / feathering;
                            a = Math.floor(255 * factor);
                        }

                        if (a > 0 && (brightness !== 0 || contrast !== 0 || saturation !== 0)) {
                            r += brightness; g += brightness; b += brightness;
                            if (contrast !== 0) {
                                r = contrastFactor * (r - 128) + 128;
                                g = contrastFactor * (g - 128) + 128;
                                b = contrastFactor * (b - 128) + 128;
                            }
                            if (saturation !== 0) {
                                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                                r = luma + (r - luma) * (1 + satFactor);
                                g = luma + (g - luma) * (1 + satFactor);
                                b = luma + (b - luma) * (1 + satFactor);
                            }
                            data[i]   = Math.min(255, Math.max(0, r));
                            data[i+1] = Math.min(255, Math.max(0, g));
                            data[i+2] = Math.min(255, Math.max(0, b));
                        }
                        
                        data[i+3] = a;

                        if (a > 10) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                if (minX > maxX) { minX = 0; maxX = width; minY = 0; maxY = height; }

                self.postMessage({ 
                    id, imageData, bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } 
                }, [imageData.data.buffer]);
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        state.worker = new Worker(URL.createObjectURL(blob));

        // --- DOM Elements ---
        const DOM = {
            uploadContainer: document.getElementById('upload-container'),
            fileInput: document.getElementById('file-input'),
            addMoreInput: document.getElementById('add-more-input'),
            workspace: document.getElementById('workspace'),
            imageGrid: document.getElementById('image-grid'),
            imageCount: document.getElementById('image-count'),
            progressBar: document.getElementById('progress-bar'),
            progressContainer: document.getElementById('progress-container')
        };

        // --- Drag & Drop Logic ---
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => {
            document.body.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); });
        });

        ['dragenter', 'dragover'].forEach(eName => {
            DOM.uploadContainer.addEventListener(eName, () => DOM.uploadContainer.firstElementChild.classList.add('border-indigo-500', 'bg-indigo-50/50'));
        });
        ['dragleave', 'drop'].forEach(eName => {
            DOM.uploadContainer.addEventListener(eName, () => DOM.uploadContainer.firstElementChild.classList.remove('border-indigo-500', 'bg-indigo-50/50'));
        });

        DOM.uploadContainer.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
        DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
        DOM.addMoreInput.addEventListener('change', e => handleFiles(e.target.files));

        async function handleFiles(files) {
            const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (validFiles.length === 0) return;

            DOM.uploadContainer.classList.add('hidden');
            DOM.workspace.classList.remove('hidden');

            for (let file of validFiles) {
                const id = 'img_' + Math.random().toString(36).substring(2, 9);
                const dataUrl = await readFileAsDataURL(file);
                
                const imgObj = { id, file, name: file.name.split('.')[0], originalDataUrl: dataUrl };
                state.images.push(imgObj);
                createGridItem(imgObj);
            }
            
            updateImageCount();
            processAllImages();
            
            // Auto scroll to tools on mobile after initial upload
            if (window.innerWidth < 768) {
                document.querySelector('.layout-sidebar').scrollIntoView({ behavior: 'smooth' });
            }
        }

        function readFileAsDataURL(file) {
            return new Promise(res => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        // --- Core Processing Pipeline ---
        let processTimeout;
        function queueProcessing() {
            clearTimeout(processTimeout);
            processTimeout = setTimeout(() => processAllImages(), 250);
        }

        async function processAllImages() {
            if (state.images.length === 0) return;
            state.isProcessing = true;
            document.getElementById('download-zip-btn').disabled = true;
            DOM.progressContainer.classList.remove('hidden');
            
            let processedCount = 0;
            DOM.progressBar.style.width = '0%';

            for (let imgObj of state.images) {
                const card = document.getElementById(`card-${imgObj.id}`);
                const overlay = card?.querySelector('.loading-overlay');
                if(overlay) overlay.classList.remove('hidden');

                await processSingleImage(imgObj);

                processedCount++;
                DOM.progressBar.style.width = `${(processedCount / state.images.length) * 100}%`;
            }

            state.isProcessing = false;
            document.getElementById('download-zip-btn').disabled = false;
            setTimeout(() => DOM.progressContainer.classList.add('hidden'), 500);
        }

        function processSingleImage(imgObj) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    
                    const MAX_DIM = 1800;
                    let pW = img.width, pH = img.height;
                    if(pW > MAX_DIM || pH > MAX_DIM) {
                        const r = Math.min(MAX_DIM / pW, MAX_DIM / pH);
                        pW = Math.floor(pW * r); pH = Math.floor(pH * r);
                    }

                    canvas.width = pW; canvas.height = pH;
                    ctx.drawImage(img, 0, 0, pW, pH);
                    const imageData = ctx.getImageData(0, 0, pW, pH);

                    const handleResponse = e => {
                        if(e.data.id !== imgObj.id) return;
                        state.worker.removeEventListener('message', handleResponse);
                        applyFinalRender(imgObj, e.data.imageData, e.data.bounds, pW, pH).then(resolve);
                    };

                    state.worker.addEventListener('message', handleResponse);
                    state.worker.postMessage({ id: imgObj.id, imageData, settings: state.settings }, [imageData.data.buffer]);
                };
                img.src = imgObj.originalDataUrl;
            });
        }

        function applyFinalRender(imgObj, imageData, bounds, origW, origH) {
            return new Promise(resolve => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = origW; tempCanvas.height = origH;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let targetW = origW, targetH = origH;
                let sx = 0, sy = 0, sw = origW, sh = origH;

                if (state.settings.trim) {
                    sx = bounds.x; sy = bounds.y; sw = bounds.w; sh = bounds.h;
                    targetW = sw; targetH = sh;
                }

                let padPixelsX = 0, padPixelsY = 0;
                if (state.settings.padding > 0) {
                    padPixelsX = targetW * (state.settings.padding / 100);
                    padPixelsY = targetH * (state.settings.padding / 100);
                    targetW += padPixelsX * 2;
                    targetH += padPixelsY * 2;
                }

                if (state.settings.size !== 'original') {
                    const box = parseInt(state.settings.size);
                    canvas.width = box; canvas.height = box;
                } else {
                    canvas.width = targetW; canvas.height = targetH;
                }

                if (state.settings.bgColor !== 'transparent') {
                    ctx.fillStyle = state.settings.bgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.save();
                if (state.settings.shadow && state.settings.bgColor !== 'transparent') {
                    ctx.shadowColor = 'rgba(0,0,0,0.4)';
                    ctx.shadowBlur = parseInt(state.settings.shadowVal);
                    ctx.shadowOffsetY = ctx.shadowBlur / 2;
                }

                let dx = padPixelsX, dy = padPixelsY, dw = sw, dh = sh;

                if (state.settings.size !== 'original') {
                    const box = parseInt(state.settings.size);
                    const availBox = box * (1 - (state.settings.padding * 2 / 100));
                    const scale = Math.min(availBox / sw, availBox / sh);
                    dw = sw * scale; dh = sh * scale;
                    dx = (box - dw) / 2; dy = (box - dh) / 2;
                }

                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.scale(state.settings.flipH ? -1 : 1, state.settings.flipV ? -1 : 1);
                ctx.translate(-canvas.width/2, -canvas.height/2);

                ctx.drawImage(tempCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
                ctx.restore();

                if (state.settings.watermark) {
                    ctx.font = `bold ${Math.max(14, canvas.width * 0.03)}px Arial`;
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.textAlign = 'right';
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(state.settings.watermark, canvas.width - (canvas.width * 0.05), canvas.height - (canvas.height * 0.05));
                    ctx.shadowBlur = 0;
                }

                const mime = state.settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
                canvas.toBlob(blob => {
                    imgObj.blob = blob;
                    imgObj.processedDataUrl = URL.createObjectURL(blob);
                    
                    const imgEl = document.getElementById(`img-${imgObj.id}`);
                    if (imgEl) {
                        imgEl.src = imgObj.processedDataUrl;
                        const wrapper = imgEl.parentElement;
                        wrapper.classList.toggle('bg-checkerboard', state.settings.bgColor === 'transparent');
                        wrapper.style.backgroundColor = state.settings.bgColor !== 'transparent' ? state.settings.bgColor : '';
                    }

                    document.getElementById(`card-${imgObj.id}`)?.querySelector('.loading-overlay')?.classList.add('hidden');
                    resolve();
                }, mime, 0.92);
            });
        }

        // --- UI Construction ---
        function createGridItem(imgObj) {
            const div = document.createElement('div');
            div.id = `card-${imgObj.id}`;
            div.className = 'relative rounded-2xl border border-slate-200 overflow-hidden shadow-sm aspect-square group bg-checkerboard cursor-pointer hover:ring-4 hover:ring-indigo-100 transition-all';
            
            div.innerHTML = `
                <img id="img-${imgObj.id}" src="" class="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" alt="Processed">
                
                <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3">
                    <button class="bg-white text-slate-800 font-bold px-4 py-2 rounded-full text-xs shadow-xl hover:bg-indigo-50 transition-colors compare-trigger flex items-center gap-2">
                        <i data-lucide="split-square-horizontal" class="w-3.5 h-3.5"></i> Compare
                    </button>
                    <button class="text-white hover:text-red-400 text-xs transition-colors delete-trigger flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        <i data-lucide="trash-2" class="w-3 h-3"></i> Remove
                    </button>
                </div>
                <div class="loading-overlay absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <div class="loader"></div>
                </div>
            `;

            DOM.imageGrid.insertBefore(div, document.getElementById('add-more-card'));
            lucide.createIcons({ root: div });

            div.querySelector('.compare-trigger').addEventListener('click', e => { e.stopPropagation(); openCompareModal(imgObj); });
            div.querySelector('.delete-trigger').addEventListener('click', e => { e.stopPropagation(); removeImage(imgObj.id); });
        }

        function removeImage(id) {
            state.images = state.images.filter(img => img.id !== id);
            document.getElementById(`card-${id}`)?.remove();
            updateImageCount();
            if(state.images.length === 0) {
                DOM.workspace.classList.add('hidden');
                DOM.uploadContainer.classList.remove('hidden');
            }
        }

        function updateImageCount() {
            DOM.imageCount.textContent = state.images.length;
            document.getElementById('clear-btn').style.display = state.images.length > 0 ? 'flex' : 'none';
        }

        // --- Settings Bindings ---
        function bindSlider(id, stateKey, suffix = '', valModifier = v => v) {
            const el = document.getElementById(id);
            const valEl = document.getElementById(id.replace('slider', 'val'));
            el.addEventListener('input', e => {
                valEl.textContent = valModifier(e.target.value) + suffix;
                state.settings[stateKey] = parseInt(e.target.value);
                queueProcessing();
            });
        }

        bindSlider('tolerance-slider', 'tolerance', '%');
        bindSlider('feather-slider', 'feathering', 'px');
        bindSlider('bright-slider', 'brightness');
        bindSlider('contrast-slider', 'contrast');
        bindSlider('sat-slider', 'saturation');
        bindSlider('shadow-slider', 'shadowVal', 'px');
        bindSlider('padding-slider', 'padding', '%');

        window.setRemovalMode = function(mode) {
            state.settings.mode = mode;
            document.getElementById('mode-auto').className = mode === 'auto' ? "flex-1 text-xs py-2 rounded-md border font-medium transition-colors bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "flex-1 text-xs py-2 rounded-md border font-medium transition-colors bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm";
            document.getElementById('mode-custom').className = mode === 'custom' ? "flex-1 text-xs py-2 rounded-md border font-medium transition-colors bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "flex-1 text-xs py-2 rounded-md border font-medium transition-colors bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm";
            document.getElementById('custom-color-picker').style.display = mode === 'custom' ? 'flex' : 'none';
            queueProcessing();
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : {r:255,g:255,b:255};
        }

        document.getElementById('target-color-val').addEventListener('input', e => {
            state.settings.targetColor = hexToRgb(e.target.value);
            if(state.settings.mode === 'custom') queueProcessing();
        });

        document.getElementById('flip-h-btn').addEventListener('click', e => {
            state.settings.flipH = !state.settings.flipH;
            e.currentTarget.classList.toggle('bg-indigo-50', state.settings.flipH);
            e.currentTarget.classList.toggle('border-indigo-200', state.settings.flipH);
            e.currentTarget.classList.toggle('text-indigo-700', state.settings.flipH);
            queueProcessing();
        });
        document.getElementById('flip-v-btn').addEventListener('click', e => {
            state.settings.flipV = !state.settings.flipV;
            e.currentTarget.classList.toggle('bg-indigo-50', state.settings.flipV);
            e.currentTarget.classList.toggle('border-indigo-200', state.settings.flipV);
            e.currentTarget.classList.toggle('text-indigo-700', state.settings.flipV);
            queueProcessing();
        });

        document.querySelectorAll('.bg-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'border-indigo-500'));
                document.getElementById('custom-bg-color').parentElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
                const t = e.target;
                t.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'border-indigo-500');
                state.settings.bgColor = t.dataset.bg;
                queueProcessing();
            });
        });
        document.getElementById('custom-bg-color').addEventListener('input', e => {
            document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'border-indigo-500'));
            e.target.parentElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
            state.settings.bgColor = e.target.value;
            queueProcessing();
        });

        document.getElementById('shadow-toggle').addEventListener('change', e => {
            state.settings.shadow = e.target.checked;
            const slider = document.getElementById('shadow-slider');
            slider.disabled = !e.target.checked;
            slider.classList.toggle('opacity-40', !e.target.checked);
            slider.classList.toggle('cursor-not-allowed', !e.target.checked);
            queueProcessing();
        });

        document.getElementById('size-select').addEventListener('change', e => { state.settings.size = e.target.value; queueProcessing(); });
        document.getElementById('trim-toggle').addEventListener('change', e => { state.settings.trim = e.target.checked; queueProcessing(); });
        document.getElementById('format-select').addEventListener('change', e => {
            state.settings.format = e.target.value;
            if (e.target.value === 'jpeg' && state.settings.bgColor === 'transparent') {
                document.querySelector('[data-bg="#ffffff"]').click();
                showToast("Format changed to JPEG. Background set to White automatically.");
            }
            queueProcessing();
        });
        document.getElementById('file-prefix').addEventListener('input', e => state.settings.prefix = e.target.value);
        document.getElementById('watermark-input').addEventListener('input', e => { state.settings.watermark = e.target.value; queueProcessing(); });

        document.getElementById('clear-btn').addEventListener('click', () => {
            state.images = [];
            document.querySelectorAll('[id^="card-"]').forEach(el => el.remove());
            DOM.workspace.classList.add('hidden');
            DOM.uploadContainer.classList.remove('hidden');
            updateImageCount();
        });

        // --- Comparison Modal ---
        const modal = document.getElementById('compare-modal');
        function openCompareModal(imgObj) {
            document.getElementById('compare-original').src = imgObj.originalDataUrl;
            document.getElementById('compare-processed').src = imgObj.processedDataUrl;
            
            const w = document.getElementById('compare-wrapper');
            w.classList.toggle('bg-checkerboard', state.settings.bgColor === 'transparent');
            w.style.backgroundColor = state.settings.bgColor !== 'transparent' ? state.settings.bgColor : '';

            document.getElementById('compare-slider').value = 50;
            updateCompareSlider(50);

            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                document.getElementById('compare-modal-content').classList.remove('scale-95');
            });
        }

        function closeCompareModal() {
            modal.classList.add('opacity-0');
            document.getElementById('compare-modal-content').classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }

        document.getElementById('close-modal-btn').addEventListener('click', closeCompareModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeCompareModal(); });
        document.getElementById('compare-slider').addEventListener('input', e => updateCompareSlider(e.target.value));

        function updateCompareSlider(val) {
            document.getElementById('compare-original').style.clipPath = `polygon(0 0, ${val}% 0, ${val}% 100%, 0 100%)`;
            document.getElementById('compare-processed').style.clipPath = `polygon(${val}% 0, 100% 0, 100% 100%, ${val}% 100%)`;
            document.getElementById('compare-line').style.left = `${val}%`;
            document.getElementById('label-original').style.opacity = val < 20 ? 0 : 1;
            document.getElementById('label-processed').style.opacity = val > 80 ? 0 : 1;
        }

        // --- ZIP Export ---
        document.getElementById('download-zip-btn').addEventListener('click', async () => {
            if (state.images.length === 0 || state.isProcessing) return;

            const btn = document.getElementById('download-zip-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<div class="loader w-4 h-4 border-2 border-white border-t-transparent"></div>`;
            btn.disabled = true;

            const zip = new JSZip();
            const ext = state.settings.format === 'jpeg' ? 'jpg' : 'png';
            const prefix = state.settings.prefix.trim();

            state.images.forEach(img => {
                if (!img.blob) return;
                const fileName = `${prefix ? prefix : ''}${img.name}.${ext}`;
                zip.file(fileName, img.blob);
            });

            try {
                const content = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = `AutoRemove_Pro_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Images downloaded successfully!", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to generate ZIP file.", "error");
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                lucide.createIcons({ root: btn });
            }
        });

/* --- extracted inline scripts --- */
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
