    lucide.createIcons();

        // --- Application State ---
        const state = {
            images: [], // { id, file, originalDataUrl, processedDataUrl, blob, name }
            settings: {
                // Removal
                mode: 'auto', // 'auto' or 'custom'
                targetColor: { r: 255, g: 255, b: 255 }, // Decoded from custom picker
                tolerance: 15,
                feathering: 2,
                
                // Adjustments
                brightness: 0,
                contrast: 0,
                saturation: 0,
                flipH: false,
                flipV: false,

                // Layout & FX
                bgColor: 'transparent',
                shadow: false,
                shadowVal: 15,
                padding: 0, // Percentage padding

                // Export
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

        // --- Web Worker Setup (Handles Heavy Pixel Math) ---
        const workerCode = `
            self.onmessage = function(e) {
                const { id, imageData, settings } = e.data;
                const { mode, targetColor, tolerance, feathering, brightness, contrast, saturation } = settings;
                const data = imageData.data;
                const width = imageData.width;
                const height = imageData.height;

                // 1. Determine Background Target Color
                let bgR, bgG, bgB;
                if (mode === 'auto') {
                    // Sample corners
                    const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + (width - 1)) * 4];
                    let rSum = 0, gSum = 0, bSum = 0;
                    corners.forEach(idx => { rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2]; });
                    bgR = rSum / 4; bgG = gSum / 4; bgB = bSum / 4;
                } else {
                    bgR = targetColor.r; bgG = targetColor.g; bgB = targetColor.b;
                }

                let minX = width, minY = height, maxX = 0, maxY = 0;
                const maxDistance = 441.67; // Math.sqrt(255^2 * 3)

                // Contrast Factor
                const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                
                // Saturation setup
                const satFactor = saturation / 100; // -1 to 1

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const i = (y * width + x) * 4;
                        let r = data[i], g = data[i+1], b = data[i+2];
                        let a = data[i+3];
                        
                        if (a === 0) continue;

                        // Calculate removal distance
                        const distance = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
                        const normalizedDist = (distance / maxDistance) * 100;

                        if (normalizedDist <= tolerance) {
                            a = 0; // Remove
                        } else if (normalizedDist <= tolerance + feathering) {
                            // Smooth Edge
                            const factor = (normalizedDist - tolerance) / feathering;
                            a = Math.floor(255 * factor);
                        }

                        // Apply Adjustments to visible pixels
                        if (a > 0 && (brightness !== 0 || contrast !== 0 || saturation !== 0)) {
                            // Brightness
                            r += brightness; g += brightness; b += brightness;
                            
                            // Contrast
                            if (contrast !== 0) {
                                r = contrastFactor * (r - 128) + 128;
                                g = contrastFactor * (g - 128) + 128;
                                b = contrastFactor * (b - 128) + 128;
                            }

                            // Saturation (via luma approximation)
                            if (saturation !== 0) {
                                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                                r = luma + (r - luma) * (1 + satFactor);
                                g = luma + (g - luma) * (1 + satFactor);
                                b = luma + (b - luma) * (1 + satFactor);
                            }

                            // Clamp
                            data[i]   = Math.min(255, Math.max(0, r));
                            data[i+1] = Math.min(255, Math.max(0, g));
                            data[i+2] = Math.min(255, Math.max(0, b));
                        }
                        
                        data[i+3] = a;

                        // Track bounds for auto-trimming
                        if (a > 10) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                if (minX > maxX) { minX = 0; maxX = width; minY = 0; maxY = height; } // Empty

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
            DOM.uploadContainer.addEventListener(eName, () => DOM.uploadContainer.classList.add('border-indigo-500', 'bg-indigo-50/50'));
        });

        ['dragleave', 'drop'].forEach(eName => {
            DOM.uploadContainer.addEventListener(eName, () => DOM.uploadContainer.classList.remove('border-indigo-500', 'bg-indigo-50/50'));
        });

        DOM.uploadContainer.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
        DOM.uploadContainer.addEventListener('click', () => DOM.fileInput.click());
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
                    
                    const MAX_DIM = 1800; // Optimization limit
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

                // Calculate Padding (adds margin around image)
                let padPixelsX = 0, padPixelsY = 0;
                if (state.settings.padding > 0) {
                    padPixelsX = targetW * (state.settings.padding / 100);
                    padPixelsY = targetH * (state.settings.padding / 100);
                    targetW += padPixelsX * 2;
                    targetH += padPixelsY * 2;
                }

                // Calculate Final Container Size
                if (state.settings.size !== 'original') {
                    const box = parseInt(state.settings.size);
                    canvas.width = box; canvas.height = box;
                } else {
                    canvas.width = targetW; canvas.height = targetH;
                }

                // Draw BG
                if (state.settings.bgColor !== 'transparent') {
                    ctx.fillStyle = state.settings.bgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.save();

                // Drop Shadow (looks best on solid BGs)
                if (state.settings.shadow && state.settings.bgColor !== 'transparent') {
                    ctx.shadowColor = 'rgba(0,0,0,0.4)';
                    ctx.shadowBlur = parseInt(state.settings.shadowVal);
                    ctx.shadowOffsetY = ctx.shadowBlur / 2;
                }

                // Determine dest pos
                let dx = padPixelsX, dy = padPixelsY, dw = sw, dh = sh;

                if (state.settings.size !== 'original') {
                    const box = parseInt(state.settings.size);
                    // Scaling to fit box minus padding
                    const availBox = box * (1 - (state.settings.padding * 2 / 100));
                    const scale = Math.min(availBox / sw, availBox / sh);
                    dw = sw * scale; dh = sh * scale;
                    dx = (box - dw) / 2; dy = (box - dh) / 2;
                }

                // Apply Transforms (Flip)
                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.scale(state.settings.flipH ? -1 : 1, state.settings.flipV ? -1 : 1);
                ctx.translate(-canvas.width/2, -canvas.height/2);

                ctx.drawImage(tempCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
                ctx.restore();

                // Draw Watermark
                if (state.settings.watermark) {
                    ctx.font = `bold ${Math.max(14, canvas.width * 0.03)}px Arial`;
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.textAlign = 'right';
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(state.settings.watermark, canvas.width - (canvas.width * 0.05), canvas.height - (canvas.height * 0.05));
                    ctx.shadowBlur = 0; // reset
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

        // Target Color Logic
        window.setRemovalMode = function(mode) {
            state.settings.mode = mode;
            document.getElementById('mode-auto').className = mode === 'auto' ? "flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors bg-indigo-50 border-indigo-200 text-indigo-700" : "flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
            document.getElementById('mode-custom').className = mode === 'custom' ? "flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors bg-indigo-50 border-indigo-200 text-indigo-700" : "flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
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

        // Flip Toggles
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

        // BG Color
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

        // Shadow
        document.getElementById('shadow-toggle').addEventListener('change', e => {
            state.settings.shadow = e.target.checked;
            const slider = document.getElementById('shadow-slider');
            slider.disabled = !e.target.checked;
            slider.classList.toggle('opacity-40', !e.target.checked);
            slider.classList.toggle('cursor-not-allowed', !e.target.checked);
            queueProcessing();
        });

        // Misc Setup
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
            btn.innerHTML = `<div class="loader w-4 h-4 border-2 border-white border-t-transparent"></div> Processing...`;
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
