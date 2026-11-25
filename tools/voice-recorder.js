(() => {
      const els = {
        saveBtn: document.getElementById("saveBtn"),
        recordBtn: document.getElementById("recordBtn"),
        pauseBtn: document.getElementById("pauseBtn"),
        stopBtn: document.getElementById("stopBtn"),
        audioInput: document.getElementById("audioInput"),
        musicInput: document.getElementById("musicInput"),
        instrumentalInput: document.getElementById("instrumentalInput"),
        startRange: document.getElementById("startRange"),
        endRange: document.getElementById("endRange"),
        insertRange: document.getElementById("insertRange"),
        startValue: document.getElementById("startValue"),
        endValue: document.getElementById("endValue"),
        insertValue: document.getElementById("insertValue"),
        fadeRange: document.getElementById("fadeRange"),
        fadeValue: document.getElementById("fadeValue"),
        thresholdRange: document.getElementById("thresholdRange"),
        thresholdValue: document.getElementById("thresholdValue"),
        selectAllBtn: document.getElementById("selectAllBtn"),
        playSelectionBtn: document.getElementById("playSelectionBtn"),
        previewBtn: document.getElementById("previewBtn"),
        stopPreviewBtn: document.getElementById("stopPreviewBtn"),
        extractBtn: document.getElementById("extractBtn"),
        saveSelectionBtn: document.getElementById("saveSelectionBtn"),
        undoBtn: document.getElementById("undoBtn"),
        downloadBtn: document.getElementById("downloadBtn"),
        compressedBtn: document.getElementById("compressedBtn"),
        copyBtn: document.getElementById("copyBtn"),
        cutBtn: document.getElementById("cutBtn"),
        pasteBtn: document.getElementById("pasteBtn"),
        deleteBtn: document.getElementById("deleteBtn"),
        cropBtn: document.getElementById("cropBtn"),
        silenceBtn: document.getElementById("silenceBtn"),
        fadeInBtn: document.getElementById("fadeInBtn"),
        fadeOutBtn: document.getElementById("fadeOutBtn"),
        crossfadeBtn: document.getElementById("crossfadeBtn"),
        trimSilenceBtn: document.getElementById("trimSilenceBtn"),
        normalizeBtn: document.getElementById("normalizeBtn"),
        compressBtn: document.getElementById("compressBtn"),
        gateBtn: document.getElementById("gateBtn"),
        voiceCleanBtn: document.getElementById("voiceCleanBtn"),
        smoothMusicBtn: document.getElementById("smoothMusicBtn"),
        mixMusicBtn: document.getElementById("mixMusicBtn"),
        centerIsolateBtn: document.getElementById("centerIsolateBtn"),
        centerRemoveBtn: document.getElementById("centerRemoveBtn"),
        bassSafeRemoveBtn: document.getElementById("bassSafeRemoveBtn"),
        sideOnlyBtn: document.getElementById("sideOnlyBtn"),
        phaseCancelBtn: document.getElementById("phaseCancelBtn"),
        autoAlignBtn: document.getElementById("autoAlignBtn"),
        vocalEqBtn: document.getElementById("vocalEqBtn"),
        phaseOffsetRange: document.getElementById("phaseOffsetRange"),
        phaseOffsetValue: document.getElementById("phaseOffsetValue"),
        lowCutRange: document.getElementById("lowCutRange"),
        lowCutValue: document.getElementById("lowCutValue"),
        highCutRange: document.getElementById("highCutRange"),
        highCutValue: document.getElementById("highCutValue"),
        statusText: document.getElementById("statusText"),
        projectMeta: document.getElementById("projectMeta"),
        meterBar: document.getElementById("meterBar"),
        canvas: document.getElementById("waveform"),
        audioPreview: document.getElementById("audioPreview")
      };

      const dbName = "envizion-voice-studio";
      const storeName = "recordings";
      let mediaRecorder = null;
      let stream = null;
      let chunks = [];
      let audioContext = null;
      let analyser = null;
      let meterRaf = 0;
      let project = null;
      let musicProject = null;
      let instrumentalProject = null;
      let clipboard = null;
      let undoStack = [];
      let currentBlob = null;
      let currentName = "voice-edit.wav";
      let dragging = false;
      let dragStart = 0;

      function setStatus(message) {
        els.statusText.textContent = message;
      }

      function seconds(samples, sampleRate) {
        return samples / sampleRate;
      }

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function bestMimeType() {
        const options = ["audio/mpeg", "audio/mp3", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
        return options.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
      }

      function bufferToProject(buffer) {
        const channels = [];
        for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
          channels.push(new Float32Array(buffer.getChannelData(channel)));
        }
        return { sampleRate: buffer.sampleRate, channels };
      }

      function cloneProject(source) {
        return {
          sampleRate: source.sampleRate,
          channels: source.channels.map((channel) => new Float32Array(channel))
        };
      }

      function durationOf(source = project) {
        return source ? source.channels[0].length / source.sampleRate : 0;
      }

      function selectedFrames() {
        const start = Math.floor(Number(els.startRange.value) * project.sampleRate);
        const end = Math.floor(Number(els.endRange.value) * project.sampleRate);
        return {
          start: clamp(start, 0, project.channels[0].length),
          end: clamp(Math.max(end, start + 1), 0, project.channels[0].length)
        };
      }

      function pushUndo() {
        if (!project) return;
        undoStack.push(cloneProject(project));
        if (undoStack.length > 12) undoStack.shift();
        els.undoBtn.disabled = false;
      }

      function setEditorEnabled(enabled) {
        Object.values(els).forEach((el) => {
        if (el instanceof HTMLButtonElement && !["recordBtn", "pauseBtn", "stopBtn"].includes(el.id)) {
            el.disabled = !enabled;
          }
        });
        [els.startRange, els.endRange, els.insertRange, els.fadeRange, els.thresholdRange, els.phaseOffsetRange, els.lowCutRange, els.highCutRange].forEach((input) => {
          input.disabled = !enabled;
        });
        els.pauseBtn.disabled = true;
        els.stopBtn.disabled = true;
        els.recordBtn.disabled = false;
        els.pasteBtn.disabled = !clipboard || !enabled;
        els.mixMusicBtn.disabled = !enabled || !musicProject;
        els.phaseCancelBtn.disabled = !enabled || !instrumentalProject;
        els.autoAlignBtn.disabled = !enabled || !instrumentalProject;
        els.undoBtn.disabled = undoStack.length === 0;
      }

      function refreshRanges(keepSelection = false) {
        if (!project) {
          els.projectMeta.textContent = "No audio loaded.";
          setEditorEnabled(false);
          drawWaveform();
          return;
        }
        const duration = durationOf();
        const oldStart = Number(els.startRange.value);
        const oldEnd = Number(els.endRange.value);
        [els.startRange, els.endRange, els.insertRange].forEach((range) => {
          range.max = duration.toFixed(2);
        });
        if (!keepSelection) {
          els.startRange.value = "0";
          els.endRange.value = duration.toFixed(2);
          els.insertRange.value = "0";
        } else {
          els.startRange.value = clamp(oldStart, 0, duration).toFixed(2);
          els.endRange.value = clamp(oldEnd, Number(els.startRange.value) + 0.01, duration).toFixed(2);
          els.insertRange.value = clamp(Number(els.insertRange.value), 0, duration).toFixed(2);
        }
        els.projectMeta.textContent = `${duration.toFixed(2)}s, ${project.channels.length} channel${project.channels.length > 1 ? "s" : ""}, ${project.sampleRate} Hz`;
        setEditorEnabled(true);
        updateLabels();
      }

      function updateLabels() {
        if (!project) return;
        const duration = durationOf();
        let start = Number(els.startRange.value);
        let end = Number(els.endRange.value);
        if (end <= start) end = Math.min(duration, start + 0.01);
        els.endRange.value = end.toFixed(2);
        els.startValue.textContent = `${start.toFixed(2)}s`;
        els.endValue.textContent = `${end.toFixed(2)}s`;
        els.insertValue.textContent = `${Number(els.insertRange.value).toFixed(2)}s`;
        els.fadeValue.textContent = `${Number(els.fadeRange.value).toFixed(2)}s`;
        els.thresholdValue.textContent = `${Math.round(Number(els.thresholdRange.value) * 100)}%`;
        els.phaseOffsetValue.textContent = `${Number(els.phaseOffsetRange.value)} ms`;
        els.lowCutValue.textContent = `${Number(els.lowCutRange.value)} Hz`;
        els.highCutValue.textContent = `${Number(els.highCutRange.value)} Hz`;
        drawWaveform();
      }

      async function decodeBlob(blob) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        await ctx.close();
        return buffer;
      }

      async function loadMainBlob(blob, name) {
        if (!blob) return;
        try {
          const buffer = await decodeBlob(blob);
          project = bufferToProject(buffer);
          currentName = (name || "voice-edit").replace(/\.[^.]+$/, "") + ".wav";
          currentBlob = projectToWav(project);
          els.audioPreview.src = URL.createObjectURL(currentBlob);
          refreshRanges(false);
          setStatus(`Loaded ${name || "audio file"}.`);
        } catch {
          setStatus("Could not decode that audio file.");
        }
      }

      async function loadMusicBlob(blob, name) {
        if (!blob) return;
        try {
          const buffer = await decodeBlob(blob);
          musicProject = bufferToProject(buffer);
          els.mixMusicBtn.disabled = !project;
          setStatus(`Loaded background music: ${name || "audio"}.`);
        } catch {
          setStatus("Could not decode that background music file.");
        }
      }

      async function loadInstrumentalBlob(blob, name) {
        if (!blob) return;
        try {
          const buffer = await decodeBlob(blob);
          instrumentalProject = bufferToProject(buffer);
          els.phaseCancelBtn.disabled = !project;
          els.autoAlignBtn.disabled = !project;
          setStatus(`Loaded instrumental for null test: ${name || "audio"}.`);
        } catch {
          setStatus("Could not decode that instrumental file.");
        }
      }

      function openMediaLibraryDb() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open("envizion-media-library", 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
            if (!db.objectStoreNames.contains("exports")) db.createObjectStore("exports");
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function importRecorderLibraryExport() {
        try {
          const db = await openMediaLibraryDb();
          const record = await new Promise((resolve, reject) => {
            const tx = db.transaction("exports", "readonly");
            const request = tx.objectStore("exports").get("recorder");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          if (record && record.files && record.files[0]) {
            await loadMainBlob(record.files[0].blob, record.files[0].name);
            setStatus(`Imported ${record.files[0].name} from Audio Library.`);
          }
        } catch {
          setStatus("Ready.");
        }
      }

      function drawWaveform() {
        const canvas = els.canvas;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!project) {
          ctx.fillStyle = "#8b949e";
          ctx.font = "28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
          ctx.fillText("Record or import audio to start editing.", 36, 78);
          return;
        }

        const data = project.channels[0];
        const step = Math.max(1, Math.ceil(data.length / canvas.width));
        const center = canvas.height / 2;
        const amp = canvas.height * 0.42;
        ctx.strokeStyle = "#58a6ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 1) {
          let min = 1;
          let max = -1;
          for (let i = 0; i < step; i += 1) {
            const sample = data[x * step + i] || 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
          }
          ctx.moveTo(x, center + min * amp);
          ctx.lineTo(x, center + max * amp);
        }
        ctx.stroke();

        const duration = durationOf();
        const startX = (Number(els.startRange.value) / duration) * canvas.width;
        const endX = (Number(els.endRange.value) / duration) * canvas.width;
        const insertX = (Number(els.insertRange.value) / duration) * canvas.width;
        ctx.fillStyle = "rgba(9, 105, 218, 0.25)";
        ctx.fillRect(startX, 0, Math.max(2, endX - startX), canvas.height);
        ctx.fillStyle = "#2f81f7";
        ctx.fillRect(startX, 0, 4, canvas.height);
        ctx.fillRect(endX - 4, 0, 4, canvas.height);
        ctx.fillStyle = "#f0f6fc";
        ctx.fillRect(insertX, 0, 2, canvas.height);
      }

      function projectToWav(source, options = {}) {
        const sampleRate = options.sampleRate || source.sampleRate;
        const mono = Boolean(options.mono);
        const start = options.startFrame || 0;
        const end = options.endFrame || source.channels[0].length;
        const sourceRate = source.sampleRate;
        const channelCount = mono ? 1 : source.channels.length;
        const frameCount = Math.max(1, Math.floor((end - start) * sampleRate / sourceRate));
        const bytesPerSample = 2;
        const blockAlign = channelCount * bytesPerSample;
        const dataSize = frameCount * blockAlign;
        const arrayBuffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(arrayBuffer);

        function writeString(offset, value) {
          for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
        }

        writeString(0, "RIFF");
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channelCount, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < frameCount; i += 1) {
          const sourceIndex = start + i * sourceRate / sampleRate;
          const lo = Math.floor(sourceIndex);
          const hi = Math.min(end - 1, lo + 1);
          const t = sourceIndex - lo;
          for (let channel = 0; channel < channelCount; channel += 1) {
            let sample = 0;
            if (mono) {
              for (const data of source.channels) sample += ((data[lo] || 0) * (1 - t)) + ((data[hi] || 0) * t);
              sample /= source.channels.length;
            } else {
              const data = source.channels[channel];
              sample = ((data[lo] || 0) * (1 - t)) + ((data[hi] || 0) * t);
            }
            sample = clamp(sample, -1, 1);
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
          }
        }

        return new Blob([arrayBuffer], { type: "audio/wav" });
      }

      function updatePreview(name = "voice-edit.wav") {
        currentName = name;
        currentBlob = projectToWav(project);
        els.audioPreview.src = URL.createObjectURL(currentBlob);
        refreshRanges(true);
      }

      function sliceProject(source, start, end) {
        return {
          sampleRate: source.sampleRate,
          channels: source.channels.map((channel) => channel.slice(start, end))
        };
      }

      function replaceProject(newChannels) {
        project = { sampleRate: project.sampleRate, channels: newChannels };
      }

      function operateSelection(operationName, callback) {
        if (!project) return;
        pushUndo();
        const range = selectedFrames();
        callback(range);
        updatePreview(`${operationName}.wav`);
        setStatus(`${operationName} applied.`);
      }

      function copySelection() {
        const range = selectedFrames();
        clipboard = sliceProject(project, range.start, range.end);
        els.pasteBtn.disabled = false;
        setStatus("Selection copied.");
      }

      function deleteSelection() {
        operateSelection("selection-deleted", (range) => {
          replaceProject(project.channels.map((channel) => {
            const next = new Float32Array(channel.length - (range.end - range.start));
            next.set(channel.slice(0, range.start), 0);
            next.set(channel.slice(range.end), range.start);
            return next;
          }));
        });
      }

      function pasteClipboard() {
        if (!project || !clipboard) return;
        pushUndo();
        const insert = Math.floor(Number(els.insertRange.value) * project.sampleRate);
        replaceProject(project.channels.map((channel, index) => {
          const clip = clipboard.channels[Math.min(index, clipboard.channels.length - 1)];
          const next = new Float32Array(channel.length + clip.length);
          next.set(channel.slice(0, insert), 0);
          next.set(clip, insert);
          next.set(channel.slice(insert), insert + clip.length);
          return next;
        }));
        updatePreview("pasted-audio.wav");
        setStatus("Clipboard pasted.");
      }

      function applyGainEnvelope(range, type) {
        const fadeFrames = Math.min(range.end - range.start, Math.floor(Number(els.fadeRange.value) * project.sampleRate));
        project.channels.forEach((channel) => {
          for (let i = 0; i < fadeFrames; i += 1) {
            const ratio = i / Math.max(1, fadeFrames - 1);
            if (type === "in") channel[range.start + i] *= ratio;
            if (type === "out") channel[range.end - 1 - i] *= ratio;
            if (type === "both") {
              channel[range.start + i] *= ratio;
              channel[range.end - 1 - i] *= ratio;
            }
          }
        });
      }

      function peakOf(source) {
        let peak = 0;
        source.channels.forEach((channel) => {
          for (let i = 0; i < channel.length; i += 1) peak = Math.max(peak, Math.abs(channel[i]));
        });
        return peak;
      }

      function normalizeProject(target = 0.92) {
        operateSelection("normalized-voice", () => {
          const peak = peakOf(project);
          if (!peak) return;
          const gain = target / peak;
          project.channels.forEach((channel) => {
            for (let i = 0; i < channel.length; i += 1) channel[i] = clamp(channel[i] * gain, -1, 1);
          });
        });
      }

      function compressProject() {
        operateSelection("compressed-voice", () => {
          const threshold = 0.28;
          const ratio = 4;
          const makeup = 1.25;
          project.channels.forEach((channel) => {
            for (let i = 0; i < channel.length; i += 1) {
              const sign = Math.sign(channel[i]);
              const abs = Math.abs(channel[i]);
              const compressed = abs > threshold ? threshold + (abs - threshold) / ratio : abs;
              channel[i] = clamp(sign * compressed * makeup, -1, 1);
            }
          });
        });
      }

      function noiseGate() {
        operateSelection("noise-gated", (range) => {
          const threshold = Number(els.thresholdRange.value);
          const release = Math.floor(0.015 * project.sampleRate);
          project.channels.forEach((channel) => {
            let hold = 0;
            for (let i = range.start; i < range.end; i += 1) {
              if (Math.abs(channel[i]) >= threshold) hold = release;
              else if (hold > 0) hold -= 1;
              else channel[i] *= 0.12;
            }
          });
        });
      }

      function voiceCleanup() {
        operateSelection("voice-cleanup", () => {
          project.channels.forEach((channel) => {
            let last = 0;
            for (let i = 0; i < channel.length; i += 1) {
              const highPassed = channel[i] - last * 0.96;
              last = channel[i];
              channel[i] = clamp(highPassed * 1.15, -1, 1);
            }
          });
          compressProject();
        });
      }

      function smoothMusic() {
        operateSelection("smoothed-music", () => {
          project.channels.forEach((channel) => {
            let smooth = 0;
            for (let i = 0; i < channel.length; i += 1) {
              smooth = smooth * 0.985 + channel[i] * 0.015;
              channel[i] = clamp(channel[i] * 0.72 + smooth * 0.28, -1, 1);
            }
          });
        });
      }

      function centerVocalOnly() {
        if (!project || project.channels.length < 2) return setStatus("Vocal isolate needs stereo audio.");
        operateSelection("vocal-center-isolate", () => {
          const left = project.channels[0];
          const right = project.channels[1];
          const mono = new Float32Array(left.length);
          for (let i = 0; i < left.length; i += 1) mono[i] = clamp((left[i] + right[i]) * 0.5, -1, 1);
          project.channels = [mono, new Float32Array(mono)];
          project.channels[1].set(mono);
        });
      }

      function removeCenterVocal() {
        if (!project || project.channels.length < 2) return setStatus("Center vocal removal needs stereo audio.");
        operateSelection("center-vocal-removed", () => {
          const left = project.channels[0];
          const right = project.channels[1];
          for (let i = 0; i < left.length; i += 1) {
            const side = clamp((left[i] - right[i]) * 0.5, -1, 1);
            left[i] = side;
            right[i] = -side;
          }
        });
      }

      function onePoleLowpass(channel, cutoff, sampleRate) {
        const rc = 1 / (2 * Math.PI * cutoff);
        const dt = 1 / sampleRate;
        const alpha = dt / (rc + dt);
        const out = new Float32Array(channel.length);
        let y = channel[0] || 0;
        for (let i = 0; i < channel.length; i += 1) {
          y += alpha * ((channel[i] || 0) - y);
          out[i] = y;
        }
        return out;
      }

      function onePoleHighpass(channel, cutoff, sampleRate) {
        const low = onePoleLowpass(channel, cutoff, sampleRate);
        const out = new Float32Array(channel.length);
        for (let i = 0; i < channel.length; i += 1) out[i] = channel[i] - low[i];
        return out;
      }

      function centerRemoveBassSafe() {
        if (!project || project.channels.length < 2) return setStatus("Bass-safe center removal needs stereo audio.");
        operateSelection("bass-safe-center-removed", () => {
          const left = project.channels[0];
          const right = project.channels[1];
          const center = new Float32Array(left.length);
          for (let i = 0; i < left.length; i += 1) center[i] = (left[i] + right[i]) * 0.5;
          const bass = onePoleLowpass(center, 160, project.sampleRate);
          for (let i = 0; i < left.length; i += 1) {
            const side = (left[i] - right[i]) * 0.5;
            left[i] = clamp(side + bass[i] * 0.8, -1, 1);
            right[i] = clamp(-side + bass[i] * 0.8, -1, 1);
          }
        });
      }

      function sideOnly() {
        if (!project || project.channels.length < 2) return setStatus("Side-only extraction needs stereo audio.");
        operateSelection("side-only", () => {
          const left = project.channels[0];
          const right = project.channels[1];
          for (let i = 0; i < left.length; i += 1) {
            const side = clamp((left[i] - right[i]) * 0.5, -1, 1);
            left[i] = side;
            right[i] = side;
          }
        });
      }

      function vocalEqFilter() {
        if (!project) return;
        operateSelection("vocal-eq-filtered", () => {
          const lowCut = Number(els.lowCutRange.value);
          const highCut = Number(els.highCutRange.value);
          project.channels = project.channels.map((channel) => {
            const highPassed = onePoleHighpass(channel, lowCut, project.sampleRate);
            const band = onePoleLowpass(highPassed, highCut, project.sampleRate);
            for (let i = 0; i < band.length; i += 1) band[i] = clamp(band[i] * 1.25, -1, 1);
            return band;
          });
        });
      }

      function sampleFrom(source, channelIndex, frame, outputSampleRate) {
        const channel = source.channels[Math.min(channelIndex, source.channels.length - 1)];
        const sourceFrame = frame * source.sampleRate / outputSampleRate;
        const lo = Math.floor(sourceFrame);
        const hi = Math.min(channel.length - 1, lo + 1);
        const t = sourceFrame - lo;
        if (lo < 0 || lo >= channel.length) return 0;
        return ((channel[lo] || 0) * (1 - t)) + ((channel[hi] || 0) * t);
      }

      function phaseCancelInstrumental() {
        if (!project || !instrumentalProject) return setStatus("Import an exact instrumental first.");
        pushUndo();
        const offsetFrames = Math.round(Number(els.phaseOffsetRange.value) * project.sampleRate / 1000);
        const channels = project.channels.map((channel) => new Float32Array(channel.length));
        for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
          const out = channels[channelIndex];
          const original = project.channels[channelIndex];
          for (let i = 0; i < out.length; i += 1) {
            const instrumental = sampleFrom(instrumentalProject, channelIndex, i - offsetFrames, project.sampleRate);
            out[i] = clamp((original[i] || 0) - instrumental, -1, 1);
          }
        }
        replaceProject(channels);
        updatePreview("phase-cancelled-vocal.wav");
        setStatus("Phase cancellation applied. Best results need the exact same master and instrumental.");
      }

      function autoAlignInstrumental() {
        if (!project || !instrumentalProject) return setStatus("Import an exact instrumental first.");
        const searchFrames = Math.floor(0.5 * project.sampleRate);
        const step = Math.max(1, Math.floor(project.sampleRate / 200));
        const length = Math.min(project.channels[0].length, Math.floor(20 * project.sampleRate));
        let bestOffset = 0;
        let bestScore = -Infinity;
        for (let offset = -searchFrames; offset <= searchFrames; offset += step) {
          let score = 0;
          for (let i = 0; i < length; i += step) {
            score += (project.channels[0][i] || 0) * sampleFrom(instrumentalProject, 0, i - offset, project.sampleRate);
          }
          if (score > bestScore) {
            bestScore = score;
            bestOffset = offset;
          }
        }
        els.phaseOffsetRange.value = Math.round(bestOffset * 1000 / project.sampleRate);
        updateLabels();
        setStatus(`Auto alignment set offset to ${els.phaseOffsetRange.value} ms.`);
      }

      function mixMusicUnderVoice() {
        if (!project || !musicProject) return;
        pushUndo();
        const output = project.channels.map((channel) => new Float32Array(channel));
        const musicChannels = musicProject.channels;
        for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
          const voice = output[channelIndex];
          const music = musicChannels[Math.min(channelIndex, musicChannels.length - 1)];
          for (let i = 0; i < voice.length; i += 1) {
            const musicSample = music[i % music.length] || 0;
            const duck = Math.abs(voice[i]) > 0.035 ? 0.18 : 0.42;
            voice[i] = clamp(voice[i] + musicSample * duck, -1, 1);
          }
        }
        replaceProject(output);
        updatePreview("voice-with-smoothed-music.wav");
        setStatus("Background music mixed under voice.");
      }

      function trimSilence() {
        if (!project) return;
        pushUndo();
        const threshold = Number(els.thresholdRange.value);
        const data = project.channels[0];
        let start = 0;
        let end = data.length - 1;
        while (start < data.length && Math.abs(data[start]) < threshold) start += 1;
        while (end > start && Math.abs(data[end]) < threshold) end -= 1;
        if (end <= start) return setStatus("No strong audio found to trim.");
        project = sliceProject(project, start, end + 1);
        updatePreview("silence-trimmed.wav");
        setStatus("Leading and trailing silence trimmed.");
      }

      function exportSelection(saveToPlayer = true) {
        if (!project) return null;
        const range = selectedFrames();
        const blob = projectToWav(project, { startFrame: range.start, endFrame: range.end });
        if (saveToPlayer) {
          currentBlob = blob;
          currentName = "selection-extract.wav";
          els.audioPreview.src = URL.createObjectURL(blob);
          setStatus("Selection extracted to preview.");
        }
        return blob;
      }

      function downloadBlob(blob, name) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      function openDb() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName, 1);
          request.onupgradeneeded = () => request.result.createObjectStore(storeName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function saveBlobToTeleprompter(blob, name) {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, "readwrite");
          tx.objectStore(storeName).put({ blob, name, type: blob.type, savedAt: new Date().toISOString() }, "latest");
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        setStatus("Saved. Return to the teleprompter and import latest.");
      }

      function startMeter(inputStream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(inputStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const average = data.reduce((sum, value) => sum + value, 0) / data.length;
          els.meterBar.style.width = `${Math.min(100, Math.round((average / 150) * 100))}%`;
          meterRaf = requestAnimationFrame(tick);
        };
        tick();
      }

      function stopMeter() {
        cancelAnimationFrame(meterRaf);
        els.meterBar.style.width = "0%";
        if (audioContext) audioContext.close();
        audioContext = null;
      }

      async function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus("Microphone recording is not available in this browser.");
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = bestMimeType();
          mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          chunks = [];
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size) chunks.push(event.data);
          };
          mediaRecorder.onstop = async () => {
            const type = mediaRecorder.mimeType || "audio/webm";
            const blob = new Blob(chunks, { type });
            stream.getTracks().forEach((track) => track.stop());
            stopMeter();
            await loadMainBlob(blob, "voice-recording.webm");
          };
          mediaRecorder.start();
          startMeter(stream);
          els.recordBtn.disabled = true;
          els.pauseBtn.disabled = false;
          els.stopBtn.disabled = false;
          setStatus("Recording.");
        } catch {
          setStatus("Microphone permission was blocked or unavailable.");
        }
      }

      function pauseRecording() {
        if (!mediaRecorder) return;
        if (mediaRecorder.state === "recording") {
          mediaRecorder.pause();
          els.pauseBtn.textContent = "Resume";
          setStatus("Recording paused.");
        } else if (mediaRecorder.state === "paused") {
          mediaRecorder.resume();
          els.pauseBtn.textContent = "Pause";
          setStatus("Recording.");
        }
      }

      function stopRecording() {
        if (!mediaRecorder || mediaRecorder.state === "inactive") return;
        mediaRecorder.stop();
        els.recordBtn.disabled = false;
        els.pauseBtn.disabled = true;
        els.stopBtn.disabled = true;
        els.pauseBtn.textContent = "Pause";
      }

      function canvasTime(event) {
        const rect = els.canvas.getBoundingClientRect();
        const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        return ratio * durationOf();
      }

      els.canvas.addEventListener("pointerdown", (event) => {
        if (!project) return;
        dragging = true;
        dragStart = canvasTime(event);
        els.startRange.value = dragStart.toFixed(2);
        els.endRange.value = dragStart.toFixed(2);
        els.canvas.setPointerCapture(event.pointerId);
        updateLabels();
      });
      els.canvas.addEventListener("pointermove", (event) => {
        if (!dragging || !project) return;
        const now = canvasTime(event);
        els.startRange.value = Math.min(dragStart, now).toFixed(2);
        els.endRange.value = Math.max(dragStart, now).toFixed(2);
        els.insertRange.value = Math.min(dragStart, now).toFixed(2);
        updateLabels();
      });
      els.canvas.addEventListener("pointerup", () => {
        dragging = false;
      });

      els.recordBtn.addEventListener("click", startRecording);
      els.pauseBtn.addEventListener("click", pauseRecording);
      els.stopBtn.addEventListener("click", stopRecording);
      els.audioInput.addEventListener("change", () => loadMainBlob(els.audioInput.files[0], els.audioInput.files[0].name));
      els.musicInput.addEventListener("change", () => loadMusicBlob(els.musicInput.files[0], els.musicInput.files[0].name));
      els.instrumentalInput.addEventListener("change", () => loadInstrumentalBlob(els.instrumentalInput.files[0], els.instrumentalInput.files[0].name));
      [els.startRange, els.endRange, els.insertRange, els.fadeRange, els.thresholdRange, els.phaseOffsetRange, els.lowCutRange, els.highCutRange].forEach((input) => input.addEventListener("input", updateLabels));
      els.selectAllBtn.addEventListener("click", () => {
        els.startRange.value = "0";
        els.endRange.value = durationOf().toFixed(2);
        updateLabels();
      });
      els.playSelectionBtn.addEventListener("click", () => exportSelection(true));
      els.previewBtn.addEventListener("click", () => {
        if (!currentBlob && project) currentBlob = projectToWav(project);
        if (currentBlob) {
          els.audioPreview.src = URL.createObjectURL(currentBlob);
          els.audioPreview.play();
        }
      });
      els.stopPreviewBtn.addEventListener("click", () => {
        els.audioPreview.pause();
        els.audioPreview.currentTime = 0;
      });
      els.undoBtn.addEventListener("click", () => {
        if (!undoStack.length) return;
        project = undoStack.pop();
        updatePreview("undo.wav");
        setStatus("Undo applied.");
      });
      els.copyBtn.addEventListener("click", copySelection);
      els.cutBtn.addEventListener("click", () => {
        copySelection();
        deleteSelection();
      });
      els.pasteBtn.addEventListener("click", pasteClipboard);
      els.deleteBtn.addEventListener("click", deleteSelection);
      els.cropBtn.addEventListener("click", () => operateSelection("cropped-audio", (range) => { project = sliceProject(project, range.start, range.end); }));
      els.silenceBtn.addEventListener("click", () => operateSelection("silenced-selection", (range) => {
        project.channels.forEach((channel) => channel.fill(0, range.start, range.end));
      }));
      els.fadeInBtn.addEventListener("click", () => operateSelection("fade-in", (range) => applyGainEnvelope(range, "in")));
      els.fadeOutBtn.addEventListener("click", () => operateSelection("fade-out", (range) => applyGainEnvelope(range, "out")));
      els.crossfadeBtn.addEventListener("click", () => operateSelection("soft-edges", (range) => applyGainEnvelope(range, "both")));
      els.trimSilenceBtn.addEventListener("click", trimSilence);
      els.normalizeBtn.addEventListener("click", normalizeProject);
      els.compressBtn.addEventListener("click", compressProject);
      els.gateBtn.addEventListener("click", noiseGate);
      els.voiceCleanBtn.addEventListener("click", voiceCleanup);
      els.smoothMusicBtn.addEventListener("click", smoothMusic);
      els.mixMusicBtn.addEventListener("click", mixMusicUnderVoice);
      els.centerIsolateBtn.addEventListener("click", centerVocalOnly);
      els.centerRemoveBtn.addEventListener("click", removeCenterVocal);
      els.bassSafeRemoveBtn.addEventListener("click", centerRemoveBassSafe);
      els.sideOnlyBtn.addEventListener("click", sideOnly);
      els.phaseCancelBtn.addEventListener("click", phaseCancelInstrumental);
      els.autoAlignBtn.addEventListener("click", autoAlignInstrumental);
      els.vocalEqBtn.addEventListener("click", vocalEqFilter);
      els.extractBtn.addEventListener("click", () => exportSelection(true));
      els.downloadBtn.addEventListener("click", () => {
        if (project) downloadBlob(projectToWav(project), currentName);
      });
      els.compressedBtn.addEventListener("click", () => {
        if (project) downloadBlob(projectToWav(project, { sampleRate: 22050, mono: true }), "compressed-mono-22050.wav");
      });
      els.saveBtn.addEventListener("click", () => {
        if (project) saveBlobToTeleprompter(projectToWav(project), currentName);
      });
      els.saveSelectionBtn.addEventListener("click", () => {
        const blob = exportSelection(false);
        if (blob) saveBlobToTeleprompter(blob, "teleprompter-selection.wav");
      });

      setEditorEnabled(false);
      drawWaveform();
      importRecorderLibraryExport();
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
