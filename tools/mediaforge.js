        /* Immersive Web App State Variables */
        let currentFile = null;
        let audioCtx = null;
        let audioBuffer = null;
        let targetChannels = 2; // Stereo by default
        let isDecodingAudio = false;

        // Selection / Navigation Values
        let videoFps = 30.0;
        let videoDuration = 0;
        let videoWidth = 1920;
        let videoHeight = 1080;
        let clipStartTime = 0;
        let clipEndTime = 0;
        let isScrubbing = false;

        // Custom Queue Store for Marked Frames
        let markedFrames = [];

        // DOM Elements
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const studioWorkspace = document.getElementById('studioWorkspace');
        const mainVideo = document.getElementById('mainVideo');
        const audioEngineStatus = document.getElementById('audioEngineStatus');
        
        const videoResolutionText = document.getElementById('videoResolutionText');
        const videoFpsText = document.getElementById('videoFpsText');
        const videoFrameTimeText = document.getElementById('videoFrameTimeText');
        const seekingOverlay = document.getElementById('seekingOverlay');

        // Playback Buttons
        const btnPlayPause = document.getElementById('btnPlayPause');
        const iconPlay = document.getElementById('iconPlay');
        const textPlay = document.getElementById('textPlay');

        // Timeline Components
        const waveformCanvas = document.getElementById('waveformCanvas');
        const waveformLoadingText = document.getElementById('waveformLoadingText');
        const timelineOverlay = document.getElementById('timelineOverlay');
        const playheadCursor = document.getElementById('playheadCursor');
        const visualStartMarker = document.getElementById('visualStartMarker');
        const visualEndMarker = document.getElementById('visualEndMarker');
        const outOfBoundsStart = document.getElementById('outOfBoundsStart');
        const outOfBoundsEnd = document.getElementById('outOfBoundsEnd');

        // Global Clip Texts
        const globalInText = document.getElementById('globalInText');
        const globalOutText = document.getElementById('globalOutText');
        const globalDurText = document.getElementById('globalDurText');

        // Tab Buttons
        const tabFrameBtn = document.getElementById('tabFrameBtn');
        const tabVideoBtn = document.getElementById('tabVideoBtn');
        const tabAudioBtn = document.getElementById('tabAudioBtn');

        // Workspaces
        const tabFrameWorkspace = document.getElementById('tabFrameWorkspace');
        const tabVideoWorkspace = document.getElementById('tabVideoWorkspace');
        const tabAudioWorkspace = document.getElementById('tabAudioWorkspace');

        // Capture Controls
        const selectImageFormat = document.getElementById('selectImageFormat');
        const inputFpsCalibration = document.getElementById('inputFpsCalibration');
        const frameQueueList = document.getElementById('frameQueueList');
        const queueEmptyState = document.getElementById('queueEmptyState');
        const queueCount = document.getElementById('queueCount');

        // Audio Clipper Elements
        const btnAudioStereo = document.getElementById('btnAudioStereo');
        const btnAudioMono = document.getElementById('btnAudioMono');
        const btnRipAudio = document.getElementById('btnRipAudio');
        const audioProcessProgress = document.getElementById('audioProcessProgress');
        const audioProgressPercent = document.getElementById('audioProgressPercent');
        const audioProgressBar = document.getElementById('audioProgressBar');

        // Video Clipper Elements
        const btnExportVideo = document.getElementById('btnExportVideo');
        const selectVideoFormat = document.getElementById('selectVideoFormat');
        const videoProcessProgress = document.getElementById('videoProcessProgress');
        const videoProgressPercent = document.getElementById('videoProgressPercent');
        const videoProgressBar = document.getElementById('videoProgressBar');

        /* Initialize Lucide icons on boot */
        window.addEventListener('load', () => {
            lucide.createIcons();
            setupDragAndDrop();
            setupInteractiveCanvas();
        });

        /* Replaces browser native alert/confirm popups */
        function triggerToast(title, message, type = 'info') {
            const toastBox = document.getElementById('toastBox');
            const toastTitle = document.getElementById('toastTitle');
            const toastMessage = document.getElementById('toastMessage');
            const toastIcon = document.getElementById('toastIcon');

            toastTitle.textContent = title;
            toastMessage.textContent = message;

            if (type === 'error') {
                toastBox.firstElementChild.style.borderColor = '#ef4444';
                toastIcon.setAttribute('data-lucide', 'alert-circle');
            } else if (type === 'success') {
                toastBox.firstElementChild.style.borderColor = '#10b981';
                toastIcon.setAttribute('data-lucide', 'check-circle2');
            } else {
                toastBox.firstElementChild.style.borderColor = '#6366f1';
                toastIcon.setAttribute('data-lucide', 'info');
            }

            lucide.createIcons();

            toastBox.classList.remove('-translate-y-24', 'md:translate-y-24', 'opacity-0', 'pointer-events-none');
            toastBox.classList.add('translate-y-0', 'opacity-100');

            setTimeout(() => {
                toastBox.classList.remove('translate-y-0', 'opacity-100');
                const isMobile = window.innerWidth < 768;
                toastBox.classList.add(isMobile ? '-translate-y-24' : 'translate-y-24', 'opacity-0', 'pointer-events-none');
            }, 3500);
        }

        /* Ingest System */
        function setupDragAndDrop() {
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.add('border-indigo-500'); }, false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.remove('border-indigo-500'); }, false);
            });
            dropZone.addEventListener('drop', (e) => {
                if (e.dataTransfer.files.length > 0) processUploadedFile(e.dataTransfer.files[0]);
            }, false);
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) processUploadedFile(e.target.files[0]);
            });
        }

        function processUploadedFile(file) {
            if (!file.type.startsWith('video/')) {
                triggerToast('Unsupported File', 'Please upload a valid media file.', 'error');
                return;
            }

            currentFile = file;
            mainVideo.src = URL.createObjectURL(file);
            mainVideo.load();

            dropZone.classList.add('hidden');
            studioWorkspace.classList.remove('hidden');

            mainVideo.onloadedmetadata = function() {
                videoDuration = mainVideo.duration;
                videoWidth = mainVideo.videoWidth;
                videoHeight = mainVideo.videoHeight;
                clipStartTime = 0;
                clipEndTime = videoDuration;

                videoResolutionText.textContent = `${videoWidth}x${videoHeight}`;
                
                markedFrames = [];
                updateFrameQueueUI();
                updateTimeDisplay();
                updateClampingVisualMarkers();
                startAudioChannelScanner();
            };

            mainVideo.addEventListener('seeked', () => {
                seekingOverlay.classList.remove('opacity-100');
                seekingOverlay.classList.add('pointer-events-none', 'opacity-0');
                updateTimeDisplay();
            });

            triggerToast('Workspace Ready', 'Video loaded into local context.', 'success');
        }

        /* Audio Decoding for Waveform & Ripping */
        async function startAudioChannelScanner() {
            if (!currentFile) return;

            waveformLoadingText.classList.remove('hidden');
            audioEngineStatus.innerHTML = `<i data-lucide="loader" class="w-3 h-3 animate-spin text-amber-500"></i><span class="text-amber-500 font-bold ml-1 hidden sm:inline">Decoding...</span>`;
            lucide.createIcons();

            isDecodingAudio = true;
            try {
                const fileReader = new FileReader();
                fileReader.onload = async function() {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

                    audioCtx.decodeAudioData(this.result, (decodedBuffer) => {
                        audioBuffer = decodedBuffer;
                        drawWaveform(decodedBuffer);
                        waveformLoadingText.classList.add('hidden');
                        audioEngineStatus.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i><span class="text-slate-300 ml-1 hidden sm:inline">Ready</span>`;
                        lucide.createIcons();
                        isDecodingAudio = false;
                    }, (err) => {
                        drawWaveformFallback();
                        waveformLoadingText.classList.add('hidden');
                        audioEngineStatus.innerHTML = `<i data-lucide="alert-triangle" class="w-3 h-3 text-amber-500"></i>`;
                        lucide.createIcons();
                        isDecodingAudio = false;
                    });
                };
                fileReader.readAsArrayBuffer(currentFile);
            } catch (err) {
                waveformLoadingText.classList.add('hidden');
                isDecodingAudio = false;
            }
        }

        function drawWaveform(buffer) {
            const canvas = waveformCanvas;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;

            ctx.fillStyle = '#0F111A';
            ctx.fillRect(0, 0, width, height);

            const channel1 = buffer.getChannelData(0);
            const step = Math.ceil(channel1.length / width);
            const amp = height / 2;

            ctx.strokeStyle = '#1C2035';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();

            ctx.lineWidth = 1.5;
            for (let i = 0; i < width; i++) {
                let min = 1.0, max = -1.0;
                const startIdx = i * step;
                const endIdx = Math.min(startIdx + step, channel1.length);
                for (let j = startIdx; j < endIdx; j += Math.max(1, Math.floor(step / 10))) {
                    if (channel1[j] < min) min = channel1[j];
                    if (channel1[j] > max) max = channel1[j];
                }
                ctx.strokeStyle = `rgba(99, 102, 241, ${0.45 + (max * 0.5)})`;
                ctx.beginPath();
                ctx.moveTo(i, amp + (min * amp * 0.85));
                ctx.lineTo(i, amp + (max * amp * 0.85));
                ctx.stroke();
            }
        }

        function drawWaveformFallback() {
            const canvas = waveformCanvas;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0F111A';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#4F46E5';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Audio scan unavailable", canvas.width / 2, canvas.height / 2 + 3);
        }

        function formatPreciseTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 1000);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
        }

        function updateTimeDisplay() {
            const t = mainVideo.currentTime;
            videoFrameTimeText.textContent = formatPreciseTime(t);
            if (videoDuration > 0) playheadCursor.style.left = `${(t / videoDuration) * 100}%`;
        }

        function updateClampingVisualMarkers() {
            if (videoDuration <= 0) return;
            const startPct = (clipStartTime / videoDuration) * 100;
            const endPct = (clipEndTime / videoDuration) * 100;
            
            visualStartMarker.style.left = `${startPct}%`;
            visualEndMarker.style.left = `${endPct}%`;
            outOfBoundsStart.style.width = `${startPct}%`;
            outOfBoundsEnd.style.width = `${100 - endPct}%`;

            globalInText.textContent = formatPreciseTime(clipStartTime);
            globalOutText.textContent = formatPreciseTime(clipEndTime);
            globalDurText.textContent = `${Math.max(0, clipEndTime - clipStartTime).toFixed(2)}s`;
        }

        function setupInteractiveCanvas() {
            const seekTimeline = (e) => {
                const rect = waveformCanvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const posPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                mainVideo.currentTime = posPct * videoDuration;
                updateTimeDisplay();
            };

            waveformCanvas.addEventListener('mousedown', (e) => {
                isScrubbing = true; seekTimeline(e);
            });
            window.addEventListener('mousemove', (e) => { if (isScrubbing) seekTimeline(e); });
            window.addEventListener('mouseup', () => { isScrubbing = false; });
            waveformCanvas.addEventListener('touchstart', (e) => { isScrubbing = true; seekTimeline(e); }, { passive: true });
            waveformCanvas.addEventListener('touchmove', (e) => { if (isScrubbing) seekTimeline(e); }, { passive: true });
            waveformCanvas.addEventListener('touchend', () => { isScrubbing = false; });
        }

        /* Playback Controls */
        function togglePlay() {
            if (mainVideo.paused) {
                mainVideo.play();
                iconPlay.setAttribute('data-lucide', 'pause');
                textPlay.textContent = "PAUSE";
                requestAnimationFrame(playbackTrackerLoop);
            } else {
                mainVideo.pause();
                iconPlay.setAttribute('data-lucide', 'play');
                textPlay.textContent = "PLAY";
            }
            lucide.createIcons();
        }

        function playbackTrackerLoop() {
            if (!mainVideo.paused) {
                updateTimeDisplay();
                requestAnimationFrame(playbackTrackerLoop);
            }
        }

        function stepFrames(multiplier) {
            const calFps = parseFloat(inputFpsCalibration.value) || 30.0;
            const target = Math.max(0, Math.min(videoDuration, mainVideo.currentTime + (multiplier * (1.0 / calFps))));
            mainVideo.currentTime = target;
        }

        function setClipPoint(type) {
            const t = mainVideo.currentTime;
            if (type === 'start') {
                if (t >= clipEndTime) return triggerToast('Invalid', 'Start point must precede end mark.', 'error');
                clipStartTime = t;
            } else {
                if (t <= clipStartTime) return triggerToast('Invalid', 'End point must succeed start mark.', 'error');
                clipEndTime = t;
            }
            updateClampingVisualMarkers();
        }

        /* Tabs Logic */
        function switchUtilityTab(tab) {
            const tabs = ['frame', 'video', 'audio'];
            tabs.forEach(t => {
                const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
                const ws = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Workspace`);
                
                if (t === tab) {
                    btn.classList.add('border-indigo-500', 'text-white');
                    btn.classList.remove('border-transparent', 'text-slate-400');
                    ws.classList.remove('hidden');
                } else {
                    btn.classList.remove('border-indigo-500', 'text-white');
                    btn.classList.add('border-transparent', 'text-slate-400');
                    ws.classList.add('hidden');
                }
            });
        }

        /* Frame Extractor */
        function captureCurrentFrame() {
            if (!mainVideo || videoDuration === 0) return;
            const canvas = document.createElement('canvas');
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            canvas.getContext('2d').drawImage(mainVideo, 0, 0, videoWidth, videoHeight);

            const format = selectImageFormat.value;
            const curTime = mainVideo.currentTime;
            
            markedFrames.push({
                id: Date.now(),
                timestamp: curTime,
                format: format,
                data: canvas.toDataURL(format, 1.0),
                fileName: `Frame_${formatPreciseTime(curTime).replace(/:/g, '-')}.${format === 'image/jpeg' ? 'jpg' : 'png'}`
            });

            updateFrameQueueUI();
            triggerToast('Frame Grabbed', `Captured at ${formatPreciseTime(curTime)}`, 'success');
        }

        function updateFrameQueueUI() {
            queueCount.textContent = markedFrames.length;
            if (markedFrames.length === 0) {
                queueEmptyState.classList.remove('hidden');
                frameQueueList.innerHTML = '';
                return;
            }
            queueEmptyState.classList.add('hidden');
            frameQueueList.innerHTML = '';

            markedFrames.forEach((frame) => {
                const row = document.createElement('div');
                row.className = "flex items-center justify-between bg-studio-900 border border-studio-700/50 p-2 rounded-lg gap-2";
                row.innerHTML = `
                    <div class="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer" onclick="mainVideo.currentTime=${frame.timestamp}; updateTimeDisplay();">
                        <img src="${frame.data}" class="w-12 h-8 object-cover rounded border border-studio-700 flex-shrink-0" />
                        <div class="overflow-hidden">
                            <p class="text-[10px] font-mono font-bold text-slate-200 truncate">${frame.fileName}</p>
                            <p class="text-[8px] font-mono text-indigo-400 mt-0.5">${formatPreciseTime(frame.timestamp)}</p>
                        </div>
                    </div>
                    <button onclick="deleteFrame(${frame.id})" class="p-1.5 bg-studio-800 text-slate-400 hover:text-rose-400 rounded">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                `;
                frameQueueList.appendChild(row);
            });
            lucide.createIcons();
        }

        function deleteFrame(id) {
            markedFrames = markedFrames.filter(f => f.id !== id);
            updateFrameQueueUI();
        }

        function clearFrameQueue() { markedFrames = []; updateFrameQueueUI(); }

        async function batchExportZip() {
            if (markedFrames.length === 0) return triggerToast('Empty Queue', 'No frames to export.', 'error');
            triggerToast('Zipping', 'Packaging frames...', 'info');
            const zip = new JSZip();
            markedFrames.forEach(f => zip.file(f.fileName, f.data.split(',')[1], { base64: true }));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(zipBlob);
            a.download = `MediaForge_Frames_${Date.now()}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }

        /* Video MP4 Clipper Export */
        async function exportVideoClip() {
            if (clipEndTime <= clipStartTime) return triggerToast('Invalid Range', 'Out point must be after In point.', 'error');
            
            let stream;
            if (mainVideo.captureStream) stream = mainVideo.captureStream();
            else if (mainVideo.mozCaptureStream) stream = mainVideo.mozCaptureStream();
            else return triggerToast('Unsupported', 'Your browser does not support real-time stream capturing.', 'error');

            btnExportVideo.disabled = true;
            btnExportVideo.classList.add('opacity-50', 'pointer-events-none');
            videoProcessProgress.classList.remove('hidden');
            
            // Format fallback
            let mimeType = selectVideoFormat.value;
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm'; // Fallback if MP4 is unsupported (e.g. Firefox default config)
                triggerToast('Format Fallback', 'Requested format unsupported by browser. Falling back to WebM.', 'info');
            }

            mainVideo.currentTime = clipStartTime;
            
            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                a.download = `Clip_${formatPreciseTime(clipStartTime).replace(/:/g, '-')}.${ext}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                
                triggerToast('Success', `Video clip exported!`, 'success');
                btnExportVideo.disabled = false;
                btnExportVideo.classList.remove('opacity-50', 'pointer-events-none');
                videoProcessProgress.classList.add('hidden');
                mainVideo.pause();
                
                // Reset UI
                videoProgressBar.style.width = '0%';
                videoProgressPercent.textContent = '0%';
            };

            recorder.start();
            mainVideo.play();
            
            // Progress Polling
            const duration = clipEndTime - clipStartTime;
            const poller = setInterval(() => {
                const current = mainVideo.currentTime;
                if (current >= clipEndTime) {
                    clearInterval(poller);
                    recorder.stop();
                } else {
                    const pct = Math.min(100, Math.max(0, ((current - clipStartTime) / duration) * 100));
                    videoProgressBar.style.width = `${pct}%`;
                    videoProgressPercent.textContent = `${Math.floor(pct)}%`;
                }
            }, 100);
        }

        /* Audio Clipper */
        function selectAudioCh(ch) {
            targetChannels = ch;
            btnAudioStereo.className = ch === 2 ? "py-2.5 px-3 bg-indigo-600 border border-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors" : "py-2.5 px-3 bg-studio-800 border border-studio-600 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors";
            btnAudioMono.className = ch === 1 ? "py-2.5 px-3 bg-indigo-600 border border-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors" : "py-2.5 px-3 bg-studio-800 border border-studio-600 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors";
        }

        async function ripLosslessAudio() {
            if (!audioBuffer) return triggerToast('Wait', 'Decoding not finished yet.', 'error');
            if (clipEndTime <= clipStartTime) return triggerToast('Invalid Limits', 'Check IN/OUT bounds.', 'error');

            btnRipAudio.disabled = true;
            btnRipAudio.classList.add('opacity-50', 'pointer-events-none');
            audioProcessProgress.classList.remove('hidden');

            await new Promise(resolve => setTimeout(resolve, 50));

            try {
                const sampleRate = audioBuffer.sampleRate;
                const startSample = Math.max(0, Math.floor(clipStartTime * sampleRate));
                const endSample = Math.min(audioBuffer.length, Math.floor(clipEndTime * sampleRate));
                const extractedLength = endSample - startSample;
                const numChannels = targetChannels;
                
                const headerBuffer = new ArrayBuffer(44);
                const view = new DataView(headerBuffer);
                const writeStr = (off, str) => { for(let i=0; i<str.length; i++) view.setUint8(off+i, str.charCodeAt(i)); };
                
                const byteRate = sampleRate * numChannels * 2;
                writeStr(0, 'RIFF'); view.setUint32(4, 36 + extractedLength * numChannels * 2, true);
                writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
                view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
                view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true);
                view.setUint16(32, numChannels * 2, true); view.setUint16(34, 16, true);
                writeStr(36, 'data'); view.setUint32(40, extractedLength * numChannels * 2, true);

                const chL = audioBuffer.getChannelData(0);
                const chR = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : chL;
                const samples = new Int16Array(extractedLength * numChannels);
                
                let idx = 0;
                const batchSize = 100000;
                for (let i = 0; i < extractedLength; i += batchSize) {
                    const maxS = Math.min(i + batchSize, extractedLength);
                    for (let s = i; s < maxS; s++) {
                        const orig = startSample + s;
                        if (numChannels === 2) {
                            const valL = Math.max(-1, Math.min(1, chL[orig]));
                            samples[idx++] = valL < 0 ? valL * 0x8000 : valL * 0x7FFF;
                            const valR = Math.max(-1, Math.min(1, chR[orig]));
                            samples[idx++] = valR < 0 ? valR * 0x8000 : valR * 0x7FFF;
                        } else {
                            const valM = Math.max(-1, Math.min(1, (chL[orig] + chR[orig]) / 2));
                            samples[idx++] = valM < 0 ? valM * 0x8000 : valM * 0x7FFF;
                        }
                    }
                    const pct = Math.floor((maxS / extractedLength) * 100);
                    audioProgressPercent.textContent = `${pct}%`;
                    audioProgressBar.style.width = `${pct}%`;
                    await new Promise(r => setTimeout(r, 0));
                }

                const wavBlob = new Blob([headerBuffer, samples], { type: 'audio/wav' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(wavBlob);
                a.download = `AudioClip_${formatPreciseTime(clipStartTime).replace(/:/g, '-')}.wav`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                triggerToast('Success', 'WAV Ripped successfully!', 'success');
            } catch (err) {
                triggerToast('Error', 'Ripping failed.', 'error');
            } finally {
                btnRipAudio.disabled = false;
                btnRipAudio.classList.remove('opacity-50', 'pointer-events-none');
                audioProcessProgress.classList.add('hidden');
            }
        }
    </script>
