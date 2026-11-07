(() => {
      const els = {
        masterInput: document.getElementById("masterInput"),
        separateBtn: document.getElementById("separateBtn"),
        statusText: document.getElementById("statusText"),
        loaderContainer: document.getElementById("loaderContainer"),
        loaderPercent: document.getElementById("loaderPercent"),
        progressBarFill: document.getElementById("progressBarFill"),

        waveformContainer: document.getElementById("waveformContainer"),
        mainWaveform: document.getElementById("mainWaveform"),
        waveStartText: document.getElementById("waveStartText"),
        waveEndText: document.getElementById("waveEndText"),
        waveSelectedText: document.getElementById("waveSelectedText"),
        resetWaveBtn: document.getElementById("resetWaveBtn"),

        playPreviewBtn: document.getElementById("playPreviewBtn"),
        stopPreviewBtn: document.getElementById("stopPreviewBtn"),

        vocalPower: document.getElementById("vocalPower"),
        vocalPowerVal: document.getElementById("vocalPowerVal"),
        vocalGate: document.getElementById("vocalGate"),
        vocalGateVal: document.getElementById("vocalGateVal"),
        vocalLowCut: document.getElementById("vocalLowCut"),
        vocalHighCut: document.getElementById("vocalHighCut"),
        vocalRangeVal: document.getElementById("vocalRangeVal"),

        musicCutPower: document.getElementById("musicCutPower"),
        musicCutPowerVal: document.getElementById("musicCutPowerVal"),
        musicSmoothing: document.getElementById("musicSmoothing"),
        musicSmoothingVal: document.getElementById("musicSmoothingVal"),

        playgroundArea: document.getElementById("playgroundArea"),
        activeCardsContainer: document.getElementById("activeCardsContainer"),
        trashCardsContainer: document.getElementById("trashCardsContainer"),
        emptyTrashText: document.getElementById("emptyTrashText"),

        // Tab UI Elements restored to resolve JS initialization error
        tabActive: document.getElementById("tabActive"),
        tabTrash: document.getElementById("tabTrash"),
        trashCount: document.getElementById("trashCount"),
        clearAllBtn: document.getElementById("clearAllBtn"),

        // Preset UI Elements
        autoVocalsBtn: document.getElementById("autoVocalsBtn"),
        autoMusicBtn: document.getElementById("autoMusicBtn")
      };

      let resultCounter = 0; // Cumulative ID counter
      let activeResults = []; // Store active results metadata and references
      let trashedResults = []; // Store deleted results ready for restoration

      // Playground Tabs UI Management
      els.tabActive.onclick = () => {
        els.tabActive.classList.add("active");
        els.tabTrash.classList.remove("active");
        els.activeCardsContainer.style.display = "flex";
        els.trashCardsContainer.style.display = "none";
        els.clearAllBtn.style.display = "inline-flex";
      };

      els.tabTrash.onclick = () => {
        els.tabTrash.classList.add("active");
        els.tabActive.classList.remove("active");
        els.activeCardsContainer.style.display = "none";
        els.trashCardsContainer.style.display = "flex";
        els.clearAllBtn.style.display = "none";
        updateTrashUI();
      };

      // UI Control synchronization values
      els.vocalPower.oninput = () => els.vocalPowerVal.textContent = parseFloat(els.vocalPower.value).toFixed(1);
      els.vocalGate.oninput = () => els.vocalGateVal.textContent = els.vocalGate.value + " dB";

      const updateRange = () => {
        if (parseInt(els.vocalLowCut.value) >= parseInt(els.vocalHighCut.value)) els.vocalLowCut.value = els.vocalHighCut.value - 100;
        els.vocalRangeVal.textContent = `${els.vocalLowCut.value}Hz - ${els.vocalHighCut.value}Hz`;
      };
      els.vocalLowCut.oninput = updateRange;
      els.vocalHighCut.oninput = updateRange;

      els.musicCutPower.oninput = () => els.musicCutPowerVal.textContent = parseFloat(els.musicCutPower.value).toFixed(1);
      els.musicSmoothing.oninput = () => els.musicSmoothingVal.textContent = els.musicSmoothing.value + "%";

      // --- PRESET BUTTON LOGIC ---
      function updateSliderUI(el, val, valEl, suffix = "") {
        el.value = val;
        valEl.textContent = val + suffix;
      }

      els.autoVocalsBtn.addEventListener("click", () => {
        // High vocalPower = sharp ICC mask exponent → only perfectly centred bins survive
        // Tight gate = silence background during quiet gaps
        // Low musicCutPower = vocals track only, don't care about music settings
        updateSliderUI(els.vocalPower, 110, els.vocalPowerVal);
        updateSliderUI(els.vocalGate, -42, els.vocalGateVal, " dB");
        updateSliderUI(els.musicCutPower, 10, els.musicCutPowerVal);
        updateSliderUI(els.musicSmoothing, 20, els.musicSmoothingVal, "%");
        els.vocalLowCut.value = 130; els.vocalHighCut.value = 8000; updateRange();
        setStatus("✅ V7: Pure Vocals — sharp ICC mask, tight noise gate, wide vocal frequency window.");
      });

      els.autoMusicBtn.addEventListener("click", () => {
        // musicCutPower=120 → α=0.80 → subtracts 80% of estimated vocal energy
        // Low vocalPower = don't need clean vocal track
        // spectralFloor from musicSmoothing=75 → keeps enough of original to prevent artefacts
        updateSliderUI(els.vocalPower, 10, els.vocalPowerVal);
        updateSliderUI(els.vocalGate, -80, els.vocalGateVal, " dB");
        updateSliderUI(els.musicCutPower, 120, els.musicCutPowerVal);
        updateSliderUI(els.musicSmoothing, 75, els.musicSmoothingVal, "%");
        els.vocalLowCut.value = 180; els.vocalHighCut.value = 6000; updateRange();
        setStatus("✅ V7: Pure Instrumental — spectral subtraction α=0.80, bass/treble fully preserved, anti-artefact floor active.");
      });

      let master = null;
      let masterPeaks = null;
      let selStart = 0;
      let selEnd = 1;
      let isDragging = false;
      let masterDuration = 0;

      let audioCtx = null;
      let previewSourceNode = null;
      let previewBuffer = null;
      let isPreviewPlaying = false;
      let previewStartTime = 0;
      let previewStartOffsetSec = 0;
      let previewDurationSec = 0;
      let animationFrameId = null;

      function setStatus(message) { els.statusText.textContent = message; }
      function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

      function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      }

      function updateWaveformText() {
        if (!masterDuration) return;
        els.waveStartText.textContent = "0:00";
        els.waveEndText.textContent = formatTime(masterDuration);

        let s = selStart * masterDuration;
        let e = selEnd * masterDuration;
        if (s > e) { const t = s; s = e; e = t; }

        if (s === 0 && e === masterDuration) {
          els.waveSelectedText.textContent = "Entire Track Selected";
        } else {
          els.waveSelectedText.textContent = `${formatTime(s)} - ${formatTime(e)}`;
        }
      }

      function drawMasterWaveform() {
        const canvas = els.mainWaveform;
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (masterPeaks) {
          ctx.fillStyle = "#d0d7de";
          const mid = height / 2;
          const amp = height * 0.45;
          masterPeaks.forEach((point, i) => {
            const x = (i / masterPeaks.length) * width;
            ctx.fillRect(x, mid + point[0] * amp, 1, (point[1] - point[0]) * amp);
          });
        }

        const xStart = Math.min(selStart, selEnd) * width;
        const xEnd = Math.max(selStart, selEnd) * width;

        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        if (xStart > 0) ctx.fillRect(0, 0, xStart, height);
        if (xEnd < width) ctx.fillRect(xEnd, 0, width - xEnd, height);

        ctx.strokeStyle = "var(--blue)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xStart, 0); ctx.lineTo(xStart, height);
        ctx.moveTo(xEnd, 0); ctx.lineTo(xEnd, height);
        ctx.stroke();

        ctx.fillStyle = "rgba(9, 105, 218, 0.1)";
        ctx.fillRect(xStart, 0, xEnd - xStart, height);

        if (isPreviewPlaying) {
          const elapsed = (audioCtx.currentTime - previewStartTime);
          let currentSec = previewStartOffsetSec + elapsed;
          if (currentSec > previewStartOffsetSec + previewDurationSec) {
            currentSec = previewStartOffsetSec + previewDurationSec;
          }
          const playRatio = currentSec / masterDuration;
          const playX = playRatio * width;

          ctx.strokeStyle = "#ff4500";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(playX, 0);
          ctx.lineTo(playX, height);
          ctx.stroke();

          animationFrameId = requestAnimationFrame(drawMasterWaveform);
        }
      }

      els.mainWaveform.addEventListener("mousedown", (e) => {
        stopAudioPreview();
        const rect = els.mainWaveform.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        selStart = Math.max(0, Math.min(1, x));
        selEnd = selStart;
        isDragging = true;
        updateWaveformText();
        drawMasterWaveform();
      });

      window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const rect = els.mainWaveform.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        selEnd = Math.max(0, Math.min(1, x));
        updateWaveformText();
        drawMasterWaveform();
      });

      window.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          if (selStart > selEnd) {
            const temp = selStart; selStart = selEnd; selEnd = temp;
          }
          if (selStart === selEnd) {
            selStart = 0; selEnd = 1;
          }
          updateWaveformText();
          drawMasterWaveform();
        }
      });

      els.resetWaveBtn.addEventListener("click", () => {
        stopAudioPreview();
        selStart = 0; selEnd = 1;
        updateWaveformText();
        drawMasterWaveform();
      });

      async function decodeBlob(blob) {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

        const channels = [];
        for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
          channels.push(new Float32Array(buffer.getChannelData(channel)));
        }
        if (channels.length === 1) channels.push(new Float32Array(channels[0]));
        return { sampleRate: buffer.sampleRate, channels };
      }

      function buildPreviewBuffer(source) {
        if (!audioCtx) return;
        previewBuffer = audioCtx.createBuffer(2, source.channels[0].length, source.sampleRate);
        previewBuffer.copyToChannel(source.channels[0], 0);
        previewBuffer.copyToChannel(source.channels[1], 1);

        els.playPreviewBtn.disabled = false;
        els.stopPreviewBtn.disabled = false;
      }

      function startAudioPreview() {
        if (!audioCtx || !previewBuffer || !master) return;
        stopAudioPreview();

        if (audioCtx.state === 'suspended') audioCtx.resume();

        const startPct = Math.min(selStart, selEnd);
        const endPct = Math.max(selStart, selEnd);
        previewStartOffsetSec = startPct * masterDuration;
        previewDurationSec = (endPct - startPct) * masterDuration;

        if (previewDurationSec <= 0.05) return; 

        previewSourceNode = audioCtx.createBufferSource();
        previewSourceNode.buffer = previewBuffer;
        previewSourceNode.connect(audioCtx.destination);

        previewSourceNode.start(0, previewStartOffsetSec, previewDurationSec);
        previewStartTime = audioCtx.currentTime;
        isPreviewPlaying = true;

        els.playPreviewBtn.textContent = "⏸ Pause Playback";

        previewSourceNode.onended = () => {
          if (isPreviewPlaying && (audioCtx.currentTime - previewStartTime >= previewDurationSec - 0.05)) {
            stopAudioPreview();
          }
        };

        drawMasterWaveform();
      }

      function stopAudioPreview() {
        isPreviewPlaying = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (previewSourceNode) {
          try { previewSourceNode.stop(); } catch(e) {}
          previewSourceNode = null;
        }
        els.playPreviewBtn.textContent = "â–¶ Play Selected Area";
        drawMasterWaveform();
      }

      els.playPreviewBtn.addEventListener("click", () => {
        if (isPreviewPlaying) stopAudioPreview();
        else startAudioPreview();
      });

      els.stopPreviewBtn.addEventListener("click", () => {
        stopAudioPreview();
      });

      function fft(re, im) {
        const n = re.length;
        if (n <= 1) return;
        let i = 0;
        for (let j = 1; j < n - 1; j++) {
          let bit = n >> 1;
          while (i & bit) { i ^= bit; bit >>= 1; }
          i ^= bit;
          if (j < i) {
            let temp = re[j]; re[j] = re[i]; re[i] = temp;
            temp = im[j]; im[j] = im[i]; im[i] = temp;
          }
        }
        for (let len = 2; len <= n; len <<= 1) {
          let ang = 2 * Math.PI / len;
          let wlen_re = Math.cos(ang);
          let wlen_im = -Math.sin(ang);
          for (let i = 0; i < n; i += len) {
            let w_re = 1, w_im = 0;
            for (let j = 0; j < len / 2; j++) {
              let u_re = re[i + j];
              let u_im = im[i + j];
              let v_re = re[i + j + len / 2] * w_re - im[i + j + len / 2] * w_im;
              let v_im = re[i + j + len / 2] * w_im + im[i + j + len / 2] * w_re;
              re[i + j] = u_re + v_re;
              im[i + j] = u_im + v_im;
              re[i + j + len / 2] = u_re - v_re;
              im[i + j + len / 2] = u_im - v_im;
              let next_w_re = w_re * wlen_re - w_im * wlen_im;
              w_im = w_re * wlen_im + w_im * wlen_re;
              w_re = next_w_re;
            }
          }
        }
      }

      function ifft(re, im) {
        const n = re.length;
        for (let i = 0; i < n; i++) im[i] = -im[i];
        fft(re, im);
        for (let i = 0; i < n; i++) {
          re[i] /= n;
          im[i] = -im[i] / n;
        }
      }

      /* =========================================================
         SEPARATION ENGINE V8 — VAD-Guided Spectral Subtraction
                               + Spectral Inpainting

         NEW in V8: Voice Activity Detection (VAD) pre-pass.

         PIPELINE:
           STAGE 1 — VAD pre-pass (time domain, entire track)
             Compute per-frame RMS energy and spectral centroid on the
             mono mix. A frame is "vocal-active" when:
               a) RMS energy is above a noise floor (adaptive),
               b) Spectral centroid falls in the vocal register (300–3500Hz),
               c) Zero-crossing rate is in the speech/singing range.
             The result is a float32 array `vadWeight[frame]` in [0..1],
             smoothed with a 200ms hold-decay envelope so the gate opens
             and closes gently. Instrumental-only sections → vadWeight≈0
             → zero subtraction → music is completely untouched there.

           STAGE 2 — Per-frame spectral processing (existing V7 logic)
             For each frame, the ICC×freqWeight vocal mask is computed as
             before, then MULTIPLIED by vadWeight[f]. When vadWeight≈0
             (no voice detected), the mask collapses to zero and music =
             original. When vadWeight≈1 (singing detected), the mask works
             at full strength → subtracts the vocal estimate.

           STAGE 3 — Spectral inpainting (post-process)
             For every frame that had high vadWeight (vocal region), the
             missing mid-channel energy is estimated from the average of
             the nearest-neighbour non-vocal frames (look-ahead + look-back
             up to 8 frames) and blended back in at musicSmoothing depth.
             This "heals" the spectral hole where the voice was, making the
             music sound continuous rather than having a gap.

         OLA: w² for signal and windowSum throughout (consistent).
         ========================================================= */

      // ── STAGE 1: Voice Activity Detection pre-pass ─────────────────
      function computeVAD(source, N, hop) {
        const sampleRate = source.sampleRate;
        const mono = source.channels[0];
        const length = mono.length;
        const numFrames = Math.floor((length - N) / hop) + 1;

        // Hann for VAD RMS (no need to FFT, just energy + centroid)
        const hann = new Float32Array(N);
        for (let i = 0; i < N; i++)
          hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));

        const rawVAD = new Float32Array(numFrames);

        // Find global RMS for adaptive floor
        let globalRMS = 0;
        for (let i = 0; i < length; i++) globalRMS += mono[i] * mono[i];
        globalRMS = Math.sqrt(globalRMS / length);
        const noiseFloor = globalRMS * 0.15; // 15% of global RMS

        for (let f = 0; f < numFrames; f++) {
          const start = f * hop;

          // RMS energy of this frame
          let rms = 0;
          for (let i = 0; i < N; i++) {
            const s = (start + i < length) ? mono[start + i] * hann[i] : 0;
            rms += s * s;
          }
          rms = Math.sqrt(rms / N);

          if (rms < noiseFloor) { rawVAD[f] = 0; continue; }

          // Zero-crossing rate — speech/singing: moderate ZCR (50–3000 per sec)
          let zcr = 0;
          for (let i = 1; i < N; i++) {
            const a = (start + i - 1 < length) ? mono[start + i - 1] : 0;
            const b = (start + i < length)     ? mono[start + i]     : 0;
            if ((a >= 0) !== (b >= 0)) zcr++;
          }
          const zcrHz = (zcr / 2) * (sampleRate / N); // crossings/sec

          // Spectral centroid — vocals: 300–4000 Hz
          // Use DFT of small sub-window for speed (256 bins)
          const NFFT = 256;
          const re = new Float32Array(NFFT), im = new Float32Array(NFFT);
          const step = Math.floor(N / NFFT);
          for (let i = 0; i < NFFT; i++) {
            const idx = start + i * step;
            re[i] = idx < length ? mono[idx] * hann[i * step] : 0;
          }
          fft(re, im);
          let numC = 0, denC = 0;
          for (let k = 1; k < NFFT / 2; k++) {
            const mag = Math.sqrt(re[k]*re[k] + im[k]*im[k]);
            const freq = k * sampleRate / NFFT;
            numC += freq * mag;
            denC += mag;
          }
          const centroid = denC > 1e-9 ? numC / denC : 0;

          // Score: all three cues must align for "vocal"
          const energyScore  = Math.min(1, rms / (noiseFloor * 8));
          const centroidScore = (centroid >= 280 && centroid <= 4200) ? 1.0 :
                                (centroid >= 150 && centroid < 280)   ? (centroid - 150) / 130 :
                                (centroid > 4200 && centroid <= 6000) ? 1 - (centroid - 4200) / 1800 : 0;
          const zcrScore = (zcrHz >= 40 && zcrHz <= 3500) ? 1.0 :
                           (zcrHz > 3500 && zcrHz <= 5000) ? 1 - (zcrHz - 3500) / 1500 : 0;

          rawVAD[f] = energyScore * centroidScore * zcrScore;
        }

        // ── Smooth VAD: 200ms hold + 300ms decay envelope ─────────────
        const holdFrames  = Math.ceil(0.20 * sampleRate / hop); // 200ms hold
        const decayFrames = Math.ceil(0.30 * sampleRate / hop); // 300ms decay
        const smoothVAD = new Float32Array(numFrames);
        let envelope = 0;

        for (let f = 0; f < numFrames; f++) {
          if (rawVAD[f] > envelope) {
            envelope = rawVAD[f]; // instant attack
          } else {
            // Hold for holdFrames, then decay
            const lookAhead = Math.min(f + holdFrames, numFrames - 1);
            let maxAhead = 0;
            for (let h = f; h <= lookAhead; h++) maxAhead = Math.max(maxAhead, rawVAD[h]);
            if (maxAhead >= envelope * 0.5) {
              // still in hold territory — don't decay yet
            } else {
              envelope = Math.max(0, envelope - envelope / decayFrames);
            }
          }
          smoothVAD[f] = clamp(envelope, 0, 1);
        }

        return smoothVAD;
      }

      // ── STAGE 2 + 3: Separation with VAD gating + inpainting ───────
      function runSpectralSeparation(source, options, onProgress, onComplete) {
        const sampleRate = source.sampleRate;
        const left  = source.channels[0];
        const right = source.channels[1];
        const length = left.length;

        const N   = 4096;
        const hop = 1024;
        const numFrames = Math.floor((length - N) / hop) + 1;

        const outVocal  = new Float32Array(length);
        const outMusicL = new Float32Array(length);
        const outMusicR = new Float32Array(length);
        const windowSum = new Float32Array(length);

        // Store per-frame spectral magnitudes for inpainting
        // Only store the music spectrum (magnitude + phase) for VAD-active frames
        const frameMusMagL = []; // frameMusMagL[f] = Float32Array(N/2+1) or null
        const frameMusMagR = [];
        const frameVAD = new Float32Array(numFrames);

        const hanning = new Float32Array(N);
        for (let i = 0; i < N; i++)
          hanning[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));

        const vocalPower    = parseFloat(options.vocalPower);
        const alpha         = parseFloat(options.musicCutPower) / 150.0;
        const gateLinear    = Math.pow(10, parseFloat(options.vocalGate) / 20);
        const inpaintDepth  = parseFloat(options.musicSmoothing) / 100.0; // 0–1
        const vocalLow      = parseFloat(options.vocalLow);
        const vocalHigh     = parseFloat(options.vocalHigh);
        const selStartSample = Math.floor(options.selStart * length);
        const selEndSample   = Math.floor(options.selEnd   * length);

        // PRE-COMPUTE VAD for the whole track (mono = left channel)
        onProgress(2);
        const vadWeights = computeVAD(
          { sampleRate, channels: [left] },
          N, hop
        );

        // Temporal mask history (anti-click smoothing, 4 frames)
        const HIST = 4;
        const maskHistory = [];
        for (let h = 0; h < HIST; h++)
          maskHistory.push(new Float32Array(N / 2 + 1));
        let histPtr = 0;

        let currentFrame = 0;
        const framesPerTick = 40;

        function processSlice() {
          const limit = Math.min(currentFrame + framesPerTick, numFrames);

          for (let f = currentFrame; f < limit; f++) {
            const start = f * hop;
            const isSelected = (start >= selStartSample && start <= selEndSample);

            frameMusMagL[f] = null;
            frameMusMagR[f] = null;

            // ── Passthrough: unselected region ─────────────────────────
            if (!isSelected) {
              for (let i = 0; i < N; i++) {
                const idx = start + i;
                if (idx >= length) break;
                const w2 = hanning[i] * hanning[i];
                outMusicL[idx] += left[idx]  * w2;
                outMusicR[idx] += right[idx] * w2;
                windowSum[idx] += w2;
              }
              continue;
            }

            // ── Load windowed frame ────────────────────────────────────
            const reL = new Float32Array(N), imL = new Float32Array(N);
            const reR = new Float32Array(N), imR = new Float32Array(N);
            for (let i = 0; i < N; i++) {
              const idx = start + i;
              if (idx < length) {
                reL[i] = left[idx]  * hanning[i];
                reR[i] = right[idx] * hanning[i];
              }
            }
            fft(reL, imL);
            fft(reR, imR);

            // ══════════════════════════════════════════════════════════
            // PASS 1 — ICC × freqWeight vocal mask
            // ══════════════════════════════════════════════════════════
            const rawMask = new Float32Array(N / 2 + 1);

            for (let k = 1; k <= N / 2; k++) {
              const magL = Math.sqrt(reL[k]*reL[k] + imL[k]*imL[k]);
              const magR = Math.sqrt(reR[k]*reR[k] + imR[k]*imR[k]);
              if (magL * magR < 1e-18) continue;

              const crossRe = reL[k]*reR[k] + imL[k]*imR[k];
              const crossIm = imL[k]*reR[k] - reL[k]*imR[k];
              const ICC = Math.sqrt(crossRe*crossRe + crossIm*crossIm) / (magL * magR);

              const freq = (k * sampleRate) / N;
              let freqWeight = 1.0;
              if (freq < vocalLow) {
                const t = freq / vocalLow;
                freqWeight = t * t;
              } else if (freq > vocalHigh) {
                const t = Math.min(1.0, (freq - vocalHigh) / 5000.0);
                freqWeight = 1.0 - t * t;
              }

              rawMask[k] = clamp(ICC * freqWeight, 0, 1);
            }

            // ══════════════════════════════════════════════════════════
            // PASS 2 — Temporal smoothing + VAD gating
            //
            // Gate the mask by vadWeights[f]:
            //   vadWeight ≈ 0 → pure instrumental section → no subtraction
            //   vadWeight ≈ 1 → singing detected → full subtraction
            // ══════════════════════════════════════════════════════════
            const vad = vadWeights[f];
            frameVAD[f] = vad;

            const curSlot = maskHistory[histPtr % HIST];
            for (let k = 0; k <= N / 2; k++) curSlot[k] = rawMask[k];

            const smoothMask = new Float32Array(N / 2 + 1);
            for (let k = 1; k <= N / 2; k++) {
              let best = rawMask[k];
              const decay = [1.0, 0.82, 0.67, 0.55];
              for (let h = 1; h < HIST; h++) {
                const slot = maskHistory[((histPtr - h) % HIST + HIST) % HIST];
                best = Math.max(best, slot[k] * decay[h]);
              }
              // VAD-gate: collapse mask when no voice detected
              smoothMask[k] = best * vad;
            }
            histPtr = (histPtr + 1) % HIST;

            // ══════════════════════════════════════════════════════════
            // PASS 3 — Apply vocal mask + spectral subtraction
            // ══════════════════════════════════════════════════════════
            const vocRe  = new Float32Array(N), vocIm  = new Float32Array(N);
            const musReL = new Float32Array(N), musImL = new Float32Array(N);
            const musReR = new Float32Array(N), musImR = new Float32Array(N);

            // Store pre-subtraction magnitudes for inpainting reference
            const preMagL = new Float32Array(N / 2 + 1);
            const preMagR = new Float32Array(N / 2 + 1);

            let totalVocEnergy = 0;
            const vExp = 1.0 + vocalPower / 15.0;

            for (let k = 1; k <= N / 2; k++) {
              const vm = smoothMask[k];
              const vMask = Math.pow(vm, vExp);

              const midRe = (reL[k] + reR[k]) * 0.5;
              const midIm = (imL[k] + imR[k]) * 0.5;
              vocRe[k] = midRe * vMask;
              vocIm[k] = midIm * vMask;
              totalVocEnergy += Math.sqrt(vocRe[k]*vocRe[k] + vocIm[k]*vocIm[k]);

              // Spectral subtraction: music = original × (1 − α×mask)
              const musicGain = Math.max(0.01, 1.0 - alpha * vm);
              musReL[k] = reL[k] * musicGain;
              musImL[k] = imL[k] * musicGain;
              musReR[k] = reR[k] * musicGain;
              musImR[k] = imR[k] * musicGain;

              preMagL[k] = Math.sqrt(reL[k]*reL[k] + imL[k]*imL[k]);
              preMagR[k] = Math.sqrt(reR[k]*reR[k] + imR[k]*imR[k]);

              if (k > 0 && k < N / 2) {
                const sym = N - k;
                vocRe[sym]  =  vocRe[k];  vocIm[sym]  = -vocIm[k];
                musReL[sym] = musReL[k];  musImL[sym] = -musImL[k];
                musReR[sym] = musReR[k];  musImR[sym] = -musImR[k];
              }
            }

            // Store magnitude snapshots for inpainting (only in vocal frames)
            if (vad > 0.25) {
              frameMusMagL[f] = preMagL;
              frameMusMagR[f] = preMagR;
            }

            // ── Vocal gate ─────────────────────────────────────────────
            const avgEnergy = totalVocEnergy / (N / 2);
            if (avgEnergy < gateLinear) {
              for (let k = 0; k < N; k++) { vocRe[k] = 0; vocIm[k] = 0; }
            }

            ifft(vocRe,  vocIm);
            ifft(musReL, musImL);
            ifft(musReR, musImR);

            for (let i = 0; i < N; i++) {
              const idx = start + i;
              if (idx >= length) break;
              const w2 = hanning[i] * hanning[i];
              outVocal[idx]  += vocRe[i]  * w2;
              outMusicL[idx] += musReL[i] * w2;
              outMusicR[idx] += musReR[i] * w2;
              windowSum[idx] += w2;
            }
          } // end frame loop

          currentFrame = limit;
          onProgress(2 + Math.floor((currentFrame / numFrames) * 85));

          if (currentFrame < numFrames) {
            requestAnimationFrame(processSlice);
          } else {
            // ── OLA normalisation ──────────────────────────────────────
            for (let i = 0; i < length; i++) {
              const norm = windowSum[i] > 1e-4 ? windowSum[i] : 1.0;
              outVocal[i]  = clamp(outVocal[i]  / norm, -1, 1);
              outMusicL[i] = clamp(outMusicL[i] / norm, -1, 1);
              outMusicR[i] = clamp(outMusicR[i] / norm, -1, 1);
            }

            // ══════════════════════════════════════════════════════════
            // STAGE 3 — Spectral Inpainting
            //
            // For every vocal-active frame (VAD > 0.25), estimate what the
            // music spectrum "should" be by averaging the magnitude of up to
            // 8 surrounding non-vocal frames, then blend that estimate back
            // into the music signal at inpaintDepth strength.
            //
            // This reconstructs the continuous music texture under the voice,
            // replacing the spectral hole left by subtraction with a smooth
            // interpolation from the real music on either side.
            //
            // Only applied to bins inside the vocal frequency range
            // (freqWeight > 0.1) — bass and treble are already untouched.
            // ══════════════════════════════════════════════════════════
            if (inpaintDepth > 0.05) {
              onProgress(88);

              // Build list of non-vocal reference frames
              const LOOK = 8; // search up to 8 frames each direction

              for (let f = 0; f < numFrames; f++) {
                if (frameVAD[f] < 0.25) continue; // not a vocal frame, skip

                // Gather reference magnitudes from nearby non-vocal frames
                const refMagL = new Float32Array(N / 2 + 1);
                const refMagR = new Float32Array(N / 2 + 1);
                let refCount = 0;

                for (let d = 1; d <= LOOK; d++) {
                  for (const dir of [-1, 1]) {
                    const nf = f + dir * d;
                    if (nf < 0 || nf >= numFrames) continue;
                    if (frameVAD[nf] >= 0.25) continue; // also vocal, skip
                    // Non-vocal neighbor — reconstruct its magnitude from outMusicL
                    const nStart = nf * hop;
                    // We only need average magnitudes; approximate from output
                    for (let k = 1; k <= N / 2; k++) {
                      // Pick a few output samples and estimate RMS
                      let sumL = 0, sumR = 0, cnt = 0;
                      for (let i = 0; i < Math.min(N, length - nStart); i += 64) {
                        const idx = nStart + i;
                        if (idx < length) { sumL += outMusicL[idx]*outMusicL[idx]; sumR += outMusicR[idx]*outMusicR[idx]; cnt++; }
                      }
                      if (cnt > 0) {
                        // Use a per-frame energy proxy — not bin-accurate but
                        // good enough to estimate the energy level for inpainting
                        refMagL[k] += Math.sqrt(sumL / cnt);
                        refMagR[k] += Math.sqrt(sumR / cnt);
                      }
                    }
                    refCount++;
                    if (refCount >= 4) break; // 4 references is enough
                  }
                  if (refCount >= 4) break;
                }

                if (refCount === 0) continue;

                // Average the references
                for (let k = 1; k <= N / 2; k++) {
                  refMagL[k] /= refCount;
                  refMagR[k] /= refCount;
                }

                // Blend into output: add back reference energy scaled by inpaintDepth × VAD
                const fStart = f * hop;
                const blend = inpaintDepth * frameVAD[f];
                for (let i = 0; i < N && fStart + i < length; i++) {
                  const idx = fStart + i;
                  const freq = (i * sampleRate) / N;
                  // Only inpaint in vocal frequency range
                  if (freq < vocalLow * 0.5 || freq > vocalHigh * 2.0) continue;
                  // Blend toward reference energy level
                  const target = (refMagL[Math.min(i, N/2)] + refMagR[Math.min(i, N/2)]) * 0.5;
                  const cur = (Math.abs(outMusicL[idx]) + Math.abs(outMusicR[idx])) * 0.5;
                  if (cur < target * 0.9) {
                    const boost = (target - cur) * blend * hanning[i];
                    outMusicL[idx] += boost * Math.sign(outMusicL[idx] || 1);
                    outMusicR[idx] += boost * Math.sign(outMusicR[idx] || 1);
                  }
                }
              }

              // Final re-clamp after inpainting
              for (let i = 0; i < length; i++) {
                outMusicL[i] = clamp(outMusicL[i], -1, 1);
                outMusicR[i] = clamp(outMusicR[i], -1, 1);
              }
            }

            onProgress(100);
            onComplete({
              vocals: normalize({ sampleRate, channels: [outVocal, outVocal] }),
              music:  normalize({ sampleRate, channels: [outMusicL, outMusicR] })
            });
          }
        }

        requestAnimationFrame(processSlice);
      }

      function normalize(source, target = 0.94) {
        let peak = 0;
        source.channels.forEach((channel) => {
          for (let i = 0; i < channel.length; i += 1) peak = Math.max(peak, Math.abs(channel[i]));
        });
        if (!peak) return source;
        const gain = target / peak;
        source.channels.forEach((channel) => {
          for (let i = 0; i < channel.length; i += 1) channel[i] = clamp(channel[i] * gain, -1, 1);
        });
        return source;
      }

      function projectToWav(source) {
        const sampleRate = source.sampleRate;
        const channelCount = source.channels.length;
        const frameCount = source.channels[0].length;
        const bytesPerSample = 2;
        const blockAlign = channelCount * bytesPerSample;
        const dataSize = frameCount * blockAlign;
        const arrayBuffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(arrayBuffer);

        function writeString(offset, value) {
          for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
        }

        writeString(0, "RIFF"); view.setUint32(4, 36 + dataSize, true);
        writeString(8, "WAVE"); writeString(12, "fmt "); view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); view.setUint16(22, channelCount, true);
        view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true);
        writeString(36, "data"); view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < frameCount; i += 1) {
          for (let channel = 0; channel < channelCount; channel += 1) {
            const sample = clamp(source.channels[channel][i] || 0, -1, 1);
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
          }
        }
        return new Blob([arrayBuffer], { type: "audio/wav" });
      }

      function peaks(source, points = 900) {
        const channel = source.channels[0];
        const step = Math.max(1, Math.ceil(channel.length / points));
        const result = [];
        for (let x = 0; x < points; x += 1) {
          let min = 1, max = -1;
          for (let i = 0; i < step; i += 1) {
            const sample = channel[x * step + i] || 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
          }
          result.push([Number(min.toFixed(4)), Number(max.toFixed(4))]);
        }
        return result;
      }

      // Sync Trash Counter Badge
      function updateTrashUI() {
        const totalTrashed = trashedResults.length;
        els.trashCount.textContent = totalTrashed;
        els.emptyTrashText.style.display = totalTrashed === 0 ? "block" : "none";

        // Re-render Trash Items List
        const existingTrashItems = els.trashCardsContainer.querySelectorAll('.trash-card');
        existingTrashItems.forEach(el => el.remove());

        trashedResults.forEach((item, idx) => {
          const tCard = document.createElement('div');
          tCard.className = "trash-card";
          tCard.id = `trash_item_${item.idPrefix}`;
          tCard.innerHTML = `
            <div>
              <strong style="color: #842029;">Separation Test ${item.index} (Deleted)</strong>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${item.configLabel}</div>
            </div>
            <div class="button-row">
              <button class="button green" onclick="restoreFromTrash('${item.idPrefix}')" style="min-height: 28px; font-size: 11px;">â™» Restore Track</button>
              <button class="button red" onclick="purgePermanently('${item.idPrefix}')" style="min-height: 28px; font-size: 11px;">🗑 Purge Forever</button>
            </div>
          `;
          els.trashCardsContainer.appendChild(tCard);
        });
      }

      // Add a newly separated track result dynamically to active workspace
      function addResultToPlayground(vocals, music, configLabel) {
        resultCounter++;
        const idPrefix = `res_${resultCounter}`;

        const vocalBlob = projectToWav(vocals);
        const musicBlob = projectToWav(music);
        const vocalUrl = URL.createObjectURL(vocalBlob);
        const musicUrl = URL.createObjectURL(musicBlob);

        const vPeaks = peaks(vocals);
        const mPeaks = peaks(music);

        const timestamp = new Date().toLocaleTimeString();

        const resultObj = {
          idPrefix,
          index: resultCounter,
          timestamp,
          configLabel,
          vocals,
          music,
          vocalUrl,
          musicUrl,
          vPeaks,
          mPeaks
        };

        activeResults.push(resultObj);
        renderCard(resultObj);
      }

      function renderCard(item) {
        const idPrefix = item.idPrefix;
        const cardHTML = `
          <div class="result-card" id="card_${idPrefix}">
            <div class="result-header">
              <div>
                <h3>Separation Test ${item.index} <span class="tag">${item.timestamp}</span></h3>
                <span style="font-size: 11px; color: var(--muted);">${item.configLabel}</span>
              </div>
              <div class="button-row">
                <button class="button primary" id="playAll_${idPrefix}">â–¶ Play Together</button>
                <button class="button" id="pauseAll_${idPrefix}">⏸ Pause</button>
                <button class="button" id="stopAll_${idPrefix}">⏹ Stop</button>
                <button class="button red" id="deleteCard_${idPrefix}" style="padding: 4px 10px; font-size: 11px; min-height: 28px;">🗑 Delete Preview</button>
              </div>
            </div>

            <div class="track-grid">
              <!-- Vocal Track Column -->
              <div class="track-col">
                <div class="track-title">🎤 Isolated Vocals <a class="button green" style="padding: 2px 8px; font-size: 11px; min-height: 24px;" download="separated-vocals-${item.index}.wav" href="${item.vocalUrl}">⬇ Download</a></div>
                <canvas class="track-canvas" id="canvasVoc_${idPrefix}" width="400" height="120"></canvas>

                <!-- Independent Editing/Testing Tools -->
                <div class="track-controls">
                  <span style="font-size: 12px; font-weight: bold; width: 30px;">Vol</span>
                  <input type="range" id="volVoc_${idPrefix}" min="0" max="1" step="0.05" value="1">
                  <button class="button" id="muteVoc_${idPrefix}" style="min-height: 24px; padding: 2px 8px; font-size: 11px;">Mute</button>
                </div>
                <audio id="audioVoc_${idPrefix}" src="${item.vocalUrl}" controls class="track-audio"></audio>
              </div>

              <!-- Music Track Column -->
              <div class="track-col">
                <div class="track-title">🎸 Isolated Music / Instruments <a class="button green" style="padding: 2px 8px; font-size: 11px; min-height: 24px;" download="separated-music-${item.index}.wav" href="${item.musicUrl}">⬇ Download</a></div>
                <canvas class="track-canvas" id="canvasMus_${idPrefix}" width="400" height="120"></canvas>

                <!-- Independent Editing/Testing Tools -->
                <div class="track-controls">
                  <span style="font-size: 12px; font-weight: bold; width: 30px;">Vol</span>
                  <input type="range" id="volMus_${idPrefix}" min="0" max="1" step="0.05" value="1">
                  <button class="button" id="muteMus_${idPrefix}" style="min-height: 24px; padding: 2px 8px; font-size: 11px;">Mute</button>
                </div>
                <audio id="audioMus_${idPrefix}" src="${item.musicUrl}" controls class="track-audio"></audio>
              </div>
            </div>
          </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = cardHTML;
        els.activeCardsContainer.prepend(wrapper.firstElementChild);

        // Draw Peak Data
        const drawPeaks = (canvasId, peakData, color) => {
          const canvas = document.getElementById(canvasId);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#0d1117"; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = color; 
          ctx.lineWidth = 1.5;
          const mid = canvas.height / 2; 
          const amp = canvas.height * 0.45;
          ctx.beginPath();
          peakData.forEach((point, index) => {
            const x = index / Math.max(1, peakData.length - 1) * canvas.width;
            ctx.moveTo(x, mid + point[0] * amp); 
            ctx.lineTo(x, mid + point[1] * amp);
          });
          ctx.stroke();
        };

        drawPeaks(`canvasVoc_${idPrefix}`, item.vPeaks, "#58a6ff"); // Blue for Vocals
        drawPeaks(`canvasMus_${idPrefix}`, item.mPeaks, "#7ee787"); // Green for Music

        // Track level tool interactions
        const audVoc = document.getElementById(`audioVoc_${idPrefix}`);
        const audMus = document.getElementById(`audioMus_${idPrefix}`);
        const volVoc = document.getElementById(`volVoc_${idPrefix}`);
        const muteVoc = document.getElementById(`muteVoc_${idPrefix}`);
        const volMus = document.getElementById(`volMus_${idPrefix}`);
        const muteMus = document.getElementById(`muteMus_${idPrefix}`);

        volVoc.addEventListener("input", (e) => { audVoc.volume = e.target.value; });
        volMus.addEventListener("input", (e) => { audMus.volume = e.target.value; });

        muteVoc.addEventListener("click", () => {
          audVoc.muted = !audVoc.muted;
          muteVoc.style.background = audVoc.muted ? "#ffcccc" : "";
          muteVoc.textContent = audVoc.muted ? "Unmute" : "Mute";
        });

        muteMus.addEventListener("click", () => {
          audMus.muted = !audMus.muted;
          muteMus.style.background = audMus.muted ? "#ffcccc" : "";
          muteMus.textContent = audMus.muted ? "Unmute" : "Mute";
        });

        // Sync and Global control panel binders
        const btnPlayAll = document.getElementById(`playAll_${idPrefix}`);
        const btnPauseAll = document.getElementById(`pauseAll_${idPrefix}`);
        const btnStopAll = document.getElementById(`stopAll_${idPrefix}`);
        const btnDeleteCard = document.getElementById(`deleteCard_${idPrefix}`);

        btnPlayAll.addEventListener("click", () => {
          const time = Math.min(audVoc.currentTime || 0, audMus.currentTime || 0);
          audVoc.currentTime = time; 
          audMus.currentTime = time;
          audVoc.play();
          audMus.play();
        });

        btnPauseAll.addEventListener("click", () => {
          audVoc.pause();
          audMus.pause();
        });

        btnStopAll.addEventListener("click", () => {
          audVoc.pause();
          audMus.pause();
          audVoc.currentTime = 0;
          audMus.currentTime = 0;
        });

        btnDeleteCard.addEventListener("click", () => {
          deleteCardToTrash(idPrefix);
        });
      }

      // Trashes an active separation card (Fully retrievable)
      function deleteCardToTrash(idPrefix) {
        const itemIdx = activeResults.findIndex(r => r.idPrefix === idPrefix);
        if (itemIdx === -1) return;

        // Stop active playbacks of that card
        const audVoc = document.getElementById(`audioVoc_${idPrefix}`);
        const audMus = document.getElementById(`audioMus_${idPrefix}`);
        if (audVoc) audVoc.pause();
        if (audMus) audMus.pause();

        const [item] = activeResults.splice(itemIdx, 1);
        trashedResults.push(item);

        // Remove DOM Element
        const cardDOM = document.getElementById(`card_${idPrefix}`);
        if (cardDOM) cardDOM.remove();

        updateTrashUI();
        setStatus(`Separated track "Separation Test ${item.index}" moved to Trash / Deleted Previews.`);
      }

      // Restore capability
      window.restoreFromTrash = (idPrefix) => {
        const itemIdx = trashedResults.findIndex(r => r.idPrefix === idPrefix);
        if (itemIdx === -1) return;

        const [item] = trashedResults.splice(itemIdx, 1);
        activeResults.push(item);

        // Re-render in active list
        renderCard(item);
        updateTrashUI();
        setStatus(`Successfully recovered track "Separation Test ${item.index}" to active workspace.`);
      };

      // Purge forever capability
      window.purgePermanently = (idPrefix) => {
        const itemIdx = trashedResults.findIndex(r => r.idPrefix === idPrefix);
        if (itemIdx === -1) return;

        const [item] = trashedResults.splice(itemIdx, 1);

        // Revoke Object URLs to free memory
        URL.revokeObjectURL(item.vocalUrl);
        URL.revokeObjectURL(item.musicUrl);

        updateTrashUI();
        setStatus(`Permanently deleted track "Separation Test ${item.index}".`);
      };

      // Clear all active previews
      els.clearAllBtn.addEventListener("click", () => {
        if (activeResults.length === 0) return;
        const activeCopy = [...activeResults];
        activeCopy.forEach(item => {
          deleteCardToTrash(item.idPrefix);
        });
        setStatus("All active separation tests have been moved to Trash.");
      });

      els.masterInput.addEventListener("change", async () => {
        if (!els.masterInput.files[0]) return;
        setStatus("Loading audio track...");

        stopAudioPreview();

        master = await decodeBlob(els.masterInput.files[0]);

        buildPreviewBuffer(master);

        els.waveformContainer.style.display = "block";
        els.mainWaveform.width = els.mainWaveform.offsetWidth || 400;
        masterDuration = master.channels[0].length / master.sampleRate;
        masterPeaks = peaks(master, els.mainWaveform.width);
        selStart = 0;
        selEnd = 1;
        updateWaveformText();
        drawMasterWaveform();

        setStatus("Song loaded successfully. Drag across the waveform to select a part, or click separate to split the whole track.");
        els.separateBtn.disabled = false;
      });

      els.separateBtn.addEventListener("click", () => {
        if (!master) return;
        stopAudioPreview();

        els.separateBtn.disabled = true;
        els.loaderContainer.style.display = "block";
        els.progressBarFill.style.width = "0%";
        els.loaderPercent.textContent = "0%";
        setStatus("Stage 1/3: Running Voice Activity Detection scan...");

        const options = {
          vocalPower: els.vocalPower.value,
          vocalGate: els.vocalGate.value,
          vocalLow: els.vocalLowCut.value,
          vocalHigh: els.vocalHighCut.value,
          musicCutPower: els.musicCutPower.value,
          musicSmoothing: els.musicSmoothing.value,
          selStart: selStart,
          selEnd: selEnd
        };

        runSpectralSeparation(master, options,
          (progress) => {
            els.progressBarFill.style.width = `${progress}%`;
            els.loaderPercent.textContent = `${progress}%`;
            const stageEl = document.getElementById("loaderStatus");
            if (stageEl) {
              if (progress <= 3)       stageEl.textContent = "Stage 1/3: Voice Activity Detection…";
              else if (progress <= 87) stageEl.textContent = "Stage 2/3: Spectral separation…";
              else if (progress <= 99) stageEl.textContent = "Stage 3/3: Spectral inpainting…";
              else                     stageEl.textContent = "Finalising output…";
            }
          },
          (result) => {
            els.loaderContainer.style.display = "none";

            // Add directly into active inline playground
            addResultToPlayground(
              result.vocals, 
              result.music, 
              `Vocals [Sharpness: ${options.vocalPower}, Noise Gate: ${options.vocalGate}dB] | Instrumental [Removal Depth: ${options.musicCutPower}, Fullness: ${options.musicSmoothing}%]`
            );

            setStatus("Separation complete! Look at your separated tracks below.");
            els.separateBtn.disabled = false;

            // Ensure Active Workspace tab is showing
            els.tabActive.click();

            // Smoothly scroll down to show the user the new result card
            document.getElementById('playgroundArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        );
      });
    })();

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
