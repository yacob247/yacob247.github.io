window.addEventListener('error', function(e) {
            if (e.target && e.target.src && e.target.src.includes('mp4-muxer')) {
                console.warn("Primary CDN failed. Loading backup CDN for Mp4Muxer...");
                const backupScript = document.createElement('script');
                backupScript.src = "https://unpkg.com/mp4-muxer@5.2.2/build/mp4-muxer.min.js";
                document.head.appendChild(backupScript);
            }
            if (e.target && e.target.src && e.target.src.includes('lame.all.js')) {
                console.warn("Primary CDN failed. Loading backup CDN for lamejs...");
                const backupScript = document.createElement('script');
                backupScript.src = "https://unpkg.com/@breezystack/lamejs@1.2.7/dist/lame.all.js";
                document.head.appendChild(backupScript);
            }
        }, true);

// DOM Elements
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        const settingsPanel = document.getElementById('settingsPanel');
        const processingPanel = document.getElementById('processingPanel');
        const resultPanel = document.getElementById('resultPanel');

        const originalFileName = document.getElementById('originalFileName');
        const originalFileSize = document.getElementById('originalFileSize');
        const originalResolution = document.getElementById('originalResolution');
        const originalDuration = document.getElementById('originalDuration');
        const smartSkipIndicator = document.getElementById('smartSkipIndicator');

        const sizeLimitSelect = document.getElementById('sizeLimit');
        const audioModeSelect = document.getElementById('audioMode');
        const fpsSelect = document.getElementById('fps');
        const resolutionSelect = document.getElementById('resolution');

        const startBtn = document.getElementById('startBtn');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const currentStepText = document.getElementById('currentStepText');
        const previewCanvas = document.getElementById('previewCanvas');
        const elapsedTimeLabel = document.getElementById('elapsedTime');
        const frameCounterLabel = document.getElementById('frameCounter');

        const resultHeader = document.getElementById('resultHeader');
        const resultOriginalSize = document.getElementById('resultOriginalSize');
        const newFileSize = document.getElementById('newFileSize');
        const spaceSavedBadge = document.getElementById('spaceSavedBadge');
        const downloadLink = document.getElementById('downloadLink');
        const resetBtn = document.getElementById('resetBtn');
        const hiddenVideo = document.getElementById('hiddenProcessingVideo');

        // Mode Switcher Elements
        const modeVideoBtn = document.getElementById('modeVideoBtn');
        const modeAudioBtn = document.getElementById('modeAudioBtn');
        const videoCardWrapper = document.getElementById('videoCardWrapper');
        const audioCardWrapper = document.getElementById('audioCardWrapper');

        function setMode(mode) {
            if (mode === 'audio') {
                videoCardWrapper.classList.add('hidden');
                audioCardWrapper.classList.remove('hidden');
                modeAudioBtn.classList.add('bg-neutral-600', 'text-neutral-100');
                modeAudioBtn.classList.remove('text-neutral-300');
                modeVideoBtn.classList.remove('bg-neutral-600', 'text-neutral-100');
                modeVideoBtn.classList.add('text-neutral-300');
            } else {
                audioCardWrapper.classList.add('hidden');
                videoCardWrapper.classList.remove('hidden');
                modeVideoBtn.classList.add('bg-neutral-600', 'text-neutral-100');
                modeVideoBtn.classList.remove('text-neutral-300');
                modeAudioBtn.classList.remove('bg-neutral-600', 'text-neutral-100');
                modeAudioBtn.classList.add('text-neutral-300');
            }
        }
        modeVideoBtn.addEventListener('click', () => setMode('video'));
        modeAudioBtn.addEventListener('click', () => setMode('audio'));

        // State
        let currentFile = null;
        let originalMetadata = null;
        let isCompressing = false;

        // Custom Premium Toast Notification Helper
        function showToast(message, type = 'error') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `p-4 rounded-lg shadow-lg text-sm font-medium border transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto ${
                type === 'error' 
                    ? 'bg-neutral-950/90 border-neutral-600/50 text-neutral-300 shadow-black/20' 
                    : 'bg-neutral-950/90 border-neutral-600/50 text-neutral-300 shadow-black/20'
            }`;
            toast.innerHTML = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.remove('translate-y-2', 'opacity-0');
            }, 10);

            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }

        // Warning on backgrounding
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && isCompressing) {
                showToast("Tab is in the background. Encoding continues but the browser may throttle speed.", "error");
            }
        });

        function formatBytes(bytes, decimals = 2) {
            if (!+bytes) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        }

        function formatDuration(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s.toString().padStart(2, '0')}`;
        }

        function updateEstimates() {
            if (!originalMetadata) return;
            const selectedLimit = sizeLimitSelect.value;
            if (selectedLimit === 'none') {
                smartSkipIndicator.textContent = "No target limit. Will use default medium quality.";
                smartSkipIndicator.className = "text-[11px] text-neutral-300 mt-1.5 block font-medium";
                return;
            }

            const limitBytes = parseInt(selectedLimit, 10);
            if (currentFile.size <= limitBytes) {
                smartSkipIndicator.textContent = `🎉 SMART-SKIP: Your file (${formatBytes(currentFile.size)}) is already under the target limit! Click below to save it instantly.`;
                smartSkipIndicator.className = "text-[11px] text-neutral-300 mt-1.5 block font-semibold";
            } else {
                let availableBits = limitBytes * 8 * 0.90; // 10% structural header margin

                if (audioModeSelect.value === 'extract') {
                    const audioBits = 128000 * originalMetadata.duration; // 128kbps AAC
                    availableBits -= audioBits;
                }

                const calculatedMaxBitrate = Math.floor(availableBits / originalMetadata.duration);
                smartSkipIndicator.textContent = `⚖️ Max target video stream rate: ${formatBytes(calculatedMaxBitrate/8)}/sec to secure a final ${formatBytes(limitBytes)} size.`;
                smartSkipIndicator.className = "text-[11px] text-neutral-300 mt-1.5 block font-medium";
            }
        }

        sizeLimitSelect.addEventListener('change', updateEstimates);
        audioModeSelect.addEventListener('change', updateEstimates);

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dropzone-active'); });
        dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('dropzone-active'); });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault(); dropzone.classList.remove('dropzone-active');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        function handleFile(file) {
            if (!file.type.startsWith('video/')) {
                showToast("Please supply a valid video format file.", "error"); return;
            }

            currentFile = file;
            originalFileName.textContent = file.name;
            originalFileSize.textContent = formatBytes(file.size);

            const videoURL = URL.createObjectURL(file);
            hiddenVideo.src = videoURL;
            hiddenVideo.preload = 'auto';

            hiddenVideo.onloadedmetadata = () => {
                originalResolution.textContent = `${hiddenVideo.videoWidth} x ${hiddenVideo.videoHeight}`;
                originalDuration.textContent = formatDuration(hiddenVideo.duration);
                originalMetadata = { width: hiddenVideo.videoWidth, height: hiddenVideo.videoHeight, duration: hiddenVideo.duration };

                updateEstimates();
                dropzone.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
            };
        }

        async function extractAndEncodeAudio(file) {
            currentStepText.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Step 1: Extracting Audio Track...`;
            progressBar.style.width = '0%';
            progressText.textContent = '0%';

            try {
                const arrayBuffer = await file.arrayBuffer();
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                const sampleRate = audioBuffer.sampleRate;
                const numberOfChannels = audioBuffer.numberOfChannels;

                const encodedAudioChunks = [];
                const audioEncoder = new AudioEncoder({
                    output: (chunk, meta) => encodedAudioChunks.push({ chunk, meta }),
                    error: (e) => console.error("Audio Encoder Error:", e)
                });

                audioEncoder.configure({
                    codec: 'mp4a.40.2', // Standard AAC Audio configuration
                    sampleRate: sampleRate,
                    numberOfChannels: numberOfChannels,
                    bitrate: 128000
                });

                const framesPerChunk = Math.floor(sampleRate * 0.04);
                const totalFrames = audioBuffer.length;
                let offset = 0;
                let timestampUs = 0;

                let lastYieldTime = performance.now();

                while (offset < totalFrames) {
                    if (!isCompressing) return null;

                    const frameCount = Math.min(framesPerChunk, totalFrames - offset);
                    const planarData = new Float32Array(frameCount * numberOfChannels);

                    for (let c = 0; c < numberOfChannels; c++) {
                        const channelData = audioBuffer.getChannelData(c);
                        planarData.set(channelData.subarray(offset, offset + frameCount), c * frameCount);
                    }

                    const audioData = new AudioData({
                        format: 'f32-planar',
                        sampleRate: sampleRate,
                        numberOfChannels: numberOfChannels,
                        numberOfFrames: frameCount,
                        timestamp: timestampUs,
                        data: planarData
                    });

                    audioEncoder.encode(audioData);
                    audioData.close();

                    offset += frameCount;
                    timestampUs += Math.round((frameCount / sampleRate) * 1000000);

                    // Yield and update progress dynamically every 50ms (never freeze UI thread)
                    if (performance.now() - lastYieldTime > 50) {
                        const p = (offset / totalFrames) * 100;
                        progressBar.style.width = `${p}%`;
                        progressText.textContent = `${Math.round(p)}%`;
                        await new Promise(r => setTimeout(r, 0));
                        lastYieldTime = performance.now();
                    }
                }

                await audioEncoder.flush();
                return { encodedAudioChunks, sampleRate, numberOfChannels };

            } catch (err) {
                console.warn("Audio extraction failed or file has no audio:", err);
                return null;
            }
        }

        async function getSupportedVideoConfig(width, height, framerate, bitrate) {
            const candidates = [
                'avc1.640034', // High Profile, Level 5.2 (Supports up to 4K / 1080p, very high compatibility)
                'avc1.4d0034', // Main Profile, Level 5.2 (Supports up to 4K, extremely robust)
                'avc1.64002a', // High Profile, Level 4.2 (Standard 1080p profile)
                'avc1.4d002a', // Main Profile, Level 4.2 (Standard 1080p Main profile)
                'avc1.42003e', // Baseline Profile, Level 6.2 (Safe fallback for extreme heights)
                'avc1.42001f'  // Baseline Profile, Level 3.1 (Supports up to 720p only)
            ];

            // 1. Try Hardware Acceleration profile configurations first
            for (const codec of candidates) {
                const config = {
                    codec: codec,
                    width: width,
                    height: height,
                    bitrate: bitrate,
                    framerate: framerate,
                    hardwareAcceleration: 'prefer-hardware',
                    latencyMode: 'realtime'
                };
                try {
                    const support = await VideoEncoder.isConfigSupported(config);
                    if (support.supported) {
                        console.log(`Hardware accelerated profile selected: ${codec}`);
                        return support.config || config;
                    }
                } catch (e) {
                    console.warn(`Hardware profile validation failed for ${codec}:`, e);
                }
            }

            // 2. Try Software fallback profile configurations if hardware encoders are busy or unsupported
            console.warn("No compatible hardware profile found. Attempting software-only profiles...");
            for (const codec of candidates) {
                const config = {
                    codec: codec,
                    width: width,
                    height: height,
                    bitrate: bitrate,
                    framerate: framerate,
                    hardwareAcceleration: 'prefer-software',
                    latencyMode: 'realtime'
                };
                try {
                    const support = await VideoEncoder.isConfigSupported(config);
                    if (support.supported) {
                        console.log(`Software fallback profile selected: ${codec}`);
                        return support.config || config;
                    }
                } catch (e) {
                    console.warn(`Software profile validation failed for ${codec}:`, e);
                }
            }

            // 3. Absolute minimum fallback to guarantee execution
            console.warn("Waterfall capability check failed. Forcing Main Profile configuration...");
            return {
                codec: 'avc1.4d002a',
                width: width,
                height: height,
                bitrate: bitrate,
                framerate: framerate,
                hardwareAcceleration: 'no-preference',
                latencyMode: 'realtime'
            };
        }

        startBtn.addEventListener('click', async () => {
            if (!currentFile || !originalMetadata || isCompressing) return;

            // Secure original metadata to a local execution scope
            const localMetadata = { ...originalMetadata };

            // Enforce library load validation
            if (typeof Mp4Muxer === 'undefined') {
                showToast("The MP4 Multiplexer engine failed to initialize. Please check your internet connection and reload.", "error");
                return;
            }

            // -----------------------------------------------------------------
            // DIRECT CPU MP3 EXTRACTION PATH FROM VIDEO DROPDOWN
            // -----------------------------------------------------------------
            if (audioModeSelect.value === 'mp3_only') {
                isCompressing = true;
                settingsPanel.classList.add('hidden');
                processingPanel.classList.remove('hidden');
                const startTime = performance.now();

                currentStepText.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Extracting and Isolating Audio Track...`;
                progressBar.style.width = '0%';
                progressText.textContent = '0%';

                try {
                    const arrayBuffer = await currentFile.arrayBuffer();
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                    currentStepText.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Compressing Audio to MP3 (High-Speed CPU LameJS)...`;

                    const onProgress = (pct) => {
                        progressBar.style.width = `${pct}%`;
                        progressText.textContent = `${Math.round(pct)}%`;
                        elapsedTimeLabel.textContent = `${((performance.now() - startTime) / 1000).toFixed(1)}s`;
                    };

                    const mp3Blob = await encodeMp3(audioBuffer, 128, false, onProgress);

                    // Switch interface smoothly to Audio Results Panel
                    currentAudioFile = currentFile;
                    setMode('audio');
                    showAudioResults(mp3Blob, false, 'mp3');
                    processingPanel.classList.add('hidden');
                    isCompressing = false;
                } catch (err) {
                    console.error("Direct MP3 Extraction Failed:", err);
                    showToast("Failed to isolate MP3 audio track: " + err.message, "error");
                    resetState();
                }
                return;
            }

            const selectedLimit = sizeLimitSelect.value;
            if (selectedLimit !== 'none' && currentFile.size <= parseInt(selectedLimit, 10)) {
                showResults(currentFile, true);
                return;
            }

            isCompressing = true;
            settingsPanel.classList.add('hidden');
            processingPanel.classList.remove('hidden');
            const startTime = performance.now();

            let audioConfig = null;
            let audioChunks = [];

            if (audioModeSelect.value === 'extract') {
                const audioResult = await extractAndEncodeAudio(currentFile);
                if (audioResult) {
                    audioChunks = audioResult.encodedAudioChunks;
                    audioConfig = {
                        codec: 'aac',
                        sampleRate: audioResult.sampleRate,
                        numberOfChannels: audioResult.numberOfChannels
                    };
                }
            }

            currentStepText.innerHTML = `<svg class="animate-pulse -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Step 2: 16x Video Engine & Muxing...`;
            progressBar.style.width = '0%';
            progressText.textContent = '0%';

            const targetRes = resolutionSelect.value;
            const targetFps = parseInt(fpsSelect.value, 10);
            let targetBitrate = 2000000;

            if (selectedLimit !== 'none') {
                const limitBytes = parseInt(selectedLimit, 10);
                let availableBits = limitBytes * 8 * 0.90;
                if (audioConfig) availableBits -= (128000 * localMetadata.duration);
                targetBitrate = Math.max(200000, Math.floor(availableBits / localMetadata.duration));
            }

            let outWidth = localMetadata.width;
            let outHeight = localMetadata.height;
            if (targetRes !== 'original') {
                const targetHeight = parseInt(targetRes, 10);
                if (outHeight > targetHeight) {
                    outHeight = targetHeight;
                    outWidth = Math.round(outHeight * (localMetadata.width / localMetadata.height));
                }
            }
            if (outWidth % 2 !== 0) outWidth -= 1;
            if (outHeight % 2 !== 0) outHeight -= 1;

            previewCanvas.width = outWidth;
            previewCanvas.height = outHeight;
            const ctx = previewCanvas.getContext('2d');

            if (!('VideoEncoder' in window)) {
                showToast("Your current browser is missing standard WebCodecs support.", "error"); 
                resetState(); 
                return;
            }

            const muxerOptions = {
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: { codec: 'avc', width: outWidth, height: outHeight },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset' 
            };
            if (audioConfig) muxerOptions.audio = audioConfig;

            const muxer = new Mp4Muxer.Muxer(muxerOptions);

            let videoEncoder;
            try {
                const verifiedVideoConfig = await getSupportedVideoConfig(outWidth, outHeight, targetFps, targetBitrate);

                videoEncoder = new VideoEncoder({
                    output: (chunk, meta) => {
                        let safeMeta = meta;
                        if (meta) {
                            safeMeta = { ...meta };
                            if (safeMeta.decoderConfig === null || safeMeta.decoderConfig === undefined) {
                                delete safeMeta.decoderConfig;
                            }
                        }
                        muxer.addVideoChunk(chunk, safeMeta);
                    },
                    error: (e) => { 
                        console.error("Asynchronous Codec pipeline failed:", e); 
                        showToast("Hardware pipeline error: " + e.message, "error"); 
                        resetState(); 
                    }
                });

                videoEncoder.configure(verifiedVideoConfig);
                console.log("Hardware/Software codec configured:", verifiedVideoConfig);
            } catch (err) {
                console.error("Synchronous configuration crash:", err);
                showToast("System failed initializing local GPU encoder profile.", "error"); 
                resetState(); 
                return;
            }

            hiddenVideo.muted = true;
            hiddenVideo.playbackRate = 16.0; // 16x fast extraction rate

            let lastEncodedMediaTime = -1;
            let lastKeyFrameMediaTime = -1; 
            let processedFrameCount = 0;
            const targetFrameInterval = 1 / targetFps;
            const duration = localMetadata.duration;

            const processFastFrame = (now, metadata) => {
                if (!isCompressing) return;
                const currentMediaTime = metadata ? metadata.mediaTime : hiddenVideo.currentTime;

                if (currentMediaTime - lastEncodedMediaTime >= targetFrameInterval || lastEncodedMediaTime === -1) {
                    ctx.drawImage(hiddenVideo, 0, 0, outWidth, outHeight);
                    const frameTimestamp = Math.round(currentMediaTime * 1000000);

                    while (audioChunks.length > 0 && audioChunks[0].chunk.timestamp <= frameTimestamp) {
                        const aChunk = audioChunks.shift();
                        let safeMeta = aChunk.meta;
                        if (safeMeta) {
                            safeMeta = { ...safeMeta };
                            if (safeMeta.decoderConfig === null || safeMeta.decoderConfig === undefined) {
                                delete safeMeta.decoderConfig;
                            }
                        }
                        muxer.addAudioChunk(aChunk.chunk, safeMeta);
                    }

                    const frame = new VideoFrame(previewCanvas, { timestamp: frameTimestamp });

                    const isKeyFrame = lastKeyFrameMediaTime === -1 || (currentMediaTime - lastKeyFrameMediaTime) >= 5.0;
                    if (isKeyFrame) {
                        lastKeyFrameMediaTime = currentMediaTime;
                    }

                    try {
                        videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                    } catch (e) {
                        console.error("Encoding runtime failure:", e);
                        if (e.name === 'QuotaExceededError') {
                            showToast("Codec reclaimed. Keep the browser tab focused during operations.", "error");
                        } else {
                            showToast("Encoding engine issue: " + e.message, "error");
                        }
                        frame.close();
                        resetState();
                        return;
                    }

                    frame.close();

                    lastEncodedMediaTime = currentMediaTime;
                    processedFrameCount++;

                    const progress = (currentMediaTime / duration) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `${Math.min(100, Math.round(progress))}%`;
                    elapsedTimeLabel.textContent = `${((performance.now() - startTime) / 1000).toFixed(1)}s`;
                    frameCounterLabel.textContent = processedFrameCount;
                }

                if (currentMediaTime < duration && !hiddenVideo.ended) {
                    if ('requestVideoFrameCallback' in hiddenVideo) {
                        hiddenVideo.requestVideoFrameCallback(processFastFrame);
                    } else {
                        requestAnimationFrame((n) => processFastFrame(n, { mediaTime: hiddenVideo.currentTime }));
                    }
                }
            };

            hiddenVideo.onended = async () => {
                if (!isCompressing) return;
                isCompressing = false;
                progressBar.style.width = `100%`;
                progressText.textContent = `100%`;

                while (audioChunks.length > 0) {
                    const aChunk = audioChunks.shift();
                    let safeMeta = aChunk.meta;
                    if (safeMeta) {
                        safeMeta = { ...safeMeta };
                        if (safeMeta.decoderConfig === null || safeMeta.decoderConfig === undefined) {
                            delete safeMeta.decoderConfig;
                        }
                    }
                    muxer.addAudioChunk(aChunk.chunk, safeMeta);
                }

                await videoEncoder.flush();
                muxer.finalize();

                const compressedBlob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
                showResults(compressedBlob, false);
            };

            try {
                await hiddenVideo.play();
                if ('requestVideoFrameCallback' in hiddenVideo) {
                    hiddenVideo.requestVideoFrameCallback(processFastFrame);
                } else {
                    requestAnimationFrame((n) => processFastFrame(n, { mediaTime: hiddenVideo.currentTime }));
                }
            } catch (err) {
                console.error(err);
                showToast("System playback sequence blocked. Click to retry.", "error");
                resetState();
            }
        });

        // --- Showing Results ---
        function showResults(blob, wasSkipped) {
            isCompressing = false;
            processingPanel.classList.add('hidden');
            resultPanel.classList.remove('hidden');

            resultOriginalSize.textContent = formatBytes(currentFile.size);
            let finalBlob = blob;

            if (wasSkipped) {
                resultHeader.textContent = "Instant Smart-Skip Complete!";
                newFileSize.textContent = formatBytes(currentFile.size);
                spaceSavedBadge.textContent = "File is already under limits!";
                finalBlob = currentFile;
            } else {
                resultHeader.textContent = "Compression & Muxing Complete!";
                if (blob.size >= currentFile.size) {
                    newFileSize.textContent = formatBytes(currentFile.size);
                    spaceSavedBadge.textContent = "Swapped to Original (Compressed was larger)";
                    finalBlob = currentFile;
                } else {
                    newFileSize.textContent = formatBytes(blob.size);
                    const pctSaved = ((currentFile.size - blob.size) / currentFile.size) * 100;
                    spaceSavedBadge.textContent = `Massively reduced by ${pctSaved.toFixed(1)}%`;
                }
            }

            const url = URL.createObjectURL(finalBlob);
            downloadLink.href = url;
            const originalName = currentFile.name.replace(/\.[^/.]+$/, "");
            const ext = finalBlob === currentFile ? currentFile.name.split('.').pop() : 'mp4';
            downloadLink.download = `${originalName}_squashed.${ext}`;
            showToast("Video compressed and built successfully!", "success");
        }

        function resetState() {
            isCompressing = false;
            currentFile = null;
            originalMetadata = null;
            fileInput.value = '';
            processingPanel.classList.add('hidden');
            resultPanel.classList.add('hidden');
            settingsPanel.classList.add('hidden');
            dropzone.classList.remove('hidden');
        }

        resetBtn.addEventListener('click', resetState);

        // =====================================================
        // AUDIO-ONLY COMPRESSOR ENGINE
        // =====================================================

        // Audio DOM Elements
        const audioDropzone = document.getElementById('audioDropzone');
        const audioFileInput = document.getElementById('audioFileInput');
        const audioSettingsPanel = document.getElementById('audioSettingsPanel');
        const audioProcessingPanel = document.getElementById('audioProcessingPanel');
        const audioResultPanel = document.getElementById('audioResultPanel');

        const audioOriginalFileName = document.getElementById('audioOriginalFileName');
        const audioOriginalFileSize = document.getElementById('audioOriginalFileSize');
        const audioOriginalChannels = document.getElementById('audioOriginalChannels');
        const audioOriginalDuration = document.getElementById('audioOriginalDuration');

        const audioFormatSelect = document.getElementById('audioFormat');
        const audioFormatIndicator = document.getElementById('audioFormatIndicator');
        const audioBitrateSelect = document.getElementById('audioBitrate');
        const audioBitrateWrapper = document.getElementById('audioBitrateWrapper');
        const audioSizeLimitSelect = document.getElementById('audioSizeLimit');
        const audioSmartSkipIndicator = document.getElementById('audioSmartSkipIndicator');
        const audioChannelsSelect = document.getElementById('audioChannels');

        const audioStartBtn = document.getElementById('audioStartBtn');
        const audioProgressBar = document.getElementById('audioProgressBar');
        const audioProgressText = document.getElementById('audioProgressText');
        const audioCurrentStepText = document.getElementById('audioCurrentStepText');
        const audioElapsedTime = document.getElementById('audioElapsedTime');
        const audioFormatLabel = document.getElementById('audioFormatLabel');

        const audioResultHeader = document.getElementById('audioResultHeader');
        const audioResultOriginalSize = document.getElementById('audioResultOriginalSize');
        const audioNewFileSize = document.getElementById('audioNewFileSize');
        const audioSpaceSavedBadge = document.getElementById('audioSpaceSavedBadge');
        const audioDownloadLink = document.getElementById('audioDownloadLink');
        const audioResetBtn = document.getElementById('audioResetBtn');

        // Audio State
        let currentAudioFile = null;
        let audioMetadata = null; 
        let decodedAudioBuffer = null;
        let isAudioCompressing = false;

        function resetAudioState() {
            isAudioCompressing = false;
            currentAudioFile = null;
            audioMetadata = null;
            decodedAudioBuffer = null;
            audioFileInput.value = '';
            audioProcessingPanel.classList.add('hidden');
            audioResultPanel.classList.add('hidden');
            audioSettingsPanel.classList.add('hidden');
            audioDropzone.classList.remove('hidden');
        }

        function updateAudioFormatUI() {
            const fmt = audioFormatSelect.value;
            if (fmt === 'wav') {
                audioBitrateWrapper.classList.add('hidden');
                audioFormatIndicator.textContent = "WAV is uncompressed \u2014 no quality loss, but largest file size.";
            } else {
                audioBitrateWrapper.classList.remove('hidden');
                audioFormatIndicator.textContent = fmt === 'mp3'
                    ? "MP3 uses a local LAME encoder \u2014 no upload required."
                    : "AAC uses your browser's native WebCodecs encoder.";
            }
            updateAudioEstimates();
        }

        function updateAudioEstimates() {
            if (!audioMetadata) return;
            const selectedLimit = audioSizeLimitSelect.value;
            if (selectedLimit === 'none' || audioFormatSelect.value === 'wav') {
                audioSmartSkipIndicator.textContent = audioFormatSelect.value === 'wav'
                    ? "Smart size limits don't apply to uncompressed WAV output."
                    : "No target limit. Will use the bitrate selected above.";
                audioSmartSkipIndicator.className = "text-[11px] text-neutral-300 mt-1.5 block font-medium";
                return;
            }
            const limitBytes = parseInt(selectedLimit, 10);
            if (currentAudioFile.size <= limitBytes) {
                audioSmartSkipIndicator.textContent = `\ud83c\udf89 SMART-SKIP: Your file (${formatBytes(currentAudioFile.size)}) is already under the target limit!`;
                audioSmartSkipIndicator.className = "text-[11px] text-neutral-300 mt-1.5 block font-semibold";
            } else {
                const availableBits = limitBytes * 8 * 0.92;
                const calculatedBitrate = Math.max(32000, Math.floor(availableBits / audioMetadata.duration));
                audioSmartSkipIndicator.textContent = `\u2696\ufe0f Target bitrate ~${Math.round(calculatedBitrate / 1000)} kbps to fit a ${formatBytes(limitBytes)} limit.`;
                audioSmartSkipIndicator.className = "text-[11px] text-neutral-300 mt-1.5 block font-medium";
            }
        }

        audioFormatSelect.addEventListener('change', updateAudioFormatUI);
        audioBitrateSelect.addEventListener('change', updateAudioEstimates);
        audioSizeLimitSelect.addEventListener('change', updateAudioEstimates);

        audioDropzone.addEventListener('click', () => audioFileInput.click());
        audioDropzone.addEventListener('dragover', (e) => { e.preventDefault(); audioDropzone.classList.add('dropzone-active'); });
        audioDropzone.addEventListener('dragleave', (e) => { e.preventDefault(); audioDropzone.classList.remove('dropzone-active'); });
        audioDropzone.addEventListener('drop', (e) => {
            e.preventDefault(); audioDropzone.classList.remove('dropzone-active');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleAudioFile(e.dataTransfer.files[0]);
        });
        audioFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) handleAudioFile(e.target.files[0]);
        });

        async function handleAudioFile(file) {
            const looksLikeAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|aac|opus|wma)$/i.test(file.name);
            if (!looksLikeAudio) {
                showToast("Please supply a valid audio format file.", "error"); return;
            }

            currentAudioFile = file;
            audioOriginalFileName.textContent = file.name;
            audioOriginalFileSize.textContent = formatBytes(file.size);
            audioOriginalChannels.textContent = "Reading...";
            audioOriginalDuration.textContent = "Reading...";

            try {
                const arrayBuffer = await file.arrayBuffer();
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                decodedAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                audioMetadata = {
                    duration: decodedAudioBuffer.duration,
                    sampleRate: decodedAudioBuffer.sampleRate,
                    numberOfChannels: decodedAudioBuffer.numberOfChannels
                };

                audioOriginalChannels.textContent = decodedAudioBuffer.numberOfChannels === 1 ? "Mono" : "Stereo";
                audioOriginalDuration.textContent = formatDuration(decodedAudioBuffer.duration);

                updateAudioFormatUI();
                audioDropzone.classList.add('hidden');
                audioSettingsPanel.classList.remove('hidden');
            } catch (err) {
                console.error("Audio decode failed:", err);
                showToast("Couldn't decode that audio file. Try a different format.", "error");
                resetAudioState();
            }
        }

        // --- WAV Encoder (uncompressed PCM16, written manually) ---
        function encodeWav(audioBuffer, forceMono) {
            const numChannels = forceMono ? 1 : audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const numFrames = audioBuffer.length;
            const bytesPerSample = 2;
            const blockAlign = numChannels * bytesPerSample;
            const dataSize = numFrames * blockAlign;
            const buffer = new ArrayBuffer(44 + dataSize);
            const view = new DataView(buffer);

            function writeString(offset, str) {
                for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
            }

            writeString(0, 'RIFF');
            view.setUint32(4, 36 + dataSize, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true); // PCM
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * blockAlign, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, 16, true); // bits per sample
            writeString(36, 'data');
            view.setUint32(40, dataSize, true);

            const channelData = [];
            for (let c = 0; c < audioBuffer.numberOfChannels; c++) channelData.push(audioBuffer.getChannelData(c));

            let offset = 44;
            for (let i = 0; i < numFrames; i++) {
                if (forceMono && audioBuffer.numberOfChannels > 1) {
                    let sum = 0;
                    for (let c = 0; c < audioBuffer.numberOfChannels; c++) sum += channelData[c][i];
                    const sample = Math.max(-1, Math.min(1, sum / audioBuffer.numberOfChannels));
                    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                    offset += 2;
                } else {
                    for (let c = 0; c < numChannels; c++) {
                        const sample = Math.max(-1, Math.min(1, channelData[c][i]));
                        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                        offset += 2;
                    }
                }
            }

            return new Blob([buffer], { type: 'audio/wav' });
        }

        async function encodeMp3(audioBuffer, bitrateKbps, forceMono, onProgress) {
            if (typeof lamejs === 'undefined') {
                throw new Error("MP3 encoder library failed to load. Check your connection and reload.");
            }
            const sampleRate = audioBuffer.sampleRate;
            const numChannels = forceMono ? 1 : Math.min(2, audioBuffer.numberOfChannels);
            const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrateKbps);

            const numFrames = audioBuffer.length;
            const sampleBlockSize = 1152;
            const mp3Data = [];

            function floatTo16(channelFloat) {
                const out = new Int16Array(channelFloat.length);
                for (let i = 0; i < channelFloat.length; i++) {
                    const s = Math.max(-1, Math.min(1, channelFloat[i]));
                    out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                return out;
            }

            let left, right = null;
            if (numChannels === 1) {
                if (audioBuffer.numberOfChannels > 1 && forceMono) {
                    const ch0 = audioBuffer.getChannelData(0);
                    const ch1 = audioBuffer.getChannelData(1);
                    const mixed = new Float32Array(numFrames);
                    for (let i = 0; i < numFrames; i++) mixed[i] = (ch0[i] + ch1[i]) / 2;
                    left = floatTo16(mixed);
                } else {
                    left = floatTo16(audioBuffer.getChannelData(0));
                }
            } else {
                left = floatTo16(audioBuffer.getChannelData(0));
                right = floatTo16(audioBuffer.getChannelData(1));
            }

            let lastYield = performance.now();
            for (let i = 0; i < numFrames; i += sampleBlockSize) {
                const leftChunk = left.subarray(i, i + sampleBlockSize);
                let mp3buf;
                if (numChannels === 2 && right) {
                    const rightChunk = right.subarray(i, i + sampleBlockSize);
                    mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                } else {
                    mp3buf = mp3encoder.encodeBuffer(leftChunk);
                }
                if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));

                if (performance.now() - lastYield > 50) {
                    onProgress((i / numFrames) * 100);
                    await new Promise(r => setTimeout(r, 0));
                    lastYield = performance.now();
                }
            }

            const finalBuf = mp3encoder.flush();
            if (finalBuf.length > 0) mp3Data.push(new Int8Array(finalBuf));

            onProgress(100);
            return new Blob(mp3Data, { type: 'audio/mp3' });
        }

        async function encodeM4a(audioBuffer, bitrateKbps, forceMono, onProgress) {
            if (typeof Mp4Muxer === 'undefined') {
                throw new Error("The MP4 Multiplexer engine failed to initialize. Please check your connection and reload.");
            }
            if (!('AudioEncoder' in window)) {
                throw new Error("Your browser is missing WebCodecs AudioEncoder support.");
            }

            const sampleRate = audioBuffer.sampleRate;
            const numberOfChannels = forceMono ? 1 : audioBuffer.numberOfChannels;

            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                audio: { codec: 'aac', sampleRate: sampleRate, numberOfChannels: numberOfChannels },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset'
            });

            const audioEncoder = new AudioEncoder({
                output: (chunk, meta) => {
                    let safeMeta = meta;
                    if (meta) {
                        safeMeta = { ...meta };
                        if (safeMeta.decoderConfig === null || safeMeta.decoderConfig === undefined) delete safeMeta.decoderConfig;
                    }
                    muxer.addAudioChunk(chunk, safeMeta);
                },
                error: (e) => console.error("Audio Encoder Error:", e)
            });

            audioEncoder.configure({
                codec: 'mp4a.40.2',
                sampleRate: sampleRate,
                numberOfChannels: numberOfChannels,
                bitrate: bitrateKbps * 1000
            });

            const framesPerChunk = Math.floor(sampleRate * 0.04);
            const totalFrames = audioBuffer.length;
            let offset = 0;
            let timestampUs = 0;
            let lastYield = performance.now();

            const srcChannels = [];
            for (let c = 0; c < audioBuffer.numberOfChannels; c++) srcChannels.push(audioBuffer.getChannelData(c));

            while (offset < totalFrames) {
                const frameCount = Math.min(framesPerChunk, totalFrames - offset);
                const planarData = new Float32Array(frameCount * numberOfChannels);

                if (forceMono && audioBuffer.numberOfChannels > 1) {
                    for (let i = 0; i < frameCount; i++) {
                        let sum = 0;
                        for (let c = 0; c < audioBuffer.numberOfChannels; c++) sum += srcChannels[c][offset + i];
                        planarData[i] = sum / audioBuffer.numberOfChannels;
                    }
                } else {
                    for (let c = 0; c < numberOfChannels; c++) {
                        planarData.set(srcChannels[c].subarray(offset, offset + frameCount), c * frameCount);
                    }
                }

                const audioData = new AudioData({
                    format: 'f32-planar',
                    sampleRate: sampleRate,
                    numberOfChannels: numberOfChannels,
                    numberOfFrames: frameCount,
                    timestamp: timestampUs,
                    data: planarData
                });

                audioEncoder.encode(audioData);
                audioData.close();

                offset += frameCount;
                timestampUs += Math.round((frameCount / sampleRate) * 1000000);

                if (performance.now() - lastYield > 50) {
                    onProgress((offset / totalFrames) * 100);
                    await new Promise(r => setTimeout(r, 0));
                    lastYield = performance.now();
                }
            }

            await audioEncoder.flush();
            muxer.finalize();
            onProgress(100);
            return new Blob([muxer.target.buffer], { type: 'audio/mp4' });
        }

        audioStartBtn.addEventListener('click', async () => {
            if (!currentAudioFile || !decodedAudioBuffer || isAudioCompressing) return;

            const selectedLimit = audioSizeLimitSelect.value;
            const format = audioFormatSelect.value;

            if (format !== 'wav' && selectedLimit !== 'none' && currentAudioFile.size <= parseInt(selectedLimit, 10)) {
                showAudioResults(currentAudioFile, true);
                return;
            }

            isAudioCompressing = true;
            audioSettingsPanel.classList.add('hidden');
            audioProcessingPanel.classList.remove('hidden');
            audioFormatLabel.textContent = format.toUpperCase();
            const startTime = performance.now();

            const forceMono = audioChannelsSelect.value === 'mono';
            let bitrateKbps = parseInt(audioBitrateSelect.value, 10);

            if (format !== 'wav' && selectedLimit !== 'none') {
                const limitBytes = parseInt(selectedLimit, 10);
                const availableBits = limitBytes * 8 * 0.92;
                bitrateKbps = Math.max(32, Math.floor((availableBits / audioMetadata.duration) / 1000));
            }

            const onProgress = (pct) => {
                audioProgressBar.style.width = `${pct}%`;
                audioProgressText.textContent = `${Math.round(pct)}%`;
                audioElapsedTime.textContent = `${((performance.now() - startTime) / 1000).toFixed(1)}s`;
            };

            audioCurrentStepText.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Encoding ${format.toUpperCase()} locally...`;

            try {
                let blob;
                if (format === 'wav') {
                    blob = encodeWav(decodedAudioBuffer, forceMono);
                    onProgress(100);
                } else if (format === 'mp3') {
                    blob = await encodeMp3(decodedAudioBuffer, bitrateKbps, forceMono, onProgress);
                } else {
                    blob = await encodeM4a(decodedAudioBuffer, bitrateKbps, forceMono, onProgress);
                }
                showAudioResults(blob, false, format);
            } catch (err) {
                console.error("Audio compression failed:", err);
                showToast("Audio encoding failed: " + err.message, "error");
                resetAudioState();
            }
        });

        function showAudioResults(blob, wasSkipped, format) {
            isAudioCompressing = false;
            audioProcessingPanel.classList.add('hidden');
            audioResultPanel.classList.remove('hidden');

            audioResultOriginalSize.textContent = formatBytes(currentAudioFile.size);
            let finalBlob = blob;
            let ext = format || currentAudioFile.name.split('.').pop();

            if (wasSkipped) {
                audioResultHeader.textContent = "Instant Smart-Skip Complete!";
                audioNewFileSize.textContent = formatBytes(currentAudioFile.size);
                audioSpaceSavedBadge.textContent = "File is already under limits!";
                finalBlob = currentAudioFile;
                ext = currentAudioFile.name.split('.').pop();
            } else {
                audioResultHeader.textContent = "Audio Compression Complete!";
                if (blob.size >= currentAudioFile.size && format !== 'wav') {
                    audioNewFileSize.textContent = formatBytes(currentAudioFile.size);
                    audioSpaceSavedBadge.textContent = "Swapped to Original (Compressed was larger)";
                    finalBlob = currentAudioFile;
                    ext = currentAudioFile.name.split('.').pop();
                } else {
                    audioNewFileSize.textContent = formatBytes(blob.size);
                    const pctSaved = ((currentAudioFile.size - blob.size) / currentAudioFile.size) * 100;
                    audioSpaceSavedBadge.textContent = pctSaved >= 0
                        ? `Reduced by ${pctSaved.toFixed(1)}%`
                        : `Converted (uncompressed WAV is larger by design)`;
                }
            }

            const url = URL.createObjectURL(finalBlob);
            audioDownloadLink.href = url;
            const originalName = currentAudioFile.name.replace(/\.[^/.]+$/, "");
            audioDownloadLink.download = `${originalName}_compressed.${ext}`;
            showToast("Audio compressed successfully!", "success");
        }

        audioResetBtn.addEventListener('click', resetAudioState);

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
