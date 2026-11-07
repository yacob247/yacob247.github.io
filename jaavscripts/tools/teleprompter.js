(() => {
      const els = {
        scriptInput: document.getElementById("scriptInput"),
        fileInput: document.getElementById("fileInput"),
        loadBtn: document.getElementById("loadBtn"),
        sampleBtn: document.getElementById("sampleBtn"),
        clearBtn: document.getElementById("clearBtn"),
        voiceSelect: document.getElementById("voiceSelect"),
        rateRange: document.getElementById("rateRange"),
        rateValue: document.getElementById("rateValue"),
        fontRange: document.getElementById("fontRange"),
        fontValue: document.getElementById("fontValue"),
        playBtn: document.getElementById("playBtn"),
        pauseBtn: document.getElementById("pauseBtn"),
        stopBtn: document.getElementById("stopBtn"),
        resetBtn: document.getElementById("resetBtn"),
        lightBtn: document.getElementById("lightBtn"),
        darkBtn: document.getElementById("darkBtn"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        fullscreenBtn2: document.getElementById("fullscreenBtn2"),
        loadRecordingBtn: document.getElementById("loadRecordingBtn"),
        audioInput: document.getElementById("audioInput"),
        recordedAudio: document.getElementById("recordedAudio"),
        libraryAudioList: document.getElementById("libraryAudioList"),
        audioStatus: document.getElementById("audioStatus"),
        readerShell: document.getElementById("readerShell"),
        readerCard: document.getElementById("readerCard"),
        prompterText: document.getElementById("prompterText"),
        statusText: document.getElementById("statusText")
      };

      const sampleText = `Good morning team.

Today we are introducing a cleaner teleprompter workflow for company videos, training scripts, announcements, and recorded presentations.

The page is intentionally simple. Load your script, choose the voice and speed, then press play. The active spoken word turns blue and the text scrolls with the reader.`;

      const dbName = "envizion-voice-studio";
      const storeName = "recordings";
      const state = {
        text: "",
        words: [],
        spans: [],
        voices: [],
        activeWord: -1,
        chunks: [],
        paused: false
      };

      function setStatus(message) {
        els.statusText.textContent = message;
      }

      function escapeHtml(value) {
        return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      function renderText(value) {
        stopSpeech();
        const text = value.trim();
        state.text = text;
        state.words = [];
        state.spans = [];
        state.activeWord = -1;

        if (!text) {
          els.prompterText.textContent = "Paste your script, press Load, then Play. Fullscreen shows only this bordered text box with large readable type.";
          setStatus("Load a script to begin.");
          saveSettings();
          return;
        }

        let html = "";
        const pattern = /\S+|\s+/g;
        let match;
        while ((match = pattern.exec(text))) {
          const token = match[0];
          if (/\s+/.test(token)) {
            html += escapeHtml(token);
          } else {
            const index = state.words.length;
            state.words.push({ start: match.index, end: match.index + token.length });
            html += `<span class="word" data-index="${index}">${escapeHtml(token)}</span>`;
          }
        }

        els.prompterText.innerHTML = html;
        state.spans = Array.from(els.prompterText.querySelectorAll(".word"));
        els.readerCard.scrollTop = 0;
        setStatus(`${state.words.length} words ready.`);
        saveSettings();
      }

      function readFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || "");
          const text = /\.html?$/i.test(file.name)
            ? new DOMParser().parseFromString(raw, "text/html").body.textContent
            : raw;
          els.scriptInput.value = text.trim();
          renderText(els.scriptInput.value);
        };
        reader.readAsText(file);
      }

      function loadVoices() {
        if (!("speechSynthesis" in window)) {
          els.voiceSelect.innerHTML = "<option>Speech is unavailable</option>";
          return;
        }

        state.voices = speechSynthesis.getVoices();
        els.voiceSelect.innerHTML = "";
        if (!state.voices.length) {
          els.voiceSelect.innerHTML = "<option value=''>Default voice</option>";
          return;
        }

        state.voices
          .slice()
          .sort((a, b) => Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name))
          .forEach((voice) => {
            const option = document.createElement("option");
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            els.voiceSelect.appendChild(option);
          });

        const savedVoice = localStorage.getItem("envizionTeleprompterVoice");
        if (savedVoice) els.voiceSelect.value = savedVoice;
      }

      function selectedVoice() {
        return state.voices.find((voice) => voice.voiceURI === els.voiceSelect.value) || null;
      }

      function updateControls() {
        document.documentElement.style.setProperty("--reader-font", `${els.fontRange.value}px`);
        els.fontValue.textContent = `${els.fontRange.value} px`;
        els.rateValue.textContent = `${Number(els.rateRange.value).toFixed(2)}x`;
        saveSettings();
      }

      function makeChunks(text) {
        const chunks = [];
        let buffer = "";
        let start = 0;
        for (const match of text.matchAll(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g)) {
          const part = match[0];
          if (!buffer) start = match.index;
          if ((buffer + part).length > 850 && buffer) {
            chunks.push({ text: buffer, start });
            buffer = part;
            start = match.index;
          } else {
            buffer += part;
          }
        }
        if (buffer) chunks.push({ text: buffer, start });
        return chunks.length ? chunks : [{ text, start: 0 }];
      }

      function findWord(charIndex) {
        let low = 0;
        let high = state.words.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const word = state.words[mid];
          if (charIndex < word.start) high = mid - 1;
          else if (charIndex >= word.end) low = mid + 1;
          else return mid;
        }
        return Math.max(0, Math.min(low, state.words.length - 1));
      }

      function activateWord(index) {
        if (index === state.activeWord || !state.spans[index]) return;
        if (state.spans[state.activeWord]) state.spans[state.activeWord].classList.remove("active");
        state.activeWord = index;
        state.spans[index].classList.add("active");
        state.spans[index].scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }

      function speakChunk(index) {
        if (index >= state.chunks.length) {
          state.paused = false;
          setStatus("Finished.");
          return;
        }

        const chunk = state.chunks[index];
        const utterance = new SpeechSynthesisUtterance(chunk.text);
        const voice = selectedVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = Number(els.rateRange.value);
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onboundary = (event) => {
          if (typeof event.charIndex === "number") activateWord(findWord(chunk.start + event.charIndex));
        };
        utterance.onend = () => {
          if (!state.paused) speakChunk(index + 1);
        };
        utterance.onerror = () => setStatus("Voice playback stopped.");
        speechSynthesis.speak(utterance);
      }

      function play() {
        if (!("speechSynthesis" in window)) return setStatus("Speech is unavailable in this browser.");
        if (!state.text) renderText(els.scriptInput.value);
        if (!state.text) return;

        if (speechSynthesis.paused) {
          state.paused = false;
          speechSynthesis.resume();
          setStatus("Reading.");
          return;
        }

        stopSpeech(false);
        state.paused = false;
        state.chunks = makeChunks(state.text);
        setStatus("Reading.");
        speakChunk(0);
      }

      function pause() {
        if (!("speechSynthesis" in window)) return;
        state.paused = true;
        speechSynthesis.pause();
        setStatus("Paused.");
      }

      function stopSpeech(resetActive = true) {
        state.paused = false;
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        if (resetActive) {
          state.spans.forEach((span) => span.classList.remove("active"));
          state.activeWord = -1;
        }
      }

      function resetReader() {
        stopSpeech();
        els.readerCard.scrollTop = 0;
        setStatus(state.text ? `${state.words.length} words ready.` : "Load a script to begin.");
      }

      function setTheme(theme) {
        document.body.classList.toggle("dark", theme === "dark");
        els.lightBtn.classList.toggle("primary", theme === "light");
        els.darkBtn.classList.toggle("primary", theme === "dark");
        localStorage.setItem("envizionTeleprompterTheme", theme);
      }

      function openFullscreen() {
        if (!document.fullscreenElement && els.readerShell.requestFullscreen) {
          els.readerShell.requestFullscreen().then(() => els.readerCard.focus()).catch(() => setStatus("Fullscreen was blocked."));
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }

      function openDb() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName, 1);
          request.onupgradeneeded = () => request.result.createObjectStore(storeName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function getRecording() {
        const db = await openDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, "readonly");
          const request = tx.objectStore(storeName).get("latest");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function importLatestRecording() {
        try {
          const record = await getRecording();
          if (!record || !record.blob) {
            els.audioStatus.textContent = "No saved recorder audio found yet.";
            return;
          }
          els.recordedAudio.src = URL.createObjectURL(record.blob);
          els.audioStatus.textContent = `Imported ${record.name || "latest recording"}.`;
        } catch {
          els.audioStatus.textContent = "Could not import the latest recording.";
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

      async function importTeleprompterLibraryExport() {
        try {
          const db = await openMediaLibraryDb();
          const record = await new Promise((resolve, reject) => {
            const tx = db.transaction("exports", "readonly");
            const request = tx.objectStore("exports").get("teleprompter");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          if (!record || !record.files || !record.files.length) return;
          els.libraryAudioList.innerHTML = "";
          record.files.forEach((file) => {
            const wrap = document.createElement("div");
            wrap.style.marginTop = "0.7rem";
            wrap.innerHTML = `<p class="hint">${file.name}</p>`;
            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = URL.createObjectURL(file.blob);
            wrap.appendChild(audio);
            els.libraryAudioList.appendChild(wrap);
          });
          els.recordedAudio.src = URL.createObjectURL(record.files[0].blob);
          els.audioStatus.textContent = `Imported ${record.files.length} file(s) from Audio Library.`;
        } catch {
          els.audioStatus.textContent = "Open the recorder, save the edit, then import it here.";
        }
      }

      function importAudioFile(file) {
        if (!file) return;
        els.recordedAudio.src = URL.createObjectURL(file);
        els.audioStatus.textContent = `Imported ${file.name}.`;
      }

      function saveSettings() {
        localStorage.setItem("envizionTeleprompterSimple", JSON.stringify({
          script: els.scriptInput.value,
          rate: els.rateRange.value,
          font: els.fontRange.value
        }));
        localStorage.setItem("envizionTeleprompterVoice", els.voiceSelect.value);
      }

      function restoreSettings() {
        try {
          const data = JSON.parse(localStorage.getItem("envizionTeleprompterSimple") || "{}");
          if (data.script) els.scriptInput.value = data.script;
          if (data.rate) els.rateRange.value = data.rate;
          if (data.font) els.fontRange.value = data.font;
          updateControls();
          if (data.script) renderText(data.script);
        } catch {
          updateControls();
        }
        setTheme(localStorage.getItem("envizionTeleprompterTheme") || "light");
      }

      els.loadBtn.addEventListener("click", () => renderText(els.scriptInput.value));
      els.sampleBtn.addEventListener("click", () => {
        els.scriptInput.value = sampleText;
        renderText(sampleText);
      });
      els.clearBtn.addEventListener("click", () => {
        els.scriptInput.value = "";
        renderText("");
      });
      els.fileInput.addEventListener("change", () => readFile(els.fileInput.files[0]));
      els.voiceSelect.addEventListener("change", saveSettings);
      els.rateRange.addEventListener("input", updateControls);
      els.fontRange.addEventListener("input", updateControls);
      els.playBtn.addEventListener("click", play);
      els.pauseBtn.addEventListener("click", pause);
      els.stopBtn.addEventListener("click", () => {
        stopSpeech();
        setStatus("Stopped.");
      });
      els.resetBtn.addEventListener("click", resetReader);
      els.lightBtn.addEventListener("click", () => setTheme("light"));
      els.darkBtn.addEventListener("click", () => setTheme("dark"));
      els.fullscreenBtn.addEventListener("click", openFullscreen);
      els.fullscreenBtn2.addEventListener("click", openFullscreen);
      els.loadRecordingBtn.addEventListener("click", importLatestRecording);
      els.audioInput.addEventListener("change", () => importAudioFile(els.audioInput.files[0]));

      els.readerCard.addEventListener("click", () => {
        if (!document.fullscreenElement) return;
        if ("speechSynthesis" in window && speechSynthesis.speaking && !speechSynthesis.paused) pause();
        else play();
      });

      document.addEventListener("keydown", (event) => {
        if (event.target.matches("textarea,input,select")) return;
        if (event.code === "Space") {
          event.preventDefault();
          if ("speechSynthesis" in window && speechSynthesis.speaking && !speechSynthesis.paused) pause();
          else play();
        }
      });

      if ("speechSynthesis" in window) {
        speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
      } else {
        loadVoices();
      }
      restoreSettings();
      importLatestRecording();
      importTeleprompterLibraryExport();
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
