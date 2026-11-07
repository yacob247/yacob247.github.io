// Elements
    const player = document.getElementById('player');
    const fileInput = document.getElementById('fileInput');
    const playlistContainer = document.getElementById('playlistContainer');
    const playlistEmpty = document.getElementById('playlistEmpty');
    const mediaContainer = document.getElementById('mediaContainer');
    const emptyState = document.getElementById('emptyState');
    const audioVisualizer = document.getElementById('audioVisualizer');
    const currentAudioTitle = document.getElementById('currentAudioTitle');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // New feature elements
    const btnBookmark = document.getElementById('btnBookmark');
    const btnScreenshot = document.getElementById('btnScreenshot');
    const btnExportClip = document.getElementById('btnExportClip');
    const btnClearBookmarks = document.getElementById('btnClearBookmarks');
    const bookmarkList = document.getElementById('bookmarkList');
    const notesArea = document.getElementById('notesArea');
    const btnInsertTimestamp = document.getElementById('btnInsertTimestamp');
    const btnDownloadNotes = document.getElementById('btnDownloadNotes');
    const clipExportBar = document.getElementById('clipExportBar');
    const clipProgress = document.getElementById('clipProgress');
    const clipExportStatus = document.getElementById('clipExportStatus');
    const audioCanvas = document.getElementById('audioCanvas');

    // --- SIDEBAR TABS ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });

    // --- AUDIO CANVAS VISUALIZER ---
    let audioCtx, analyser, source, animFrame;
    function startVisualizer() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaElementSource(player);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      const canvas = audioCanvas;
      const ctx = canvas.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      function draw() {
        animFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const hue = (i / bufferLength) * 220 + 180;
          ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.85)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      }
      draw();
    }
    function stopVisualizer() {
      if (animFrame) cancelAnimationFrame(animFrame);
    }

    // --- BOOKMARKS ---
    let bookmarks = [];
    function addBookmark() {
      if (!player.duration) return;
      const t = player.currentTime;
      const label = prompt('Bookmark label (optional):', '') || '';
      bookmarks.push({ t, label });
      bookmarks.sort((a, b) => a.t - b.t);
      renderBookmarks();
      // Switch to bookmark tab
      document.querySelector('[data-tab="bookmarks"]').click();
      showToast(`Bookmark added: ${formatTime(t)}`);
    }
    function renderBookmarks() {
      if (bookmarks.length === 0) {
        bookmarkList.innerHTML = `<p class="text-center text-slate-500 text-xs mt-8 px-4">Press <span class="shortcut-key">B</span> or click <i class="ph ph-bookmark"></i> to save a timestamp.<br>Click any bookmark to jump there.</p>`;
        return;
      }
      bookmarkList.innerHTML = '';
      bookmarks.forEach((bm, i) => {
        const el = document.createElement('div');
        el.className = 'bookmark-item flex items-center gap-2 px-2 py-2 rounded-lg mb-1';
        el.innerHTML = `
          <button class="w-16 text-xs font-mono text-blue-400 hover:text-blue-300 shrink-0 text-left" title="Jump to ${formatTime(bm.t)}">${formatTime(bm.t)}</button>
          <span class="flex-1 text-xs text-slate-300 truncate">${bm.label || '—'}</span>
          <button class="del-bm text-slate-600 hover:text-red-400 text-xs transition" data-i="${i}"><i class="ph ph-x"></i></button>
        `;
        el.querySelector('button:first-child').addEventListener('click', () => { player.currentTime = bm.t; });
        el.querySelector('.del-bm').addEventListener('click', (e) => {
          e.stopPropagation();
          bookmarks.splice(i, 1);
          renderBookmarks();
        });
        bookmarkList.appendChild(el);
      });
    }
    btnBookmark.addEventListener('click', addBookmark);
    btnClearBookmarks.addEventListener('click', () => { bookmarks = []; renderBookmarks(); });

    // --- SCREENSHOT ---
    function takeScreenshot() {
      if (player.classList.contains('hidden') || !player.duration) {
        showToast('No video to screenshot');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = player.videoWidth;
      canvas.height = player.videoHeight;
      canvas.getContext('2d').drawImage(player, 0, 0);
      const link = document.createElement('a');
      const name = (playlist[currentIndex]?.name || 'frame').replace(/\.[^.]+$/, '');
      link.download = `${name}_${formatTime(player.currentTime).replace(/:/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Frame saved as PNG');
    }
    btnScreenshot.addEventListener('click', takeScreenshot);

    // --- CLIP EXPORT (A-B) ---
    let clipRecorder = null;
    btnExportClip.addEventListener('click', () => {
      if (!player.duration) { showToast('No media loaded'); return; }
      if (loopA === null || loopB === null) { showToast('Set A and B markers first'); return; }
      if (clipRecorder) { showToast('Export already in progress'); return; }

      const start = loopA;
      const end = loopB;
      const duration = end - start;

      // Use MediaRecorder on the media element's stream
      let stream;
      try {
        stream = player.captureStream ? player.captureStream() : player.mozCaptureStream();
      } catch (e) {
        showToast('Clip export not supported in this browser');
        return;
      }

      const chunks = [];
      clipRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      clipRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      clipRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const name = (playlist[currentIndex]?.name || 'clip').replace(/\.[^.]+$/, '');
        a.download = `${name}_clip_${formatTime(start).replace(/:/g,'-')}-${formatTime(end).replace(/:/g,'-')}.webm`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
        clipRecorder = null;
        clipExportBar.classList.add('hidden');
        clipProgress.style.width = '0%';
        showToast('Clip exported!');
      };

      player.currentTime = start;
      player.play();
      clipRecorder.start();
      clipExportBar.classList.remove('hidden');
      clipExportStatus.textContent = `Recording ${formatTime(start)} → ${formatTime(end)}…`;

      const interval = setInterval(() => {
        const elapsed = player.currentTime - start;
        const pct = Math.min((elapsed / duration) * 100, 100);
        clipProgress.style.width = pct + '%';
        if (player.currentTime >= end) {
          clearInterval(interval);
          clipRecorder.stop();
          player.pause();
        }
      }, 100);
    });

    // --- NOTES ---
    function insertTimestamp() {
      const t = player.duration ? `[${formatTime(player.currentTime)}] ` : '[--:--] ';
      const pos = notesArea.selectionStart;
      notesArea.value = notesArea.value.slice(0, pos) + t + notesArea.value.slice(pos);
      notesArea.selectionStart = notesArea.selectionEnd = pos + t.length;
      notesArea.focus();
    }
    btnInsertTimestamp.addEventListener('click', insertTimestamp);
    btnDownloadNotes.addEventListener('click', () => {
      if (!notesArea.value.trim()) { showToast('Notes are empty'); return; }
      const blob = new Blob([notesArea.value], { type: 'text/plain' });
      const a = document.createElement('a');
      const name = playlist[currentIndex]?.name?.replace(/\.[^.]+$/, '') || 'notes';
      a.download = `${name}_notes.txt`;
      a.href = URL.createObjectURL(blob);
      a.click();
      showToast('Notes saved');
    });

    // --- KEYBOARD SHORTCUTS ---
    const SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    document.addEventListener('keydown', (e) => {
      // Don't fire shortcuts if typing in notes
      if (e.target === notesArea) {
        if (e.key === 't' || e.key === 'T') { e.preventDefault(); insertTimestamp(); }
        return;
      }
      switch (e.key) {
        case ' ': e.preventDefault();
          if (playlist.length === 0) return;
          player.paused ? player.play() : player.pause(); break;
        case 'j': case 'J': player.currentTime = Math.max(player.currentTime - 10, 0); break;
        case 'l': case 'L': player.currentTime = Math.min(player.currentTime + 10, player.duration || 0); break;
        case 'ArrowLeft': e.preventDefault(); player.currentTime = Math.max(player.currentTime - 5, 0); break;
        case 'ArrowRight': e.preventDefault(); player.currentTime = Math.min(player.currentTime + 5, player.duration || 0); break;
        case 'ArrowUp': e.preventDefault(); player.volume = Math.min(player.volume + 0.1, 1); volumeBar.value = player.volume; updateVolumeIcon(); break;
        case 'ArrowDown': e.preventDefault(); player.volume = Math.max(player.volume - 0.1, 0); volumeBar.value = player.volume; updateVolumeIcon(); break;
        case 'm': case 'M': player.muted = !player.muted; updateVolumeIcon(); break;
        case 'f': case 'F': btnFullscreen.click(); break;
        case 'a': case 'A': btnSetA.click(); break;
        case 'z': case 'Z': btnSetB.click(); break;
        case 'b': case 'B': addBookmark(); break;
        case 's': case 'S': takeScreenshot(); break;
        case 't': case 'T': insertTimestamp(); document.querySelector('[data-tab="notes"]').click(); break;
        case 'n': case 'N': btnNext.click(); break;
        case 'p': case 'P': btnPrev.click(); break;
        case '+': case '=': {
          const cur = parseFloat(speedDisplay.textContent);
          const idx = SPEEDS.indexOf(cur);
          if (idx < SPEEDS.length - 1) { player.playbackRate = SPEEDS[idx+1]; speedDisplay.textContent = SPEEDS[idx+1].toFixed(2)+'x'; }
          break;
        }
        case '-': {
          const cur = parseFloat(speedDisplay.textContent);
          const idx = SPEEDS.indexOf(cur);
          if (idx > 0) { player.playbackRate = SPEEDS[idx-1]; speedDisplay.textContent = SPEEDS[idx-1].toFixed(2)+'x'; }
          break;
        }
      }
    });

    // Controls Elements
    const btnPlayPause = document.getElementById('btnPlayPause');
    const playIcon = document.getElementById('playIcon');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnSkipBack = document.getElementById('btnSkipBack');
    const btnSkipForward = document.getElementById('btnSkipForward');
    const progressBar = document.getElementById('progressBar');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');

    // A-B Loop Elements
    const btnSetA = document.getElementById('btnSetA');
    const btnSetB = document.getElementById('btnSetB');
    const btnToggleLoop = document.getElementById('btnToggleLoop');
    const loopMarkerA = document.getElementById('loopMarkerA');
    const loopMarkerB = document.getElementById('loopMarkerB');
    const loopRange = document.getElementById('loopRange');

    // Speed & Audio Elements
    const speedDisplay = document.getElementById('speedDisplay');
    const speedBtns = document.querySelectorAll('.speed-btn');
    const volumeBar = document.getElementById('volumeBar');
    const btnMute = document.getElementById('btnMute');
    const volumeIcon = document.getElementById('volumeIcon');
      const btnFullscreen = document.getElementById('btnFullscreen');
    const btnClear = document.getElementById('btnClear');

    // Drawer Elements
    const btnToggleInfo = document.getElementById('btnToggleInfo');
    const btnCloseInfo = document.getElementById('btnCloseInfo');
    const infoDrawer = document.getElementById('infoDrawer');

    // Application State
    let playlist = [];
    let currentIndex = -1;
    let currentObjectUrl = null;

    // Looping State
    let loopA = null;
    let loopB = null;
    let isLooping = false;

    // Helper: Show Toast message
    let toastTimeout;
    function showToast(msg) {
      toastMessage.textContent = msg;
      toast.classList.remove('opacity-0');
      toast.classList.add('opacity-100');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
      }, 3000);
    }

    // Helper: Format Time (seconds to MM:SS)
    function formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return "00:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);

      if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // File Selection Handler
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const startIndex = playlist.length;

      files.forEach(file => {
        playlist.push(file);
      });

      renderPlaylist();

      // If nothing is playing, start the first newly added file
      if (currentIndex === -1) {
        playTrack(startIndex);
      }

      showToast(`Added ${files.length} file(s)`);
      // Reset input to allow adding same file again if desired
      fileInput.value = ''; 
    });

    // Render Playlist UI
    function renderPlaylist() {
      if (playlist.length === 0) {
        playlistContainer.innerHTML = '';
        playlistContainer.appendChild(playlistEmpty);
        playlistEmpty.style.display = 'block';
        return;
      }

      playlistEmpty.style.display = 'none';
      playlistContainer.innerHTML = '';

      playlist.forEach((file, index) => {
        const item = document.createElement('div');
        const isActive = index === currentIndex;

        item.className = `p-3 mb-1 rounded-lg cursor-pointer transition flex items-center gap-3 group 
                          ${isActive ? 'active-track' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`;

        // Icon based on type
        const isVideo = file.type.startsWith('video');
        const iconClass = isVideo ? 'ph-video-camera' : 'ph-music-notes';

        item.innerHTML = `
          <div class="w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-slate-700 transition">
            <i class="ph ${iconClass} ${isActive ? 'text-blue-400' : 'text-slate-400'} text-lg"></i>
          </div>
          <div class="flex-1 overflow-hidden">
            <p class="truncate text-sm font-medium ${isActive ? 'text-blue-100' : ''}" title="${file.name}">${file.name}</p>
            <p class="text-xs text-slate-500 mt-0.5">${(file.size / (1024*1024)).toFixed(2)} MB</p>
          </div>
          ${isActive ? '<i class="ph-fill ph-speaker-high text-blue-400 animate-pulse"></i>' : ''}
          <button class="remove-btn text-slate-600 hover:text-red-400 hidden group-hover:block transition" data-index="${index}" title="Remove">
            <i class="ph ph-x"></i>
          </button>
        `;

        item.addEventListener('click', (e) => {
          if(!e.target.closest('.remove-btn')) {
            playTrack(index);
          }
        });

        playlistContainer.appendChild(item);
      });

      // Bind remove buttons
      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeTrack(parseInt(btn.getAttribute('data-index')));
        });
      });
    }

    // Remove Track
    function removeTrack(index) {
      playlist.splice(index, 1);
      if (index === currentIndex) {
        // Removed currently playing track
        player.pause();
        if (playlist.length > 0) {
          // Play next available
          playTrack(index >= playlist.length ? playlist.length - 1 : index);
        } else {
          // Playlist empty
          stopPlayback();
        }
      } else if (index < currentIndex) {
        currentIndex--; // Adjust index since array shifted
      }
      renderPlaylist();
    }

    // Clear Playlist
    btnClear.addEventListener('click', () => {
      playlist = [];
      stopPlayback();
      renderPlaylist();
      showToast('Playlist cleared');
    });

    // Stop Playback completely
    function stopPlayback() {
      player.pause();
      currentIndex = -1;
      player.src = '';
      if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);

      emptyState.classList.remove('hidden');
      player.classList.add('hidden');
      audioVisualizer.classList.add('hidden');

      playIcon.classList.remove('ph-pause');
      playIcon.classList.add('ph-play');

      currentTimeDisplay.textContent = '00:00';
      durationDisplay.textContent = '00:00';
      progressBar.value = 0;

      resetLoop();
    }

    // Play specific track
    function playTrack(index) {
      if (index < 0 || index >= playlist.length) return;

      const file = playlist[index];
      currentIndex = index;

      // Cleanup previous URL to avoid memory leaks
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }

      currentObjectUrl = URL.createObjectURL(file);
      player.src = currentObjectUrl;

      // Restore user set speed
      const speed = parseFloat(speedDisplay.textContent);
      player.playbackRate = speed;

      // UI Updates
      emptyState.classList.add('hidden');

      if (file.type.startsWith('video')) {
        player.classList.remove('hidden');
        audioVisualizer.classList.add('hidden');
        stopVisualizer();
      } else {
        player.classList.add('hidden');
        audioVisualizer.classList.remove('hidden');
        audioVisualizer.classList.add('flex');
        currentAudioTitle.textContent = file.name;
        // Start visualizer after play begins
        player.addEventListener('play', function onPlay() {
          startVisualizer();
          player.removeEventListener('play', onPlay);
        }, { once: true });
      }

      renderPlaylist();
      resetLoop();

      player.play().catch(e => {
        showToast("Error playing file. Format might not be supported by browser.");
        console.error(e);
      });
    }

    // Playback Event Listeners
    player.addEventListener('play', () => {
      playIcon.classList.remove('ph-play');
      playIcon.classList.add('ph-pause');
    });

    player.addEventListener('pause', () => {
      playIcon.classList.remove('ph-pause');
      playIcon.classList.add('ph-play');
    });

    player.addEventListener('loadedmetadata', () => {
      durationDisplay.textContent = formatTime(player.duration);
      progressBar.max = player.duration;
    });

    player.addEventListener('timeupdate', () => {
      if (!player.duration) return;

      // Update progress bar
      progressBar.value = player.currentTime;
      currentTimeDisplay.textContent = formatTime(player.currentTime);

      // A-B Looping Logic
      if (isLooping && loopB !== null && loopA !== null) {
        if (player.currentTime >= loopB) {
          player.currentTime = loopA;
        }
      }
    });

    player.addEventListener('ended', () => {
      // If single file loop is not handled native, go to next
      if (currentIndex < playlist.length - 1) {
        playTrack(currentIndex + 1);
      } else {
        showToast('Playlist finished');
        player.currentTime = 0;
        player.pause();
      }
    });

    // Progress Bar Seeking
    progressBar.addEventListener('input', () => {
      player.currentTime = progressBar.value;
      // If seeking past loop B while loop is active, disable loop to prevent getting stuck
      if(isLooping && loopB !== null && player.currentTime > loopB) {
         isLooping = false;
         updateLoopUI();
         showToast('Loop bypassed');
      }
    });

    // Controls Actions
    btnPlayPause.addEventListener('click', () => {
      if (playlist.length === 0) return;
      if (player.paused) player.play();
      else player.pause();
    });

    btnNext.addEventListener('click', () => {
      if (currentIndex < playlist.length - 1) playTrack(currentIndex + 1);
    });

    btnPrev.addEventListener('click', () => {
      if (player.currentTime > 3) {
        player.currentTime = 0; // Restart track if more than 3s in
      } else if (currentIndex > 0) {
        playTrack(currentIndex - 1); // Go to previous track
      }
    });

    btnSkipForward.addEventListener('click', () => {
      player.currentTime = Math.min(player.currentTime + 10, player.duration || 0);
    });

    btnSkipBack.addEventListener('click', () => {
      player.currentTime = Math.max(player.currentTime - 10, 0);
    });

    // Playback Speed
    speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const speed = parseFloat(e.target.dataset.speed);
        player.playbackRate = speed;
        speedDisplay.textContent = speed.toFixed(2) + 'x';

        // Visual update
        speedBtns.forEach(b => b.classList.remove('text-blue-400', 'font-bold'));
        e.target.classList.add('text-blue-400', 'font-bold');
        showToast(`Speed set to ${speed}x`);
      });
    });

    // Volume Control
    volumeBar.addEventListener('input', () => {
      player.volume = volumeBar.value;
      updateVolumeIcon();
    });

    btnMute.addEventListener('click', () => {
      player.muted = !player.muted;
      updateVolumeIcon();
    });

    function updateVolumeIcon() {
      volumeIcon.className = '';
      if (player.muted || player.volume === 0) {
        volumeIcon.className = 'ph-fill ph-speaker-none text-xl text-red-400';
      } else if (player.volume < 0.5) {
        volumeIcon.className = 'ph-fill ph-speaker-low text-xl';
      } else {
        volumeIcon.className = 'ph-fill ph-speaker-high text-xl';
      }
      if(!player.muted) volumeBar.value = player.volume;
    }

    // Fullscreen (Only functional for video, mostly)
    btnFullscreen.addEventListener('click', () => {
      if (player.classList.contains('hidden')) {
        showToast('Only video supports fullscreen');
        return;
      }

      if (!document.fullscreenElement) {
        if(player.requestFullscreen) {
            player.requestFullscreen();
        } else if(player.webkitRequestFullscreen) { /* Safari */
            player.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    // A-B Looping Functions
    function resetLoop() {
      loopA = null;
      loopB = null;
      isLooping = false;
      updateLoopUI();
    }

    function updateLoopUI() {
      // Toggle button styling
      if (isLooping) {
        btnToggleLoop.classList.add('text-blue-400', 'bg-slate-700');
        btnToggleLoop.classList.remove('text-slate-400');
      } else {
        btnToggleLoop.classList.remove('text-blue-400', 'bg-slate-700');
        btnToggleLoop.classList.add('text-slate-400');
      }

      // Marker A
      if (loopA !== null && player.duration) {
        const pctA = (loopA / player.duration) * 100;
        loopMarkerA.style.left = `${pctA}%`;
        loopMarkerA.classList.remove('hidden');
        btnSetA.classList.add('text-green-400');
      } else {
        loopMarkerA.classList.add('hidden');
        btnSetA.classList.remove('text-green-400');
      }

      // Marker B
      if (loopB !== null && player.duration) {
        const pctB = (loopB / player.duration) * 100;
        loopMarkerB.style.left = `${pctB}%`;
        loopMarkerB.classList.remove('hidden');
        btnSetB.classList.add('text-red-400');
      } else {
        loopMarkerB.classList.add('hidden');
        btnSetB.classList.remove('text-red-400');
      }

      // Range visualizer
      if (loopA !== null && loopB !== null && player.duration) {
        const pctA = (loopA / player.duration) * 100;
        const pctB = (loopB / player.duration) * 100;
        loopRange.style.left = `${pctA}%`;
        loopRange.style.width = `${pctB - pctA}%`;
        loopRange.classList.remove('hidden');
      } else {
        loopRange.classList.add('hidden');
      }
    }

    btnSetA.addEventListener('click', () => {
      if(!player.duration) return;
      loopA = player.currentTime;
      // Ensure A is before B
      if (loopB !== null && loopA >= loopB) {
        loopB = null; 
      }
      isLooping = (loopB !== null); // Auto start loop if both set
      updateLoopUI();
      showToast(`Loop Start set: ${formatTime(loopA)}`);
    });

    btnSetB.addEventListener('click', () => {
      if(!player.duration) return;
      if (loopA !== null && player.currentTime <= loopA) {
        showToast("End point must be after start point");
        return;
      }
      loopB = player.currentTime;

      if(loopA === null) loopA = 0; // Default A to 0 if not set

      isLooping = true;
      updateLoopUI();
      showToast(`Loop active: ${formatTime(loopA)} to ${formatTime(loopB)}`);
    });

    btnToggleLoop.addEventListener('click', () => {
      if (loopA === null && loopB === null) {
        // If no markers set, default to looping the whole track
        player.loop = !player.loop;
        if(player.loop) {
          btnToggleLoop.classList.add('text-blue-400', 'bg-slate-700');
          showToast('Track Loop Enabled');
        } else {
          btnToggleLoop.classList.remove('text-blue-400', 'bg-slate-700');
          showToast('Track Loop Disabled');
        }
        return;
      }

      // Toggle A-B Loop
      isLooping = !isLooping;
      updateLoopUI();
      showToast(isLooping ? 'A-B Loop Enabled' : 'A-B Loop Disabled');
    });

    // Support Drag and Drop files onto entire body
    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
        document.body.classList.add('opacity-80');
    });

    document.body.addEventListener('dragleave', (e) => {
        e.preventDefault();
        document.body.classList.remove('opacity-80');
    });

       document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        document.body.classList.remove('opacity-80');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Assign files to the file input to reuse the same logic
            fileInput.files = e.dataTransfer.files;
            // Trigger change event manually
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });

    // Expandable Info Section Logic
    btnToggleInfo.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = infoDrawer.classList.contains('open');

        if (isOpen) {
            infoDrawer.classList.remove('open');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            infoDrawer.classList.add('open');
            // Allow a tiny delay for the display transition to start before scrolling
            setTimeout(() => {
                infoDrawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    });

    btnCloseInfo.addEventListener('click', () => {
        infoDrawer.classList.remove('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Close drawer when clicking anywhere in the main player area
    document.querySelector('main').addEventListener('click', () => {
        if(infoDrawer.classList.contains('open')) {
            infoDrawer.classList.remove('open');
        }
    });

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
