// Store messages in IndexedDB
        const dbName = 'LomaWebLLMChatDB';
        const dbVersion = 1;
        let db;
        let sessionMessages = [];
        let engine;
        let isEngineReady = false;
        let attachedFileName = null;
        let attachedFileContent = null;
        let attachedImageBase64 = null;
        
        const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
        
        function initDB() {
            const request = indexedDB.open(dbName, dbVersion);
            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
            };
            request.onsuccess = (event) => {
                db = event.target.result;
                loadChatHistory();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const objectStore = db.createObjectStore("chats", { keyPath: "id", autoIncrement: true });
                objectStore.createIndex("timestamp", "timestamp", { unique: false });
            };
        }
        
        function saveMessageToDB(role, content) {
            if (!db) return;
            const transaction = db.transaction(["chats"], "readwrite");
            const objectStore = transaction.objectStore("chats");
            const message = { role: role, content: content, timestamp: new Date().getTime() };
            objectStore.add(message);
        }
        
        function loadChatHistory() {
            if (!db) return;
            const transaction = db.transaction(["chats"], "readonly");
            const objectStore = transaction.objectStore("chats");
            const request = objectStore.getAll();
            
            request.onsuccess = (event) => {
                const messages = event.target.result;
                const stream = document.getElementById('chat-stream');
                
                // Keep the initial welcome screen if empty, else clear it
                if (messages.length > 0) {
                     stream.innerHTML = '';
                     sessionMessages = [];
                     messages.forEach(msg => {
                         sessionMessages.push({role: msg.role, content: msg.content});
                         appendMessage(msg.role, msg.content, false);
                     });
                     scrollToBottom();
                }
            };
        }
        
        function clearDB() {
            if (!db) return;
             const transaction = db.transaction(["chats"], "readwrite");
             const objectStore = transaction.objectStore("chats");
             objectStore.clear();
             sessionMessages = [];
             document.getElementById('chat-stream').innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center px-4 fade-in">
                    <div class="h-16 w-16 bg-gemini-card rounded-full flex items-center justify-center text-3xl mb-6 shadow-xl border border-gemini-border/30">
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"><i class="fa-solid fa-sparkles"></i></span>
                    </div>
                    <h1 class="text-2xl font-semibold text-white mb-3">Autonomous Evolution Workspace</h1>
                    <p class="text-sm text-gemini-textMuted max-w-md leading-relaxed mb-8">
                        Running locally using WebGPU and WebLLM. Propose complex capabilities and evolve your engine!
                    </p>
                </div>
             `;
        }
        
        window.startNewChatSession = () => {
             clearDB();
             triggerNotificationToast('New Chat', 'Started a new session.', 'fa-plus', 'bg-indigo-600');
        }

        // --- Notifications ---
        window.triggerNotificationToast = (title, desc, iconClass = 'fa-bell', bgColor = 'bg-gemini-accent/20') => {
            const toast = document.getElementById('alert-toast');
            document.getElementById('alert-title').innerText = title;
            document.getElementById('alert-desc').innerText = desc;
            
            const iconWrapper = document.getElementById('alert-icon-wrapper');
            iconWrapper.className = `h-10 w-10 rounded-full flex items-center justify-center text-lg ${bgColor}`;
            if(bgColor.includes('bg-gemini-accent')) iconWrapper.classList.add('text-gemini-accent');
            else iconWrapper.classList.add('text-white');
            
            document.getElementById('alert-icon').className = `fa-solid ${iconClass}`;
            
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
        };

        // --- UI Interactions ---
        window.toggleSidebarCollapse = () => {
            const sidebar = document.getElementById('gemini-sidebar');
            const overlay = document.getElementById('mobile-overlay');
            const isClosed = sidebar.classList.contains('-translate-x-full');
            
            if (isClosed) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden', 'opacity-0');
                overlay.classList.add('opacity-100');
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
        };

        window.toggleConfigSidebar = () => {
            const config = document.getElementById('config-sidebar');
            config.classList.toggle('-translate-x-full');
        };
        
        window.toggleModelDropdown = () => {
            const dropdown = document.getElementById('model-dropdown');
            dropdown.classList.toggle('hidden');
        };
        
        window.selectModel = (id, label) => {
            document.getElementById('config-model').value = id;
            document.getElementById('model-pill-label').innerText = label;
            window.toggleModelDropdown();
            // In this specific setup, we are bound to MODEL_ID for WebLLM initially
            if(id !== MODEL_ID) {
                 triggerNotificationToast('Model selected', `Note: Engine currently initialized with ${MODEL_ID}`, 'fa-info-circle', 'bg-blue-600');
            }
        };

        window.triggerProtectedFileAttachment = () => {
            document.getElementById('file-upload-input').click();
        };

        window.clearFileAttachment = () => {
            attachedFileName = null;
            attachedFileContent = null;
            attachedImageBase64 = null;
            document.getElementById('file-upload-input').value = '';
            document.getElementById('attached-file-pill').classList.replace('flex', 'hidden');
        };

        window.handleFileAttachment = async (input) => {
            const file = input.files[0];
            if (!file) return;
            input.value = '';

            if (file.size > 10 * 1024 * 1024) {
                return triggerNotificationToast("File too large", "Max 10MB.", "fa-triangle-exclamation", "bg-red-600");
            }

            // Image attachment → kept as dataURL so the AI can send it to Nexus tools (bg removal, editing, etc.)
            if (file.type.startsWith('image/')) {
                attachedImageBase64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
                attachedFileName = file.name;
                attachedFileContent = null;
                document.getElementById('attached-file-pill').classList.replace('hidden', 'flex');
                document.getElementById('attached-file-name').innerText = file.name + ' (image)';
                triggerNotificationToast("Image attached", `${file.name} ready — the AI can now process it with its tools.`, "fa-image", "bg-purple-600");
                return;
            }

            try {
                attachedFileName = file.name;
                attachedFileContent = `[File: ${file.name}]\n\`\`\`\n${await file.text()}\n\`\`\``;
                attachedImageBase64 = null;
                triggerNotificationToast("File attached", `${file.name} ready.`, "fa-file-lines", "bg-emerald-600");
                
                document.getElementById('attached-file-pill').classList.replace('hidden', 'flex');
                document.getElementById('attached-file-name').innerText = file.name;
            } catch (err) {
                triggerNotificationToast("Read error", "Could not read file.", "fa-triangle-exclamation", "bg-red-600");
            }
        };
        
        // --- Canvas UI ---
        window.toggleCanvasVisibility = (forceShow) => {
            const canvas = document.getElementById('canvas-column');
            if (forceShow === false) {
                canvas.classList.add('w-0');
                canvas.classList.remove('w-[50%]', 'w-[60%]');
                return;
            }
            if (canvas.classList.contains('w-0')) {
                canvas.classList.remove('w-0');
                canvas.classList.add('w-[50%]'); // default split
            } else {
                canvas.classList.add('w-0');
                canvas.classList.remove('w-[50%]', 'w-[60%]');
            }
        };
        
        window.switchCanvasTab = (tab) => {
            const frame = document.getElementById('live-canvas-frame');
            const code = document.getElementById('live-canvas-code');
            const consolePanel = document.getElementById('canvas-console-panel');
            const runBtn = document.getElementById('canvas-run-btn');
            
            document.getElementById('tab-preview').style.background = 'transparent';
            document.getElementById('tab-preview').style.color = '#71717a';
            document.getElementById('tab-code').style.background = 'transparent';
            document.getElementById('tab-code').style.color = '#71717a';
            document.getElementById('tab-console').style.background = 'transparent';
            document.getElementById('tab-console').style.color = '#71717a';
            
            frame.style.display = 'none';
            code.style.display = 'none';
            consolePanel.style.display = 'none';
            runBtn.style.display = 'none';
            
            if (tab === 'preview') {
                frame.style.display = 'block';
                document.getElementById('tab-preview').style.background = '#2a2a32';
                document.getElementById('tab-preview').style.color = '#e4e4e7';
            } else if (tab === 'code') {
                code.style.display = 'block';
                runBtn.style.display = 'block';
                document.getElementById('tab-code').style.background = '#2a2a32';
                document.getElementById('tab-code').style.color = '#e4e4e7';
            } else if (tab === 'console') {
                consolePanel.style.display = 'block';
                document.getElementById('tab-console').style.background = '#2a2a32';
                document.getElementById('tab-console').style.color = '#e4e4e7';
            }
        };
        
        window.applyCanvasEdit = () => {
             const code = document.getElementById('live-canvas-code').value;
             const frame = document.getElementById('live-canvas-frame');
             frame.srcdoc = code;
             triggerNotificationToast('Canvas', 'Code applied to preview.', 'fa-play', 'bg-emerald-600');
             window.switchCanvasTab('preview');
        };

        // --- WebLLM Engine Initialization ---
        window.loadWebLLMEngine = async () => {
            if(isEngineReady) return;
            if (window._engineInitStarted) return;
            window._engineInitStarted = true;
            const progressContainer = document.getElementById('init-progress-container');
            const progressBar = document.getElementById('init-progress-bar');
            const progressText = document.getElementById('init-progress-text');
            const connectionDot = document.getElementById('connection-dot');
            const connectionLabel = document.getElementById('connection-label');
            
            progressContainer.classList.remove('hidden');
            connectionDot.className = "h-2 w-2 rounded-full bg-yellow-500 animate-pulse";
            connectionLabel.innerText = "Initializing...";

            const postBoot = (text, pct) => { if (window.parent !== window) { try { window.parent.postMessage({ type: 'nexus-engine-status', engine: 'chat', text, pct }, '*'); } catch (e) {} } };
            const initProgressCallback = (report) => {
                progressText.innerText = report.text;
                postBoot(report.text, report.progress != null ? Math.round(report.progress) : null);
                // Try to extract percentage if present
                const match = report.text.match(/\[(\d+)\/(\d+)\]/);
                if(match) {
                     const pct = (parseInt(match[1]) / parseInt(match[2])) * 100;
                     progressBar.style.width = `${pct}%`;
                     postBoot(report.text, Math.round(pct));
                }
            };

            try {
                // Dynamically import WebLLM to avoid race conditions on page load
                if(!window.webllm) {
                     progressText.innerText = "Downloading WebLLM core libraries...";
                     window.webllm = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm");
                }
                
                if(!window.webllm) {
                     throw new Error("WebLLM library could not be loaded from CDN.");
                }
                
                const { CreateMLCEngine } = window.webllm;
                
                engine = await CreateMLCEngine(
                    MODEL_ID,
                    {
                        initProgressCallback: initProgressCallback,
                        appConfig: {
                            cacheBackend: "indexeddb",
                            model_list: [{
                                model: "https://pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev/",
                                model_id: MODEL_ID,
                                model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
                            }]
                        }
                    }
                );
                
                isEngineReady = true;
                postBoot('Ready · cached in IndexedDB', 100);
                // Warn if WebGPU is unavailable — WASM fallback is extremely slow
                if (!navigator.gpu) {
                    triggerNotificationToast('No WebGPU — slow mode', 'Your browser/GPU does not expose WebGPU, so the model runs on slow WASM. Use Chrome/Edge with hardware acceleration enabled for full speed.', 'fa-triangle-exclamation', 'bg-orange-600');
                }
                progressContainer.classList.add('hidden');
                connectionDot.className = "h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                connectionLabel.innerText = "WebGPU Ready";
                triggerNotificationToast('Engine Ready', 'WebLLM loaded successfully.', 'fa-bolt', 'bg-emerald-600');
            } catch (error) {
                console.error("WebLLM Init Error:", error);
                window._engineInitStarted = false; // allow retry (auto or manual click)
                progressText.innerText = "Initialization Failed: " + error.message;
                progressBar.classList.replace('bg-emerald-400', 'bg-red-500');
                connectionDot.className = "h-2 w-2 rounded-full bg-red-500";
                connectionLabel.innerText = "Engine Error";
                triggerNotificationToast('Init Error', error.message, 'fa-triangle-exclamation', 'bg-red-600');
            }
        };
        // --- Nexus Tool System (talks to the aistudio.html parent) ---
        const nexusPending = {};
        let nexusReqCounter = 0;
        let NEXUS_TOOLS = null;
        let NEXUS_HOST = false;

        function toolProtocol() {
            // Kept deliberately tiny — tool routing is done functionally in code,
            // so the model only needs 2 lines (saves prefill time/tokens).
            return `\nYou are NexusAI. All tools (background removal, image generation/editing) run automatically in code when requested — never refuse. Files are 100% local, no server. For code: complete standalone file, real working inline CSS/JS.`;
        }

        // --- Local (standalone) background remover — used when text.html is opened directly ---
        let localBG = null;
        let localBGWasm = false; // remembered GPU-kernel failure (persisted) — skip WebGPU entirely
        try { localBGWasm = localStorage.getItem('nexus-bg-gpu-fail') === '1'; } catch (e) {}
        async function ensureLocalBG() {
            if (localBG) return localBG;
            const tf = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.2');
            tf.env.allowLocalModels = false;
            const MODEL = 'Xenova/bria-rmbg-1.4';
            const proc = await tf.AutoProcessor.from_pretrained(MODEL);
            let model;
            if (!localBGWasm) {
                try { model = await tf.AutoModel.from_pretrained(MODEL, { device: 'webgpu', dtype: 'fp32' }); }
                catch (e) { console.warn('WebGPU BG load failed, using WASM:', e); localBGWasm = true; }
            }
            if (localBGWasm || !model) model = await tf.AutoModel.from_pretrained(MODEL, { device: 'wasm', dtype: 'q8' });
            localBG = { tf, proc, model };
            return localBG;
        }
        async function localBgRemove(imageDataUrl) {
            const { tf, proc, model } = await ensureLocalBG();
            // CSP blocks fetch() on data: URLs — convert to a blob: URL first (blob: is allowed)
            const bin = await (await fetch(imageDataUrl)).blob().catch(() => null);
            let src = imageDataUrl;
            if (!bin) {
                // fallback decode: draw to canvas and export as blob URL
                const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = imageDataUrl; });
                const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                const b = await new Promise(r => c.toBlob(r, 'image/png'));
                src = URL.createObjectURL(b);
            } else {
                src = URL.createObjectURL(bin);
            }
            const raw = await tf.RawImage.fromURL(src);
            URL.revokeObjectURL(src);
            const { pixel_values } = await proc(raw);
            // Run — if a WebGPU kernel fails or silently hangs at inference (unsupported
            // dtype on some GPUs; transformers.js can swallow the error), rebuild the model
            // once on WASM and retry automatically, and remember the failure.
            let output;
            try {
                output = await Promise.race([
                    (async () => { const r = await model({ input: pixel_values }); return r.output; })(),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('BG-GPU-TIMEOUT')), 90000))
                ]);
            } catch (gpuErr) {
                console.warn('WebGPU inference failed/hung, retrying on WASM:', gpuErr);
                localBGWasm = true;
                try { localStorage.setItem('nexus-bg-gpu-fail', '1'); } catch (e) {}
                const tf2 = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.2');
                const wasmModel = await tf2.AutoModel.from_pretrained('Xenova/bria-rmbg-1.4', { device: 'wasm', dtype: 'q8' });
                localBG.model = wasmModel; // reuse WASM model on future runs
                output = (await wasmModel({ input: pixel_values })).output;
            }
            const maskTensor = output[0].mul(255).to('uint8');
            const mask = await tf.RawImage.fromTensor(maskTensor).resize(raw.width, raw.height);
            // Composite: original image + alpha mask → transparent PNG
            const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = imageDataUrl; });
            const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
            const ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const frame = ctx.getImageData(0, 0, cv.width, cv.height);
            for (let i = 0; i < mask.data.length; ++i) frame.data[4 * i + 3] = mask.data[i];
            ctx.putImageData(frame, 0, 0);
            return cv.toDataURL('image/png');
        }

        function requestNexusTool(id, argsJson, imageDataUrl) {
            if (window.nexusRunTool) return window.nexusRunTool(id, argsJson, imageDataUrl);
            return new Promise((resolve, reject) => {
                if (window.parent === window) {
                    // Standalone mode — run supported tools locally
                    if (id === 'bg-remove' && imageDataUrl) {
                        localBgRemove(imageDataUrl)
                            .then(dataUrl => resolve({ kind: 'image', dataUrl, name: 'background-removed.png' }))
                            .catch(err => reject(new Error('Local background removal failed: ' + (err.message || err))));
                        return;
                    }
                    return reject(new Error(`"${id}" needs the full studio engine — open this chat from aistudio.html. (Background removal works here too.)`));
                }
                let args = {};
                if (argsJson) {
                    try { args = JSON.parse(argsJson); }
                    catch (e) { args = { prompt: argsJson.replace(/^[\s"']+|[\s"']+$/g, '') }; }
                }
                const reqId = 'req-' + Date.now() + '-' + (++nexusReqCounter);
                nexusPending[reqId] = { resolve, reject };
                NEXUS_HOST = true;
                window.parent.postMessage({
                    type: 'nexus-tool', reqId, id,
                    prompt: args.prompt || '',
                    image: args.image || imageDataUrl || null,
                    options: args.options || {}
                }, '*');
                setTimeout(() => {
                    if (nexusPending[reqId]) { delete nexusPending[reqId]; reject(new Error('Tool timed out — check that the NexusAI Omni Studio page is still open.')); }
                }, 300000);
            });
        }

        window.addEventListener('message', (e) => {
            const d = e.data;
            if (!d || typeof d.type !== 'string') return;
            if (d.type === 'nexus-tool-result' && nexusPending[d.reqId]) {
                const p = nexusPending[d.reqId]; delete nexusPending[d.reqId];
                if (d.ok) p.resolve(d); else p.reject(new Error(d.error || 'Tool failed'));
            } else if (d.type === 'nexus-tools-list') {
                NEXUS_TOOLS = d.tools || [];
            }
        });

        function appendToolResult(result) {
            const stream = document.getElementById('chat-stream');
            const div = document.createElement('div');
            div.className = 'flex w-full fade-in';
            const head = `<div class="flex-shrink-0 mr-4 mt-1"><div class="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-black text-sm shadow-[0_0_15px_rgba(168,199,250,0.2)]"><i class="fa-solid fa-screwdriver-wrench text-[10px]"></i></div></div>`;
            const dl = (href, name) => `<a href="${href}" download="${name}" class="mt-2 inline-block px-3 py-1.5 bg-gemini-card border border-gemini-border rounded-lg text-xs text-emerald-400 hover:bg-[#323639] smooth-transition"><i class="fa-solid fa-download mr-1"></i>Download ${name}</a>`;
            let inner = '';
            if (result.kind === 'image') {
                inner = `<img src="${result.dataUrl}" class="max-w-full max-h-[380px] rounded-xl border border-gemini-border/40 shadow-lg" alt="tool output">${dl(result.dataUrl, result.name)}`;
            } else if (result.kind === 'video') {
                inner = `<video controls src="${result.dataUrl}" class="max-w-full rounded-xl border border-gemini-border/40"></video>${dl(result.dataUrl, result.name)}`;
            } else if (result.kind === 'audio') {
                inner = `<audio controls src="${result.dataUrl}" class="w-full"></audio>${dl(result.dataUrl, result.name)}`;
            } else {
                const txt = (result.text || '');
                inner = `<pre class="whitespace-pre-wrap text-xs bg-gemini-card border border-gemini-border/40 rounded-xl p-3 max-h-[320px] overflow-auto w-full">${escapeHtmlString(txt)}</pre>${dl('data:text/plain;charset=utf-8,' + encodeURIComponent(txt), result.name)}`;
            }
            div.innerHTML = head + `<div class="flex-1 min-w-0 flex flex-col max-w-[85%] md:max-w-full">${inner}</div>`;
            stream.appendChild(div);
            scrollToBottom();
        }

        // --- Chat Logic ---

        function escapeHtmlString(unsafe) {
            return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }
        
        const scrollToBottom = () => {
            const stream = document.getElementById('chat-stream');
            stream.scrollTop = stream.scrollHeight;
        };

        function appendMessage(role, content, animate = true) {
            const stream = document.getElementById('chat-stream');
            const div = document.createElement('div');
            
            // Basic markdown parsing to HTML if marked is available
            let htmlContent = content;
            if(window.marked) {
                 htmlContent = marked.parse(content);
            } else {
                 htmlContent = escapeHtmlString(content).replace(/\n/g, '<br>');
            }

            if (role === 'user') {
                div.className = `flex justify-end w-full ${animate ? 'fade-in' : ''}`;
                div.innerHTML = `
                    <div class="max-w-[85%] md:max-w-[75%] px-5 py-3.5 bg-gemini-inputBg border border-gemini-border/40 rounded-[24px] rounded-br-sm text-[14px] leading-relaxed text-slate-200 shadow-sm relative overflow-hidden break-words">
                        ${htmlContent}
                    </div>
                `;
            } else {
                // Assistant message with canvas detection
                div.className = `flex w-full ${animate ? 'fade-in' : ''}`;
                div.innerHTML = `
                    <div class="flex-shrink-0 mr-4 mt-1 relative">
                        <div class="h-8 w-8 rounded-full bg-gradient-to-br from-gemini-accent to-blue-500 flex items-center justify-center text-black text-sm shadow-[0_0_15px_rgba(168,199,250,0.2)]">
                            <i class="fa-solid fa-sparkles text-[10px]"></i>
                        </div>
                    </div>
                    <div class="flex-1 max-w-[85%] md:max-w-full bg-transparent pt-1 text-[14.5px] text-slate-200 min-w-0">
                        <div class="output-response-zone break-words prose prose-invert max-w-none">
                            ${htmlContent}
                        </div>
                    </div>
                `;
                
                // Detect HTML block for canvas
                const codeMatch = content.match(/```html\n([\s\S]*?)```/);
                if (codeMatch && codeMatch[1]) {
                    const canvasHtml = codeMatch[1];
                    const btn = document.createElement('button');
                    btn.className = "mt-3 px-3 py-1.5 bg-gemini-card border border-gemini-border rounded-lg text-xs text-orange-400 hover:bg-[#323639] smooth-transition flex items-center gap-2";
                    btn.innerHTML = '<i class="fa-brands fa-html5"></i> View App in Canvas';
                    btn.onclick = () => {
                        window.toggleCanvasVisibility(true);
                        document.getElementById('live-canvas-code').value = canvasHtml;
                        document.getElementById('live-canvas-frame').srcdoc = canvasHtml;
                        document.getElementById('canvas-empty-state').style.display = 'none';
                        window.switchCanvasTab('preview');
                    };
                    div.querySelector('.flex-1').appendChild(btn);
                }
            }
            stream.appendChild(div);
            scrollToBottom();
        }

        window.processInputMessage = async () => {
            const inputEl = document.getElementById('user-prompt');
            let userText = inputEl.value.trim();
            if (!userText && !attachedFileContent && !attachedImageBase64) return;

            if(!isEngineReady) {
                 triggerNotificationToast('Engine not ready', 'Please initialize the WebLLM engine first.', 'fa-exclamation-circle', 'bg-yellow-600');
                 return;
            }

            let fullPrompt = userText;
            const chatImage = attachedImageBase64;
            const chatImageName = attachedFileName;
            if (chatImage) {
                fullPrompt = `[User attached an image: ${chatImageName || 'image.png'} — available to the AI tool engine]\n\n${userText || 'Process this image with the best matching tool.'}`;
                window.clearFileAttachment();
            } else if (attachedFileContent) {
                fullPrompt = `${attachedFileContent}\n\n${userText}`;
                window.clearFileAttachment();
            }

            // --- Deterministic tool intent detection ---
            // (the local model is small and sometimes refuses; this guarantees the real tools fire)
            const lc = userText.toLowerCase();
            // Identity questions — answered functionally (the small model hallucinates its identity otherwise)
            if (/(who are you|what are you|your name|who made you|who created you|which model|what model|are you (chatgpt|gpt|claude|gemini|anthropic|openai|google))/.test(lc)) {
                const s0 = document.getElementById('chat-stream');
                if (sessionMessages.length === 0) s0.innerHTML = '';
                appendMessage('user', fullPrompt);
                saveMessageToDB('user', fullPrompt);
                sessionMessages.push({ role: 'user', content: fullPrompt });
                inputEl.value = ''; inputEl.style.height = 'auto';
                const idn = `I'm **NexusAI** — a fully local AI running in your browser on WebGPU (nothing is sent to any server). I can chat, write complete code files, and run real image tools: background removal, image generation, upscale, colorize, repair, deblur, relight, sketch and more. Try attaching an image and saying *"remove the background"*, or say *"generate an image of …"*.`;
                appendMessage('assistant', idn);
                saveMessageToDB('assistant', idn);
                sessionMessages.push({ role: 'assistant', content: "I'm NexusAI, a local browser AI with real image tools (background removal, image generation, editing) that run automatically when requested." });
                return;
            }
            // Capability questions — answered functionally so the small model can never hallucinate "I can't"
            // Typo-tolerant: "can you gneerate iamges?" is a QUESTION (→ answer), while
            // "generate an image of a cat" is a COMMAND (→ execute). Distinguished by
            // question-form + the image word being the generic object (not followed by "of …").
            function _levQ(a, b) {
                const m = a.length, n = b.length;
                let prev = Array.from({ length: n + 1 }, (_, j) => j);
                for (let i = 1; i <= m; i++) {
                    const cur = [i];
                    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                    prev = cur;
                }
                return prev[n];
            }
            const _qToks = lc.split(/[^a-z0-9]+/).filter(Boolean);
            function _fuzzyQ(stem) {
                const tol = stem.length >= 8 ? 3 : stem.length >= 5 ? 2 : 1;
                return _qToks.some(t => Math.abs(t.length - stem.length) <= tol && _levQ(t, stem) <= tol);
            }
            const questionForm = /^(can|could|do|does|did|will|would|are|is|have|has|may|might)\b/.test(lc) && /\byou\b|\bu\b/.test(lc);
            const mentionsVisual = _fuzzyQ('image') || _fuzzyQ('images') || _fuzzyQ('picture') || _fuzzyQ('photo') || _fuzzyQ('video') || _fuzzyQ('tool') || _fuzzyQ('generat') || _fuzzyQ('generator') || _fuzzyQ('capab') || _fuzzyQ('abilit') || _fuzzyQ('feature');
            const specificSubject = /\b(of|with|featuring|showing|containing)\b/.test(lc);
            // A bare visual noun alone ("image", "photo", "logo") is a capability question,
            // not a generation command — there's nothing to generate from a single noun.
            const _NOUNS = ['image','images','picture','pictures','photo','photos','video','videos','logo','artwork','drawing','painting','portrait','wallpaper','illustration','avatar','scene','icon','face','character'];
            const bareNoun = _qToks.length <= 2 && _qToks.every(t => _NOUNS.some(st => _levQ(t, st) <= 2));
            const isCapabilityQ = !specificSubject && (bareNoun || questionForm && mentionsVisual
                || /^(what|who)\s+(can|do|are)\s+(you|u)\b|\bwhat can i do with you\b|^(help|tools|capabilities|abilities|features)\b/.test(lc)
                || /(what can you|what do you|your (tools|capabilities|abilities|features)|which tools|do you (have|support)|can you)\b[^.?!]*\b(tool|capab|abilit|feature|image|images|video|videos|picture|background|generate|generat)/.test(lc)
                || /^(tools|capabilities|abilities|features|help|what\b)/.test(lc) && /tool|capab|abilit|feature/.test(lc));
            if (isCapabilityQ) {
                const s0 = document.getElementById('chat-stream');
                if (sessionMessages.length === 0) s0.innerHTML = '';
                appendMessage('user', fullPrompt);
                saveMessageToDB('user', fullPrompt);
                sessionMessages.push({ role: 'user', content: fullPrompt });
                inputEl.value = ''; inputEl.style.height = 'auto';
                const caps = `**Yes — I have real image tools.** They run 100% locally on your device (no server, nothing uploaded):\n\n- 🖼️ **Background removal** — attach an image and say *"remove the background"* → transparent PNG\n- 🎨 **Image generation** — say *"generate an image of …"*\n- ⬆️ **Upscale / enhance** — attach an image + *"upscale this"*\n- 🌈 **Colorize** black & white photos\n- 🔧 **Repair / restore** old or damaged photos\n- 🔍 **Deblur** / sharpen\n- 💡 **Relight** / adjust lighting\n- ✏️ **Sketch / line-art** conversion\n- 👤 **Character / avatar** generation\n- 📄 **Text tasks** — answers, explanations, and complete standalone code files (HTML/CSS/JS)\n\nJust attach an image or type a request — the tool runs automatically.`;
                appendMessage('assistant', caps);
                saveMessageToDB('assistant', caps);
                sessionMessages.push({ role: 'assistant', content: 'I have real working image tools (background removal, image generation, upscale, colorize, repair, deblur, relight, sketch, character). They run automatically when requested. Everything is local.' });
                return;
            }
            // --- Conversational follow-up detection ---
            // Questions and meta-comments ("why can't you generate images here?",
            // "it is a question", "no i said why...") are NOT tool commands.
            const _imperativeStart = /^(generat|creat|make|draw|paint|design|upscal|colou?r|repair|restor|sketch|remov|show|give)\b/.test(lc);
            const _isFollowUpQ = /^(why|how come|what do you mean|i said|no[, ]*(i|you|it)|it'?s\b|it is\b|that'?s\b|that is\b|you said|you can'?t|didn'?t|ok(ay)?[, ]*(so|but|why)|oh[, ]*(so|but|why)|really|seriously|huh)\b/.test(lc)
                || (/\b(why|how come)\b/.test(lc) && !_imperativeStart);
            if (_isFollowUpQ) {
                const s1 = document.getElementById('chat-stream');
                if (sessionMessages.length === 0) s1.innerHTML = '';
                appendMessage('user', fullPrompt);
                saveMessageToDB('user', fullPrompt);
                sessionMessages.push({ role: 'user', content: fullPrompt });
                inputEl.value = ''; inputEl.style.height = 'auto';
                const toolMention = /generate|image|photo|picture|draw|background|video/i.test(lc);
                const answer = toolMention
                    ? `Yes, I can do that right here — your last message was phrased as a question about me, so no tool ran.\n\nTo make it happen, phrase it as a request:\n- *"generate an image of a happy man face"* → I'll generate it\n- attach a photo + *"remove the background"* → transparent PNG\n- attach a photo + *"upscale this"* / *"colorize"* / *"repair"* → those tools run instantly\n\nWant me to generate one now? Just tell me the subject. 🙂`
                    : `I'm here and all my tools are ready — just tell me what you'd like, e.g. *"generate an image of …"* or attach an image and say *"remove the background"*.`;
                appendMessage('assistant', answer);
                saveMessageToDB('assistant', answer);
                sessionMessages.push({ role: 'assistant', content: 'I confirmed my image tools work here and asked the user to phrase their request as a command.' });
                return;
            }
            const wantsBgRemove = !!chatImage && /(remov|delet|eras|clear|cut\s?out|isolat|extract|transparent|knock\s?out)[^.]*(background|\bbg\b)|background[^.]*(remov|delet|eras|gone|away)/.test(lc);
            const codeExclude = /\b(html|css|javascript|js\b|code|script|page|file|website|webapp|app|svg|function)\b/.test(lc);
            let wantsImgGen = !wantsBgRemove && !codeExclude && /(generat|creat|make|draw|produc|design|paint|render|give|show|image|picture|photo|logo|art)[^.]*\b(face|character|avatar|man|woman|girl|boy|person|animal|cat|dog|scene|landscape|portrait|icon|wallpaper|illustration|artwork|drawing|painting|image|picture|photo|logo)\b|\b(image|picture|logo|artwork|photo)\s+of\b/.test(lc);
            // --- Fuzzy (typo-tolerant) intent analysis ---
            // Understands mangled words like "hebenator" (~ "generator") by comparing each
            // word to tool keywords with bounded edit distance, so the small model is never
            // relied upon to "understand" the request.
            function _lev(a, b) {
                const m = a.length, n = b.length;
                let prev = Array.from({ length: n + 1 }, (_, j) => j);
                for (let i = 1; i <= m; i++) {
                    const cur = [i];
                    for (let j = 1; j <= n; j++) {
                        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                    }
                    prev = cur;
                }
                return prev[n];
            }
            const _toks = lc.split(/[^a-z0-9]+/).filter(Boolean);
            function fuzzyHit(stem) {
                const tol = stem.length >= 8 ? 3 : stem.length >= 5 ? 2 : 1;
                return _toks.some(t => Math.abs(t.length - stem.length) <= tol && _lev(t, stem) <= tol);
            }
            if (!wantsBgRemove && !wantsImgGen && !codeExclude) {
                const genWord = fuzzyHit('generat') || fuzzyHit('generator') || fuzzyHit('creat') || fuzzyHit('draw') || fuzzyHit('paint') || fuzzyHit('render') || fuzzyHit('design') || fuzzyHit('sketch') || fuzzyHit('image') || fuzzyHit('picture') || fuzzyHit('photo') || fuzzyHit('portrait') || fuzzyHit('logo') || fuzzyHit('artwork') || fuzzyHit('illustration') || fuzzyHit('wallpaper') || fuzzyHit('avatar');
                const visualWord = fuzzyHit('image') || fuzzyHit('picture') || fuzzyHit('photo') || fuzzyHit('face') || fuzzyHit('character') || fuzzyHit('avatar') || fuzzyHit('portrait') || fuzzyHit('logo') || fuzzyHit('drawing') || fuzzyHit('painting') || fuzzyHit('artwork') || fuzzyHit('illustration') || fuzzyHit('scene') || fuzzyHit('wallpaper') || fuzzyHit('icon') || fuzzyHit('man') || fuzzyHit('woman') || fuzzyHit('girl') || fuzzyHit('boy') || fuzzyHit('animal') || fuzzyHit('cat') || fuzzyHit('dog');
                // A generation word alone ("hebenator", "use the ai image generator") or a
                // visual word alone ("a logo for my shop") is enough to fire image generation.
                if (genWord || visualWord) wantsImgGen = true;
            }
            // Other integrated studio tools — routed by keyword (chatImage used automatically when present)
            const IMG_TOOLS = [
                { id: 'upscale',  re: /(upscale|up\s?scal|enlarge|higher resolution|more resolution|4k|\bhd\b|sharpen|enhance|increase.*(resolution|quality))/ },
                { id: 'color',    re: /(colouri[sz]e|colori[sz]e|add colou?r|colou?r.*photo|black and white.*(colou?r|colou?r)|b&w.*colou?r)/ },
                { id: 'repair',   re: /(repair|restor|old photo|damaged|scratched|torn|cracks)/ },
                { id: 'deblur',   re: /(deblur|unblur|blurry|out of focus|motion blur|make.*sharp(er)?)/ },
                { id: 'relight',  re: /(relight|lighting|light direction|brighten|darken|shadows?)/ },
                { id: 'sketch',   re: /(sketch|pencil|line ?art|outline|drawing.*(style|from))/ },
                { id: 'texture',  re: /\btexture/ },
                { id: 'character',re: /\b(character|avatar)\b/ }
            ];
            let routedTool = null;
            if (!wantsBgRemove && !wantsImgGen) {
                for (const r of IMG_TOOLS) {
                    if (r.re.test(lc) && (chatImage || ['texture', 'character'].includes(r.id))) { routedTool = r.id; break; }
                }
            }
            if (wantsBgRemove || wantsImgGen || routedTool) {
                const toolId = wantsBgRemove ? 'bg-remove' : (wantsImgGen ? 'img-gen' : routedTool);
                const s0 = document.getElementById('chat-stream');
                if (sessionMessages.length === 0) s0.innerHTML = '';
                appendMessage('user', fullPrompt);
                saveMessageToDB('user', fullPrompt);
                sessionMessages.push({ role: 'user', content: fullPrompt });
                inputEl.value = ''; inputEl.style.height = 'auto';
                const verb = wantsBgRemove ? `Removing the background from ${chatImageName || 'your image'}`
                    : wantsImgGen ? 'Generating your image'
                    : `Running the ${routedTool} tool`;
                appendMessage('assistant', `**${verb} now** — running the local AI engine…`);
                try {
                    const result = wantsImgGen
                        ? await requestNexusTool('img-gen', JSON.stringify({ prompt: userText || 'a beautiful detailed image' }), null)
                        : await requestNexusTool(toolId, JSON.stringify({ prompt: userText }), chatImage);
                    appendToolResult(result);
                    const note = `${toolId} executed (local AI, nothing left your device).`;
                    saveMessageToDB('assistant', note);
                    sessionMessages.push({ role: 'assistant', content: note + ' Result shown to the user as an attachment.' });
                } catch (err) {
                    appendMessage('assistant', `**Tool error:** ${err.message || err}`);
                    saveMessageToDB('assistant', `Tool error: ${err.message || err}`);
                    sessionMessages.push({ role: 'assistant', content: `Tool error: ${err.message || err}` });
                }
                return;
            }

            inputEl.value = '';
            inputEl.style.height = 'auto'; // Reset height
            
            // Remove welcome screen if it's the first message
            const stream = document.getElementById('chat-stream');
            if (sessionMessages.length === 0) {
                 stream.innerHTML = '';
            }

            appendMessage('user', fullPrompt);
            saveMessageToDB('user', fullPrompt);
            sessionMessages.push({ role: 'user', content: fullPrompt });
            
            // Show typing indicator
            const typingId = 'typing-' + Date.now();
            const typingDiv = document.createElement('div');
            typingDiv.id = typingId;
            typingDiv.className = `flex w-full fade-in`;
            typingDiv.innerHTML = `
                <div class="flex-shrink-0 mr-4 mt-1 relative">
                    <div class="h-8 w-8 rounded-full bg-gradient-to-br from-gemini-accent to-blue-500 flex items-center justify-center text-black text-sm shadow-[0_0_15px_rgba(168,199,250,0.2)]">
                        <i class="fa-solid fa-sparkles text-[10px]"></i>
                    </div>
                </div>
                <div class="flex-1 bg-transparent pt-2">
                    <div class="gemini-loading-dot"></div>
                    <div class="gemini-loading-dot mx-1"></div>
                    <div class="gemini-loading-dot"></div>
                </div>
            `;
            stream.appendChild(typingDiv);
            scrollToBottom();

            // Prepare system prompt (+ Nexus tool protocol so the model can run tools)
            const sysInstructions = (document.getElementById('config-system-prompt').value || "You are a helpful AI assistant.") + toolProtocol();
            const messages = [
                 { role: 'system', content: sysInstructions },
                 ...sessionMessages.slice(-10)   // only recent turns are re-processed each time (fast prefill)
            ];

            try {
                // Streaming Inference — tokens render live as the GPU generates them (low CPU, real production feel)
                document.getElementById(typingId).remove();
                const stream = document.getElementById('chat-stream');
                const liveDiv = document.createElement('div');
                liveDiv.className = 'flex w-full fade-in';
                liveDiv.innerHTML = `<div class="flex-shrink-0 mr-4 mt-1"><div class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-black text-sm shadow-[0_0_15px_rgba(168,199,250,0.2)]">AI</div></div><div class="flex-1 min-w-0 text-slate-200 leading-relaxed"><div class="msg-body"></div></div>`;
                stream.appendChild(liveDiv);
                const bodyEl = liveDiv.querySelector('.msg-body');
                let assistantMsg = '';
                let lastRender = 0;
                const render = (force) => {
                    const now = performance.now();
                    if (!force && now - lastRender < 60) return; // throttle DOM writes to ~16fps → minimal CPU
                    lastRender = now;
                    // Plain text during streaming (O(1) per token) — markdown parsed once at the end
                    const el = document.createElement('div');
                    el.style.whiteSpace = 'pre-wrap';
                    el.textContent = assistantMsg + ' ▍';
                    bodyEl.replaceChildren(el);
                    scrollToBottom();
                };
                // Simple single streaming request — the fast path that worked before
                const chunks = await engine.chat.completions.create({
                     messages: messages,
                     temperature: 0.3,
                     stream: true,
                     max_tokens: 32000
                });
                for await (const chunk of chunks) {
                    const c0 = chunk.choices && chunk.choices[0];
                    if (c0 && c0.delta && c0.delta.content) { assistantMsg += c0.delta.content; render(); }
                }
                bodyEl.innerHTML = (typeof marked !== 'undefined' ? marked.parse(assistantMsg) : assistantMsg);
                scrollToBottom();

                // Detect a Nexus tool command, e.g. [[TOOL:bg-remove]] or [[TOOL:img-gen|{"prompt":"..."}]]
                const toolMatch = assistantMsg.match(/\[\[TOOL:([a-zA-Z0-9\-]+)(?:\|([\s\S]*?))?\]\]/);
                if (toolMatch) {
                    const displayMsg = assistantMsg.replace(/\[\[TOOL:[\s\S]*?\]\]/g, '').trim();
                    // The live streaming bubble already shows the text — just run the tool
                    try {
                        const result = await requestNexusTool(toolMatch[1], toolMatch[2], chatImage);
                        appendToolResult(result);
                        saveMessageToDB('assistant', (displayMsg || `Running tool ${toolMatch[1]}…`) + `\n\n[Tool ${toolMatch[1]} executed — output delivered to the user]`);
                        sessionMessages.push({ role: 'assistant', content: (displayMsg || `Running tool ${toolMatch[1]}…`) + `\n\n[Tool ${toolMatch[1]} executed successfully. Its output (image/file/text) was shown to the user as an attachment.]` });
                    } catch (err) {
                        appendMessage('assistant', `**Tool error:** ${err.message || err}`);
                        saveMessageToDB('assistant', `Tool error: ${err.message || err}`);
                        sessionMessages.push({ role: 'assistant', content: `Tool error: ${err.message || err}` });
                    }
                } else {
                    // The live streaming bubble already shows the full answer — just persist it
                    saveMessageToDB('assistant', assistantMsg);
                    sessionMessages.push({ role: 'assistant', content: assistantMsg });
                }
                
            } catch (error) {
                console.error("Inference Error:", error);
                const tEl = document.getElementById(typingId);
                if (tEl) tEl.remove();
                appendMessage('assistant', `**Error during generation:** ${error.message}`);
            }
        };

        // Auto-resize textarea
        const textarea = document.getElementById('user-prompt');
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = 'auto';
        });

        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.processInputMessage();
            }
        });

        // Initialize App
        window.addEventListener('DOMContentLoaded', () => {
            initDB();
            // Auto-initialize the WebLLM engine — no button click needed
            setTimeout(() => { try { window.loadWebLLMEngine(); } catch (e) { console.warn(e); } }, 300);
            // Ask the NexusAI Omni Studio host for the full tool list (so the AI knows every tool id)
            if (window.parent !== window) {
                setTimeout(() => { try { window.parent.postMessage({ type: 'nexus-list-tools', reqId: 'init' }, '*'); } catch (e) {} }, 400);
            }
        });

    