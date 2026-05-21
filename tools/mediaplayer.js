 // --- APP STATE & MEMORY CONTEXT ---
    let files = []; // Holds arrays of file info metadata + local object URLs
    let currentIdx = -1;
    let bookmarks = {}; // Maps: FileUniqueId -> Array of bookmarks {id, time, text}
    let lastPlayedTimes = {}; // Maps: FileUniqueId -> currentTime (resumes long files!)
    
    // Looping Segment boundaries
    let loopA = null;
    let loopB = null;

    // Web Audio Variables (For Visualizer)
    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let animationFrameId = null;

    // Element Selectors
    const dropzone = document.getElementById('dropzone');
    const mediaInput = document.getElementById('media-input');
    const playerWorkspace = document.getElementById('player-workspace');
    const mainVideo = document.getElementById('main-video');
    const mainAudio = document.getElementById('main-audio');
    const audioVisualizerContainer = document.getElementById('audio-visualizer-container');
    const visualizerCanvas = document.getElementById('visualizer-canvas');
    const visualizerCtx = visualizerCanvas.getContext('2d');
    const audioTrackTitle = document.getElementById('audio-track-title');
    const audioTrackSize = document.getElementById('audio-track-size');
    const audioDisc = document.getElementById('audio-disc');
    const playingFileBadge = document.getElementById('playing-file-badge');
    
    const timeCurrent = document.getElementById('time-current');
    const timeDuration = document.getElementById('time-duration');
    const timeline = document.getElementById('timeline');
    const timelineProgress = document.getElementById('timeline-progress');
    const loopAIndicator = document.getElementById('loop-a-indicator');
    const loopBIndicator = document.getElementById('loop-b-indicator');
    
    // Control Buttons
    const btnPlay = document.getElementById('btn-play');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnBack10 = document.getElementById('btn-back-10');
    const btnForward10 = document.getElementById('btn-forward-10');
    const btnMute = document.getElementById('btn-mute');
    const volumeIconOn = document.getElementById('volume-icon-on');
    const volumeIconOff = document.getElementById('volume-icon-off');
    const volumeSlider = document.getElementById('volume-slider');
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const pipBtn = document.getElementById('pip-btn');
    const addFilesHeaderBtn = document.getElementById('add-files-header-btn');
    
    // A-B Looping Buttons
    const btnLoopA = document.getElementById('btn-loop-a');
    const btnLoopB = document.getElementById('btn-loop-b');
    const btnLoopClear = document.getElementById('btn-loop-clear');

    // Sidebar & Navigation Tabs Elements
    const playlistContainer = document.getElementById('playlist-container');
    const bookmarksContainer = document.getElementById('bookmarks-container');
    const tabPlaylistBtn = document.getElementById('tab-playlist-btn');
    const tabBookmarksBtn = document.getElementById('tab-bookmarks-btn');
    const tabEffectsBtn = document.getElementById('tab-effects-btn');
    const bookmarkForm = document.getElementById('bookmark-form');
    const bookmarkText = document.getElementById('bookmark-text');
    const bookmarkTargetTime = document.getElementById('bookmark-target-time');
    const bookmarkRefreshTime = document.getElementById('bookmark-refresh-time');
    const bookmarksCountLabel = document.getElementById('bookmarks-count');
    const clearPlaylistBtn = document.getElementById('clear-playlist-btn');
    const miniDropzone = document.getElementById('mini-dropzone');

    // Visual Tuners Adjusters
    const filterBrightness = document.getElementById('filter-brightness');
    const filterContrast = document.getElementById('filter-contrast');
    const filterSaturate = document.getElementById('filter-saturate');
    const valBrightness = document.getElementById('val-brightness');
    const valContrast = document.getElementById('val-contrast');
    const valSaturate = document.getElementById('val-saturate');
    const resetFiltersBtn = document.getElementById('reset-filters');

    // Active file reference
    let currentActiveMedia = null; // Can hold either mainVideo or mainAudio element reference

    // --- SETUP MEMORY (Load Local Storage items) ---
    try {
      const savedProgress = localStorage.getItem('omniplay_progress');
      if (savedProgress) lastPlayedTimes = JSON.parse(savedProgress);

      const savedBookmarks = localStorage.getItem('omniplay_bookmarks');
      if (savedBookmarks) bookmarks = JSON.parse(savedBookmarks);
    } catch (e) {
      console.warn("Storage limits or permissions blocked reading local progress.");
    }

    // --- TOAST SYSTEM (Custom alerts) ---
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `p-4 rounded-xl border flex items-center justify-between shadow-2xl transition-all duration-300 transform translate-x-12 opacity-0 text-xs font-semibold backdrop-blur-md pointer-events-auto max-w-sm ${
        type === 'success' 
          ? 'bg-brand-950/90 text-brand-300 border-brand-500/30' 
          : type === 'error'
          ? 'bg-red-950/90 text-red-300 border-red-500/30'
          : 'bg-slate-900/90 text-slate-200 border-slate-800'
      }`;
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full ${type === 'success' ? 'bg-brand-400' : type === 'error' ? 'bg-red-400' : 'bg-slate-400'}"></span>
          <span>${message}</span>
        </div>
        <button class="ml-4 text-slate-400 hover:text-white transition-all">&times;</button>
      `;
      
      const container = document.getElementById('toast-container');
      container.appendChild(toast);

      // Trigger animation
      setTimeout(() => {
        toast.classList.remove('translate-x-12', 'opacity-0');
      }, 50);

      // Dismiss on close click
      toast.querySelector('button').addEventListener('click', () => {
        toast.remove();
      });

      // Auto dismiss after 3s
      setTimeout(() => {
        toast.classList.add('translate-x-12', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    // --- FILE DROPPING / SELECTION INTERFACES ---
    ['dragenter', 'dragover'].forEach(eventName => {
      window.addEventListener(eventName, e => {
        e.preventDefault();
        dropzone.classList.add('border-brand-500/50', 'bg-slate-900/20');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      window.addEventListener(eventName, e => {
        e.preventDefault();
        dropzone.classList.remove('border-brand-500/50', 'bg-slate-900/20');
      }, false);
    });

    window.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      const droppedFiles = Array.from(dt.files);
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    });

    mediaInput.addEventListener('change', e => {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 0) {
        handleFiles(selectedFiles);
      }
    });

    miniDropzone.addEventListener('click', () => {
      mediaInput.click();
    });

    // Handle incoming local files array
    function handleFiles(newFiles) {
      const supportedTypes = ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
      
      const filtered = newFiles.filter(f => {
        const isSupported = supportedTypes.some(type => f.type.includes(type)) || 
                            f.name.endsWith('.mp3') || 
                            f.name.endsWith('.mp4') ||
                            f.name.endsWith('.webm') ||
                            f.name.endsWith('.wav');
        return isSupported;
      });

      if (filtered.length === 0) {
        showToast("No supported MP3/MP4/WebM files detected.", "error");
        return;
      }

      const initialCount = files.length;

      filtered.forEach(file => {
        // Build a unique tracking string derived from metadata
        const fileId = `${file.name}_${file.size}`;
        
        // Prevent duplicate loads
        if (files.some(f => f.id === fileId)) return;

        // Generate dynamic secure local blob URL
        const objectUrl = URL.createObjectURL(file);

        files.push({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type.startsWith('video') ? 'video' : 'audio',
          url: objectUrl,
          fileObject: file
        });
      });

      if (files.length > 0) {
        dropzone.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          dropzone.classList.add('hidden');
          playerWorkspace.classList.remove('hidden');
          addFilesHeaderBtn.classList.remove('hidden');
        }, 300);

        renderPlaylist();
        
        // Auto-play the first newly added item if nothing was active
        if (currentIdx === -1) {
          playMediaAtIndex(initialCount);
        }
        
        showToast(`Added ${filtered.length} media file(s) successfully.`, "success");
      }
    }

    // --- RECYCLING / MEMORY CONTEXT RELEASES ---
    function cleanUpObjectUrls() {
      files.forEach(f => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
      files = [];
      currentIdx = -1;
    }

    // --- PLAYLIST RENDERER ---
    function renderPlaylist() {
      playlistContainer.innerHTML = '';
      
      if (files.length === 0) {
        playlistContainer.innerHTML = `
          <div class="text-center p-6 text-xs text-slate-500">
            No items in queue. Load more using the button above.
          </div>
        `;
        return;
      }

      files.forEach((file, idx) => {
        const isActive = idx === currentIdx;
        const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        
        const item = document.createElement('div');
        item.className = `p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all duration-200 group ${
          isActive 
            ? 'bg-brand-600/15 border-brand-500/50 text-white' 
            : 'bg-slate-900/30 border-slate-900/60 hover:bg-slate-900/60 hover:border-slate-800 text-slate-300'
        }`;

        // Truncate strings to match aesthetic grid
        item.innerHTML = `
          <div class="flex items-start gap-2.5 max-w-[85%]">
            <span class="mt-0.5 p-1 rounded-lg ${isActive ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-400'}">
              ${file.type === 'video' 
                ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>` 
                : `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>`
              }
            </span>
            <div class="overflow-hidden">
              <p class="text-xs font-semibold leading-snug truncate ${isActive ? 'text-brand-300' : 'text-slate-200'}">${file.name}</p>
              <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                <span>${sizeFormatted}</span>
                <span>•</span>
                <span class="font-mono text-brand-400/95" id="resume-badge-${file.id}"></span>
              </div>
            </div>
          </div>
          <button class="remove-queue-btn text-slate-500 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" data-idx="${idx}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        `;

        // Direct Item Click
        item.addEventListener('click', e => {
          if (e.target.closest('.remove-queue-btn')) return;
          playMediaAtIndex(idx);
        });

        playlistContainer.appendChild(item);

        // Update UI helper showing if resume progress is saved for this item
        const fileId = file.id;
        if (lastPlayedTimes[fileId] && lastPlayedTimes[fileId] > 3) {
          const badge = document.getElementById(`resume-badge-${fileId}`);
          if (badge) {
            badge.innerText = `Resume progress saved`;
          }
        }
      });
    }

    // --- CORE PLAYER LOGIC ---
    function playMediaAtIndex(index) {
      if (index < 0 || index >= files.length) return;
      
      // Save current file's position before switching
      saveCurrentPlaybackProgress();

      currentIdx = index;
      const file = files[currentIdx];

      // Reset looping markers
      clearABLoop();

      // Pause both elements
      mainVideo.pause();
      mainAudio.pause();

      // Clear any previous audio visualization hookup
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Hide both interfaces initially
      mainVideo.classList.add('hidden');
      audioVisualizerContainer.classList.add('hidden');
      pipBtn.classList.add('hidden');

      playingFileBadge.innerText = file.name;
      
      if (file.type === 'video') {
        currentActiveMedia = mainVideo;
        mainVideo.src = file.url;
        mainVideo.classList.remove('hidden');
        pipBtn.classList.remove('hidden');
      } else {
        currentActiveMedia = mainAudio;
        mainAudio.src = file.url;
        
        // Setup Visualizer info
        audioTrackTitle.innerText = file.name;
        audioTrackSize.innerText = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        audioVisualizerContainer.classList.remove('hidden');
        
        setupAudioVisualizer();
      }

      // Restore parameters
      currentActiveMedia.playbackRate = parseFloat(speedSlider.value);
      currentActiveMedia.volume = parseFloat(volumeSlider.value);
      currentActiveMedia.muted = volumeIconOn.classList.contains('hidden');

      // Update Playlist Sidebar styles
      renderPlaylist();

      // Attach event hooks
      currentActiveMedia.onloadedmetadata = () => {
        timeline.max = currentActiveMedia.duration;
        timeDuration.innerText = formatTime(currentActiveMedia.duration);
        
        // Resume long playback logic
        const savedTime = lastPlayedTimes[file.id];
        if (savedTime && savedTime < currentActiveMedia.duration - 5) {
          currentActiveMedia.currentTime = savedTime;
          showToast(`Resumed lecture at ${formatTime(savedTime)}`, "info");
        } else {
          currentActiveMedia.currentTime = 0;
        }

        // Initialize Bookmarks UI panel
        updateBookmarksUI();
        updateTimeUI();
      };

      currentActiveMedia.ontimeupdate = () => {
        updateTimeUI();
        handleLoopCheck();
        
        // Intermittently store playback progress
        if (Math.round(currentActiveMedia.currentTime) % 3 === 0) {
          saveCurrentPlaybackProgress();
        }
      };

      currentActiveMedia.onended = () => {
        // Clear progress from storage upon natural termination
        delete lastPlayedTimes[file.id];
        saveProgressToLocalStorage();
        
        // Play next automatically
        if (currentIdx + 1 < files.length) {
          playMediaAtIndex(currentIdx + 1);
          showToast("Playing next track in queue", "info");
        } else {
          togglePlaybackState(false);
        }
      };

      // Trigger actual system playback
      currentActiveMedia.play()
        .then(() => {
          togglePlaybackState(true);
        })
        .catch(err => {
          console.error("Playback interrupted or blocked.", err);
          togglePlaybackState(false);
        });
    }

    // Update Progress Tracking and Save to Local Storage
    function saveCurrentPlaybackProgress() {
      if (currentIdx !== -1 && currentActiveMedia) {
        const file = files[currentIdx];
        if (currentActiveMedia.currentTime > 2) {
          lastPlayedTimes[file.id] = currentActiveMedia.currentTime;
        } else {
          delete lastPlayedTimes[file.id];
        }
        saveProgressToLocalStorage();
      }
    }

    function saveProgressToLocalStorage() {
      try {
        localStorage.setItem('omniplay_progress', JSON.stringify(lastPlayedTimes));
      } catch (e) {
        console.warn("Could not save playback state locally.");
      }
    }

    // Playback state synchronization (UI & Elements state)
    function togglePlaybackState(shouldPlay) {
      if (!currentActiveMedia) return;

      if (shouldPlay) {
        currentActiveMedia.play().catch(() => {});
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        audioDisc.classList.add('animate-spin');
      } else {
        currentActiveMedia.pause();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        audioDisc.classList.remove('animate-spin');
      }
    }

    // Play/Pause toggler
    btnPlay.addEventListener('click', () => {
      if (!currentActiveMedia) return;
      const isPaused = currentActiveMedia.paused;
      togglePlaybackState(isPaused);
    });

    // Seek / Timeline updates
    timeline.addEventListener('input', () => {
      if (!currentActiveMedia) return;
      currentActiveMedia.currentTime = timeline.value;
      updateTimeUI();
    });

    function updateTimeUI() {
      if (!currentActiveMedia) return;
      
      const curr = currentActiveMedia.currentTime;
      const dur = currentActiveMedia.duration || 0;
      
      timeline.value = curr;
      timeCurrent.innerText = formatTime(curr);
      
      // Calculate progress percentage
      const pct = (curr / (dur || 1)) * 100;
      timelineProgress.style.width = `${pct}%`;
    }

    // Back & Forward skip commands
    btnBack10.addEventListener('click', () => {
      adjustCurrentTime(-10);
    });
    btnForward10.addEventListener('click', () => {
      adjustCurrentTime(10);
    });

    function adjustCurrentTime(secs) {
      if (!currentActiveMedia) return;
      let target = currentActiveMedia.currentTime + secs;
      if (target < 0) target = 0;
      if (target > currentActiveMedia.duration) target = currentActiveMedia.duration;
      currentActiveMedia.currentTime = target;
      updateTimeUI();
    }

    // Custom offset skip presets
    document.querySelectorAll('.skip-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const offset = parseInt(btn.getAttribute('data-skip'));
        adjustCurrentTime(offset);
      });
    });

    // Prev / Next Queues
    btnPrev.addEventListener('click', () => {
      if (currentIdx > 0) {
        playMediaAtIndex(currentIdx - 1);
      } else {
        showToast("Already at beginning of queue", "info");
      }
    });

    btnNext.addEventListener('click', () => {
      if (currentIdx + 1 < files.length) {
        playMediaAtIndex(currentIdx + 1);
      } else {
        showToast("No remaining files in queue", "info");
      }
    });

    // Volume Adjustment
    volumeSlider.addEventListener('input', () => {
      if (!currentActiveMedia) return;
      const vol = parseFloat(volumeSlider.value);
      currentActiveMedia.volume = vol;
      
      if (vol === 0) {
        currentActiveMedia.muted = true;
        volumeIconOn.classList.add('hidden');
        volumeIconOff.classList.remove('hidden');
      } else {
        currentActiveMedia.muted = false;
        volumeIconOn.classList.remove('hidden');
        volumeIconOff.classList.add('hidden');
      }
    });

    btnMute.addEventListener('click', () => {
      if (!currentActiveMedia) return;
      const isMuted = !currentActiveMedia.muted;
      currentActiveMedia.muted = isMuted;

      if (isMuted) {
        volumeIconOn.classList.add('hidden');
        volumeIconOff.classList.remove('hidden');
      } else {
        volumeIconOn.classList.remove('hidden');
        volumeIconOff.classList.add('hidden');
      }
    });

    // Playback Speed Slider & Presets
    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      speedVal.innerText = `${speed.toFixed(2)}x`;
      if (currentActiveMedia) {
        currentActiveMedia.playbackRate = speed;
      }
    });

    document.querySelectorAll('.speed-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        speedSlider.value = speed;
        speedVal.innerText = `${speed.toFixed(2)}x`;
        if (currentActiveMedia) {
          currentActiveMedia.playbackRate = speed;
        }
      });
    });

    // Time Formatter
    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      
      if (h > 0) {
        return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      }
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // --- A-B LOOP SYSTEM ---
    btnLoopA.addEventListener('click', () => {
      if (!currentActiveMedia) return;
      loopA = currentActiveMedia.currentTime;
      loopAIndicator.innerText = `[A: ${formatTime(loopA)}]`;
      loopAIndicator.classList.remove('hidden');
      btnLoopClear.classList.remove('hidden');
      showToast(`Loop Start [A] marked at ${formatTime(loopA)}`, "info");
    });

    btnLoopB.addEventListener('click', () => {
      if (!currentActiveMedia) return;
      if (loopA === null) {
        showToast("Define Loop Start [A] first!", "error");
        return;
      }
      if (currentActiveMedia.currentTime <= loopA) {
        showToast("Loop end must be strictly after starting point.", "error");
        return;
      }
      loopB = currentActiveMedia.currentTime;
      loopBIndicator.innerText = `[B: ${formatTime(loopB)}]`;
      loopBIndicator.classList.remove('hidden');
      btnLoopClear.classList.remove('hidden');
      showToast(`Loop Segment [A-B] established.`, "success");
    });

    btnLoopClear.addEventListener('click', () => {
      clearABLoop();
      showToast("Loop boundaries discarded.", "info");
    });

    function clearABLoop() {
      loopA = null;
      loopB = null;
      loopAIndicator.classList.add('hidden');
      loopBIndicator.classList.add('hidden');
      btnLoopClear.classList.add('hidden');
    }

    function handleLoopCheck() {
      if (!currentActiveMedia) return;
      if (loopA !== null && loopB !== null) {
        if (currentActiveMedia.currentTime >= loopB || currentActiveMedia.currentTime < loopA) {
          currentActiveMedia.currentTime = loopA;
          updateTimeUI();
        }
      }
    }

    // --- BOOKMARKS & COLLABORATIVE MEMORY NOTES ---
    bookmarkForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!currentActiveMedia || currentIdx === -1) {
        showToast("No active track is currently rendering.", "error");
        return;
      }

      const file = files[currentIdx];
      const time = currentActiveMedia.currentTime;
      const note = bookmarkText.value.trim();

      if (!bookmarks[file.id]) {
        bookmarks[file.id] = [];
      }

      bookmarks[file.id].push({
        id: crypto.randomUUID(),
        time: time,
        note: note
      });

      // Sort chronological order
      bookmarks[file.id].sort((a, b) => a.time - b.time);

      // Save to local storage
      try {
        localStorage.setItem('omniplay_bookmarks', JSON.stringify(bookmarks));
      } catch (err) {
        console.warn("Failed saving bookmarks persistent context.");
      }

      bookmarkText.value = '';
      updateBookmarksUI();
      showToast(`Timestamp note logged at ${formatTime(time)}`, "success");
    });

    bookmarkRefreshTime.addEventListener('click', () => {
      if (currentActiveMedia) {
        bookmarkTargetTime.innerText = formatTime(currentActiveMedia.currentTime);
      }
    });

    function updateBookmarksUI() {
      bookmarksContainer.innerHTML = '';
      if (currentIdx === -1) return;

      const file = files[currentIdx];
      const activeBookmarks = bookmarks[file.id] || [];

      bookmarksCountLabel.innerText = `${activeBookmarks.length} markers`;
      bookmarkTargetTime.innerText = currentActiveMedia ? formatTime(currentActiveMedia.currentTime) : "0:00";

      if (activeBookmarks.length === 0) {
        bookmarksContainer.innerHTML = `
          <div class="text-center p-6 text-xs text-slate-500 bg-slate-900/10 rounded-xl border border-slate-900/60">
            No bookmarks created yet. Write down key lessons or parts of audio and pin them.
          </div>
        `;
        return;
      }

      activeBookmarks.forEach(bk => {
        const item = document.createElement('div');
        item.className = "flex items-start justify-between bg-slate-900/40 hover:bg-slate-900/70 border border-slate-900/70 p-3 rounded-xl gap-2 group transition-all";
        item.innerHTML = `
          <div class="flex-1 cursor-pointer" onclick="jumpToBookmark(${bk.time})">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                ${formatTime(bk.time)}
              </span>
            </div>
            <p class="text-xs text-slate-200 mt-1.5 font-medium break-all">${bk.note}</p>
          </div>
          <button class="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" onclick="deleteBookmark('${bk.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" /></svg>
          </button>
        `;
        bookmarksContainer.appendChild(item);
      });
    }

    // Global jumpers
    window.jumpToBookmark = function(time) {
      if (currentActiveMedia) {
        currentActiveMedia.currentTime = time;
        updateTimeUI();
        togglePlaybackState(true);
        showToast(`Jumped to landmark: ${formatTime(time)}`, "info");
      }
    };

    window.deleteBookmark = function(bkId) {
      if (currentIdx === -1) return;
      const file = files[currentIdx];
      if (bookmarks[file.id]) {
        bookmarks[file.id] = bookmarks[file.id].filter(bk => bk.id !== bkId);
        
        try {
          localStorage.setItem('omniplay_bookmarks', JSON.stringify(bookmarks));
        } catch (err) {
          console.warn(err);
        }

        updateBookmarksUI();
        showToast("Marker removed", "info");
      }
    };

    // --- REMOVE FILE FROM QUEUE ---
    playlistContainer.addEventListener('click', e => {
      const removeBtn = e.target.closest('.remove-queue-btn');
      if (removeBtn) {
        const removeIdx = parseInt(removeBtn.getAttribute('data-idx'));
        removeFileFromQueue(removeIdx);
      }
    });

    function removeFileFromQueue(idx) {
      if (idx < 0 || idx >= files.length) return;
      
      const fileToRemove = files[idx];
      
      // Revoke the Blob object URL to free up system memory
      URL.revokeObjectURL(fileToRemove.url);

      files.splice(idx, 1);

      if (idx === currentIdx) {
        // We removed the active playing item
        mainVideo.pause();
        mainAudio.pause();
        currentActiveMedia = null;
        
        if (files.length > 0) {
          // Play next or wrap around to start
          const nextIndex = idx >= files.length ? files.length - 1 : idx;
          playMediaAtIndex(nextIndex);
        } else {
          // Reset workspace layout
          currentIdx = -1;
          playerWorkspace.classList.add('hidden');
          addFilesHeaderBtn.classList.add('hidden');
          dropzone.classList.remove('hidden');
          setTimeout(() => {
            dropzone.classList.remove('opacity-0', 'pointer-events-none');
          }, 50);
        }
      } else {
        // Adjust the index pointers
        if (idx < currentIdx) {
          currentIdx--;
        }
        renderPlaylist();
      }
      showToast("File removed from list", "info");
    }

    // Clear whole queue helper
    clearPlaylistBtn.addEventListener('click', () => {
      cleanUpObjectUrls();
      
      mainVideo.pause();
      mainAudio.pause();
      currentActiveMedia = null;

      playerWorkspace.classList.add('hidden');
      addFilesHeaderBtn.classList.add('hidden');
      dropzone.classList.remove('hidden');
      setTimeout(() => {
        dropzone.classList.remove('opacity-0', 'pointer-events-none');
      }, 50);

      showToast("Queue cleared", "info");
    });

    addFilesHeaderBtn.addEventListener('click', () => {
      mediaInput.click();
    });


    // --- TAB SWITCHER LOGIC ---
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Update Buttons Styling
        document.querySelectorAll('.sidebar-tab-btn').forEach(b => {
          b.className = "sidebar-tab-btn py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-slate-200";
        });
        btn.className = "sidebar-tab-btn py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all text-brand-400 bg-slate-900 border border-slate-800";

        // Show/Hide divs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
          tab.classList.add('hidden');
        });
        document.getElementById(tabId).classList.remove('hidden');
      });
    });


    // --- VISUAL AUDIO TUNER FILTERS ---
    function updateVideoFilters() {
      const brightness = filterBrightness.value;
      const contrast = filterContrast.value;
      const saturate = filterSaturate.value;

      valBrightness.innerText = `${brightness}%`;
      valContrast.innerText = `${contrast}%`;
      valSaturate.innerText = `${saturate}%`;

      mainVideo.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
    }

    [filterBrightness, filterContrast, filterSaturate].forEach(slider => {
      slider.addEventListener('input', updateVideoFilters);
    });

    document.querySelectorAll('.fit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active', 'border-brand-500', 'text-brand-400'));
        btn.classList.add('active', 'border-brand-500', 'text-brand-400');
        
        const fit = btn.getAttribute('data-fit');
        mainVideo.style.objectFit = fit;
      });
    });

    document.querySelectorAll('.rotate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rotate-btn').forEach(b => b.classList.remove('border-brand-500', 'text-brand-400'));
        btn.classList.add('border-brand-500', 'text-brand-400');
        
        const deg = btn.getAttribute('data-deg');
        mainVideo.style.transform = `rotate(${deg}deg)`;
      });
    });

    resetFiltersBtn.addEventListener('click', () => {
      filterBrightness.value = 100;
      filterContrast.value = 100;
      filterSaturate.value = 100;
      mainVideo.style.transform = `rotate(0deg)`;
      mainVideo.style.objectFit = 'contain';
      
      // Reset button boundaries border-accent indicators
      document.querySelectorAll('.fit-btn').forEach(b => {
        b.classList.remove('border-brand-500', 'text-brand-400');
        if (b.getAttribute('data-fit') === 'contain') b.classList.add('border-brand-500', 'text-brand-400');
      });

      document.querySelectorAll('.rotate-btn').forEach(b => {
        b.classList.remove('border-brand-500', 'text-brand-400');
        if (b.getAttribute('data-deg') === '0') b.classList.add('border-brand-500', 'text-brand-400');
      });

      updateVideoFilters();
      showToast("Reset filters successfully.", "info");
    });


    // --- PREMIUM WEB AUDIO API VISUALIZER WAVEFORM ---
    function setupAudioVisualizer() {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Re-route if browser context was suspended by active policies
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        if (!analyser) {
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          
          // Connect hidden native audio element to visualizer engine
          sourceNode = audioCtx.createMediaElementSource(mainAudio);
          sourceNode.connect(analyser);
          analyser.connect(audioCtx.destination);
        }

        drawVisualizerFrame();
      } catch (e) {
        console.warn("AudioContext setup failed, browser permission or direct routing block.", e);
      }
    }

    function drawVisualizerFrame() {
      if (!analyser) return;

      animationFrameId = requestAnimationFrame(drawVisualizerFrame);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Keep responsive sizing of canvas bounds
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = visualizerCanvas.parentElement.clientWidth;
      const displayHeight = 160;
      
      if (visualizerCanvas.width !== displayWidth * dpr || visualizerCanvas.height !== displayHeight * dpr) {
        visualizerCanvas.width = displayWidth * dpr;
        visualizerCanvas.height = displayHeight * dpr;
        visualizerCtx.scale(dpr, dpr);
      }

      const width = displayWidth;
      const height = displayHeight;

      visualizerCtx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.6;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;

        // Custom Neon Gradient styling
        const gradient = visualizerCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#a78bfa'); // Purple neon top
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');

        visualizerCtx.fillStyle = gradient;
        
        // Rounded bars
        const radius = barWidth / 2;
        visualizerCtx.beginPath();
        visualizerCtx.roundRect(x, height - barHeight, barWidth - 1.5, barHeight, [radius, radius, 0, 0]);
        visualizerCtx.fill();

        x += barWidth;
      }
    }


    // --- NATIVE PICTURE IN PICTURE & FULLSCREEN API ---
    pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (mainVideo.readyState >= 1) {
          await mainVideo.requestPictureInPicture();
        }
      } catch (err) {
        showToast("Picture-in-Picture not supported on this device/browser.", "error");
      }
    });

    btnFullscreen.addEventListener('click', () => {
      toggleFullscreen();
    });

    function toggleFullscreen() {
      const container = document.getElementById('player-workspace');
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          showToast(`Error going fullscreen: ${err.message}`, "error");
        });
      } else {
        document.exitFullscreen();
      }
    }


    // --- GLOBAL KEYBOARD ACCESSIBILITY AND SHIFT COMMANDS ---
    window.addEventListener('keydown', e => {
      // Discard triggers inside bookmark text logs inputs
      if (document.activeElement.tagName === 'INPUT') return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          if (currentActiveMedia) {
            togglePlaybackState(currentActiveMedia.paused);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          adjustCurrentTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          adjustCurrentTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          let nextVolUp = Math.min(1, parseFloat(volumeSlider.value) + 0.05);
          volumeSlider.value = nextVolUp;
          volumeSlider.dispatchEvent(new Event('input'));
          break;
        case 'ArrowDown':
          e.preventDefault();
          let nextVolDown = Math.max(0, parseFloat(volumeSlider.value) - 0.05);
          volumeSlider.value = nextVolDown;
          volumeSlider.dispatchEvent(new Event('input'));
          break;
        case 'KeyM':
          btnMute.click();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'BracketLeft':
          // Decrease playback rate
          let currentSpeedDec = Math.max(0.25, parseFloat(speedSlider.value) - 0.1);
          speedSlider.value = currentSpeedDec;
          speedSlider.dispatchEvent(new Event('input'));
          break;
        case 'BracketRight':
          // Increase playback rate
          let currentSpeedInc = Math.min(4.0, parseFloat(speedSlider.value) + 0.1);
          speedSlider.value = currentSpeedInc;
          speedSlider.dispatchEvent(new Event('input'));
          break;
      }
    });
