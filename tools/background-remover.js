    /**
         * Core Application Logic for AutoRemove Pro
         * Consolidated into a single file for robust execution and cross-origin safety.
         */

        // Application State
        const state = {
            images: [], // { id, originalFile, originalDataUrl, processedDataUrl, blob, name }
            settings: {
                tolerance: 15,
                feathering: 2,
                bgColor: 'transparent', // 'transparent', '#ffffff', etc.
                shadow: false,
                shadowVal: 15,
                size: 'original',
                format: 'png',
                prefix: '',
                trim: true
            },
            isProcessing: false,
            worker: null
        };

        // DOM Elements
        const DOM = {
            uploadContainer: document.getElementById('upload-container'),
            fileInput: document.getElementById('file-input'),
            workspace: document.getElementById('workspace'),
            imageGrid: document.getElementById('image-grid'),
            addMoreInput: document.getElementById('add-more-input'),
            imageCount: document.getElementById('image-count'),
            
            // Settings Controls
            tolSlider: document.getElementById('tolerance-slider'),
            tolVal: document.getElementById('tolerance-val'),
            featherSlider: document.getElementById('feather-slider'),
            featherVal: document.getElementById('feather-val'),
            bgBtns: document.querySelectorAll('.bg-btn'),
            customBg: document.getElementById('custom-bg-color'),
            shadowToggle: document.getElementById('shadow-toggle'),
            shadowSlider: document.getElementById('shadow-slider'),
            sizeSelect: document.getElementById('size-select'),
            trimToggle: document.getElementById('trim-toggle'),
            formatSelect: document.getElementById('format-select'),
            prefixInput: document.getElementById('file-prefix'),
            
            // Actions
            clearBtn: document.getElementById('clear-btn'),
            downloadBtn: document.getElementById('download-zip-btn'),
            progressContainer: document.getElementById('progress-container'),
            progressBar: document.getElementById('progress-bar'),

            // Comparison Modal
            modal: document.getElementById('compare-modal'),
            modalContent: document.getElementById('compare-modal-content'),
            closeBtn: document.getElementById('close-modal-btn'),
            compOriginal: document.getElementById('compare-original'),
            compProcessed: document.getElementById('compare-processed'),
            compSlider: document.getElementById('compare-slider'),
            compLine: document.getElementById('compare-line')
        };

        // --- 1. WEB WORKER DEFINITION (Inline to avoid multiple files) ---
        // This worker handles the CPU-intensive pixel manipulation off the main thread.
        const workerCode = `
            self.onmessage = function(e) {
                const { id, imageData, tolerance, feathering, trim } = e.data;
                const data = imageData.data;
                const width = imageData.width;
                const height = imageData.height;

                // 1. Determine Background Color by sampling corners
                const corners = [
                    0, // Top-Left
                    (width - 1) * 4, // Top-Right
                    (height - 1) * width * 4, // Bottom-Left
                    ((height - 1) * width + (width - 1)) * 4 // Bottom-Right
                ];
                
                // Average the corners to find a solid background baseline
                let rSum = 0, gSum = 0, bSum = 0;
                corners.forEach(idx => {
                    rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2];
                });
                const bgR = rSum / 4; const bgG = gSum / 4; const bgB = bSum / 4;

                // Track bounds for auto-trimming
                let minX = width, minY = height, maxX = 0, maxY = 0;

                // 2. Process Pixels (Color Distance)
                const maxDistance = 441.67; // Math.sqrt(255^2 * 3)

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const i = (y * width + x) * 4;
                        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                        
                        if (a === 0) continue; // Already transparent

                        const distance = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
                        const normalizedDist = (distance / maxDistance) * 100;

                        if (normalizedDist <= tolerance) {
                            data[i+3] = 0; // Fully transparent
                        } else if (normalizedDist <= tolerance + feathering) {
                            // Feathering: Smooth gradient for edges
                            const factor = (normalizedDist - tolerance) / feathering;
                            data[i+3] = Math.floor(255 * factor);
                        }

                        // Update Bounds if pixel is not transparent
                        if (data[i+3] > 10) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                // Default bounds if empty
                if (minX > maxX) { minX = 0; maxX = width; minY = 0; maxY = height; }

                self.postMessage({ 
                    id, 
                    imageData, 
                    bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } 
                }, [imageData.data.buffer]);
            };
        `;

        // Create the worker from the string Blob
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        state.worker = new Worker(URL.createObjectURL(blob));

        // --- 2. EVENT LISTENERS & UI LOGIC ---

        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            DOM.uploadContainer.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

        ['dragenter', 'dragover'].forEach(eventName => {
            DOM.uploadContainer.addEventListener(eventName, () => {
                DOM.uploadContainer.classList.add('border-blue-500', 'bg-blue-50/50');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            DOM.uploadContainer.addEventListener(eventName, () => {
                DOM.uploadContainer.classList.remove('border-blue-500', 'bg-blue-50/50');
            });
        });

        DOM.uploadContainer.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
        DOM.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
        DOM.addMoreInput.addEventListener('change', (e) => handleFiles(e.target.files));

        DOM.uploadContainer.addEventListener('click', () => DOM.fileInput.click());

        // Process newly added files
        async function handleFiles(files) {
            const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (validFiles.length === 0) return;

            DOM.uploadContainer.classList.add('hidden');
            DOM.workspace.classList.remove('hidden');

            for (let file of validFiles) {
                const id = 'img_' + Math.random().toString(36).substring(2, 9);
                const dataUrl = await readFileAsDataURL(file);
                
                const imgObj = {
                    id,
                    file,
                    name: file.name.split('.')[0], // Name without extension
                    originalDataUrl: dataUrl,
                    processedDataUrl: null,
                    blob: null
                };
                
                state.images.push(imgObj);
                createGridItem(imgObj);
            }
            
            updateImageCount();
            processAllImages();
        }

        function readFileAsDataURL(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        // --- 3. PROCESSING PIPELINE ---

        // Debounce processing to prevent lag when sliding
        let processTimeout;
        function queueProcessing() {
            clearTimeout(processTimeout);
            processTimeout = setTimeout(() => processAllImages(), 300);
        }

        async function processAllImages() {
            if (state.images.length === 0) return;
            state.isProcessing = true;
            DOM.downloadBtn.disabled = true;
            DOM.progressContainer.classList.remove('hidden');
            
            let processedCount = 0;
            updateProgress(0);

            for (let imgObj of state.images) {
                // Show loading spinner on item
                const card = document.getElementById(`card-${imgObj.id}`);
                const overlay = card.querySelector('.loading-overlay');
                if(overlay) overlay.classList.remove('hidden');

                try {
                    await processSingleImage(imgObj);
                } catch(e) {
                    console.error("Error processing image:", e);
                }

                processedCount++;
                updateProgress((processedCount / state.images.length) * 100);
            }

            state.isProcessing = false;
            DOM.downloadBtn.disabled = false;
            setTimeout(() => DOM.progressContainer.classList.add('hidden'), 1000);
        }

        function updateProgress(percent) {
            DOM.progressBar.style.width = `${percent}%`;
        }

        function processSingleImage(imgObj) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    // 1. Draw to canvas to get raw pixel data
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    
                    // Optimization: max processing resolution to prevent memory crashes on massive files
                    const MAX_DIM = 2000;
                    let pWidth = img.width; let pHeight = img.height;
                    if(pWidth > MAX_DIM || pHeight > MAX_DIM) {
                        const ratio = Math.min(MAX_DIM / pWidth, MAX_DIM / pHeight);
                        pWidth = Math.floor(pWidth * ratio);
                        pHeight = Math.floor(pHeight * ratio);
                    }

                    canvas.width = pWidth;
                    canvas.height = pHeight;
                    ctx.drawImage(img, 0, 0, pWidth, pHeight);
                    
                    const imageData = ctx.getImageData(0, 0, pWidth, pHeight);

                    // 2. Send to Web Worker
                    const handleWorkerResponse = function(e) {
                        if(e.data.id !== imgObj.id) return; // Ignore if not our image
                        
                        state.worker.removeEventListener('message', handleWorkerResponse);
                        const processedData = e.data.imageData;
                        const bounds = e.data.bounds;

                        // 3. Post-Process via Canvas (Trim, Background, Shadow, Resize)
                        applyFinalRender(imgObj, processedData, bounds, pWidth, pHeight).then(resolve);
                    };

                    state.worker.addEventListener('message', handleWorkerResponse);
                    state.worker.postMessage({
                        id: imgObj.id,
                        imageData: imageData,
                        tolerance: state.settings.tolerance,
                        feathering: state.settings.feathering,
                        trim: state.settings.trim
                    }, [imageData.data.buffer]); // Transfer buffer for performance
                };
                img.src = imgObj.originalDataUrl;
            });
        }

        function applyFinalRender(imgObj, imageData, bounds, origW, origH) {
            return new Promise(resolve => {
                // Determine target dimensions
                let targetW = origW;
                let targetH = origH;
                
                // Create temporary canvas with the removed background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = origW;
                tempCanvas.height = origH;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);

                // Final Output Canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Determine Output Size (Scaling/Trimming logic)
                if (state.settings.size !== 'original') {
                    const boxSize = parseInt(state.settings.size);
                    canvas.width = boxSize;
                    canvas.height = boxSize;
                } else if (state.settings.trim && bounds.w > 0 && bounds.h > 0) {
                    // Trim output to subject
                    canvas.width = bounds.w;
                    canvas.height = bounds.h;
                } else {
                    canvas.width = origW;
                    canvas.height = origH;
                }

                // Draw Background Color
                if (state.settings.bgColor !== 'transparent') {
                    ctx.fillStyle = state.settings.bgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // Draw Image (with optional shadow and scaling)
                ctx.save();
                
                if (state.settings.shadow && state.settings.bgColor !== 'transparent') {
                    // Shadows only look good if we have a solid background or format is PNG
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = parseInt(state.settings.shadowVal);
                    ctx.shadowOffsetY = ctx.shadowBlur / 2;
                }

                // Calculate drawing coordinates
                let dx = 0, dy = 0, dw = origW, dh = origH;
                let sx = 0, sy = 0, sw = origW, sh = origH;

                if (state.settings.trim) {
                    sx = bounds.x; sy = bounds.y; sw = bounds.w; sh = bounds.h;
                }

                if (state.settings.size !== 'original') {
                    const boxSize = parseInt(state.settings.size);
                    // Fit inside square while maintaining aspect ratio
                    const scale = Math.min(boxSize / sw, boxSize / sh) * 0.9; // 90% to leave a slight margin
                    dw = sw * scale;
                    dh = sh * scale;
                    dx = (boxSize - dw) / 2;
                    dy = (boxSize - dh) / 2;
                } else if (state.settings.trim) {
                    dw = sw; dh = sh;
                }

                ctx.drawImage(tempCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
                ctx.restore();

                // Convert to Blob
                const mimeType = state.settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
                const quality = 0.92;

                canvas.toBlob((blob) => {
                    imgObj.blob = blob;
                    imgObj.processedDataUrl = URL.createObjectURL(blob);
                    
                    // Update UI Image
                    const imgEl = document.getElementById(`img-${imgObj.id}`);
                    if (imgEl) {
                        imgEl.src = imgObj.processedDataUrl;
                        // Determine grid background based on setting
                        if (state.settings.bgColor === 'transparent') {
                            imgEl.parentElement.classList.add('bg-checkerboard');
                            imgEl.parentElement.style.backgroundColor = '';
                        } else {
                            imgEl.parentElement.classList.remove('bg-checkerboard');
                            imgEl.parentElement.style.backgroundColor = state.settings.bgColor;
                        }
                    }

                    // Hide Loader
                    const overlay = document.getElementById(`card-${imgObj.id}`).querySelector('.loading-overlay');
                    if(overlay) overlay.classList.add('hidden');

                    resolve();
                }, mimeType, quality);
            });
        }

        // --- 4. UI BUILDERS & SETTINGS BINDINGS ---

        function createGridItem(imgObj) {
            const div = document.createElement('div');
            div.id = `card-${imgObj.id}`;
            div.className = 'relative rounded-xl border border-slate-200 overflow-hidden shadow-sm aspect-square group bg-checkerboard cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all';
            
            div.innerHTML = `
                <img id="img-${imgObj.id}" src="" class="w-full h-full object-contain p-2" alt="Processed">
                
                <div class="absolute inset-0 bg-slate-900/60 flex items-center justify-center flex-col gap-2 img-card-overlay">
                    <button class="bg-white text-slate-800 font-semibold px-4 py-1.5 rounded-full text-xs shadow-lg hover:bg-blue-50 transition-colors compare-trigger">
                        Compare
                    </button>
                    <button class="text-white hover:text-red-400 text-xs mt-1 transition-colors delete-trigger">
                        Remove
                    </button>
                </div>

                <div class="loading-overlay absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <div class="loader"></div>
                </div>
            `;

            // Insert before the "Add More" card
            DOM.imageGrid.insertBefore(div, document.getElementById('add-more-card'));

            // Bind interactions
            div.querySelector('.compare-trigger').addEventListener('click', (e) => {
                e.stopPropagation();
                openCompareModal(imgObj);
            });

            div.querySelector('.delete-trigger').addEventListener('click', (e) => {
                e.stopPropagation();
                removeImage(imgObj.id);
            });
        }

        function removeImage(id) {
            state.images = state.images.filter(img => img.id !== id);
            const card = document.getElementById(`card-${id}`);
            if(card) card.remove();
            updateImageCount();
            if(state.images.length === 0) {
                DOM.workspace.classList.add('hidden');
                DOM.uploadContainer.classList.remove('hidden');
            }
        }

        function updateImageCount() {
            DOM.imageCount.textContent = state.images.length;
        }

        // Bind Settings UI
        DOM.tolSlider.addEventListener('input', (e) => {
            DOM.tolVal.textContent = e.target.value + '%';
            state.settings.tolerance = parseInt(e.target.value);
            queueProcessing();
        });

        DOM.featherSlider.addEventListener('input', (e) => {
            DOM.featherVal.textContent = e.target.value + 'px';
            state.settings.feathering = parseInt(e.target.value);
            queueProcessing();
        });

        DOM.bgBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state visually
                DOM.bgBtns.forEach(b => b.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'border-blue-500'));
                DOM.customBg.parentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                
                const target = e.target;
                target.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'border-blue-500');
                
                state.settings.bgColor = target.dataset.bg;
                queueProcessing();
            });
        });

        DOM.customBg.addEventListener('input', (e) => {
            DOM.bgBtns.forEach(b => b.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'border-blue-500'));
            DOM.customBg.parentElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            state.settings.bgColor = e.target.value;
            queueProcessing();
        });

        DOM.shadowToggle.addEventListener('change', (e) => {
            state.settings.shadow = e.target.checked;
            DOM.shadowSlider.disabled = !e.target.checked;
            DOM.shadowSlider.classList.toggle('opacity-50', !e.target.checked);
            DOM.shadowSlider.classList.toggle('cursor-not-allowed', !e.target.checked);
            queueProcessing();
        });

        DOM.shadowSlider.addEventListener('input', (e) => {
            state.settings.shadowVal = e.target.value;
            queueProcessing(); // Will debounce
        });

        DOM.sizeSelect.addEventListener('change', (e) => {
            state.settings.size = e.target.value;
            queueProcessing();
        });

        DOM.trimToggle.addEventListener('change', (e) => {
            state.settings.trim = e.target.checked;
            queueProcessing();
        });

        DOM.formatSelect.addEventListener('change', (e) => {
            state.settings.format = e.target.value;
            // Force solid background if JPEG is selected to avoid black backgrounds
            if (e.target.value === 'jpeg' && state.settings.bgColor === 'transparent') {
                document.querySelector('[data-bg="#ffffff"]').click(); 
            }
            queueProcessing();
        });

        DOM.prefixInput.addEventListener('input', (e) => {
            state.settings.prefix = e.target.value;
        });

        DOM.clearBtn.addEventListener('click', () => {
            state.images = [];
            document.querySelectorAll('[id^="card-"]').forEach(el => el.remove());
            DOM.workspace.classList.add('hidden');
            DOM.uploadContainer.classList.remove('hidden');
        });

        // --- 5. COMPARISON MODAL LOGIC ---

        function openCompareModal(imgObj) {
            DOM.compOriginal.src = imgObj.originalDataUrl;
            DOM.compProcessed.src = imgObj.processedDataUrl;
            
            // Set modal background based on setting
            const wrapper = document.getElementById('compare-wrapper');
            if(state.settings.bgColor === 'transparent') {
                wrapper.classList.add('bg-checkerboard');
                wrapper.style.backgroundColor = '';
            } else {
                wrapper.classList.remove('bg-checkerboard');
                wrapper.style.backgroundColor = state.settings.bgColor;
            }

            // Reset Slider
            DOM.compSlider.value = 50;
            updateCompareSlider(50);

            DOM.modal.classList.remove('hidden');
            // Small delay for transition
            requestAnimationFrame(() => {
                DOM.modal.classList.remove('opacity-0');
                DOM.modalContent.classList.remove('scale-95');
            });
        }

        function closeCompareModal() {
            DOM.modal.classList.add('opacity-0');
            DOM.modalContent.classList.add('scale-95');
            setTimeout(() => DOM.modal.classList.add('hidden'), 300);
        }

        DOM.closeBtn.addEventListener('click', closeCompareModal);
        DOM.modal.addEventListener('click', (e) => {
            if (e.target === DOM.modal) closeCompareModal();
        });

        DOM.compSlider.addEventListener('input', (e) => {
            updateCompareSlider(e.target.value);
        });

        function updateCompareSlider(val) {
            // Clip the original image to show only on the LEFT
            DOM.compOriginal.style.clipPath = `polygon(0 0, ${val}% 0, ${val}% 100%, 0 100%)`;

            // Clip the top image (Processed) from left edge to 'val' percentage.
            // Meaning original shows on the LEFT, Processed shows on the RIGHT.
            DOM.compProcessed.style.clipPath = `polygon(${val}% 0, 100% 0, 100% 100%, ${val}% 100%)`;
            DOM.compLine.style.left = `${val}%`;
            
            // Fade labels slightly based on position
            document.getElementById('label-original').style.opacity = val < 20 ? 0 : 1;
            document.getElementById('label-processed').style.opacity = val > 80 ? 0 : 1;
        }

        // --- 6. ZIP DOWNLOAD LOGIC ---

        DOM.downloadBtn.addEventListener('click', async () => {
            if (state.images.length === 0 || state.isProcessing) return;

            DOM.downloadBtn.innerHTML = `<div class="loader w-4 h-4 border-2"></div> Zipping...`;
            DOM.downloadBtn.disabled = true;

            const zip = new JSZip();
            const extension = state.settings.format === 'jpeg' ? 'jpg' : 'png';
            const prefix = state.settings.prefix ? state.settings.prefix.trim() : '';

            state.images.forEach((img, index) => {
                if (!img.blob) return;
                
                // Construct Filename
                let fileName = img.name;
                if (prefix) fileName = `${prefix}${fileName}`;
                
                // Handle duplicate names
                fileName = `${fileName}.${extension}`;
                
                zip.file(fileName, img.blob);
            });

            try {
                const content = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = `AutoRemove_Batch_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error("ZIP Generation failed", err);
                alert("Failed to generate ZIP file.");
            } finally {
                DOM.downloadBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download ZIP`;
                DOM.downloadBtn.disabled = false;
            }
        });
